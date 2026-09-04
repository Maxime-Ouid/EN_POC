# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Espace Notarial — V1 légère à visée commerciale

## Contexte

Le projet prépare le chiffrage MOE d'une refonte de l'Espace Notarial (NOTANTIS) : une
plateforme de dataroom multi-tenant pour offices notariaux. Le périmètre fonctionnel
complet est décrit dans `EN_vision_AMOA_MVP_v0.5_fusionne.md` (à la racine du projet) —
s'y référer pour toute question de scope métier.

**Repositionnement (confirmé le 04/09/2026)** : le projet a démarré comme un POC
technique ciblé (prouver 3 paris architecturaux précis, voir Objectif) mais s'est
progressivement rapproché d'une **V1 légère à visée commerciale** — un produit
suffisamment complet et crédible pour être présenté en démo et emporter la décision du
client, pas seulement un exercice de preuve technique. Plusieurs fonctionnalités
initialement classées « hors périmètre » ont depuis été demandées en ajout obligatoire
(voir « Explicitement hors périmètre » en fin de fichier pour le détail exact et les
dates). Le terme « POC » reste utilisé par endroits dans ce fichier et dans le code par
commodité (historique, noms de commandes/tests, `Écarts assumés`) — il ne doit plus être
lu comme « scope volontairement restreint », seulement comme raccourci pour « ce dépôt ».

**Exigence de fidélité** : le produit doit avoir un look proche de la V1 actuelle, pas un
produit générique réinventé. Des captures d'écran de la V1 ont été fournies comme
référence **visuelle uniquement** — voir section dédiée plus bas. Le contenu et le
périmètre fonctionnel suivent le document de vision fusionné, pas la V1.

**Historique détaillé** : le journal complet des décisions, chantiers et vérifications
(jour par jour depuis le 25/08/2026) vit dans `docs/journal.md` — déplacé là le
04/09/2026 pour garder ce fichier-ci lisible. Ce fichier ne garde que l'état ACTUEL ;
consulter le journal pour le détail d'un chantier passé, le contexte d'une décision, ou
un piège déjà rencontré et résolu.

## Objectif

**Objectif produit (révisé le 04/09/2026)** : livrer une V1 légère mais crédible de
l'Espace Notarial, démontrable en live devant le client pour emporter sa décision — pas
une maquette ni un exercice technique isolé. Ce qui est montré doit ressembler à la
vraie cible (document de vision), pas à une version appauvrie qui s'en écarterait.

Le socle technique reste organisé autour de trois paris architecturaux, qui restent le
cœur de la démonstration (audience potentielle : MOE + décideurs) :

1. **Modules activables/désactivables par office, sans redéploiement** — le point le plus
   stratégique. Aujourd'hui (V1), une demande spécifique par office déclenche un clonage
   complet du code (~20 forks divergents à maintenir). Le socle commun + modules
   togglables doit prouver que ça résout ce problème.
2. **Identité partagée entre tenants, avec vraie isolation en base** — un compte
   utilisateur unique peut accéder à plusieurs offices, avec un rôle différent par office.
   Chaque office a sa **propre base de données** (pas une simple colonne `office_id` dans
   une base partagée — voir Architecture ci-dessous).
3. **Personnalisation visuelle par office (marque grise)** — logo/couleur appliqués
   dynamiquement, sur une base visuelle proche de la V1 (cf. captures de référence).

