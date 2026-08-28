export interface IconProps {
  id: string;
  className?: string;
  style?: React.CSSProperties;
}

// Icône référençant le sprite SVG global (voir IconSprite.tsx, à monter une seule
// fois — main.tsx — dans l'app). Usage : <Icon id="folder" />
export function Icon({ id, className, style }: IconProps) {
  return (
    <svg className={className ? `icon ${className}` : 'icon'} style={style}>
      <use href={`#i-${id}`} />
    </svg>
  );
}
