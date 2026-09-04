import { useState } from 'react';
import { BarTrack } from '../atoms/BarTrack';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Grid } from '../atoms/Grid';
import { Icon } from '../atoms/Icon';
import { Pill } from '../atoms/Pill';
import { RowIcon } from '../atoms/RowIcon';
import { Screen } from '../atoms/Screen';
import { Select } from '../atoms/Select';
import { ButtonRow } from '../molecules/ButtonRow';
import { StatCard } from '../molecules/StatCard';
import { TableCard } from '../organisms/TableCard';
import { Slideover } from '../organisms/Slideover';
import type { PillKind } from '../atoms/Pill';

/* ===========================================================================
   Console de reprise V1 → cible — §10.

   La reprise n'est pas un script qu'on lance une fois : le §10.4 la décrit
   comme un outillage « rejouable et idempotent, exécutable OFFICE PAR OFFICE »,
   avec exécution par lots, et le §10.6 impose un double run et des offices
   pilotes avant toute généralisation. Il faut donc un endroit d'où l'on suit
   chaque office indépendamment — c'est cet écran.

   Ce qu'il montre vient directement des garanties exigées au §10.5 :
   comptages avant/après, empreintes de fichiers, réconciliation des comptes et
   des droits, journal détaillé, et possibilité de REJOUER ou d'ANNULER tant que
   la bascule n'est pas confirmée. Une reprise dont on ne peut pas dire « il
   manque 4 documents et voilà lesquels » n'est pas recevable.

   La bascule est volontairement un geste distinct de la reprise : tant qu'elle
   n'est pas confirmée, l'office travaille encore en V1 (double run, §10.6) et
   tout est réversible. Les fondre en un seul bouton ferait perdre ce filet.
   =========================================================================== */

export type MigrationPhase =
  | 'a-planifier'
  | 'inventaire'
  | 'reprise'
  | 'controles'
  | 'double-run'
  | 'bascule'
  | 'echec';

const PHASE_META: Record<MigrationPhase, { label: string; kind: PillKind }> = {
  'a-planifier': { label: 'À planifier', kind: 'neutral' },
  inventaire: { label: 'Inventaire', kind: 'info' },
  reprise: { label: 'Reprise en cours', kind: 'info' },
  controles: { label: 'Contrôles', kind: 'warning' },
  'double-run': { label: 'Double run', kind: 'warning' },
  bascule: { label: 'Basculé', kind: 'success' },
  echec: { label: 'Anomalie', kind: 'critical' },
};

export interface MigrationBatch {
  id: string;
  officeName: string;
  /** Office pilote du §10.6 — petit ou grand, choisi pour valider la reprise. */
  pilot?: boolean;
  phase: MigrationPhase;
  /** Avancement de la phase en cours, en pourcentage. */
  progress: number;
  sourceDatarooms: number;
  migratedDatarooms: number;
  sourceDocuments: number;
  migratedDocuments: number;
  /** Comptes dédoublonnés / comptes source (§10.3 : ~69,8 % de doublons). */
  accounts: string;
  /** Écarts de checksum relevés (§10.5). */
  checksumErrors: number;
  lastRun: string;
  /** Lignes du journal de migration (§10.5). */
  log: Array<{ id: string; time: string; level: 'info' | 'warn' | 'error'; text: string }>;
}

export interface MigrationConsoleScreenProps {
  /** Scénario retenu — §10.1, décision non prise à ce jour. */
  scenario: 'nouvelles-datarooms' | 'reprise-integrale' | null;
  batches: MigrationBatch[];
  onScenarioChange?: (value: 'nouvelles-datarooms' | 'reprise-integrale') => void;
  onRun?: (batchId: string) => void;
  onRollback?: (batchId: string) => void;
  onConfirmSwitch?: (batchId: string) => void;
}

