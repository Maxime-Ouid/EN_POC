import { useState } from 'react';
import {
  AppearanceTab, Avatar, Breadcrumb, Button, DocPanel, DocumentSlideover, Explorer,
  Icon, IconButton, IdentityTab, Modal, ModulesTab, Nav, NavGroup, NavItem,
  NewDataroomModal, Pill, ProtoPill, QACard, RowName, Sidebar, SidebarBrand,
  SidebarFoot, Slideover, SoField, TableCard, TagPicker, TenantSwitcher, TokenEditor, Topbar,
  TopbarRight, TopbarSearch,
} from '../components';
import {
  CLIENT_SPACE_OPTIONS, DATAROOM_TEMPLATES, DOCS_BY_FOLDER, MODULE_CATALOG,
  PORTFOLIO_OPTIONS, TREE,
} from '../data/demo';
import { Specimen, Stage } from './Specimen';
import type { NewDataroomTemplateOption, TagRef } from '../components';

// NewDataroomModal attend désormais de vrais Template (GET /api/templates/,
// voir CLAUDE.md) — cette fiche du UI kit n'a pas de backend derrière elle
// (NEW_DATAROOM_TEMPLATES a disparu de data/demo.tsx, devenu sans appelant réel).
const DEMO_TEMPLATE_OPTIONS: NewDataroomTemplateOption[] = [
  { id: 1, name: 'Vente immobilière — standard', description: 'Recommandé · le plus utilisé par les offices' },
  { id: 2, name: 'Dossier de divorce', description: 'Groupes prédéfinis' },
];

// Spécimens des organismes : blocs autonomes, souvent porteurs de leur propre
// état. Ceux qui se positionnent en `fixed` (modale, volets) sont enfermés dans
// un <Stage> — sinon ils s'échapperaient de leur fiche pour couvrir la page.

const DEMO_TAG_CATALOG: TagRef[] = [
  { id: 1, name: 'Vente', color: 'brass' },
  { id: 2, name: 'Prioritaire', color: 'critical' },
  { id: 3, name: 'APUI', color: 'info' },
  { id: 4, name: 'Copropriété', color: 'neutral' },
  { id: 5, name: 'Signé', color: 'success' },
];

/** Le sélecteur ne garde pas la sélection : elle appartient à l'élément tagué.
    `onCreate` simule ici la création à la volée servie par le serveur. */
function TagPickerDemo({ editable = true }: { editable?: boolean }) {
  const [catalog, setCatalog] = useState(DEMO_TAG_CATALOG);
  const [selected, setSelected] = useState<number[]>([1]);
  return (
    <TagPicker
      value={catalog.filter(t => selected.includes(t.id))}
      catalog={catalog}
      readOnly={!editable}
      onChange={setSelected}
      onCreate={async (name, color) => {
        const tag = { id: Math.max(...catalog.map(t => t.id)) + 1, name, color };
        setCatalog(prev => [...prev, tag]);
        return tag;
      }}
    />
  );
}

function ExplorerDemo() {
  const [folder, setFolder] = useState('2.1');
  return (
    <Explorer tree={TREE} activeId={folder} onSelect={setFolder} defaultOpenIds={['1', '2']}>
      <DocPanel title={folder} actions={<Button variant="accent" size="sm"><Icon id="plus" />Ajouter</Button>}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nom</th><th>Statut</th><th>Taille</th></tr></thead>
            <tbody>
              {(DOCS_BY_FOLDER[folder] ?? []).map(d => (
                <tr key={d.id}>
                  <RowName icon="file" iconBg="var(--critical-bg)" iconColor="var(--critical)">{d.name}</RowName>
                  <td><Pill kind={d.status.kind}>{d.status.label}</Pill></td>
                  <td className="mono dim">{d.size}</td>
                </tr>
              ))}
              {!(DOCS_BY_FOLDER[folder] ?? []).length && (
                <tr><td className="dim" colSpan={3}>Aucune pièce dans cette rubrique.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DocPanel>
    </Explorer>
  );
}

function ModalDemo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <div className="uikit-row" style={{ marginBottom: 10 }}>
        <Button size="sm" onClick={() => setOpen(o => !o)}>{open ? 'Fermer' : 'Ouvrir'} la modale</Button>
      </div>
      <Stage height={300}>
        <Modal open={open} onClose={() => setOpen(false)} title="Titre de la modale"
          footer={<><Button size="sm" onClick={() => setOpen(false)}>Annuler</Button><Button variant="primary" size="sm">Confirmer</Button></>}>
          <p className="tiny dim">Le contenu de la modale défile si nécessaire ; le pied reste visible.</p>
        </Modal>
      </Stage>
    </>
  );
}

