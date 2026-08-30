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
- `AccessRestriction` : quatrième modèle métier tenant (fait le 28/08/2026) — même
  patron que `Dataroom`/`Folder`/`Document` (absent de `SHARED_MODELS`). Restreint
  l'accès à UN Dataroom, Folder ou Document précis (`OneToOneField` nullable vers
  chacun des trois, exactement un renseigné par ligne — invariant appliqué au niveau
  applicatif, pas par contrainte SQL) à une liste d'utilisateurs. `user_ids`
  (`JSONField`, liste d'entiers) référence les utilisateurs par id simple — pas de
  `ForeignKey` vers `User` (base `default`, cross-DB impossible avec ce mécanisme,
  même contrainte que `Dataroom` → `Office`). Héritage par la hiérarchie : une
  restriction sur un `Folder` s'applique à tout son contenu imbriqué sauf si un niveau
  plus profond porte sa propre restriction — c'est la restriction la PLUS PROCHE qui
  s'applique (pas de fusion de plusieurs restrictions le long de la chaîne), voir
  `views._nearest_restriction`/`_user_can_access`. Absence de restriction sur toute la
  chaîne = accès ouvert à tout membre de l'office (comportement par défaut, inchangé).
  Une liste `user_ids` vidée supprime la ligne plutôt que de la laisser vide (voir
  `views._set_restriction`) : repasser par « aucune restriction » plutôt qu'une ligne
  « restreint à personne ».
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

`carla` a un dispositif TOTP **déjà confirmé** (secret fixe préconfiguré par
`seed_demo`, pas d'enrôlement à faire en démo) — voir Commandes pour générer un code
valide au moment de la présentation. `alice` et `bob` n'ont pas de dispositif : leur
premier login demande un enrôlement (QR code).

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
  - **⚠️ Régression assumée — UI de gestion des utilisateurs et de contrôle d'accès
    disparue** : l'ancien `App.tsx` avait une `UsersPage` complète (liste/rôles/
    création/rattachement) et un panneau "Accès" par dossier/document/dataroom
    (entrées du 27/08/2026 et 28/08/2026 ci-dessus). Ces écrans n'existent **plus**
    dans le nouveau frontend — remplacés par du code du collègue qui ne les avait
    jamais eus. Le backend est intact (endpoints inchangés, testés), et les hooks
    (`useAccessRestrictions`, `useOfficeUsers`) sont prêts côté front, mais il n'y a
    aujourd'hui aucun écran pour les consommer. À reconstruire dans un chantier
    séparé sur le modèle de ce qui a été fait ici pour Datarooms/dossiers (composer
    depuis les organismes existants, pas réinventer).
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
      vs. régressé (UI utilisateurs/accès, voir plus bas).
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
- [x] Contrôle d'accès par utilisateur sur Dataroom/Folder/Document, avec héritage —
      **backend fait le 28/08/2026** : modèle `AccessRestriction` (base tenant,
      quatrième modèle métier après Dataroom/Folder/Document), accès ouvert par
      défaut à tout l'office, restriction ponctuelle par admin/superadmin à un
      niveau précis, héritée par le contenu imbriqué (la restriction la plus proche
      dans la hiérarchie l'emporte, pas de fusion), visibilité de chemin
      (`_subtree_has_accessible_content`/`_level_visible`) calculée à chaque requête,
      lecture seulement (la création/l'upload restent gatés par l'accès direct
      seul). **UI reconstruite le 30/08/2026** : modale
      `organisms/AccessRestrictionModal.tsx`, ouverte depuis trois points de
      `DataroomDetailScreen` — bouton « Accès du dossier » (niveau dataroom),
      « Accès du sous-dossier » (dossier affiché), et une action cadenas sur chaque
      ligne de document. La modale dit à l'écran les deux règles du backend que
      l'interface pourrait faire mentir : aucune case cochée = accès OUVERT à toute
      l'étude (et non « personne »), et la restriction la plus proche l'emporte,
      le contenu imbriqué en héritant. Le nœud racine de l'explorateur étant
      synthétique (`ROOT_NODE_ID`, pas un Folder côté serveur), y demander les accès
      est ramené au niveau dataroom (`toAccessTarget` dans App.tsx). L'onglet
      « Restrictions » par utilisateur (`useAccessRestrictionsList`,
      `GET /api/access-restrictions/`) n'est **pas** reconstruit : le hook reste sans
      écran consommateur. **Vérifié : `tsc -b` et `check:ds` ; pas encore exercé
      dans un navigateur réel** (même raison que ci-dessus).
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

Q&A (y compris ses réglages fins vus en V1 : modération, plages horaires...), templates,
notion de portefeuille, audit trail / historique, facturation, conformité DSN/RGPD, les
3 types de dossier distincts, la duplication de dossier entre offices. Tous documentés
dans le document de vision pour le chiffrage MOE, mais non traités ici.

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

## Pour Claude Code

Lancer `/init` après avoir scanné le code existant pour compléter ce fichier avec les
détails d'implémentation réels (structure de fichiers exacte, éventuelles divergences
avec ce qui est décrit ici). Consulter aussi `docs/reference-v1/` pour la fidélité visuelle.
Garder ce fichier à jour au fil du POC, en particulier les sections « État actuel » et
« Backlog » — c'est la mémoire de travail du projet, pas un document figé.
