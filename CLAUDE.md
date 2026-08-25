# Espace Notarial — POC

## Contexte

POC technique préparant le chiffrage MOE d'une refonte de l'Espace Notarial (NOTANTIS) :
une plateforme de dataroom multi-tenant pour offices notariaux. Le périmètre fonctionnel
complet est décrit dans `EN_vision_AMOA_MVP_v0.5_fusionne.md` (à placer à la racine du
projet) — s'y référer pour toute question de scope métier, mais **ne pas chercher à tout
implémenter** : ce document couvre le produit cible, pas le POC.

**Exigence de fidélité** : le POC doit avoir un look proche de la V1 actuelle, pas un
produit générique réinventé. Des captures d'écran de la V1 ont été fournies comme
référence **visuelle uniquement** — voir section dédiée plus bas. Le contenu et le
périmètre fonctionnel suivent le document de vision fusionné, pas la V1.

## Objectif du POC

Démontrer, de façon regardable en live (audience potentielle : MOE + décideurs), trois
paris architecturaux :

1. **Modules activables/désactivables par office, sans redéploiement** — le point le plus
   stratégique. Aujourd'hui (V1), une demande spécifique par office déclenche un clonage
   complet du code (~20 forks divergents à maintenir). Le POC doit prouver qu'un socle
   commun + des modules togglables résout ça.
2. **Identité partagée entre tenants, avec vraie isolation en base** — un compte
   utilisateur unique peut accéder à plusieurs offices, avec un rôle différent par office.
   Chaque office a sa **propre base de données** (pas une simple colonne `office_id` dans
   une base partagée — voir Architecture ci-dessous).
3. **Personnalisation visuelle par office (marque grise)** — logo/couleur appliqués
   dynamiquement, sur une base visuelle proche de la V1 (cf. captures de référence).

Objectif explicitement écarté : reproduire l'intégralité des fonctionnalités du document de
vision. Ce n'est pas un mini-MVP, c'est une démonstration ciblée — mais ce qui est démontré
doit ressembler à la vraie cible, pas à une maquette simplifiée.

## Stack

