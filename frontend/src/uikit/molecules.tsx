import { useState } from 'react';
import {
  AvatarStack, Breadcrumb, Button, ButtonRow, Card, DocPanel, Dropzone,
  FeedItem, Field, FieldRow, Icon, MetaBanner, ModuleRow, Nav, NavGroup, NavItem,
  PageHeader, Pill, PresetCard, PresetRow, RowName, Select, ShapeSwatch,
  SidebarBrand, SidebarFoot, StatCard, TabStrip, TemplateOption, TenantSwitcher,
  TextInput, TokenItem, TopbarSearch, TypographySample, BarTrack,
} from '../components';
import { TOKEN_SCHEMA } from '../theme/schema';
import { Specimen } from './Specimen';

// Spécimens des molécules : des atomes assemblés pour rendre un service précis.
// Plusieurs sont interactifs — ils sont donc pilotés par un petit composant à
// état, pour qu'on puisse les manipuler dans la page.

function Row({ children }: { children: React.ReactNode }) {
  return <div className="uikit-row">{children}</div>;
}

function ShellBox({ children, width = 236 }: { children: React.ReactNode; width?: number }) {
  return (
    <div style={{ width, background: 'var(--shell-bg)', borderRadius: 'var(--radius-md)', padding: 8 }}>
      {children}
    </div>
  );
}

function TabStripDemo() {
  const [active, setActive] = useState('docs');
  return (
    <TabStrip
      tabs={[
        { key: 'docs', icon: 'folder', label: 'Documents' },
        { key: 'qa', icon: 'msg', label: 'Questions / Réponses', count: 3 },
        { key: 'members', icon: 'users', label: 'Membres & droits' },
        { key: 'history', icon: 'clock', label: 'Historique' },
      ]}
      active={active}
      onChange={setActive}
    />
  );
}

function PresetRowDemo() {
  const [typo, setTypo] = useState('classique');
  const [shape, setShape] = useState('equilibre');
  return (
    <>
      <PresetRow label="Typographie">
        <PresetCard active={typo === 'classique'} onSelect={() => setTypo('classique')}
          preview={<TypographySample fontFamily="'Poppins',sans-serif" />} name="Classique" desc="Poppins / Inter" />
        <PresetCard active={typo === 'moderne'} onSelect={() => setTypo('moderne')}
          preview={<TypographySample fontFamily="'Sora',sans-serif" />} name="Moderne" desc="Sora / Inter" />
        <PresetCard active={typo === 'editorial'} onSelect={() => setTypo('editorial')}
          preview={<TypographySample fontFamily="'Fraunces',serif" />} name="Éditorial" desc="Fraunces / Inter" />
      </PresetRow>
      <PresetRow label="Formes">
        <PresetCard active={shape === 'anguleux'} onSelect={() => setShape('anguleux')}
          preview={<ShapeSwatch radius="4px" />} name="Anguleux" />
        <PresetCard active={shape === 'equilibre'} onSelect={() => setShape('equilibre')}
          preview={<ShapeSwatch radius="9px" />} name="Équilibré" />
        <PresetCard active={shape === 'arrondi'} onSelect={() => setShape('arrondi')}
          preview={<ShapeSwatch radius="15px" />} name="Arrondi" />
      </PresetRow>
    </>
  );
}

function ModuleRowDemo() {
  const [state, setState] = useState({ coffre: false, rib: true });
  return (
    <Card padded style={{ maxWidth: 560 }}>
      <ModuleRow icon="lock" iconBg="var(--info-bg)" iconColor="var(--info)"
        name="Coffre-fort électronique" desc="Archivage à valeur probante — module Notantis"
        enabled={state.coffre} onToggle={v => setState(s => ({ ...s, coffre: v }))} />
      <ModuleRow icon="shield" iconBg="var(--info-bg)" iconColor="var(--info)"
        name="Confiance RIB" desc="Vérification des coordonnées bancaires"
        enabled={state.rib} onToggle={v => setState(s => ({ ...s, rib: v }))} />
      <ModuleRow icon="layers" iconBg="var(--surface-alt)" iconColor="var(--ink-400)" muted
        name="Serveur MCP" desc="Connexion aux outils IA internes de l'étude"
        pill={{ kind: 'neutral', label: 'À venir' }} last />
    </Card>
  );
}

