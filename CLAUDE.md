# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

- **Backend** : Django + Django REST Framework, auth par session Django
  (`SessionAuthentication`) — pas de token DRF (abandonné, voir Architecture ci-dessous)
- **Frontend** : React + Vite + TypeScript
- **Base** : SQLite — **une base physique distincte par office** (pas de base partagée)
- **Sous-domaine** : routage réel via `*.localhost` (résolution automatique sur OS/navigateurs
  modernes, pas besoin d'éditer le fichier hosts)
- **HTTPS en dev** : certificats mkcert (racine du projet), Vite en HTTPS natif,
  Django via `runserver_plus` (django-extensions) — voir Commandes et « État réel du code »
  pour le piège du wildcard `*.localhost` non valide en TLS.
- **Stockage fichiers** : MinIO (S3-compatible) en conteneur Docker local, via
  `django-storages` + `boto3` — remplace le stockage disque du POC initial. Voir
  Commandes pour la commande de lancement et la création du bucket.

## Commandes

Le `.venv` backend est un venv **Windows** (`backend/.venv/Scripts/`), pas un venv Unix.

```powershell
# Tout l'environnement de dev en une commande (backend + frontend détachés, PID dans
# .dev/) — ajouté le 30/08/2026. Les commandes détaillées ci-dessous restent valables
# et servent au diagnostic quand quelque chose ne démarre pas.
.\dev.ps1            # démarre les deux et attend que les ports répondent
.\dev.ps1 stop       # arrête les deux, enfants compris (taskkill /T)
.\dev.ps1 status     # qui tourne, sur quels ports
.\dev.ps1 logs       # dernières lignes des sorties
.\dev.ps1 totp       # code TOTP de carla

# Backend — HTTPS via runserver_plus (django-extensions), remplace runserver depuis le
# passage en HTTPS. Les deux serveurs de dev tournent exclusivement en HTTPS
# (SESSION_COOKIE_SECURE/CSRF_COOKIE_SECURE=True) : ne pas revenir à runserver nu, les
# cookies de session cesseraient d'être transmis.
cd backend; .venv\Scripts\Activate.ps1; python manage.py runserver_plus --cert-file ../localhost+5.pem --key-file ../localhost+5-key.pem

# Backend (Git Bash / le tool Bash de Claude Code)
cd backend && source .venv/Scripts/activate && python manage.py runserver_plus --cert-file ../localhost+5.pem --key-file ../localhost+5-key.pem

# Régénérer les certificats mkcert si besoin (racine du projet). IMPORTANT : lister les
# sous-domaines EXACTS en plus du wildcard — *.localhost seul ne suffit pas, voir
# "État réel du code" pour l'explication (wildcard rejeté sur un domaine à un seul
# label par tous les validateurs TLS, pas juste une bizarrerie Windows). -cert-file/
# -key-file explicites (depuis le 02/09/2026, sous-domaine hyperadmin.localhost) pour
# garder les noms de fichiers stables : sans eux, mkcert renumérote le fichier de
# sortie selon le nombre de SAN, ce qui casserait les chemins en dur dans
# vite.config.ts et dev.ps1.
mkcert -cert-file localhost+5.pem -key-file localhost+5-key.pem \
  localhost "*.localhost" officea.localhost officeb.localhost hyperadmin.localhost \
  127.0.0.1 ::1

# MinIO (stockage S3-compatible des Document) — conteneur sans volume ni --name : les
# données ne survivent pas à la suppression du conteneur, le bucket est à recréer à
# chaque fois (voir juste après).
docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"

# Créer le bucket MinIO (jamais automatique) — identifiants par défaut minioadmin/minioadmin
python -c "
import boto3
s3 = boto3.client('s3', endpoint_url='http://localhost:9000',
                   aws_access_key_id='minioadmin', aws_secret_access_key='minioadmin')
s3.create_bucket(Bucket='espace-notarial-documents')
"

# Migrations (déjà générées et appliquées — à relancer seulement après modif de modèle)
cd backend && python manage.py makemigrations && python manage.py migrate

# Recréer les données de démo (idempotent, peut être relancé sans risque)
cd backend && python manage.py seed_demo

# Modèles de dataroom de démo (Template/TemplateFolder, idempotent) — hardcodé sur
# officea/officeb, à relancer après seed_demo si besoin de les reposer
cd backend && python manage.py seed_templates

# Enregistrer/migrer la base SQLite de chaque office (à relancer après tout nouvel
# Office créé — idempotent). Accepte --office=<subdomain> pour n'en cibler qu'un.
cd backend && python manage.py migrate_all_tenants

# Frontend — HTTPS natif Vite (server.https dans vite.config.ts, mêmes certificats mkcert)
cd frontend && npm run dev        # serveur de dev Vite (https://localhost:5173)
cd frontend && npm run build      # tsc -b && vite build
cd frontend && npm run lint       # oxlint

# Générer un code TOTP valide pour carla (secret fixe préconfiguré par seed_demo,
# vecteur de test RFC 6238) — à relancer juste avant de le saisir en démo, le code
# n'est valable que 30s. Fonctionne dès que django-otp est installé, pas besoin
# d'accès DB (le calcul est indépendant de tout modèle).
cd backend && python -c "
from django_otp.oath import totp
from binascii import unhexlify
print(f'{totp(unhexlify(\"3132333435363738393031323334353637383930\")):06d}')
"
# Même secret en base32 (GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ) si besoin d'une saisie
# manuelle dans une vraie appli d'authentification (Google Authenticator etc.) plutôt
# que la commande ci-dessus.

# Tests backend (20 tests sur la plomberie multi-tenant + MFA dans datarooms/tests.py)
cd backend && python manage.py test
```

`requirements.txt` (racine du projet, `pip freeze` du venv backend) existe depuis le
26/08/2026 — **régénéré ce jour-là** : le fichier commité juste avant (commit "Ajout du
requirement.txt") était en réalité un `pip freeze` d'un tout autre environnement
(`ruamel.yaml`, `uv` — rien à voir avec ce projet), encodé en UTF-16LE (probablement
`pip freeze > requirements.txt` lancé sous PowerShell dans le mauvais venv, qui
redirige en UTF-16 par défaut). `pip install -r requirements.txt` installe tout ce
qu'il faut : `django`, `djangorestframework`, `django-cors-headers`,
`django-extensions`, `Werkzeug`, `pyOpenSSL`, `django-storages`, `boto3` + leurs
dépendances transitives.

**Piège d'encodage à surveiller** : l'outil d'écriture de fichiers de Claude Code a, au
moins une fois dans cet environnement, écrit un fichier texte pourtant purement ASCII
en UTF-16LE sans raison apparente (`requirements.txt` à nouveau, cette fois via l'outil
plutôt qu'un `pip freeze` malheureux) — tous les autres fichiers écrits/édités pendant
la même session étaient corrects. Vérifier `file <chemin>` après toute création de
fichier texte non trivial sur ce projet si le contenu semble ne pas correspondre à ce
qui a été écrit ; en cas de souci, réécrire via un heredoc Bash (`cat > fichier <<
'EOF' ... EOF`) plutôt que l'outil d'écriture, qui a produit un fichier ASCII propre
sans plus de problème.

`mkcert` n'est pas sur le PATH de Git Bash/PowerShell dans cet environnement — installé
via WinGet, binaire trouvable via
`AppData\Local\Microsoft\WinGet\Packages\FiloSottile.mkcert_.../mkcert.exe` si besoin de
l'invoquer par chemin complet.

`SETUP.md` (racine du projet, créé le 26/08/2026) est le guide d'installation pas-à-pas
pour un nouveau développeur — reprend les commandes ci-dessus dans l'ordre, avec
prérequis machine. Le tenir à jour si les commandes ci-dessus changent.

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
- **Sous-domaine** : middleware qui lit le `Host` de la requête pour résoudre l'office
  (`datarooms.tenancy.middleware.TenantResolutionMiddleware`, fait le 26/08/2026).
- **Identité partagée — ⚠️ pas un cookie `domain=.localhost`, comme envisagé
  initialement** : testé et confirmé cassé (curl + Chrome réel, le 26/08/2026) —
  `localhost` est traité par les navigateurs comme un suffixe public (Public Suffix
  List, protection anti-supercookie RFC 6265bis), donc un cookie ne peut pas y être
  scopé à `.localhost` en entier. À la place : **chaque office garde sa propre session**
  (cookie scopé exactement à son hôte, sans `Domain`), et passer d'un office à l'autre se
  fait par un **échange de ticket signé à usage unique** (`datarooms/tenancy/sso.py`,
  `django.core.signing`) — le navigateur navigue vers
  `<office_cible>.localhost:8000/api/sso/consume/?ticket=...`, qui pose la session locale
  puis redirige vers le frontend de l'office cible. Le résultat perçu (« sans
  reconnexion ») reste identique pour l'utilisateur.

## Modèle de données clé

- `Module` : un module activable (slug, nom, description) — base par défaut
- `Office` : un tenant (subdomain, nom, logo, couleur, modules activés en M2M) — base par
  défaut (registre des tenants)
- `OfficeMembership` : table pivot **user × office × rôle** — base par défaut. Porte le
  principe « compte unique, plusieurs offices » du document de vision (§2 et §6 pour les
  rôles : superadmin / admin / membre / client)
- `Dataroom` : premier modèle métier tenant (fait le 26/08/2026) — vit dans la base de
  l'office (`tenant_<subdomain>`), pas dans `default`. Un seul type de dataroom (pas de
  distinction électronique / espace de travail / dossier de divorce comme en V1 — voir
  « Écarts assumés »). Volontairement pas de `ForeignKey` vers `Office` : l'office est
  déjà déterminé par le fichier SQLite dans lequel la ligne est stockée, et une vraie FK
  cross-DB n'est de toute façon pas possible avec ce mécanisme (limite déjà anticipée).
  Absent de `SHARED_MODELS` dans `tenancy/router.py` **par conception** — c'est ce qui le
  fait router vers la base tenant. Champs : `name`, `created_at`.
- `Folder` : troisième modèle métier tenant (fait le 27/08/2026) — vit dans la même base
  tenant que `Dataroom`/`Document`, même patron (absent de `SHARED_MODELS`). Appartient à
  une `Dataroom` (FK classique) et peut être imbriqué dans un autre `Folder` de la même
  dataroom via `parent` (FK vers `self`, nullable — `None` = dossier racine). Champs :
  `dataroom`, `parent`, `name`, `created_at`. `Document` gagne une FK `folder` nullable
  (`None` = document à la racine de la dataroom, pas dans un sous-dossier) ; sa FK
  `dataroom` existante reste inchangée et n'est pas dérivée du dossier — les deux doivent
  rester cohérents (`folder.dataroom == document.dataroom`), ce que l'API impose en
  résolvant tout id de dossier reçu (`folder`/`parent`) scopé à la dataroom de l'URL
  plutôt qu'en confiance globale (voir `datarooms/views.py`, `_resolve_folder`) — un id de
  dossier valide mais appartenant à une AUTRE dataroom est rejeté (400/404), vérifié en
  curl le 27/08/2026. `tenant_document_path` (chemin de stockage) reste inchangé et ne
  reflète pas l'arborescence de dossiers dans la clé S3 — seules les relations en base
  portent la hiérarchie, le stockage reste à plat par dataroom (simplification
  volontaire, sans conséquence fonctionnelle).
- `Document` : deuxième modèle métier tenant (fait le 26/08/2026) — vit dans la même base
  tenant que `Dataroom`. `ForeignKey` vers `Dataroom` **classique** (pas de limite ici :
  les deux modèles vivent dans la même base physique, contrairement à une FK vers
  `Office`/`User`). Champs : `dataroom`, `name`, `file` (`FileField`), `uploaded_at`.
  Fichier stocké sous la clé `<subdomain>/dataroom_<id>/<nom>` dans le bucket MinIO
  (`espace-notarial-documents` — stockage disque local abandonné depuis le passage à
  MinIO, voir "État réel du code") — chemin calculé par
  `datarooms.tenancy.storage.tenant_document_path`, qui réutilise le même `ContextVar` que
  le routeur DB (`get_current_tenant()`), pas un nouveau mécanisme. Validation du format à
  l'upload par extension (`datarooms/validators.py`, liste tirée de
  `EN_vision_AMOA_MVP_v0.5_fusionne.md` §4.7) — pas d'antivirus/analyse de contenu (§7.5
  du document de vision, hors périmètre POC).
- `AccessRestriction` : quatrième modèle métier tenant (fait le 28/08/2026,
  étendu le 03/09/2026) — même patron que `Dataroom`/`Folder`/`Document` (absent
  de `SHARED_MODELS`). Restreint l'accès à UN Dataroom, Folder ou Document précis
  (`OneToOneField` nullable vers chacun des trois, exactement un renseigné par
  ligne — invariant appliqué au niveau applicatif, pas par contrainte SQL) selon
  DEUX critères indépendants, l'un OU l'autre suffisant : `user_ids` (`JSONField`,
  liste d'entiers — pas de `ForeignKey` vers `User`, base `default`, cross-DB
  impossible avec ce mécanisme, même contrainte que `Dataroom` → `Office`) et
  `allowed_roles` (`JSONField`, liste parmi `admin`/`membre`/`client` — jamais
  `superadmin`, qui bypasse systématiquement toute restriction dans
  `views._user_can_access`, avant même sa résolution : ni case ni colonne
  Superadmin nulle part dans l'UI). Héritage par la hiérarchie : une restriction
  sur un `Folder` s'applique à tout son contenu imbriqué sauf si un niveau plus
  profond porte sa propre restriction — c'est la restriction la PLUS PROCHE qui
  s'applique (pas de fusion de plusieurs restrictions le long de la chaîne), voir
  `views._nearest_restriction`/`_user_can_access`. Absence de restriction sur toute la
  chaîne = accès ouvert par défaut, **mais depuis le 01/09/2026 uniquement pour les
  rôles membre/admin/superadmin** — un `client` sans restriction explicite nulle
  part n'a désormais accès à RIEN par défaut (voir entrée dédiée du 01/09/2026 dans
  "État réel du code" pour le détail ; le comportement pour les autres rôles est
  inchangé, et `_nearest_restriction` elle-même n'a pas bougé).
  Les deux listes vidées ensemble suppriment la ligne plutôt que de la laisser
  dans cet état (voir `views._set_restriction`) : repasser par « aucune
  restriction » plutôt qu'une ligne « restreint à personne et à aucun rôle ».
- `Template`/`TemplateFolder` : modèles métier tenant (fait
  le 01/09/2026, `TemplateFolder` étendu le 03/09/2026) — même patron que
  `Dataroom`/`Folder`/`Document`/`AccessRestriction` (absents de `SHARED_MODELS`,
  pas de FK vers `Office`/`User`). `Template` (`name`, `description`,
  `created_at`) est une structure de dossiers RÉUTILISABLE, jamais liée à une
  dataroom précise. `TemplateFolder` (`template` FK, `parent` self-FK nullable —
  même imbrication que `Folder`, `name`) porte, en MIROIR exact
  d'`AccessRestriction` depuis le 03/09/2026, `allowed_roles` (`JSONField`,
  renommé depuis `visible_to_roles` — même sémantique) ET `user_ids`
  (`JSONField`, nouveau) : les utilisateurs nommés sont désormais aussi une
  option pour un template, pas seulement les rôles. `allowed_roles` est copié
  TEL QUEL sur l'`AccessRestriction` obtenue à l'application du template ;
  `user_ids`, lui, est re-résolu contre les `OfficeMembership` RÉELS de
  l'office à CE moment-là (`views._apply_template`) — un id nommé au template
  mais dont l'utilisateur a quitté l'office entre-temps est silencieusement
  écarté, même défense en profondeur que `_set_restriction`. Les deux vides =
  pas de restriction créée pour ce dossier — le comportement d'accès par défaut
  selon le rôle (voir l'entrée `AccessRestriction` ci-dessus) s'applique tel
  quel. **Copie ponctuelle, jamais un lien vivant** : appliquer un `Template` à
  la création d'une `Dataroom` (`POST /api/datarooms/` avec `template_id`)
  copie récursivement `TemplateFolder` en de vrais `Folder`
  (et `AccessRestriction` pour les nœuds à `allowed_roles`/`user_ids` non vides)
  — aucune référence n'est conservée vers le `Template` d'origine ensuite,
  modifier le `Template` après coup n'affecte donc jamais les datarooms déjà
  créées à partir d'une version antérieure (vérifié par test, voir "État réel
  du code").
- `HyperadminAccess` (fait le 01/09/2026) : marque un utilisateur comme
  hyperadmin Notantis — rôle TRANSVERSE à tous les offices, à ne pas confondre
  avec le rôle `superadmin` d'`OfficeMembership` (qui reste, lui, scopé à UN
  office précis, même pour un utilisateur superadmin sur plusieurs offices
  comme `carla`). `OneToOneField` vers `User`, vit dans la base `default` (comme
  `Office`/`OfficeMembership`, ajouté à `SHARED_MODELS`) : l'existence d'une
  ligne pour un utilisateur donné suffit à le rendre hyperadmin, peu importe le
  sous-domaine depuis lequel il se connecte — le gate (`views._is_hyperadmin`)
  ne dépend d'aucun `request.office`. Volontairement PAS `is_staff`/
  `is_superuser` Django (portée `/admin/` différente) ni le rôle `superadmin`
  d'`OfficeMembership`. `Office` gagne `is_active` (`BooleanField`, défaut
  `True`) — un office désactivé devient inaccessible EXACTEMENT comme un
  sous-domaine inconnu (`TenantResolutionMiddleware`, voir "État réel du
  code"), sans suppression de données.
- `Tag` : modèle métier tenant (fait le 01/09/2026) — même patron que
  `Dataroom`/`Folder`/`Document`/`AccessRestriction` (absent de `SHARED_MODELS`). C'est
  le **catalogue de tags de l'office** : deux offices peuvent avoir un tag « Vente » sans
  aucun rapport, et `slug` n'a besoin d'être unique que dans la base tenant — l'isolation
  est physique, pas une colonne `office_id`. Champs : `name`, `slug`, `color`,
  `created_at`. `Dataroom` et `Document` gagnent chacun un `ManyToManyField(Tag)` ; les
  deux tables pivot implicites sont, comme leurs deux extrémités, des tables tenant —
  **rien à ajouter à `SHARED_MODELS`**, contrairement à `office_enabled_modules` qui,
  lui, relie deux modèles partagés (piège déjà rencontré, voir `tenancy/router.py`).
  - `slug` est le nom **replié** (accents et casse écrasés — `validators.tag_slug`) et
    sert de clé de déduplication : créer « Vente » quand « vente » existe rend le tag
    existant plutôt qu'un doublon. C'est ce qui rend la création à la volée depuis un
    dossier sûre sans imposer un catalogue verrouillé.
  - `color` est une **clé sémantique** (`brass`, `info`, `success`, `warning`,
    `critical`, `neutral`), pas un hexadécimal : la couleur affichée est résolue par le
    thème de l'office côté front (`components/atoms/Tag.tsx`, propriétaire de la
    palette ; `validators.TAG_COLORS` en est le miroir qui borne). Un office qui
    personnalise sa palette voit ses tags suivre — ce qu'un `#7c3aed` figé en base
    empêcherait. Même parti pris que `Office.theme` : le catalogue vit côté front, le
    backend stocke et borne.
- Les futurs modèles métier propres à un office suivront le même principe que
  `Dataroom`/`Document` : vivre dans la base du tenant, pas dans la base par défaut.

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
| `hyperadmin` | `demo1234` | **Rôle transverse** (`HyperadminAccess`, aucun `OfficeMembership`) — se connecte sur `hyperadmin.localhost` uniquement, pas sur un sous-domaine d'office |

