/* ===========================================================================
   Ce qu'une ligne de résultat dit d'elle-même, en plus de son nom.

   Jusqu'au 02/09/2026 la deuxième ligne d'un résultat ne portait que le chemin
   — et pour un dossier, dont le chemin EST son nom, elle répétait la ligne du
   dessus. Le serveur renvoie désormais une fiche complète (voir SearchHit) ;
   ce module la traduit en une poignée de faits courts, prêts à afficher.

   La mise en forme vit ici et non côté serveur : ce sont des choix
   d'affichage (quelle date montrer, quel pluriel, quel ordre), pas des
   données. Le serveur envoie des nombres et des dates ISO.
   =========================================================================== */
import type { SearchHit, TagSummary } from '../api/endpoints';

/** Nombre de tags énumérés sur la ligne ; au-delà, un « +N » les résume. Trois
    pastilles tiennent à côté des faits, six feraient une frise illisible. */
export const META_TAG_LIMIT = 3;

/** Jour/mois/année. Personne ne cherche un dossier à l'heure près, et une heure
    sur chaque ligne allongerait la seule ligne où l'espace est compté. */
function shortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`;
}

/**
 * Les faits à afficher pour ce résultat, dans l'ordre de lecture, déjà mis en
 * forme. Liste vide = il n'y a rien d'utile à dire de plus que le nom et le
 * chemin (cas des entrées purement locales, qui n'ont pas de fiche serveur).
 *
 * Un fait vaut zéro n'est pas affiché : « 0 sous-dossier » occupe autant de
 * place que « 4 sous-dossiers » sans rien apprendre. Un dossier dont RIEN n'est
 * accessible le dit en revanche explicitement — une ligne sans aucun fait se
 * lirait comme une fiche qui n'a pas chargé.
 */
export function hitFacts(hit: SearchHit): string[] {
  if (hit.kind === 'dataroom' || hit.kind === 'folder') {
    const facts: string[] = [];
    if (hit.document_count) facts.push(plural(hit.document_count, 'pièce', 'pièces'));
    if (hit.folder_count) facts.push(plural(hit.folder_count, 'sous-dossier', 'sous-dossiers'));
    if (facts.length === 0) facts.push('Aucune pièce');
    // Une seule date, pas deux : sur un dossier qui vit, la date de création
    // n'ajoute rien à celle de la dernière pièce déposée, et les deux bout à
    // bout ne tiennent pas sur la ligne. La création ne sert donc que quand il
    // n'y a pas encore d'activité — c'est justement là qu'elle renseigne.
    if (hit.last_activity) facts.push(`dernière pièce le ${shortDate(hit.last_activity)}`);
    else if (hit.created_at) facts.push(`créé le ${shortDate(hit.created_at)}`);
    return facts;
  }

  if (hit.kind === 'document') {
    const facts: string[] = [];
    if (hit.file_kind) facts.push(hit.file_kind);
    if (hit.created_at) facts.push(`ajouté le ${shortDate(hit.created_at)}`);
    return facts;
  }

  // Personne. Le rôle décide de ce qu'elle voit dans l'étude : c'est
  // l'information qui distingue deux homonymes, elle passe donc devant.
  const facts: string[] = [];
  if (hit.role) facts.push(hit.role);
  if (hit.email) facts.push(hit.email);
  return facts;
}

/**
 * Les tags à ÉNUMÉRER sur la ligne de méta : tous ceux de l'élément sauf celui
 * qui a justifié sa remontée, déjà affiché à côté du nom et surligné. Le
 * montrer deux fois donnerait deux pastilles identiques dont une seule
 * s'allume — l'utilisateur chercherait la différence.
 */
export function metaTags(hit: SearchHit): TagSummary[] {
  if (!hit.matched_tag) return hit.tags;
  const matchedId = hit.matched_tag.id;
  return hit.tags.filter(tag => tag.id !== matchedId);
}
