import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Pill } from '../atoms/Pill';
import { RowMenu } from '../atoms/RowMenu';
import { Subscreen } from '../atoms/Subscreen';
import { Tag } from '../atoms/Tag';
import { Breadcrumb } from '../molecules/Breadcrumb';
import { ButtonRow } from '../molecules/ButtonRow';
import { DocPanel } from '../molecules/DocPanel';
import { Dropzone } from '../molecules/Dropzone';
import { MetaBanner } from '../molecules/MetaBanner';
import { RowName } from '../molecules/RowName';
import { TabStrip } from '../molecules/TabStrip';
import { DocumentSlideover } from '../organisms/DocumentSlideover';
import { Explorer } from '../organisms/Explorer';
import { QACard } from '../organisms/QACard';
import type { PillKind } from '../atoms/Pill';
import type { TabDef } from '../molecules/TabStrip';
import type { DocumentActivityEntry, DocumentCustomField } from '../organisms/DocumentSlideover';
import type { TreeNodeData } from '../organisms/Explorer';

export interface DataroomDocument {
  id: string;
  name: string;
  status: { kind: PillKind; label: string };
  addedBy: string;
  date: string;
  size: string;
  /** Pièce annoncée mais pas encore déposée : ligne grisée, non ouvrable. */
  muted?: boolean;
  /** Métadonnées libres de l'office, affichées dans le volet latéral. */
  customFields?: DocumentCustomField[];
  /** Dernières actions sur la pièce (consultations, dépôts). */
  activity?: DocumentActivityEntry[];
}

export interface QAEntry {
  id: string;
  status: { kind: PillKind; label: string };
  object: string;
  meta: string;
  body: string;
  answer?: { author: string; text: string; time: string };
}

export interface MemberRow {
  id: string;
  initials: string;
  gray?: boolean;
  name: string;
  group: string;
  access: { kind: PillKind; label: string };
  lastLogin: string;
}

export interface HistoryRow {
  id: string;
  timestamp: string;
  user: string;
  action: { kind: PillKind; label: string };
  target: string;
}

export interface DataroomDetailScreenProps {
  portfolioName?: string;
  dataroomName: string;
  tags: Array<{ label: string; plain?: boolean }>;
  status: { kind: PillKind; label: string };
  meta: Array<{ label: string; value: React.ReactNode }>;
  tree: TreeNodeData[];
  documentsByFolder: Record<string, DataroomDocument[]>;
  qaEntries: QAEntry[];
  members: MemberRow[];
  history: HistoryRow[];
  onBackToList: () => void;
  /**
   * `files` n'est renseigné que depuis le glisser-déposer (Dropzone) : les
   * boutons "Ajouter" appellent avec `files` absent, à charge de l'appelant
   * d'ouvrir son propre sélecteur natif — voir App.tsx.
   */
  onAddDocuments?: (activeFolderId: string | undefined, files?: FileList) => void;
  /** Crée un dossier DANS le dossier actuellement affiché (racine si aucun n'est sélectionné). */
  onCreateFolder?: (activeFolderId: string | undefined) => void;
  onReply?: (qaId: string, text: string) => void;
  onDownloadDocument?: (documentId: string) => void;
}

