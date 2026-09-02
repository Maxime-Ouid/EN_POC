import { useEffect, useMemo, useState } from 'react';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Pill } from '../atoms/Pill';
import { TextInput } from '../atoms/TextInput';
import { Textarea } from '../atoms/Textarea';
import { Field } from '../molecules/Field';
import { Modal } from './Modal';
import { OFFICE_ROLES, roleLabel } from './officeRoles';
import type { TemplateFolderNode } from '../../hooks/useTemplates';

export interface TemplateEditorModalProps {
  open: boolean;
  /** Nom et description actuels du modèle — la modale n'invente pas de valeur initiale. */
  name: string;
  description: string;
  tree: TemplateFolderNode[];
  loading?: boolean;
  /** Message du serveur sur la dernière écriture refusée. */
  error?: string | null;
  onClose: () => void;
  onRename: (patch: { name: string; description: string }) => void;
  onAddFolder: (name: string, parentId: number | null, visibleToRoles: string[]) => void;
  onUpdateFolder: (folderId: number, patch: { name?: string; visible_to_roles?: string[] }) => void;
  onRemoveFolder: (folderId: number) => void;
  onDeleteTemplate: () => void;
}

/** Aplatit l'arbre en lignes indentées — la modale fait 560px, deux panneaux
    n'y tiennent pas ; une liste indentée dit la même hiérarchie. */
function flatten(nodes: TemplateFolderNode[], depth = 0): Array<{ node: TemplateFolderNode; depth: number }> {
  return nodes.flatMap(node => [{ node, depth }, ...flatten(node.children, depth + 1)]);
}

/**
 * Édition d'un modèle de dossier : son intitulé, et l'arborescence de dossiers
 * qu'il reproduira.
 *
 * Deux choses que l'interface doit dire à l'écran, parce que le backend les
 * fait sans que rien ne les laisse deviner :
 *
 *  1. `visible_to_roles` porte des RÔLES, pas des personnes. Ils ne sont
 *     résolus en utilisateurs réels qu'à l'application du modèle, avec les
 *     membres que l'étude a CE jour-là — un modèle n'est donc jamais périmé par
 *     un départ ou une arrivée.
 *  2. Aucun rôle coché = pas de restriction posée : le dossier créé suivra la
 *     règle d'accès par défaut (ouvert à l'étude, fermé pour le rôle client).
 *     C'est le même piège de lecture que la modale des accès — une liste vide
 *     ressemble à « personne » alors qu'elle veut dire « tout le monde ».
 *
 * Le modèle est une définition pure : le modifier ne touche AUCUN dossier déjà
 * créé à partir de lui, la copie étant indépendante dès l'application.
 */
