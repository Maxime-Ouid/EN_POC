import { Icon } from '../atoms/Icon';
import type { ReactNode } from 'react';

export interface DropzoneProps {
  /** Texte au-dessus du lien « parcourir ». */
  hint?: ReactNode;
  onFiles?: (files: FileList) => void;
  accept?: string;
}

// Zone de dépôt en pointillés (logo de l'étude, ajout de pièces). Le prototype
// se contentait d'un visuel ; ici le clic et le glisser-déposer déclenchent
// réellement `onFiles`.
export function Dropzone({ hint = 'Glisser un fichier ou', onFiles, accept }: DropzoneProps) {
  return (
    <label
      style={{
        display: 'block',
        border: '1.5px dashed var(--border)',
        borderRadius: 10,
        padding: 18,
        textAlign: 'center',
        color: 'var(--ink-500)',
        fontSize: 12.5,
        cursor: 'pointer',
      }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault();
        if (e.dataTransfer.files.length) onFiles?.(e.dataTransfer.files);
      }}
    >
      <Icon id="up" style={{ width: 20, height: 20, marginBottom: 6 }} />
      <br />
      {hint} <span style={{ color: 'var(--brass-600)', fontWeight: 600 }}>parcourir</span>
      <input
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files?.length) onFiles?.(e.target.files);
        }}
      />
    </label>
  );
}
