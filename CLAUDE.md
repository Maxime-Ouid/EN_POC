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
# label par tous les validateurs TLS, pas juste une bizarrerie Windows).
mkcert localhost "*.localhost" officea.localhost officeb.localhost 127.0.0.1 ::1

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

# Enregistrer/migrer la base SQLite de chaque office (à relancer après tout nouvel
# Office créé — idempotent). Accepte --office=<subdomain> pour n'en cibler qu'un.
cd backend && python manage.py migrate_all_tenants

# Frontend — HTTPS natif Vite (server.https dans vite.config.ts, mêmes certificats mkcert)
cd frontend && npm run dev        # serveur de dev Vite (https://localhost:5173)
cd frontend && npm run build      # tsc -b && vite build
cd frontend && npm run lint       # oxlint

# Tests backend (15 tests sur la plomberie multi-tenant dans datarooms/tests.py)
cd backend && python manage.py test
```

Il n'y a pas de `requirements.txt` ; les dépendances ne sont installées que dans
`backend/.venv`. Si ce venv est absent/à recréer, il faudra au minimum `django`,
`djangorestframework`, `django-cors-headers`, `django-extensions`, `Werkzeug`,
`pyOpenSSL`, `django-storages`, `boto3`.

`mkcert` n'est pas sur le PATH de Git Bash/PowerShell dans cet environnement — installé
via WinGet, binaire trouvable via
`AppData\Local\Microsoft\WinGet\Packages\FiloSottile.mkcert_.../mkcert.exe` si besoin de
l'invoquer par chemin complet.

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
- `Document` : deuxième modèle métier tenant (fait le 26/08/2026) — vit dans la même base
  tenant que `Dataroom`. `ForeignKey` vers `Dataroom` **classique** (pas de limite ici :
  les deux modèles vivent dans la même base physique, contrairement à une FK vers
  `Office`/`User`). Champs : `dataroom`, `name`, `file` (`FileField`), `uploaded_at`.
  Fichier stocké sous `backend/media/<subdomain>/dataroom_<id>/<nom>` — chemin calculé par
  `datarooms.tenancy.storage.tenant_document_path`, qui réutilise le même `ContextVar` que
  le routeur DB (`get_current_tenant()`), pas un nouveau mécanisme. Validation du format à
  l'upload par extension (`datarooms/validators.py`, liste tirée de
  `EN_vision_AMOA_MVP_v0.5_fusionne.md` §4.7) — pas d'antivirus/analyse de contenu (§7.5
  du document de vision, hors périmètre POC).
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

## Scénario de démo cible

1. Connexion avec `carla` sur `officea.localhost:5173` → montrer qu'elle peut aussi
   naviguer vers `officeb.localhost:5173` **sans se reconnecter** (preuve du pari n°2 :
   identité partagée à travers de vrais sous-domaines)
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
- **Tests** : `backend/datarooms/tests.py` couvre la plomberie multi-tenant (15 tests :
  ContextVar, normalisation d'alias, matrice `allow_migrate` (dont la classification
  partagé/tenant de `office_enabled_modules`, `Dataroom` et `Document`), middleware par
  `Host`, aller-retour/usage-unique des tickets SSO, validateur d'extension de fichier).
  Pièges rencontrés et documentés en
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
- **Pas de `requirements.txt`** : dépendances Python installées uniquement dans
  `backend/.venv` (venv Windows), rien de figé/reproductible pour l'instant.
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

## État actuel du POC

- [x] Squelette Django/React connecté (endpoint `ping`, CORS configuré)
- [x] Modèles `Module`, `Office`, `OfficeMembership` (base `default`, partagés) +
      `Dataroom`/`Document` (base tenant, isolation physique vérifiée le 26/08/2026)
- [x] Admin Django avec toggle de modules par office (`filter_horizontal`)
- [x] Auth par session Django (`login`, `my-offices`, `tenant-config`, `modules/coffre-fort`
      — tous protégés par `IsAuthenticated` + vérification d'appartenance à l'office)
- [x] Frontend : formulaire de connexion, sélecteur d'office filtré par accès réel,
      affichage conditionnel de module, couleur appliquée dynamiquement via variable CSS.
      Nav minimale ajoutée le 26/08/2026 (Accueil/Datarooms/boutons de module, nom
      d'utilisateur affiché via nouvel endpoint `GET /api/whoami/`) — état de vue local
      (`useState`), pas de React Router. Toujours pas de styling poussé (volontaire,
      attend les maquettes).
- [x] Migrations + seed de démo (base `default`) — fait le 26/08/2026
- [x] **Migration vers une base SQLite par office** (routeur de base de données) — fait le
      26/08/2026 (`datarooms/tenancy/`) ; isolation physique prouvée avec de vraies
      données métier (`Dataroom`) le 26/08/2026 (voir "État réel du code")
- [x] **Vrai routage par sous-domaine** (`*.localhost`) avec identité partagée sans
      reconnexion — fait le 26/08/2026, via échange de ticket signé plutôt qu'un cookie
      de domaine partagé (rejeté par les navigateurs — voir "État réel du code")
- [ ] Logo dynamique par office (la couleur est câblée, pas encore le logo)
- [x] Arborescence de dataroom minimale (créer / uploader / naviguer) — API backend
      faite le 26/08/2026, **UI faite le 26/08/2026** : écran « Datarooms » (liste +
      création par nom), écran détail (liste des documents + dépôt par glisser-déposer
      ou bouton « Parcourir », les deux passent par la même fonction d'upload). Vérifié
      de bout en bout via l'automatisation Chrome (pas seulement `curl`) : création
      d'une dataroom, upload d'un fichier accepté, bascule d'office via le ticket SSO
      avec la nouvelle UI, toggle d'un module depuis `/admin/` répercuté en direct dans
      la nav sans redémarrage. Pas de hiérarchie de dossiers (une dataroom reste un
      conteneur plat de documents) — pas demandé, cohérent avec « un seul type de
      dataroom ».
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
conformité DSN/RGPD, les 3 types de dossier distincts, la duplication de dossier entre
offices. Tous documentés dans le document de vision pour le chiffrage MOE, mais non
traités ici.

**Écart assumé le 26/08/2026** : « vrai stockage S3 » figurait ici à l'origine — ce
n'est plus le cas. Décision explicite de l'utilisateur : le stockage des `Document` est
passé à MinIO (S3-compatible) via `django-storages`/`boto3`, voir « État réel du code ».
Toujours pas de vrai AWS S3 (MinIO local, sans persistance ni durcissement production),
mais l'abstraction de stockage n'est plus « hors périmètre » comme axe technique.

## Pour Claude Code

Lancer `/init` après avoir scanné le code existant pour compléter ce fichier avec les
détails d'implémentation réels (structure de fichiers exacte, éventuelles divergences
avec ce qui est décrit ici). Consulter aussi `docs/reference-v1/` pour la fidélité visuelle.
Garder ce fichier à jour au fil du POC, en particulier les sections « État actuel » et
« Backlog » — c'est la mémoire de travail du projet, pas un document figé.
