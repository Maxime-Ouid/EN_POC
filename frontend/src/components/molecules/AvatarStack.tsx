import { Avatar } from '../atoms/Avatar';

export interface AvatarStackProps {
  avatars: Array<{ label: string; gray?: boolean }>;
}

// Pile d'avatars chevauchés, dernière entrée typiquement un "+N".
export function AvatarStack({ avatars }: AvatarStackProps) {
  return (
    <div className="avatar-stack">
      {avatars.map((a, i) => (
        <Avatar key={i} size="sm" gray={a.gray}>
          {a.label}
        </Avatar>
      ))}
    </div>
  );
}