`carla` a un dispositif TOTP **déjà confirmé** (secret fixe préconfiguré par
`seed_demo`, pas d'enrôlement à faire en démo) — voir Commandes pour générer un code
valide au moment de la présentation. `alice`, `bob` et `hyperadmin` n'ont pas de
dispositif préconfiguré : leur premier login demande un enrôlement (QR code).

## Scénario de démo cible

1. Connexion avec `carla` sur `officea.localhost:5173` (mot de passe **+ code TOTP**,
   voir Commandes pour le générer — dispositif déjà confirmé, pas d'enrôlement à faire
   en direct) → montrer qu'elle peut aussi naviguer vers `officeb.localhost:5173`
   **sans se reconnecter, ni MFA à ressaisir** (preuve du pari n°2 : identité partagée
   à travers de vrais sous-domaines — la MFA ne protège que la connexion initiale)
2. Basculer entre les offices → couleur et modules affichés changent, données réellement
   servies depuis deux bases distinctes (preuve du pari n°3, et amorce du n°1)
3. Ouvrir `/admin/` dans un autre onglet, désactiver le module « Coffre-fort » pour
   Office A → revenir côté React, rafraîchir → le bouton disparaît sans redéploiement
   (preuve du pari n°1, le point qui doit le plus percuter)

## État réel du code (audit du 25/08/2026, corrigé le 26/08/2026)

Cette section reflète ce qui est *effectivement dans le code*, par opposition à ce que
la section suivante décrit comme cible atteinte. À vérifier/mettre à jour à chaque
session si le code a bougé.

- **App Django `datarooms`**, dans `backend/datarooms/` : `models.py` (`Module`,
  `Office`, `OfficeMembership` — tous routés vers la base `default`), `admin.py`,
  `views.py`, `urls.py`, `management/commands/` (`seed_demo`, `migrate_all_tenants`),
  et le sous-package `tenancy/` (`context.py`, `registry.py`, `router.py`,
  `middleware.py`) ajouté le 26/08/2026 pour le multi-DB.
- **✅ Fait le 26/08/2026 — HTTPS en dev (mkcert) + stockage MinIO** :
  - **HTTPS** : `runserver_plus` (django-extensions + Werkzeug + pyOpenSSL) côté backend,
    `server.https` natif côté Vite (`frontend/vite.config.ts`), certificats mkcert à la
    racine du projet. **Découverte importante, indépendante de Windows/curl** : un
    certificat wildcard `*.localhost` seul ne suffit **pas** pour `officea.localhost`/
    `officeb.localhost` — `openssl verify` confirme `hostname mismatch` (`num=62`), et
    Chrome affiche un interstitiel « Erreur liée à la confidentialité » (`mkcert`
    lui-même avertit à la génération : *"many browsers don't support second-level
    wildcards like `*.localhost`"*). Cause : même famille de restriction que le rejet des
    cookies `Domain=.localhost` déjà rencontré (protection Public-Suffix-List contre les
    wildcards trop larges) — mais appliquée ici à la correspondance TLS, pas aux cookies.
    **Solution** : régénérer le certificat en listant les sous-domaines **exacts** en
    plus du wildcard (`mkcert localhost "*.localhost" officea.localhost officeb.localhost
    127.0.0.1 ::1`) — un SAN exact n'est jamais soumis à cette restriction. Fichiers
    actuels : `localhost+5.pem`/`localhost+5-key.pem` (les anciens `localhost+1.*`
    wildcard-only ont été supprimés). Vérifié de bout en bout en Chrome réel : chargement
    direct de `https://officea.localhost:5173` sans avertissement, aucune erreur console,
    tous les appels API en `200`.
  - **Piège opérationnel rencontré en cours de route** : `netstat` via Git Bash a affiché
    des PID de processus déjà terminés comme toujours `LISTENING` (sortie manifestement
    périmée), ce qui a fait tuer les mauvais PID à plusieurs reprises et laissé
    s'accumuler jusqu'à 8 processus `runserver_plus` zombies sur le port 8000 (dont
    d'anciens avec l'ancien certificat, expliquant des `403`/échecs TLS intermittents
    malgré un redémarrage apparemment réussi). `Get-NetTCPConnection`/
    `Get-CimInstance Win32_Process` (PowerShell) se sont montrés fiables, contrairement
    à `netstat -ano` dans ce Git Bash — à privilégier pour diagnostiquer quel processus
    tient réellement un port sur cette machine.
  - **Répercussions HTTP → HTTPS corrigées** : `CORS_ALLOWED_ORIGIN_REGEXES`,
    `CSRF_TRUSTED_ORIGINS` (`settings.py`), la redirection de `consume_sso_ticket`
    (`views.py`), `apiOrigin` et l'URL de ticket SSO dans `switchOffice` (`App.tsx`) —
    tous passés en `https://`. Ajouté `SESSION_COOKIE_SECURE`/`CSRF_COOKIE_SECURE =
    True` : si quelqu'un relance `runserver` nu (HTTP) par erreur, les cookies de
    session cessent d'être transmis — c'est le signal qu'il faut repasser par
    `runserver_plus` avec les certificats.
  - **Stockage MinIO** : `Document.file` était déjà un `FileField` standard (aucune
    correction nécessaire, vérifié) — bascule transparente vers
    `storages.backends.s3.S3Storage` via `STORAGES["default"]["OPTIONS"]`
    (`bucket_name`, `endpoint_url=http://localhost:9000`, `access_key`/`secret_key
    =minioadmin`, `addressing_style="path"` — requis pour MinIO sans DNS wildcard,
    `default_acl=None` — MinIO rejette souvent les en-têtes ACL). `MEDIA_URL`/
    `MEDIA_ROOT` et le service local de `/media/` (`config/urls.py`) supprimés,
    devenus morts. `tenant_document_path` (déjà existant) réutilisé sans changement —
    c'est tout l'intérêt de l'abstraction `FileField`. Bucket `espace-notarial-documents`
    créé manuellement (ni MinIO ni S3 ne le font automatiquement). **Isolation vérifiée
    à trois niveaux indépendants** : upload dans `officea` → objet sous
    `officea/dataroom_2/...` (confirmé par `boto3.list_objects_v2` en dehors de
    Django, et visuellement dans la console MinIO `localhost:9001`) ; upload dans
    `officeb` → `officeb/dataroom_1/...`, aucun mélange. `document.file.url` renvoie
    désormais une URL MinIO **présignée** (expire) plutôt qu'un chemin `/media/`
    statique — améliore la limite de sécurité notée précédemment (fichiers servis sans
    contrôle d'accès une fois l'URL connue).
  - **Limites connues, pas corrigées** : conteneur MinIO lancé sans `-v`/`--name`
    (commande demandée telle quelle) — les données ne survivent pas à sa suppression, le
    bucket est à recréer à chaque nouveau conteneur (commande documentée ci-dessus). Le
    document `contrat.pdf` uploadé lors d'un chantier précédent (stockage disque) n'a
    pas été migré vers MinIO — sa ligne existe toujours en base tenant mais pointe vers
    une clé S3 inexistante, sans conséquence pour la démo (nouveaux documents testés à
    la place).
- **✅ Fait le 26/08/2026 — une base SQLite par office** : `DATABASE_ROUTERS` pointe
  vers `datarooms.tenancy.router.TenantRouter`. Les 3 modèles existants (`Module`,
  `Office`, `OfficeMembership`) sont tous classés partagés (`SHARED_MODELS`/
  `SHARED_APPS` dans `router.py`) et restent sur `default` (`backend/db.sqlite3`).
  `datarooms.tenancy.middleware.TenantResolutionMiddleware` résout le tenant depuis
  le sous-domaine du `Host` de la requête (fait le 26/08/2026 — voir entrée dédiée
  plus bas ; l'ancien `?office=<subdomain>` transitoire a disparu) et peuple une
  `ContextVar` consultée par le routeur, ainsi que `request.office`.
  `python manage.py migrate_all_tenants` crée/migre un fichier SQLite par `Office`
  sous `backend/tenants/` (ignoré par `.gitignore`).
- **✅ Fait le 26/08/2026 — premier modèle métier tenant (`Dataroom`), isolation
  physique vérifiée** : `Dataroom` (`name`, `created_at`, pas de FK vers `Office` —
  voir « Modèle de données clé ») ajouté à `models.py`, migration
  `datarooms/migrations/0002_dataroom.py` générée. Confirmé par inspection directe des
  3 fichiers `.sqlite3` (donc sans dépendre du routeur/ORM pour la preuve) :
  `db.sqlite3` (default) n'a **pas** la table `datarooms_dataroom` (le routeur bloque
  sa migration là) ; `tenants/officea.sqlite3` et `tenants/officeb.sqlite3` l'ont
  toutes les deux (via `migrate_all_tenants`, rejoué après la nouvelle migration). Une
  dataroom créée dans `officea` (`Succession Dupont`) via
  `Dataroom.objects.create(...)` sous contexte tenant `officea` n'apparaît ni dans
  `officeb.sqlite3` (vide) ni dans `default`. C'était le point sur lequel le chantier
  précédent (routeur multi-DB) restait non prouvé faute de modèle métier réel — c'est
  fait.
- **✅ Fait le 26/08/2026 — API Dataroom/Document + deuxième modèle métier tenant** :
  `GET`/`POST /api/datarooms/` (liste/création) et
  `GET`/`POST /api/datarooms/<id>/documents/` (liste/upload multipart) ajoutés à
  `views.py`/`urls.py`. `Document` (`dataroom` FK, `name`, `file`, `uploaded_at`) suit
  le même patron que `Dataroom` (absent de `SHARED_MODELS`, migration
  `0003_document.py`). Fichiers stockés sous `backend/media/<subdomain>/dataroom_<id>/`
  (`MEDIA_ROOT`/`MEDIA_URL` ajoutés à `settings.py`, servis en dev via `static()` dans
  `config/urls.py`, `media/` ignoré par `.gitignore`) — le chemin par tenant réutilise
  `get_current_tenant()`, pas de nouveau mécanisme. Validation d'upload par extension
  (`datarooms/validators.py`, liste §4.7 du document de vision). **CSRF vérifié en
  conditions réelles** : `POST /api/datarooms/` sans header `X-CSRFToken` → `403`
  ("CSRF token missing"), avec le header (valeur du cookie `csrftoken`) → `201` — le
  frontend (pas encore branché sur ces endpoints) devra utiliser le helper
  `getCookie('csrftoken')` déjà présent dans `App.tsx` pour `switchOffice`. Isolation
  confirmée par inspection directe des 3 fichiers `.sqlite3` (comme pour `Dataroom` :
  `TestCase` ne gère pas bien les alias de DB enregistrés paresseusement — limite déjà
  documentée) et du dossier `media/`.
- ⚠️ **Limite connue — fichiers servis sans contrôle d'accès** : `/media/<subdomain>/...`
  est servi par `django.views.static.serve` (dev only) sans revérifier l'appartenance à
  l'office une fois l'URL connue, contrairement aux endpoints API qui vérifient bien
  `IsAuthenticated` + membership. Le chemin par subdomain évite une fuite *accidentelle*
  entre tenants au niveau stockage mais n'est pas un contrôle d'accès. Cohérent avec le
  niveau de simplification déjà accepté ailleurs (`DEBUG=True`, pas de HTTPS, pas de vrai
  stockage S3 — déjà hors périmètre) ; à durcir (vue de téléchargement authentifiée) si
  ce chantier va au-delà du POC.
- **Note pour tout futur modèle métier tenant** : suivre exactement le patron de
  `Dataroom`/`Document` — l'ajouter à `models.py`, **ne pas** l'ajouter à
  `SHARED_MODELS` dans `tenancy/router.py` (l'absence est ce qui le fait router vers le
  tenant), générer la migration, puis relancer `migrate_all_tenants` (le `migrate`
  simple sur `default` l'ignorera correctement, c'est attendu).
- **✅ Corrigé le 26/08/2026 — routage API** : `datarooms/urls.py` route désormais
  `ping/`, `login/` (→ `login_view`), `my-offices/`, `tenant-config/` et
  `modules/coffre-fort/` (→ `coffre_fort_view`) ; `views.py` définit maintenant
  `ping` (`@api_view(['GET'])`, sans auth requise). Les 5 routes ont été testées
  manuellement via `curl` avec le compte `carla` et répondent en 200.
- **✅ Corrigé le 26/08/2026 — auth par token DRF inopérante** (obsolète depuis, voir
  entrée suivante) : `settings.py` ne déclarait aucun
  `REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES`, donc le header
  `Authorization: Token <key>` était ignoré. Le token DRF a depuis été abandonné au
  profit d'une auth par session (voir ci-dessous) ; `rest_framework.authtoken` reste
  installé (table orpheline dans `default`, inoffensive) mais n'est plus référencé.
- **✅ Fait le 26/08/2026 — routage par sous-domaine réel + identité partagée sans
  reconnexion (pari n°2)** : `TenantResolutionMiddleware` résout désormais l'office
  depuis le `Host` réel (`officea.localhost:8000` → `subdomain="officea"`), plus
  besoin de `?office=`. Auth basculée de `TokenAuthentication` vers
  `SessionAuthentication` (`login_view` appelle `django.contrib.auth.login`).
  **Découverte importante, contraire à ce que documentait initialement ce fichier** :
  un cookie `Domain=.localhost` partagé ne fonctionne pas — testé et confirmé cassé
  avec `curl` (`cookie 'sessionid' dropped, domain ... must not set cookies for
  'localhost'`) et avec Chrome réel (le `Set-Cookie` part bien du serveur mais le
  navigateur le rejette silencieusement, `document.cookie` ne le montre jamais,
  requête suivante en 403). Cause : `localhost` est traité comme un suffixe public
  (Public Suffix List) par les navigateurs, protection anti-supercookie du RFC
  6265bis. Solution retenue à la place, implémentée et validée en Chrome réel : chaque
  office garde sa propre session (cookie scopé exactement à son hôte, sans `Domain`),
  et changer d'office passe par un échange de **ticket signé à usage unique**
  (`datarooms/tenancy/sso.py`, `django.core.signing`, expire en 30s) via
  `POST /api/sso/issue/` (sur l'office courant) puis navigation plein-page vers
  `GET <cible>.localhost:8000/api/sso/consume/?ticket=...` (pose la session locale,
  redirige vers le frontend de l'office cible). Nécessite aussi
  `CSRF_TRUSTED_ORIGINS = ['http://*.localhost:5173']` (le POST `/api/sso/issue/` est
  fait cross-port depuis un utilisateur déjà authentifié, donc soumis au CSRF DRF,
  contrairement à `/api/login/` qui est anonyme). Testé de bout en bout avec Chrome
  réel : connexion sur `officea.localhost:5173`, bascule vers `officeb.localhost:5173`
  sans repasser par le formulaire, couleur/modules corrects par office, réutilisation
  d'un ticket déjà consommé correctement rejetée.
- **Migrations** : `0001_initial.py` (Module/Office/OfficeMembership) puis
  `0002_dataroom.py` (26/08/2026) — cette dernière ne s'applique réellement que sur les
  bases tenant (`default` n'a pas la table, par conception du routeur). `seed_demo`
  testé avec succès (alice, bob, carla).
- **Frontend (`frontend/src/App.tsx`)** : composant unique, pas de routing, pas de
  librairie de state. Origine API dérivée de `window.location.hostname` (plus de valeur
  en dur), tous les `fetch` en `credentials: 'include'`. Plus de `localStorage` — l'état
  d'auth est déduit d'un appel `my-offices` au chargement. Le sélecteur d'office (ancien
  `<select>`) est remplacé par des boutons qui déclenchent l'échange de ticket SSO
  décrit ci-dessus.
- **Tests** : `backend/datarooms/tests.py` couvre la plomberie multi-tenant (20 tests :
  ContextVar, normalisation d'alias, matrice `allow_migrate` (dont la classification
  partagé/tenant de `office_enabled_modules`, `Dataroom`, `Document` et `otp_totp`),
  middleware par `Host`, aller-retour/usage-unique des tickets SSO, validateur
  d'extension de fichier, flux MFA complet — enrôlement, vérification, et régression
  explicite sur la non-déclenchement via ticket SSO). Pièges rencontrés et documentés en
  commentaire dans les tests concernés : `ensure_tenant_registered` mute le dict global
  `connections.databases`, ce qui casse le nettoyage interne de `SimpleTestCase` si
  l'alias ajouté pendant le test n'est pas retiré en fin de test
  (`self.addCleanup(connections.databases.pop, ...)`) ; `_consumed_tickets` (registre
  des tickets SSO) est un set module-global, donc deux tickets émis pour le même
  `(user_id, target)` dans la même seconde produisent la même chaîne signée — les tests
  utilisent des couples distincts pour ne pas se marcher dessus. L'isolation physique
  réelle de `Dataroom`/`Document` (création + non-fuite cross-office, y compris les
  fichiers sous `media/`) n'est **pas** couverte par ces tests automatisés — `TestCase`
  ne gère pas bien des alias de DB enregistrés paresseusement à l'exécution (voir limite
  déjà notée pour le chantier routeur) ; vérifiée manuellement par inspection directe
  des fichiers `.sqlite3` et du dossier `media/` à la place.
- **✅ Fait le 26/08/2026 — `requirements.txt` + `SETUP.md`** : voir section
  Commandes pour le détail (régénération suite à un fichier corrompu commité par
  erreur, et le guide d'installation pas-à-pas pour un nouveau développeur).
- **Frontend stack** : Vite 8 + React 19 + TypeScript, lint via `oxlint` (pas
  ESLint) configuré dans `frontend/.oxlintrc.json`, pas de framework CSS (juste
  `App.css`/`index.css` par défaut de `npm create vite`, non utilisés par `App.tsx`
  au-delà du `#root` global).
- **✅ Fait le 26/08/2026 — nav minimale + écrans Datarooms** : `App.tsx` a maintenant
  un état de vue local (`type View = {kind:'home'|'datarooms'|'dataroom'|'module', ...}`,
  `useState`) plutôt qu'un routeur. Nouveaux composants inline (même fichier, même
  convention que `OfficePicker` déjà existant) : `Header`, `HomePage`, `DataroomsPage`,
  `DataroomDetailPage`, `ModulePage`. Nouvel endpoint minimal `GET /api/whoami/`
  (`views.py`/`urls.py`) — nécessaire pour afficher le nom d'utilisateur connecté même
  quand l'authentification vient d'un cookie de session déjà là (pas seulement du
  formulaire de login), notamment après une bascule d'office via ticket SSO.
  **Piège de vérification à noter** : la page appelle `alert()` en cas d'échec d'upload
  (même style que les erreurs déjà existantes ailleurs dans `App.tsx`) — une alerte
  JS bloque l'automatisation Chrome (`claude-in-chrome` le documente explicitement).
  Le cas « format de fichier refusé » a donc été vérifié directement en `curl` plutôt
  que par un clic dans le navigateur, pour ne pas geler la session d'automatisation ;
  le code du gestionnaire d'erreur reste néanmoins couvert par lecture (même chemin
  `res.ok`/`data.error` que le reste du fichier).
- **✅ Fait le 27/08/2026 — MFA (TOTP, django-otp)** : `/api/login/` ne connecte plus
  directement — il pose `request.session['mfa_user_id']` (session anonyme, avant tout
  `django.contrib.auth.login()`) et répond `{mfa_required, enrollment}` selon qu'un
  `TOTPDevice` confirmé existe déjà pour l'utilisateur. Deux nouvelles vues
  `AllowAny` (l'utilisateur n'est justement pas encore authentifié à ce stade) :
  `GET`/`POST /api/mfa/setup/` (enrôlement — QR code SVG en data URI via le helper
  `django_otp.qr.write_qrcode_image` réutilisé tel quel dans `datarooms/mfa.py`, pas
  de code QR réécrit à la main) et `POST /api/mfa/verify/` (dispositif déjà confirmé).
  Session pleinement ouverte (`login()`) seulement après un code TOTP valide.
  **Décision de conception clé** : pas d'`OTPMiddleware`/`request.user.is_verified()`
  (le gating "global" habituel de django-otp) — chaque office ayant sa propre session
  indépendante (voir plus haut), un tel gating aurait aussi bloqué la session ouverte
  par `consume_sso_ticket` sur l'office cible, cassant l'exigence explicite que la
  bascule d'office reste sans friction. La MFA est donc entièrement locale à
  `/api/login/` + les deux nouvelles vues ; `consume_sso_ticket` est inchangé et ne
  passe jamais par ce code — vérifié par un test dédié
  (`test_sso_ticket_consumption_never_triggers_mfa`) et manuellement en `curl`.
  **Piège routeur, même famille que `office_enabled_modules`** : `TOTPDevice` a une FK
  vers `User` (base `default`) — sans `"otp_totp"` ajouté à `SHARED_APPS` dans
  `tenancy/router.py` **avant** `migrate`, la table ne peut être créée nulle part
  (bloquée sur `default`, `MissingTenantContext` sur toute base tenant). Confirmé par
  inspection directe : `otp_totp_totpdevice` existe dans `db.sqlite3`, absente des deux
  bases tenant.
  **Piège de test à noter** : le throttling anti-bruteforce intégré de django-otp
  (délai exponentiel après un échec, activé par défaut — `OTP_TOTP_THROTTLE_FACTOR=1`)
  fait échouer une vérification valide si elle suit un échec de moins d'une seconde,
  *avant même de regarder le code soumis* (`verify_is_allowed()` court-circuite
  `verify_token()`). Rencontré dans les tests (code correct rejeté juste après un code
  invalide), contourné en levant le throttle explicitement entre les deux tentatives
  (`device.throttle_reset()`). **Vaut aussi pour la démo en direct** : après une saisie
  erronée, attendre ~1s avant de resaisir, sinon même un code correct sera rejeté sans
  explication apparente.
  `seed_demo` préconfigure un dispositif confirmé pour `carla` avec un secret **fixe**
  (le vecteur de test officiel RFC 6238, `"12345678901234567890"` en ASCII) — pas
  d'enrôlement à faire en direct pendant la démo. Voir Commandes pour la commande qui
  calcule un code valide à partir de ce secret.
- **✅ Fait le 27/08/2026 — modèle `Folder` (troisième modèle métier tenant) + API** :
  suit exactement le patron `Dataroom`/`Document` (absent de `SHARED_MODELS`, migration
  `0004_folder_document_folder.py`, puis `migrate_all_tenants`). `Folder` : `dataroom`
  (FK), `parent` (FK vers `self`, nullable — imbrication), `name`, `created_at`.
  `Document` gagne une FK `folder` nullable (`None` = racine de la dataroom). Détail des
  champs/relations dans "Modèle de données clé".
  API ajoutée à `views.py`/`urls.py` :
  - `POST /api/datarooms/<id>/folders/` — crée un dossier (`name`, `parent` optionnel).
  - `GET /api/datarooms/<id>/folders/?parent=<id>` — contenu d'un niveau de
    l'arborescence en **une seule réponse combinée** : `{"folders": [...], "documents":
    [...]}` (sous-dossiers ET documents directement enfants de `parent`, racine de la
    dataroom si `parent` absent) — pas deux appels séparés à combiner côté client.
  - `POST`/`GET /api/datarooms/<id>/documents/` (déjà existant) étendu : le POST accepte
    un champ `folder` optionnel dans le formulaire multipart pour uploader ailleurs qu'à
    la racine ; le GET accepte `?folder=<id>` et, **changement de comportement côté
    lecture** (sans conséquence sur les données existantes, qui étaient toutes à la
    racine avant ce chantier) : sans ce paramètre, ne renvoie plus que les documents à la
    racine (`folder=None`) au lieu de tous les documents de la dataroom quel que soit
    leur dossier.
  **Validation de cohérence dataroom/dossier** : tout id de dossier reçu (`folder` à
  l'upload, `parent` à la création) est résolu via `Folder.objects.get(pk=..., dataroom=
  dataroom)` — scopé à la dataroom de l'URL, pas une simple recherche par pk. Un id de
  dossier valide mais appartenant à une AUTRE dataroom (même tenant) est donc rejeté
  (`400` en écriture, `404` en lecture) plutôt qu'accepté silencieusement ; vérifié en
  `curl` le 27/08/2026 (dossier d'une dataroom B refusé comme `parent`/`folder` sur une
  dataroom A).
  Isolation cross-tenant vérifiée par inspection directe des fichiers `.sqlite3`, comme
  pour `Dataroom`/`Document` — pas de test automatisé pour l'isolation elle-même (limite
  déjà documentée : `TestCase` ne gère pas bien les alias de DB tenant enregistrés
  paresseusement) : dossiers/documents créés dans `officea` (dataroom de test, 2 dossiers
  imbriqués, 1 document à la racine + 1 dans un dossier) absents de `officeb.sqlite3` et
  de `db.sqlite3` (qui n'a même pas la table `datarooms_folder`, par conception du
  routeur — confirmé). Régression ajoutée dans `TenantRouterTests`
  (`test_folder_is_a_tenant_model_not_shared`), même patron que pour `Dataroom`/
  `Document`. `tenant_document_path` (chemin de stockage MinIO) volontairement inchangé
  — ne reflète pas la profondeur de dossier dans la clé S3, seule la base porte la
  hiérarchie (simplification assumée, voir "Modèle de données clé").
- **✅ Fait le 27/08/2026 — gestion des utilisateurs d'un office par ses admins** :
  nouveaux endpoints dans `views.py`/`urls.py`, aucun nouveau modèle (réutilise
  `User`/`OfficeMembership`, déjà partagés — base `default`). Gate d'accès :
  `_manager_role(user, office)` (renommé le 28/08/2026, voir entrée dédiée plus bas —
  s'appelait `_is_office_manager` et ne renvoyait qu'un booléen) = l'appelant a un
  `OfficeMembership` avec `role` `admin` ou `superadmin` **pour `request.office`
  précisément**, pas juste n'importe où — un superadmin d'un autre office (type carla)
  sans rôle admin/superadmin sur l'office courant est rejeté comme n'importe quel autre
  utilisateur.
  - `GET`/`POST /api/office-users/` — liste les `OfficeMembership` de `request.office`
    (`username`, `role`) ; POST crée un **nouveau** `User` + son `OfficeMembership` avec
    le rôle choisi (le rattachement d'un compte existant est un endpoint séparé, ajouté
    le 28/08/2026 — voir plus bas). Mot de passe validé via
    `django.contrib.auth.password_validation.validate_password` (réutilise
    `AUTH_PASSWORD_VALIDATORS` déjà configuré dans `settings.py`, pas de règle
    réinventée) ; nom d'utilisateur déjà pris → `400` plutôt que de laisser
    `IntegrityError` remonter.
  - `PATCH /api/office-users/<membership_id>/` — modifie uniquement le `role` du
    membership (pas le username/mot de passe — non demandé, et modifier un `User`
    partagé depuis un seul office serait risqué vu qu'un compte peut avoir accès à
    plusieurs offices). Scopé via `OfficeMembership.objects.get(pk=..., office=office)`
    — même patron que `_resolve_folder` pour Dataroom/Folder : un `membership_id`
    valide mais appartenant à un AUTRE office est `404`, pas `403` (l'existence même
    de la ligne n'est pas confirmée à l'appelant).
  **Isolation testée automatiquement** (contrairement à Dataroom/Document/Folder) :
  `OfficeMembership`/`User` vivent dans `default`, pas de limite `TestCase` sur les
  alias tenant paresseux ici. `OfficeUsersApiTests` (`datarooms/tests.py`) couvre
  spécifiquement le scénario carla : un utilisateur superadmin sur deux offices à la
  fois ne voit/ne peut modifier que sa ligne de l'office courant depuis
  `/api/office-users/` (`test_office_list_excludes_other_office_memberships`,
  `test_manager_cannot_reach_membership_of_another_office`) — vérifié aussi
  manuellement en Chrome (alice, admin sur Office A, voit `Utilisateurs` dans la nav ;
  bob, membre sur Office B, ne le voit pas et reçoit un vrai `403` de l'API en accès
  direct, pas juste un bouton caché côté UI).
  **Frontend** : nouvelle page `UsersPage` (`App.tsx`) — tableau des membres avec un
  `<select>` de rôle par ligne (PATCH au changement) + formulaire de création
  (username/password/rôle). Bouton nav « Utilisateurs » affiché seulement si
  `isOfficeManager` (dérivé de `my-offices`, en cherchant l'entrée dont le subdomain
  correspond au `Host` courant — pas un nouvel appel API). Pas de réinitialisation de
  mot de passe ni d'invitation par email (explicitement hors périmètre pour ce
  chantier).
- **✅ Fait le 28/08/2026 — rattachement d'un utilisateur existant + visibilité
  hiérarchique des rôles** : deux ajouts à la gestion des utilisateurs d'office
  (27/08/2026, entrée ci-dessus).
  - **Rang explicite des rôles** : `OfficeMembership.ROLE_RANK` (`models.py`) —
    `{"superadmin": 3, "admin": 2, "membre": 1, "client": 0}`, défini une seule fois et
    réutilisé partout (vues + frontend) plutôt que des comparaisons de chaînes
    éparpillées. `_manager_role(user, office)` (renommage de `_is_office_manager`,
    retourne le rôle et pas juste un booléen — nécessaire pour connaître le rang de
    l'appelant), `_roles_at_or_below(rank)` et `_validate_role_for_caller(role,
    caller_rank)` (`views.py`) centralisent toute la logique de rang.
  - **Visibilité hiérarchique** : un admin (rang 2) ne voit plus les memberships
    superadmin (rang 3) de son office dans `GET /api/office-users/` (filtre
    `role__in=_roles_at_or_below(caller_rank)`) — un superadmin voit tout le monde, lui
    y compris. `PATCH /api/office-users/<id>/` applique le même filtre à la résolution
    du membership ciblé : un membership superadmin visé par un admin est `404`, **pas**
    `403` — même logique que pour un membership d'un autre office (`_resolve_folder`
    pour Dataroom/Folder, déjà documenté) : on ne confirme même pas son existence.
  - **Cohérence rang à la création/au rattachement/à la modification** : la même règle
    (`_validate_role_for_caller`) s'applique aux TROIS endpoints qui acceptent un `role`
    en entrée — `POST /api/office-users/` (création), `POST /api/office-users/attach/`
    (nouveau, voir ci-dessous) et `PATCH /api/office-users/<id>/`. **Écart volontaire
    par rapport à la demande initiale**, qui ne mentionnait explicitement que les deux
    endpoints POST pour cette règle : appliquée aussi au PATCH, sans quoi un admin
    pourrait contourner l'interdiction de CRÉER un superadmin en PROMOUVANT un membre
    existant (qu'il peut par ailleurs voir/gérer, donc pas bloqué par la règle de
    visibilité) au rôle superadmin — un rôle demandé au-dessus du rang de l'appelant
    renvoie `400 "rôle invalide"`, sans distinguer un rôle qui n'existe pas d'un rôle
    hors de portée (même principe de non-confirmation que pour `attach`/`PATCH`
    ci-dessus).
  - **`POST /api/office-users/attach/`** — rattache un `User` **existant** (recherche
    par `username` exact, `User.objects.filter(username=...).first()`) à l'office
    courant, sans créer de compte ni exiger de mot de passe. Volontairement pas de
    recherche/autocomplete sur les utilisateurs existants (cf. §4.1 du document de
    vision sur l'annuaire d'offices exposé lors d'un partage entre études — déjà
    identifié comme point de sécurité à ne pas reproduire, voir "Écarts assumés") :
    l'admin doit connaître le nom exact ; un nom introuvable renvoie `404
    {"error": "utilisateur introuvable"}`, un message générique qui ne confirme ni
    n'infirme l'existence du compte ailleurs dans le système. Un utilisateur déjà
    membre de l'office → `400`.
  **Tests** (`OfficeUsersApiTests`, `datarooms/tests.py`, 8 nouveaux) : un admin ne voit
  pas un superadmin dans la liste
  (`test_admin_cannot_see_superadmin_in_list`), reçoit `404` en tentant de modifier son
  rôle (`test_admin_gets_404_patching_superadmin_membership`), ne peut ni créer ni
  rattacher quelqu'un en superadmin
  (`test_admin_cannot_create_or_attach_as_superadmin`), ni promouvoir un membre
  existant à ce rôle (`test_admin_cannot_promote_existing_member_to_superadmin`) ; un
  superadmin voit et gère bien les memberships superadmin
  (`test_superadmin_sees_and_manages_superadmin_rows`) ; scénario positif explicitement
  demandé — un utilisateur superadmin existant sur un premier office (type carla) est
  rattaché à un second office par le superadmin de ce second office
  (`test_attach_existing_superadmin_to_second_office`) ; plus les cas nom inconnu et
  déjà-membre pour `attach`. `test_manager_can_list_and_create` (test préexistant)
  corrigé : son assertion supposait encore que `shared_super` (superadmin) apparaissait
  dans la liste vue par un admin — devenu faux avec cette règle.
  **Frontend** (`App.tsx`) : `ROLE_RANK`/`rolesAtOrBelow` (miroir exact du dict backend
  — le serveur revalide toujours, ce filtrage n'est qu'un confort d'UI) filtrent les
  `<option>` de rôle dans les trois menus déroulants (création, rattachement,
  changement de rôle par ligne) selon `callerRole`, nouvelle prop de `UsersPage` dérivée
  de `currentOffice.role` dans `App()`. Bascule `mode: 'create' | 'attach'` (deux
  boutons nav, même patron que `Header`) : le formulaire de rattachement n'a ni champ
  mot de passe ni recherche/liste d'utilisateurs, juste nom exact + rôle. Vérifié en
  Chrome réel : alice (admin sur Office A) ne voit pas carla dans la liste, ses menus de
  rôle n'offrent pas "superadmin" ; rattachement de bob (déjà utilisateur existant,
  membre d'Office B uniquement) à Office A via "Ajouter un utilisateur existant" →
  apparaît immédiatement dans la liste sans mot de passe créé ; vérifié aussi en curl
  (login réel d'alice via son dispositif TOTP confirmé, pas de compte de test) que
  `attach`/création/PATCH en rôle superadmin renvoient bien `400`, qu'un nom inconnu
  renvoie `404` générique, et qu'un PATCH visant directement l'id du membership
  superadmin de carla sur Office A renvoie `404` (pas `403`).
- **✅ Fait le 28/08/2026 — contrôle d'accès par utilisateur sur Dataroom/Folder/
  Document, avec héritage** : modèle `AccessRestriction` (voir "Modèle de données
  clé"). Par défaut, comportement inchangé (tout membre de l'office a accès à tout le
  contenu) ; une restriction n'existe que là où un admin en a explicitement créé une.
  **Décision de conception — "la restriction la plus proche l'emporte", inchangée** :
  pas de fusion/union de plusieurs restrictions le long de la hiérarchie
  (`_nearest_restriction`/`_user_can_access`, `views.py`, non modifiées depuis leur
  création). Une restriction sur un `Folder` s'applique à tout son contenu SAUF si un
  niveau plus profond a la sienne propre, auquel cas c'est celle-là (et uniquement
  celle-là) qui compte pour ce niveau — pour déterminer l'accès DIRECT à un niveau
  précis, indépendamment de ce qui suit.
  - **✅ Étendu le 28/08/2026 — visibilité de chemin** (`_subtree_has_accessible_
    content`/`_level_visible`, `views.py`, fonctions NOUVELLES, volontairement
    séparées de `_nearest_restriction`/`_user_can_access` pour ne jamais risquer de
    régresser l'héritage déjà testé) : **remplace** la note ci-dessus qui affirmait
    qu'un override de document ne pouvait pas contourner une restriction de dossier
    plus large — devenue fausse. Un `Dataroom` ou `Folder` est désormais visible s'il
    est directement accessible (comportement ci-dessus, inchangé) **OU** si son
    sous-arbre contient, à n'importe quelle profondeur, un élément directement
    accessible via une restriction plus précise — y compris si la `Dataroom`
    elle-même est par ailleurs restreinte sans que l'utilisateur y figure. Remplace
    aussi une distinction dataroom/dossier évoquée juste avant dans la conversation :
    il n'y en a plus aucune — `_level_visible(user, dataroom, folder=None)` couvre le
    niveau racine de la dataroom exactement comme n'importe quel `Folder`, même
    fonction, même logique, `folder=None` désignant simplement la racine.
    **Visibilité CALCULÉE, jamais stockée ni mutée** : accorder un accès à un document
    imbriqué ne modifie JAMAIS la liste `user_ids` d'une restriction parente
    (dataroom/dossier intermédiaire) — chaque restriction reste le reflet exact de ce
    qui a été explicitement configuré à SON niveau (auditabilité), la visibilité de
    chemin est recalculée à chaque requête. Conséquence : lister un niveau ne montre
    QUE les éléments directement accessibles à ce niveau, PLUS les sous-dossiers qui
    MÈNENT vers un accès plus profond (sans montrer le reste du contenu de ces
    sous-dossiers de transit) — un utilisateur avec accès à un seul document imbriqué
    peut naviguer depuis la liste des datarooms jusqu'à ce document en ne voyant, à
    chaque niveau (dataroom incluse), que le seul élément menant à lui.
    **Lecture seulement, jamais l'écriture** : appliqué à `datarooms_view` (liste),
    `folders_view`/`documents_view` (accès à un niveau + filtrage des sous-dossiers,
    GET uniquement) — la création de dossier et l'upload (POST) restent gatés par
    `_user_can_access` seul, jamais `_level_visible` : un utilisateur qui ne fait que
    TRANSITER par un niveau (visible uniquement parce qu'il mène vers un accès plus
    profond) ne doit pas pouvoir y créer de contenu. Vérifié en curl (voir
    ci-dessous) qu'un upload dans un tel dossier de transit reste bien `404`.
  - API : `GET`/`POST /api/datarooms/<id>/access/`,
    `.../folders/<folder_id>/access/`, `.../documents/<document_id>/access/` (lecture/
    remplacement complet de la liste `user_ids` pour CE niveau précis) +
    `GET /api/access-restrictions/` (liste TOUTES les restrictions actives de l'office,
    avec libellé résolu et `dataroom_id` — consommée par la vue "par utilisateur" côté
    frontend). Gate d'écriture : `_manager_role` (admin/superadmin de l'office courant,
    même contrôle que la gestion des utilisateurs) — **jamais** `_user_can_access` :
    un gestionnaire doit toujours pouvoir gérer une restriction même s'il ne fait pas
    partie de la liste qu'il définit, sans quoi il pourrait se verrouiller lui-même
    hors de sa propre gestion.
  - Liste vide (`user_ids: []`) envoyée à un endpoint d'écriture **supprime** la ligne
    de restriction plutôt que de la laisser vide — repasser par "aucune restriction"
    (accès ouvert) est plus explicite qu'une ligne "restreint à personne" ; c'est aussi
    ce qui permet à une UI à cases à cocher de rester intuitive ("tout décocher" =
    "plus de restriction", pas "caché à tout le monde").
  - Application dans `datarooms_view`/`folders_view`/`documents_view` (GET **et**
    POST) : la liste des datarooms filtre celles inaccessibles ; lister/créer dans un
    dossier inaccessible renvoie `404` (pas `403`) — même logique de non-confirmation
    d'existence déjà établie pour le rang de rôle sur `office-users` et pour un
    `folder_id` d'une autre dataroom.
  - Validation des `user_ids` reçus : seuls les ids correspondant à de vrais
    `OfficeMembership` de CET office sont retenus (`_set_restriction`), le reste est
    silencieusement ignoré (défense en profondeur contre un id arbitraire, l'UI ne
    propose de toute façon que des membres réels — pas d'erreur bloquante pour une
    fonctionnalité "peu utilisée, interface simple" par consigne explicite).
  **Vérifié manuellement en curl (pas de test automatisé pour l'application/héritage
  elle-même — même limite déjà documentée pour Dataroom/Document/Folder : un tenant
  de test fraîchement créé via `TestCase` n'a pas de schéma migré, et les écritures
  dans une base tenant existante ne sont pas annulées par le rollback transactionnel
  de `TestCase`, qui ne couvre que la base `default`)** sur les vraies bases
  `officea`/`officeb` : restriction d'un `Folder` à alice seule → bob perd le dossier
  de la liste ET un accès direct (`?parent=`) renvoie `404` ; un `Document` dans ce
  dossier est également masqué pour bob par héritage (pas juste le dossier) ;
  restriction d'une `Dataroom` entière → disparaît de `/api/datarooms/` pour
  l'utilisateur exclu ; liste vide → réversion complète et immédiate à l'accès ouvert ;
  `GET /api/access-restrictions/` retourne bien les trois niveaux avec un libellé
  résolu (`"Folder Test Dataroom / Factures"`, etc.). Isolation tenant confirmée par
  inspection directe des fichiers `.sqlite3` (table absente de `default`, présente et
  vide après nettoyage dans `officea`/`officeb`). Automatisé : régression routeur
  (`test_access_restriction_is_a_tenant_model_not_shared`) + gate de permission testée
  sans jamais toucher de base tenant (`AccessRestrictionPermissionTests` : `403` pour
  un non-gestionnaire sur les quatre endpoints, avec des id fictifs — la vérification
  `_manager_role` s'exécute avant toute résolution de Dataroom/Folder/Document).
  **Frontend** : `DataroomDetailPage` reçoit une nouvelle prop `isOfficeManager` (déjà
  calculée dans `App()`, pas recalculée) ; bouton "Accès" par ligne dossier/document +
  bouton "Restreindre l'accès à cette dataroom" (visibles seulement pour un
  gestionnaire), ouvrant un panneau à cases à cocher (une par membre de l'office,
  `GET /api/office-users/`) qui `POST`e la liste complète au bon endpoint selon le
  niveau. Nouvelle colonne "Restrictions" dans `UsersPage` : par utilisateur, un
  panneau liste TOUTES les restrictions existantes de l'office
  (`GET /api/access-restrictions/`) avec une case par restriction — cocher/décocher
  ajoute/retire CET utilisateur de la liste existante (ne crée jamais de nouvelle
  restriction depuis cette vue, volontairement : partir d'une liste vide depuis "quels
  objets restreindre pour cet utilisateur" n'a pas de sens tant qu'aucun objet n'a déjà
  été restreint depuis sa propre page — la création reste uniquement l'action
  "restreindre à..." sur le dossier/document/dataroom lui-même). Vérifié en Chrome
  réel : restriction de "Factures" à bob+daniel via le panneau du dossier, confirmée
  par lecture API ; puis ajout d'alice à cette même restriction depuis son propre
  onglet "Restrictions" sur la page Utilisateurs, confirmée par lecture API
  (`user_ids` passe de `[2,4]` à `[1,2,4]`).
- **✅ Fait le 28/08/2026 — visibilité de chemin** (voir entrée `AccessRestriction`
  ci-dessus pour `_subtree_has_accessible_content`/`_level_visible`). **Testé
  automatiquement** — écart volontaire par rapport à la limite habituelle de ce
  fichier sur les tests tenant, demandé explicitement vu la complexité de la
  récursion sur l'arborescence : `PathVisibilityTests` (`datarooms/tests.py`) écrit
  réellement du Dataroom/Folder/Document/AccessRestriction dans un tenant sqlite
  dédié au test (`pathvis`, pas `officea`/`officeb`), migré via `call_command
  ('migrate', ...)` puis supprimé en fin de test. **`unittest.TestCase` nu, ni
  `django.test.TestCase` ni `TransactionTestCase`** — les deux ont été essayées et
  échouent pour un alias enregistré dynamiquement : déclarer `databases =
  {"default", "tenant_pathvis"}` fait planter la passe `check` globale que Django
  exécute sur toutes les databases nommées par toutes les classes de test avant que
  la moindre `setUpClass()` ne tourne (`ConnectionDoesNotExist`, l'alias n'existe pas
  encore) ; `databases = '__all__'` évite ce crash (résolution dynamique) mais
  `TestCase`/`TransactionTestCase` bloquent quand même la connexion au moment du test
  (`DatabaseOperationForbidden`, testé empiriquement — la permission n'est pas
  réévaluée dynamiquement malgré `'__all__'`). `unittest.TestCase` nu ne pose aucun
  des deux pièges (aucun patch de connexion, aucune passe `check` par classe) — au
  prix de perdre `self.client` (recréé via `django.test.Client()`) et tout rollback
  automatique de `default` (géré manuellement via `addCleanup`, comme pour l'alias
  tenant). Piège Windows rencontré : `Path.unlink()` sur le fichier tenant échoue
  avec `PermissionError` si la connexion SQLite n'est pas explicitement fermée avant
  (`connections[alias].close()`) — un handle de fichier reste ouvert sinon.
  3 tests couvrent exactement les scénarios demandés (arborescence avec dossiers
  "decoy" à plusieurs niveaux pour prouver le filtrage négatif, pas seulement
  positif) : accès à un document imbriqué sur 2 niveaux (chemin complet, dataroom
  incluse, visible — rien d'autre à aucun niveau) ; un dossier à deux enfants dont un
  seul mène à un accès accordé (seul celui-là apparaît) ; une dataroom par ailleurs
  restreinte qui redevient visible pour l'utilisateur exclu grâce à un document
  imbriqué (mais seulement le chemin vers lui), avec un troisième utilisateur sans
  aucun accès servant de régression de contrôle (ne voit rien du tout). **Vérifié
  aussi manuellement en curl sur `officea` réel** (`Dataroom` 4, "Folder Test
  Dataroom") : document uploadé dans `Contrats > Signes` restreint à bob, `Dataroom`
  4 entière restreinte à alice seule → bob revoit la dataroom dans sa liste et peut
  naviguer `Contrats` (seul dossier visible à la racine) → `Signes` (seul dossier
  visible dans `Contrats`, `contrat.txt` masqué) → le document ciblé (seul élément
  visible dans `Signes`) ; upload de bob dans `Signes` (dossier visible uniquement
  par transit) → toujours `404`, confirmant que l'écriture reste bien gatée par
  l'accès direct seul.
- **✅ Fait le 28/08/2026 — fusion backend-only de `Office.theme` depuis
  `front/design-system-components`** : reprise de la partie backend de la
  personnalisation visuelle par office développée par le collègue sur sa branche
  design system, **sans toucher à `frontend/`** (voir `FUSION_BACKEND_THEME.md` à la
  racine — document de passation détaillant ce qui a été repris/renuméroté et ce que
  le collègue doit faire à la prochaine fusion de sa branche). `Office.theme`
  (`JSONField(null=True, blank=True)`) — champ sur un modèle déjà partagé
  (`SHARED_MODELS`), aucune modification du routeur nécessaire, confirmé par
  inspection directe : la colonne `theme` existe sur `datarooms_office` dans
  `db.sqlite3` (`default`), et aucune base tenant n'a de table `datarooms_office` du
  tout (modèle jamais routé vers le tenant, comme attendu). `GET`/`PUT
  /api/tenant-theme/` (`views.py::tenant_theme`) : lecture ouverte à tout membre de
  l'office, écriture réservée `admin`/`superadmin`, `204` si l'office n'a jamais
  personnalisé (distingue « pas de thème » de « thème vide » pour le front).
  Validation dans `validators.py::clean_theme_payload` — couleurs par mode clair/
  sombre (dictionnaire **ouvert** côté Django, le catalogue de tokens vit côté front
  et une nouvelle couleur ne doit pas imposer de migration) et bloc `layout`
  optionnel (disposition de la navigation — énumérations **fermées**,
  `THEME_NAV_ENUMS`/`THEME_NAV_FLAGS`, une valeur inconnue produirait un attribut
  `data-nav-*` sans sélecteur correspondant, donc une navigation qui disparaît sans
  erreur). **Seul point de friction rencontré** : la migration `0004_office_theme.py`
  du collègue (dépendant de `0003_document`, son point de divergence) entrait en
  collision avec `0004_folder_document_folder.py`/`0005_accessrestriction.py` déjà
  présentes ici — régénérée par Django (`makemigrations`) sous le nom
  `0006_office_theme.py`, dépendant de `0005_accessrestriction`, contenu de
  l'`AddField` identique. `makemigrations --check --dry-run` confirme « No changes
  detected » après coup. 22 tests reprise tels quels (`ThemeValidatorTests`,
  `TenantThemeApiTests`) — suite complète repassée : 64 tests, tous verts.
- **✅ Fait le 28/08/2026 — fusion frontend complète : adoption de la structure du
  collègue (design system par composants) comme base, réalignée sur le backend réel** :
  suite directe de l'entrée précédente (fusion backend-only du thème). L'ancien
  `App.tsx` monolithique de `back_evolution` (nav locale `useState`, composants
  inline `Header`/`HomePage`/`DataroomsPage`/`DataroomDetailPage`/`UsersPage`,
  décrits dans les entrées "Frontend" précédentes de cette section) est **entièrement
  remplacé**, pas fusionné littéralement — devenu sans objet face à l'architecture du
  collègue (atomic design `atoms/molecules/organisms/templates/pages`, `AppShell` +
  `ThemeProvider`, 92 composants réutilisables). Mécanisme : `git checkout
  origin/front/design-system-components -- frontend/ .claude/skills/design-system/
  docs/design-system/ docs/espace-notarial-v1.md` (récupère tout son arbre sans
  rejouer son historique de commits) puis `git rm` des fichiers `back_evolution`-only
  devenus orphelins (`App.css`, `index.css`, `assets/{hero.png,react.svg,vite.svg}`).
  `package.json`/`vite.config.ts` déjà identiques entre les deux branches (React
  19/Vite 8), aucun `npm install` nécessaire.
  - **MFA portée dans le nouveau flux (prérequis bloquant, pas une extension)** : le
    `hooks/useSession.ts` du collègue et son flux de connexion n'avaient **aucune**
    notion de MFA — son `login()` s'attendait à ce que `/api/login/` authentifie
    directement, alors que cet endpoint répond toujours `{mfa_required, enrollment}`
    et n'ouvre jamais de session à lui seul (voir entrée MFA du 27/08/2026). Sans ce
    portage, adopter sa structure telle quelle aurait cassé la connexion entièrement.
    `SessionState.status` étendu (`'mfa-enroll' | 'mfa-verify'` en plus des états
    existants), nouvelle fonction `submitMfa(token)`. Nouvel écran présentationnel
    `components/pages/MfaScreen.tsx` (props `{mode, qrCode?, secret?, onSubmit,
    error?}`), composé à partir des mêmes atomes que `LoginScreen` (`Field`/
    `TextInput`/`Button`), même layout deux panneaux (`login-shell`). Vérifié en
    Chrome réel avec `alice` (enrôlement, QR code) et `carla` (dispositif déjà
    confirmé, code seul).
  - **`api/endpoints.ts` étendu aux 9 patterns confirmés absents** (vérifiés un par
    un par `git grep` sur la branche du collègue avant d'écrire, pas supposés
    couverts) : `listFolderLevel`/`createFolder` (dossiers imbriqués),
    `get`/`setDataroomAccess`, `get`/`setFolderAccess`, `get`/`setDocumentAccess`,
    `listAccessRestrictions` (droits d'accès), `listOfficeUsers`/`createOfficeUser`/
    `attachOfficeUser`/`updateOfficeUserRole` (gestion des utilisateurs). `login()`
    et `uploadDocument()` (nouveau paramètre `folderId?`) adaptés au contrat réel.
    `listDocuments` (sans notion de dossier) supprimé — devenu mort et redondant
    avec `listFolderLevel(id).documents` (le `GET` sans `?folder=` ne renvoie déjà
    que la racine côté backend, voir entrée `Folder` du 27/08/2026).
  - **Nouveaux hooks, un fichier par domaine** (convention déjà en place) :
    `useDataroomTree(dataroomId)` (`hooks/useDatarooms.ts`, remplace l'ancien
    `useDocuments`, supprimé — devenu mort), `useAccessRestrictions.ts`,
    `useOfficeUsers.ts` (ces deux derniers **sans écran consommateur** — demande
    explicite : hooks prêts, UI de gestion des utilisateurs/restrictions d'accès
    reportée à un chantier séparé, voir juste en dessous).
  - **⚠️ Régression assumée le 28/08/2026 — ✅ résolue le 30/08/2026** — UI de gestion
    des utilisateurs et de contrôle d'accès disparue puis reconstruite : l'ancien
    `App.tsx` avait une `UsersPage` complète (liste/rôles/création/rattachement) et
    un panneau "Accès" par dossier/document/dataroom (entrées du 27/08/2026 et
    28/08/2026 ci-dessus). Ces écrans avaient disparu dans le nouveau frontend —
    remplacés par du code du collègue qui ne les avait jamais eus, avec `useAccessRestrictions`/
    `useOfficeUsers` prêts côté front mais sans écran consommateur. Le collègue a
    reconstruit les deux le 30/08/2026 (`OfficeUsersScreen.tsx`,
    `AccessRestrictionModal.tsx`) sur sa branche — voir les entrées « UI reconstruite
    le 30/08/2026 » dans "État actuel du POC" pour le détail, et l'entrée d'audit du
    01/09/2026 juste en dessous pour la vérification indépendante de ce travail.
  - **Décision de conception clé — arbre de dossiers assemblé en amont, pas de
    chargement paresseux** : `organisms/Explorer.tsx` (composant du collègue,
    volontairement non modifié) attend un `tree: TreeNodeData[]` déjà complet, sans
    aucun mécanisme de fetch différé par nœud. `useDataroomTree` parcourt donc
    récursivement `GET /api/datarooms/<id>/folders/?parent=<id>` (racine puis chaque
    sous-dossier trouvé) pour assembler `tree`/`rootDocuments`/`documentsByFolderId`
    avant de les passer à `DataroomDetailScreen`. La visibilité de chemin déjà
    calculée côté serveur à chaque niveau (voir entrée du 28/08/2026 ci-dessus) fait
    que cet assemblage ne montre jamais plus qu'un utilisateur ne verrait en
    naviguant niveau par niveau — aucun filtrage supplémentaire côté client.
  - `DataroomDetailScreen.tsx` (fichier du collègue) étendu a minima : `onAddDocuments`
    et le nouveau `onCreateFolder` reçoivent désormais `activeFolderId` (état interne
    du composant, remonté au moment où l'action se déclenche plutôt que rendu
    contrôlé) ; bouton "Nouveau sous-dossier" (jusque-là sans handler) relié à un
    nouveau `organisms/NewFolderModal.tsx` (même patron que `NewDataroomModal`) ;
    `molecules/Dropzone.tsx` (déjà existant côté collègue, glisser-déposer + bouton
    "parcourir" dans le même composant) branché sous la liste de documents — upload
    réellement câblé pour la première fois dans cette UI.
  - **Vérifié de bout en bout en Chrome réel** (pas seulement `curl`/build) : liste
    des datarooms réelle (pas les données de démo du collègue), ouverture d'une
    dataroom réelle avec arbre à 2 niveaux de profondeur (`Contrats > Signes`,
    dossiers de test de sessions précédentes), navigation dans chaque niveau avec
    comptages de documents exacts, création d'un dossier au niveau affiché (modale
    correctement titrée "Dans : Signes", fermeture + rafraîchissement automatiques
    après création), upload par le `Dropzone` dans ce nouveau dossier (comptage total
    incrémenté, fichier listé au bon niveau, `uploaded_by` correct) — données de test
    nettoyées après vérification. `npm run check:ds` (0 écart nouveau sur 140
    fichiers), `npm run build` (`tsc -b && vite build` sans erreur), `npm run lint`
    (0 erreur, seul l'avertissement `react/only-export-components` préexistant sur
    `IconSprite.tsx` subsiste) — tous relancés après le chantier complet.
  - **Piège d'automatisation rencontré** : les clics `computer.left_click` de
    `claude-in-chrome` (coordonnées et refs d'éléments) ne déclenchaient pas de
    façon fiable les gestionnaires React synthétiques dans cette session de
    navigateur (aucune erreur, aucun changement d'état). Contourné en dispatchant de
    vrais `.click()` DOM via `javascript_tool` — fiable à chaque tentative,
    à privilégier pour toute vérification par clic dans ce projet si le problème
    se reproduit.
- **✅ Audit du 01/09/2026 — état des 4 phases de fusion (backend, fondations
  frontend, MFA, utilisateurs/droits) vérifié dans le code, pas seulement dans ce
  fichier**. Contexte : la branche de travail courante est désormais
  `back/EN_evolution_suite` (alignée sur `origin/front/design-system-suite`), 18
  commits plus loin que les deux commits de fusion du 28/08/2026 décrits ci-dessus —
  le collègue a continué depuis là (`979035f`, "Annuaire de l'étude et restrictions
  d'accès : les deux UI manquantes du backend de Maxime", puis dev.ps1, aperçu de
  document, icônes Phosphor, retrait de membre avec purge des restrictions, refonte
  des statuts en OKLCH). `back_evolution` (branche d'origine de ce fichier) n'a pas
  bougé depuis le 28/08/2026.
  - **Backend (thème)** : `Office.theme` présent, `0006_office_theme.py` toujours
    cohérente (`makemigrations --check --dry-run` → *No changes detected*), suite
    complète **64/64 tests verts** — conforme à l'entrée du 28/08/2026.
  - **Fondations frontend** : `AppShell`, `MfaScreen.tsx`, tous les `pages/*Screen.tsx`
    et les 13 fonctions d'API du chantier du 28/08/2026 confirmés présents et câblés
    (`grep` direct, pas une supposition). `npm run check:ds` → **147 fichiers
    vérifiés, 0 écart nouveau** (56 hérités, inchangé) — le nombre de fichiers a monté
    depuis les 140 du 28/08/2026 avec les écrans ajoutés par le collègue.
  - **MFA** : `login_view`/`mfa_setup`/`mfa_verify` et `otp_totp` dans `SHARED_APPS`
    toujours en place côté backend, `MfaScreen.tsx` toujours monté côté front —
    inchangé depuis le 28/08/2026.
  - **Utilisateurs/droits** : **la régression du 28/08/2026 est résolue** (voir
    l'entrée mise à jour juste au-dessus) — `useOfficeUsers`/`useAccessRestrictions`
    ont maintenant de vrais appelants (`App.tsx`, `OfficeUsersScreen.tsx`,
    `AccessRestrictionModal.tsx`), montés sur du state réel et atteignables depuis la
    nav (`NAV_SECTIONS` dans `data/demo.tsx`, entrée « Annuaire de l'étude »,
    volontairement visible à tous — c'est le serveur qui répond `403`, pas l'UI qui
    cache l'entrée). Détail dans "État actuel du POC" (entrées « UI reconstruite le
    30/08/2026 »).
  - Aucune régression détectée sur cette branche par rapport à ce que documentait
    ce fichier avant le 30/08/2026.
- **✅ Fait le 01/09/2026 — défaut d'accès dépendant du rôle pour `_user_can_access`**
  (`views.py`) : quand AUCUNE restriction n'existe sur toute la chaîne (le cas
  "accès ouvert à tout membre de l'office" jusqu'ici), le résultat dépend
  désormais du rôle de l'appelant **pour cet office précis** — membre/admin/
  superadmin gardent l'accès ouvert par défaut (comportement historique,
  inchangé) ; un `client` sans restriction explicite nulle part n'a plus accès à
  rien par défaut, y compris la VISIBILITÉ (un client ne voit ni le nom ni
  l'existence d'un dossier/document tant qu'aucune restriction ne l'y inclut
  explicitement). `_nearest_restriction` n'a pas bougé : dès qu'une restriction
  existe quelque part sur la chaîne, seule l'appartenance à `user_ids` compte,
  peu importe le rôle — seul le cas "aucune restriction trouvée" change.
  **Mécanisme** : `_user_can_access` gagne un paramètre `office` (elle ne
  l'avait pas jusqu'ici, seul `dataroom` circulait) pour pouvoir résoudre
  `user.memberships.filter(office=office).first()` et lire le rôle — un
  utilisateur sans membership pour cet office (ne devrait jamais arriver, tous
  les appelants vérifient déjà l'appartenance en amont) est traité par défaut
  fermé, comme un client, plutôt qu'ouvert. `_subtree_has_accessible_content` et
  `_level_visible` gagnent le même paramètre pour le faire descendre jusqu'à
  `_user_can_access`, sans aucune autre modification de leur logique — les 8
  points d'appel dans les vues (`datarooms_view`, `documents_view`,
  `folders_view`, `document_content_view`) passent tous déjà `office` en
  variable locale (`office = request.office`, résolu avant tout appel), donc
  aucun changement de logique côté vues, seulement le paramètre supplémentaire.
  **Propagation à la visibilité de chemin confirmée par les tests, pas
  supposée** (demande explicite) : `_level_visible`/
  `_subtree_has_accessible_content` s'appuyant déjà sur `_user_can_access`, le
  nouveau défaut fermé pour un client s'y propage automatiquement — vérifié par
  `test_client_without_restriction_sees_nothing` (aucune modification de ces
  deux fonctions au-delà du paramètre `office` n'a été nécessaire).
  **Tests** (`RoleBasedDefaultAccessTests`, `datarooms/tests.py`, même patron
  `unittest.TestCase` nu + tenant sqlite dédié que `PathVisibilityTests`, voir
  cette classe pour le détail des pièges déjà documentés) : un client sans
  restriction ne voit rien — ni la dataroom dans la liste, ni `/folders/` ni
  `/documents/` qui répondent `404` (pas une liste vide, même logique de
  non-confirmation d'existence que le reste de l'API) ; un client avec une
  restriction explicite l'incluant à un niveau précis (un document imbriqué)
  voit ce niveau ET tout le chemin jusqu'à lui, exactement comme n'importe quel
  autre rôle — la dataroom et le dossier intermédiaire redeviennent visibles par
  visibilité de chemin, le reste du contenu à chaque niveau reste masqué ; un
  membre sans restriction garde l'accès ouvert (régression de contrôle
  explicitement demandée, pour confirmer que le changement ne s'applique QUE au
  rôle client). Suite complète relancée : **67/67 tests verts** (64 existants +
  3 nouveaux, aucune régression).
  **✅ Incohérence corrigée le 01/09/2026** : le panneau
  `organisms/AccessRestrictionModal.tsx` (frontend, ajouté le 30/08/2026 — voir
  "État actuel du POC") affichait encore le texte « aucune case cochée = accès
  OUVERT à toute l'étude », plus vrai pour un client depuis ce changement.
  Corrigé : commentaire d'en-tête, pastille (« Ouvert (sauf clients) » plutôt
  que « Ouvert à toute l'étude » quand aucune case n'est cochée) et texte
  explicatif sous la pastille reformulés pour dire le nouveau défaut par rôle.
  `check:ds`/`build`/`lint` relancés, tous clean.
- **✅ Fait le 01/09/2026 — templates de dataroom (backend uniquement)** :
  modèles `Template`/`TemplateFolder` (voir "Modèle de données clé"), migration
  `0007_template_templatefolder.py` (dépendance auto-détectée sur `0006_office_theme`,
  générée par `makemigrations`, `--check --dry-run` confirme aucun changement
  après coup), `migrate_all_tenants` relancé — tables confirmées présentes sur
  `officea`/`officeb`, absentes de `db.sqlite3` (inspection directe des trois
  fichiers `.sqlite3`, même méthode que pour `Dataroom`).
  **API** (`views.py`/`urls.py`), CRUD réservé admin/superadmin de l'office —
  `_manager_role`, même gate que `office-users` :
  - `GET`/`POST /api/templates/` — liste/crée un `Template` (`name`,
    `description`). Pas de filtre `office=` sur la requête ORM : `Template` vit
    dans la base tenant, déjà scopée implicitement par la connexion (même patron
    que `Dataroom` dans `datarooms_view`).
  - `PATCH`/`DELETE /api/templates/<id>/` — modifie name/description, ou
    supprime (cascade sur ses `TemplateFolder` via `on_delete=CASCADE`).
  - `GET`/`POST /api/templates/<id>/folders/` — même patron que `folders_view`
    (`?parent=<id>`, résolution scopée au template via `_resolve_template_folder`,
    même exception `_FolderNotFound` réutilisée), mais sans "documents" dans la
    réponse GET — un template n'a que des dossiers. `visible_to_roles` reçu en
    écriture passe par `_clean_roles` (filtre silencieux aux seules clés valides
    de `OfficeMembership.ROLE_RANK` — même défense en profondeur que
    `_set_restriction` pour `user_ids`, pas de rejet bloquant sur un rôle
    inconnu).
  - `PATCH`/`DELETE /api/templates/<id>/folders/<folder_id>/` — modifie
    name/`visible_to_roles`, ou supprime (cascade sur les enfants via le
    self-FK).
  **`POST /api/datarooms/` étendu** : accepte un `template_id` optionnel. Si
  fourni et invalide → `400` "modèle introuvable" (la dataroom n'est pas créée).
  Si valide, `_apply_template(dataroom, template, office)` parcourt
  récursivement les `TemplateFolder` du template et crée un vrai `Folder` par
  nœud ; pour chaque `TemplateFolder` à `visible_to_roles` non vide, résout les
  rôles en ids réels via `OfficeMembership.objects.filter(office=office,
  role__in=...)` et crée l'`AccessRestriction` correspondante sur le `Folder`
  obtenu — SEULEMENT si la résolution donne au moins un id (même invariant que
  `_set_restriction` : jamais de restriction "à personne"). C'est le seul moment
  où les rôles du template deviennent des ids concrets — aucune référence n'est
  conservée vers `template`/ses `TemplateFolder` après coup.
  **⚠️ Changement de comportement décidé en revue de plan, pas dans la demande
  initiale** : `POST /api/datarooms/` (création d'une dataroom, avec ou sans
  template) est désormais réservé admin/superadmin (`_manager_role`) — jusqu'ici
  ouvert à tout membre de l'office. Seule la création change ; `GET` (lister les
  datarooms) reste inchangé, filtré par `_level_visible` comme avant. Aucun test
  existant n'exerçait `POST /api/datarooms/` (vérifié par grep avant le
  changement), donc aucune régression sur la suite existante — un test dédié
  couvre le nouveau gate (voir ci-dessous).
  **Tests** (`DataroomTemplateTests`, `datarooms/tests.py`, 5 nouveaux) : même
  patron `unittest.TestCase` nu + tenant sqlite dédié
  (`templatetest`) que `PathVisibilityTests`/`RoleBasedDefaultAccessTests`, mais
  **sans écriture ORM directe dans `setUp`** — `Template`/`TemplateFolder`/
  `Dataroom`/`Folder` sont tous créés via les endpoints eux-mêmes dans chaque
  test (`TenantResolutionMiddleware` pose le contexte tenant depuis le `Host` de
  chaque requête HTTP, pas besoin de `set_current_tenant` manuel ici — plus
  simple que les deux classes précédentes puisqu'aucune donnée n'est prête
  d'avance). Couvre : une dataroom créée depuis un template à 2 niveaux
  reproduit bien l'arborescence, et la restriction du sous-dossier se résout
  exactement aux ids réels des rôles listés (`visible_to_roles`) tandis que le
  dossier racine (sans `visible_to_roles`) n'a AUCUNE restriction ; modifier le
  template (renommer un dossier, en ajouter un autre) après la création d'une
  dataroom ne change rien à cette dataroom, mais une SECONDE dataroom créée
  ensuite depuis le même template obtient bien le nouvel état — preuve que la
  copie est indépendante, pas une référence partagée ; une dataroom créée sans
  `template_id` reste inchangée (arborescence vide) ; un `template_id` invalide
  renvoie `400` sans créer la dataroom ; un membre/client reçoit `403` sur
  `POST /api/datarooms/` là où un admin réussit (régression explicite pour le
  resserrement du gate). Suite complète relancée : **72/72 tests verts** (67
  existants + 5 nouveaux, aucune régression).
  **Vérifié aussi manuellement en `curl` sur `officea` réelle** (connexion
  `carla` + TOTP) : template à 2 niveaux créé (`Confidentiel` sous `Pieces
  identite`, `visible_to_roles: ["admin","superadmin"]`), dataroom créée depuis
  ce template → arborescence reproduite (`GET .../folders/`), restriction du
  sous-dossier confirmée `user_ids: [1,3]` = exactement alice (admin) + carla
  (superadmin) via recoupement avec `GET /api/office-users/`, dossier racine
  confirmé sans restriction (`user_ids: []`). Données de test nettoyées après
  vérification (`Dataroom`/`Template` supprimés via le shell Django).
  **Pas d'UI dans ce chantier** — demande explicitement backend + tests + doc
  (même situation que la gestion des utilisateurs/contrôle d'accès à l'origine,
  voir plus haut) ; aucun hook/écran frontend créé.
- **✅ Fait le 01/09/2026 — interface hyperadmin (rôle Notantis transverse)** :
  modèle `HyperadminAccess` + `Office.is_active` (voir "Modèle de données clé"),
  migration `0008_office_is_active_hyperadminaccess.py` (dépendance
  auto-détectée sur `0007_template_templatefolder`, bundlée en un seul fichier
  par `makemigrations` — `AddField` + `CreateModel`). `("datarooms",
  "hyperadminaccess")` ajouté à `SHARED_MODELS` (`tenancy/router.py`) — même
  piège déjà documenté pour `otp_totp`/`office_enabled_modules` : absent de cet
  ensemble AVANT `migrate`, la table ne peut être créée nulle part
  (`MissingTenantContext`). Isolation confirmée par inspection directe des
  trois `.sqlite3` : `datarooms_hyperadminaccess` et la colonne
  `datarooms_office.is_active` n'existent que dans `db.sqlite3`, absentes des
  bases `officea`/`officeb`.
  **`tenancy/middleware.py`** : un seul changement,
  `if office is not None:` → `if office is not None and office.is_active:`
  dans `TenantResolutionMiddleware.__call__`. C'est TOUT — `request.office`
  reste à `None` et aucun contexte tenant n'est jamais posé pour un office
  désactivé, exactement l'état déjà produit pour un `Host` qui ne correspond à
  aucun `Office` (la docstring de la classe l'affirmait déjà avant ce
  changement). Aucune vue en aval n'a besoin de connaître `is_active` — elles
  traitent déjà `request.office is None` comme "office non résolu".
  **API** (`views.py`/`urls.py`), gate `_is_hyperadmin(user)` (`HyperadminAccess.objects.filter(user=user).exists()`,
  même style fonction simple que `_manager_role`) — **volontairement
  indépendante de `request.office`**, voir décision "pas de sous-domaine dédié"
  ci-dessous :
  - `GET`/`POST /api/hyperadmin/offices/` — liste tous les `Office`
    (`id`/`subdomain`/`name`/`is_active`/`enabled_modules`, slugs) ; POST crée
    un office **et** son premier admin **dans le même flux** (`admin_mode:
    "create"|"attach"`, réutilise exactement la logique déjà en place pour
    `attach_office_user_view` côté "attach" — pas de recherche/annuaire,
    message générique `"utilisateur introuvable"` en `404`). Validation
    `subdomain`/`name` via `Office(...).full_clean()` (réutilise les
    validateurs `SlugField` + l'unicité déjà déclarés sur le modèle, pas de
    regex réinventée) AVANT toute écriture — pas de création partielle en cas
    d'erreur. Provisionnement de la base tenant : `ensure_tenant_registered` +
    `call_command('migrate', database=alias)`, EXACTEMENT le corps de la
    boucle de `migrate_all_tenants.py` appliqué à ce seul office nouvellement
    créé — sans ça l'office existerait dans le registre mais sa base
    n'existerait pas encore.
  - `PATCH /api/hyperadmin/offices/<id>/` — met à jour `is_active` et/ou
    `enabled_module_slugs` (réutilise `Office.enabled_modules` déjà existant,
    juste une interface qui évite `/admin/` Django) sur la même ressource,
    style PATCH partiel déjà en place (`office_user_detail_view`,
    `template_detail_view` : `if 'champ' in request.data:`). Slugs de module
    inconnus silencieusement ignorés (même défense en profondeur que
    `_clean_roles`/`_set_restriction`).
  **`seed_demo`** étendu : compte `hyperadmin` (mdp `demo1234`), avec
  `HyperadminAccess`. Pas de `TOTPDevice` préconfiguré (contrairement à
  `carla`, qui porte spécifiquement LE scénario d'identité partagée) — premier
  login enrôle son dispositif comme `alice`/`bob`.
  **⚠️ Décision explicite — pas de sous-domaine dédié pour cette version** : le
  gate `_is_hyperadmin` ne consulte jamais `request.office`, donc les routes
  `/api/hyperadmin/...` restent utilisables depuis N'IMPORTE QUEL sous-domaine
  d'office où l'appelant a une session active — pas besoin d'un nouveau
  mécanisme de session (contrairement à l'échange de ticket SSO entre offices,
  qui existe justement parce que chaque office a sa PROPRE session, voir
  "Architecture multi-tenant"). Choix assumé pour cette première tranche
  (liste/création/activation/modules) ; un sous-domaine dédié (ex.
  `admin.<racine>.localhost`) resterait une évolution naturelle si l'interface
  grossit (notifications globales, déjà au backlog).
  **Tests** (`HyperadminTests`, `datarooms/tests.py`, 4 nouveaux) : même patron
  `unittest.TestCase` nu + tenant(s) sqlite dédié(s) que les classes
  précédentes, avec une particularité — ces tests déclenchent eux-mêmes la
  création de NOUVEAUX offices/tenants (le comportement testé), donc `setUp`
  prépare un office de CONTRÔLE séparé (`hyperadmintest`, jamais créé par un
  test) qui sert uniquement de véhicule `HTTP_HOST` pour les appels
  `/api/hyperadmin/...` (qui ignorent `request.office` de toute façon).
  Couvre : un admin d'office "classique" (même role="admin") reçoit `403` sur
  les trois surfaces (`GET`/`POST /offices/`, `PATCH /offices/<id>/`), et
  aucun `Office` n'est créé par la tentative refusée ; créer un office
  provisionne bien sa base tenant — vérifié par **inspection DIRECTE du
  fichier `.sqlite3`** (`sqlite_master`, aucune dépendance au routeur/ORM pour
  la preuve, même méthode que pour chaque modèle tenant précédent) — et son
  premier admin est bien rattaché avec `role="admin"` dans le même flux ; un
  office désactivé devient inaccessible avec EXACTEMENT le même message
  qu'un sous-domaine inconnu (`404 "sous-domaine d'office non résolu"`), pas
  un code d'erreur ad hoc — testé avant/après bascule sur le même utilisateur ;
  plus un test de gestion des modules (slug valide appliqué, slug inconnu
  silencieusement ignoré). Suite complète relancée : **76/76 tests verts** (72
  existants + 4 nouveaux, aucune régression).
  **Piège de test rencontré** : lancer `HyperadminTests` SEULE
  (`manage.py test datarooms.tests.HyperadminTests`) fait afficher "Skipping
  setup of unused database(s): default." — Django ne crée alors PAS de base de
  test isolée pour `default` (aucune classe `django.test.TestCase` dans le
  run ne le déclenche) et les écritures ORM sur les modèles partagés
  (`Office`/`User`/`HyperadminAccess`...) retombent silencieusement sur la
  VRAIE `db.sqlite3` — sans risque de perte de données (tout est nettoyé via
  `addCleanup`, confirmé après coup par inspection directe du fichier), mais
  ça a révélé que `db.sqlite3` n'avait pas encore reçu `migrate` (seul
  `migrate_all_tenants` avait tourné, qui ne touche jamais `default`) : corrigé
  en lançant `python manage.py migrate` en plus. La suite complète
  (`manage.py test` sans argument) ne présente pas ce piège — une autre classe
  du fichier déclenche la création normale d'une base de test isolée pour
  `default`, comme documenté par les classes `unittest.TestCase` précédentes.
  **Vérifié aussi manuellement en `curl` sur `officea` réelle** : connexion
  `hyperadmin` (mot de passe + enrôlement MFA), liste des offices, création
  d'un nouvel office (`officec`) avec un nouvel admin dans le même flux →
  base tenant confirmée provisionnée sur disque (tables `datarooms_dataroom`/
  `datarooms_template` présentes), activation du module `coffre-fort`,
  désactivation puis réactivation (le module activé persiste — pas de perte de
  données), et `alice` (admin d'office A, pas hyperadmin) confirmée refusée
  (`403`) sur les trois endpoints. Données de vérification nettoyées après
  coup (`officec`, son admin, sa base tenant).
- **✅ Corrigé le 01/09/2026 — faille : connexion possible sur un office sans y
  être rattaché**. Découverte en démo (`alice`, admin d'Office A uniquement,
  parvenait à se connecter sur `officeb.localhost` alors qu'elle n'y a aucun
  `OfficeMembership`). `login_view` authentifiait jusqu'ici uniquement sur les
  identifiants globaux (`authenticate()`), sans jamais vérifier que ce compte
  avait un motif de se connecter SUR CET OFFICE précis — la session s'ouvrait
  donc pour de vrai sur n'importe quel sous-domaine, MFA comprise.
  **Pas de fuite de données** : chaque endpoint de contenu (`tenant-config`,
  `/api/datarooms/`, etc.) revérifie déjà `request.user.memberships.filter
  (office=office).exists()` et répond `403` — c'est ce qui a fait apparaître
  la liste vide plutôt que des données d'Office B. Le problème était que la
  connexion elle-même n'aurait jamais dû aboutir : un futur endpoint qui
  oublierait cette revérification transformerait l'anomalie en vraie fuite.
  **Correctif** : `login_view` vérifie désormais `request.office` (404
  "sous-domaine d'office non résolu" si non résolu, même message que partout
  ailleurs) puis `user.memberships.filter(office=office).exists()` (403 "accès
  non autorisé à cet office", même message que `datarooms_view`/
  `tenant_config`/etc. — pas de nouvelle formulation) — AVANT de poser
  `session['mfa_user_id']`, donc avant même de révéler si l'enrôlement MFA est
  nécessaire. **Exception délibérée : `_is_hyperadmin(user)`** — un hyperadmin
  n'a par construction aucun `OfficeMembership` nulle part (voir
  `HyperadminAccess`) et doit pouvoir se connecter depuis n'importe quel
  sous-domaine d'office, conformément à la décision de ne pas lui dédier de
  sous-domaine séparé (voir entrée du 01/09/2026 ci-dessus). Le chemin
  `issue_sso_ticket`/`consume_sso_ticket` (bascule d'office sans reconnexion)
  n'était PAS concerné : `issue_sso_ticket` vérifiait déjà l'appartenance
  avant d'émettre un ticket, seul `login_view` avait cet angle mort.
  **Tests** (`MfaLoginFlowTests`, `datarooms/tests.py`) : la classe utilise
  désormais un `Office` réel + un `OfficeMembership` pour son utilisateur de
  test (`enrollee`) plutôt qu'un contexte office-agnostique — 3 tests
  ajoutés : un compte valide mais sans rattachement à l'office reçoit `403`
  sans qu'aucune session MFA en attente ne s'ouvre (régression explicite pour
  la faille) ; un sous-domaine non résolu renvoie `404` ; un hyperadmin se
  connecte normalement sur un office où il n'a aucun rattachement (confirme
  l'exception). Suite complète relancée : **79/79 tests verts** (76 existants
  + 3 nouveaux, aucune régression).
  **Vérifié aussi manuellement en `curl`** sur `officea`/`officeb` réels,
  reproduisant exactement le scénario de démo : `alice` sur `officeb` → `403`
  (corrigé) ; `alice` sur `officea` → toujours `200` (inchangé) ; `hyperadmin`
  sur `officeb` → toujours `200` (exception préservée) ; `bob` sur `officeb`
  (vrai membre) → toujours `200` (inchangé).

- **✅ Fait le 01/09/2026 — tags : catalogue d'office, pose sur dossiers ET pièces,
  filtre et recherche** :
  - **Backend** : modèle `Tag` (voir « Modèle de données clé »), migration
    `0008_tag.py`, M2M vers `Dataroom` et `Document`. Endpoints : `GET/POST /api/tags/`
    (catalogue + `usage` = nombre d'éléments portant le tag, dossiers et pièces
    confondus), `PATCH/DELETE /api/tags/<id>/`, `PUT /api/datarooms/<id>/tags/`,
    `PUT /api/datarooms/<id>/documents/<id>/tags/`. `GET /api/datarooms/` accepte
    `?tags=1,2` (**OU** — au moins un des tags) et renvoie désormais les tags de chaque
    dossier ; `folders_view`/`documents_view` renvoient ceux de chaque pièce.
  - **Droits volontairement asymétriques** : tout membre peut créer un tag et en
    poser/retirer (sans quoi le tagging meurt d'attendre un admin) ; seuls
    admin/superadmin peuvent **renommer ou supprimer** une entrée du catalogue, les deux
    seules actions qui touchent d'un coup tous les éléments déjà tagués. Renommer vers un
    nom déjà pris est refusé (409) plutôt que de fusionner deux entrées en silence.
  - **Affectation par `PUT` idempotent** (la sélection COMPLÈTE, pas un delta) : l'interface
    manipule une sélection entière (on coche/décoche), et il n'y a rien à réconcilier
    entre deux ordres d'arrivée concurrents. Un id de tag inconnu dans la base tenant est
    rejeté en 400 — un id valide dans l'office voisin ne doit pas passer, même règle que
    `_resolve_folder` pour un dossier d'une autre dataroom.
  - **`?tags=` illisible → liste vide, pas liste complète** : `?tags=abc` doit dire que le
    filtre a joué. Répondre « tout » ferait passer un filtre cassé pour une absence de
    filtre.
  - **Front** : `Tag` gagne une couleur et une croix de retrait ; deux composants
    nouveaux — `TagFilter` (molécule : menu multi-sélection, décompte visible menu fermé)
    et `TagPicker` (organisme : pastilles + « + », recherche repliée accents/casse comme
    `tag_slug`, création à la volée avec choix de la couleur). Montés dans la colonne
    « Tags » de la liste des dossiers, dans l'en-tête du dossier ouvert, et par pièce dans
    l'explorateur ; le volet document les rappelle en lecture seule (un même réglage offert
    à deux endroits finit par diverger). Hook `useTags` pour le catalogue.
  - **Deux filtrages, deux endroits, pour une raison** : la liste des dossiers filtre côté
    SERVEUR (le décompte affiché doit rester celui de l'office, pas celui de la page
    chargée) ; les pièces d'un dossier filtrent côté CLIENT (`useDataroomTree` a déjà
    chargé toute l'arborescence, un aller-retour par case cochée n'ajouterait qu'un délai).
    La barre de recherche de la liste, elle, cherche aussi dans les **noms de tags** :
    taper « vente » doit ramener les dossiers tagués Vente, pas seulement ceux qui portent
    le mot dans leur intitulé.
  - **Décompte sous le tableau** : sous filtre par tag, on n'annonce plus « x sur y » — le
    total de l'office n'est plus connu du client, et l'annoncer serait inventer un chiffre.
  - **Correction au passage dans `scripts/check-design-system.mjs`** : la règle
    `composant-recopie` cherchait `\btag\b`, qui matche aussi `tag-menu`, `tag-dot`,
    `tag-list`… Un `\b` s'arrête au tiret ; passé en `\btag(?![\w-])`, sans quoi 21 faux
    positifs poussaient à ajouter des exemptions plutôt qu'à lire la sortie.
  - **`seed_office_content`** pose maintenant un catalogue de six tags et tague le contenu
    de démonstration. Le catalogue est créé même quand le contenu existe déjà : sans lui,
    le menu « Tags » s'ouvre vide et la fonctionnalité passe pour absente.
  - **Vérifications** : `python manage.py test` — 126 tests OK, dont 21 nouveaux
    (`TagValidatorTests`, `TagRouterTests`, `TagApiTests` : repliage du slug, dédup à la
    création, usage cumulé dossiers+pièces, droits admin, refus du renommage en doublon,
    suppression qui retire le tag partout, OU du filtre, filtre illisible, id inconnu,
    aller-retour sur une pièce, création de dossier avec tags, non-membre refusé).
    `npm run lint` (0 erreur), `tsc -b` (0 erreur), `vite build` OK, `npm run check:ds`
    (0 écart nouveau). **Non vérifié en navigateur** — la session de travail n'avait pas
    accès au serveur de dev de cette machine ; le parcours à refaire à la main est :
    créer un tag depuis la colonne « Tags » d'un dossier, le retrouver dans le menu de
    filtre, filtrer, taguer une pièce, vérifier que le tag survit à un changement de
    rubrique.
  - **Reste à faire** : lancer `python manage.py migrate_all_tenants` (nouvelle
    migration `0008_tag` à appliquer à CHAQUE base d'office) avant toute démo.

- **✅ Fait le 01/09/2026 — recherche par tag dans la palette globale (⌘K)** :
  - **Le manque** : les tags n'étaient cherchables que par la barre de la liste des
    dossiers. Depuis la palette globale, taper « prioritaire » ne ramenait rien — la
    fonctionnalité paraissait absente à qui n'ouvre pas le menu « Tags ».
  - **`GET /api/search/`** fait maintenant DEUX passages : les noms d'abord (inchangé),
    puis les tags — `Dataroom` et `Document` uniquement, un `Folder` et une personne
    n'en portant pas. Même règle de correspondance (début de mot, `_name_starts_with`),
    et **rigoureusement les mêmes helpers d'accès** (`_level_visible`,
    `_user_can_access`) : un tag ne doit pas devenir un chemin de traverse vers une
    pièce restreinte.
  - **Pourquoi deux passages et non un `OR`** : chaque résultat porte désormais
    `matched_tag` (le tag qui l'a fait remonter, `null` sur une correspondance par nom).
    Avec un `OR`, la provenance serait indiscernable, et la palette afficherait un nom
    où la frappe est introuvable — un résultat qui a l'air arbitraire. Les
    `exclude(name__iregex=...)` du second passage garantissent qu'un élément ne remonte
    jamais deux fois, le nom l'emportant même quand il a été coupé par la limite.
  - **Limite par type propre au passage par tag**, non partagée avec celui par nom : une
    étude qui étiquette large ne doit pas chasser de la palette les éléments dont c'est
    le nom même qui correspond.
  - **Front** : la ligne de résultat affiche la pastille du tag (composant `Tag` du
    design system, pas une classe maison — les couleurs vivent sur `.tag.tag-<clé>`), et
    c'est ELLE qui porte le surlignage, la frappe étant absente du nom. Surlignage
    repassé en `currentColor` + soulignement dans ce contexte : le violet de `.hl` est
    illisible sur un fond de tag rouge ou vert. Placeholders de la palette et de la
    topbar mis à jour (« …, un tag, … »).
  - **Vérifications** : `python manage.py test datarooms` — 132 tests OK, dont 6 nouveaux
    dans `SearchApiTests` (un tag trouve ce qui le porte quand le nom ne dit rien ; une
    correspondance par nom ne porte pas de justification ; nom + tag = un seul résultat ;
    un tag n'ouvre aucun contournement d'`AccessRestriction`, avec contre-épreuve sur
    l'utilisateur autorisé ; correspondance début de mot ; le tag d'un dossier ne remonte
    pas son contenu). `tsc -b` et `npm run lint` (0 erreur). **Non vérifié en
    navigateur** — parcours à refaire à la main : ⌘K puis « prioritaire » (doit ramener
    « Vente Guerin - 8 avenue Foch », dont le nom ne contient pas le mot, avec la
    pastille « Prioritaire »), puis « signé » (deux pièces, par leur tag), puis « vente »
    (le même dossier remonte par son NOM, donc sans pastille).

- **✅ Fait le 02/09/2026 — sous-domaine dédié `hyperadmin.localhost`** :
  l'interface hyperadmin (entrée du 01/09/2026 ci-dessus) gagne son propre
  sous-domaine, distinct de `/admin/` Django (déjà pris) et des sous-domaines
  d'office — nommé `hyperadmin.localhost` et non `admin.localhost`
  précisément pour éviter la confusion avec `/admin/`.
  - **`Office.RESERVED_SUBDOMAINS = {"hyperadmin"}`** (`models.py`), vérifié
    dans `Office.clean()` — appelé par `full_clean()` aussi bien depuis
    `hyperadmin_offices_view` (déjà en place) que depuis `/admin/` Django
    (comportement `ModelForm` standard) : aucun des deux points de création
    d'un `Office` ne peut créer la collision. Pas de migration (validation
    Python pure, aucun changement de schéma).
  - **`TenantResolutionMiddleware`** reconnaît désormais ce sous-domaine
    explicitement (`request.hyperadmin_host`, toujours posé comme
    `request.office`) AVANT toute tentative de résolution d'`Office` — un hôte
    connu et légitime, pas une erreur, mais qui ne résout jamais d'office
    (`request.office` y reste `None`, comme pour un Host inconnu).
  - **`login_view` ne fonctionnait PAS tel quel sur ce sous-domaine** : elle
    exigeait inconditionnellement `request.office is not None` (404 sinon)
    avant même de regarder qui se connecte. Un seul branchement ajouté (pas
    une nouvelle vue) : sur `request.hyperadmin_host`, seul `_is_hyperadmin`
    compte (`403 "réservé aux hyperadmins Notantis"` sinon, avant même de
    poser `session['mfa_user_id']` — même principe que le correctif de faille
    du 01/09/2026). `mfa_setup`/`mfa_verify`/`logout_view`/`whoami` sont
    restés inchangés : déjà host-agnostiques (aucun ne lit `request.office`),
    donc le reste du flux MFA fonctionne sans modification une fois la porte
    d'entrée corrigée.
  - **`GET /api/hyperadmin/modules/`** (nouveau, même gate `_is_hyperadmin`
    que les deux vues hyperadmin existantes) : catalogue COMPLET des `Module`
    (slug/name/description), pas seulement ceux activés pour un office précis
    (`_serialize_office` ne portait que des slugs) — nécessaire pour que
    l'écran de gestion des modules propose de vraies cases à cocher plutôt que
    de faire taper des slugs à la main.
  - **Décision : pas de restriction d'hôte sur `/api/hyperadmin/...`** — les
    trois vues restent gatées par `_is_hyperadmin(request.user)` seul,
    indépendamment de `request.hyperadmin_host` : un hyperadmin peut toujours
    les appeler depuis un sous-domaine d'office (rétrocompatible). Le nouveau
    sous-domaine devient le lieu où vit l'UI et où la CONNEXION est
    désormais gatée, pas une restriction supplémentaire sur les endpoints.
  - **Certificat mkcert régénéré EN PLACE** (`-cert-file`/`-key-file`
    explicites, pour ne pas renommer `localhost+5.pem`/`localhost+5-key.pem`
    et donc n'avoir à toucher ni `vite.config.ts` ni `dev.ps1`) :
    ```
    mkcert -cert-file localhost+5.pem -key-file localhost+5-key.pem \
      localhost "*.localhost" officea.localhost officeb.localhost \
      hyperadmin.localhost 127.0.0.1 ::1
    ```
    Vérifié par `openssl x509 -noout -text` : le SAN liste bien
    `hyperadmin.localhost` en plus des noms existants.
  - **`CORS_ALLOWED_ORIGIN_REGEXES`/`CSRF_TRUSTED_ORIGINS`/`ALLOWED_HOSTS`
    n'ont PAS eu besoin d'être modifiés** — contrairement à ce qui avait été
    demandé au départ. Les trois sont déjà des wildcards génériques sur
    `*.localhost` (pas une liste de sous-domaines d'office énumérés), donc
    `hyperadmin.localhost` était déjà couvert. Confirmé en Chrome réel (aucune
    erreur CORS/CSRF, TLS accepté sans avertissement) plutôt que supposé.
  - **Frontend** : `main.tsx` court-circuite le branchement `?view=` existant
    quand `window.location.hostname === 'hyperadmin.localhost'` et rend
    `hyperadmin/HyperadminApp.tsx` — une racine séparée, même statut
    architectural que `V1AppView`/`PrototypeDemo`, PAS l'`AppShell` des
    offices (pas de sélecteur d'office, pas de thème, pas de navigation par
    module — rien de tout ça n'a de sens pour un rôle transverse). Réutilise
    `useSession()` tel quel (`LoginScreen`/`MfaScreen` inchangés,
    `myOffices`/`tenantConfig` déjà avalés en `.catch(() => [] / null)`) et un
    header bespoke minimal (marque, nom d'utilisateur, déconnexion).
    `hooks/useHyperadminOffices.ts` (même patron que `useOfficeUsers.ts`,
    **avec le même garde-fou `enabled`** — piège rencontré en vérification :
    sans lui, le hook se déclenche au montage AVANT que la session ne soit
    authentifiée, essuie un 401 pendant l'écran de connexion/MFA, et ne se
    relance jamais une fois connecté puisque rien ne dépendait de
    `authenticated`), `components/pages/HyperadminOfficesScreen.tsx` (même
    patron que `OfficeUsersScreen.tsx` : `TableCard`/`ListControls`/
    `useListPaging`/`TablePager`), `organisms/NewOfficeModal.tsx` (création
    office + admin, bascule create/attach comme `OfficeUserModal`) et
    `organisms/OfficeModulesModal.tsx` (cases à cocher à partir du catalogue).
  - **`dev.ps1`** affiche désormais l'URL `hyperadmin.localhost` et le compte
    `hyperadmin` dans son résumé de démarrage.
  - **Tests** (`backend/datarooms/tests.py`) : 6 nouveaux —
    `TenantResolutionMiddlewareTests` gagne 2 tests (hôte hyperadmin jamais
    résolu en office, hôte d'office met bien `hyperadmin_host` à `False`) ;
    `MfaLoginFlowTests` gagne 2 tests (connexion hyperadmin réussie sur ce
    host, connexion non-hyperadmin refusée AVANT toute session MFA en
    attente) ; `HyperadminTests` gagne 2 tests (création d'office avec
    `subdomain: "hyperadmin"` refusée, catalogue de modules gaté et complet).
    Suite complète : **153/153 tests verts** (147 existants + 6 nouveaux).
  - **Vérifié en Chrome réel** (pas seulement `curl`) : connexion `hyperadmin`
    (mot de passe + TOTP, dispositif déjà confirmé dans cet environnement) →
    shell hyperadmin distinct de l'`AppShell` des offices ; création d'un
    office de test (« Office C », mode `create`) → apparaît aussitôt dans la
    liste, base tenant provisionnée ; gestion des modules (case à cocher
    ConfianceRIB) → reflétée immédiatement dans la colonne Modules ;
    désactivation → pastille « Désactivé », et confirmé en `curl` qu'une
    connexion sur ce sous-domaine devenu inactif répond exactement
    `404 "sous-domaine d'office non résolu"`, comme un sous-domaine jamais
    enregistré ; `alice` (admin d'office, pas hyperadmin) → message
    « réservé aux hyperadmins Notantis » affiché à l'écran, pas de crash, pas
    de 404 générique. Office de test nettoyé après vérification (office,
    admin, base tenant supprimés).

- **✅ Fait le 02/09/2026 — Templates câblés au frontend** : le système
  `Template`/`TemplateFolder` existait côté backend depuis le 01/09/2026
  (`/api/templates/...`, voir entrée dédiée plus haut) mais aucun écran ne le
  consommait — deux systèmes de templates coexistaient silencieusement :
  `NEW_DATAROOM_TEMPLATES` (`data/demo.tsx`, trois entrées factices sans
  équivalent en base) alimentait le sélecteur de `NewDataroomModal`, et le
  `templateId` choisi n'était de toute façon jamais transmis à la création.
  - **`NewDataroomModal` corrigée** : son prop `templates` attend désormais de
    vrais `TemplateSummary` (`GET /api/templates/`, via `useTemplates`), pas
    `NEW_DATAROOM_TEMPLATES` — supprimée de `data/demo.tsx`, devenue sans
    appelant réel. `onCreate` transmet maintenant `templateId: number | null`
    (`null` = « Dataroom vide », option toujours proposée en tête de liste,
    ajoutée par le composant lui-même plutôt que par le jeu de démo — un
    office sans aucun modèle garde donc une modale utilisable). `PrototypeDemo.tsx`
    et `uikit/organisms.tsx` (les deux seules autres consommatrices,
    entièrement hors backend — voir `main.tsx`, "Seule v1-app parle au
    backend") gardent leur propre petit tableau local (`DEMO_TEMPLATE_OPTIONS`,
    2 entrées, forme `NewDataroomTemplateOption`) : ce ne sont pas des écrans
    connectés, retirer `NEW_DATAROOM_TEMPLATES` de `data/demo.tsx` ne les
    prive donc de rien qu'un jeu de données local ne remplace.
  - **8 nouvelles fonctions dans `api/endpoints.ts`** (les 4 groupes de routes
    déjà exposées côté Django) : `listTemplates`/`createTemplate`/
    `updateTemplate`/`deleteTemplate`, `listTemplateFolderLevel`/
    `createTemplateFolder`/`updateTemplateFolder`/`deleteTemplateFolder`. Types
    `TemplateSummary`/`TemplateFolderSummary`/`TemplateFolderLevel`, même
    forme que leurs pendants `Dataroom`/`Folder` déjà en place.
    `createDataroom` gagne un troisième paramètre `templateId?: number | null`
    (`template_id` dans le corps, omis si absent — `JSON.stringify` élimine
    déjà les clés `undefined`, pas de logique supplémentaire nécessaire).
  - **Deux nouveaux hooks** : `hooks/useTemplates.ts` (liste + CRUD, même
    patron que `useOfficeUsers.ts`) et `hooks/useTemplateTree.ts` (assemblage
    récursif de l'arborescence, même patron que `useDataroomTree` — mais SANS
    nœud racine synthétique : contrairement à une dataroom réelle, un
    `Template` n'a pas de documents à la racine à porter, donc rien à
    accrocher à un `ROOT_NODE_ID`). `useTemplates` alimente à la fois l'écran
    de gestion ET le sélecteur de `NewDataroomModal` (`enabled` inclut
    `modalOpen` dans `App.tsx`).
  - **Nouvel écran `TemplatesListScreen`** (liste, même patron que
    `OfficeUsersScreen` : barre d'outils, « afficher N », tableau, pagination)
    → **`TemplateDetailScreen`** (arborescence, `Explorer` réutilisé tel quel
    — organisme déjà générique, aucune modification nécessaire — avec un
    panneau latéral bien plus simple que celui de `DataroomDetailScreen` :
    pas de documents, pas d'onglets Q&R/Membres/Historique, aucun de ces
    concepts n'existant pour un `Template`). Sélectionner un dossier permet de
    le renommer, de régler les rôles qui le verront par défaut une fois le
    modèle appliqué (cases à cocher `OFFICE_ROLES`/`roleLabel`, réutilisés
    tels quels depuis `organisms/officeRoles.ts`), et de le supprimer. Deux
    nouvelles modales, mêmes patrons que leurs équivalents dataroom :
    `NewTemplateModal` (create/edit, mêmes libellés/mode que `OfficeUserModal`
    create/attach) et `NewTemplateFolderModal` (copie conforme de
    `NewFolderModal`, sans réglage de rôle à la création — les rôles se
    règlent après coup, une fois le dossier sélectionné dans l'arborescence).
  - **Nouvelle entrée de nav** `{ key: 'templates', icon: 'clip', label:
    'Modèles de dossier' }` dans la section « Office » de `NAV_SECTIONS`, même
    principe que « Annuaire de l'étude » : visible à tout le monde, c'est le
    serveur qui répond 403 aux non-administrateurs (`_manager_role`, déjà en
    place côté backend), l'écran qui l'explique plutôt qu'une entrée qui
    disparaît sans dire pourquoi.
  - **Écart noté ce jour-là, résolu le 02/09/2026** : `ModulesTab`
    (Personnalisation) affichait déjà une section « Modèles de dataroom »
    séparée, alimentée par `DATAROOM_TEMPLATES` (`data/demo.tsx`, données
    figées, DISTINCT de `NEW_DATAROOM_TEMPLATES` retiré ci-dessus) — doublon
    avec le nouvel écran réel. Recreusé et corrigé le jour même (voir "État
    réel du code", 02/09/2026) : `DATAROOM_TEMPLATES` recréé en vrais
    `Template`/`TemplateFolder` (`seed_templates`), section retirée de
    `ModulesTab`, remplacée par un onglet « Template » dédié dans
    Personnalisation.
  - **Vérifié en Chrome réel** (connexion `carla`, superadmin sur
    `officea.localhost`) : création d'un modèle à 2 niveaux (`Pieces
  identite` > `Confidentiel`, `visible_to_roles` réglé sur `Confidentiel` en
    cochant Superadmin + Administrateur — confirmé aussi par inspection
    directe de la base tenant : `TemplateFolder` 4 avec `roles=
    ['superadmin', 'admin']`) ; création d'une dataroom depuis ce modèle via
    `NewDataroomModal` → arborescence reproduite à l'identique en vrais
    `Folder` ; panneau « Accès du sous-dossier » sur `Confidentiel` confirme
    « Restreint à 2 utilisateur(s) », `alice` (admin) et `carla` (superadmin)
    cochées, `bob`/`daniel` (membres) non cochés — résolution des rôles en
    comptes réels de l'office exactement conforme à `_apply_template`.
    Suppression du modèle testée via l'écran (`ConfirmModal`, bouton
    destructif) : disparaît de la liste, la dataroom déjà créée à partir de
    lui n'est pas affectée (comportement backend déjà couvert par
    `DataroomTemplateTests`, reconfirmé ici côté UI). Données de test
    nettoyées après vérification (modèle supprimé via l'écran, dataroom
    supprimée en shell Django — aucune UI de suppression de dataroom
    n'existe dans cette app, hors périmètre de ce chantier).
  - **Vérifications automatisées** : `tsc -b` et `npm run check:ds` (184
    fichiers, aucun écart nouveau) sans erreur ; `npm run lint` (0 erreur,
    2 nouveaux avertissements `react/set-state-in-effect` sur
    `TemplateDetailScreen.tsx`, même famille déjà tolérée ailleurs — ex.
    `DataroomDetailScreen.tsx:185` — pour resynchroniser un état local
    depuis une prop qui change). `python manage.py test` (153/153, aucun
    changement backend dans ce chantier).

- **✅ Fait le 02/09/2026 — création de dataroom élargie au rôle "membre"** :
  `POST /api/datarooms/` était réservé admin/superadmin depuis le chantier
  Templates (01/09/2026) — élargi pour inclure aussi "membre" ; "client" reste
  seul rôle exclu. **Changement volontairement limité à ce seul endpoint** :
  la création de dossier et l'upload dans une dataroom existante
  (`folders_view`/`documents_view`) sont gatés par `_user_can_access`, pas par
  un rang de rôle, et n'ont donc jamais été concernés par ce gate — inchangés.
  La gestion des Templates, des utilisateurs et des restrictions d'accès
  reste réservée admin/superadmin (`_manager_role`, inchangée) ; un test
  dédié (`test_manager_role_endpoints_unaffected_by_dataroom_creation_change`)
  vérifie explicitement qu'un membre — désormais autorisé à créer une
  dataroom — reste refusé sur `POST /api/templates/`.
  - **`_can_create_dataroom(user, office)`** (`views.py`, nouvelle fonction,
    à côté de `_manager_role`) : seuil exprimé via `OfficeMembership.
    ROLE_RANK["membre"]` plutôt qu'une liste de rôles en dur ou un nouveau
    gate séparé — réutilise la même logique de rang que
    `_roles_at_or_below`/`_validate_role_for_caller`, comme demandé.
    `_manager_role` elle-même n'a pas bougé : les deux fonctions coexistent,
    chacune gate un périmètre différent (création de dataroom vs. tout le
    reste de la gestion d'office).
  - Message d'erreur du POST changé de "réservé aux administrateurs de cet
    office" à "réservé aux membres de cet office" — reflète le nouveau
    périmètre plutôt que de laisser un message obsolète après l'élargissement.
  - **⚠️ Périmètre non figé** : ce seuil ("membre" inclus, "client" exclu) est
    la première itération demandée explicitement par l'utilisateur, mais
    reste susceptible d'évoluer selon les retours à venir (par exemple, ouvrir
    aussi aux clients pour un usage self-service, ou au contraire resserrer à
    nouveau) — ne pas supposer ce seuil définitif dans un chantier futur sans
    revérifier ici.
  - **Tests** (`DataroomTemplateTests`, `datarooms/tests.py`) :
    `test_non_manager_cannot_create_dataroom` renommé
    `test_client_cannot_create_dataroom_membre_can` et son contenu changé pour
    refléter le nouveau comportement (`membre` → `201`, `client` → `403` avec
    le nouveau message, `admin` → `201` inchangé) ; nouveau test
    `test_manager_role_endpoints_unaffected_by_dataroom_creation_change`
    (ci-dessus). Suite complète : **154/154 tests verts** (153 existants,
    1 renommé/modifié, 1 nouveau).
  - Pas de changement frontend : `DataroomsListScreen`/`NewDataroomModal`
    n'ont jamais gaté le bouton « Nouveau dossier » par rôle (c'est déjà le
    serveur qui tranche) — un membre qui pouvait déjà ouvrir la modale peut
    désormais aussi la valider avec succès, sans changement d'écran
    nécessaire.

- **✅ Fait le 02/09/2026 — la déconnexion ferme TOUTES les études ouvertes**
  (changement de comportement, même bouton et même endpoint — pas de second
  bouton) : jusqu'ici, `POST /api/logout/` n'appelait que `logout(request)`,
  qui ne vide que `request.session` — la session de l'office COURANT
  seulement, chaque office ayant son propre cookie (voir "Architecture
  multi-tenant"). Un utilisateur ouvert sur plusieurs offices restait donc
  connecté partout ailleurs après s'être « déconnecté ».
  - **`logout_view`** (`views.py`) parcourt désormais
    `django.contrib.sessions.models.Session` (base `default`, PARTAGÉE —
    `tenancy/router.py::SHARED_APPS` — donc déjà visible depuis n'importe
    quel office) et supprime toute ligne dont `_auth_user_id` décodé
    correspond à l'utilisateur courant, AVANT d'appeler `logout(request)`
    (qui reste inchangé, `flush()` sur une session déjà supprimée ne lève
    rien). `_auth_user_id` n'est pas en clair dans la ligne (donnée
    signée/sérialisée) : décoder chaque session est la seule façon de savoir
    à qui elle appartient, pas de requête ORM directe possible. Sessions
    déjà expirées ignorées (inutilisables de toute façon).
  - **Message de confirmation corrigé** (`App.tsx`, `ConfirmModal` de
    déconnexion) : disait auparavant l'inverse de ce qui se passe désormais
    (« Vos autres études restent ouvertes ») — reformulé en avertissement
    explicite (« Cette déconnexion ferme TOUTES vos études ouvertes, pas
    seulement *<office courant>* »), avec une précision supplémentaire quand
    l'utilisateur a plus d'un office (« un onglet resté ouvert sur un autre
    office vous renverra à l'écran de connexion dès son prochain appel au
    serveur »).
  - **Onglet resté ouvert sur un autre office — corrigé un vrai angle mort,
    pas seulement vérifié** : un onglet déjà authentifié qui ne rappelle pas
    `/api/whoami/` (donc qui ne repasse jamais par le `catch` 401/403 déjà
    présent dans `useSession.load`, lui seulement exécuté au montage) restait
    auparavant bloqué sur l'erreur locale du premier appel API échoué après
    une déconnexion ailleurs, sans jamais revenir à l'écran de connexion.
    Corrigé par un événement global : `apiFetch`/`apiFetchBlob`
    (`api/client.ts`) émettent `AUTH_EXPIRED_EVENT` sur toute réponse qui
    révèle une session morte, et `useSession.ts` l'écoute pour repasser
    directement en `anonymous`, quel que soit le hook qui a déclenché l'appel
    et quel que soit l'écran affiché.
    **Détection non triviale, vérifiée empiriquement plutôt que supposée** :
    ce backend répond **403**, jamais 401, à un appel sans session valide —
    DRF lève bien `NotAuthenticated` (401 par défaut) quand `IsAuthenticated`
    échoue, mais `APIView.handle_exception` le rétrograde en 403 faute d'un
    en-tête `WWW-Authenticate` (absent : `SessionAuthentication` seule est
    configurée, `settings.REST_FRAMEWORK`). Ce même code 403 est aussi celui
    de tous les refus métier volontaires (`_manager_role`/`_is_hyperadmin`/
    `_can_create_dataroom`...), qu'il ne faut SURTOUT PAS confondre avec une
    session morte — décider en déconnectant l'app entière serait une
    régression bien pire que le bug corrigé. Distinction retenue : la FORME
    du corps de réponse, pas seulement le code — DRF sérialise ses propres
    exceptions en `{"detail": "..."}`, alors que toutes les vues de ce projet
    répondent leurs refus métier à la main en `{"error": "..."}` (jamais
    `detail`) ; un 403 avec `detail` et sans `error` ne peut donc venir que de
    DRF, c'est-à-dire d'une session absente. 401 reste géré en plus par
    prudence (jamais observé ici en pratique).
  - **Tests** : `MfaLoginFlowTests.test_logout_invalidates_sessions_on_all_offices`
    (nouveau) — deux `Client()` Django INDÉPENDANTS (un seul `Client` ne peut
    pas porter deux sessions à la fois, chaque office ayant son propre cookie)
    ouvrent chacun une vraie session MFA sur un office différent pour le même
    utilisateur ; déconnexion via UN SEUL des deux ; vérifié que les DEUX
    lignes `Session` ont disparu (pas seulement celle de l'onglet qui a
    demandé la déconnexion), et que le prochain appel de l'autre onglet
    répond bien `403` avec `detail` (pas `error`) — la forme exacte que
    `AUTH_EXPIRED_EVENT` détecte côté front. Piège rencontré : django-otp
    refuse de revérifier le MÊME code TOTP deux fois pour un même dispositif
    (anti-rejeu, `verify_token` exige un compteur strictement supérieur à
    `device.last_t`) — contourné en réinitialisant `last_t` entre les deux
    connexions, comme le throttle anti-bruteforce l'est déjà ailleurs dans ce
    fichier. Suite complète : **155/155 tests verts**.
  - **Vérifié en Chrome réel, pas seulement en tests/curl** : `carla`
    connectée simultanément sur `officea` (onglet A) et `officeb` (onglet B,
    deux vraies sessions MFA) ; déconnexion depuis l'onglet A → modale avec
    le nouveau texte (confirmé la clause supplémentaire "un onglet resté
    ouvert..." présente pour un compte multi-offices) → redirection immédiate
    vers l'écran de connexion sur A ; sur B, un simple clic de navigation
    réutilisant des données déjà en cache (« Dossiers ») ne déclenche PAS de
    nouvel appel réseau et ne prouve donc rien — un clic vers un écran encore
    jamais visité cette session (« Annuaire de l'étude », déclenche
    `useOfficeUsers` pour la première fois) force un VRAI appel réseau, qui
    échoue en 403 et fait immédiatement retomber l'onglet B sur l'écran de
    connexion, sans rechargement de page.

- **✅ Fait le 02/09/2026 — Templates déplacés dans Personnalisation, maquette
  figée remplacée par de vrais modèles** : trois changements liés.
  - **Onglet « Modules & modèles » renommé « Modules »** (`SettingsScreen.tsx`)
    — la partie « modèles » qu'il montrait (`ModulesTab`, section « Modèles de
    dataroom » alimentée par `DATAROOM_TEMPLATES`, une maquette figée sans
    équivalent en base) a disparu de cet onglet : `ModulesTabProps` perd
    `templates`/`onCreateTemplate`/`onOpenTemplateMenu`, ce composant ne
    connaît plus du tout la notion de modèle.
  - **`DATAROOM_TEMPLATES` retiré**, mais seulement après avoir recréé son
    contenu en vraies données : nouvelle commande `seed_templates`
    (`backend/datarooms/management/commands/seed_templates.py`, même patron
    que `seed_demo` — idempotent via `get_or_create`, hardcodée sur
    officea/officeb, pas de `--office` comme `seed_office_content`) crée deux
    `Template` par office, avec les mêmes intitulés que la maquette :
    - « Vente immobilière — standard » (« 14 rubriques · diagnostics,
      urbanisme, fiscalité… ») — la description de la maquette ne détaillait
      pas la structure des 14 rubriques ; retrouvée dans l'Annexe A de
      `EN_vision_AMOA_MVP_v0.5_fusionne.md` (arborescence de dataroom réelle
      anonymisée, citée là-bas comme illustration du besoin de "templates
      d'arborescence", §4.6) — exactement 14 catégories de premier niveau, ce
      qui confirme la source. Un seul niveau de sous-dossiers repris de cette
      annexe (63 `TemplateFolder` au total par office), pas les
      sous-sous-dossiers ni les documents individuels de l'exemple, hors de
      portée d'un `TemplateFolder`.
    - « Dossier de divorce » (« Groupes Conjoint 1 / Conjoint 2 /
      Magistrats ») — trois dossiers racine, rien de plus : la maquette ne
      suggérait pas de sous-structure, aucune inventée.
    Une fois vérifié (voir plus bas), `DATAROOM_TEMPLATES` a été retiré de
    `data/demo.tsx`, ainsi que tout le code qui le consommait ENCORE dans le
    vrai flux applicatif (App.tsx : la ligne `modules={{..., templates:
    DATAROOM_TEMPLATES}}` passée à `SettingsScreen`, et une entrée fictive
    « Modèles / <nom> » dans les résultats simulés de la palette ⌘K, qui
    ouvrait la modale de création sans jamais mener à un vrai écran de
    gestion). `PrototypeDemo.tsx`/`uikit/organisms.tsx`/`uikit/UiKit.tsx`/
    `v1/V1AppView.tsx`/`v1/V1Preview.tsx` (maquettes hors backend) ont perdu
    la même prop, sans backend à brancher derrière — `SettingsScreen.
    templatesTab` y est simplement absent, affichant un message de repli
    plutôt qu'un écran vide. `DataroomTemplate` (interface de
    `TemplateOption.tsx`, qui ne typait plus que `DATAROOM_TEMPLATES`) retirée
    avec elle ; `TemplateOption` (le composant lui-même) reste, toujours
    utilisé par `NewDataroomModal`.
  - **Nouvel onglet « Template »** (`SettingsScreen.tsx`, 4ᵉ onglet) —
    accueille `TemplatesListScreen`/`TemplateDetailScreen`, déplacés depuis
    l'ancienne entrée de navigation top-level « Modèles de dossier »
    (`NAV_SECTIONS`, retirée). Toute la logique (hooks `useTemplates`/
    `useTemplateTree`, état local, modales) reste dans `App.tsx`, inchangée
    dans le fond — seul son point d'accroche change : un nouveau prop
    `SettingsScreen.templatesTab` (`ReactNode`, optionnel) reçoit le JSX déjà
    construit (liste ou détail, selon `openTemplateId`), calculé
    inconditionnellement plutôt que gaté par `screen` — `SettingsScreen`
    décide seule, via son onglet actif interne, quand l'afficher, exactement
    comme `modules`/`identity` déjà toujours calculés pour tout l'écran
    Personnalisation. `onOpen`/`onBackToList` ne touchent plus `screen`
    (`setScreen('template')`/`navigate('templates')` supprimés) : seul
    `openTemplateId` bascule entre liste et détail désormais.
    `TemplatesListScreen`/`TemplateDetailScreen` ont perdu leur wrapper
    `<Screen>` (devenu redondant, ce sont des onglets maintenant, pas des
    écrans top-level — même sans lui, `SubscreenPanel` gère déjà l'affichage/
    masquage).
  - **⚠️ Bug latent trouvé et corrigé en vérifiant** (pas seulement observé) :
    `useTemplateTree`/`useDataroomTree` ne remettaient `loading` à `true`
    qu'à l'initialisation du hook, jamais quand `templateId`/`dataroomId`
    passait de `null` à un id (ou d'un id à un autre) sur un re-rendu — ce qui
    est justement le cas normal ici (`App.tsx` ne remonte jamais, seul
    `openTemplateId`/`openDataroomId` change). Le temps de la marche
    récursive de l'arborescence (un aller-retour réseau par niveau), l'écran
    affichait donc à tort « Ce modèle n'a encore aucun dossier », avant de se
    corriger seul une fois la marche terminée — invisible sur un petit arbre
    (quelques dossiers, quelques centaines de ms), flagrant sur « Vente
    immobilière — standard » (14 rubriques, 64 requêtes en cascade). Corrigé
    dans les deux hooks : l'effet qui déclenche `load()` pose `loading: true`
    AVANT de lancer la marche (et réinitialise proprement l'état à `id ===
    null`), `refresh()` fait de même. `useDataroomTree` n'était pas dans le
    périmètre demandé par ce chantier, mais partage EXACTEMENT le même bug —
    resté invisible jusqu'ici faute d'une dataroom assez large pour
    l'exposer ; une dataroom créée depuis le nouveau modèle "Vente
    immobilière" (14 dossiers racine) l'aurait immédiatement révélé au premier
    utilisateur qui l'ouvre, corrigé par la même occasion plutôt que laissé
    en l'état.
  - **Vérifié en Chrome réel** (`carla`, superadmin sur `officea.localhost`) :
    plus d'entrée « Modèles de dossier » dans le menu top-level ; Personnalisation
    affiche bien Identité/Apparence/Modules/Template ; onglet Modules sans
    section modèles ; onglet Template — les trois modèles de l'office
    (« Dossier de divorce », « Vente immobilière — standard », et un
    « Test » préexistant sans rapport avec ce chantier) listés avec les bons
    intitulés/descriptions ; ouverture de « Vente immobilière — standard »
    reproduit bien les 14 rubriques avec leurs sous-dossiers (vérifié en
    dépliant plusieurs branches, dont Diagnostics → ses 7 sous-dossiers) ;
    création d'une dataroom depuis ce modèle via `NewDataroomModal` (les 3
    vrais modèles + « Dataroom vide » proposés) → arborescence intégralement
    reproduite en vrais `Folder` dans la dataroom obtenue. Données de test
    nettoyées après vérification (dataroom supprimée en shell Django).
  - **Vérifications automatisées** : `tsc -b`, `npm run check:ds` (184
    fichiers, aucun écart nouveau), `npm run lint` (0 erreur, aucun nouvel
    avertissement). `python manage.py test` — **155/155 tests verts**, aucun
    changement de test nécessaire (le chantier ne touche aucun comportement
    backend testé, `seed_templates` est une commande de données de démo, pas
    une vue).

- **✅ Fait le 03/09/2026 — droits d'accès unifiés (rôle OU utilisateur nommé),
  bypass superadmin, refonte du tableau de droits, bug de chevron corrigé** :
  chantier en 8 points, planifié puis implémenté en mode plan (voir la
  demande utilisateur, non reproduite ici — le détail ci-dessous couvre tout
  le périmètre livré).
  - **Bug d'affichage corrigé — `Explorer.tsx`** : le chevron d'expansion
    dépendait de `depth > 0 || !hasChildren` (`style={{visibility:'hidden'}}`
    dès le premier niveau imbriqué, quel que soit le nombre d'enfants) — un
    dossier à 2 niveaux ou plus n'affichait donc JAMAIS son chevron au-delà
    de la racine. Corrigé en ne dépendant plus que de `hasChildren`. Resté
    invisible jusqu'ici : aucun template/dataroom de démo n'avait de
    sous-sous-dossier avant ce chantier. Vérifié en créant un dossier de test
    à 3 niveaux (`Diagnostics > Amiante > Test chevron 3 niveaux`) dans le
    modèle "Vente immobilière — standard" : chevron bien présent sur
    `Amiante` (dossier intermédiaire, jusque-là toujours masqué), absent sur
    la feuille — nettoyé après vérification.
  - **Superadmin toujours ouvert — `_user_can_access`** (`views.py`) : un
    utilisateur dont le rôle pour l'office courant est `superadmin` a accès
    sans exception, retourné AVANT toute résolution de restriction
    (`_nearest_restriction` n'est pas appelée du tout dans ce cas) — aucune
    case ni colonne "Superadmin" nulle part dans l'UI, ce bypass n'est jamais
    un réglage visible. `_nearest_restriction`/`_level_visible`/
    `_subtree_has_accessible_content` n'ont pas été touchées : le bypass s'y
    propage automatiquement puisqu'elles appellent déjà `_user_can_access` en
    interne. Vérifié en Chrome réel (pas seulement en test) : restriction
    `allowed_roles: ["client"]` posée sur un dossier réel (`carla` explicitement
    absente de `user_ids` ET son rôle absent de `allowed_roles`) — `alice`
    (admin, non-superadmin) perd bien l'accès à ce dossier après rechargement,
    `carla` (superadmin) le garde.
  - **Modèle de données — double critère d'accès, en miroir sur les deux
    tables** : `AccessRestriction` (datarooms réelles) gagne `allowed_roles`
    (`JSONField`, liste parmi `admin`/`membre`/`client` — jamais
    `superadmin`, qui n'est pas un rôle listable mais un bypass systématique),
    en plus de `user_ids` déjà existant. `TemplateFolder.visible_to_roles` est
    RENOMMÉ `allowed_roles` (même sémantique, `RenameField` dans la migration
    pour préserver l'historique plutôt qu'un remove+add) et gagne un nouveau
    `user_ids` (`JSONField`) — les utilisateurs nommés deviennent une option
    pour les templates aussi, résolus contre les membres RÉELS de l'office au
    moment de la création de la dataroom (`_apply_template`, voir plus bas),
    même mécanique que la résolution de rôle déjà en place. Migration
    `0008_rename_visible_to_roles_templatefolder_allowed_roles_and_more.py`
    (dépendance sur `0007_tag_template_office_is_active_and_more`),
    `migrate_all_tenants` relancé.
  - **`_user_can_access`** (nouvelle logique complète) :
    ```python
    membership = user.memberships.filter(office=office).first()
    if membership is not None and membership.role == "superadmin":
        return True
    restriction = _nearest_restriction(dataroom, folder=folder, document=document)
    if restriction is not None:
        return user.id in restriction.user_ids or (
            membership is not None and membership.role in restriction.allowed_roles
        )
    return membership is not None and membership.role != "client"
    ```
    Accès si l'appelant figure dans `user_ids` OU si son rôle figure dans
    `allowed_roles` — les deux critères sont indépendants, ni l'un ni l'autre
    n'est requis pour que l'autre s'applique. Le cas "aucune restriction
    trouvée" (défaut par rôle du 01/09/2026) est inchangé.
  - **`_apply_template` simplifiée** : `allowed_roles` d'un `TemplateFolder`
    est copié TEL QUEL sur l'`AccessRestriction` du `Folder` réel obtenu — la
    résolution rôle→ids qui existait avant ce chantier a disparu, devenue
    inutile puisque `AccessRestriction` porte désormais `allowed_roles`
    nativement. Seul `user_ids` continue d'être "résolu" — en réalité
    re-filtré contre les `OfficeMembership` RÉELS de l'office au moment de
    l'application (même défense en profondeur que `_set_restriction`) : un id
    nommé au template mais dont l'utilisateur a quitté l'office entre-temps
    est silencieusement écarté, vérifié par test dédié
    (`test_apply_template_revalidates_user_ids_against_current_membership`).
  - **`_clean_access_roles`/`ACCESS_ROLES`** (`views.py`, nouvelle fonction,
    remplace l'ancienne `_clean_roles` qui n'avait qu'un seul usage avant ce
    chantier — devenue `_clean_access_roles` et restreinte à
    `{"admin", "membre", "client"}` au lieu de tout `OfficeMembership.
    ROLE_RANK` : `"superadmin"` envoyé explicitement par un client mal
    intentionné est silencieusement filtré, jamais accepté comme un rôle
    listable). Sert aux DEUX modèles désormais (`_set_restriction` pour
    `AccessRestriction`, `template_folders_view`/`template_folder_detail_view`
    pour `TemplateFolder`).
  - **`_set_restriction`/`_get_restriction_row`** étendues : portent
    désormais `allowed_roles` en plus de `user_ids`, avec le même invariant
    déjà en place — la ligne est supprimée plutôt que laissée dans un état
    "restreint à personne et à aucun rôle" quand LES DEUX listes sont vides
    après filtrage. `dataroom_access_view`/`folder_access_view`/
    `document_access_view` (POST) acceptent désormais `user_ids` ET
    `allowed_roles` ; GET/POST renvoient `{"user_ids": [...], "allowed_roles":
    [...]}` sur les trois endpoints. `access_restrictions_view` inclut
    `allowed_roles` dans chaque résultat.
  - **Nouvel endpoint — renommer un vrai dossier** : `PATCH
    /api/datarooms/<dataroom_id>/folders/<folder_id>/` (`folder_detail_view`,
    nouveau — aucun endpoint de renommage n'existait pour un `Folder` réel
    avant ce chantier, seulement pour un `TemplateFolder`). Même gate
    `_manager_role` que `folder_access_view`, même scoping 404 que
    `_resolve_folder` (un `folder_id` valide mais d'une AUTRE dataroom est
    404, pas 403). PATCH partiel, `name` uniquement — pas de `DELETE`,
    aucune suppression de dossier n'existe ailleurs dans cette API.
  - **Interface des droits d'accès — un seul composant réutilisé,
    `components/organisms/AccessRightsTable.tsx`** (nouveau) : un TABLEAU,
    pas un popup par élément, listant tous les dossiers/documents d'une
    dataroom (ou tous les dossiers d'un Template) sur un seul écran — trois
    colonnes de case Admin/Membre/Client (jamais Superadmin), un bouton
    "Tout cocher" par colonne, une cellule "utilisateurs nommés" par ligne
    (`<Select>` des membres pas déjà ajoutés à CETTE ligne + pills retirables,
    réutilisant l'atome `Tag` en mode `plain` plutôt qu'une nouvelle pastille
    — décision explicite du plan pour rester simple, pas d'auto-complétion
    avancée). Composant CONTRÔLÉ, aucun état réseau interne : les
    modifications restent locales jusqu'à un enregistrement explicite, pas de
    requête réseau à chaque case cochée.
  - **`hooks/useAccessRightsDraft.ts`** (nouveau) : hook générique de
    brouillon, `Record<rowId, {allowedRoles, userIds}>`, resynchronisé depuis
    `original` (paramètre du hook) via un effet — `original` DOIT être une
    référence stable côté appelant (`useMemo` keyed sur les données serveur
    réellement chargées), sans quoi chaque rendu écraserait le brouillon en
    cours d'édition. `setRow`, `dirtyRowIds` (diff avec `original`), `reset`.
    Utilisé deux fois dans `App.tsx` (une instance par écran, dataroom et
    template), chacune avec son propre `original` et sa propre logique de
    sauvegarde (`saveDataroomAccess`/`saveTemplateAccess`, un appel API par
    ligne modifiée, un seul rafraîchissement final).
  - **Menu "⋮" séparé, dédié au renommage** — `Explorer.tsx` gagne deux
    nouvelles props génériques : `onNodeMenu?: (id) => void` (icône "⋮" après
    le libellé, visible seulement si fourni, `stopPropagation`) et
    `renderNodeExtra?: (node) => ReactNode` (slot après le libellé, utilisé
    par l'éditeur de template pour les pastilles de rôle — voir plus bas).
    Nouveau `components/organisms/RenameFolderModal.tsx` (générique,
    `{open, currentName, error, onClose, onSubmit}`) — UNIQUEMENT le
    renommage, jamais les droits d'accès qui restent dans le tableau. Un
    seul popup, monté une fois hors des écrans dans `App.tsx` (comme le
    `ConfirmModal` de déconnexion), branché sur `PATCH .../folders/<id>/`
    (vraie dataroom) ou `PATCH /api/templates/<id>/folders/<id>/` (Template)
    selon la cible.
  - **`DataroomDetailScreen.tsx`** : les boutons "Accès du dossier"/"Accès du
    sous-dossier"/cadenas par document ont disparu, remplacés par
    `onRenameFolder` (câblé sur l'icône "⋮" de l'`Explorer`) et un nouveau
    prop `accessRightsTab` (`ReactNode`, le tableau déjà construit par
    l'appelant). L'onglet `sub-members` est renommé "Droits d'accès" (icône
    `lock`) ; son ancien contenu (tableau de membres factices,
    `MEMBERS`/`data/demo.tsx`) reste le CONTENU DE REPLI quand
    `accessRightsTab` est absent — utilisé par `PrototypeDemo.tsx`/
    `uikit/UiKit.tsx`, qui n'ont pas d'office réel derrière eux et n'ont
    jamais passé `onManageAccess` (confirmé par grep avant de retirer la
    prop). Le nœud racine synthétique de l'explorateur (`ROOT_NODE_ID`,
    "Documents") n'a pas de sens à renommer — `App.tsx` filtre ce cas dans le
    callback `onRenameFolder`, pas dans le composant.
  - **`TemplateDetailScreen.tsx`** : le panneau latéral de bascule de rôles
    (Toggle par rôle, un seul dossier à la fois) a disparu, remplacé par deux
    boutons "Arborescence"/"Droits d'accès" qui basculent tout le contenu de
    l'écran entre l'explorateur (comme avant, plus le menu "⋮") et le même
    `AccessRightsTable` que pour une vraie dataroom. **Piège rencontré et
    accepté** : `Explorer` étant démonté/remonté entre les deux modes (pas de
    tabs existants sur cet écran, juste un ternaire), son état local
    `openIds` (nœuds dépliés) ne survit pas à un aller-retour Arborescence ↔
    Droits d'accès — comportement mineur, pas corrigé (aurait exigé de lever
    l'état d'ouverture hors d'`Explorer`, hors du périmètre demandé).
  - **`frontend/src/access/templateVisibility.ts`** (nouveau) : port
    TypeScript pur de `_user_can_access`/`_subtree_has_accessible_content`/
    `_level_visible`, restreint aux trois rôles listables et sans `user_ids`
    (une case "utilisateur nommé" répond à "CET individu verra-t-il", pas "un
    membre quelconque de rôle X verra-t-il" — décision explicite du plan,
    seul `allowed_roles` alimente ce calcul). Recalculé à chaque rendu à
    partir du DRAFT courant du tableau de droits (pas encore enregistré) :
    `TemplateDetailScreen` passe `renderNodeExtra` à `Explorer`, qui affiche
    une pastille par rôle pour lequel le nœud est visible. **Vérifié en
    Chrome réel que la visibilité de CHEMIN se reflète bien en direct** :
    restriction `Client` posée sur une feuille profonde (`Test chevron 3
    niveaux`, sous `Amiante`, lui-même sous `Diagnostics`) → AVANT tout
    enregistrement, `Amiante` (qui n'a pourtant aucune restriction directe)
    affiche déjà les pastilles `A`, `M` ET `C` (visible pour Admin/Membre par
    défaut, et pour Client via le chemin vers la feuille restreinte),
    confirmé par lecture DOM (`.pill` de chaque `.tree-row`) : `{"amianteBadges":
    ["A","M","C"],"leafBadges":["C"]}` — exactement le résultat attendu de
    `_level_visible`/`_subtree_has_accessible_content` côté serveur, sans
    aucun aller-retour réseau.
  - **`App.tsx`** : `useAccessRestriction` (hook single-cible) et
    `AccessRestrictionModal` retirés entièrement (fichier
    `components/organisms/AccessRestrictionModal.tsx` supprimé) — remplacés
    par `useAccessRestrictionsList` (déjà existant, désormais un VRAI
    consommateur, voir point suivant) + les deux instances de
    `useAccessRightsDraft`. Nouvelles fonctions module-level
    `flattenDataroomAccessRows`/`buildDataroomAccessOriginal`/
    `flattenTemplateAccessRows`/`buildTemplateAccessOriginal` (aplatissement
    de l'arbre en lignes de tableau + construction de l'état "enregistré" à
    partir soit de `access_restrictions_view` (dataroom, filtré au
    `dataroom_id` courant), soit directement de `templateTree.tree` (Template
    — `allowed_roles`/`user_ids` déjà portés par chaque nœud, aucun appel
    réseau supplémentaire nécessaire). `officeUsers` élargi à `screen ===
    'dataroom' || screen === 'settings'` (alimente le sélecteur d'utilisateurs
    nommés des deux tableaux) ; `accessRestrictionsList` activé sur `screen
    === 'dataroom' || screen === 'users'`.
  - **Onglet "Restrictions" de la page Utilisateurs — construit pour de bon**
    (`useAccessRestrictionsList` n'avait jamais eu de consommateur réel avant
    ce chantier, malgré une entrée CLAUDE.md antérieure qui le décrivait déjà
    — corrigé) : nouveau bouton "Restrictions" par ligne dans
    `OfficeUsersScreen.tsx` (visible si `canManage`, à côté de "Retirer" —
    contrairement à "Retirer", disponible même sur sa propre ligne : rien
    n'empêche un gestionnaire de consulter ses propres restrictions), ouvrant
    `components/organisms/UserRestrictionsModal.tsx` (nouveau) — liste TOUTES
    les restrictions de l'office (`GET /api/access-restrictions/`), une case
    à cocher par restriction (appartenance de CET utilisateur à `user_ids`,
    enregistrée IMMÉDIATEMENT au clic — liste courte, un aller-retour par
    case a été jugé acceptable plutôt qu'un brouillon groupé comme pour
    `AccessRightsTable`) + un badge "Accès via le rôle" en LECTURE SEULE
    (pas de case) quand le rôle de l'utilisateur ouvert figure déjà dans
    `allowed_roles` de cette restriction — un rôle n'est pas un réglage par
    utilisateur, la case ne doit pas laisser croire le contraire. Vérifié en
    Chrome réel : coche/décoche sur une restriction préexistante
    (`HOLA / Dossier lvl 2`) reflétée immédiatement sans re-fetch manuel,
    revert après vérification.
  - **Tests** (`backend/datarooms/tests.py`) : nouvelle classe
    `SuperadminAndRoleAccessTests` (3 tests — bypass superadmin même exclu de
    `user_ids`/`allowed_roles`, `allowed_roles` seul donne accès sans
    `user_ids`, rôle absent de `allowed_roles` refusé), nouvelle classe
    `FolderRenameTests` (5 tests — 403 non-gestionnaire, 404 dossier d'une
    autre dataroom, renommage réussi, `DELETE` non exposé (405), round-trip
    `allowed_roles` sur `dataroom_access_view`/`access_restrictions_view`),
    3 nouveaux tests dans `DataroomTemplateTests` (round-trip
    `allowed_roles`/`user_ids` sur `template_folders_view`/
    `template_folder_detail_view` avec `"superadmin"` filtré, revalidation de
    `user_ids` à l'application du template contre les membres réels,
    correction des deux assertions de
    `test_dataroom_from_template_reproduces_tree_and_resolves_role_restrictions`
    qui attendaient encore l'ancienne résolution rôle→ids). Suite complète :
    **165/165 tests verts** (155 existants + 10 nouveaux, aucune régression).
  - **Vérifications frontend** : `tsc -b` (0 erreur), `npm run lint` (0
    erreur ; 2 nouveaux avertissements `react/set-state-in-effect`, même
    famille déjà tolérée ailleurs — `RenameFolderModal.tsx`/
    `useAccessRightsDraft.ts`, resynchronisation d'un brouillon local depuis
    une prop qui change), `npm run check:ds` (188 fichiers, aucun écart
    nouveau), `npm run build` (`vite build` sans erreur).
  - **Pas d'investigation de performance séparée dans ce chantier** (demande
    explicite) — chaque ligne modifiée du tableau de droits déclenche un
    appel réseau à l'enregistrement, pas par case cochée ; si une lenteur
    perceptible subsiste sur un tableau très large (type "Vente immobilière
    — standard", 63 lignes), elle sera traitée séparément le cas échéant.

## Fusion du 01/09/2026 — `back/EN_evolution_suite` ⇄ `origin/front/design-system-suite`

**⚠️ Branche de sauvegarde créée avant cette fusion : `back/EN_evolution_suite-backup-01-09`**
(pointant sur `565a388`, l'état de `back/EN_evolution_suite` juste avant le merge). En cas
de souci découvert avant la démo de 17h, `git reset --hard back/EN_evolution_suite-backup-01-09`
sur `back/EN_evolution_suite` revient instantanément à l'état d'avant fusion.

**Contexte** : depuis la dernière fusion (28/08/2026, remplacement complet du frontend),
les deux branches avaient divergé depuis le même point commun (`0fa0572`) — 4 commits
côté `back/EN_evolution_suite` (Templates, interface hyperadmin, correction de la faille
de connexion), 6 commits côté collègue (dashboard par widgets, recherche globale ⌘K,
tags, repli du rail de navigation). Contrairement à la dernière fois, **pas de refonte
frontend complète cette fois** — seuls 5 fichiers étaient touchés des deux côtés
(`CLAUDE.md`, `models.py`, `tests.py`, `urls.py`, `views.py`, tous backend/doc), les 75
autres fichiers frontend modifiés par le collègue (dashboard, recherche, tags — ~8600
lignes) étaient additifs sans recouvrement avec quoi que ce soit touché ici. Une fusion
`git merge` classique était donc le bon choix, vérifié avant de s'y engager (voir la
demande explicite de ne pas supposer l'ampleur sans l'avoir vérifiée) — pas de reprise
manuelle ciblée cette fois.

**Conflits textuels (5 fichiers)** : résolus en conservant les deux côtés à chaque fois
(aucun des deux chantiers ne remplaçait l'autre) :
- `models.py` : collision d'insertion entre `HyperadminAccess` (nous) et `Tag` (collègue),
  juste après `OfficeMembership` — les deux classes gardées, l'une après l'autre.
- `urls.py` : import combiné (nos 6 nouvelles vues + leurs 5), la liste `urlpatterns`
  elle-même avait déjà fusionné proprement toute seule (aucun recouvrement de ligne).
- `views.py` : POST `/api/datarooms/` combine désormais `template_id` (nous) ET `tags`
  (collègue) dans le même appel ; le filtre de `GET /api/datarooms/` combine
  `_level_visible(..., office, ...)` (notre signature du jour) ET `_matches_tag_filter`
  (leur filtre par tag).
- `tests.py` : les deux côtés avaient ajouté des classes de test à la fin du fichier au
  même point d'insertion (`RoleBasedDefaultAccessTests`/`DataroomTemplateTests`/
  `HyperadminTests` vs `SearchApiTests`/`TagValidatorTests`/`TagRouterTests`/
  `TagApiTests`) — les marqueurs de conflit s'entrelaçaient sur près de 1000 lignes de
  code partagé (le canevas `unittest.TestCase` + tenant sqlite dédié est identique d'une
  classe à l'autre). Résolu en reconstruisant la queue du fichier à partir des deux
  sources complètes plutôt qu'en résolvant chaque marqueur isolément (risque d'erreur
  trop élevé sur un entrelacement de cette taille) : les 3 classes d'un côté, les 4 de
  l'autre, mises bout à bout après `PathVisibilityTests` (dernière classe commune,
  confirmée identique octet pour octet entre les deux branches avant la reconstruction).
- `CLAUDE.md` : sections "Modèle de données clé" et "État actuel du POC" combinées ; les
  mentions "cinquième [modèle]"/"cinquième et sixième [modèles]" retirées des deux côtés
  (devenues inexactes une fois les deux chantiers combinés, plus de compteur ordinal
  entretenu désormais pour ce genre d'énoncé).

**⚠️ Incohérence fonctionnelle SANS conflit textuel, trouvée en vérifiant** (exactement
le risque signalé avant de fusionner) : le `search_view`/`dataroom_tags_view`/
`document_tags_view` du collègue appelaient encore `_user_can_access`/`_level_visible`
avec l'ANCIENNE signature à 2 arguments (`user, dataroom`), antérieure au changement de
défaut d'accès par rôle fait aujourd'hui même (ajout du paramètre `office`, voir entrée
du 01/09/2026 plus haut). Comme ces appels sont dans du code entièrement NOUVEAU côté
collègue (pas de ligne en commun avec ce que j'ai modifié), git les a fusionnés sans
broncher — un `TypeError` silencieux à l'exécution, jamais détecté par un conflit Git.
Trouvé par lecture systématique du diff `views.py` avant de fusionner (pas après), puis
confirmé par un `grep` de tous les appels aux trois fonctions une fois le merge fait : 7
sites corrigés (`dataroom_tags_view`, `document_tags_view`, et 5 dans `search_view`).
**Aucune incohérence trouvée dans `validators.py`** (vérifié comme demandé, malgré
l'absence de conflit textuel) — les ajouts du collègue (validation `Tag`/`dashboard`) ne
référencent rien touché ici, purement additifs.

**Migrations, collision renumérotée** : `0007_template_templatefolder.py`/
`0008_office_is_active_hyperadminaccess.py` (nous) contre
`0007_officemembership_dashboard.py`/`0008_tag.py` (collègue) — même piège que la
dernière fusion. Les 4 fichiers supprimés et régénérés en une seule migration propre
(`0007_tag_template_office_is_active_and_more.py`, dépendance unique sur
`0006_office_theme`) puisque `models.py` fusionné portait déjà tous les changements des
deux côtés. **Décalage entre bases locales et nouvel historique** (spécifique à cet
environnement de dev, pas un souci pour un clone neuf) : les bases SQLite locales
(`db.sqlite3`, `tenants/officea.sqlite3`, `tenants/officeb.sqlite3`) avaient déjà les
tables issues des anciennes migrations `0007`/`0008` supprimées — `migrate` échouait donc
sur "table already exists". Corrigé en ajoutant à la main les seules tables/colonnes
réellement manquantes (`OfficeMembership.dashboard` sur `default` ; `Tag`,
`datarooms_dataroom_tags`, `datarooms_document_tags` sur chaque tenant — DDL extraite
d'un tenant neuf migré à blanc pour éviter toute erreur de frappe), purge des entrées
d'historique des anciennes migrations, puis `migrate --fake` sur la nouvelle. Aucune
perte de données (le compte `hyperadmin` et son accès ont été vérifiés intacts après
coup).

**Test cassé par une incohérence fonctionnelle légitime** (1 échec sur 147 au premier
run) : `TagApiTests.test_a_dataroom_can_be_created_with_tags` se connectait avec un
`membre` pour créer une dataroom — comportement qui marchait avant le resserrement à
admin/superadmin décidé aujourd'hui (chantier Templates). Corrigé en changeant l'acteur
du test vers `self.admin` (déjà présent dans le `setUp` de la classe) : le test vérifie
le rattachement des tags à la création, pas le rôle de l'appelant, donc aucune perte de
couverture.

**Vérifications, toutes vertes** :
- `python manage.py test` → **147/147** (72 d'avant + les tests du collègue, aucune
  régression après le correctif ci-dessus).
- `npm run check:ds` → 173 fichiers vérifiés, aucun écart nouveau.
- `npm run build` (`tsc -b && vite build`) → sans erreur.
- `npm run lint` → seuls des avertissements préexistants des deux côtés (confirmés en
  comparant contre `origin/front/design-system-suite` seule via un worktree temporaire),
  aucun nouveau.
- **Scénario de démo complet rejoué en Chrome réel**, pas seulement en `curl` : connexion
  `carla` + TOTP sur `officea.localhost:5173`, bascule vers `officeb.localhost:5173` par
  le sélecteur d'office SANS reconnexion ni MFA à ressaisir (ticket SSO), données/modules
  bien différents entre les deux (4 dossiers actifs + module Coffre-fort sur A, 1 dossier
  + aucun module sur B — deux bases tenant réellement distinctes), puis désactivation du
  module Coffre-fort pour Office A depuis `/admin/` → disparition immédiate de l'entrée
  de nav côté React après un simple rechargement, sans redéploiement — remis à l'état
  d'origine (module réactivé) après vérification.
  **Nécessité découverte en cours de route** : aucun compte Django `is_staff`/
  `is_superuser` n'existait encore dans cet environnement pour accéder à `/admin/` — un
  superutilisateur `admin`/`demo1234` a été créé (`createsuperuser`) pour cette
  vérification et laissé en place, potentiellement utile pour la démo de 17h si besoin de
  retoucher `/admin/` en direct. **Piège rencontré** : le cookie de session Django est
  partagé entre `/admin/` (port 8000) et l'app React (port 5173) sur le même
  sous-domaine — se connecter à `/admin/` dans un onglet remplace la session active de
  l'autre onglet (vu passer de `carla` à `admin` après le login `/admin/`), il faut
  rouvrir une session `carla` propre après être passé par `/admin/` pour continuer à
  observer le scénario avec le bon compte.

## État actuel du POC

- [x] Squelette Django/React connecté (endpoint `ping`, CORS configuré)
- [x] Modèles `Module`, `Office`, `OfficeMembership` (base `default`, partagés) +
      `Dataroom`/`Document` (base tenant, isolation physique vérifiée le 26/08/2026)
- [x] Admin Django avec toggle de modules par office (`filter_horizontal`)
- [x] Auth par session Django (`login`, `my-offices`, `tenant-config`, `modules/coffre-fort`
      — tous protégés par `IsAuthenticated` + vérification d'appartenance à l'office)
- [x] **MFA (TOTP, django-otp)** sur la connexion initiale — fait le 27/08/2026,
      enrôlement (QR code) si pas de dispositif, code TOTP sinon ; ne se déclenche
      jamais sur la bascule d'office via ticket SSO (voir "État réel du code")
- [x] Frontend : **remplacé le 28/08/2026** par la structure du collègue
      (`front/design-system-components`) — `AppShell` + `pages/*Screen.tsx` +
      `hooks/`, design system par composants (atoms/molecules/organisms/templates),
      `ThemeProvider` pour la personnalisation visuelle. L'ancien `App.tsx`
      monolithique (nav locale `useState`, composants inline) décrit dans les
      entrées précédentes de cette liste est obsolète — voir "État réel du code"
      pour le détail de la fusion et de ce qui a été porté (MFA, dossiers imbriqués)
      vs. temporairement régressé puis reconstruit le 30/08/2026 (UI utilisateurs/
      accès, voir plus bas et l'audit du 01/09/2026).
- [x] Migrations + seed de démo (base `default`) — fait le 26/08/2026
- [x] **Migration vers une base SQLite par office** (routeur de base de données) — fait le
      26/08/2026 (`datarooms/tenancy/`) ; isolation physique prouvée avec de vraies
      données métier (`Dataroom`) le 26/08/2026 (voir "État réel du code")
- [x] **Vrai routage par sous-domaine** (`*.localhost`) avec identité partagée sans
      reconnexion — fait le 26/08/2026, via échange de ticket signé plutôt qu'un cookie
      de domaine partagé (rejeté par les navigateurs — voir "État réel du code")
- [ ] Logo dynamique par office (la couleur est câblée, pas encore le logo)
- [x] Arborescence de dataroom minimale (créer / uploader / naviguer) — API backend
      faite le 26/08/2026, hiérarchie de dossiers ajoutée côté **API** le 27/08/2026
      (modèle `Folder`, voir "État réel du code" et "Modèle de données clé").
      **UI reconstruite le 28/08/2026** sur le design system du collègue
      (`DataroomDetailScreen` + `organisms/Explorer`) après remplacement complet du
      frontend — arbre de dossiers assemblé en amont (`useDataroomTree`, parcours
      récursif de `GET /folders/?parent=`), navigation multi-niveaux via `Explorer`,
      création de dossier (`NewFolderModal`), upload par `molecules/Dropzone`
      (glisser-déposer + bouton "parcourir"). Vérifié de bout en bout en Chrome réel
      sur des données réelles à 3 niveaux de profondeur (`Contrats > Signes >
      Sous-dossier E2E`) : navigation, création de dossier, upload — voir "État réel
      du code" pour le détail. (Les versions UI antérieures au 26/08 et 27/08,
      construites sur l'ancien `App.tsx`, sont obsolètes depuis ce remplacement.)
- [x] Gestion des utilisateurs d'un office par ses admins/superadmins — **backend
      fait le 27/08/2026**, étendu le 28/08/2026 (rattachement d'un utilisateur
      existant, visibilité hiérarchique des rôles) : `GET`/`POST`/`PATCH
      /api/office-users/`, `POST /api/office-users/attach/`, isolation stricte par
      office même pour une identité partagée type carla (voir "État réel du code").
      **UI reconstruite le 30/08/2026** sur le design system : écran
      `pages/OfficeUsersScreen.tsx` (« Annuaire de l'étude », entrée de navigation
      dans la section Office), branché sur `hooks/useOfficeUsers.ts` — liste,
      recherche/pagination locales façon V1, rôle modifiable en ligne, et modale
      `organisms/OfficeUserModal.tsx` pour la création d'un compte comme pour le
      rattachement d'un compte existant. Les rôles proposés sont bornés au rang de
      l'appelant côté front (`organisms/officeRoles.ts`, miroir de
      `OfficeMembership.ROLE_RANK`) — le refus reste au serveur, l'interface évite
      seulement de proposer ce qui sera refusé. Un 403 affiche le message du
      backend au lieu de masquer l'entrée de menu. **Vérifié : `tsc -b` et
      `check:ds` (143 fichiers, aucun écart nouveau). Pas encore exercé dans un
      navigateur réel** — `vite build` et `oxlint` n'étant pas lançables depuis le
      sandbox Linux (binaires natifs installés pour Windows).
- [x] Contrôle d'accès par utilisateur ET par rôle sur Dataroom/Folder/Document,
      avec héritage — **backend fait le 28/08/2026**, modèle étendu le 03/09/2026
      (`AccessRestriction.allowed_roles`, bypass superadmin inconditionnel dans
      `_user_can_access` — voir "État réel du code") : accès ouvert par défaut à
      tout l'office (fermé par défaut pour le rôle `client` depuis le 01/09/2026),
      restriction ponctuelle par admin/superadmin à un niveau précis (rôle OU
      utilisateur nommé, les deux critères indépendants), héritée par le contenu
      imbriqué (la restriction la plus proche dans la hiérarchie l'emporte, pas de
      fusion), visibilité de chemin (`_subtree_has_accessible_content`/
      `_level_visible`) calculée à chaque requête, lecture seulement (la
      création/l'upload restent gatés par l'accès direct seul). **UI refaite le
      03/09/2026** : `organisms/AccessRightsTable.tsx` (tableau unique, réutilisé
      pour les vraies datarooms ET les Templates — cases Admin/Membre/Client,
      jamais Superadmin, "Tout cocher" par colonne, utilisateurs nommés, édition
      locale groupée jusqu'à enregistrement explicite), remplace l'ancienne modale
      `AccessRestrictionModal.tsx` (supprimée) ouverte par élément. Le renommage
      d'un dossier est désormais séparé des droits (`RenameFolderModal.tsx`, menu
      "⋮" de l'`Explorer`). L'onglet « Restrictions » par utilisateur
      (`useAccessRestrictionsList`) a enfin un écran consommateur —
      `UserRestrictionsModal.tsx`, ouverte depuis un bouton "Restrictions" par
      ligne d'`OfficeUsersScreen`. Vérifié en Chrome réel (bypass superadmin,
      tableau, renommage, badges de visibilité en direct côté template,
      modale Restrictions) — voir "État réel du code", 03/09/2026.
- [x] Templates de dataroom (structure de dossiers réutilisable) — **backend
      fait le 01/09/2026** : modèles `Template`/`TemplateFolder` (base tenant,
      voir "Modèle de données clé"), CRUD réservé admin/superadmin
      (`/api/templates/...`), `POST /api/datarooms/` accepte un `template_id`
      optionnel qui reproduit récursivement l'arborescence en vrais
      `Folder`/`AccessRestriction` (résolution des rôles en utilisateurs réels
      au moment de l'application, aucun lien conservé vers le template ensuite
      — voir "État réel du code"). **UI faite le 02/09/2026, déplacée le même
      jour** : écrans `TemplatesListScreen`/`TemplateDetailScreen`, d'abord
      accessibles via une entrée de navigation top-level « Modèles de
      dossier », puis relogés dans Personnalisation → onglet « Template »
      (nouvel onglet, à côté de « Modules » — anciennement « Modules &
      modèles », qui a perdu sa propre section « Modèles de dataroom »
      figée). `NewDataroomModal` câblée sur les vrais `Template` (voir "État
      réel du code") — `NEW_DATAROOM_TEMPLATES` (jeu de démo factice) a
      disparu de `data/demo.tsx`, remplacé par de vrais `Template` de démo
      (`seed_templates`, mêmes intitulés). **Qui peut créer une dataroom a
      bougé deux fois** : ouvert à tout membre à l'origine → resserré à
      admin/superadmin le 01/09/2026 (chantier Templates) → réélargi au rôle
      "membre" inclus le 02/09/2026 (client seul exclu, voir "État réel du
      code" — périmètre explicitement non figé, susceptible de bouger
      encore).
- [x] Interface hyperadmin (rôle Notantis transverse) — **backend fait le
      01/09/2026** : modèle `HyperadminAccess` (base default, distinct du rôle
      `superadmin` d'`OfficeMembership` qui reste scopé à un office),
      `Office.is_active` (un office désactivé devient inaccessible comme un
      sous-domaine inconnu, `TenantResolutionMiddleware`). `GET`/`POST
      /api/hyperadmin/offices/` (liste, création d'un office + son premier
      admin dans le même flux, provisionnement de sa base tenant), `PATCH
      /api/hyperadmin/offices/<id>/` (activer/désactiver, gérer les modules
      activés). Gate `_is_hyperadmin`, alors volontairement indépendant de
      `request.office` (pas de sous-domaine dédié pour cette première
      version). `seed_demo` étendu (compte `hyperadmin`). **Sous-domaine dédié
      + UI faits le 02/09/2026** : `hyperadmin.localhost` (voir "État réel du
      code"), `hyperadmin/HyperadminApp.tsx` (racine séparée, pas l'`AppShell`
      des offices) avec les 4 actions — liste, création d'office + admin,
      activation/désactivation, gestion des modules (`GET
      /api/hyperadmin/modules/`, nouveau). Les endpoints `/api/hyperadmin/...`
      eux-mêmes restent volontairement indépendants de l'hôte (décision
      inchangée). Notifications globales laissées au backlog.
- [x] **Tags** (catalogue par office, pose sur dossiers ET pièces, filtre et
      recherche) — fait le 01/09/2026 : modèle `Tag`, création à la volée
      dédupliquée sur le nom replié, filtre multi-sélection en OU, tags
      cherchés par la barre de recherche de la liste au même titre que les
      noms, **et par la palette globale ⌘K** (second passage de
      `/api/search/`, résultat justifié par `matched_tag` — même date).
      Renommage/suppression du catalogue réservés aux admins. Non vérifié en
      navigateur (voir « État réel du code »).
- [ ] Alignement visuel avec les captures V1 de référence (`docs/reference-v1/`) — pas
      commencé, en attente de maquettes complémentaires
- [x] Personnalisation visuelle par office (`Office.theme`) — backend fusionné le
      28/08/2026, **frontend (design system + `ThemeProvider`) fusionné le
      28/08/2026 également**, en même temps que le remplacement complet du frontend
      par la structure du collègue — voir "État réel du code" et
      `FUSION_BACKEND_THEME.md` (qui ne documente que la partie backend, antérieure
      d'un cran à ce remplacement complet).

## Backlog « si le temps le permet » (hors engagement ferme du POC)

- Tags sur une dataroom — jugé intéressant à démontrer si le temps le permet, mais pas
  un engagement du périmètre POC
- Toute autre idée qui émergerait en cours de route : l'ajouter ici plutôt que de dériver
  le scope silencieusement

## Explicitement hors périmètre du POC

Q&A (y compris ses réglages fins vus en V1 : modération, plages horaires...), notion de
portefeuille, audit trail / historique, facturation, conformité DSN/RGPD, les 3 types de
dossier distincts, la duplication de dossier entre offices. Tous documentés dans le
document de vision pour le chiffrage MOE, mais non traités ici.

**Écart assumé le 26/08/2026** : « vrai stockage S3 » figurait ici à l'origine — ce
n'est plus le cas. Décision explicite de l'utilisateur : le stockage des `Document` est
passé à MinIO (S3-compatible) via `django-storages`/`boto3`, voir « État réel du code ».
Toujours pas de vrai AWS S3 (MinIO local, sans persistance ni durcissement production),
mais l'abstraction de stockage n'est plus « hors périmètre » comme axe technique.

**Écart assumé le 27/08/2026** : la MFA (authentification à deux facteurs, TOTP) fait
désormais partie du périmètre du POC — décision explicite de l'utilisateur, voir
« État réel du code ». Le reste de la conformité DSN/RGPD au sens large (déclaration
DSN, droits CNIL, archivage légal, etc., cf. document de vision) reste hors périmètre :
la MFA en est sortie spécifiquement, pas toute la ligne.

**Écart assumé le 28/08/2026** : « droits fins par groupe » retiré de la liste
ci-dessus — décision explicite de l'utilisateur, voir « État réel du code » (modèle
`AccessRestriction`). Le contrôle d'accès qui **entre** dans le périmètre du POC est
volontairement plus simple que ce que cette ligne visait initialement : restriction
ponctuelle **par utilisateur** (liste d'ids) sur un Dataroom/Folder/Document précis,
avec héritage par le contenu imbriqué — pas de notion de groupe, pas de matrice de
permissions par rôle/action, pas de droits différenciés lecture/écriture/suppression.
Un vrai système de « droits fins par groupe » (groupes nommés, permissions composables
par action) reste hors périmètre ; seule la restriction simple par utilisateur en est
sortie.

**Écart assumé le 01/09/2026** : « templates » retiré de la liste ci-dessus — décision
explicite de l'utilisateur, voir « État réel du code » (modèles `Template`/
`TemplateFolder`). Ce qui **entre** dans le périmètre : une structure de dossiers
réutilisable (avec restrictions d'accès par rôle résolues à l'application), reproduite en
un vrai `Dataroom`/`Folder`/`AccessRestriction` indépendant à la création — pas de notion
de template de contenu (documents pré-remplis, champs à compléter) ni de bibliothèque de
templates partagée entre offices, qui restent hors périmètre.

## Pour Claude Code

Lancer `/init` après avoir scanné le code existant pour compléter ce fichier avec les
détails d'implémentation réels (structure de fichiers exacte, éventuelles divergences
avec ce qui est décrit ici). Consulter aussi `docs/reference-v1/` pour la fidélité visuelle.
Garder ce fichier à jour au fil du POC, en particulier les sections « État actuel » et
« Backlog » — c'est la mémoire de travail du projet, pas un document figé.
