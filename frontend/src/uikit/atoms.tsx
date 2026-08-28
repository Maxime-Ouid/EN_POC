import { useState } from 'react';
import {
  Avatar, Badge, BarTrack, Button, Card, Decor, Grid, Icon, IconButton, ICON_IDS,
  Nav, NavGroup, NavItem, Pill, ProtoPill, RowIcon, RowMenu, Screen, Select,
  ShapeSwatch, SoField, Subscreen, SubscreenPanel, Tag, TextInput, Textarea,
  Toggle, TopbarRight, TypographySample, Field,
} from '../components';
import { Specimen } from './Specimen';

// Spécimens des atomes. Un atome n'ayant par définition aucune dépendance,
// chaque démonstration tient en une ligne ; les seuls habillages ajoutés ici
// (ligne de tableau, cadre sombre) servent à replacer le composant dans le
// contexte où il est réellement utilisé.

function Row({ children }: { children: React.ReactNode }) {
  return <div className="uikit-row">{children}</div>;
}

/** Les cellules (<td>) doivent être rendues dans un vrai tableau. */
function TableRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <tbody>
            <tr>{children}</tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Les éléments de la sidebar vivent sur le fond foncé de la coquille. */
function ShellBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 236, background: 'var(--shell-bg)', borderRadius: 'var(--radius-md)', padding: 8 }}>
      {children}
    </div>
  );
}

function ToggleDemo() {
  const [on, setOn] = useState(true);
  return (
    <Row>
      <Toggle checked={on} onChange={setOn} />
      <span className="tiny dim">{on ? 'activé' : 'désactivé'} — cliquable</span>
      <Toggle checked={false} disabled />
      <span className="tiny dim">désactivé (disabled)</span>
    </Row>
  );
}