export function MigrationConsoleScreen({
  scenario,
  batches,
  onScenarioChange,
  onRun,
  onRollback,
  onConfirmSwitch,
}: MigrationConsoleScreenProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = batches.find(b => b.id === openId) ?? null;

  const switched = batches.filter(b => b.phase === 'bascule').length;
  /* Une phase « Anomalie » n'est pas le seul cas à remonter : un lot en phase
     Contrôles avec des écarts d'empreinte est bloqué de la même façon. Ne
     compter que la phase affichait « 0 anomalie » à côté d'un tableau qui en
     listait treize — constaté à la capture du 03/09/2026. */
  const anomalies = batches.filter(b => b.phase === 'echec' || b.checksumErrors > 0).length;
  const totalDocs = batches.reduce((n, b) => n + b.sourceDocuments, 0);
  const migratedDocs = batches.reduce((n, b) => n + b.migratedDocuments, 0);

  return (
    <Screen>
      <Card padded style={{ marginBottom: 16, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <RowIcon icon="register" bg="var(--info-bg)" color="var(--info)" size={34} />
        <div style={{ flex: 1, minWidth: 260 }}>
          <div className="section-title">Stratégie de reprise</div>
          <div className="tiny dim">
            Choix structurant, non arrêté à ce jour&nbsp;: il décide de la charge de migration
            et du calendrier de bascule.
          </div>
        </div>
        <div style={{ minWidth: 300 }}>
          <Select
            value={scenario ?? ''}
            onChange={e =>
              onScenarioChange?.(e.target.value as 'nouvelles-datarooms' | 'reprise-integrale')
            }
          >
            <option value="">— à arbitrer avec le client —</option>
            <option value="nouvelles-datarooms">
              Scénario 1 — nouvelles datarooms seulement
            </option>
            <option value="reprise-integrale">Scénario 2 — reprise intégrale</option>
          </Select>
        </div>
      </Card>

      <Grid columns={4}>
        <StatCard
          label="Offices basculés"
          value={`${switched} / ${batches.length}`}
          icon="building"
          iconBg="var(--success-bg)"
          iconColor="var(--success)"
        />
        <StatCard
          label="Documents repris"
          value={`${Math.round((migratedDocs / Math.max(totalDocs, 1)) * 100)} %`}
          icon="file"
          iconBg="var(--info-bg)"
          iconColor="var(--info)"
          sub={
            <span className="tiny dim">
              {migratedDocs.toLocaleString('fr-FR')} sur {totalDocs.toLocaleString('fr-FR')}
            </span>
          }
        />
        <StatCard
          label="Offices pilotes"
          value={batches.filter(b => b.pilot).length}
          icon="shield"
          iconBg="var(--brass-100)"
          iconColor="var(--brass-700)"
        />
        <StatCard
          label="Anomalies ouvertes"
          value={anomalies}
          icon="x"
          iconBg="var(--critical-bg)"
          iconColor="var(--critical)"
        />
      </Grid>

      <div className="section-title" style={{ marginTop: 22, marginBottom: 10 }}>
        Lots de reprise, office par office
      </div>
      <TableCard
        headers={['Office', 'Phase', 'Avancement', 'Datarooms', 'Documents', 'Comptes', 'Dernière exécution', '']}
      >
        {batches.map(b => (
          <tr key={b.id}>
            <td className="row-name">
              <RowIcon icon="building" bg="var(--info-bg)" color="var(--info)" />
              <span>
                {b.officeName}
                {b.pilot && (
                  <Pill kind="info" style={{ marginLeft: 8 }}>
                    Pilote
                  </Pill>
                )}
              </span>
            </td>
            <td>
              <Pill kind={PHASE_META[b.phase].kind}>{PHASE_META[b.phase].label}</Pill>
              {b.checksumErrors > 0 && (
                <div className="tiny" style={{ color: 'var(--critical)', marginTop: 4 }}>
                  {b.checksumErrors} écart(s) d'empreinte
                </div>
              )}
            </td>
            <td style={{ width: 150 }}>
              <BarTrack
                percent={b.progress}
                tone={b.phase === 'echec' ? 'warn' : 'accent'}
                label={`${b.officeName} — ${b.progress} % de la phase en cours`}
              />
            </td>
            <td className="mono">
              {b.migratedDatarooms} / {b.sourceDatarooms}
            </td>
            <td className="mono">
              {b.migratedDocuments.toLocaleString('fr-FR')} /{' '}
              {b.sourceDocuments.toLocaleString('fr-FR')}
            </td>
            <td className="mono">{b.accounts}</td>
            <td className="dim">{b.lastRun}</td>
            <td>
              <Button size="sm" onClick={() => setOpenId(b.id)}>
                Journal
              </Button>
            </td>
          </tr>
        ))}
      </TableCard>

      <Slideover open={open !== null} onClose={() => setOpenId(null)} title={open ? `Reprise — ${open.officeName}` : ''} wide>
        {open && (
          <>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 16 }}>
              <div>
                <div className="tiny dim">Phase</div>
                <Pill kind={PHASE_META[open.phase].kind}>{PHASE_META[open.phase].label}</Pill>
              </div>
              <div>
                <div className="tiny dim">Comptes réconciliés</div>
                <div className="mono">{open.accounts}</div>
              </div>
              <div>
                <div className="tiny dim">Écarts d'empreinte</div>
                <div className="mono">{open.checksumErrors}</div>
              </div>
            </div>

            <ButtonRow style={{ marginBottom: 16 }}>
              <Button size="sm" onClick={() => onRun?.(open.id)}>
                <Icon id="up" />
                Rejouer la reprise
              </Button>
              <Button size="sm" onClick={() => onRollback?.(open.id)}>
                <Icon id="arrleft" />
                Annuler la reprise
              </Button>
              <Button
                size="sm"
                variant="accent"
                disabled={open.phase !== 'double-run'}
                onClick={() => onConfirmSwitch?.(open.id)}
              >
                <Icon id="check" />
                Confirmer la bascule
              </Button>
            </ButtonRow>
            <div className="tiny dim" style={{ marginBottom: 16 }}>
              Tant que la bascule n'est pas confirmée, l'office travaille encore sur la V1 et
              la reprise reste annulable.
            </div>

            <div className="section-title" style={{ marginBottom: 8 }}>
              Journal de migration
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {open.log.map(l => (
                <div
                  key={l.id}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'baseline',
                    padding: '6px 8px',
                    borderRadius: 8,
                    background: 'var(--surface-alt)',
                  }}
                >
                  <span className="mono tiny dim" style={{ whiteSpace: 'nowrap' }}>
                    {l.time}
                  </span>
                  <span
                    className="tiny"
                    style={{
                      color:
                        l.level === 'error'
                          ? 'var(--critical)'
                          : l.level === 'warn'
                            ? 'var(--warning)'
                            : 'var(--ink-700)',
                    }}
                  >
                    {l.text}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </Slideover>
    </Screen>
  );
}
