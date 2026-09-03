import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { TagFilter } from '../molecules/TagFilter';
import { DocumentSlideover } from '../organisms/DocumentSlideover';
import { Explorer } from '../organisms/Explorer';
import { QACard } from '../organisms/QACard';
import { TagPicker } from '../organisms/TagPicker';
import { useTopbarSlots } from '../templates/topbarSlots';
import type { PillKind } from '../atoms/Pill';
import type { TabDef } from '../molecules/TabStrip';
import type { DocumentActivityEntry, DocumentCustomField } from '../organisms/DocumentSlideover';
import type { TreeNodeData } from '../organisms/Explorer';
import type { TagColor } from '../atoms/Tag';
import type { TagRef } from '../organisms/TagPicker';

export interface DataroomDocument {
  id: string;
  name: string;
  status: { kind: PillKind; label: string };
  addedBy: string;
  date: string;
  size: string;
  /** Pièce annoncée mais pas encore déposée : ligne grisée, non ouvrable. */
  muted?: boolean;
  /** Tags posés sur la pièce — même catalogue d'office que les dossiers. */
  tags?: TagRef[];
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
  tags: TagRef[];
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
  /** Ouvre le popup de renommage d'un dossier réel (menu "⋮" de l'arbre) —
      les droits d'accès sont gérés séparément, voir `accessRightsTab`. */
  onRenameFolder?: (folderId: string) => void;
  /**
   * Contenu de l'onglet "Droits d'accès" (tableau `AccessRightsTable`, monté
   * par l'appelant qui seul connaît les données réelles). Absent = l'onglet
   * garde son ancien contenu de démonstration (`members`) — c'est le cas des
   * aperçus du kit d'interface, qui n'ont pas d'office derrière eux.
   */
  accessRightsTab?: React.ReactNode;
  onReply?: (qaId: string, text: string) => void;
  onDownloadDocument?: (documentId: string) => void;
  /**
   * Aperçu du document ouvert dans le volet. Rendu par l'appelant, qui est le
   * seul à connaître la dataroom et l'endpoint de contenu ; l'écran, lui, sait
   * seulement quelle pièce est ouverte.
   */
  renderDocumentPreview?: (doc: DataroomDocument) => React.ReactNode;
  /**
   * Dossier à ouvrir d'emblée, quand l'écran est atteint depuis un résultat de
   * recherche plutôt que depuis la liste. Sert de CIBLE, pas de valeur
   * contrôlée : une fois le dossier ouvert, l'utilisateur reste libre d'en
   * sélectionner un autre sans que la prop le ramène en arrière.
   *
   * Chaque demande doit porter une valeur distincte, d'où le compteur qui
   * l'accompagne : rechercher deux fois de suite la même pièce doit rouvrir
   * son dossier, alors qu'un `focusFolderId` inchangé ne déclencherait rien.
   */
  focusFolderId?: string;
  focusNonce?: number;
  /**
   * Catalogue de tags de l'office. Absent = les tags affichés (dossier et
   * pièces) restent en lecture seule — ce qui garde valides les aperçus du kit
   * d'interface, qui n'ont pas d'office derrière eux.
   */
  tagCatalog?: TagRef[];
  /** Pose la sélection COMPLÈTE de tags sur le dossier lui-même. */
  onTagsChange?: (tagIds: number[]) => void | Promise<void>;
  /** Idem pour une pièce. */
  onDocumentTagsChange?: (documentId: string, tagIds: number[]) => void | Promise<void>;
  /** Création à la volée, partagée par les deux sélecteurs. */
  onCreateTag?: (name: string, color: TagColor) => Promise<TagRef>;
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
  onRenameFolder,
  accessRightsTab,
  onReply,
  onDownloadDocument,
  renderDocumentPreview,
  focusFolderId,
  focusNonce,
  tagCatalog = [],
  onTagsChange,
  onDocumentTagsChange,
  onCreateTag,
}: DataroomDetailScreenProps) {
  const slots = useTopbarSlots();
  const [activeTab, setActiveTab] = useState('sub-docs');
  const firstFolderId = tree[0]?.children?.[0]?.id ?? tree[0]?.id;
  const [activeFolderId, setActiveFolderId] = useState<string | undefined>(focusFolderId ?? firstFolderId);
  const [openDoc, setOpenDoc] = useState<DataroomDocument | null>(null);
  // Filtre par tag DANS le dossier ouvert. Il vit ici et pas dans l'appelant
  // parce qu'il ne survit pas au changement de rubrique : filtrer « Signé »
  // puis passer à un autre sous-dossier ne doit pas y masquer silencieusement
  // des pièces.
  const [docTagFilter, setDocTagFilter] = useState<number[]>([]);

  // Une NOUVELLE demande de ciblage (nonce différent) ouvre le dossier visé et
  // referme le volet resté ouvert sur une pièce d'un autre dossier. Dépendance
  // volontairement limitée au nonce : réagir aussi à `focusFolderId` ferait
  // resauter la sélection au moindre re-rendu portant la même cible.
  useEffect(() => {
    if (focusNonce === undefined) return;
    setActiveFolderId(focusFolderId);
    setOpenDoc(null);
    // oxlint-disable-next-line exhaustive-deps
  }, [focusNonce]);

  // Le volet document se ferme dès qu'on change de rubrique ou d'onglet — sans
  // quoi il resterait ouvert sur une pièce qui n'est plus dans la vue (le
  // prototype faisait la même chose via closeSlideover() dans showScreen()).
  function selectFolder(id: string) {
    setActiveFolderId(id);
    setOpenDoc(null);
    setDocTagFilter([]);
  }

  function selectTab(key: string) {
    setActiveTab(key);
    setOpenDoc(null);
  }

  const tabs: TabDef[] = [
    { key: 'sub-docs', icon: 'folder', label: 'Documents' },
    { key: 'sub-qa', icon: 'msg', label: 'Questions / Réponses', count: qaEntries.length },
    { key: 'sub-members', icon: 'lock', label: 'Droits d\'accès' },
    { key: 'sub-history', icon: 'clock', label: 'Historique' },
  ];

  const activeFolderLabel = findLabel(tree, activeFolderId) ?? '—';
  const folderDocs = useMemo(
    () => (activeFolderId && documentsByFolder[activeFolderId]) || [],
    [activeFolderId, documentsByFolder],
  );
  // Filtrage en OU, côté client : l'arborescence entière est déjà chargée (voir
  // useDataroomTree), un aller-retour serveur par case cochée n'apporterait
  // rien qu'un délai.
  const activeDocs = useMemo(
    () =>
      docTagFilter.length === 0
        ? folderDocs
        : folderDocs.filter(doc => doc.tags?.some(t => docTagFilter.includes(t.id))),
    [folderDocs, docTagFilter],
  );

  /* Le repère d'écran remonte dans la topbar (01/09/2026) : c'est le seul
     endroit qui dit où l'on se trouve depuis le retrait des titres de page, et
     le laisser dans le contenu le faisait glisser hors de vue au défilement.
     Le début de barre est libre sur cet écran — seul l'accueil y projette ses
     onglets. */
  const crumb = (
    <Breadcrumb
      items={[
        { label: 'Dossiers', onClick: onBackToList },
        ...(portfolioName ? [{ label: portfolioName }] : []),
      ]}
      current={dataroomName}
    />
  );

  return (
    <section className="screen is-active">
      {/* Hors AppShell (UiKit, démos isolées) le conteneur vaut `null` : le fil
          reste alors en tête d'écran plutôt que de disparaître. */}
      {slots.start ? createPortal(crumb, slots.start) : crumb}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        {/* Le nom du dossier est déjà le dernier segment du fil d'Ariane, en
            topbar depuis le 01/09/2026 : le titre le répétait mot pour mot. */}
        <div>
          <ButtonRow>
            <TagPicker
              value={tags}
              catalog={tagCatalog}
              readOnly={!onTagsChange}
              emptyLabel="Aucun tag"
              onChange={tagIds => onTagsChange?.(tagIds)}
              onCreate={onCreateTag}
            />
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
        <Explorer
          tree={tree}
          activeId={activeFolderId}
          onSelect={selectFolder}
          defaultOpenIds={tree.map(n => n.id)}
          onNodeMenu={onRenameFolder}
        >
          <DocPanel
            title={activeFolderLabel}
            actions={
              <>
                {tagCatalog.length > 0 && (
                  <TagFilter
                    options={tagCatalog}
                    selected={docTagFilter}
                    onChange={setDocTagFilter}
                    label="Tags"
                  />
                )}
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
                    <th>Tags</th>
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
                      <td onClick={e => e.stopPropagation()}>
                        {/* stopPropagation sur la cellule entière : la ligne
                            ouvre le volet document, et taguer une pièce ne doit
                            pas l'ouvrir au passage. Une pièce annoncée mais non
                            déposée (`muted`) n'est pas taguable — il n'y a
                            encore rien à classer. */}
                        <TagPicker
                          value={doc.tags ?? []}
                          catalog={tagCatalog}
                          readOnly={!onDocumentTagsChange || doc.muted}
                          onChange={tagIds => onDocumentTagsChange?.(doc.id, tagIds)}
                          onCreate={onCreateTag}
                        />
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
                  {activeDocs.length === 0 && docTagFilter.length > 0 && (
                    <tr>
                      <td colSpan={7} className="dim tiny" style={{ textAlign: 'center', padding: 18 }}>
                        Aucune pièce de ce dossier ne porte les tags sélectionnés.
                      </td>
                    </tr>
                  )}
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
        {accessRightsTab ?? (
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
        )}
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
                tags: openDoc.tags,
                customFields: openDoc.customFields,
                activity: openDoc.activity,
              }
            : null
        }
        onClose={() => setOpenDoc(null)}
        onDownload={() => onDownloadDocument?.(openDoc!.id)}
        preview={openDoc && renderDocumentPreview ? renderDocumentPreview(openDoc) : undefined}
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
