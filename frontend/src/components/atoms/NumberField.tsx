import { useId } from 'react';
import { Icon } from './Icon';

export interface NumberFieldProps {
  value: number;
  onChange: (value: number) => void;
  /** Appelé à la validation (blur, Entrée) — pour persister sans écrire à chaque frappe. */
  onCommit?: () => void;
  min?: number;
  max?: number;
  step?: number;
  /** Suffixe affiché dans le cadre : « % », « px »… */
  unit?: string;
  label: string;
  small?: boolean;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// Champ numérique à unité — §6.6. Les compteurs natifs sont masqués (non
// stylables sur Firefox/Safari) et remplacés par deux boutons ; les flèches du
// clavier restent gérées par l'input lui-même.
export function NumberField({
  value,
  onChange,
  onCommit,
  min = 0,
  max = 100,
  step = 1,
  unit,
  label,
  small,
}: NumberFieldProps) {
  const id = useId();
  const nudge = (delta: number) => {
    onChange(clamp(value + delta, min, max));
    onCommit?.();
  };
  return (
    <span className={small ? 'number-field number-sm' : 'number-field'}>
      <input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onChange={e => onChange(clamp(parseFloat(e.target.value) || 0, min, max))}
        onBlur={onCommit}
      />
      {unit ? <span className="number-unit">{unit}</span> : null}
      <span className="number-steps">
        <button
          type="button"
          className="number-step"
          aria-label={`${label} — augmenter`}
          disabled={value >= max}
          onClick={() => nudge(step)}
        >
          <Icon id="up" />
        </button>
        <button
          type="button"
          className="number-step"
          aria-label={`${label} — diminuer`}
          disabled={value <= min}
          onClick={() => nudge(-step)}
        >
          <Icon id="down" />
        </button>
      </span>
    </span>
  );
}
