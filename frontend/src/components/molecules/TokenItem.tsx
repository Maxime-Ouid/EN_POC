import { parseColor } from '../../theme/color';
import { useTenantTheme } from '../../theme/useTenantTheme';
import type { TokenDef } from '../../theme/schema';

export interface TokenItemProps {
  token: TokenDef;
}

// Un champ de couleur : pastille + libellé + valeur hex (+ opacité si le token
// l'accepte). Rien n'est câblé en dur — la définition vient de TOKEN_SCHEMA.
export function TokenItem({ token }: TokenItemProps) {
  const { state, editMode, setColor, commit } = useTenantTheme();
  const raw = state.colors[editMode][token.key] ?? token[editMode];
  const parsed = parseColor(raw);
  const hasOpacity = token.type === 'rgba';
  const opacityPercent = Math.round(parsed.a * 100);

  function push(hex: string, percent: number) {
    setColor(token.key, hex, hasOpacity ? percent / 100 : 1);
  }

  return (
    <div className="token-item">
      <input
        type="color"
        value={parsed.hex}
        aria-label={token.label}
        onChange={e => push(e.target.value, opacityPercent)}
        onBlur={commit}
      />
      <div className="token-item-meta">
        <div className="token-item-label">{token.label}</div>
        <div className="token-item-sub">
          <span className="token-item-hex">{parsed.hex}</span>
          {hasOpacity && (
            <>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                className="token-item-opacity"
                value={opacityPercent}
                title="Opacité (%)"
                aria-label={`${token.label} — opacité en pourcentage`}
                onChange={e => push(parsed.hex, parseFloat(e.target.value) || 0)}
                onBlur={commit}
              />
              <span className="token-item-hex">%</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
