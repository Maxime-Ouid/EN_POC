import type { ReactNode } from 'react';
import { IconChip } from '../atoms/IconChip';

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
      <IconChip
        icon={icon}
        bg={iconBg}
        color={iconColor}
        chip="feed-icon"
        size={compact ? 24 : undefined}
        iconSize={compact ? 12 : undefined}
      />
      <div>
        <div className={compact ? 'feed-text tiny' : 'feed-text'}>{text}</div>
        <div className="feed-time">{time}</div>
      </div>
    </div>
  );
}
