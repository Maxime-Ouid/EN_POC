import type { ReactNode } from 'react';
import { IconChip } from '../atoms/IconChip';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: string;
  iconBg: string;
  iconColor: string;
  delta?: { text: string; tone: 'up' | 'warn' };
  sub?: ReactNode;
}

// Carte de statistique du dashboard — §6.2.
export function StatCard({ label, value, icon, iconBg, iconColor, delta, sub }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className="stat-label" style={{ margin: 0 }}>
          {label}
        </span>
        <IconChip icon={icon} bg={iconBg} color={iconColor} chip="stat-icon" />
      </div>
      <div className="stat-value mono">{value}</div>
      {delta && (
        <div className={delta.tone === 'up' ? 'stat-delta up' : 'stat-delta warn-delta'}>
          {delta.tone === 'up' && (
            <svg className="icon" style={{ width: 11, height: 11 }}>
              <use href="#i-up" />
            </svg>
          )}
          {delta.text}
        </div>
      )}
      {sub && <div className="tiny dim" style={{ marginTop: 8 }}>{sub}</div>}
    </div>
  );
}
