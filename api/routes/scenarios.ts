import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createStore } from '../storage/fileStore.js';
import type {
  Scenario, Variable, SimulationResult, Project,
  CreateScenarioDto, UpdateScenarioDto, CreateScenarioBranchDto,
  RiskLevel, ScenarioWithVariables,
} from '../../shared/types.js';

const router = Router();
const scenariosStore = createStore<Scenario>('scenarios');
const variablesStore = createStore<Variable>('variables');
const simulationsStore = createStore<SimulationResult>('simulations');
const projectsStore = createStore<Project>('projects');

function getRiskLevelFromProbability(p: number): RiskLevel {
  if (p < 0.1) return 'low';
  if (p < 0.3) return 'medium-low';
  if (p < 0.5) return 'medium';
  return 'high';
}

function updateScenarioRiskLevel(scenarioId: string) {
  const sims = simulationsStore
    .filter(s => s.scenarioId === scenarioId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  if (sims.length > 0) {
    const lastSim = sims[0];
    const riskLevel = getRiskLevelFromProbability(lastSim.lossProbability);
    scenariosStore.update(scenarioId, {
      riskLevel,
      lastRunAt: lastSim.timestamp,
    });
  }
}

function getScenarioWithVariables(scenarioId: string): ScenarioWithVariables | null {
  const scenario = scenariosStore.getById(scenarioId);
  if (!scenario) return null;
  const variables = variablesStore.filter(v => v.scenarioId === scenarioId);
  return { ...scenario, variables };
}

router.get('/project/:projectId', (req: Request, res: Response) => {
  const projectId = req.params.projectId;
  const scenarios = scenariosStore.filter(s => s.projectId === projectId);
  const scenariosWithMeta = scenarios.map(s => {
    const sims = simulationsStore.filter(sim => sim.scenarioId === s.id);
    const lastSim = sims.length > 0
      ? sims.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
      : null;
    return {
      ...s,
      variableCount: variablesStore.filter(v => v.scenarioId === s.id).length,
      simulationCount: sims.length,
      lastSimulationAt: lastSim?.timestamp || null,
      riskLevel: lastSim ? getRiskLevelFromProbability(lastSim.lossProbability) : s.riskLevel,
    };
  });
  res.json(scenariosWithMeta);
});

router.get('/:id', (req: Request, res: Response) => {
  const scenario = getScenarioWithVariables(req.params.id);
  if (!scenario) {
    res.status(404).json({ error: '场景不存在' });
    return;
  }
  res.json(scenario);
});

router.post('/project/:projectId', (req: Request, res: Response) => {
  const projectId = req.params.projectId;
  const project = projectsStore.getById(projectId);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }

  const dto = req.body as CreateScenarioDto;
  if (!dto.name || dto.name.trim() === '') {
    res.status(400).json({ error: '场景名称不能为空' });
    return;
  }

  const now = new Date().toISOString();
  const scenario: Scenario = {
    id: uuidv4(),
    projectId,
    name: dto.name.trim(),
    type: dto.type || 'custom',
    description: dto.description?.trim() || '',
    sourceScenarioId: dto.sourceScenarioId,
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
    riskLevel: null,
  };

  const created = scenariosStore.create(scenario);
  projectsStore.update(projectId, { updatedAt: now });
  res.status(201).json(created);
});