function DropzoneDemo() {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div style={{ maxWidth: 380 }}>
      <Dropzone accept="image/*" onFiles={files => setPicked(files[0]?.name ?? null)} />
      <div className="tiny dim" style={{ marginTop: 8 }}>
        {picked ? `Fichier choisi : ${picked}` : 'Le clic et le glisser-déposer déclenchent tous deux onFiles.'}
      </div>
    </div>
  );
}

export function MoleculeSpecimens() {
  return (
    <>
      <Specimen
        name="PageHeader"
        variants={[
          { label: 'Surtitre + titre + sous-titre', node: (
            <PageHeader eyebrow="Pilotage" title="Statistiques & facturation"
              sub="Suivi d'usage par client, pour votre propre refacturation en marque grise." />
          )},
          { label: 'Avec actions à droite', node: (
            <PageHeader eyebrow="245 dossiers" title="Dossiers"
              actions={<ButtonRow><Button size="sm"><Icon id="filter" />Filtrer</Button><Button variant="accent" size="sm"><Icon id="plus" />Nouveau dossier</Button></ButtonRow>} />
          )},
        ]}
      />

      <Specimen
        name="ButtonRow"
        variants={[{ label: 'Groupe d\'actions', node: (
          <ButtonRow>
            <Button size="sm"><Icon id="link" />Lien temporaire</Button>
            <Button size="sm"><Icon id="zip" />Export ZIP</Button>
            <Button variant="accent" size="sm"><Icon id="plus" />Ajouter des documents</Button>
          </ButtonRow>
        )}]}
      />

      <Specimen
        name="Field"
        variants={[{ label: 'Label + contrôle', node: (
          <div style={{ maxWidth: 340 }}>
            <Field label="Nom du dossier"><TextInput placeholder="ex. Dossier de vente Caudan" /></Field>
          </div>
        )}]}
      />

      <Specimen
        name="FieldRow"
        variants={[{ label: 'Deux champs côte à côte', node: (
          <div style={{ maxWidth: 520 }}>
            <FieldRow>
              <Field label="Portefeuille"><Select><option>Aucun</option><option>Ivry — Le Monde</option></Select></Field>
              <Field label="Espace client"><Select><option>République</option><option>Arsenal</option></Select></Field>
            </FieldRow>
          </div>
        )}]}
      />

      <Specimen name="Dropzone" variants={[{ label: 'Zone de dépôt', node: <DropzoneDemo /> }]} />

      <Specimen
        name="StatCard"
        variants={[
          { label: 'Avec delta positif', node: (
            <div style={{ maxWidth: 260 }}>
              <StatCard label="Dossiers actifs" value={64} icon="folder" iconBg="var(--brass-100)" iconColor="var(--brass-700)"
                delta={{ text: '+6 ce mois', tone: 'up' }} />
            </div>
          )},
          { label: 'Avec delta d\'alerte', node: (
            <div style={{ maxWidth: 260 }}>
              <StatCard label="Questions en attente" value={7} icon="msg" iconBg="var(--warning-bg)" iconColor="var(--warning)"
                delta={{ text: '3 depuis plus de 48h', tone: 'warn' }} />
            </div>
          )},
          { label: 'Avec contenu libre en pied (ici une jauge)', node: (
            <div style={{ maxWidth: 260 }}>
              <StatCard label="Stockage utilisé" value={<>312 <span style={{ fontSize: 14 }}>Go</span></>} icon="layers"
                iconBg="var(--info-bg)" iconColor="var(--info)"
                sub={<><BarTrack percent={62} label="62 %" /><div style={{ marginTop: 6 }}>62 % de l'offre 500 Go</div></>} />
            </div>
          )},
        ]}
      />

      <Specimen
        name="AvatarStack"
        variants={[{ label: 'Membres d\'un dossier', node: (
          <Row>
            <AvatarStack avatars={[{ label: 'DB' }, { label: 'CD' }, { label: '+6', gray: true }]} />
            <AvatarStack avatars={[{ label: 'HH' }, { label: '+2', gray: true }]} />
          </Row>
        )}]}
      />

      <Specimen
        name="RowName"
        variants={[{ label: 'Première cellule d\'une ligne de tableau', node: (
          <div className="card"><div className="table-wrap"><table><tbody>
            <tr><RowName icon="folder" iconBg="var(--info-bg)" iconColor="var(--info)">Dossier de vente Caudan</RowName></tr>
            <tr><RowName icon="folder" iconBg="var(--surface-alt)" iconColor="var(--ink-500)" muted>Nice étoile (clôturé)</RowName></tr>
          </tbody></table></div></div>
        )}]}
      />

      <Specimen name="TabStrip" variants={[{ label: 'Onglets, dont un avec compteur', node: <TabStripDemo /> }]} />

      <Specimen
        name="MetaBanner"
        variants={[{ label: 'Métadonnées d\'un dossier', node: (
          <MetaBanner items={[
            { label: 'Créé le', value: '19 mai 2026 · Cyril Dumont' },
            { label: 'Documents', value: '312 fichiers' },
            { label: 'Poids', value: <span className="mono">18,2 Go</span> },
            { label: 'Dernière modification', value: "Aujourd'hui, 10:42" },
          ]} />
        )}]}
      />

      <Specimen
        name="FeedItem"
        variants={[
          { label: 'Fil d\'activité — la couleur encode le type d\'évènement', node: (
            <Card padded style={{ maxWidth: 480 }}>
              <FeedItem icon="file" iconBg="var(--info-bg)" iconColor="var(--info)"
                text={<><b>Delphine Briand</b> a déposé <b>3 pièces</b></>} time="Aujourd'hui, 10:42" />
              <FeedItem icon="msg" iconBg="var(--warning-bg)" iconColor="var(--warning)"
                text="Nouvelle question sur « EHF réel 15.07.2026 »" time="Aujourd'hui, 09:15" />
              <FeedItem icon="x" iconBg="var(--critical-bg)" iconColor="var(--critical)"
                text="Document supprimé — historisé" time="Hier, 11:20" />
            </Card>
          )},
          { label: 'compact (volet latéral)', node: (
            <Card padded style={{ maxWidth: 320 }}>
              <FeedItem compact icon="eye" iconBg="var(--info-bg)" iconColor="var(--info)"
                text="Consulté par Sandrine — Acquéreur" time="Aujourd'hui, 09:02" />
            </Card>
          )},
        ]}
      />

      <Specimen
        name="Breadcrumb"
        variants={[{ label: 'Fil d\'Ariane', node: (
          <Breadcrumb items={[{ label: 'Dossiers', onClick: () => {} }, { label: 'Ivry — Le Monde' }]} current="Dossier de vente Caudan" />
        )}]}
      />

      <Specimen
        name="TopbarSearch"
        variants={[
          { label: 'Dans la barre du haut (largeur par défaut)', node: (
            <div style={{ maxWidth: 420 }}>
              <TopbarSearch placeholder="Rechercher un dossier, un document, un contact…" shortcut="⌘K" />
            </div>
          )},
          { label: 'Contraint pour une barre de filtres', node: (
            <TopbarSearch placeholder="Rechercher…" style={{ maxWidth: 260, margin: 0 }} />
          )},
        ]}
      />

      <Specimen
        name="TemplateOption"
        variants={[{ label: 'Choix de modèle, avec ou sans menu', node: (
          <div style={{ maxWidth: 480 }}>
            <TemplateOption name="Vente immobilière — standard" desc="14 rubriques · diagnostics, urbanisme, fiscalité…" selected onClick={() => {}} />
            <TemplateOption name="Dossier de divorce" desc="Groupes Conjoint 1 / Conjoint 2 / Magistrats" onClick={() => {}} />
            <TemplateOption icon="file" name="Dataroom vide" desc="Sans arborescence pré-remplie" onMenu={() => {}} />
          </div>
        )}]}
      />

      <Specimen name="ModuleRow" variants={[{ label: 'Modules activables et module annoncé', node: <ModuleRowDemo /> }]} />

      <Specimen name="PresetRow" variants={[{ label: 'Groupes de presets (radiogroup)', node: <PresetRowDemo /> }]} />

      <Specimen
        name="PresetCard"
        variants={[{ label: 'Sélectionnée / non sélectionnée', node: (
          <Row>
            <PresetCard active onSelect={() => {}} preview={<TypographySample fontFamily="'Poppins',sans-serif" />} name="Classique" desc="Poppins / Inter" />
            <PresetCard active={false} onSelect={() => {}} preview={<TypographySample fontFamily="'Sora',sans-serif" />} name="Moderne" desc="Sora / Inter" />
          </Row>
        )}]}
      />

      <Specimen
        name="TokenItem"
        note="Champ de couleur généré depuis le référentiel de tokens. Il écrit directement dans le thème : modifier une valeur ici repeint tout le UI kit."
        variants={[{ label: 'Un token opaque et un token avec opacité', node: (
          <div className="token-grid" style={{ maxWidth: 420 }}>
            <TokenItem token={TOKEN_SCHEMA.find(t => t.key === 'brass-500')!} />
            <TokenItem token={TOKEN_SCHEMA.find(t => t.key === 'card-bg')!} />
          </div>
        )}]}
      />

      <Specimen
        name="SidebarBrand"
        variants={[{ label: 'Logo par défaut et logo d\'office', node: (
          <ShellBox><SidebarBrand name="Espace Notarial" sub="Next" /></ShellBox>
        )}]}
      />

      <Specimen
        name="TenantSwitcher"
        variants={[{ label: 'Sélecteur d\'office', node: (
          <ShellBox><TenantSwitcher name="Briand & Hamon" role="Notaires associés" onClick={() => {}} /></ShellBox>
        )}]}
      />

      <Specimen
        name="NavGroup"
        variants={[{ label: 'Section de navigation', node: (
          <ShellBox>
            <Nav>
              <NavGroup label="Général">
                <NavItem icon="home" active>Accueil</NavItem>
                <NavItem icon="layers">Portefeuilles</NavItem>
                <NavItem icon="folder" count={245}>Dossiers</NavItem>
              </NavGroup>
            </Nav>
          </ShellBox>
        )}]}
      />

      <Specimen
        name="NavItem"
        variants={[{ label: 'Actif, inactif, avec compteur', node: (
          <ShellBox>
            <Nav>
              <NavItem icon="home" active>Actif</NavItem>
              <NavItem icon="layers">Inactif</NavItem>
              <NavItem icon="folder" count={245}>Avec compteur</NavItem>
            </Nav>
          </ShellBox>
        )}]}
      />

      <Specimen
        name="SidebarFoot"
        variants={[{ label: 'Pied de sidebar (avec la mention « propulsé par Notantis »)', node: (
          <ShellBox><SidebarFoot initials="CD" name="Cyril Dumont" role="Superadmin" onLogout={() => {}} /></ShellBox>
        )}]}
      />

      <Specimen
        name="DocPanel"
        variants={[{ label: 'Panneau de droite de l\'explorateur', node: (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--surface)' }}>
            <DocPanel title="2.1 Plans" actions={<><Button size="sm"><Icon id="up" />Nouveau sous-dossier</Button><Button variant="accent" size="sm"><Icon id="plus" />Ajouter</Button></>}>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Nom</th><th>Statut</th></tr></thead>
                  <tbody>
                    <tr><td className="row-name">Extrait du plan cadastral.pdf</td><td><Pill kind="neutral">Consulté</Pill></td></tr>
                    <tr><td className="row-name">Plan d'aménagement T2.pdf</td><td><Pill kind="warning">Nouveau</Pill></td></tr>
                  </tbody>
                </table>
              </div>
            </DocPanel>
          </div>
        )}]}
      />

    </>
  );
}