**Ce qui a changé par rapport au cadrage initial** : à l'origine, l'objectif excluait
explicitement de reproduire l'intégralité des fonctionnalités du document de vision («
ce n'est pas un mini-MVP »). Ce principe reste vrai dans l'absolu (le document de vision
couvre bien plus que ce dépôt), mais le périmètre réellement attendu s'est élargi au fil
des retours : plusieurs fonctionnalités listées à l'origine comme hors périmètre sont
désormais des ajouts obligatoires — **portefeuille** (regroupement de datarooms avec vue
consolidée, §2.1/§3.2/§4.1 du document de vision), **audit trail / historique** (accès et
modifications sur une dataroom, §3.2), et **partage d'une dataroom entre deux offices**
(§4.1, typiquement vendeur/acquéreur). **Les tags** (catalogue par office, pose sur
dossiers et pièces, filtre et recherche) suivent la même bascule mais sont, eux, déjà
livrés (fait le 01/09/2026, avant même cette clarification de statut) — ce n'était à
l'origine qu'un item de backlog « si le temps le permet », désormais confirmé comme un
engagement ferme, pas un bonus qui pourrait être retiré. Voir « Explicitement hors
périmètre » en fin de fichier pour l'état exact à jour, et « État actuel » pour ce qui
est fait vs. restant à faire sur portefeuille/audit trail/partage entre offices (aucun
des trois n'est encore implémenté au 04/09/2026). À l'inverse, la
distinction V1 en 3 types de dossier (dataroom électronique / espace de travail
collaboratif / dossier de divorce) reste définitivement exclue — c'est un concept propre
à la V1 déjà abandonné dans la vision V2 elle-même, pas une simplification de ce dépôt
(voir « Écarts assumés » ci-dessous).

## Stack

- **Backend** : Django + Django REST Framework, auth par session Django
  (`SessionAuthentication`) — pas de token DRF (abandonné, voir Architecture ci-dessous)
- **Frontend** : React + Vite + TypeScript
- **Base** : SQLite — **une base physique distincte par office** (pas de base partagée)
- **Sous-domaine** : routage réel via `*.localhost` (résolution automatique sur OS/navigateurs
  modernes, pas besoin d'éditer le fichier hosts)
- **HTTPS en dev** : certificats mkcert (racine du projet), Vite en HTTPS natif,
  Django via `runserver_plus` (django-extensions) — voir Commandes et `docs/journal.md`
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
# docs/journal.md pour l'explication (wildcard rejeté sur un domaine à un seul
# label par tous les validateurs TLS, pas juste une bizarrerie Windows). -cert-file/
# -key-file explicites (depuis le 02/09/2026, sous-domaine hyperadmin.localhost) pour
# garder les noms de fichiers stables : sans eux, mkcert renumérote le fichier de
# sortie selon le nombre de SAN, ce qui casserait les chemins en dur dans
# vite.config.ts et dev.ps1. *.office.localhost (ajouté le 03/09/2026) est un
# wildcard UN CRAN sous "localhost" — hors de la restriction Public Suffix List qui
# bloque *.localhost — et couvre n'importe quel office créé en direct depuis la
# console hyperadmin (<nom>.office.localhost) sans regénération ni redémarrage à
# chaque création : NE PAS L'OMETTRE en régénérant, ça casserait silencieusement
# cette fonctionnalité (voir docs/journal.md, 03/09/2026).
mkcert -cert-file localhost+5.pem -key-file localhost+5-key.pem \
  localhost "*.localhost" officea.localhost officeb.localhost hyperadmin.localhost \
  "*.office.localhost" 127.0.0.1 ::1

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
  MinIO, voir `docs/journal.md`) — chemin calculé par
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
  `docs/journal.md` pour le détail ; le comportement pour les autres rôles est
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

## État actuel

- [x] Squelette Django/React connecté (endpoint `ping`, CORS configuré)
- [x] Modèles `Module`, `Office`, `OfficeMembership` (base `default`, partagés) +
      `Dataroom`/`Document` (base tenant, isolation physique vérifiée le 26/08/2026)
- [x] Admin Django avec toggle de modules par office (`filter_horizontal`)
- [x] Auth par session Django (`login`, `my-offices`, `tenant-config`, `modules/coffre-fort`
      — tous protégés par `IsAuthenticated` + vérification d'appartenance à l'office)
- [x] **MFA (TOTP, django-otp)** sur la connexion initiale — fait le 27/08/2026,
      enrôlement (QR code) si pas de dispositif, code TOTP sinon ; ne se déclenche
      jamais sur la bascule d'office via ticket SSO (voir `docs/journal.md`)
- [x] Frontend : **remplacé le 28/08/2026** par la structure du collègue
      (`front/design-system-components`) — `AppShell` + `pages/*Screen.tsx` +
      `hooks/`, design system par composants (atoms/molecules/organisms/templates),
      `ThemeProvider` pour la personnalisation visuelle. L'ancien `App.tsx`
      monolithique (nav locale `useState`, composants inline) décrit dans les
      entrées précédentes de cette liste est obsolète — voir `docs/journal.md`
      pour le détail de la fusion et de ce qui a été porté (MFA, dossiers imbriqués)
      vs. temporairement régressé puis reconstruit le 30/08/2026 (UI utilisateurs/
      accès, voir plus bas et l'audit du 01/09/2026).
- [x] Migrations + seed de démo (base `default`) — fait le 26/08/2026
- [x] **Migration vers une base SQLite par office** (routeur de base de données) — fait le
      26/08/2026 (`datarooms/tenancy/`) ; isolation physique prouvée avec de vraies
      données métier (`Dataroom`) le 26/08/2026 (voir `docs/journal.md`)
- [x] **Vrai routage par sous-domaine** (`*.localhost`) avec identité partagée sans
      reconnexion — fait le 26/08/2026, via échange de ticket signé plutôt qu'un cookie
      de domaine partagé (rejeté par les navigateurs — voir `docs/journal.md`)
- [x] Logo dynamique par office (la couleur est câblée depuis le 28/08, le logo depuis
      le 03/09/2026) — repris de `front/templates-hyperadmin-ui`, voir "État réel du
      code" pour le détail (PATCH `/api/tenant-config/` + relais `/api/tenant-logo/`,
      IdentityTab.tsx câblée). **Dépôt réel non vérifié en Chrome dans CETTE session**
      (Docker/MinIO indisponibles dans cet environnement) — seul l'enregistrement du
      nom (sans fichier, ne touche pas le stockage) l'a été de bout en bout ; la
      logique de dépôt/relais/suppression est couverte par les 9 tests dédiés
      (stockage `FileSystemStorage` de test, pas MinIO).
- [x] Arborescence de dataroom minimale (créer / uploader / naviguer) — API backend
      faite le 26/08/2026, hiérarchie de dossiers ajoutée côté **API** le 27/08/2026
      (modèle `Folder`, voir `docs/journal.md` et "Modèle de données clé").
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
      office même pour une identité partagée type carla (voir `docs/journal.md`).
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
      `_user_can_access` — voir `docs/journal.md`) : accès ouvert par défaut à
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
      modale Restrictions) — voir `docs/journal.md`, 03/09/2026.
      **Template repassé en tableau direct, sans Explorer, le même
      03/09/2026 (plus tard dans la journée)** : les droits de chaque
      dossier sont visibles en permanence, sans sélection préalable
      (demande explicite de l'utilisateur, après un premier essai en
      panneau-sur-sélection jugé pas assez direct) — `AccessRightsTable`
      gagne `renderRowActions`/`renderRowBadges` (Template seulement,
      Dataroom inchangé) et la cellule "Utilisateurs nommés" tronque
      désormais selon la largeur réelle avec une popup "+N autres…"
      (`NamedUsersEditor.tsx`, nouveau) — voir l'entrée dédiée de "État réel
      du code".
