import type { InputHTMLAttributes } from 'react';

export type TextInputProps = InputHTMLAttributes<HTMLInputElement>;

// Input texte simple — hérite du style `.field input` quand placé dans <Field>.
export function TextInput(props: TextInputProps) {
  return <input type="text" {...props} />;
}
