import { useState, useMemo } from 'react';
import {
  ChevronRight, ChevronDown, GitBranch, Clock, AlertTriangle,
  TrendingUp, TrendingDown, Minus, Plus, Trash2, Pencil, X, Check,
  Copy, Sun, CloudRain, Target, Settings,
} from 'lucide-react';
import type { Scenario, RiskLevel, ScenarioType } from '../../shared/types.js';

interface ScenarioWithMeta extends Scenario {
  variableCount: number;
  simulationCount: number;
  lastSimulationAt: string | null;
}

interface ScenarioTreeProps {
  scenarios: ScenarioWithMeta[];
  currentScenarioId: string | null;
  onSelect: (scenario: ScenarioWithMeta) => void;
  onDelete: (id: string) => void;
  onCreateBranch: (sourceId: string, type: ScenarioType) => void;
  onRename: (id: string, name: string) => void;
}

const RISK_CONFIG: Record<NonNullable<RiskLevel>, { label: string; color: string; bg: string; border: string }> = {
  low: { label: '低风险', color: 'text-monte-safe', bg: 'bg-monte-safe/15', border: 'border-monte-safe/40' },
  'medium-low': { label: '中低风险', color: 'text-emerald-300', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40' },
  medium: { label: '中等风险', color: 'text-monte-warn', bg: 'bg-monte-warn/15', border: 'border-monte-warn/40' },
  high: { label: '高风险', color: 'text-monte-danger', bg: 'bg-monte-danger/15', border: 'border-monte-danger/40' },
};

const SCENARIO_TYPE_CONFIG: Record<ScenarioType, { label: string; icon: any; color: string }> = {
  baseline: { label: '基准', icon: Target, color: 'text-monte-accent' },
  optimistic: { label: '乐观', icon: Sun, color: 'text-monte-safe' },
  pessimistic: { label: '悲观', icon: CloudRain, color: 'text-monte-danger' },
  custom: { label: '自定义', icon: Settings, color: 'text-monte-muted' },
};

interface TreeNodeData extends ScenarioWithMeta {
  children: TreeNodeData[];
}

function buildTree(scenarios: ScenarioWithMeta[]): TreeNodeData[] {
  const map = new Map<string, TreeNodeData>();
  const roots: TreeNodeData[] = [];

  scenarios.forEach(s => {
    map.set(s.id, { ...s, children: [] });
  });

  scenarios.forEach(s => {
    const node = map.get(s.id)!;
    if (s.sourceScenarioId && map.has(s.sourceScenarioId)) {
      map.get(s.sourceScenarioId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

interface TreeNodeProps {
  node: TreeNodeData;
  level: number;
  currentScenarioId: string | null;
  expanded: Set<string>;
  editingId: string | null;
  editName: string;
  onToggle: (id: string) => void;
  onSelect: (scenario: ScenarioWithMeta) => void;
  onDelete: (id: string) => void;
  onCreateBranch: (sourceId: string, type: ScenarioType) => void;
  onStartEdit: (scenario: ScenarioWithMeta) => void;
  onSaveEdit: (id: string, name: string) => void;
  onCancelEdit: () => void;
  onEditNameChange: (name: string) => void;
}

function TreeNode({
  node, level, currentScenarioId, expanded, editingId, editName,
  onToggle, onSelect, onDelete, onCreateBranch,
  onStartEdit, onSaveEdit, onCancelEdit, onEditNameChange,
}: TreeNodeProps) {
  const typedNode = node as TreeNodeData;
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const isExpanded = expanded.has(node.id);
  const isSelected = currentScenarioId === node.id;
  const isEditing = editingId === node.id;
  const hasChildren = node.children.length > 0;
  const riskConfig = node.riskLevel ? RISK_CONFIG[node.riskLevel] : null;
  const typeConfig = SCENARIO_TYPE_CONFIG[node.type];
  const TypeIcon = typeConfig.icon;

  return (
    <div>
      <div
        className={`group flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all ${
          isSelected
            ? 'bg-monte-accent/20 border border-monte-accent/40'
            : 'hover:bg-monte-border/50 border border-transparent'
        }`}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        onClick={() => onSelect(node)}
      >
        <button
          className={`p-0.5 rounded hover:bg-monte-border transition-colors flex-shrink-0 ${
            hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4 text-monte-muted" /> : <ChevronRight className="w-4 h-4 text-monte-muted" />}
        </button>

        <div className={`p-1.5 rounded-md flex-shrink-0 ${typeConfig.color} bg-white/5`}>
          <TypeIcon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <input
                value={editName}
                onChange={e => onEditNameChange(e.target.value)}
                className="input !py-1 !text-sm flex-1 min-w-0"
                autoFocus
              />
              <button
                onClick={() => onSaveEdit(node.id, editName)}
                className="p-1 text-monte-safe hover:bg-monte-safe/15 rounded"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={onCancelEdit}
                className="p-1 text-monte-muted hover:bg-monte-border rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="font-medium text-white truncate">{node.name}</div>
              <div className="flex items-center gap-2 text-xs text-monte-muted mt-0.5">
                {node.lastSimulationAt ? (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(node.lastSimulationAt).toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Minus className="w-3 h-3" />
                    未运行
                  </span>
                )}
                {riskConfig && (
                  <span className={`px-1.5 py-0.5 rounded text-xs ${riskConfig.bg} ${riskConfig.color}`}>
                    {riskConfig.label}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="relative">
              <button
                className="p-1.5 rounded-md text-monte-muted hover:text-monte-accent hover:bg-monte-accent/15 transition-colors"
                title="创建分支"
                onClick={(e) => { e.stopPropagation(); setShowBranchMenu(!showBranchMenu); }}
              >
                <GitBranch className="w-4 h-4" />
              </button>
              {showBranchMenu && (
                <div
                  className="absolute right-0 top-full mt-1 z-20 card !p-2 min-w-[140px] shadow-xl"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="text-xs text-monte-muted px-2 py-1 mb-1 border-b border-monte-border">创建分支</div>
                  <button
                    className="w-full text-left px-2 py-1.5 rounded text-sm text-monte-safe hover:bg-monte-safe/15 flex items-center gap-2"
                    onClick={() => { onCreateBranch(node.id, 'optimistic'); setShowBranchMenu(false); }}
                  >
                    <Sun className="w-4 h-4" /> 乐观场景
                  </button>
                  <button
                    className="w-full text-left px-2 py-1.5 rounded text-sm text-monte-accent hover:bg-monte-accent/15 flex items-center gap-2"
                    onClick={() => { onCreateBranch(node.id, 'baseline'); setShowBranchMenu(false); }}
                  >
                    <Copy className="w-4 h-4" /> 复制当前
                  </button>
                  <button
                    className="w-full text-left px-2 py-1.5 rounded text-sm text-monte-danger hover:bg-monte-danger/15 flex items-center gap-2"
                    onClick={() => { onCreateBranch(node.id, 'pessimistic'); setShowBranchMenu(false); }}
                  >
                    <CloudRain className="w-4 h-4" /> 悲观场景
                  </button>
                </div>
              )}
            </div>
            <button
              className="p-1.5 rounded-md text-monte-muted hover:text-monte-accent hover:bg-monte-accent/15 transition-colors"
              title="重命名"
              onClick={(e) => { e.stopPropagation(); onStartEdit(node); }}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 rounded-md text-monte-muted hover:text-monte-danger hover:bg-monte-danger/15 transition-colors"
              title="删除"
              onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-2 border-l border-monte-border/50">
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              currentScenarioId={currentScenarioId}
              expanded={expanded}
              editingId={editingId}
              editName={editName}
              onToggle={onToggle}
              onSelect={onSelect}
              onDelete={onDelete}
              onCreateBranch={onCreateBranch}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onEditNameChange={onEditNameChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ScenarioTree({
  scenarios, currentScenarioId, onSelect, onDelete, onCreateBranch, onRename,
}: ScenarioTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(scenarios.map(s => s.id)));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const tree = useMemo(() => buildTree(scenarios), [scenarios]);

  const handleToggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStartEdit = (scenario: ScenarioWithMeta) => {
    setEditingId(scenario.id);
    setEditName(scenario.name);
  };

  const handleSaveEdit = (id: string, name: string) => {
    if (name.trim()) {
      onRename(id, name.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="space-y-1">
      {tree.length === 0 ? (
        <div className="text-center py-8 text-monte-muted">
          <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>暂无场景</p>
        </div>
      ) : (
        tree.map(root => (
          <TreeNode
            key={root.id}
            node={root}
            level={0}
            currentScenarioId={currentScenarioId}
            expanded={expanded}
            editingId={editingId}
            editName={editName}
            onToggle={handleToggle}
            onSelect={onSelect}
            onDelete={onDelete}
            onCreateBranch={onCreateBranch}
            onStartEdit={handleStartEdit}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onEditNameChange={setEditName}
          />
        ))
      )}
    </div>
  );
}
