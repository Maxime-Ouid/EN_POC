import { useEffect, useState } from 'react';
import type { HyperadminOfficeRow, ModuleSummary } from '../../api/endpoints';
import { Button } from '../atoms/Button';
import { Modal } from './Modal';

export interface OfficeModulesModalProps {
  open: boolean;
  office: HyperadminOfficeRow | null;
  /** Catalogue COMPLET — voir ModuleSummary. Sans lui, rien à proposer à cocher. */
  modules: ModuleSummary[];
  onClose: () => void;
  onSubmit: (officeId: number, slugs: string[]) => void;
}

/**
 * Modules activés pour UN office (PATCH .../enabled_module_slugs, remplacement
 * complet de la liste — pas d'ajout/retrait unitaire côté API). Les cases
 * partent de `office.enabled_modules` à chaque ouverture ; un slug du
 * catalogue absent de cette liste part décoché.
 */
export function OfficeModulesModal({ open, office, modules, onClose, onSubmit }: OfficeModulesModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (office) setSelected(new Set(office.enabled_modules));
  }, [office]);

  function toggle(slug: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function handleSubmit() {
    if (!office) return;
    onSubmit(office.id, Array.from(selected));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={office ? `Modules — ${office.name}` : 'Modules'}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={handleSubmit}>
            Enregistrer
          </Button>
        </>
      }
    >
      {modules.length === 0 ? (
        <div className="tiny dim">Aucun module au catalogue.</div>
      ) : (
        modules.map(m => (
          <label
            key={m.slug}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 10 }}
          >
            <input
              type="checkbox"
              checked={selected.has(m.slug)}
              onChange={() => toggle(m.slug)}
              style={{ marginTop: 3 }}
            />
            <span>
              <div style={{ fontWeight: 600 }}>{m.name}</div>
              {m.description && (
                <div className="tiny dim" style={{ marginTop: 2 }}>
                  {m.description}
                </div>
              )}
            </span>
          </label>
        ))
      )}
    </Modal>
  );
}
