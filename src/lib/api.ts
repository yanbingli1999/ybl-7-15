import type {
  Project, ProjectWithVariables, Variable, SimulationResult, CompareRecord,
  Scenario, ScenarioWithVariables, ProjectWithScenarios,
  CreateProjectDto, UpdateProjectDto, CreateVariableDto, UpdateVariableDto,
  RunSimulationDto, CreateCompareDto, CreateScenarioDto, UpdateScenarioDto,
  CreateScenarioBranchDto,
} from '../../shared/types.js';

const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `请求失败 (${res.status})`);
  }
  return data as T;
}

export const api = {
  projects: {
    list: () => request<Array<Project & { scenarioCount: number; variableCount: number; simulationCount: number; lastSimulationAt: string | null }>>('/projects'),
    get: (id: string) => request<ProjectWithVariables>(`/projects/${id}`),
    getWithScenarios: (id: string) => request<ProjectWithScenarios>(`/projects/${id}/scenarios`),
    create: (dto: CreateProjectDto) => request<Project & { scenarios: Scenario[] }>('/projects', { method: 'POST', body: JSON.stringify(dto) }),
    update: (id: string, dto: UpdateProjectDto) => request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    remove: (id: string) => request<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
    addVariable: (projectId: string, dto: CreateVariableDto) =>
      request<Variable>(`/projects/${projectId}/variables`, { method: 'POST', body: JSON.stringify(dto) }),
  },
  scenarios: {
    listByProject: (projectId: string) => request<Array<Scenario & { variableCount: number; simulationCount: number; lastSimulationAt: string | null }>>(`/scenarios/project/${projectId}`),
    get: (id: string) => request<ScenarioWithVariables>(`/scenarios/${id}`),
    create: (projectId: string, dto: CreateScenarioDto) =>
      request<Scenario>(`/scenarios/project/${projectId}`, { method: 'POST', body: JSON.stringify(dto) }),
    createBranch: (projectId: string, dto: CreateScenarioBranchDto) =>
      request<Scenario & { variables: Variable[] }>(`/scenarios/project/${projectId}/branch`, { method: 'POST', body: JSON.stringify(dto) }),
    update: (id: string, dto: UpdateScenarioDto) =>
      request<Scenario>(`/scenarios/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    remove: (id: string) => request<{ success: boolean }>(`/scenarios/${id}`, { method: 'DELETE' }),
    addVariable: (scenarioId: string, dto: CreateVariableDto) =>
      request<Variable>(`/scenarios/${scenarioId}/variables`, { method: 'POST', body: JSON.stringify(dto) }),
  },
  variables: {
    update: (id: string, dto: UpdateVariableDto) =>
      request<Variable>(`/variables/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    remove: (id: string) => request<{ success: boolean }>(`/variables/${id}`, { method: 'DELETE' }),
  },
  simulations: {
    listByProject: (projectId: string) => request<SimulationResult[]>(`/simulations/project/${projectId}`),
    listByScenario: (scenarioId: string) => request<SimulationResult[]>(`/simulations/scenario/${scenarioId}`),
    get: (id: string) => request<SimulationResult>(`/simulations/${id}`),
    run: (projectId: string, dto: RunSimulationDto) =>
      request<SimulationResult>(`/simulations/project/${projectId}`, { method: 'POST', body: JSON.stringify(dto) }),
    runScenario: (scenarioId: string, dto: RunSimulationDto) =>
      request<SimulationResult>(`/simulations/scenario/${scenarioId}`, { method: 'POST', body: JSON.stringify(dto) }),
    remove: (id: string) => request<{ success: boolean }>(`/simulations/${id}`, { method: 'DELETE' }),
  },
  compare: {
    listByProject: (projectId: string) => request<CompareRecord[]>(`/compare/project/${projectId}`),
    get: (id: string) => request<CompareRecord & { simulations: SimulationResult[] }>(`/compare/${id}`),
    create: (projectId: string, dto: CreateCompareDto) =>
      request<CompareRecord>(`/compare/project/${projectId}`, { method: 'POST', body: JSON.stringify(dto) }),
    remove: (id: string) => request<{ success: boolean }>(`/compare/${id}`, { method: 'DELETE' }),
  },
};
