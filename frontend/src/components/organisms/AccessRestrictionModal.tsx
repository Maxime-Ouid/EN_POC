import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Pill } from '../atoms/Pill';
import { Toggle } from '../atoms/Toggle';
import { Modal } from './Modal';
import { roleLabel } from './officeRoles';

export interface AccessRestrictionUser {
  userId: number;
  username: string;
  role: string;
}

export type AccessTargetKind = 'dataroom' | 'folder' | 'document';

export interface AccessRestrictionModalProps {
  open: boolean;
  /** Nature de l'objet restreint — décide de la phrase d'héritage affichée. */
  kind: AccessTargetKind;
  /** Nom affiché de l'objet : dossier, document ou dataroom. */
  targetLabel: string;
  /**
   * Identifiant stable de la cible (`folder:12`, `document:7`, `dataroom:3`).
   * Sert uniquement à savoir si la sélection en cours porte encore sur la cible
   * affichée : passer d'un dossier à l'autre repart des cases du serveur, sans
   * effet de synchronisation.
   */
  targetKey: string;
  users: AccessRestrictionUser[];
  usersError?: string | null;
  /** Utilisateurs actuellement autorisés (GET .../access/). Vide = aucune restriction. */
  selectedUserIds: number[];
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (userIds: number[]) => void;
}

const INHERITANCE_NOTE: Record<AccessTargetKind, string> = {
  dataroom: 'Toute la dataroom, sauf là où un dossier ou un document porte sa propre restriction.',
  folder: 'Le dossier et tout ce qu’il contient, sauf ce qui porte sa propre restriction.',
  document: 'Ce document seulement.',
};

/**
 * Restriction d'accès d'un objet précis — GET/POST `.../access/`.
 *
 * Deux règles du backend que l'écran doit rendre lisibles plutôt que masquer :
 * l'accès par défaut (aucune case cochée = aucune restriction explicite) dépend
 * du rôle depuis le 01/09/2026 — OUVERT à toute l'étude pour membre/admin/
 * superadmin (comportement historique, inchangé), FERMÉ par défaut pour un
 * client (voir CLAUDE.md, "État réel du code", et `views._user_can_access`) ;
 * et la restriction la plus proche dans l'arborescence l'emporte, sans fusion
 * avec celles du dessus.
 *
 * Composant pur : la liste des utilisateurs et l'état enregistré viennent des
 * props (useOfficeUsers / useAccessRestriction), branchés dans App.tsx.
 */
export function AccessRestrictionModal({
  open,
  kind,
  targetLabel,
  targetKey,
  users,
  usersError,
  selectedUserIds,
  loading,
  error,
  onClose,
  onSave,
}: AccessRestrictionModalProps) {
  const [draft, setDraft] = useState<{ key: string; ids: number[] } | null>(null);
  const selection = draft?.key === targetKey ? draft.ids : selectedUserIds;
  const restricted = selection.length > 0;

  function toggle(userId: number, checked: boolean) {
    const ids = checked ? [...selection, userId] : selection.filter(id => id !== userId);
    setDraft({ key: targetKey, ids });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Accès — ${targetLabel}`}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={() => onSave(selection)}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Pill kind={restricted ? 'warning' : 'success'}>
          {restricted ? `Restreint à ${selection.length} utilisateur(s)` : 'Ouvert (sauf clients)'}
        </Pill>
        <span className="tiny dim">{INHERITANCE_NOTE[kind]}</span>
      </div>

      <div className="tiny dim" style={{ marginTop: 10 }}>
        Ne cocher personne lève la restriction : l'objet redevient visible par les
        membres, administrateurs et superadmins de l'étude — mais reste FERMÉ par
        défaut aux clients, qui n'y ont accès que si une case les concernant est
        cochée ici (ou plus haut dans l'arborescence). Cocher au moins un
        utilisateur crée une restriction explicite, et le contenu imbriqué en
        hérite tant qu'il ne porte pas la sienne.
      </div>

      {usersError && (
        <div className="tiny" style={{ marginTop: 10, color: 'var(--critical)' }}>
          {usersError}
        </div>
      )}

      <div style={{ marginTop: 12, display: 'grid', gap: 2 }}>
        {loading && <div className="tiny dim">Chargement des accès…</div>}

        {!loading &&
          users.map(user => {
            const checked = selection.includes(user.userId);
            return (
              <div
                key={user.userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div>
                  <div>{user.username}</div>
                  <div className="tiny dim">{roleLabel(user.role)}</div>
                </div>
                <Toggle checked={checked} onChange={next => toggle(user.userId, next)} />
              </div>
            );
          })}

        {!loading && !users.length && !usersError && (
          <div className="tiny dim">
            Aucun utilisateur à proposer : l'annuaire de l'étude est vide, ou réservé aux
            administrateurs.
          </div>
        )}
      </div>

      {error && (
        <div className="tiny" style={{ marginTop: 10, color: 'var(--critical)' }}>
          {error}
        </div>
      )}
    </Modal>
  );
}