- **Backend** : Django + Django REST Framework, auth par token DRF (`rest_framework.authtoken`)
- **Frontend** : React + Vite + TypeScript
- **Base** : SQLite — **une base physique distincte par office** (pas de base partagée)
- **Sous-domaine** : routage réel via `*.localhost` (résolution automatique sur OS/navigateurs
  modernes, pas besoin d'éditer le fichier hosts)

## Commandes

```bash
# Backend
cd backend && source .venv/bin/activate && python manage.py runserver

# Frontend
cd frontend && npm run dev

# Recréer les données de démo (idempotent, peut être relancé sans risque)
cd backend && python manage.py seed_demo
```

## Architecture multi-tenant (décision confirmée — plus de simplification)

- **Une base SQLite par office**, routée dynamiquement via un routeur de base de données
  Django (`DATABASE_ROUTERS`), qui sélectionne la bonne base selon le tenant résolu pour
  la requête en cours (typiquement via une `ContextVar` peuplée par le middleware de
  résolution de sous-domaine).
- Conséquence pratique : les migrations doivent être rejouées **pour chaque base tenant**
  (une commande de management dédiée type `migrate_all_tenants` sera nécessaire), pas
  juste `python manage.py migrate` une fois.
- Une base "par défaut" séparée reste nécessaire pour les données transverses non liées à
  un office précis (comptes utilisateurs et `OfficeMembership`, registre des `Office`
  eux-mêmes, `Module`) — c'est cette base par défaut qui permet de savoir, avant même de
  choisir la base tenant, à quels offices un utilisateur a accès.
- **Sous-domaine** : middleware qui lit le `Host` de la requête pour résoudre l'office, et
  cookie de session avec `domain=.localhost` pour que l'identité partagée fonctionne en
  traversant les sous-domaines sans reconnexion.

## Modèle de données clé

- `Module` : un module activable (slug, nom, description) — base par défaut
- `Office` : un tenant (subdomain, nom, logo, couleur, modules activés en M2M) — base par
  défaut (registre des tenants)
- `OfficeMembership` : table pivot **user × office × rôle** — base par défaut. Porte le
  principe « compte unique, plusieurs offices » du document de vision (§2 et §6 pour les
  rôles : superadmin / admin / membre / client)
- Les modèles métier propres à un office (datarooms, documents...) vivront dans la base du
  tenant, pas dans la base par défaut.

## Repères visuels V1 (référence de STYLE uniquement)

> **Règle explicite (confirmée le 25/08/2026)** : les captures fournies (à placer dans
> `docs/reference-v1/`) servent **uniquement de référence visuelle** — couleurs, mise en
> page, densité, style de navigation, chrome général. Elles ne doivent **jamais** dicter
> le contenu, les champs, ou les fonctionnalités du POC. La V1 contient des éléments que
> la V2 abandonne délibérément (voir « Écarts assumés » ci-dessous). Pour tout ce qui est
> fonctionnel ou scope, **seul `EN_vision_AMOA_MVP_v0.5_fusionne.md` fait foi**.

- Deux applications visuellement distinctes en V1 : admin (bandeau violet dégradé, menu
  latéral riche) vs client (bandeau bleu, menu réduit). Si un thème est repris, respecter
  cette distinction de style admin/client plutôt qu'un seul look uniforme.
- Modals/formulaires organisés en panneaux dépliables (accordéon) — pattern d'UI
  éventuellement réutilisable pour la mise en page, indépendamment de ce que chaque
  panneau contient dans le POC.
- Chrome général : fil d'Ariane, sidebar gauche fixe, en-tête avec nom de l'étude +
  utilisateur connecté.
- Deux nuances de bandeau dans la même famille violet/indigo foncé : dégradé avec formes
  triangulaires abstraites en contexte "dossier ouvert", bandeau uni plus sobre sur les
  pages d'outils/listes.
- Convention de boutons cohérente sur toute l'appli : action principale en plein
  violet/navy foncé, annulation en contour rouge, actions secondaires en blanc avec icône.
- Page de connexion nettement plus soignée que le reste de l'admin : fond illustré pleine
  page (silhouettes + éléments graphiques abstraits bleu/violet), carte centrée, petites
  icônes intégrées dans les champs. Bon niveau de finition à viser pour l'écran de
  connexion du POC — c'est le tout premier écran vu en démo.
- Écran d'accueil post-connexion en grille de cartes arrondies (2×2), icône sur fond
  lavande clair en haut de chaque carte — patron réutilisable si le POC a un écran
  d'accueil plutôt que d'aller direct dans l'app après connexion.
- Indicateurs chiffrés (montants, compteurs) affichés en petites pastilles arrondies
  plutôt qu'en texte brut.

## Écarts assumés entre V1 et V2 (à ne PAS reproduire)

- **Un seul type de dataroom en V2** : la V1 distingue 3 types de dossier (Dataroom
  électronique / Espace de travail collaboratif / Dossier de divorce) — **confirmé
  abandonné en V2**, qui unifie tout sous la notion unique de « dataroom ». Ne pas
  reproduire cette distinction, ni dans le contenu ni dans le visuel.
- **Pas d'IA dans le POC**, malgré la présence d'un bouton « Reconnaissance Tri par l'IA »
  observé en V1 — confirmé hors périmètre pour le moment.
- Le point de sécurité déjà documenté au §4.1 du document de vision (annuaire d'offices
  exposé lors du partage entre études, vu aussi dans les captures V1) reste un écart à
  corriger, pas un comportement à reproduire.

## Comptes de démo (via `seed_demo`)

| Compte | Mot de passe | Accès |
|---|---|---|
| `alice` | `demo1234` | Office A uniquement (rôle admin) |
| `bob` | `demo1234` | Office B uniquement (rôle membre) |
| `carla` | `demo1234` | **Office A + Office B** (rôle superadmin sur les deux) — compte à utiliser pour démontrer l'identité partagée |

## Scénario de démo cible

1. Connexion avec `carla` sur `officea.localhost:5173` → montrer qu'elle peut aussi
   naviguer vers `officeb.localhost:5173` **sans se reconnecter** (preuve du pari n°2 :
   identité partagée à travers de vrais sous-domaines)
2. Basculer entre les offices → couleur et modules affichés changent, données réellement
   servies depuis deux bases distinctes (preuve du pari n°3, et amorce du n°1)
3. Ouvrir `/admin/` dans un autre onglet, désactiver le module « Coffre-fort » pour
   Office A → revenir côté React, rafraîchir → le bouton disparaît sans redéploiement
   (preuve du pari n°1, le point qui doit le plus percuter)

## État actuel du POC

- [x] Squelette Django/React connecté (endpoint `ping`, CORS configuré)
- [x] Modèles `Module`, `Office`, `OfficeMembership` (base unique pour l'instant)
- [x] Admin Django avec toggle de modules par office (`filter_horizontal`)
- [x] Auth par token DRF (`login`, `my-offices`, `tenant-config`, `modules/coffre-fort`
      — tous protégés par `IsAuthenticated` + vérification d'appartenance à l'office)
- [x] Frontend : formulaire de connexion, sélecteur d'office filtré par accès réel,
      affichage conditionnel de module, couleur appliquée dynamiquement via variable CSS
- [ ] Migrations + seed de démo — en cours côté utilisateur au moment de la rédaction
      de ce fichier
- [ ] **Migration vers une base SQLite par office** (routeur de base de données) — remplace
      la colonne `office_id` en base unique, priorité redéfinie le 25/08/2026
- [ ] **Vrai routage par sous-domaine** (`*.localhost`) avec cookie de session partagé
      — n'est plus un complément optionnel, fait partie du périmètre ferme
- [ ] Logo dynamique par office (la couleur est câblée, pas encore le logo)
- [ ] Arborescence de dataroom minimale (créer / uploader / naviguer) — pas commencé
- [ ] Alignement visuel avec les captures V1 de référence (`docs/reference-v1/`) — pas
      commencé, en attente de maquettes complémentaires

## Backlog « si le temps le permet » (hors engagement ferme du POC)

- Tags sur une dataroom — jugé intéressant à démontrer si le temps le permet, mais pas
  un engagement du périmètre POC
- Toute autre idée qui émergerait en cours de route : l'ajouter ici plutôt que de dériver
  le scope silencieusement

## Explicitement hors périmètre du POC

Q&A (y compris ses réglages fins vus en V1 : modération, plages horaires...), templates,
notion de portefeuille, audit trail / historique, facturation, droits fins par groupe,
conformité DSN/RGPD, vrai stockage S3, les 3 types de dossier distincts, la duplication de
dossier entre offices. Tous documentés dans le document de vision pour le chiffrage MOE,
mais non traités ici.

## Pour Claude Code

Lancer `/init` après avoir scanné le code existant pour compléter ce fichier avec les
détails d'implémentation réels (structure de fichiers exacte, éventuelles divergences
avec ce qui est décrit ici). Consulter aussi `docs/reference-v1/` pour la fidélité visuelle.
Garder ce fichier à jour au fil du POC, en particulier les sections « État actuel » et
« Backlog » — c'est la mémoire de travail du projet, pas un document figé.