export function AtomSpecimens() {
  return (
    <>
      <Specimen
        name="Icon"
        variants={[
          { label: 'Toutes les icônes du sprite', node: (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(84px,1fr))', gap: 10 }}>
              {ICON_IDS.map(id => (
                <div key={id} style={{ textAlign: 'center', color: 'var(--ink-700)' }}>
                  <Icon id={id} style={{ width: 20, height: 20, margin: '0 auto 4px' }} />
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-400)' }}>{id}</div>
                </div>
              ))}
            </div>
          )},
          { label: 'Taille personnalisée', node: (
            <Row>
              <Icon id="folder" />
              <Icon id="folder" style={{ width: 24, height: 24 }} />
              <Icon id="folder" style={{ width: 32, height: 32, color: 'var(--brass-600)' }} />
            </Row>
          )},
        ]}
      />

      <Specimen
        name="IconSprite"
        note="Injecte les définitions <symbol> dans le document. À monter une seule fois, au plus haut de l'application — sans lui, toutes les icônes sont vides. Ne rend rien de visible."
        variants={[{ label: 'Rendu', node: <span className="tiny dim">Aucune sortie visible (svg display:none).</span> }]}
      />

      <Specimen
        name="Button"
        variants={[
          { label: 'Variantes', node: (
            <Row>
              <Button>Par défaut</Button>
              <Button variant="primary">Principal</Button>
              <Button variant="accent">Accent</Button>
              <Button variant="ghost">Fantôme</Button>
            </Row>
          )},
          { label: 'Taille sm', node: (
            <Row>
              <Button size="sm">Par défaut</Button>
              <Button variant="primary" size="sm">Principal</Button>
              <Button variant="accent" size="sm"><Icon id="plus" />Avec icône</Button>
            </Row>
          )},
          { label: 'Désactivé', node: <Row><Button variant="primary" disabled>Indisponible</Button></Row> },
        ]}
      />

      <Specimen
        name="IconButton"
        variants={[
          { label: 'Simple et avec pastille de notification', node: (
            <Row>
              <IconButton icon="bell" />
              <IconButton icon="bell" hasDot />
              <IconButton icon="search" />
            </Row>
          )},
        ]}
      />

      <Specimen
        name="Avatar"
        variants={[
          { label: 'Tailles', node: <Row><Avatar>CD</Avatar><Avatar size="sm">DB</Avatar></Row> },
          { label: 'Neutre (compteur, invitation en attente)', node: <Row><Avatar gray>+6</Avatar><Avatar size="sm" gray>?</Avatar></Row> },
        ]}
      />

      <Specimen
        name="Pill"
        variants={[
          { label: 'Les cinq intentions', node: (
            <Row>
              <Pill kind="success">Actif</Pill>
              <Pill kind="warning">Sans réponse</Pill>
              <Pill kind="critical">Bloquant</Pill>
              <Pill kind="info">Lecture seule</Pill>
              <Pill kind="neutral">Clôturé</Pill>
            </Row>
          )},
        ]}
      />

      <Specimen
        name="Tag"
        variants={[
          { label: 'Accent et neutre', node: (
            <Row>
              <Tag icon="tag">Vente</Tag>
              <Tag icon="tag">APUI</Tag>
              <Tag plain>Immobilier commercial</Tag>
            </Row>
          )},
        ]}
      />

      <Specimen name="Badge" variants={[{ label: 'Compteur', node: <Row><Badge>245</Badge><Badge>7</Badge></Row> }]} />

      <Specimen
        name="Card"
        variants={[
          { label: 'Avec padding', node: <Card padded>Contenu de la carte</Card> },
          { label: 'Sans padding (contient un tableau qui gère le sien)', node: <Card><div style={{ padding: 12 }} className="tiny dim">…table-wrap…</div></Card> },
          { label: 'Cliquable', node: <Card padded onClick={() => {}} className="clickable">Carte cliquable</Card> },
        ]}
      />

      <Specimen
        name="Grid"
        variants={[
          { label: '2 colonnes (1.5fr / 1fr)', node: <Grid columns={2}><Card padded>A</Card><Card padded>B</Card></Grid> },
          { label: '3 colonnes', node: <Grid columns={3}><Card padded>A</Card><Card padded>B</Card><Card padded>C</Card></Grid> },
          { label: '4 colonnes', node: <Grid columns={4}><Card padded>A</Card><Card padded>B</Card><Card padded>C</Card><Card padded>D</Card></Grid> },
        ]}
      />

      <Specimen
        name="BarTrack"
        variants={[
          { label: 'Tons', node: (
            <div style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
              <BarTrack percent={62} label="accent 62 %" />
              <BarTrack percent={38} tone="success" label="succès 38 %" />
              <BarTrack percent={88} tone="warn" label="alerte 88 %" />
            </div>
          )},
          { label: 'Bornes', node: (
            <div style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
              <BarTrack percent={0} label="0 %" />
              <BarTrack percent={100} label="100 %" />
            </div>
          )},
        ]}
      />

      <Specimen name="Toggle" variants={[{ label: 'États', node: <ToggleDemo /> }]} />

      <Specimen
        name="TextInput"
        variants={[
          { label: 'Dans un Field (contexte normal)', node: (
            <div style={{ maxWidth: 320 }}>
              <Field label="Nom du dossier"><TextInput placeholder="ex. Dossier de vente Caudan" /></Field>
            </div>
          )},
          { label: 'Lecture seule', node: (
            <div style={{ maxWidth: 320 }}>
              <Field label="Sous-domaine"><TextInput readOnly value="briand-hamon.espacenotarial.fr" /></Field>
            </div>
          )},
        ]}
      />

      <Specimen
        name="Select"
        variants={[{ label: 'Dans un Field', node: (
          <div style={{ maxWidth: 320 }}>
            <Field label="Portefeuille">
              <Select defaultValue="ivry">
                <option value="">Aucun</option>
                <option value="ivry">Opération Ivry — Le Monde Commerce</option>
                <option value="jo">JO 2024 — Parc immobilier</option>
              </Select>
            </Field>
          </div>
        )}]}
      />

      <Specimen
        name="Textarea"
        variants={[{ label: 'Dans une zone de réponse Q&R', node: (
          <div className="qa-reply" style={{ maxWidth: 460 }}>
            <Textarea placeholder="Rédiger une réponse…" rows={3} />
          </div>
        )}]}
      />

      <Specimen
        name="RowIcon"
        variants={[
          { label: 'Par intention', node: (
            <Row>
              <RowIcon icon="folder" bg="var(--info-bg)" color="var(--info)" />
              <RowIcon icon="file" bg="var(--critical-bg)" color="var(--critical)" />
              <RowIcon icon="lock" bg="var(--brass-100)" color="var(--brass-700)" />
              <RowIcon icon="layers" bg="var(--surface-alt)" color="var(--ink-400)" muted />
            </Row>
          )},
          { label: 'Taille personnalisée', node: (
            <Row>
              <RowIcon icon="clock" bg="var(--brass-100)" color="var(--brass-700)" size={34} />
              <RowIcon icon="clock" bg="var(--brass-100)" color="var(--brass-700)" size={44} />
            </Row>
          )},
        ]}
      />

      <Specimen
        name="RowMenu"
        variants={[{ label: 'En fin de ligne de tableau', node: (
          <TableRow>
            <td>Dossier de vente Caudan</td>
            <RowMenu onClick={() => {}} />
          </TableRow>
        )}]}
      />

      <Specimen
        name="SoField"
        variants={[{ label: 'Paire clé / valeur du volet latéral', node: (
          <div style={{ maxWidth: 280 }}>
            <SoField label="Emplacement" value="2.1 Plans" />
            <SoField label="Statut" value={<Pill kind="success">Consulté</Pill>} />
            <SoField label="Poids" value={<span className="mono">2,1 Mo</span>} />
          </div>
        )}]}
      />

      <Specimen
        name="Screen"
        note="Conteneur d'un écran principal. Un seul est monté à la fois : la reconstruction React ne garde pas, comme le prototype, tous les écrans dans le DOM."
        variants={[{ label: 'Rendu', node: <Screen><div className="tiny dim">Contenu de l'écran</div></Screen> }]}
      />

      <Specimen
        name="Subscreen"
        variants={[
          { label: 'Actif', node: <Subscreen active><Card padded>Panneau visible</Card></Subscreen> },
          { label: 'Inactif (rien n\'est monté)', node: <Subscreen active={false}><Card padded>Invisible</Card></Subscreen> },
        ]}
      />

      <Specimen
        name="SubscreenPanel"
        note="Même rôle que Subscreen, pour les onglets de second (Statistiques) et troisième niveau (Personnalisation). Les classes CSS existent séparément parce que le prototype imbriquait trois familles d'onglets sans portée CSS."
        variants={[
          { label: 'level 2', node: <SubscreenPanel active level={2}><Card padded>Onglet de Statistiques</Card></SubscreenPanel> },
          { label: 'level 3', node: <SubscreenPanel active level={3}><Card padded>Onglet de Personnalisation</Card></SubscreenPanel> },
        ]}
      />

      <Specimen
        name="Nav"
        variants={[{ label: 'Colonne de navigation (sur fond de coquille)', node: (
          <ShellBox>
            <Nav>
              <NavGroup label="Général">
                <NavItem icon="home" active>Accueil</NavItem>
                <NavItem icon="folder" count={245}>Dossiers</NavItem>
              </NavGroup>
            </Nav>
          </ShellBox>
        )}]}
      />

      <Specimen
        name="TopbarRight"
        variants={[{ label: 'Groupe d\'actions de la barre du haut', node: (
          <TopbarRight>
            <ProtoPill label="Aperçu — maquette visuelle" />
            <IconButton icon="bell" hasDot />
            <Avatar size="sm" style={{ width: 32, height: 32, fontSize: 12 }}>CD</Avatar>
          </TopbarRight>
        )}]}
      />

      <Specimen
        name="ProtoPill"
        variants={[{ label: 'Avertissements en usage', node: (
          <Row>
            <ProtoPill label="Aperçu — maquette visuelle" />
            <ProtoPill label="Données partiellement simulées" />
          </Row>
        )}]}
      />

      <Specimen
        name="TypographySample"
        variants={[{ label: 'Les trois familles proposées', node: (
          <Row>
            <TypographySample fontFamily="'Poppins',sans-serif" />
            <TypographySample fontFamily="'Sora',sans-serif" />
            <TypographySample fontFamily="'Fraunces',serif" />
          </Row>
        )}]}
      />

      <Specimen
        name="ShapeSwatch"
        variants={[{ label: 'Les trois rayons proposés', node: (
          <Row>
            <ShapeSwatch radius="4px" />
            <ShapeSwatch radius="9px" />
            <ShapeSwatch radius="15px" />
          </Row>
        )}]}
      />

      <Specimen
        name="Decor"
        note="Couche décorative (halos et carrés flottants) posée derrière le contenu. Elle n'est jamais interactive et se règle entièrement depuis Personnalisation → Apparence."
        variants={[
          { label: 'preset « app »', node: (
            <div style={{ position: 'relative', height: 180, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg)' }}>
              <Decor preset="app" />
            </div>
          )},
          { label: 'preset « login-story » (sur le fond foncé de la colonne narrative)', node: (
            <div style={{ position: 'relative', height: 180, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--shell-bg)' }}>
              <Decor preset="login-story" />
            </div>
          )},
          { label: 'preset « login-panel »', node: (
            <div style={{ position: 'relative', height: 180, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg)' }}>
              <Decor preset="login-panel" />
            </div>
          )},
        ]}
      />
    </>
  );
}
