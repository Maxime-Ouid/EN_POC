import { TOKEN_GROUPS, TOKEN_SCHEMA } from '../../theme/schema';
import { TokenItem } from '../molecules/TokenItem';

// Toute la grille de couleurs, générée depuis TOKEN_SCHEMA et regroupée par
// TOKEN_GROUPS — équivalent React de renderGroups() dans index_16.html.
export function TokenEditor() {
  return (
    <div className="token-groups-scroll">
      {TOKEN_GROUPS.map(group => {
        const tokens = TOKEN_SCHEMA.filter(t => t.group === group.id);
        if (!tokens.length) return null;
        return (
          <div className="token-group" key={group.id}>
            <div className="token-group-title">{group.label}</div>
            <div className="token-grid">
              {tokens.map(t => (
                <TokenItem key={t.key} token={t} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
