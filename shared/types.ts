export type VariableType = 'cost' | 'duration' | 'revenue' | 'custom';
export type ScenarioType = 'baseline' | 'optimistic' | 'pessimistic' | 'custom';
export type RiskLevel = 'low' | 'medium-low' | 'medium' | 'high' | null;

export interface Variable {
  id: string;
  projectId: string;
  scenarioId: string;
  name: string;
  type: VariableType;
  min: number;
  max: number;
  mostLikely: number;
  weight: number;
  unit: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Scenario {
  id: string;
  projectId: string;
  name: string;
  type: ScenarioType;
  description: string;
  sourceScenarioId: string | null;
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
  riskLevel: RiskLevel;
}

export interface ProjectWithVariables extends Project {
  variables: Variable[];
}

export interface ScenarioWithVariables extends Scenario {
  variables: Variable[];
}

export interface ProjectWithScenarios extends Project {
  scenarios: Scenario[];
}

export interface Percentiles {
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

export interface HistogramBin {
  start: number;
  end: number;
  count: number;
}

export interface Histogram {
  bins: HistogramBin[];
}

export interface SensitivityItem {
  variableId: string;
  variableName: string;
  correlation: number;
  contribution: number;
}

export interface SimulationResult {
  id: string;
  projectId: string;
  scenarioId?: string;
  runName: string;
  iterations: number;
  timestamp: string;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  percentiles: Percentiles;
  lossProbability: number;
  var95: number;
  threshold: number;
  histogram: Histogram;
  sensitivity: SensitivityItem[];
  samples?: number[];
  variableSamples?: Record<string, number[]>;
}

export interface CompareRecord {
  id: string;
  projectId: string;
  name: string;
  simulationIds: string[];
  createdAt: string;
}

export interface CreateProjectDto {
  name: string;
  description: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
}

export interface CreateVariableDto {
  name: string;
  type: VariableType;
  min: number;
  max: number;
  mostLikely: number;
  weight: number;
  unit: string;
}

export interface UpdateVariableDto {
  name?: string;
  type?: VariableType;
  min?: number;
  max?: number;
  mostLikely?: number;
  weight?: number;
  unit?: string;
}

export interface RunSimulationDto {
  iterations: number;
  threshold: number;
  runName?: string;
}

export interface CreateCompareDto {
  name: string;
  simulationIds: string[];
}

export interface CreateScenarioDto {
  name: string;
  type?: ScenarioType;
  description?: string;
  sourceScenarioId: string | null;
}

export interface UpdateScenarioDto {
  name?: string;
  description?: string;
}

export interface CreateScenarioBranchDto {
  name: string;
  type?: ScenarioType;
  description?: string;
  sourceScenarioId: string;
  adjustFactor?: number;
}