router.post('/project/:projectId/branch', (req: Request, res: Response) => {
  const projectId = req.params.projectId;
  const project = projectsStore.getById(projectId);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }

  const dto = req.body as CreateScenarioBranchDto;
  if (!dto.name || dto.name.trim() === '') {
    res.status(400).json({ error: '场景名称不能为空' });
    return;
  }
  if (!dto.sourceScenarioId) {
    res.status(400).json({ error: '请指定源场景ID' });
    return;
  }

  const sourceScenario = scenariosStore.getById(dto.sourceScenarioId);
  if (!sourceScenario || sourceScenario.projectId !== projectId) {
    res.status(404).json({ error: '源场景不存在' });
    return;
  }

  const sourceVariables = variablesStore.filter(v => v.scenarioId === dto.sourceScenarioId);
  const adjustFactor = dto.adjustFactor ?? 0;

  const now = new Date().toISOString();
  const newScenario: Scenario = {
    id: uuidv4(),
    projectId,
    name: dto.name.trim(),
    type: dto.type || 'custom',
    description: dto.description?.trim() || `从「${sourceScenario.name}」复制`,
    sourceScenarioId: dto.sourceScenarioId,
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
    riskLevel: null,
  };

  const createdScenario = scenariosStore.create(newScenario);

  const newVariables = sourceVariables.map(v => {
    const range = v.max - v.min;
    const adjustment = range * adjustFactor;
    return {
      ...v,
      id: uuidv4(),
      scenarioId: createdScenario.id,
      min: v.min + adjustment,
      max: v.max + adjustment,
      mostLikely: v.mostLikely + adjustment,
      createdAt: now,
    } as Variable;
  });

  if (newVariables.length > 0) {
    variablesStore.bulkCreate(newVariables);
  }

  projectsStore.update(projectId, { updatedAt: now });
  res.status(201).json({ ...createdScenario, variables: newVariables });
});

router.put('/:id', (req: Request, res: Response) => {
  const dto = req.body as UpdateScenarioDto;
  const existing = scenariosStore.getById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: '场景不存在' });
    return;
  }

  const updates: Partial<Scenario> = { updatedAt: new Date().toISOString() };
  if (dto.name !== undefined) {
    if (dto.name.trim() === '') {
      res.status(400).json({ error: '场景名称不能为空' });
      return;
    }
    updates.name = dto.name.trim();
  }
  if (dto.description !== undefined) {
    updates.description = dto.description.trim();
  }

  const updated = scenariosStore.update(req.params.id, updates);
  if (updated) {
    projectsStore.update(existing.projectId, { updatedAt: new Date().toISOString() });
  }
  res.json(updated);
});

router.delete('/:id', (req: Request, res: Response) => {
  const scenarioId = req.params.id;
  const existing = scenariosStore.getById(scenarioId);
  if (!existing) {
    res.status(404).json({ error: '场景不存在' });
    return;
  }

  const projectScenarios = scenariosStore.filter(s => s.projectId === existing.projectId);
  if (projectScenarios.length <= 1) {
    res.status(400).json({ error: '至少需要保留一个场景' });
    return;
  }

  const childScenarios = scenariosStore.filter(s => s.sourceScenarioId === scenarioId);
  childScenarios.forEach(s => {
    scenariosStore.update(s.id, { sourceScenarioId: existing.sourceScenarioId });
  });

  variablesStore.deleteMany(v => v.scenarioId === scenarioId);
  simulationsStore.deleteMany(s => s.scenarioId === scenarioId);
  scenariosStore.delete(scenarioId);
  projectsStore.update(existing.projectId, { updatedAt: new Date().toISOString() });

  res.json({ success: true });
});

router.post('/:id/variables', (req: Request, res: Response) => {
  const scenarioId = req.params.id;
  const scenario = scenariosStore.getById(scenarioId);
  if (!scenario) {
    res.status(404).json({ error: '场景不存在' });
    return;
  }

  const dto = req.body as any;
  if (!dto.name || dto.name.trim() === '') {
    res.status(400).json({ error: '变量名称不能为空' });
    return;
  }
  if (dto.min >= dto.max) {
    res.status(400).json({ error: '最小值必须小于最大值' });
    return;
  }
  if (dto.mostLikely < dto.min || dto.mostLikely > dto.max) {
    res.status(400).json({ error: '最可能值必须在最小值和最大值之间' });
    return;
  }

  const variable: Variable = {
    id: uuidv4(),
    projectId: scenario.projectId,
    scenarioId,
    name: dto.name.trim(),
    type: dto.type || 'custom',
    min: Number(dto.min),
    max: Number(dto.max),
    mostLikely: Number(dto.mostLikely),
    weight: Number(dto.weight) ?? 1,
    unit: dto.unit?.trim() || '',
    createdAt: new Date().toISOString(),
  };

  scenariosStore.update(scenarioId, { updatedAt: new Date().toISOString() });
  projectsStore.update(scenario.projectId, { updatedAt: new Date().toISOString() });
  const created = variablesStore.create(variable);
  res.status(201).json(created);
});

export { updateScenarioRiskLevel };
export default router;