function SlideoverDemo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <div className="uikit-row" style={{ marginBottom: 10 }}>
        <Button size="sm" onClick={() => setOpen(o => !o)}>{open ? 'Fermer' : 'Ouvrir'} le volet</Button>
      </div>
      <Stage height={320}>
        <Slideover open={open} onClose={() => setOpen(false)} title="Panneau latéral">
          <SoField label="Clé" value="Valeur" />
          <hr className="sep" />
          <p className="tiny dim">Le volet glisse depuis la droite et se superpose au contenu.</p>
        </Slideover>
      </Stage>
    </>
  );
}

function DocumentSlideoverDemo() {
  const doc = DOCS_BY_FOLDER['2.1'][0];
  const [open, setOpen] = useState(true);
  return (
    <>
      <div className="uikit-row" style={{ marginBottom: 10 }}>
        <Button size="sm" onClick={() => setOpen(o => !o)}>{open ? 'Fermer' : 'Ouvrir'} la fiche</Button>
      </div>
      <Stage height={520}>
        <DocumentSlideover
          doc={open ? {
            name: doc.name, location: '2.1 Plans', status: doc.status,
            addedBy: doc.addedBy, date: doc.date, size: doc.size,
            customFields: doc.customFields, activity: doc.activity,
          } : null}
          onClose={() => setOpen(false)}
        />
      </Stage>
    </>
  );
}

function NewDataroomModalDemo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <div className="uikit-row" style={{ marginBottom: 10 }}>
        <Button size="sm" onClick={() => setOpen(o => !o)}>{open ? 'Fermer' : 'Ouvrir'}</Button>
      </div>
      <Stage height={560}>
        <NewDataroomModal open={open} onClose={() => setOpen(false)} onCreate={() => setOpen(false)}
          portfolioOptions={PORTFOLIO_OPTIONS} clientSpaceOptions={CLIENT_SPACE_OPTIONS}
          templates={DEMO_TEMPLATE_OPTIONS} />
      </Stage>
    </>
  );
}

function ModulesTabDemo() {
  const [modules, setModules] = useState(MODULE_CATALOG);
  return (
    <ModulesTab modules={modules} templates={DATAROOM_TEMPLATES}
      onToggleModule={(slug, next) => setModules(ms => ms.map(m => (m.slug === slug ? { ...m, enabled: next } : m)))} />
  );
}

