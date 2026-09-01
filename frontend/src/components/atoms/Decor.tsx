// Formes décoratives flottantes (orbes, carrés arrondis, grilles de points) —
// §6.15. Purement esthétique : peut être omis sans casser aucune mise en page.
// Les tailles/positions ci-dessous sont extraites verbatim de components.css
// (règles .so… .ssq… .sdg… et .lo… .lsq… .ldg…) pour garder la
// fidélité visuelle exacte du prototype ; `<Decor preset="..."/>` regroupe le
// bon jeu de formes pour chaque zone (`prefers-reduced-motion` désactive déjà
// l'animation via components.css, rien à faire ici).

type Pos = { top?: string; bottom?: string; left?: string; right?: string; width: string; height: string };

function StoryOrb({ style }: { style: Pos }) {
  return <div className="story-orb" style={style} aria-hidden="true" />;
}

function LoginOrb({ style }: { style: Pos }) {
  return <div className="login-orb" style={style} aria-hidden="true" />;
}

function AccentSq({ color, style }: { color: 'cyan' | 'purple' | 'blue' | 'white'; style: Pos }) {
  return <div className={`accent-sq accent-sq--${color}`} style={style} aria-hidden="true" />;
}

function DotGrid({ color, style }: { color: 'purple' | 'cyan' | 'blue' | 'white'; style: Pos }) {
  return <div className={`dot-grid dot-grid--${color}`} style={style} aria-hidden="true" />;
}

const STORY_ORBS: Pos[] = [
  { width: '8.5rem', height: '8.5rem', top: '6%', right: '10%' },
  { width: '5rem', height: '5rem', bottom: '12%', left: '8%' },
];

const STORY_SQUARES: Array<{ color: 'cyan' | 'purple' | 'blue' | 'white'; style: Pos }> = [
  { color: 'cyan', style: { width: '12px', height: '12px', top: '16%', right: '22%' } },
  { color: 'purple', style: { width: '16px', height: '16px', bottom: '32%', left: '16%' } },
  { color: 'blue', style: { width: '9px', height: '9px', top: '44%', right: '6%' } },
  { color: 'purple', style: { width: '24px', height: '24px', top: '6%', left: '32%' } },
  { color: 'cyan', style: { width: '10px', height: '10px', bottom: '10%', right: '38%' } },
  { color: 'white', style: { width: '56px', height: '56px', top: '60%', left: '42%' } },
];

const STORY_DOTS: Array<{ color: 'purple' | 'cyan' | 'blue' | 'white'; style: Pos }> = [
  { color: 'purple', style: { width: '56px', height: '34px', top: '30%', right: '6%' } },
  { color: 'cyan', style: { width: '22px', height: '22px', bottom: '22%', right: '34%' } },
  { color: 'white', style: { width: '78px', height: '26px', top: '64%', left: '4%' } },
];

const LOGIN_ORBS: Pos[] = [
  { width: '8.5rem', height: '8.5rem', top: '6%', right: '10%' },
  { width: '5rem', height: '5rem', bottom: '12%', left: '8%' },
  { width: '3.2rem', height: '3.2rem', top: '46%', left: '2%' },
];

const LOGIN_SQUARES: Array<{ color: 'cyan' | 'purple' | 'blue' | 'white'; style: Pos }> = [
  { color: 'cyan', style: { width: '12px', height: '12px', top: '22%', right: '24%' } },
  { color: 'purple', style: { width: '16px', height: '16px', bottom: '28%', left: '22%' } },
  { color: 'blue', style: { width: '8px', height: '8px', top: '38%', right: '8%' } },
  { color: 'cyan', style: { width: '20px', height: '20px', top: '10%', left: '14%' } },
  { color: 'white', style: { width: '50px', height: '50px', bottom: '4%', left: '4%' } },
];

const LOGIN_DOTS: Array<{ color: 'purple' | 'cyan' | 'blue' | 'white'; style: Pos }> = [
  { color: 'purple', style: { width: '50px', height: '32px', top: '60%', right: '10%' } },
  { color: 'blue', style: { width: '24px', height: '24px', top: '8%', right: '30%' } },
  { color: 'cyan', style: { width: '70px', height: '20px', bottom: '36%', left: '6%' } },
];

export interface DecorProps {
  preset: 'login-story' | 'login-panel';
}

// Monter une fois par zone (`.login-story`, `.login-panel`) — l'espace connecté
// n'en porte plus depuis le 01/09/2026, son fond se règle dans Apparence. —
// ces conteneurs doivent être `position:relative` (ou `absolute`) pour que les
// formes s'y ancrent, voir components.css.
export function Decor({ preset }: DecorProps) {
  if (preset === 'login-story') {
    return (
      <>
        {STORY_ORBS.map((s, i) => <StoryOrb key={i} style={s} />)}
        {STORY_SQUARES.map((s, i) => <AccentSq key={i} color={s.color} style={s.style} />)}
        {STORY_DOTS.map((s, i) => <DotGrid key={i} color={s.color} style={s.style} />)}
      </>
    );
  }
  return (
    <>
      <div className="login-bg-anim" aria-hidden="true" />
      {LOGIN_ORBS.map((s, i) => <LoginOrb key={i} style={s} />)}
      {LOGIN_SQUARES.map((s, i) => <AccentSq key={i} color={s.color} style={s.style} />)}
      {LOGIN_DOTS.map((s, i) => <DotGrid key={i} color={s.color} style={s.style} />)}
    </>
  );
}
