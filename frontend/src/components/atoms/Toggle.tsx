export interface ToggleProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

// Interrupteur maison (.toggle) — rendu accessible ici (role="switch" +
// aria-checked), corrigeant la dette notée en §7 point 6 du design system.
export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={checked ? 'toggle on' : 'toggle'}
      onClick={() => onChange?.(!checked)}
    />
  );
}
