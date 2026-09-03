/**
 * URL de connexion d'un office créé en direct depuis la console hyperadmin.
 *
 * Le certificat mkcert local ne couvre qu'un wildcard UN CRAN sous "localhost"
 * (`*.office.localhost`) — un wildcard directement dessus (`*.localhost`) est
 * rejeté par Chrome (restriction Public Suffix List, voir CLAUDE.md, "État
 * réel du code" 26/08/2026), et un sous-domaine choisi en direct par
 * l'hyperadmin n'est par définition pas connu à l'avance pour lui dédier un
 * SAN exact comme `officea.localhost`/`officeb.localhost`. Un office créé ici
 * vit donc sous `<subdomain>.office.localhost` plutôt que
 * `<subdomain>.localhost` — validé en Chrome réel le 03/09/2026, aucun
 * avertissement TLS. `TenantResolutionMiddleware` ne regarde que le PREMIER
 * label du Host (`host.split(".")[0]`), donc ce préfixe supplémentaire ne
 * change rien à la résolution côté serveur ni à `Office.subdomain`, qui reste
 * la valeur nue tapée dans la modale de création.
 */
export function officeLoginUrl(subdomain: string): string {
  return `https://${subdomain}.office.localhost:5173/`;
}