// Écran détail dataroom — index_16.html #screen-dataroom (onglets Documents /
// Q&R / Membres / Historique). L'état d'onglet, de noeud d'arbre sélectionné et
// d'ouverture du volet document est géré ici (état d'écran pur) ; les données
// (tree, documentsByFolder, qaEntries…) viennent des props — à alimenter par
// les vrais endpoints (GET /api/datarooms/<id>/documents/ etc., déjà en place
// côté backend).
export function DataroomDetailScreen({
  portfolioName,
  dataroomName,
  tags,
  status,
  meta,
  tree,
  documentsByFolder,
  qaEntries,
  members,
  history,
  onBackToList,
  onAddDocuments,
  onCreateFolder,
  onReply,
  onDownloadDocument,
}: DataroomDetailScreenProps) {
  const [activeTab, setActiveTab] = useState('sub-docs');
  const firstFolderId = tree[0]?.children?.[0]?.id ?? tree[0]?.id;
  const [activeFolderId, setActiveFolderId] = useState<string | undefined>(firstFolderId);
  const [openDoc, setOpenDoc] = useState<DataroomDocument | null>(null);

  // Le volet document se ferme dès qu'on change de rubrique ou d'onglet — sans
  // quoi il resterait ouvert sur une pièce qui n'est plus dans la vue (le
  // prototype faisait la même chose via closeSlideover() dans showScreen()).
  function selectFolder(id: string) {
    setActiveFolderId(id);
    setOpenDoc(null);
  }

  function selectTab(key: string) {
    setActiveTab(key);
    setOpenDoc(null);
  }

  const tabs: TabDef[] = [
    { key: 'sub-docs', icon: 'folder', label: 'Documents' },
    { key: 'sub-qa', icon: 'msg', label: 'Questions / Réponses', count: qaEntries.length },
    { key: 'sub-members', icon: 'users', label: 'Membres & droits' },
    { key: 'sub-history', icon: 'clock', label: 'Historique' },
  ];

  const activeFolderLabel = findLabel(tree, activeFolderId) ?? '—';
  const activeDocs = (activeFolderId && documentsByFolder[activeFolderId]) || [];

  return (
    <section className="screen is-active">
      <Breadcrumb
        items={[
          { label: 'Dossiers', onClick: onBackToList },
          ...(portfolioName ? [{ label: portfolioName }] : []),
        ]}
        current={dataroomName}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">{dataroomName}</h1>
          <ButtonRow style={{ marginTop: 8 }}>
            {tags.map((t, i) => (
              <Tag key={i} icon={t.plain ? undefined : 'tag'} plain={t.plain}>
                {t.label}
              </Tag>
            ))}
            <Pill kind={status.kind}>{status.label}</Pill>
          </ButtonRow>
        </div>
        <ButtonRow>
          <Button size="sm">
            <svg className="icon">
              <use href="#i-link" />
            </svg>
            Lien temporaire
          </Button>
          <Button size="sm">
            <svg className="icon">
              <use href="#i-zip" />
            </svg>
            Export ZIP
          </Button>
          <Button variant="accent" size="sm" onClick={() => onAddDocuments?.(activeFolderId)}>
            <svg className="icon">
              <use href="#i-plus" />
            </svg>
            Ajouter des documents
          </Button>
        </ButtonRow>
      </div>

      <MetaBanner items={meta} style={{ marginTop: 18 }} />

      <TabStrip tabs={tabs} active={activeTab} onChange={selectTab} />

      <Subscreen active={activeTab === 'sub-docs'}>
        <Explorer tree={tree} activeId={activeFolderId} onSelect={selectFolder} defaultOpenIds={tree.map(n => n.id)}>
          <DocPanel
            title={activeFolderLabel}
            actions={
              <>
                <Button size="sm" onClick={() => onCreateFolder?.(activeFolderId)}>
                  <svg className="icon">
                    <use href="#i-up" />
                  </svg>
                  Nouveau sous-dossier
                </Button>
                <Button variant="accent" size="sm" onClick={() => onAddDocuments?.(activeFolderId)}>
                  <svg className="icon">
                    <use href="#i-plus" />
                  </svg>
                  Ajouter
                </Button>
              </>
            }
          >
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Statut</th>
                    <th>Ajouté par</th>
                    <th>Date</th>
                    <th>Taille</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {activeDocs.map(doc => (
                    <tr
                      key={doc.id}
                      className={doc.muted ? undefined : 'clickable'}
                      onClick={doc.muted ? undefined : () => setOpenDoc(doc)}
                    >
                      <RowName
                        icon="file"
                        iconBg={doc.muted ? 'var(--surface-alt)' : 'var(--critical-bg)'}
                        iconColor={doc.muted ? 'var(--ink-400)' : 'var(--critical)'}
                        muted={doc.muted}
                      >
                        {doc.name}
                      </RowName>
                      <td>
                        <Pill kind={doc.status.kind}>{doc.status.label}</Pill>
                      </td>
                      <td className={doc.muted ? 'dim' : undefined}>{doc.addedBy}</td>
                      <td className="dim">{doc.date}</td>
                      <td className="mono dim">{doc.size}</td>
                      {doc.muted ? <td /> : (
                        <td>
                          <svg className="icon" style={{ color: 'var(--ink-400)' }}>
                            <use href="#i-eye" />
                          </svg>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Dropzone
              hint="Glisser un document dans ce dossier ou"
              onFiles={files => onAddDocuments?.(activeFolderId, files)}
            />
          </DocPanel>
        </Explorer>
      </Subscreen>

      <Subscreen active={activeTab === 'sub-qa'}>
        {qaEntries.map(qa => (
          <QACard
            key={qa.id}
            status={qa.status}
            object={qa.object}
            meta={qa.meta}
            body={qa.body}
            answer={qa.answer}
            onReply={qa.answer ? undefined : text => onReply?.(qa.id, text)}
          />
        ))}
      </Subscreen>

      <Subscreen active={activeTab === 'sub-members'}>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Membre</th>
                  <th>Groupe</th>
                  <th>Droits</th>
                  <th>Dernière connexion</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td className="row-name">
                      <div className={m.gray ? 'avatar sm gray' : 'avatar sm'}>{m.initials}</div>
                      {m.name}
                    </td>
                    <td>
                      <Tag plain>{m.group}</Tag>
                    </td>
                    <td>
                      <Pill kind={m.access.kind}>{m.access.label}</Pill>
                    </td>
                    <td className="dim">{m.lastLogin}</td>
                    <RowMenu />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Subscreen>

      <Subscreen active={activeTab === 'sub-history'}>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Horodatage</th>
                  <th>Utilisateur</th>
                  <th>Action</th>
                  <th>Élément</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td className="mono dim">{h.timestamp}</td>
                    <td>{h.user}</td>
                    <td>
                      <Pill kind={h.action.kind}>{h.action.label}</Pill>
                    </td>
                    <td>{h.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Subscreen>

      <DocumentSlideover
        doc={
          openDoc
            ? {
                name: openDoc.name,
                location: activeFolderLabel,
                status: openDoc.status,
                addedBy: openDoc.addedBy,
                date: openDoc.date,
                size: openDoc.size,
                customFields: openDoc.customFields,
                activity: openDoc.activity,
              }
            : null
        }
        onClose={() => setOpenDoc(null)}
        onDownload={() => onDownloadDocument?.(openDoc!.id)}
      />
    </section>
  );
}

function findLabel(nodes: TreeNodeData[], id?: string): string | undefined {
  if (!id) return undefined;
  for (const node of nodes) {
    if (node.id === id) return node.label;
    if (node.children) {
      const found = findLabel(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}
