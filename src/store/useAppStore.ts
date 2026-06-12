import { create } from 'zustand';
import type {
  Project, ProjectWithVariables, Variable, SimulationResult,
  Scenario, ScenarioWithVariables, RiskLevel,
} from '../../shared/types.js';

interface ScenarioWithMeta extends Scenario {
  variableCount: number;
  simulationCount: number;
  lastSimulationAt: string | null;
}

interface AppState {
  projects: Array<Project & { scenarioCount: number; variableCount: number; simulationCount: number; lastSimulationAt: string | null }>;
  currentProject: ProjectWithVariables | null;
  scenarios: ScenarioWithMeta[];
  currentScenario: ScenarioWithVariables | null;
  simulations: SimulationResult[];
  currentSimulation: SimulationResult | null;
  loading: boolean;
  error: string | null;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  setProjects: (p: AppState['projects']) => void;
  setCurrentProject: (p: ProjectWithVariables | null) => void;
  setScenarios: (s: ScenarioWithMeta[]) => void;
  setCurrentScenario: (s: ScenarioWithVariables | null) => void;
  addScenario: (s: Scenario) => void;
  updateScenario: (s: Scenario) => void;
  removeScenario: (id: string) => void;
  addVariable: (v: Variable) => void;
  updateVariable: (v: Variable) => void;
  removeVariable: (id: string) => void;
  setSimulations: (s: SimulationResult[]) => void;
  setCurrentSimulation: (s: SimulationResult | null) => void;
  addSimulation: (s: SimulationResult) => void;
  removeSimulation: (id: string) => void;
  updateScenarioLastRun: (scenarioId: string, timestamp: string, riskLevel: RiskLevel) => void;
}

export const useAppStore = create<AppState>((set) => ({
  projects: [],
  currentProject: null,
  scenarios: [],
  currentScenario: null,
  simulations: [],
  currentSimulation: null,
  loading: false,
  error: null,
  setLoading: (v) => set({ loading: v }),
  setError: (v) => set({ error: v }),
  setProjects: (p) => set({ projects: p }),
  setCurrentProject: (p) => set({ currentProject: p, currentSimulation: null, simulations: [] }),
  setScenarios: (s) => set({ scenarios: s }),
  setCurrentScenario: (s) => set({ currentScenario: s, currentSimulation: null, simulations: [] }),
  addScenario: (s) =>
    set((st) => ({
      scenarios: [...st.scenarios, { ...s, variableCount: 0, simulationCount: 0, lastSimulationAt: null }],
    })),
  updateScenario: (s) =>
    set((st) => ({
      scenarios: st.scenarios.map((x) => (x.id === s.id ? { ...x, ...s } : x)),
      currentScenario: st.currentScenario?.id === s.id ? { ...st.currentScenario, ...s } : st.currentScenario,
    })),
  removeScenario: (id) =>
    set((st) => ({
      scenarios: st.scenarios.filter((s) => s.id !== id),
      currentScenario: st.currentScenario?.id === id ? null : st.currentScenario,
    })),
  addVariable: (v) =>
    set((s) => {
      if (s.currentScenario && s.currentScenario.id === v.scenarioId) {
        return {
          currentScenario: { ...s.currentScenario, variables: [...s.currentScenario.variables, v] },
        };
      }
      return {};
    }),
  updateVariable: (v) =>
    set((s) => {
      if (s.currentScenario && s.currentScenario.id === v.scenarioId) {
        return {
          currentScenario: {
            ...s.currentScenario,
            variables: s.currentScenario.variables.map((x) => (x.id === v.id ? v : x)),
          },
        };
      }
      return {};
    }),
  removeVariable: (id) =>
    set((s) => {
      if (s.currentScenario) {
        return {
          currentScenario: {
            ...s.currentScenario,
            variables: s.currentScenario.variables.filter((x) => x.id !== id),
          },
        };
      }
      return {};
    }),
  setSimulations: (s) => set({ simulations: s, currentSimulation: s[0] || null }),
  setCurrentSimulation: (s) => set({ currentSimulation: s }),
  addSimulation: (s) =>
    set((st) => ({
      simulations: [s, ...st.simulations],
      currentSimulation: s,
    })),
  removeSimulation: (id) =>
    set((st) => ({
      simulations: st.simulations.filter((s) => s.id !== id),
      currentSimulation: st.currentSimulation?.id === id ? null : st.currentSimulation,
    })),
  updateScenarioLastRun: (scenarioId: string, timestamp: string, riskLevel: RiskLevel) =>
    set((st) => ({
      scenarios: st.scenarios.map((s) =>
        s.id === scenarioId ? { ...s, lastSimulationAt: timestamp, riskLevel } : s
      ),
      currentScenario:
        st.currentScenario?.id === scenarioId
          ? { ...st.currentScenario, lastRunAt: timestamp, riskLevel }
          : st.currentScenario,
    })),
}));
