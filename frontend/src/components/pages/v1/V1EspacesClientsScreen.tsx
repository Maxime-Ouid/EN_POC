import { useCallback, useState } from 'react';
import { pagerInfo, useListPaging } from '../../../hooks/useListPaging';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Pill } from '../../atoms/Pill';
import { Screen } from '../../atoms/Screen';
import { TextInput } from '../../atoms/TextInput';
import { Textarea } from '../../atoms/Textarea';
import { Toggle } from '../../atoms/Toggle';
import { Dropzone } from '../../molecules/Dropzone';
import { Field } from '../../molecules/Field';
import { ListControls } from '../../molecules/ListControls';
import { RowName } from '../../molecules/RowName';
import { TablePager } from '../../molecules/TablePager';
import { Toolbar } from '../../molecules/Toolbar';
import { Modal } from '../../organisms/Modal';
import { TableCard } from '../../organisms/TableCard';

export interface V1EspaceClientRow {
  id: string;
  nom: string;
  dossiers: number;
  volume: string;
  synchronise?: boolean;
}

export interface V1EspaceClientDraft {
  nom: string;
  description: string;
  coordonnees: string;
  web: string;
  visible: boolean;
  synchronisation: boolean;
}

export interface V1EspacesClientsScreenProps {
  rows: V1EspaceClientRow[];
  total: number;
  onCreate?: () => void;
  onSave?: (id: string, draft: V1EspaceClientDraft) => void;
}

const COLUMNS = ['Nom', 'Dossiers', 'Volume', 'Synchronisation', ''];

const EMPTY: V1EspaceClientDraft = {
  nom: '',
  description: '',
  coordonnees: '',
  web: '',
  visible: true,
  synchronisation: false,
};

// Dossiers > Espaces clients (captures 115315 pour la liste, 114026 pour la
// modale d'édition « Espace client » et ses sept champs).
export function V1EspacesClientsScreen({
  rows,
  total,
  onCreate,
  onSave,
}: V1EspacesClientsScreenProps) {
  const match = useCallback(
    (row: V1EspaceClientRow, q: string) => row.nom.toLowerCase().includes(q),
    [],
  );
  const list = useListPaging(rows, match);
  const [editing, setEditing] = useState<V1EspaceClientRow | null>(null);
  const [draft, setDraft] = useState<V1EspaceClientDraft>(EMPTY);

  function open(row: V1EspaceClientRow) {
    setEditing(row);
    setDraft({
      ...EMPTY,
      nom: row.nom,
      visible: true,
      synchronisation: Boolean(row.synchronise),
    });
  }

  return (
    <Screen>
      <Toolbar>
        <Button size="sm" variant="primary" onClick={onCreate}>
          <Icon id="plus" />
          Nouvel espace client
        </Button>
      </Toolbar>

      <ListControls
        unit="espaces clients"
        perPage={list.perPage}
        onPerPageChange={list.setPerPage}
        search={list.search}
        onSearchChange={list.setSearch}
      />

      <TableCard headers={COLUMNS}>
        {list.rows.map(row => (
          <tr key={row.id}>
            <RowName icon="users" iconBg="var(--brass-100)" iconColor="var(--brass-700)">
              {row.nom}
            </RowName>
            <td className="mono">{row.dossiers}</td>
            <td className="mono">{row.volume}</td>
            <td>
              {row.synchronise ? <Pill kind="info">Synchronisé</Pill> : <span className="dim">—</span>}
            </td>
            <td>
              <Button size="sm" variant="ghost" onClick={() => open(row)}>
                Modifier
              </Button>
            </td>
          </tr>
        ))}
      </TableCard>

      <TablePager
        info={pagerInfo('espaces clients', list.page, list.perPage, list.filteredCount)}
        pages={list.pages}
        current={list.page}
        onChange={list.setPage}
        onExport={() => {}}
      />

      <div className="tiny dim" style={{ marginTop: 10 }}>
        Volumétrie de référence en production : {total} espaces clients.
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Espace client"
        footer={
          <>
            <Button size="sm" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                if (editing) onSave?.(editing.id, draft);
                setEditing(null);
              }}
            >
              Modifier
            </Button>
          </>
        }
      >
        <Field label="Nom">
          <TextInput value={draft.nom} onChange={e => setDraft({ ...draft, nom: e.target.value })} />
        </Field>
        <Field label="Description">
          <Textarea
            rows={3}
            value={draft.description}
            onChange={e => setDraft({ ...draft, description: e.target.value })}
          />
        </Field>
        <Field label="Coordonnées">
          <Textarea
            rows={2}
            value={draft.coordonnees}
            onChange={e => setDraft({ ...draft, coordonnees: e.target.value })}
          />
        </Field>
        <Field label="Web">
          <TextInput value={draft.web} onChange={e => setDraft({ ...draft, web: e.target.value })} />
        </Field>
        <Field label="Logo">
          <Dropzone hint="Glisser le logo de l'espace client ou" accept="image/*" />
        </Field>
        <div className="v1-list-controls" style={{ marginTop: 14 }}>
          <span className="tiny">Visible</span>
          <Toggle
            checked={draft.visible}
            onChange={next => setDraft({ ...draft, visible: next })}
          />
        </div>
        <div className="v1-list-controls">
          <span className="tiny">Synchronisation des membres et des groupes</span>
          <Toggle
            checked={draft.synchronisation}
            onChange={next => setDraft({ ...draft, synchronisation: next })}
          />
        </div>
        <div className="help">
          Écran de démonstration : la modification n'est pas encore transmise au serveur.
        </div>
      </Modal>
    </Screen>
  );
}
