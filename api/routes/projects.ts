import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createStore } from '../storage/fileStore.js';
import type {
  Project, Variable, ProjectWithVariables, ProjectWithScenarios, Scenario,
  CreateProjectDto, UpdateProjectDto, CreateVariableDto,
} from '../../shared/types.js';

const router = Router();
const projectsStore = createStore<Project>('projects');
const variablesStore = createStore<Variable>('variables');
const simulationsStore = createStore<{ id: string; projectId: string }>('simulations');
const comparisonsStore = createStore<{ id: string; projectId: string }>('comparisons');
const scenariosStore = createStore<Scenario>('scenarios');

function getProjectWithVariables(projectId: string): ProjectWithVariables | null {
  const project = projectsStore.getById(projectId);
  if (!project) return null;
  const scenarios = scenariosStore.filter(s => s.projectId === projectId);
  const baselineScenario = scenarios.find(s => s.type === 'baseline') || scenarios[0];
  const variables = baselineScenario
    ? variablesStore.filter(v => v.scenarioId === baselineScenario.id)
    : variablesStore.filter(v => v.projectId === projectId);
  return { ...project, variables };
}

function getProjectWithScenarios(projectId: string): ProjectWithScenarios | null {
  const project = projectsStore.getById(projectId);
  if (!project) return null;
  const scenarios = scenariosStore.filter(s => s.projectId === projectId);
  return { ...project, scenarios };
}

router.get('/', (_req: Request, res: Response) => {
  const projects = projectsStore.getAll();
  const projectsWithMeta = projects.map(p => {
    const scenarios = scenariosStore.filter(s => s.projectId === p.id);
    const variables = variablesStore.filter(v => v.projectId === p.id);
    const sims = simulationsStore.filter(s => s.projectId === p.id);
    const lastSim = sims.length > 0
      ? (sims[sims.length - 1] as unknown as { timestamp?: string })?.timestamp || null
      : null;
    return {
      ...p,
      scenarioCount: scenarios.length,
      variableCount: variables.length,
      simulationCount: sims.length,
      lastSimulationAt: lastSim,
    };
  });
  res.json(projectsWithMeta);
});

router.get('/:id', (req: Request, res: Response) => {
  const project = getProjectWithVariables(req.params.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  res.json(project);
});

router.get('/:id/scenarios', (req: Request, res: Response) => {
  const project = getProjectWithScenarios(req.params.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  res.json(project);
});

router.post('/', (req: Request, res: Response) => {
  const dto = req.body as CreateProjectDto;
  if (!dto.name || dto.name.trim() === '') {
    res.status(400).json({ error: '项目名称不能为空' });
    return;
  }

  const now = new Date().toISOString();
  const projectId = uuidv4();
  const project: Project = {
    id: projectId,
    name: dto.name.trim(),
    description: dto.description?.trim() || '',
    createdAt: now,
    updatedAt: now,
  };

  const baselineScenario: Scenario = {
    id: uuidv4(),
    projectId,
    name: '基准场景',
    type: 'baseline',
    description: '项目默认基准场景',
    sourceScenarioId: null,
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
    riskLevel: null,
  };

  projectsStore.create(project);
  scenariosStore.create(baselineScenario);
  res.status(201).json({ ...project, scenarios: [baselineScenario] });
});

router.put('/:id', (req: Request, res: Response) => {
  const dto = req.body as UpdateProjectDto;
  const existing = projectsStore.getById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }

  const updates: Partial<Project> = { updatedAt: new Date().toISOString() };
  if (dto.name !== undefined) {
    if (dto.name.trim() === '') {
      res.status(400).json({ error: '项目名称不能为空' });
      return;
    }
    updates.name = dto.name.trim();
  }
  if (dto.description !== undefined) {
    updates.description = dto.description.trim();
  }

  const updated = projectsStore.update(req.params.id, updates);
  res.json(updated);
});

router.delete('/:id', (req: Request, res: Response) => {
  const projectId = req.params.id;
  const existing = projectsStore.getById(projectId);
  if (!existing) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }

  scenariosStore.deleteMany(s => s.projectId === projectId);
  variablesStore.deleteMany(v => v.projectId === projectId);
  simulationsStore.deleteMany(s => s.projectId === projectId);
  comparisonsStore.deleteMany(c => c.projectId === projectId);
  projectsStore.delete(projectId);

  res.json({ success: true });
});

router.post('/:id/variables', (req: Request, res: Response) => {
  const projectId = req.params.id;
  const project = projectsStore.getById(projectId);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }

  const scenarios = scenariosStore.filter(s => s.projectId === projectId);
  const baselineScenario = scenarios.find(s => s.type === 'baseline') || scenarios[0];
  if (!baselineScenario) {
    res.status(400).json({ error: '请先创建场景' });
    return;
  }

  const dto = req.body as CreateVariableDto;
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
    projectId,
    scenarioId: baselineScenario.id,
    name: dto.name.trim(),
    type: dto.type || 'custom',
    min: Number(dto.min),
    max: Number(dto.max),
    mostLikely: Number(dto.mostLikely),
    weight: Number(dto.weight) ?? 1,
    unit: dto.unit?.trim() || '',
    createdAt: new Date().toISOString(),
  };

  projectsStore.update(projectId, { updatedAt: new Date().toISOString() });
  scenariosStore.update(baselineScenario.id, { updatedAt: new Date().toISOString() });
  const created = variablesStore.create(variable);
  res.status(201).json(created);
});

export default router;
