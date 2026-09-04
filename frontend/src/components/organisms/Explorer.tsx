import { useState } from 'react';
import type { ReactNode } from 'react';
import { Icon3d } from '../atoms/Icon3d';

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
  /** Icône "⋮" après le libellé, visible seulement si fourni — ouvre un menu
      (renommage) piloté par l'appelant. `stopPropagation` : ne déclenche pas
      la sélection/le repli du nœud. */
  onNodeMenu?: (id: string) => void;
  /** Slot après le libellé (et avant le "⋮"), ex. pastilles de visibilité par
      rôle dans l'éditeur de template — Explorer reste agnostique de ce qu'il
      affiche. */
  renderNodeExtra?: (node: TreeNodeData) => ReactNode;
}

// Layout deux colonnes (arbre + panneau de documents) — §6.8. L'ouverture des
// noeuds est gérée ici (état purement UI) ; la sélection (`activeId`) est
// laissée au parent pour qu'il pilote le contenu du <DocPanel>.
export function Explorer({
  tree, activeId, onSelect, defaultOpenIds, children, onNodeMenu, renderNodeExtra,
}: ExplorerProps) {
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
            openIds={openIds}
            activeId={activeId}
            onToggle={toggle}
            onSelect={onSelect}
            onNodeMenu={onNodeMenu}
            renderNodeExtra={renderNodeExtra}
          />
        ))}
      </div>
      {children}
    </div>
  );
}

function TreeNode({
  node,
  openIds,
  activeId,
  onToggle,
  onSelect,
  onNodeMenu,
  renderNodeExtra,
}: {
  node: TreeNodeData;
  openIds: Set<string>;
  activeId?: string;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onNodeMenu?: (id: string) => void;
  renderNodeExtra?: (node: TreeNodeData) => ReactNode;
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
        {/* Le chevron ne dépend que de hasChildren, jamais de la profondeur —
            sans quoi un dossier imbriqué à plus d'un niveau n'affichait jamais
            son chevron d'expansion malgré des enfants réels (bug corrigé le
            03/09/2026, voir CLAUDE.md). */}
        <svg className="icon chev" style={hasChildren ? undefined : { visibility: 'hidden' }}>
          <use href="#i-chevr" />
        </svg>
        <Icon3d icon="folder" className="fic" />
        {node.label}
        {typeof node.count === 'number' && <span className="tree-count">{node.count}</span>}
        {renderNodeExtra?.(node)}
        {onNodeMenu && (
          <svg
            className="icon"
            style={{ marginLeft: 'auto', flex: 'none', color: 'var(--ink-400)', cursor: 'pointer' }}
            aria-label={`Menu pour ${node.label}`}
            onClick={e => {
              e.stopPropagation();
              onNodeMenu(node.id);
            }}
          >
            <use href="#i-dots" />
          </svg>
        )}
      </div>
      {hasChildren && (
        <div className={isOpen ? 'tree-children open' : 'tree-children'}>
          {node.children!.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              openIds={openIds}
              activeId={activeId}
              onToggle={onToggle}
              onSelect={onSelect}
              onNodeMenu={onNodeMenu}
              renderNodeExtra={renderNodeExtra}
            />
          ))}
        </div>
      )}
    </div>
  );
}
