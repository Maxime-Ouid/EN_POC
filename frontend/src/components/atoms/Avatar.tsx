export interface AvatarProps {
  children: string;
  size?: 'md' | 'sm';
  gray?: boolean;
  style?: React.CSSProperties;
}

// Initiales dans un cercle violet (ou neutre pour un compteur "+N") — §6.4.
export function Avatar({ children, size = 'md', gray, style }: AvatarProps) {
  const sizeClass = size === 'sm' ? ' sm' : '';
  const grayClass = gray ? ' gray' : '';
  return (
    <div className={`avatar${sizeClass}${grayClass}`} style={style}>
      {children}
    </div>
  );
}
