import type { ReactNode } from 'react';

export interface FeedItemProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  text: ReactNode;
  time: string;
  compact?: boolean;
}

// Ligne de fil d'activité — §6.9. La couleur de `iconBg`/`iconColor` encode le
// type d'évènement (dépôt = info, question = warning, membre = success, export =
// accent/brass, suppression = critical) — convention produit, pas une règle CSS.
export function FeedItem({ icon, iconBg, iconColor, text, time, compact }: FeedItemProps) {
  return (
    <div className="feed-item" style={compact ? { padding: '8px 0' } : undefined}>
      <div
        className="feed-icon"
        style={
          compact
            ? { width: 24, height: 24, background: iconBg, color: iconColor }
            : { background: iconBg, color: iconColor }
        }
      >
        <svg className="icon" style={compact ? { width: 12, height: 12 } : undefined}>
          <use href={`#i-${icon}`} />
        </svg>
      </div>
      <div>
        <div className={compact ? 'feed-text tiny' : 'feed-text'}>{text}</div>
        <div className="feed-time">{time}</div>
      </div>
    </div>
  );
}
