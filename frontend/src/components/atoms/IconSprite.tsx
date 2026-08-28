// Sprite d'icônes SVG — extrait verbatim du prototype "Espace Notarial Next"
// (NotantisApp/index_16.html). Un seul symbole par icône, référencé ailleurs via
// <svg className="icon"><use href="#i-xxx" /></svg>, voir DESIGN_SYSTEM.md §5.
const SPRITE_SYMBOLS = `
  <symbol id="i-home" viewBox="0 0 24 24"><path d="M4 11.5 12 4l8 7.5M6 10v9.2a.8.8 0 0 0 .8.8H10v-6h4v6h3.2a.8.8 0 0 0 .8-.8V10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-layers" viewBox="0 0 24 24"><path d="M12 4 3.5 8.5 12 13l8.5-4.5L12 4Z M5 12l7 3.7 7-3.7 M5 15.6l7 3.7 7-3.7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-folder" viewBox="0 0 24 24"><path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h4l2 2.3h7A1.5 1.5 0 0 1 20 8.8v9.7A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5V6.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
  <symbol id="i-file" viewBox="0 0 24 24"><path d="M7.5 3.5h6l4 4v11a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 5.5 18.5v-13A1.5 1.5 0 0 1 7.5 3.5Z M13.3 3.6V8h4.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
  <symbol id="i-msg" viewBox="0 0 24 24"><path d="M4 6.8A2.3 2.3 0 0 1 6.3 4.5h11.4A2.3 2.3 0 0 1 20 6.8v6.9a2.3 2.3 0 0 1-2.3 2.3H10l-4.3 3.6v-3.6H6.3A2.3 2.3 0 0 1 4 13.7V6.8Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
  <symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8.3" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.6 19c.5-3 2.6-4.8 5.4-4.8s4.9 1.8 5.4 4.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M15.3 5.7c1.4.3 2.4 1.5 2.4 3s-1 2.7-2.4 3M17.6 14.4c2 .5 3.4 2.1 3.8 4.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 8v4.3l3 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 4v2.2M12 17.8V20M4 12h2.2M17.8 12H20M6.3 6.3l1.6 1.6M16.1 16.1l1.6 1.6M6.3 17.7l1.6-1.6M16.1 7.9l1.6-1.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M15.5 15.5 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></symbol>
  <symbol id="i-bell" viewBox="0 0 24 24"><path d="M6 16.2V10a6 6 0 0 1 12 0v6.2l1.4 1.6H4.6L6 16.2Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9.6 20a2.4 2.4 0 0 0 4.8 0" fill="none" stroke="currentColor" stroke-width="1.6"/></symbol>
  <symbol id="i-chevr" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-chevd" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
  <symbol id="i-down" viewBox="0 0 24 24"><path d="M12 4v11M8 12l4 4 4-4M5 19.5h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-up" viewBox="0 0 24 24"><path d="M12 20V9M8 12l4-4 4 4M5 4.5h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-link" viewBox="0 0 24 24"><path d="M9.5 14.5 14.5 9.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M11.3 7.8 13 6a3.5 3.5 0 0 1 5 5l-1.8 1.8M12.7 16.2 11 18a3.5 3.5 0 0 1-5-5l1.8-1.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
  <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3.5 19 6v6c0 5-3.2 7.6-7 8.5-3.8-.9-7-3.5-7-8.5V6l7-2.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 12.2l2.1 2.1L15.3 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-building" viewBox="0 0 24 24"><path d="M5 20V5.6a1 1 0 0 1 .6-.9L11.6 2v18M13 20V9.4l6 2v8.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 8.5h0M8 12h0M8 15.5h0" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M4 20h16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
  <symbol id="i-lock" viewBox="0 0 24 24"><rect x="5.5" y="10.5" width="13" height="9" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="1.6"/></symbol>
  <symbol id="i-tag" viewBox="0 0 24 24"><path d="M4 4.8h6.4L20 14.4l-8.6 8.6L2 13.2V6.8A2 2 0 0 1 4 4.8Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="7.6" cy="8.4" r="1.3" fill="currentColor"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5 9.5 17 19 6.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
  <symbol id="i-filter" viewBox="0 0 24 24"><path d="M4 5.5h16L14 13v6l-4 2v-8L4 5.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
  <symbol id="i-dots" viewBox="0 0 24 24"><circle cx="5.5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor"/></symbol>
  <symbol id="i-eye" viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/></symbol>
  <symbol id="i-clip" viewBox="0 0 24 24"><path d="M8 11.5 15 4.6a3 3 0 0 1 4.3 4.3l-8.6 8.6a4.6 4.6 0 0 1-6.5-6.5l7.9-7.9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-logout" viewBox="0 0 24 24"><path d="M9 4.5H6.3A1.8 1.8 0 0 0 4.5 6.3v11.4A1.8 1.8 0 0 0 6.3 19.5H9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M13.5 8 18 12l-4.5 4M18 12H9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-grid" viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.6"/></symbol>
  <symbol id="i-list" viewBox="0 0 24 24"><path d="M8 6.5h12M8 12h12M8 17.5h12M4 6.5h.01M4 12h.01M4 17.5h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
  <symbol id="i-arrleft" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-seal" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 8.2v7.6M8.2 12h7.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="12" r="10.2" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="1.6 2.4"/></symbol>
  <symbol id="i-zip" viewBox="0 0 24 24"><path d="M7.5 3.5h6l4 4v11a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 5.5 18.5v-13A1.5 1.5 0 0 1 7.5 3.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M11 3.5v3h2v1.4h-2v1.4h2V11h-2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></symbol>
  <symbol id="i-send" viewBox="0 0 24 24"><path d="M4 12 20 4 13 20l-2.2-6.8L4 12Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
`;

/** Identifiants disponibles, sans le préfixe `i-` — c'est ce qu'attend la prop
 *  `id` de <Icon>. Dérivé du sprite lui-même : ajouter un symbole suffit à le
 *  faire apparaître partout où cette liste est utilisée (le UI kit notamment). */
export const ICON_IDS: string[] = Array.from(
  SPRITE_SYMBOLS.matchAll(/id="i-([a-z0-9]+)"/g),
  m => m[1],
);

export function IconSprite() {
  return (
    <svg
      style={{ display: 'none' }}
      dangerouslySetInnerHTML={{ __html: SPRITE_SYMBOLS }}
    />
  );
}