export function TemplateEditorModal({
  open,
  name,
  description,
  tree,
  loading,
  error,
  onClose,
  onRename,
  onAddFolder,
  onUpdateFolder,
  onRemoveFolder,
  onDeleteTemplate,
}: TemplateEditorModalProps) {
  const [draftName, setDraftName] = useState(name);
  const [draftDescription, setDraftDescription] = useState(description);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const rows = useMemo(() => flatten(tree), [tree]);

  /* Le modèle ouvert change (on ferme puis on en ouvre un autre) : les
     brouillons de saisie doivent repartir de CE modèle-là, sinon la modale
     propose le nom du précédent. */
  useEffect(() => {
    setDraftName(name);
    setDraftDescription(description);
  }, [name, description]);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setNewFolderName('');
      setConfirmingDelete(false);
    }
  }, [open]);

  /* Un dossier supprimé ne doit pas laisser un panneau de détail ouvert sur
     un id que le serveur ne connaît plus. */
  useEffect(() => {
    if (selectedId !== null && !rows.some(r => r.node.id === selectedId)) setSelectedId(null);
  }, [rows, selectedId]);

  const nameChanged = draftName.trim() !== name || draftDescription !== description;

  function handleAdd(parentId: number | null) {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    onAddFolder(trimmed, parentId, []);
    setNewFolderName('');
  }

  function toggleRole(folder: TemplateFolderNode, role: string) {
    const next = folder.visible_to_roles.includes(role)
      ? folder.visible_to_roles.filter(r => r !== role)
      : [...folder.visible_to_roles, role];
    onUpdateFolder(folder.id, { visible_to_roles: next });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={name || 'Modèle de dossier'}
      footer={
        <>
          <Button
            variant="ghost"
            style={{ marginRight: 'auto', color: 'var(--critical)' }}
            onClick={() => (confirmingDelete ? onDeleteTemplate() : setConfirmingDelete(true))}
          >
            {confirmingDelete ? 'Confirmer la suppression' : 'Supprimer le modèle'}
          </Button>
          <Button onClick={onClose}>Fermer</Button>
          <Button
            variant="primary"
            disabled={!nameChanged || !draftName.trim()}
            onClick={() => onRename({ name: draftName.trim(), description: draftDescription })}
          >
            Enregistrer l'intitulé
          </Button>
        </>
      }
    >
      <Field label="Nom du modèle">
        <TextInput value={draftName} onChange={e => setDraftName(e.target.value)} />
      </Field>
      <Field label="Description">
        <Textarea
          rows={2}
          placeholder="À quoi sert ce modèle, et dans quels cas le choisir."
          value={draftDescription}
          onChange={e => setDraftDescription(e.target.value)}
        />
      </Field>

      <div className="section-title" style={{ margin: '18px 0 4px' }}>
        Arborescence reproduite
      </div>
      <div className="tiny dim" style={{ marginBottom: 12 }}>
        Ces dossiers sont recréés à l'identique dans chaque dossier ouvert à partir du
        modèle. Les rôles cochés deviennent des restrictions d'accès, résolues en
        personnes réelles au moment de la création — un modèle ne vieillit donc pas
        quand l'étude change. Aucun rôle coché : le dossier reste ouvert à l'étude.
      </div>

      {loading && <div className="tiny dim">Chargement de l'arborescence…</div>}

      {!loading && rows.length === 0 && (
        <div className="tiny dim">
          Ce modèle ne contient encore aucun dossier : appliqué tel quel, il crée un
          dossier vide.
        </div>
      )}

      {rows.map(({ node, depth }) => (
        <div key={node.id}>
          <div
            className={node.id === selectedId ? 'tree-row active' : 'tree-row'}
            style={{ marginLeft: depth * 16 }}
            onClick={() => setSelectedId(node.id === selectedId ? null : node.id)}
          >
            <Icon id="folder" className="fic" />
            <span style={{ flex: 1 }}>{node.name}</span>
            {node.visible_to_roles.length > 0 ? (
              <Pill kind="info" icon="lock">
                {node.visible_to_roles.map(roleLabel).join(', ')}
              </Pill>
            ) : (
              <span className="tiny dim">Ouvert</span>
            )}
          </div>

          {node.id === selectedId && (
            <div
              style={{
                marginLeft: depth * 16 + 16,
                marginBottom: 10,
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--surface-alt)',
              }}
            >
              <Field label="Nom du dossier">
                <TextInput
                  small
                  defaultValue={node.name}
                  onBlur={e => {
                    const next = e.target.value.trim();
                    if (next && next !== node.name) onUpdateFolder(node.id, { name: next });
                  }}
                />
              </Field>

              <div className="tiny dim" style={{ margin: '8px 0 6px' }}>
                Visible pour
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {OFFICE_ROLES.map(role => (
                  <Button
                    key={role}
                    size="sm"
                    variant={node.visible_to_roles.includes(role) ? 'primary' : 'default'}
                    onClick={() => toggleRole(node, role)}
                  >
                    {roleLabel(role)}
                  </Button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <TextInput
                  small
                  placeholder="Nom d'un sous-dossier"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd(node.id);
                  }}
                />
                <Button size="sm" onClick={() => handleAdd(node.id)}>
                  <Icon id="plus" />
                  Sous-dossier
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  style={{ color: 'var(--critical)' }}
                  onClick={() => onRemoveFolder(node.id)}
                >
                  Supprimer
                </Button>
              </div>
              {node.children.length > 0 && (
                <div className="tiny dim" style={{ marginTop: 6 }}>
                  {/* Le decompte porte sur les enfants DIRECTS ; la cascade cote
                      Django descend plus loin, d'ou « et leur contenu ». */}
                  {node.children.length === 1
                    ? "Supprimer ce dossier emporte le sous-dossier qu'il contient, et leur contenu."
                    : `Supprimer ce dossier emporte les ${node.children.length} sous-dossiers qu'il contient, et leur contenu.`}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <TextInput
          small
          placeholder="Nom d'un dossier de premier niveau"
          value={selectedId === null ? newFolderName : ''}
          disabled={selectedId !== null}
          onChange={e => setNewFolderName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleAdd(null);
          }}
        />
        <Button size="sm" disabled={selectedId !== null} onClick={() => handleAdd(null)}>
          <Icon id="plus" />
          Ajouter
        </Button>
      </div>

      {error && (
        <div className="tiny" style={{ marginTop: 10, color: 'var(--critical)' }}>
          {error}
        </div>
      )}
    </Modal>
  );
}
