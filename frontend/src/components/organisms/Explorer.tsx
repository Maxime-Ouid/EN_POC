import { useState } from 'react';
import type { ReactNode } from 'react';

export interface TreeNodeData {
  id: string;
  label: string;
  count?: number;
  children?: TreeNodeData[];
}

export interface ExplorerProps {
  tree: TreeNodeData[];
  activeId?: string;
  onSelect: (id: string) => void;
  defaultOpenIds?: string[];
  children?: ReactNode; // le <DocPanel> associé
}

// Layout deux colonnes (arbre + panneau de documents) — §6.8. L'ouverture des
// noeuds est gérée ici (état purement UI) ; la sélection (`activeId`) est
// laissée au parent pour qu'il pilote le contenu du <DocPanel>.
export function Explorer({ tree, activeId, onSelect, defaultOpenIds, children }: ExplorerProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(defaultOpenIds ?? []));

  function toggle(id: string) {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="explorer">
      <div className="tree">
        {tree.map(node => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            openIds={openIds}
            activeId={activeId}
            onToggle={toggle}
            onSelect={onSelect}
          />
        ))}
      </div>
      {children}
    </div>
  );
}

function TreeNode({
  node,
  depth,
  openIds,
  activeId,
  onToggle,
  onSelect,
}: {
  node: TreeNodeData;
  depth: number;
  openIds: Set<string>;
  activeId?: string;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const hasChildren = !!node.children?.length;
  const isOpen = openIds.has(node.id);
  const isActive = node.id === activeId;

  function handleClick() {
    if (hasChildren) onToggle(node.id);
    onSelect(node.id);
  }

  return (
    <div className="tree-node">
      <div
        className={['tree-row', isOpen && 'open', isActive && 'active'].filter(Boolean).join(' ')}
        onClick={handleClick}
      >
        <svg
          className="icon chev"
          style={depth > 0 || !hasChildren ? { visibility: 'hidden' } : undefined}
        >
          <use href="#i-chevr" />
        </svg>
        <svg className="icon fic">
          <use href="#i-folder" />
        </svg>
        {node.label}
        {typeof node.count === 'number' && <span className="tree-count">{node.count}</span>}
      </div>
      {hasChildren && (
        <div className={isOpen ? 'tree-children open' : 'tree-children'}>
          {node.children!.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              openIds={openIds}
              activeId={activeId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