export function OrganismSpecimens() {
  return (
    <>
      <Specimen
        name="TagPicker"
        variants={[
          { label: 'Éditable — croix pour retirer, « + » pour ouvrir le catalogue', node: <TagPickerDemo /> },
          { label: 'Lecture seule — mêmes pastilles, sans prise', node: <TagPickerDemo editable={false} /> },
        ]}
      />

      <Specimen
        name="TableCard"
        variants={[{ label: 'Tableau dans une carte', node: (
          <TableCard headers={['Membre', 'Groupe', 'Droits', 'Dernière connexion']}>
            <tr>
              <td className="row-name"><Avatar size="sm">DB</Avatar>Delphine Briand</td>
              <td>Étude</td>
              <td><Pill kind="success">Lecture / Écriture</Pill></td>
              <td className="dim">Aujourd'hui, 10:40</td>
            </tr>
            <tr>
              <td className="row-name"><Avatar size="sm" gray>?</Avatar>Invitation en attente</td>
              <td>Acquéreur</td>
              <td><Pill kind="neutral">—</Pill></td>
              <td className="dim">Jamais connecté</td>
            </tr>
          </TableCard>
        )}]}
      />

      <Specimen
        name="Topbar"
        variants={[{ label: 'Barre du haut complète', node: (
          <div style={{ position: 'relative' }}>
            <Topbar>
              <Breadcrumb items={[{ label: 'Briand & Hamon' }]} current="Accueil" />
              <TopbarSearch placeholder="Rechercher un dossier, un document, un contact…" shortcut="⌘K" />
              <TopbarRight>
                <ProtoPill label="Aperçu — maquette visuelle" />
                <IconButton icon="bell" hasDot />
                <Avatar size="sm" style={{ width: 32, height: 32, fontSize: 12 }}>CD</Avatar>
              </TopbarRight>
            </Topbar>
          </div>
        )}]}
      />

      <Specimen
        name="Sidebar"
        variants={[{ label: 'Colonne latérale assemblée', node: (
          // `.sidebar` est en position:fixed (components.css §6.14). `overflow:hidden`
          // ne retient PAS un descendant fixe : il faut un bloc conteneur, ce que
          // <Stage> fournit via son transform. Sans lui, la colonne s'échappait de sa
          // fiche et se collait en haut à gauche, par-dessus la nav du UI kit.
          <Stage height={460}>
            <div style={{ height: '100%', display: 'flex', background: 'var(--shell-bg)' }}>
              <Sidebar>
                <SidebarBrand name="Espace Notarial" sub="Next" />
                <TenantSwitcher name="Briand & Hamon" role="Notaires associés" />
                <Nav>
                  <NavGroup label="Général">
                    <NavItem icon="home" active>Accueil</NavItem>
                    <NavItem icon="layers">Portefeuilles</NavItem>
                    <NavItem icon="folder" count={245}>Dossiers</NavItem>
                  </NavGroup>
                  <NavGroup label="Pilotage">
                    <NavItem icon="clock">Statistiques & facturation</NavItem>
                  </NavGroup>
                  <NavGroup label="Office">
                    <NavItem icon="settings">Personnalisation</NavItem>
                  </NavGroup>
                </Nav>
                <SidebarFoot initials="CD" name="Cyril Dumont" role="Superadmin" onLogout={() => {}} />
              </Sidebar>
            </div>
          </Stage>
        )}]}
      />

      <Specimen
        name="Explorer"
        note="Arborescence de rubriques à gauche, pièces de la rubrique sélectionnée à droite. L'ouverture des nœuds est un état interne ; la sélection est pilotée par le parent."
        variants={[{ label: 'Explorateur navigable — la rubrique 2.1 contient des pièces', node: <ExplorerDemo /> }]}
      />

      <Specimen
        name="QACard"
        variants={[
          { label: 'Sans réponse (formulaire de réponse ouvert)', node: (
            <QACard status={{ kind: 'warning', label: 'Sans réponse' }}
              object="Question sur : EHF réel 15.07.2026"
              meta="Réf. #Q104 · Sandrine ACQUÉREUR · aujourd'hui 09:15"
              body="La fiche réelle mentionne une inscription de 1994 — est-elle toujours valable ou faut-il une mise à jour avant la signature ?"
              onReply={() => {}} />
          )},
          { label: 'Déjà répondue', node: (
            <QACard status={{ kind: 'success', label: 'Répondue' }}
              object="Question sur : Rapport Géorisques du 09.07.2026"
              meta="Réf. #Q098 · Marc VENDEUR · 18/07 11:03"
              body="Le rapport couvre-t-il l'intégralité de la parcelle B ou uniquement le bâtiment principal ?"
              answer={{ author: 'Cyril Dumont', text: "Il couvre l'intégralité de la parcelle, bâtiment et abords compris.", time: '18/07 14:40' }} />
          )},
        ]}
      />

      <Specimen name="Modal" variants={[{ label: 'Modale générique', node: <ModalDemo /> }]} />
      <Specimen name="Slideover" variants={[{ label: 'Volet latéral générique', node: <SlideoverDemo /> }]} />
      <Specimen name="DocumentSlideover" variants={[{ label: 'Fiche document complète', node: <DocumentSlideoverDemo /> }]} />
      <Specimen name="NewDataroomModal" variants={[{ label: 'Création de dossier', node: <NewDataroomModalDemo /> }]} />

      <Specimen
        name="TokenEditor"
        note="Toute la grille de couleurs, générée depuis le référentiel de tokens. Ce que vous modifiez ici s'applique immédiatement à cette page — c'est le même moteur que dans l'application."
        variants={[{ label: 'Éditeur complet', node: <div style={{ maxWidth: 620 }}><TokenEditor /></div> }]}
      />

      <Specimen
        name="IdentityTab"
        variants={[{ label: 'Onglet Identité', node: (
          <IdentityTab identity={{ displayName: 'Briand & Hamon, notaires associés', subdomain: 'briand-hamon.espacenotarial.fr' }} />
        )}]}
      />

      <Specimen name="ModulesTab" variants={[{ label: 'Onglet Modules & modèles', node: <ModulesTabDemo /> }]} />

      <Specimen
        name="AppearanceTab"
        note="Onglet Apparence entier : éditeur de tokens, presets et aperçu en direct. Il lit et écrit le thème global — les changements faits ici repeignent tout le UI kit."
        variants={[{ label: 'Onglet complet', node: <AppearanceTab /> }]}
      />
    </>
  );
}