- [x] Templates de dataroom (structure de dossiers réutilisable) — **backend
      fait le 01/09/2026** : modèles `Template`/`TemplateFolder` (base tenant,
      voir "Modèle de données clé"), CRUD réservé admin/superadmin
      (`/api/templates/...`), `POST /api/datarooms/` accepte un `template_id`
      optionnel qui reproduit récursivement l'arborescence en vrais
      `Folder`/`AccessRestriction` (résolution des rôles en utilisateurs réels
      au moment de l'application, aucun lien conservé vers le template ensuite
      — voir `docs/journal.md`). **UI faite le 02/09/2026, déplacée le même
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
      inchangée). Notifications globales laissées au backlog. **Tous les
      droits sur tous les offices depuis le 03/09/2026** (`_effective_role`,
      voir `docs/journal.md`) : un hyperadmin connecté sur N'IMPORTE QUEL
      sous-domaine d'office s'y comporte comme un superadmin (bypass complet
      des restrictions d'accès, tous les endpoints de gestion), sans jamais
      obtenir de ligne `OfficeMembership` réelle — invariant vérifié par
      test ET en Chrome (absent de l'annuaire de l'office qu'il visite).
      **Un office créé depuis la console est immédiatement joignable, sans
      redémarrage ni avertissement TLS** (fait le 03/09/2026) : le
      certificat mkcert local porte un wildcard `*.office.localhost` (voir
      Commandes), et la console affiche pour chaque office un lien cliquable
      vers `https://<sous-domaine>.office.localhost:5173/` (aperçu en direct
      dans la modale de création dès la saisie) — vérifié de bout en bout en
      Chrome réel, création → clic → connexion → accueil de l'office, voir
      `docs/journal.md`. **Rôle choisi (admin/superadmin) à la création,
      avec sélecteur des comptes déjà superadmin en mode "compte existant"**
      (fait le 04/09/2026) : `POST /api/hyperadmin/offices/` accepte
      `admin_role` (défaut `admin`) ; `GET /api/hyperadmin/superadmins/`
      (réservé hyperadmin, sans impact sur le principe "pas d'annuaire" des
      offices normaux) liste les comptes déjà superadmin quelque part avec
      leurs offices, pour reprendre une identité partagée (type carla)
      plutôt que d'en créer une nouvelle par erreur — voir `docs/journal.md`.
      **Sous-domaine limité à lettres/chiffres/tirets, jamais l'underscore**
      (corrigé le 04/09/2026, `Office.clean()`) : un underscore passe la
      validation `SlugField` par défaut mais Django rejette ensuite TOUT Host
      qui en contient un (500 `DisallowedHost`, `host_validation_re` câblé en
      dur dans le framework, aucun réglage ne peut compenser — et un vrai DNS
      ne l'accepterait pas non plus). Refusé désormais dès la création avec
      un message clair, plutôt que de ne se découvrir qu'à la connexion — voir
      `docs/journal.md` pour le détail complet (deux couches de blocage
      distinctes, CORS puis host Django).
- [x] **Tags** (catalogue par office, pose sur dossiers ET pièces, filtre et
      recherche) — fait le 01/09/2026 : modèle `Tag`, création à la volée
      dédupliquée sur le nom replié, filtre multi-sélection en OU, tags
      cherchés par la barre de recherche de la liste au même titre que les
      noms, **et par la palette globale ⌘K** (second passage de
      `/api/search/`, résultat justifié par `matched_tag` — même date).
      Renommage/suppression du catalogue réservés aux admins. **Statut
      requalifié le 04/09/2026** : n'était à l'origine qu'un item de backlog
      « si le temps le permet », confirmé depuis comme un ajout obligatoire
      au même titre que portefeuille/audit trail/partage entre offices
      ci-dessous — la fonctionnalité, elle, n'a pas changé, déjà entièrement
      livrée. Seul point encore ouvert : non vérifié en navigateur (voir
      `docs/journal.md`) — à couvrir avant de le considérer clos pour de bon.
- [ ] Alignement visuel avec les captures V1 de référence (`docs/reference-v1/`) — pas
      commencé, en attente de maquettes complémentaires
- [x] Personnalisation visuelle par office (`Office.theme`) — backend fusionné le
      28/08/2026, **frontend (design system + `ThemeProvider`) fusionné le
      28/08/2026 également**, en même temps que le remplacement complet du frontend
      par la structure du collègue — voir `docs/journal.md` et
      `FUSION_BACKEND_THEME.md` (qui ne documente que la partie backend, antérieure
      d'un cran à ce remplacement complet).
- [ ] **Portefeuille** (regroupement de datarooms, vue consolidée) — ajouté au périmètre
      requis le 04/09/2026 (auparavant hors périmètre), pas encore commencé. Vision :
      §2.1/§3.2/§4.1 de `EN_vision_AMOA_MVP_v0.5_fusionne.md` — a vocation à remplacer
      la notion V1 d'« espace client » (un dossier/dataroom y est aujourd'hui rattaché).
      Deux questions restent ouvertes dans le document de vision lui-même, non tranchées
      lors de l'atelier de cadrage : l'accès à un portefeuille donne-t-il automatiquement
      accès à toutes les datarooms qu'il contient ? Une dataroom peut-elle appartenir à
      plusieurs portefeuilles ? À trancher avant/pendant l'implémentation, pas à
      supposer.
- [ ] **Audit trail / historique** (accès et modifications apportées au contenu d'une
      dataroom) — ajouté au périmètre requis le 04/09/2026 (auparavant hors périmètre),
      pas encore commencé. Vision : §3.2 de `EN_vision_AMOA_MVP_v0.5_fusionne.md`. Le
      document de vision note lui-même (§8) que le périmètre précis des événements
      tracés et la reprise de l'historique existant restent des questions ouvertes — à
      cadrer avant l'implémentation.
- [ ] **Partage d'une dataroom entre deux offices** (typiquement vendeur/acquéreur, avec
      possibilité d'activer ou non une synchronisation des fichiers en temps réel) —
      ajouté au périmètre requis le 04/09/2026 (auparavant hors périmètre, sous
      l'intitulé « duplication de dossier entre offices »), pas encore commencé. Vision :
      §4.1. ⚠️ Point de vigilance déjà noté dans le document de vision lui-même (réunion
      du 21/08/2026), à ne PAS reproduire : le mécanisme V1 de sélection de l'office
      destinataire expose la liste complète des offices clients Notantis — même famille
      de problème que le point de sécurité déjà documenté dans « Écarts assumés » plus
      haut (annuaire d'offices exposé). Prévoir un mécanisme d'appariement plus sûr (ex.
      échange de code entre les deux offices) plutôt qu'un annuaire ouvert.

## Backlog « si le temps le permet »

Rien en attente pour le moment — ajouter ici toute idée qui émergerait en cours de route
plutôt que de dériver le scope silencieusement. (L'ancien item « tags sur une dataroom »
n'est plus un backlog optionnel : requalifié ajout obligatoire le 04/09/2026, déjà livré
— voir « État actuel » et « Explicitement hors périmètre » ci-dessous.)

## Explicitement hors périmètre

Q&A (y compris ses réglages fins vus en V1 : modération, plages horaires...),
facturation, le reste de la conformité DSN/RGPD au-delà de la MFA (déclaration DSN,
droits CNIL, archivage légal...), et les 3 types de dossier distincts de la V1. Tous
documentés dans le document de vision pour le chiffrage MOE, mais non traités ici.

**Écart assumé le 26/08/2026** : « vrai stockage S3 » figurait ici à l'origine — ce
n'est plus le cas. Décision explicite de l'utilisateur : le stockage des `Document` est
passé à MinIO (S3-compatible) via `django-storages`/`boto3`, voir `docs/journal.md`.
Toujours pas de vrai AWS S3 (MinIO local, sans persistance ni durcissement production),
mais l'abstraction de stockage n'est plus « hors périmètre » comme axe technique.

**Écart assumé le 27/08/2026** : la MFA (authentification à deux facteurs, TOTP) fait
désormais partie du périmètre requis — décision explicite de l'utilisateur, voir
`docs/journal.md`. Le reste de la conformité DSN/RGPD au sens large (déclaration DSN,
droits CNIL, archivage légal, etc., cf. document de vision) reste hors périmètre : la
MFA en est sortie spécifiquement, pas toute la ligne.

**Écart assumé le 28/08/2026** : « droits fins par groupe » retiré de la liste
ci-dessus — décision explicite de l'utilisateur, voir `docs/journal.md` (modèle
`AccessRestriction`). Le contrôle d'accès qui **entre** dans le périmètre est
volontairement plus simple que ce que cette ligne visait initialement : restriction
ponctuelle **par utilisateur et/ou par rôle** sur un Dataroom/Folder/Document précis,
avec héritage par le contenu imbriqué — pas de notion de groupe, pas de matrice de
permissions par rôle/action, pas de droits différenciés lecture/écriture/suppression.
Un vrai système de « droits fins par groupe » (groupes nommés, permissions composables
par action) reste hors périmètre ; seule la restriction simple par utilisateur/rôle en
est sortie.

**Écart assumé le 01/09/2026** : « templates » retiré de la liste ci-dessus — décision
explicite de l'utilisateur, voir `docs/journal.md` (modèles `Template`/
`TemplateFolder`). Ce qui **entre** dans le périmètre : une structure de dossiers
réutilisable (avec restrictions d'accès par rôle et/ou utilisateur résolues à
l'application), reproduite en un vrai `Dataroom`/`Folder`/`AccessRestriction`
indépendant à la création — pas de notion de template de contenu (documents pré-remplis,
champs à compléter) ni de bibliothèque de templates partagée entre offices, qui restent
hors périmètre.

**Écart assumé le 04/09/2026** : le projet est repositionné en V1 légère à visée
commerciale plutôt que POC technique pur (voir Contexte/Objectif en tête de fichier) —
décision explicite de l'utilisateur. Conséquence directe : trois points auparavant listés
ci-dessus comme hors périmètre en sont retirés, devenus des ajouts obligatoires —
**notion de portefeuille**, **audit trail / historique**, **partage/duplication de
dataroom entre offices**. Voir « État actuel » pour le détail de ce qui est attendu sur
chacun (aucun des trois n'est encore implémenté à cette date) et les références précises
au document de vision. **Même bascule pour les tags** (catalogue par office, pose sur
dossiers et pièces, filtre et recherche) : n'était listé nulle part dans « hors
périmètre » mais vivait dans le Backlog « si le temps le permet », donc explicitement
PAS un engagement ferme — requalifié ajout obligatoire à cette même date. Contrairement
aux trois précédents, déjà entièrement livré (fait le 01/09/2026, voir « État actuel » et
`docs/journal.md`) ; seule la qualification de son statut change ici, pas le code.
**Confirmé à cette occasion, reste définitivement hors
périmètre** : les 3 types de dossier distincts de la V1 (dataroom électronique / espace
de travail collaboratif / dossier de divorce) — ce n'est pas une simplification de ce
dépôt mais un concept propre à la V1, déjà abandonné dans le document de vision V2
lui-même (voir « Écarts assumés » plus haut, qui n'a pas changé sur ce point).

## Pour Claude Code

Consulter `docs/journal.md` pour l'historique détaillé jour par jour (chantiers,
gotchas, décisions techniques, vérifications) — ce fichier-ci ne garde que l'état
ACTUEL, pas le récit de comment on y est arrivé. Consulter aussi `docs/reference-v1/`
pour la fidélité visuelle. Garder ce fichier à jour au fil du projet, en particulier les
sections « État actuel » et « Explicitement hors périmètre » — c'est la mémoire de
travail du projet, pas un document figé. Toute nouvelle entrée substantielle et datée
(gotcha, détail de vérification, chantier terminé) va dans `docs/journal.md`, pas ici :
ce fichier reste un résumé de l'état courant, pas un journal qui grossit indéfiniment.
