# Journal du projet — Espace Notarial

Historique détaillé, jour par jour, des chantiers, décisions techniques, pièges
rencontrés et vérifications effectuées sur ce projet. Extrait de `CLAUDE.md` le
04/09/2026 (le fichier avait atteint ~226 Ko / 3000 lignes, entièrement rechargé à
chaque tour de conversation par tout futur agent — devenu trop coûteux à porter comme
contexte par défaut).

**`CLAUDE.md` (racine du projet) reste la référence pour l'état ACTUEL** — commandes,
architecture, modèle de données, ce qui est fait vs. restant à faire, scope in/out. Ce
fichier-ci ne sert qu'à retrouver *comment* et *pourquoi* on en est arrivé là : le détail
d'un chantier passé, le raisonnement derrière une décision, ou un piège déjà rencontré et
sa solution — à consulter à la demande, pas à charger par défaut.

Ordre chronologique, du plus ancien au plus récent. Les renvois internes (« voir État
réel du code », « voir État actuel du POC ») datent d'avant cette extraction : « État
réel du code » = ce fichier ; « État actuel du POC » = la section « État actuel » de
`CLAUDE.md`.

---

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

- **✅ Fait le 03/09/2026 — Template devient un tableau direct (plus
  d'Explorer), troncature des puces d'utilisateurs nommés + popup, Dataroom
  inchangé** : redesign issu de plusieurs allers-retours avec l'utilisateur
  en mode plan (voir le fil de conversation) — la demande initiale
  ("fusionner Arborescence et Droits d'accès en un panneau qui suit la
  sélection") a été réajustée en cours de route : l'utilisateur voulait au
  contraire que les droits de CHAQUE dossier soient visibles EN PERMANENCE,
  sans sélection préalable — d'où un tableau (comme l'ancien
  `AccessRightsTable`, jamais remplacé) plutôt qu'un panneau qui ne montre
  qu'un élément à la fois. Décision finale, qui fait foi :
  - **`AccessRightsTable.tsx`** : gardé et étendu, PAS supprimé — c'est lui
    qui porte le même visuel entre Template et Dataroom. Deux nouvelles
    props optionnelles : `renderRowBadges` (pastilles insérées après le
    libellé — Template uniquement) et `renderRowActions` (colonne "Actions"
    finale, affichée seulement si fournie — Template uniquement ; Dataroom
    ne passe ni l'une ni l'autre, donc **rigoureusement inchangé** dans son
    onglet "Droits d'accès", qui reste, lui, en place tel quel : une
    dataroom a des PIÈCES en plus des dossiers, qui restent des lignes
    `kind: 'document'` du même tableau — jamais des nœuds d'arbre, donc pas
    concernées par la disparition de l'Explorer côté Template).
  - **`components/organisms/NamedUsersEditor.tsx`** (nouveau) : remplace le
    contenu de la cellule "Utilisateurs nommés" dans `AccessRightsTable`,
    utilisé identiquement par les deux écrans. Ligne visible
    (`display:flex; flex-wrap:nowrap`) ne montrant que les puces qui
    tiennent dans la largeur RÉELLE du conteneur (mesurée via
    `ResizeObserver` sur un `<div style="width:100%">`, recalculée au
    montage et à chaque redimensionnement — jamais un seuil de nombre de
    puces codé en dur) ; le reste devient un bouton "+N autres…" qui ouvre
    une `Modal` listant TOUS les userIds (puces retirables + son propre
    `<Select>` d'ajout, partageant le même état que la ligne tronquée — un
    ajout/retrait dans la popup se reflète donc immédiatement dans le
    tableau une fois la popup fermée, vérifié en Chrome réel). Le
    `<Select>` "+ Ajouter…" du tableau, lui, reste TOUJOURS visible sous les
    puces, jamais tronqué. Algorithme de mesure : une ligne cachée
    (`position:'fixed', top:-10000, left:-10000` — hors flux, aucun risque
    de scroll parasite, contrairement à un `position:absolute` dans un
    ancêtre non maîtrisé) contient TOUTES les puces + une puce factice
    "+N…" pour réserver la largeur du bouton d'overflow ; si la somme de
    TOUTES les puces tient sans réserver cette largeur, rien n'est tronqué.
    Piège déjà documenté ailleurs dans ce fichier (`DashboardGrid.tsx`,
    `WidthProvider`) appliqué ici aussi : l'observation se fait dans un
    `useLayoutEffect` standard (`observe`/`disconnect` dans le cleanup), pas
    un callback de montage one-shot, pour rester correct sous le double
    montage de `<StrictMode>`.
  - **`access/templateVisibility.ts`** gagne `computeRoleBadgesByFolderId`
    (nouvelle fonction exportée, colocalisée avec `visibleRolesFor`) :
    encapsule tout le parcours d'arbre nécessaire pour calculer, à partir du
    DRAFT courant (pas nécessairement enregistré), les rôles pour lesquels
    chaque dossier serait visible une fois le modèle appliqué — indexé par
    id de LIGNE du tableau (`"folder:<id>"`). Remplace `toVisibilityNodes`/
    la marche par id qui vivaient auparavant à l'intérieur de
    `TemplateDetailScreen.tsx` (l'écran n'a plus besoin de connaître la
    forme de l'arbre, il ne reçoit plus que des lignes déjà aplaties).
  - **`components/pages/TemplateDetailScreen.tsx`** entièrement réécrit,
    redevenu un pur composant de présentation (comme avant le chantier des
    droits) : plus d'`Explorer`, plus de `DocPanel`, plus de toggle
    Arborescence/Droits d'accès. Nouvelles props : `rows` (déjà aplati +
    fusionné au brouillon par App.tsx, même forme que Dataroom),
    `officeUsers`, `onChangeRow`, `rowBadges`, `onCreateRootFolder` (bouton
    persistant "+ Nouveau dossier" à la racine), `onCreateFolder`/
    `onRenameFolder`/`onDeleteFolder` (déclenchés PAR LIGNE via
    `renderRowActions` — icônes `i-plus`/`i-dots`/`i-x`, toutes trois déjà
    existantes dans `IconSprite.tsx`, aucune nouvelle icône ajoutée),
    `accessSaveBar` (la barre Enregistrer/Annuler, contenu inchangé,
    simplement déplacée au-dessus du tableau). Le menu "⋮" de renommage
    reste séparé des droits (ouvre toujours `RenameFolderModal`, inchangé).
  - **`App.tsx`** : `flattenDataroomAccessRows`/`dataroomAccessRows`/
    `dataroomAccessTableRows` inchangés (toujours utilisés par l'onglet
    Dataroom). `flattenTemplateAccessRows`/`templateAccessRows` GARDÉS
    (servent encore à construire `templateRowBadges` via
    `computeRoleBadgesByFolderId`) ; seul `templateAccessTableRows` reste
    tel quel mais change de destination (alimente directement l'écran au
    lieu d'un mode parmi deux). `toTemplateTreeNodes`/`templateTreeNodes`
    (conversion vers `TreeNodeData`, qui n'a plus de consommateur une fois
    l'Explorer retiré de Template) supprimés ; les 3 usages de
    `findFolderLabel(templateTreeNodes, ...)` remplacés par un nouveau
    petit helper `templateFolderLabel(rows, folderId)`, qui lit directement
    le libellé dans la rangée plate (plus besoin de parcourir un arbre pour
    un simple lookup par id). Bloc Dataroom (JSX) **rigoureusement
    inchangé**.
  - **Vérifié en Chrome réel** (`carla`, superadmin, `officea.localhost`,
    template "Vente immobilière — standard", 14 rubriques) : tableau direct
    sans arbre, chaque ligne affiche déjà ses pastilles de visibilité sans
    clic ; bouton "+" d'une ligne ouvre bien "Nouveau dossier — Dans :
    <ligne>" ; "⋮" ouvre le renommage seul ; icône de suppression retire la
    ligne (+ ses enfants) après confirmation ; cocher "Client" sur une ligne
    profonde propage en direct les pastilles "A M C" sur TOUS ses parents
    dans le tableau (même mécanique de visibilité de chemin qu'avant,
    maintenant visible sans navigation) ; ajout de 4 utilisateurs nommés à
    une ligne puis réduction forcée de la largeur du conteneur (`maxWidth`
    injecté en test) déclenche bien "+4 autres…", la popup liste les 4,
    retirer un utilisateur dans la popup met à jour "+N autres…" AVANT même
    la fermeture de la popup ; `Annuler` réinitialise tout le brouillon (y
    compris les lignes touchées par erreur) ; un `Enregistrer` réel suivi
    d'un rechargement complet de page confirme la persistance côté serveur
    (vérifié aussi par inspection directe de `TemplateFolder.allowed_roles`
    en shell Django) ; l'onglet "Droits d'accès" d'une vraie dataroom
    (`Folder Test Dataroom`) reste identique à avant ce chantier — mêmes
    lignes dossier/pièce, pas de colonne Actions, pas de pastilles. Aucune
    erreur console sur les deux écrans. Données de test nettoyées après
    vérification (dossier de test supprimé, case cochée pour le test de
    persistance revertée et resauvegardée).
  - **Vérifications automatisées** : `tsc -b` (0 erreur), `npm run lint` (0
    erreur, aucun nouvel avertissement), `npm run check:ds` (189 fichiers,
    aucun écart nouveau), `npm run build` (sans erreur). `python manage.py
    test` — **165/165 tests verts**, aucun changement backend dans ce
    chantier (redesign frontend pur, les endpoints `/api/.../access/`
    existants suffisent tels quels).

- **✅ Fait le 03/09/2026 (plus tard dans la journée) — pastilles A/M/C
  retirées côté Template, case de rôle grisée par héritage étendue à une
  vraie dataroom** : deux ajustements demandés sur l'entrée juste au-dessus,
  le jour même.
  - **Pastilles retirées** : `renderRowBadges`/`rowBadges` disparaissent
    entièrement d'`AccessRightsTable.tsx`/`TemplateDetailScreen.tsx` — jugées
    redondantes avec les cases à cocher elles-mêmes, qui portent désormais le
    même renseignement directement (voir point suivant).
  - **Case de rôle grisée par héritage, plutôt qu'une pastille séparée** :
    remplace le mécanisme de pastilles pour Template ET l'étend pour la
    première fois à Dataroom (qui n'avait jusqu'ici AUCUN affichage
    d'héritage). Donner un rôle à un sous-dossier ou une pièce coche
    désormais **aussi** ce rôle, à l'affichage, sur TOUS ses parents dans le
    tableau — transitivement jusqu'à la racine (le `Template` ou la
    `Dataroom` elle-même) — la case correspondante y apparaît cochée et
    **désactivée** (`disabled`, infobulle "Accordé par un sous-dossier ou une
    pièce — modifiable là où il est réellement accordé").
  - **Sémantique volontairement différente de `_user_can_access`/
    `_level_visible` côté serveur** — confirmé explicitement avec
    l'utilisateur avant implémentation ("tant que cela ne bloque rien sur les
    droits d'accès derrière") : ce calcul est un **pur affichage côté
    client**, recalculé à chaque rendu depuis le brouillon courant
    (`useAccessRightsDraft`), **jamais écrit** sur la ligne parente qui
    l'affiche — décocher la ligne enfant fait disparaître le grisé du parent
    immédiatement, sans aucun appel réseau dans les deux sens. N'imite PAS le
    défaut serveur "aucune restriction nulle part = accès ouvert" (voir
    l'entrée du 01/09/2026 sur `_user_can_access`) : seule une case
    **explicitement cochée** quelque part dans le sous-arbre compte ici — un
    parent sans aucun descendant ayant de rôle explicite ne grise jamais rien
    (le texte d'aide au-dessus du tableau couvre déjà ce défaut serveur, pas
    besoin de le répéter case par case).
  - **`access/effectiveRoles.ts`** (nouveau, remplace entièrement
    `access/templateVisibility.ts`, supprimé) : `subtreeGrants`/
    `effectiveRolesFor`/`computeEffectiveRolesByRowId` (parcours récursif
    générique sur un `RoleTreeNode { id, allowedRoles, children? }`) +
    deux fonctions exportées qui adaptent cet arbre générique aux deux
    formes de données réelles : `templateEffectiveRoles(tree,
    allowedRolesFor)` (à partir de `TemplateFolderTreeNode`) et
    `dataroomEffectiveRoles(tree, rootDocuments, documentsByFolderId,
    allowedRolesFor)` (à partir de `FolderTreeNode` — les pièces sont des
    feuilles, jamais de `children`, la racine synthétique porte l'id
    `"dataroom"`). Les deux renvoient un `Record<rowId, string[]>` — même
    convention d'id que `AccessRightsRow` (`"dataroom"`/`"folder:<id>"`/
    `"document:<id>"`).
  - **`AccessRightsTable.tsx`** : `renderRowBadges` remplacé par
    `effectiveRoles?: (row: AccessRightsRow) => string[]` (optionnelle,
    absente = comportement d'avant, aucune case jamais grisée). Chaque case
    de rôle devient `checked={direct || inherited}`,
    `disabled={inherited}` (`inherited = !direct && effectiveRoles(row).
    includes(role)` — une ligne qui coche elle-même le rôle reste toujours
    éditable, seul l'héritage PUR désactive).
  - **`App.tsx`** : deux nouveaux memos parallèles à
    `templateAccessTableRows`/`dataroomAccessTableRows`, tous deux dérivés du
    même brouillon déjà en place (aucun nouvel état, aucun nouvel appel
    réseau) — `templateEffectiveRolesByRowId` (via `templateEffectiveRoles`)
    et `dataroomEffectiveRolesByRowId` (nouveau pour Dataroom, via
    `dataroomEffectiveRoles`). Branchés respectivement sur
    `<TemplateDetailScreen effectiveRoles={...}>` et sur l'`<AccessRightsTable
    effectiveRoles={row => dataroomEffectiveRolesByRowId[row.id] ?? []}>` de
    l'onglet "Droits d'accès" — **premier changement de ce chantier sur le
    bloc Dataroom**, jusqu'ici rigoureusement intact depuis le 03/09/2026
    (matin) ; limité à l'ajout de cette seule prop, aucune autre modification
    de câblage.
  - **Vérifié en Chrome réel** (`carla`, superadmin, `officea.localhost`) :
    - Template "Dossier de divorce" (3 dossiers racine) : plus aucune
      pastille A/M/C dans "Élément" ; sous-dossier "Bruno" créé sous
      "Conjoint 1", case Admin cochée sur "Bruno" → "Conjoint 1" se coche
      et se grise instantanément (zoom confirmé : case bleue normale sur
      "Bruno", case grisée sur "Conjoint 1"), "Conjoint 2"/"Magistrats"
      non affectés ; clic sur la case grisée de "Conjoint 1" ne fait rien
      (toujours grisée, "Bruno" toujours coché) ; compteur "Enregistrer
      (1)" ne compte QUE la ligne réellement modifiée ("Bruno"), jamais le
      parent grisé par calcul ; "Annuler" restaure les deux lignes à l'état
      d'origine. Dossier de test "Bruno" supprimé après vérification.
    - Dataroom réelle "Succession Dupont" (2 pièces à la racine, pas de
      sous-dossier) : cocher Membre sur la pièce `contrat.pdf` grise
      immédiatement Membre sur la ligne racine "Succession Dupont" (le
      même mécanisme, jamais démontré pour une dataroom avant ce
      chantier), `minio-test.pdf` non affecté ; "Annuler" restaure l'état
      d'origine, rien n'a jamais été enregistré côté serveur.
  - **Vérifications automatisées** : `tsc -b` (0 erreur), `npm run lint` (0
    erreur, aucun nouvel avertissement), `npm run check:ds` (189 fichiers,
    aucun écart nouveau), `npm run build` (sans erreur). `python manage.py
    test` — **165/165 tests verts**, aucun changement backend (chantier
    frontend pur, comme celui du matin).

- **✅ Fait le 03/09/2026 (fin de journée) — un hyperadmin a désormais TOUS
  les droits sur TOUS les offices** (demande utilisateur : "je voudrais que
  les hyperadmin aient tous les droits sur tous les offices") : jusqu'ici,
  `_is_hyperadmin` ne gatait QUE les trois endpoints `/api/hyperadmin/...` et
  la connexion elle-même (déjà permise sur n'importe quel sous-domaine
  d'office, correctif du 01/09/2026) — une fois connecté sur un office
  précis, un hyperadmin s'y comportait comme n'importe quel compte SANS
  `OfficeMembership`, c'est-à-dire refusé partout (`_manager_role`/
  `_user_can_access`/`_can_create_dataroom` et une douzaine de gates
  `user.memberships.filter(office=office).exists()` renvoyaient tous 403/404).
  - **`_effective_role(user, office)`** (`views.py`, nouvelle fonction, juste
    avant `_manager_role`) : rôle réel de l'`OfficeMembership` s'il existe,
    sinon `"superadmin"` pour un hyperadmin (`_is_hyperadmin`), sinon `None`.
    Point d'entrée UNIQUE désormais pour "quel rôle cet utilisateur a-t-il
    sur cet office" — `_manager_role`/`_can_create_dataroom`/
    `_user_can_access` sont réécrites pour l'appeler plutôt que de relire
    `user.memberships` chacune de son côté, pour que le bypass s'applique
    partout de façon identique. **Invariant préservé** : aucune ligne
    `OfficeMembership` n'est jamais créée pour un hyperadmin — le rôle
    `"superadmin"` est calculé à la volée à chaque appel, jamais matérialisé
    en base (vérifié par test, voir plus bas) ; rien ne le distingue donc
    dans l'annuaire d'un office (`office-users`), conformément à la décision
    déjà prise pour `HyperadminAccess` (aucune case "Hyperadmin" nulle part).
  - **`_has_office_access(user, office)`** (nouvelle, juste après) :
    `_effective_role(...) is not None` — remplace directement les ~10
    `user.memberships.filter(office=office).exists()` qui servaient de porte
    d'entrée générique à un endpoint d'office (`tenant_config`,
    `coffre_fort_view`, `_office_member_guard` (tags), `datarooms_view`,
    `documents_view`, `folders_view`, `search_view`,
    `document_content_view`, et le contrôle de connexion dans `login_view`,
    déjà partiellement écrit pour l'exception hyperadmin — simplifié pour
    passer par ce même point d'entrée unique).
  - **`_manager_role`/`_can_create_dataroom`/`_user_can_access`** réécrites
    pour consulter `_effective_role` au lieu de relire `user.memberships`
    directement — comportement inchangé pour tout utilisateur réel (même
    lecture, juste indirectement), mais un hyperadmin y obtient désormais
    `"superadmin"` partout. Conséquence en cascade, SANS AUCUN changement
    dans les ~10 vues qui les appellent déjà (`office_users_view`,
    `attach_office_user_view`, `office_user_detail_view`,
    `dataroom_access_view`/`folder_access_view`/`document_access_view`,
    `access_restrictions_view`, `template*_view`, `folder_detail_view`
    (renommage), `tag_detail_view`, `POST /api/datarooms/`, tout
    `_user_can_access`/`_level_visible`/`_subtree_has_accessible_content`) :
    un hyperadmin passe tous ces gates, et le bypass superadmin déjà
    existant dans `_user_can_access` (02/09/2026) s'applique à lui de la même
    façon — accès inconditionnel même à un contenu dont une restriction
    l'exclurait explicitement de `user_ids`/`allowed_roles`.
  - **`tenant_theme`** (écriture réservée admin/superadmin) adaptée pour lire
    `_effective_role` plutôt qu'un objet `membership.role` — pas de
    changement de comportement pour un vrai membre, hyperadmin peut
    désormais écrire.
  - **Exception délibérée, documentée, non traitée** : `dashboard_view`
    (disposition personnelle de l'écran d'accueil) reste gatée sur un VRAI
    `OfficeMembership` — c'est une préférence PERSONNELLE stockée sur la
    ligne de membership elle-même (`membership.dashboard`), et un hyperadmin
    n'en a structurellement aucune où l'écrire sans violer l'invariant
    ci-dessus. Un hyperadmin qui visite l'écran d'accueil d'un office reçoit
    donc le template par défaut de son rôle sans pouvoir le personnaliser
    pour CET office — le hook front (`useDashboardLayout`) traite déjà tout
    échec de lecture comme "jamais personnalisé" (repli silencieux sur le
    template, pas d'erreur affichée), donc aucune régression visible, juste
    une fonctionnalité de confort qui ne s'applique pas à ce rôle. Pas un
    "droit" au sens de la demande — une préférence d'affichage individuelle.
  - **`issue_sso_ticket` (bascule d'office sans reconnexion) volontairement
    INCHANGÉE** : ce mécanisme sert à un compte avec de VRAIS
    `OfficeMembership` sur plusieurs offices (le scénario carla) de passer de
    l'un à l'autre sans ressaisir ses identifiants — un hyperadmin peut déjà
    se connecter directement sur n'importe quel sous-domaine d'office
    (`login_view`, correctif du 01/09/2026), ce n'est donc pas un mécanisme
    dont il a besoin. Étendre `issue_sso_ticket` à un rôle qui n'apparaît
    dans AUCUNE liste `my-offices` aurait été un chantier séparé, hors
    demande (le sélecteur d'offices de l'AppShell resterait vide pour un
    hyperadmin quoi qu'il arrive, `my-offices` continuant de ne lister que
    les vrais `OfficeMembership`).
  - **Tests** (`HyperadminFullAccessTests`, `datarooms/tests.py`, 4 nouveaux,
    même patron `unittest.TestCase` nu + tenant sqlite dédié que
    `RoleBasedDefaultAccessTests`/`SuperadminAndRoleAccessTests`) : un
    hyperadmin SANS AUCUN `OfficeMembership` contourne une `AccessRestriction`
    qui l'exclut explicitement de `user_ids`/`allowed_roles` sur un dossier
    imbriqué, exactement comme un superadmin
    (`test_hyperadmin_bypasses_access_restriction_like_superadmin`) ; passe
    les endpoints gatés `_manager_role` — liste les membres de l'office (y
    compris son superadmin), crée même un membership `role="superadmin"`
    (confirme que `_effective_role` vaut bien `"superadmin"` et pas
    seulement `"admin"`), gère les droits d'accès d'une dataroom
    (`test_hyperadmin_passes_manager_gated_endpoints`) ; peut créer une
    dataroom (`test_hyperadmin_can_create_dataroom`) ; et, régression de
    contrôle de l'invariant, aucune de ces actions ne crée de ligne
    `OfficeMembership` réelle pour le hyperadmin
    (`test_hyperadmin_gains_no_real_office_membership`). Suite complète
    relancée : **169/169 tests verts** (165 existants + 4 nouveaux, aucune
    régression).
  - **Vérifié aussi en Chrome réel** (compte `hyperadmin`, dispositif TOTP déjà
    confirmé dans cet environnement) : connexion directe sur
    `officea.localhost:5173` (pas `hyperadmin.localhost`) → shell normal de
    l'office (`AppShell`, pas l'app hyperadmin séparée) ; « Annuaire de
    l'étude » affiche les 4 membres réels d'Office A, carla comprise avec son
    rôle superadmin — et `hyperadmin` lui-même N'Y APPARAÎT PAS (invariant
    confirmé visuellement, pas seulement par test) ; « Dossiers » affiche les
    6 datarooms réelles de l'office, bouton « Nouveau dossier » disponible ;
    Personnalisation → onglet Template (gate `_manager_role`) charge les 3
    modèles réels de l'office sans erreur. Déconnexion en fin de vérification
    (ferme toutes les sessions, comportement du 02/09/2026, inchangé ici).

- **✅ Fait le 03/09/2026 (fin de journée) — quatre éléments repris de
  `origin/front/templates-hyperadmin-ui`** : branche du collègue, divergée au
  même point que la dernière fusion (`02a97e5`), examinée à la demande de
  l'utilisateur ("est-ce qu'il y a des éléments intéressants à récupérer sur
  ma branche ?"). Beaucoup de son contenu fait double emploi avec le travail
  déjà fait ici en parallèle (leur "console Notantis"
  `HyperadminScreen.tsx`/`TemplateEditorModal.tsx` refont, en moins découplé,
  ce que `hyperadmin.localhost` + `TemplatesListScreen`/`TemplateDetailScreen`
  font déjà, testé en Chrome) — non repris. Quatre éléments COMPLÉMENTAIRES
  retenus, un par un plutôt qu'en bloc :
  - **Logo par office** (dernier morceau de la « marque grise », leur commit
    "Logo par office, dernier morceau de la marque grise", 02/09/2026) —
    comblait un trou déjà documenté ici (case non cochée dans "État actuel du
    POC"). `PATCH /api/tenant-config/` accepte désormais `name`/`logo`
    (multipart, réservé admin/superadmin — même porte que `tenant_theme`) et
    `GET /api/tenant-logo/` relaie le fichier (jamais servi depuis MinIO
    directement : son URL est en http quand l'app est en https, contenu mixte
    bloqué — même raison que `document_content_view`). `Office.logo_url`
    porte une CLÉ de stockage, pas une URL (`URLField` réutilisé tel quel,
    volontairement PAS de migration vers un vrai `FileField` — une migration
    poussée juste avant une fusion est ce qui a déjà coûté deux rattrapages de
    bases, voir plus bas dans ce fichier) ; la conversion clé → URL servable
    se fait à la frontière de l'API (`_logo_public_url`, suffixe aléatoire
    dans `?v=` pour invalider le cache navigateur à chaque remplacement). Un
    SVG déposé est neutralisé par CSP (`default-src 'none'`) + `nosniff` sur
    le relais — ouvert directement dans un onglet, il s'exécuterait sinon sur
    l'origine de l'API. `validators.py` gagne `LOGO_EXTENSIONS`/
    `LOGO_MAX_BYTES` (2 Mio)/`LOGO_CONTENT_TYPES`/`logo_extension()`,
    volontairement plus étroit qu'`ACCEPTED_EXTENSIONS` (un logo est une
    image affichée, pas une pièce à archiver). **Seule adaptation par rapport
    à la branche d'origine** : gate réécrit sur `_effective_role` au lieu
    d'un `membership.role` brut, pour qu'un hyperadmin (aucun
    `OfficeMembership` réel, voir plus haut le 03/09/2026 matin) puisse aussi
    modifier l'identité de n'importe quel office — conflit textuel réel avec
    `tenant_config`, déjà modifiée le jour même pour la même raison, fusionné
    à la main plutôt que par cherry-pick direct. `IdentityTab.tsx` reprise à
    l'identique (elle n'avait pas divergé de la version d'origine du
    collègue) — aperçu du logo enregistré/du fichier choisi avant envoi,
    bouton « Retirer », gagne `readOnly`/`readOnlyNote` (même pattern déjà
    utilisé par `ModulesTab.tsx`). Câblée dans `App.tsx` via un nouveau
    `saveIdentity()` qui appelle `session.refresh()` après écriture plutôt
    qu'une mise à jour locale de `session.tenant` : un renommage change aussi
    le `name` que `currentOffice` (ligne ~770) recherche dans
    `session.offices`, un rafraîchissement complet évite que ce rapprochement
    se désynchronise après un renommage (au prix d'un bref écran de
    chargement, déjà le comportement après la MFA). 9 tests repris
    (`TenantLogoApiTests`, stockage `FileSystemStorage` de test via
    `override_settings`, pas de dépendance à un MinIO qui tourne).
    **Non vérifié en conditions réelles (MinIO) dans cette session** — Docker
    n'est pas disponible dans cet environnement (`docker ps` échoue,
    `Docker Desktop.exe` absent) : le dépôt réel d'un fichier a été tenté en
    Chrome (upload simulé via `DataTransfer` sur l'input caché du
    `Dropzone`, `file_upload` du MCP refusant les chemins hors de son
    allow-list) et est resté bloqué en `pending` (PATCH qui attend une
    connexion à `localhost:9000` qui n'existe pas) jusqu'à un `Failed to
    fetch` côté navigateur — comportement attendu de l'ABSENCE de MinIO, pas
    un bug du code (`office.logo_url` confirmé toujours vide après coup,
    aucune écriture partielle). L'enregistrement du NOM SEUL (ne touche pas
    `default_storage`) a en revanche été vérifié de bout en bout en Chrome
    réel (`alice`, admin sur `officea.localhost`) : `PATCH` réussi, valeur
    relue immédiatement via `/api/tenant-config/`, reverti après
    vérification. À revérifier avec le dépôt réel d'un logo la prochaine fois
    que MinIO tourne dans cet environnement.
  - **Dispositif TOTP préconfiguré pour `hyperadmin`** (`seed_demo.py`, même
    `DEMO_TOTP_KEY` que carla) — sans lui, `dev.ps1 totp` ne sortait pas de
    code pour ce compte sur une base fraîchement semée, premier login
    exigeait un enrôlement QR code. `get_or_create` ne réécrit pas un
    dispositif déjà présent (sans effet sur CET environnement, où
    `hyperadmin` a déjà un dispositif confirmé posé manuellement lors d'une
    session précédente).
  - **`is_hyperadmin` exposé sur `/api/whoami/`** — absent jusqu'ici de toute
    réponse malgré le rôle transverse (`HyperadminAccess`). Utilisé ici pour
    un détail cosmétique repéré en Chrome dans la session du matin même : un
    hyperadmin browsant un sous-domaine d'office (il y a désormais tous les
    droits, voir plus haut) affichait « — » puis « Membre » en repli dans la
    sidebar, faute de rôle réel — remplacé par « Hyperadmin » quand
    `session.user.is_hyperadmin` est vrai et qu'aucun `OfficeMembership` ne
    donne de rôle réel (`App.tsx`, `officeRole`/`userRole` de `AppShell`).
  - **Correctif indépendant, trouvé en marge de la revue** : leur commit
    "Corrections issues du passage en navigateur réel" (02/09/2026) notait un
    défaut non corrigé, antérieur à leur propre lot : l'écran d'enrôlement
    MFA affiche le secret de saisie manuelle en HEXADÉCIMAL
    (`device.key` brut, `mfa_setup`) là où une application d'authentification
    attend du BASE32 (le QR code, lui, fonctionne — il encode `config_url`,
    pas cette valeur directement). Vérifié : le même bug existe dans ce
    code, partagé et non touché par la duplication d'UI entre les deux
    branches. Corrigé ici (`mfa_setup`, GET) :
    `base64.b32encode(device.bin_key).decode('ascii')` au lieu de
    `device.key`. Aucun test ne couvrait le FORMAT du secret avant ce
    correctif (`valid_code_for` traite déjà tout comme du hex, donc rien
    n'aurait détecté l'écart) — `test_enrollment_flow` gagne une assertion
    dédiée (`base64.b32decode(secret) == device.bin_key`) et sa conversion
    du secret pour calculer un code de test valide.
  - **Tests ciblés relancés pour ce lot uniquement** (pas la suite complète,
    sur demande explicite — "tu lanceras tous les tests quand je te le
    dirai") : `TenantLogoApiTests` (9), `MfaLoginFlowTests` (9, dont le
    correctif base32 et la régression whoami — `test_sso_ticket_consumption_
    never_triggers_mfa` attendait une égalité stricte sur le corps de
    `/api/whoami/`, mise à jour pour inclure `is_hyperadmin: False`),
    `TenantThemeApiTests` (11, classe voisine de `TenantLogoApiTests`,
    relancée par prudence bien qu'non touchée) — **29/29 verts**.
    `tsc -b`, `npm run lint` (0 nouvel avertissement), `npm run check:ds`
    (189 fichiers, 0 écart nouveau), `npm run build` — tous clean. **La
    suite backend complète n'a PAS été relancée dans cette session** (169
    tests avant ce lot, +9 logo = 178 attendus) — à faire au prochain « lance
    tous les tests ».

- **✅ Prototype validé le 03/09/2026 — un office créé en direct depuis la
  console hyperadmin pourra être rejoint immédiatement, sans redémarrage ni
  avertissement TLS** : suite à la discussion sur la création d'office
  "au nom que l'on souhaite" pendant une démo (voir fil de conversation).
  Constat de départ : `hyperadmin_offices_view` crée déjà un vrai `Office`
  + provisionne sa base tenant + crée le premier admin (fait le 01/09/2026,
  inchangé) — le blocage n'était jamais applicatif, seulement le certificat
  HTTPS local (mkcert), qui ne couvrait que `officea`/`officeb`/`hyperadmin`
  explicitement (le `*.localhost` wildcard qu'il contient déjà ne sert à
  rien, rejeté par Chrome — restriction Public Suffix List déjà documentée
  ci-dessus, 26/08/2026).
  - **Piste retenue pour le prototype** : un wildcard cert un cran plus bas,
    `*.office.localhost`, plutôt qu'un `*.localhost` direct — la restriction
    PSL vise spécifiquement un wildcard *directement* sur un nom réservé à un
    seul label (`localhost`), pas un wildcard un niveau plus bas. Un office
    créé en direct vivrait donc sous `<nom-choisi>.office.localhost` (pas
    encore câblé dans le code de création — voir "Reste à faire" plus bas) ;
    `officea`/`officeb`/`hyperadmin` garderaient leur forme actuelle,
    inchangée.
  - **Certificat régénéré EN PLACE** (mêmes noms de fichiers
    `localhost+5.pem`/`localhost+5-key.pem`, donc aucun changement à
    `vite.config.ts`/`dev.ps1`) :
    ```
    mkcert -cert-file localhost+5.pem -key-file localhost+5-key.pem \
      localhost "*.localhost" officea.localhost officeb.localhost \
      hyperadmin.localhost "*.office.localhost" 127.0.0.1 ::1
    ```
    mkcert n'émet PAS son avertissement "many browsers don't support
    second-level wildcards" pour `*.office.localhost` (seulement pour
    `*.localhost`) — premier signe encourageant, confirmé ensuite en Chrome
    réel. **⚠️ Correction — `.gitignore` contient bien `*.pem`, mais ça n'a
    aucun effet ici** : une règle `.gitignore` ne s'applique jamais à un
    fichier DÉJÀ suivi par git (elle empêche seulement l'AJOUT d'un nouveau
    fichier qui matche, elle ne retire rien) — `localhost+5.pem`/
    `localhost+5-key.pem` avaient été commités avant l'ajout de cette règle
    (pratique déjà en place, antérieure à ce chantier) et continuent donc
    d'apparaître modifiés dans `git status` après chaque régénération,
    `.gitignore` ou pas. `git rm --cached` les sortirait du suivi pour de bon
    si c'est le comportement voulu — pas fait ici, décision qui appartient à
    l'utilisateur.
  - **⚠️ Deuxième blocage trouvé, absent de la discussion initiale —
    `CORS_ALLOWED_ORIGIN_REGEXES`** (`config/settings.py`) n'autorisait
    qu'un seul label optionnel avant "localhost"
    (`r"^https://[a-z0-9-]*\.?localhost:5173$"`) — un sous-domaine à deux
    labels comme `notaires-durand.office.localhost` n'y passait pas. Le
    symptôme en Chrome réel était trompeur : la page se chargeait bien (TLS
    accepté, confirmant le wildcard), mais chaque appel API échouait en
    « Backend injoignable — Failed to fetch » sans la moindre ligne dans la
    console — diagnostiqué en comparant un `curl` direct (200/403 propres)
    à une requête `OPTIONS` de préflight avec un `Origin` réaliste (`curl
    -X OPTIONS ... -H "Origin: https://notaires-durand.office.localhost:5173"`) :
    réponse 200 mais **sans aucun en-tête `Access-Control-Allow-*`** — le
    middleware `corsheaders` n'avait simplement pas reconnu l'origine, donc
    Django traitait la requête normalement mais le NAVIGATEUR bloquait la
    lecture de la réponse en silence. Corrigé en élargissant le regex à N
    labels : `r"^https://([a-z0-9-]+\.)*localhost:5173$"`. Reconfirmé par le
    même test `curl -X OPTIONS` (tous les en-têtes CORS présents ensuite) et
    re-vérifié qu'`officea`/`officeb`/`hyperadmin` (régression) ainsi qu'une
    origine extérieure arbitraire (`https://evil.example.com`, toujours
    refusée) se comportent comme avant.
  - **Aucun changement nécessaire côté `ALLOWED_HOSTS`** (`['.localhost']` —
    le préfixe par point de Django matche déjà n'importe quelle profondeur
    de sous-domaine) **ni `TenantResolutionMiddleware`** (`host.split(".")[0]`
    — ne prend que le PREMIER label quel que soit le nombre de labels
    suivants, donc `notaires-durand.office.localhost` résout déjà vers
    l'`Office` de subdomain `"notaires-durand"`, sans aucune modification :
    le `.office.` supplémentaire dans l'URL n'a besoin d'exister nulle part
    en base, uniquement dans le nom d'hôte demandé au navigateur).
  - **Boucle complète vérifiée en Chrome réel**, pas seulement le TLS seul :
    un office de test (`another-test`, admin `wildcard_test_admin`) créé via
    le shell Django (reproduisant exactement ce que fait
    `hyperadmin_offices_view` : `Office.objects.get_or_create` +
    `ensure_tenant_registered`/`migrate` + `OfficeMembership`) — connexion
    complète sur `https://another-test.office.localhost:5173` : écran de
    connexion (sous-domaine affiché correctement), enrôlement MFA (QR code +
    secret en BASE32 propre, confirmant au passage le correctif du
    03/09/2026 matin), code calculé et validé, arrivée sur l'accueil de
    l'office avec le bon nom affiché. Aucun avertissement TLS à aucune
    étape. Données de test supprimées après coup (Office, membership,
    utilisateur, dispositif TOTP, base tenant).
- **✅ Câblé le 03/09/2026 (même journée, juste après le prototype) — la
  console hyperadmin permet réellement de créer un office et de s'y
  connecter dans la foulée** : suite explicite du prototype ci-dessus, à la
  demande de l'utilisateur ("mets en place de manière concrète la création
  d'un office"). `hyperadmin_offices_view`/`Office.subdomain` restent
  INCHANGÉS côté backend — la valeur stockée reste le nom nu tapé par
  l'hyperadmin (ex. `"notaires-guerin"`), exactement comme avant le
  prototype : `TenantResolutionMiddleware` n'a jamais eu besoin d'en savoir
  plus (voir plus haut), donc rien à migrer, rien à ajouter au modèle
  `Office`. Tout le changement est côté FRONTEND, purement dans la façon de
  CONSTRUIRE l'URL affichée/cliquable pour un office donné.
  - **`frontend/src/hyperadmin/officeUrl.ts`** (nouveau) : une seule
    fonction exportée, `officeLoginUrl(subdomain) =>
    "https://${subdomain}.office.localhost:5173/"`. Volontairement calculée
    côté client à partir de `subdomain` (déjà connu du front), pas renvoyée
    par l'API — aucune donnée serveur nouvelle nécessaire, c'est une pure
    construction de chaîne déterministe.
  - **`components/pages/HyperadminOfficesScreen.tsx`** : la colonne
    "Sous-domaine" du tableau n'affiche plus le sous-domaine en texte brut
    — c'est désormais un vrai lien (`<a target="_blank">`, icône `link`)
    vers `officeLoginUrl(office.subdomain)`, pour LES TROIS offices
    existants (`officea`/`officeb`/le office de test) aussi bien qu'un
    office fraîchement créé : le middleware ne regardant que le premier
    label du Host, le lien `.office.localhost` fonctionne pour n'importe
    quel `Office.subdomain` déjà enregistré, pas seulement les nouveaux —
    pas de branchement conditionnel nécessaire pour distinguer les deux cas.
  - **`components/organisms/NewOfficeModal.tsx`** : un aperçu en direct
    sous le champ "Sous-domaine" (`Accessible sur
    https://<saisie>.office.localhost:5173/`, recalculé à chaque frappe) —
    montre immédiatement à l'hyperadmin, PENDANT la saisie, l'adresse que
    prendra l'office avant même de valider le formulaire. Placeholder
    changé de "officec" à "notaires-durand" (un nom d'étude réaliste plutôt
    qu'un nom de test, plus parlant pour une démo).
  - **Vérifié en Chrome réel, du clic "Nouvel office" jusqu'à l'accueil de
    l'office** : création d'un office "Notaires Guérin"
    (`notaires-guerin`) avec un nouvel admin (`guerin_admin`) depuis la
    VRAIE modale (pas le shell Django cette fois) — aperçu en direct
    confirmé pendant la frappe, ligne créée dans le tableau avec son lien
    cliquable, clic → nouvel onglet sur
    `https://notaires-guerin.office.localhost:5173/` sans aucun
    avertissement TLS, connexion + enrôlement MFA + code validé → accueil
    de l'office affiché avec le bon nom. Régression : les liens
    `officea`/`officeb`/`officec` (test préexistant) toujours cliquables et
    corrects dans le même tableau. Données de démonstration supprimées
    après vérification (office, membership, admin, dispositif TOTP, base
    tenant — même procédure de nettoyage que pour le prototype).
  - **Vérifications automatisées** : `tsc -b` (0 erreur), `npm run lint` (0
    nouvel avertissement), `npm run check:ds` (190 fichiers, 0 écart
    nouveau), `npm run build` (sans erreur). Aucun test backend concerné
    (aucune vue/modèle Python modifié dans ce lot — uniquement le
    certificat et `CORS_ALLOWED_ORIGIN_REGEXES` faits dans le prototype
    ci-dessus, déjà couverts par la vérification manuelle `curl`/Chrome, et
    trois fichiers frontend nouveaux/modifiés ici).
  - **Reste ouvert, non demandé pour l'instant** : pas de bouton de
    suppression d'office dans la console (le nettoyage des offices de test
    de cette session est passé par le shell Django, comme pour toute
    dataroom de test ailleurs dans ce projet — cohérent avec l'absence
    déjà documentée d'UI de suppression de dataroom).

- **✅ Corrigé le 03/09/2026 — le champ "Rechercher..." de `ListControls`
  pouvait se faire remplir par l'autofill Chrome, filtrant une liste à zéro
  résultat** : trouvé en conditions réelles sur la console hyperadmin (un
  hyperadmin de test voyait "Aucun office à afficher" malgré des droits et
  des données corrects des deux côtés). Diagnostic en plusieurs étapes,
  chacune ayant éliminé une hypothèse :
  1. Backend et permissions confirmés sains à chaque étape (`curl` direct,
     `fetch()` exécuté depuis la page elle-même, `_is_hyperadmin` — voir
     l'entrée juste au-dessus, `GET /api/hyperadmin/offices/` ne filtre
     JAMAIS par appelant, tous les hyperadmins voient une requête
     identique) : la liste réellement renvoyée par le serveur contenait
     bien les 3 offices à chaque test.
  2. Premier correctif tenté, insuffisant : `autoComplete="off"` sur le
     champ. Confirmé inefficace CHEZ L'UTILISATEUR (persistant après
     déconnexion/reconnexion et rechargement) alors que la valeur DOM
     restait vide dans mon propre test — Chrome ignore délibérément cet
     attribut sur un `input[type=text]` qu'il classe "champ d'identifiant"
     par heuristique interne (décision Chromium volontaire, pas
     contournable par ce seul attribut, pour empêcher les sites de
     désactiver son gestionnaire de mots de passe).
  3. Confirmé par l'utilisateur : effacer le contenu du champ à la main
     faisait immédiatement réapparaître les 3 offices — preuve directe que
     c'était bien ce filtre, pas une régression de données. La suppression
     de l'identifiant enregistré dans Chrome contournait le symptôme sans
     traiter la cause : "dès qu'un utilisateur sauvegardera son login/mdp
     il risque d'avoir à nouveau le problème" (question posée par
     l'utilisateur, à l'origine du vrai correctif).
  4. **Vrai correctif** : `type="search"` au lieu de `type="text"` sur ce
     champ (en plus de `autoComplete="off"`, gardé en défense
     complémentaire). Un `input[type=search]` a un rôle sémantique distinct
     que Chrome exclut ENTIÈREMENT de sa logique d'autofill d'identifiants
     — pas une histoire d'attribut à faire respecter, un type de champ
     différent que le navigateur ne considère jamais comme candidat.
  - **Un seul point de correction pour toute l'application** :
    `ListControls.tsx` est le composant de recherche partagé par TOUS les
    tableaux (Annuaire de l'étude, Templates, console hyperadmin,
    Dossiers…) — corriger ce composant unique règle le même risque
    partout, pas seulement sur l'écran où il a été repéré.
  - **Vérifié en Chrome réel** : le filtrage fonctionne toujours
    normalement (recherche "test" → 1 résultat, effacement via le bouton
    natif `×` qu'apporte `type="search"` → 3 résultats à nouveau), aucune
    régression visuelle (le bouton natif de suppression s'intègre proprement
    dans le style `.control` existant, pas de CSS dédié nécessaire). **Non
    reproduit dans mon propre navigateur automatisé à aucun moment** (aucun
    mot de passe enregistré sur ce profil pour déclencher l'autofill
    agressif de Chrome) — le diagnostic final s'appuie sur le test direct
    de l'utilisateur (étape 3 ci-dessus), pas sur une reproduction locale.
  - `tsc -b`, `npm run lint` (0 nouvel avertissement), `npm run check:ds`
    (190 fichiers, 0 écart nouveau), `npm run build` — tous clean.

- **✅ Fait le 04/09/2026 — rôle choisi (admin/superadmin) + sélecteur de
  comptes déjà superadmin à la création d'office depuis la console
  hyperadmin** : demande utilisateur — "je voudrais que lorsque l'on crée un
  nouvel office avec un compte existant en tant que superadmin, on puisse
  voir la liste des comptes superadmin existant avec une information de
  s'ils sont déjà rattaché à un office particulier". En creusant, un
  prérequis manquait : le premier membre rattaché à la création d'un office
  était jusqu'ici TOUJOURS créé en rôle "admin" (`role="admin"` codé en dur
  dans `hyperadmin_offices_view`), aucun sélecteur de rôle n'existait dans
  `NewOfficeModal` — impossible jusqu'ici de créer directement un office
  avec un superadmin, il aurait fallu un rattachement puis une promotion
  séparée via `office-user_detail_view`.
  - **Distinction de sécurité tranchée avant d'implémenter** : le principe
    "pas d'annuaire d'utilisateurs" (§4.1 du document de vision, déjà
    documenté comme point à ne pas reproduire) protège un ADMIN D'OFFICE
    ordinaire de voir qui existe ailleurs — `attach_office_user_view` reste
    inchangée, toujours sans annuaire. Un HYPERADMIN, lui, a par construction
    déjà tous les droits sur tous les offices (`_effective_role`, voir
    l'entrée du 03/09/2026 plus haut) : lui montrer une liste consolidée de
    "qui est déjà superadmin où" ne lui expose rien qu'il ne pourrait déjà
    reconstituer en parcourant l'annuaire de chaque office un par un. Le
    nouvel endpoint est donc scopé À LA CONSOLE HYPERADMIN uniquement, gate
    `_is_hyperadmin`, sans toucher au principe existant pour les offices.
  - **Backend** : `admin_role` (nouveau champ optionnel dans le corps du
    `POST /api/hyperadmin/offices/`, défaut `"admin"` — comportement
    historique préservé si omis) remplace le `role="admin"` en dur, validé
    contre `{"admin", "superadmin"}` (400 "rôle invalide" sinon — jamais
    membre/client ici, ce flux crée le PREMIER gestionnaire d'un office tout
    neuf). Nouvel endpoint `GET /api/hyperadmin/superadmins/`
    (`hyperadmin_superadmins_view`) : groupe les `OfficeMembership` de rôle
    superadmin PAR UTILISATEUR (une entrée par compte, pas par membership),
    chacune avec la liste de tous ses offices — `{"user_id", "username",
    "offices": [{"subdomain", "name"}, ...]}`.
  - **Frontend** : `useHyperadminOffices` charge désormais `superadmins` en
    parallèle de `offices`/`modules` (même patron `Promise.all`, aucun des
    trois ne dépend d'un autre). `NewOfficeModal` gagne un champ "Rôle"
    (Admin/Superadmin, toujours visible — pas seulement en mode "Compte
    existant" : la symétrie create/attach a semblé plus simple qu'une
    règle conditionnelle sans bénéfice clair) et, uniquement quand
    `admin_mode === 'attach' && adminRole === 'superadmin' &&
    superadmins.length > 0`, une liste cliquable "Comptes déjà superadmin"
    juste au-dessus du champ "Nom d'utilisateur" — cliquer une ligne
    remplit ce champ avec le username (pas de soumission automatique,
    l'hyperadmin garde la main pour vérifier avant de valider). Ligne
    sélectionnée surlignée (`var(--brass-100)`, même token que les autres
    états "sélectionné" du design system).
  - **Tests** (`HyperadminTests`, 4 nouveaux) : `admin_role` omis reste
    "admin" (déjà couvert par un test existant, non dupliqué) ;
    `admin_role="superadmin"` respecté en mode attach ET en mode create ;
    un rôle hors `{admin, superadmin}` (ex. "membre") rejeté en 400, aucun
    office créé ; `GET /api/hyperadmin/superadmins/` — 403 pour un non
    hyperadmin, un utilisateur superadmin sur DEUX offices apparaît UNE
    seule fois avec les deux offices listés (pas une ligne par membership),
    un simple "admin" n'apparaît pas dans la liste. Suite complète de la
    classe relancée : **10/10 tests verts** (6 existants + 4 nouveaux,
    aucune régression).
  - **Vérifié en Chrome réel de bout en bout, pas seulement les tests** :
    connexion `Maxime_Hypadmin`, ouverture de "Nouvel office", bascule
    "Compte existant" + rôle "Superadmin" → la liste apparaît avec "carla —
    officea, officeb" (les deux offices où elle est réellement superadmin) ;
    clic sur la ligne → "Nom d'utilisateur" rempli avec "carla", ligne
    surlignée ; création d'un office de test avec ces réglages → inspection
    directe de la base confirme `OfficeMembership(user=carla,
    role="superadmin")` sur ce nouvel office. Office de test supprimé après
    vérification (office, membership, base tenant).
    **Piège d'automatisation rencontré** : les `<select>` natifs et les
    clics `computer.left_click` sur ce formulaire ne déclenchaient pas de
    façon fiable les gestionnaires React dans cette session (déjà
    documenté ailleurs dans ce journal pour d'autres écrans) — contourné en
    pilotant le DOM directement via `javascript_tool` (setter natif +
    `dispatchEvent`, `.click()` réel sur le bouton de soumission).
  - `tsc -b`, `npm run lint` (0 nouvel avertissement), `npm run check:ds`
    (190 fichiers, 0 écart nouveau), `npm run build` — tous clean.

- **✅ Corrigé le 04/09/2026 — un sous-domaine d'office avec underscore
  (ex. "max_test") était acceptable pour le modèle mais définitivement
  injoignable, sans qu'AUCUN réglage ne puisse compenser** : signalé par
  l'utilisateur via un autre outil ("btw"), qui avait déjà correctement
  diagnostiqué la moitié du problème sans pouvoir le vérifier en direct —
  vérification faite ici, hypothèse confirmée PUIS complétée d'un second
  problème plus profond que le premier diagnostic n'avait pas vu.
  1. **Premier problème, confirmé exact** : `CORS_ALLOWED_ORIGIN_REGEXES`
     (élargi à N niveaux de sous-domaine le 03/09/2026, voir plus haut)
     gardait un motif de caractères `[a-z0-9-]+` — sans underscore. Reproduit
     par un `curl -X OPTIONS` avec `Origin: https://max_test.office.
     localhost:5173` : aucun en-tête `Access-Control-Allow-*` en retour.
     Corrigé en élargissant le motif à `[a-z0-9_-]+`.
  2. **⚠️ Second problème, plus profond, découvert en vérifiant le premier
     correctif** : même après ce correctif, la vraie requête `GET` (pas
     seulement le préflight `OPTIONS`) échouait encore — `curl` direct avec
     `Origin` révèle un **500** Django, `DisallowedHost: Invalid HTTP_HOST
     header: 'max_test.office.localhost:8000'. The domain name provided is
     not valid according to RFC 1034/1035`. Cause : `HttpRequest.get_host()`
     (`django/http/request.py`, `host_validation_re = r"^([a-z0-9.-]+|...)
     (:\d+)?$"`) rejette tout Host contenant un underscore — **avant même**
     de consulter `ALLOWED_HOSTS`, et ce motif est câblé en dur dans Django
     lui-même, PAS exposé comme réglage. Aucune combinaison de
     `CORS_ALLOWED_ORIGIN_REGEXES`/`ALLOWED_HOSTS` n'aurait pu compenser —
     un sous-domaine avec underscore est structurellement injoignable par
     ce framework, point final (et un vrai DNS ne l'accepterait pas non
     plus, RFC 1034/1035 : ce n'est pas une bizarrerie Django/POC).
  3. **`Office.subdomain` (`SlugField`) laissait passer ce cas** :
     `validate_slug` (le validateur standard de `SlugField`) autorise
     justement l'underscore — l'office "max_test" avait donc été créé sans
     la moindre erreur via `hyperadmin_offices_view` (`full_clean()` n'avait
     rien à redire), sa base tenant provisionnée, tout en étant condamné à
     rester injoignable dès l'écran de connexion. Corrigé à la racine :
     `Office.SUBDOMAIN_RE = re.compile(r"^[a-z0-9-]+$")` + vérification
     dans `Office.clean()` (déjà le point d'extension existant pour
     `RESERVED_SUBDOMAINS`) — un underscore est désormais refusé DÈS LA
     CRÉATION, avec un message clair, plutôt que de ne se révéler qu'une
     fois l'office déjà créé et son sous-domaine communiqué. Aucune
     migration nécessaire (validation pure, pas de changement de schéma).
  - **Office "max_test" existant, resté cassé** : créé par l'utilisateur
    avant ce correctif (id 25, un seul membership `Maxime_supadmin`/admin,
    base tenant provisionnée mais jamais atteinte). Le nouveau garde-fou
    n'agit qu'à la création — il ne corrige pas rétroactivement un office
    déjà en base. Laissé tel quel, à la décision de l'utilisateur
    (suppression + recréation avec un sous-domaine valide, la voie la plus
    simple vu l'absence de contenu réel).
  - **Tests** (`HyperadminTests`, 1 nouveau) :
    `test_office_creation_rejects_underscore_in_subdomain` — un underscore
    dans `subdomain` renvoie 400, aucun `Office` créé. Piège rencontré en
    écrivant ce test : NE PAS reprendre littéralement "max_test" comme
    sous-domaine de test — cette classe tourne sans base isolée (déjà
    documenté ailleurs dans ce journal, "Skipping setup of unused
    database(s)"), et "max_test" existe pour de vrai dans cet
    environnement, ce qui aurait fait échouer l'assertion `assertFalse` sur
    un office créé par un TEST PRÉCÉDENT (au sens propre : par
    l'utilisateur, avant ce chantier) plutôt que par celui-ci. Suite de la
    classe relancée : **11/11 tests verts** (10 existants + 1 nouveau).
  - **Vérifié en Chrome réel après le correctif CORS** (le correctif
    `Office.clean()`, lui, ne peut être vérifié qu'à la création d'un
    NOUVEL office — "max_test" reste cassé, voir plus haut) : `curl -i`
    direct sur `https://max_test.office.localhost:8000/api/whoami/` avec
    `Origin` confirme le 500 `DisallowedHost` — reproduction propre du
    symptôme AVANT le second correctif, distinct du "Failed to fetch" côté
    CORS déjà résolu à l'étape 1.

- **✅ Corrigé le 04/09/2026 — création de dataroom silencieusement muette en
  cas d'échec** : signalé par l'utilisateur — "le bouton pour créer une
  dataroom ne semble pas l'ajouter à la liste (avec template ou à vide)".
  **Le câblage lui-même fonctionnait déjà** — vérifié en Chrome réel avant
  tout correctif : création à vide ET depuis le modèle "Vente immobilière —
  standard" (14 rubriques, arborescence complète reproduite) toutes deux
  réussies, la liste se met à jour immédiatement. Le vrai défaut trouvé en
  lisant `App.tsx` : `onCreate={({ name, templateId }) => { void
  datarooms.create(name, undefined, templateId).then(() =>
  setModalOpen(false)); }}` n'avait **aucun `.catch()`** — seul endroit de
  tout le fichier à mutualiser une mutation API sans ce filet (comparé à
  chaque autre modale : `.then(() => setXModal(null)).catch((err: Error) =>
  setXError(err.message))`, motif systématique ailleurs). Un rejet — nom
  vide, droit insuffisant (rôle `client`, exclu depuis le 02/09/2026),
  n'importe quelle erreur réseau — restait donc invisible : la modale ne se
  fermait pas, la liste ne bougeait pas, rien à l'écran. Reproduit en
  Chrome après correctif en soumettant un nom vide (le backend répond `400
  "nom requis"`) : avant, silence total ; après, message affiché sous le
  sélecteur de modèle sans fermer la modale.
  **Second défaut trouvé en vérifiant, non signalé par l'utilisateur** :
  `Modal` (`components/organisms/Modal.tsx`) ne démonte jamais ses enfants
  (elle bascule juste une classe CSS `overlay is-active`) — l'état interne
  de `NewDataroomModal` (nom, modèle choisi) survivait donc d'une ouverture
  à l'autre. Reproduit en Chrome : créer "Test Creation Bug" puis rouvrir la
  modale réaffichait encore "Test Creation Bug" dans le champ nom. Anodin en
  soi, mais aggravait la perception du bug signalé (un nouveau clic sur
  "Créer" avec un état visiblement déjà "utilisé" pouvait laisser croire
  qu'il ne se passait rien).
  - **Correctifs** : `App.tsx` gagne `dataroomCreateError` (état local) +
    `.catch((err: Error) => setDataroomCreateError(err.message))`, réinitialisé
    à l'ouverture et à la fermeture — même motif que partout ailleurs dans ce
    fichier. `NewDataroomModal.tsx` gagne une prop `error?: string | null`
    affichée en rouge (`var(--critical)`, même style que `NewOfficeModal`) et
    un `useEffect` qui réinitialise `name`/`portfolioId`/`clientSpaceId`/
    `templateId` à chaque passage de `open` à `true` (`Modal` ne se démontant
    jamais, c'est le seul point d'accroche fiable pour "repartir à neuf" —
    couvre aussi bien une réouverture après annulation qu'après une création
    réussie).
  - **Pas de changement backend** — la fonctionnalité de création existait
    et fonctionnait déjà correctement, confirmé avant tout correctif.
  - `tsc -b` (0 erreur), `npm run lint` (0 erreur ; 1 nouvel avertissement
    `react/set-state-in-effect` sur `NewDataroomModal.tsx`, même famille déjà
    tolérée ailleurs — resynchronisation d'un état local depuis une prop qui
    change, voir `RenameFolderModal.tsx`/`DataroomDetailScreen.tsx`),
    `npm run check:ds` (190 fichiers, aucun écart nouveau), `npm run build`
    sans erreur. Aucun test backend à relancer (chantier frontend pur).
  - **Vérifié en Chrome réel** (`alice`, admin, `officea.localhost`) :
    création à vide (liste 6→7, nouvelle entrée en tête) et depuis un modèle
    réel (6→7→8, arborescence à 14 rubriques reproduite) toutes deux
    confirmées AVANT le correctif (le bug rapporté n'était donc pas un défaut
    de câblage) ; après correctif, réouverture de la modale confirmée à
    l'état neuf (champ nom vide, "Dataroom vide" resélectionnée) et
    soumission à vide confirmée affichant "nom requis" sans fermer la
    modale. Les deux datarooms de test créées pour la vérification initiale
    supprimées après coup via le shell Django (aucune UI de suppression de
    dataroom n'existe dans cette app, déjà documenté).

- **✅ Fait le 04/09/2026 — groupes de droits par office (troisième critère
  d'accès, à côté du rôle et de l'utilisateur nommé)** : demande utilisateur
  — "je voudrais que dans les catégories admin, membre et client, il soit
  possible de créer des groupes et de les attribuer aux users. Même si des
  droits se croisent, on garde le droit le plus poussé." Confirmé réalisable
  avant d'implémenter, avec un choix de conception explicite : **extension
  purement additive** du mécanisme existant plutôt que remplacement du rôle —
  `OfficeMembership.role` ne change pas (toujours seul déterminant du rang de
  gestion : qui peut gérer qui, bypass superadmin, seuil de création de
  dataroom). Le "droit le plus poussé l'emporte" est obtenu gratuitement :
  `allowed_roles`/`user_ids` étaient déjà résolus en OU logique dans
  `_user_can_access`, ajouter les groupes comme troisième critère OU donne
  exactement la sémantique demandée sans toucher aux deux premiers ni migrer
  de données existantes.
  - **Backend** : nouveau modèle `Group` (base tenant, même patron que `Tag`
    — catalogue par office, `slug` dédupliqué via `group_slug`, factorisé
    avec `tag_slug` derrière un `_fold_slug` commun dans `validators.py`).
    Champs : `name`, `slug`, `category` (admin/membre/client — mêmes valeurs
    que `views.ACCESS_ROLES`, mais PUREMENT un classement d'affichage de
    l'écran de gestion : n'importe quel membre peut rejoindre n'importe quel
    groupe, `category` ne restreint rien), `user_ids` (JSONField, mêmes
    raisons cross-DB que `AccessRestriction.user_ids` — pas de FK vers User).
    `AccessRestriction`/`TemplateFolder` gagnent un vrai `ManyToManyField`
    vers `Group` (pas de JSONField ici : Group vit dans la MÊME base tenant,
    contrairement à User — une vraie FK est possible et plus naturelle).
    `_user_can_access` : troisième branche `any(user.id in g.user_ids for g
    in restriction.groups.all())`, résolue en Python plutôt qu'une requête
    JSON-contains (peu de groupes par restriction, SQLite n'offre pas
    d'opérateur fiable pour ça). `_apply_template` copie `tf.groups` tel quel
    sur la nouvelle `AccessRestriction` (pas de re-résolution nécessaire,
    contrairement à `user_ids` : un `Group` référencé par un `TemplateFolder`
    appartient forcément déjà à cet office). Nouveaux endpoints
    `GET/POST /api/groups/` et `PATCH/DELETE /api/groups/<id>/` — GET ouvert
    à tout membre (un tableau de droits doit afficher le catalogue même
    consulté par un simple membre), POST/PATCH/DELETE réservés admin/
    superadmin. **Différence assumée avec `Tag`** : un nom déjà pris est
    REFUSÉ (409), jamais fusionné en silence — un groupe touche des droits
    d'accès, une fusion muette serait surprenante là où elle est acceptable
    pour un tag de classement. `dataroom_access_view`/`folder_access_view`/
    `document_access_view`/`access_restrictions_view`/
    `template_folders_view`/`template_folder_detail_view` étendus pour
    porter `group_ids` en plus de `user_ids`/`allowed_roles`, même patron
    partout. Migration `0009_group_accessrestriction_groups_templatefolder_
    groups` appliquée aux 4 tenants existants via `migrate_all_tenants`.
  - **Tests** (`GroupApiTests` + `GroupValidatorTests`, 23 nouveaux) :
    catalogue (création réservée admin, listage ouvert, nom dupliqué refusé
    en 409, membres filtrés aux vrais `OfficeMembership` de l'office),
    accès (un client SANS accès par défaut gagne l'accès via son groupe sur
    une restriction ; un client dans un AUTRE groupe non coché reste
    refusé ; **appartenance à deux groupes, un seul coché sur la
    restriction → accès accordé quand même**, preuve directe du "droit le
    plus poussé l'emporte" demandé ; suppression d'un groupe retire l'accès
    qu'il accordait ; `group_ids` bien renvoyé par `access-restrictions/` ;
    application d'un Template dont un `TemplateFolder` coche un groupe
    reproduit correctement l'accès sur la vraie dataroom créée). Suite
    complète : **18/18 tests verts** pour la nouvelle classe ; relancé aussi
    `TagApiTests`/`DataroomTemplateTests`/`RoleBasedDefaultAccessTests`/
    `AccessRestrictionPermissionTests`/`PathVisibilityTests`/
    `HyperadminTests`/`SuperadminAndRoleAccessTests` (49 tests, zones
    touchées par cette extension) — aucune régression.
  - **Frontend** : `useGroups` (nouveau hook, même patron que `useTags`),
    `GroupsEditor` (nouveau composant — puces + sélecteur d'ajout, SANS la
    logique de troncature par largeur mesurée de `NamedUsersEditor` : un
    catalogue de groupes reste une poignée d'entrées curatées par un admin,
    pas potentiellement nombreux comme les utilisateurs nommés — à ajouter
    si l'usage réel montre le contraire). `AccessRightsTable` gagne une
    colonne "Groupes" (troisième dimension éditable, à côté des rôles et des
    utilisateurs nommés), utilisée IDENTIQUEMENT par l'onglet "Droits
    d'accès" d'une vraie dataroom ET par l'écran Template — même garantie de
    visuel unique que pour les utilisateurs nommés.
    `useAccessRightsDraft`/`AccessRightsEntry` gagnent `groupIds` (brouillon
    local groupé, même mécanique que `allowedRoles`/`userIds` — un seul
    aller-retour réseau par ligne modifiée à l'enregistrement explicite, pas
    un par case cochée). **Nouvel onglet "Groupes" dans Personnalisation**
    (`GroupsScreen`, liste + `GroupModal` create/edit avec sélecteur de
    membres par cases à cocher — même patron que `TemplatesListScreen`/
    `NewTemplateModal`), plutôt qu'une entrée de navigation top-level : même
    raisonnement déjà appliqué aux Templates le 02/09/2026 (éviter la
    prolifération d'entrées dans la section Office).
  - `tsc -b` (0 erreur), `npm run lint` (0 erreur, aucun nouvel
    avertissement), `npm run check:ds` (194 fichiers, aucun écart nouveau),
    `npm run build` sans erreur.
  - **Vérifié en Chrome réel** (`alice`, admin, `officea.localhost`) :
    onglet "Groupes" de Personnalisation accessible, création d'un groupe
    "Notaires associés" (catégorie Membre, membre "bob" coché) confirmée en
    liste ; colonne "Groupes" présente et fonctionnelle sur le tableau de
    droits d'une vraie dataroom (HOLA) ET sur un Template réel ("Vente
    immobilière — standard", 14 rubriques) ; groupe assigné à la racine de
    HOLA, enregistré, **persistance confirmée après un rechargement complet
    de la page** (pas seulement en mémoire côté client). Groupe de test
    supprimé après vérification (confirmation modale affichant le bon texte
    d'avertissement). **Piège d'automatisation rencontré, déjà documenté
    ailleurs dans ce journal** : les `<select>` natifs ne réagissent pas de
    façon fiable à un simple `computer.left_click` dans cette session —
    contourné cette fois par navigation clavier (clic pour ouvrir, `Down` +
    `Return`) plutôt que `javascript_tool` (refusé par l'utilisateur au
    moment du test).
  - **Explicitement différé, comme convenu avec l'utilisateur avant de
    lancer ce chantier** : capacités par groupe (ex. "peut créer une
    dataroom", qui remplacerait à terme certains usages des catégories
    admin/membre/client) — le socle actuel (catalogue de groupes + critère
    d'accès en OU) est construit pour s'y prêter le moment venu, mais rien
    de cette évolution n'est implémenté ici.

## Fusion du 04/09/2026 — `back/EN_evolution_suite` ⇄ `origin/front/maquettes-mvp`

Branche livrée par un collègue (Jean-Marie Bruce), annoncée comme partant de `7f34e52`.
Contenu : logo par office, fiche de résultat enrichie dans la palette de recherche, cinq
écrans V1 sortis de leurs placeholders, console hyperadmin réalignée sur l'AppShell avec
des widgets d'action rapide, et quatre lots de maquettes MVP pures (exigences AMOA encore
absentes du backend).

**⚠️ Branche de sauvegarde créée avant cette fusion : `back/EN_evolution_suite-backup-04-09`**
(pointant sur `8c9f401`, commit qui rassemble le chantier Groupes de droits + le correctif
de création de dataroom — commité en premier, voir plus bas). En cas de souci découvert
avant vérification complète, `git reset --hard back/EN_evolution_suite-backup-04-09`.

**Vérification préalable demandée par l'utilisateur : ce n'était PAS un fast-forward,
contrairement à ce que l'annonce du collègue aurait pu laisser supposer.** `7f34e52` est
bien le vrai merge-base (confirmé par `git merge-base`), mais `back/EN_evolution_suite`
portait déjà 2 commits que `front/maquettes-mvp` n'avait pas : `55e396e` (éléments repris
de `front/templates-hyperadmin-ui`, dont une AUTRE implémentation indépendante du logo et
du TOTP préconfiguré pour hyperadmin) et `6d9db46` (correctif autofill, rôle à la création
d'office). `front/maquettes-mvp`, elle, portait 10 commits inconnus de
`back/EN_evolution_suite`. Un `git merge --ff-only` aurait donc échoué — traité comme une
vraie fusion à 3 points, avec conflits à résoudre à la main, pas comme une avance rapide.

**Comparaison demandée sur le logo — implémentations IDENTIQUES, celle déjà en place
gardée telle quelle.** `_logo_key`/`_logo_public_url`/`_serialize_tenant_config`/
`tenant_config`/`tenant_logo_view` (`backend/datarooms/views.py`), les constantes `LOGO_*`
(`validators.py`) et `IdentityTab.tsx`/`saveTenantIdentity` (frontend) : comparaison
directe (`git show <commit>:<fichier>` des deux côtés) — mêmes docstrings au mot près,
mêmes variables, même logique, visiblement issues de la même source à l'origine. Seule
différence fonctionnelle trouvée : `back/EN_evolution_suite` utilise `_effective_role`
(bypass hyperadmin) là où `front/maquettes-mvp` utilise encore
`request.user.memberships.filter(office=office).first()` directement — un hyperadmin sans
`OfficeMembership` réel se serait pris un 403 sur cette version. **Décision : gardé
intégralement la version déjà en place** sur ces fichiers/fonctions précis, en résolvant
chaque conflit textuel en sa faveur plutôt qu'en fusionnant les deux textes.

**Migration 0008 : vérifiée, pas supposée.** Déjà appliquée sur `default` et sur les 4
bases tenant locales (officea/officeb/officec/testmax) avant même de commencer — rien à
rattraper. Aucune migration nouvelle côté `front/maquettes-mvp` (diff vide sur
`backend/datarooms/migrations/` entre `7f34e52` et la branche).

### Déroulé de la fusion

1. **Commité en premier le travail en cours** (chantier Groupes de droits + correctif
   création de dataroom, 22 fichiers jusque-là non commités dans cette session) — commit
   `8c9f401` — avant toute fusion : un `git merge` sur un arbre aussi chargé aurait été
   dangereux à arbitrer en cas de conflit.
2. `git merge origin/front/maquettes-mvp --no-commit --no-ff` : 10 fichiers en conflit
   réel (`CLAUDE.md`, `backend/datarooms/management/commands/seed_demo.py`,
   `backend/datarooms/{tests,urls,validators,views}.py`, `frontend/src/App.tsx`,
   `frontend/src/components/molecules/ListControls.tsx`,
   `frontend/src/components/organisms/index.ts`,
   `frontend/src/components/pages/SettingsScreen.tsx`) — tous résolus à la main, aucune
   résolution automatique globale (`--ours`/`--theirs`).
   - `urls.py`/`validators.py`/`tests.py`/`views.py` : conflits d'imports/docstrings
     purement additifs (Groupes d'un côté, logo/TOTP repris de l'autre) — gardé les deux
     ensembles réunis, sauf sur les fonctions logo (voir décision ci-dessus).
   - `seed_demo.py` : même genre de doublon que le logo — TOTP préconfiguré pour
     hyperadmin ajouté indépendamment des deux côtés (code identique), gardé le
     commentaire avec provenance (`back/EN_evolution_suite`).
   - `ListControls.tsx` : conflit facile — `front/maquettes-mvp` ajoute un prop
     `showSearch` (masque la recherche pour les écrans dont le filtre est remonté en
     topbar, dont la console hyperadmin) autour du même bloc où `type="search"` avait été
     ajouté le jour même (correctif autofill). Les deux gardés ensemble
     (`showSearch` autour du `<TextInput type="search">`).
   - `organisms/index.ts` : conflit purement additif (deux listes d'exports
     entrelacées), fusionné sans perte.
   - `SettingsScreen.tsx` : les deux côtés ajoutaient chacun un NOUVEL onglet (« Groupes »
     ici, « Méta-données » côté branche) — les deux onglets coexistent désormais (six au
     total), types/props/JSX fusionnés à la main.
   - `App.tsx` (le plus gros conflit, 3 blocs) : imports fusionnés (additifs), déclarations
     d'état fusionnées (les miennes + tout le lot d'états des maquettes MVP — portefeuille,
     métadonnées, cycle de vie, panier, etc., tous documentés comme "aucun endpoint
     derrière" par la branche elle-même). **Incohérence fonctionnelle trouvée APRÈS
     résolution des conflits textuels, sans qu'aucun marqueur ne la signale** (piège déjà
     rencontré à la fusion du 01/09, cherché volontairement cette fois) : un double bloc
     `identity={{ ... onSave/saving/error/readOnly ... }}` pour `<SettingsScreen>` — les
     deux côtés avaient chacun écrit un jeu complet de ces propriétés pour le même objet,
     et l'auto-merge de Git les avait empilées l'une après l'autre sans conflit (clés
     dupliquées dans un littéral objet : valide en JS, la dernière l'emporte
     silencieusement). Gardé la version de la branche (déjà câblée sur `api.
     saveTenantIdentity` + `session.refresh()` en ligne, utilisant `canManageOffice`) et
     supprimé mon ancienne version (`saveIdentity`/`savingIdentity`/`identitySaveError`,
     devenus du code mort) — trouvé en cherchant ensuite toute référence à
     `canManageTemplates`, dont la déclaration avait disparu au même endroit sans marqueur
     de conflit non plus : une ligne `canManage={canManageTemplates}` restait orpheline
     dans le rendu de `GroupsScreen`, corrigée en `canManageOffice` (même prédicat,
     `assignableRoles(currentOffice?.role).length > 0`, déjà décidé côté branche).
   - `CLAUDE.md` : un seul conflit, mais énorme (2574 lignes) — HEAD portait `## État
     actuel` (la structure réorganisée par la session `/init` du 03/09/2026, historique
     déplacé dans ce journal), la branche portait encore l'ANCIENNE section `## État réel
     du code` pré-réorganisation (elle avait divergé avant la réorg). Gardé intégralement
     la structure réorganisée côté HEAD — reprendre la longue section de la branche
     aurait réintroduit tout l'historique déjà déplacé ici. Le contenu réellement nouveau
     de la branche (logo — déjà signalé identique — et les nouvelles fonctionnalités) est
     documenté à la main dans cette entrée plutôt que ré-importé tel quel.
3. `search_view`/`_dataroom_hit`/`_document_hit`/`_folder_hit` (fiche de résultat de
   recherche) : **fusion automatique sans aucun conflit** — les signatures de ces fonctions
   étaient inchangées côté `back/EN_evolution_suite` depuis le merge-base, l'ajout de la
   branche (`_accessible_stats`, `_file_kind`, `_HIT_FIELDS`, `_folder_hit`) s'est appliqué
   comme un pur ajout.

### Ce qui était déjà « réel » côté branche (pas connecté après coup, déjà du vrai travail)

- **Fiche de résultat de recherche** (`location`/`tags`/`document_count`/`folder_count`/
  `created_at`/`last_activity`/`file_kind`/`role`/`email`) : déjà branchée sur
  `_user_can_access`/`_level_visible` (un compteur ne révèle jamais le contenu d'une pièce
  restreinte). Rien à connecter, juste à intégrer proprement — fait à l'étape 3 ci-dessus.
- **Widgets d'action rapide** (`frontend/src/dashboard/actions.ts` + `QuickActionsModal.tsx`)
  : catalogue avec principe explicite « aucune action menteuse », exécuté par
  `runQuickAction` dans `App.tsx` — déjà branché sur mes VRAIS handlers actuels
  (`setModalOpen(true)` pour « Créer un dossier », etc.), fusion automatique sans conflit.
- **Console hyperadmin réalignée** (`HyperadminOfficesScreen.tsx`, compteurs
  offices actifs/désactivés/modules activés) : calculés côté client à partir des VRAIES
  données déjà chargées (`/api/hyperadmin/offices/`), rien à connecter. Le sélecteur de
  comptes superadmin (mon propre travail du 04/09) et la nav à 3 sections de la branche
  coexistent sans conflit dans `HyperadminApp.tsx`.

### Les cinq écrans V1 — examinés un par un, rien à connecter

`frontend/src/v1/` reste, par construction du projet, la maquette V1 branchée sur le VRAI
backend là où un endpoint existe (`V1AppView.tsx`, accessible via `?view=v1-app` — sa
propre docstring liste : connexion, identité de l'office, liste des dossiers, modules,
apparence). Examiné pour chacun des 5 nouveaux écrans si un équivalent réel existait :
- `V1AnnuaireClientsScreen` (annuaire clients, colonnes email/fonction/dernière connexion)
  et `V1StatsConnexionsScreen` (stats de connexion) : **aucun équivalent réel** — pas de
  modèle de contact client distinct d'`OfficeMembership`, pas de suivi de
  session/connexion (audit trail non implémenté, item non coché de CLAUDE.md). Laissés sur
  `V1_ANNUAIRE_CLIENTS`/données simulées de `v1/data.ts`, déjà honnêtement marqués comme
  tels par la branche elle-même (bannière "Écran non reconstruit"/pastille "simulé").
- `V1TransfertFichiersScreen`, `V1StructmakerScreen`, `V1SupportScreen` : idem, aucun
  équivalent backend (transfert de fichiers volumineux hors dataroom, import d'arborescence
  Windows, ticketing support) — laissés en l'état, déjà honnêtes sur leur propre statut
  (bannières "Établi"/"Supposé"/"Inconnu" intégrées par la branche).
- Les 4 lots de maquettes MVP (`161a311`/`d5c4b45`/`2fada03`/`8a9a550`) : laissés
  INTOUCHÉS, aucun câblage tenté — conforme à l'instruction explicite de les garder comme
  pure référence visuelle.

### Vérifications

- `npx tsc -b` : 0 erreur après résolution de tous les conflits.
- `npm run lint` : 0 erreur, uniquement des avertissements déjà tolérés (même famille
  qu'avant la fusion).
- `npm run check:ds` : 237 fichiers vérifiés, aucun écart nouveau (53 hérités, inchangé).
- `npm run build` : sans erreur.
- `python manage.py test` : **207/207 tests verts** (183 avant le chantier Groupes + 18
  tests Groupes + 6 tests search palette repris de la branche).
- **Vérifié en Chrome réel**, poste par poste :
  - Fiche de résultat de recherche : recherche « vente » sur officea, résultat réel
    (« Vente Immeuble Rivoli », 2 pièces, dernière pièce le 26/08/2026) affiché à côté
    d'un résultat simulé clairement étiqueté « SIMULÉ » / « n'existent pas en base ».
  - Widgets d'action rapide : ajouté la carte « Actions rapides » à l'accueil d'alice,
    clic sur « Créer un dossier » → ouvre bien la VRAIE modale de création de dataroom
    (celle corrigée plus tôt dans la session). Widget retiré après vérification (voir
    plus bas).
  - Console hyperadmin : 3 sections de nav, compteurs réels (4 offices, 4 actifs, 1
    module), écrans de mockup (Reporting consolidé) rendus sans erreur.
  - Les 5 écrans V1 : les 5 rendus sans erreur (Annuaire clients, Transfert de fichiers,
    Structmaker, Support, Statistiques de connexions), liste de dossiers réelle affichée
    sur l'accueil V1 (HOLA, Other Dataroom, Folder Test Dataroom).
  - **Scénario de démo rejoué en entier** : connexion `carla` + TOTP sur
    `officea.localhost:5173`, bascule vers `officeb.localhost:5173` par le sélecteur
    d'office **sans reconnexion ni MFA à ressaisir** (ticket SSO), données bien
    distinctes entre les deux (Office A : 6 dossiers ; Office B : 1 dossier, répartition
    par espace client République/Arsenal/Ivry) — aucune régression sur le point le plus
    stratégique du projet.
  - **Piège rencontré, sans lien avec la fusion** : react-grid-layout affiche un flash
    transitoire de premier rendu (cartes en cascade, superposées) au tout premier paint
    d'un tableau de bord — déjà documenté dans `dashboard.css`
    ("WidthProvider rend un div VIDE au premier passage"), confirmé reproductible À
    L'IDENTIQUE sur un compte SANS disposition personnalisée (bob, `dashboard=None`) —
    ce n'est donc PAS une régression de cette fusion, juste plus visible qu'avant vu le
    nombre de widgets désormais disponibles. Se corrige seul en 1-2 secondes.
- **Nettoyage après vérification** : le widget « Actions rapides » ajouté à la disposition
  d'accueil d'alice pour tester le clic a été retiré directement en base après coup (son
  identifiant réel est `raccourcis`, pas `actions-rapides` — piège rencontré en le
  cherchant pour le retirer), la disposition d'alice est revenue bit à bit à son état
  d'avant ce test.

### Documentation

`CLAUDE.md` : section « Modèle de données clé » et « État actuel » à mettre à jour si de
nouveaux champs/endpoints changent l'état de référence (aucun nouveau modèle backend
introduit par cette fusion — uniquement du frontend et des extensions de `search_view`
déjà couvertes ci-dessus).

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

## 04/09/2026 — Les groupes remplacent les rôles pour le contenu (suite du chantier Groupes)

**Demande** : « je voudrais que les affichages de template et dataroom s'accordent avec
cette vision » — le groupe doit fonctionner comme un rôle Discord : des droits GLOBAUX
au niveau du groupe (quelles datarooms parmi les existantes, quelles pages), puis un
affinage PAR dossier/fichier (déjà construit le 04/09/2026 matin, colonne "Groupes"
d'`AccessRightsTable`). `OfficeMembership.role` reste inchangé pour la GESTION (qui peut
gérer qui, bypass superadmin, seuil de création de dataroom) — seul l'accès au CONTENU
bascule vers les groupes.

**Ce qui a été construit** :
- **"Datarooms accessibles" par groupe** (`group_datarooms_view`,
  `GET`/`PUT /api/groups/<id>/datarooms/`) — **aucun nouveau champ de donnée** : réutilise
  `AccessRestriction.groups` posé sur la restriction RACINE de chaque dataroom
  (`dataroom=<Dataroom>`, jamais `folder`/`document`), simplement vu et édité depuis la
  fiche du GROUPE plutôt que dataroom par dataroom. Réservé admin/superadmin
  (`_manager_role`), comme le reste de la gestion des restrictions.
- **"Pages visibles" par groupe** (`Group.page_keys`, migration
  `0010_group_page_keys`) — liste de clés de nav (`dashboard`, `datarooms`, `audit`,
  etc., lues depuis `NAV_SECTIONS` côté front, jamais dupliquées en dur côté serveur :
  validation TOLÉRANTE, même parti pris que `clean_dashboard_payload`). Liste vide =
  navigation complète (comportement actuel inchangé) — ce n'est PAS un défaut fermé.
  `whoami` gagne `user_id` (absent jusqu'ici) : c'est ce qui permet au front de calculer
  "à quels groupes j'appartiens" à partir de la liste déjà chargée par `useGroups`
  (`user_ids` par groupe), sans nouvel endpoint dédié.
- **`AccessRightsTable` perd ses colonnes Admin/Membre/Client** (et leur "Tout cocher") —
  ne restent que "Utilisateurs nommés" et "Groupes", sur Template ET Dataroom (même
  composant partagé). **Rien ne change côté backend** : `allowed_roles` reste un champ
  valide, lu par `_user_can_access` exactement comme avant — une restriction déjà
  configurée avec des rôles continue de fonctionner, simplement plus éditable depuis
  cette table. `access/effectiveRoles.ts` gagne un pendant générique pour les groupes
  (`templateEffectiveGroups`/`dataroomEffectiveGroups`, même algorithme de parcours
  d'arbre que pour les rôles, paramétré par la liste des ids de groupe de l'office plutôt
  que par un ensemble fermé) : une puce de groupe déjà accordée par un sous-dossier
  s'affiche grisée, sans croix de retrait, dans `GroupsEditor` (nouveau prop
  `inheritedGroupIds`) — même sémantique que l'ancien grisage de case de rôle.
- `useGroups` passe de "chargé sur les écrans dataroom/settings" à "chargé dès la
  connexion" (comme `useTags`) : la nav filtrée en dépend sur TOUT écran, pas seulement
  ceux qui affichaient déjà un tableau de droits.
- `navSections` (App.tsx) filtre chaque entrée dont la clé n'est dans AUCUN `page_keys`
  des groupes de l'utilisateur courant — **admin/superadmin/hyperadmin gardent toujours
  toute la navigation** (bypass, même principe que le contenu), et un membre/client qui
  n'appartient à AUCUN groupe, ou dont au moins un groupe a `page_keys` vide (le plus
  permissif l'emporte), garde aussi tout.

**⚠️ Point explicitement PAS tranché, laissé pour une prochaine itération** : le défaut
d'accès sans aucune restriction reste ROLE-based dans `_user_can_access` (ouvert pour
admin/membre, fermé pour client) — tant que ce défaut ne bascule pas vers les groupes,
"quelles datarooms ce groupe voit-il" n'a d'effet réel que pour le rang **client**
(un **membre** voit déjà tout par défaut, quel que soit son groupe). Recommandation :
basculer ce défaut une fois ce premier incrément vérifié en usage réel, pas dans la
même itération — changement de comportement plus large, potentiellement impactant pour
des offices déjà configurés.

**Trouvaille non résolue, signalée pour information** : `DataroomGroupsCard.tsx`
(récupéré de la fusion `front/maquettes-mvp` du 04/09/2026 matin) porte un concept de
"groupes" CONCURRENT et non lié — des groupes PAR DATAROOM (§4.4 du document de vision),
purement démo (état `dataroomGroups`/`setDataroomGroups`), rendu AU-DESSUS du vrai
`AccessRightsTable` dans l'onglet "Droits d'accès" d'une dataroom, absent de l'écran
Template. Vérifié en Chrome : les deux UI de "groupes" coexistent visuellement dans le
même onglet sans lien entre elles. Laissé tel quel dans cette itération (hors du
périmètre demandé) — à trancher (fusionner, retirer, ou assumer les deux concepts
distincts) dans une prochaine session.

**Vérifications** :
- `python manage.py test` → **213/213** (207 avant + `test_clean_group_page_keys_*`,
  `test_page_keys_*`, `test_group_datarooms_view_*` x4 — voir `GroupApiTests`/
  `GroupValidatorTests`).
- `tsc -b`, `npm run lint` (0 erreur, seuls des avertissements déjà tolérés), `npm run
  check:ds` (237 fichiers, aucun écart nouveau), `npm run build` — tous verts.
- **Chrome réel, officeb** : création d'un groupe "Clients VIP" (catégorie Membre,
  membre `bob`) avec 1 dataroom cochée ("Vente Martin") et 2 pages cochées (Accueil,
  Dossiers) — rechargement de la modale en édition confirme la persistance des deux
  (chargement asynchrone + remontage de la modale via un suffixe `loading`/`loaded` sur
  sa `key`, nécessaire car `GroupModal` ne lit ses props qu'une fois au montage). Colonne
  "Groupes" vérifiée sur la dataroom réelle ET le Template "Vente immobilière — standard"
  (plus aucune colonne de rôle), affichage hérité vérifié en direct (case cochée sur un
  sous-dossier/document → puce grisée sans croix sur le parent). **Connexion réelle en
  tant que `bob` (membre, TOTP déjà confirmé d'une session précédente)** : nav réduite à
  exactement Accueil + Dossiers, conforme aux `page_keys` du groupe — preuve de bout en
  bout du filtrage de navigation par groupe. Groupe de test supprimé après vérification,
  aucune donnée de démo laissée modifiée.

