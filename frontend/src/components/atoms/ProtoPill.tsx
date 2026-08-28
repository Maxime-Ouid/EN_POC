export interface ProtoPillProps {
  label: string;
}

// Bandeau "Aperçu — maquette visuelle" affiché dans le prototype — à retirer
// une fois l'app connectée à de vraies données (garder le composant est utile
// pour rejouer un mode démo / preview plus tard).
export function ProtoPill({ label }: ProtoPillProps) {
  return (
    <div className="proto-pill">
      <svg className="icon">
        <use href="#i-eye" />
      </svg>
      {label}
    </div>
  );
}
