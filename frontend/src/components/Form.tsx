import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export interface FieldProps {
  label: string;
  children?: ReactNode;
  style?: React.CSSProperties;
}

// Label + contrôle, empilés — §6.6. Enrober un <input>/<select> pour hériter du
// style de focus/bordure défini sur `.field input, .field select`.
export function Field({ label, children, style }: FieldProps) {
  return (
    <div className="field" style={style}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export interface FieldRowProps {
  children?: ReactNode;
}

// Deux (ou plus) `<Field>` côte à côte, répartis équitablement.
export function FieldRow({ children }: FieldRowProps) {
  return <div className="field-row">{children}</div>;
}

export type TextInputProps = InputHTMLAttributes<HTMLInputElement>;

// Input texte simple — hérite du style `.field input` quand placé dans <Field>.
export function TextInput(props: TextInputProps) {
  return <input type="text" {...props} />;
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select(props: SelectProps) {
  return <select {...props} />;
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

// Attention : `textarea` n'a de style dédié que dans le contexte `.qa-reply`
// (voir QACard.tsx) — hors de ce contexte, prévoir un style au cas par cas.
export function Textarea(props: TextareaProps) {
  return <textarea {...props} />;
}

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
