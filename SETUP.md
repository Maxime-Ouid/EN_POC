# SETUP — Espace Notarial (POC)

Guide d'installation pour un nouveau développeur qui clone ce repo pour la première
fois. Suivre les étapes dans l'ordre. Voir `CLAUDE.md` pour le contexte du projet et
les détails d'architecture ; ce document se limite à « comment faire tourner le
projet en local ».

**Environnement de référence** : Windows, PowerShell ou Git Bash. Les chemins et
commandes ci-dessous supposent Windows (le `.venv` backend est un venv Windows —
`backend/.venv/Scripts/`, pas `bin/`).

## 1. Prérequis machine

- **Python 3.14+**
- **Node.js 24+** (et npm, fourni avec Node)
- **Docker Desktop** (pour MinIO) — doit être lancé avant l'étape 5
- **[mkcert](https://github.com/FiloSottile/mkcert)** — génère des certificats HTTPS
  locaux de confiance. Sur Windows, installable via WinGet :
  `winget install FiloSottile.mkcert`. Si `mkcert` n'est pas sur le PATH après
  installation, le binaire se trouve généralement sous
  `%LOCALAPPDATA%\Microsoft\WinGet\Packages\FiloSottile.mkcert_.../mkcert.exe`
  (invocable par chemin complet).
- **Git**

## 2. Cloner le repo

```powershell
git clone <url-du-repo> espace-notarial-poc
cd espace-notarial-poc
```

Toutes les commandes qui suivent partent de la racine du projet, sauf indication
contraire (`cd backend` / `cd frontend`).

## 3. Backend — installation

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r ..\requirements.txt
cd ..
```

(Git Bash : `python -m venv .venv && source .venv/Scripts/activate && pip install -r ../requirements.txt`)

## 4. Frontend — installation

```powershell
cd frontend
npm install
cd ..
```

## 5. Certificats HTTPS (mkcert)

Les deux serveurs de dev tournent exclusivement en HTTPS (nécessaire pour les
sous-domaines `*.localhost` et pour le cookie de session). Générer les certificats
**depuis la racine du projet** — c'est cet emplacement exact que `vite.config.ts` et
la commande `runserver_plus` (étape 8) attendent :

```powershell
mkcert localhost "*.localhost" officea.localhost officeb.localhost 127.0.0.1 ::1
```

Cette commande crée `localhost+5.pem` et `localhost+5-key.pem` à la racine du projet
(ignorés par `.gitignore`, à régénérer sur chaque poste). **Important** : le wildcard
seul (`*.localhost`) ne suffit pas — les sous-domaines `officea.localhost`/
`officeb.localhost` doivent être listés explicitement, sans quoi les navigateurs et
`curl` rejettent le certificat (`hostname mismatch`) même si le wildcard est présent
techniquement dans le SAN. Voir `CLAUDE.md`, section « État réel du code », pour le
détail de cette découverte.

Si c'est la première fois que `mkcert` tourne sur cette machine, il installe aussi une
autorité de certification locale dans le magasin de certificats du système
(`mkcert -install`, généralement fait automatiquement à l'installation du paquet) —
sans ça, les certificats générés ne seront pas reconnus comme valides par le
navigateur.

## 6. MinIO (stockage des documents)

Docker Desktop doit être lancé. Démarrer le conteneur :

```powershell
docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"
```

Conteneur sans volume ni nom : les données ne survivent pas à sa suppression — à
relancer et reprovisionner (bucket ci-dessous) si le conteneur est recréé. Identifiants
par défaut (aucune variable d'env fournie) : `minioadmin` / `minioadmin`.

Créer le bucket une fois le conteneur démarré (jamais automatique) :

```powershell
cd backend
.venv\Scripts\Activate.ps1
python -c "
import boto3
s3 = boto3.client('s3', endpoint_url='http://localhost:9000',
                   aws_access_key_id='minioadmin', aws_secret_access_key='minioadmin')
s3.create_bucket(Bucket='espace-notarial-documents')
"
cd ..
```

Console MinIO disponible sur `http://localhost:9001` (mêmes identifiants) pour
inspecter les fichiers uploadés.

## 7. Variables d'environnement

**Aucune variable d'environnement n'est nécessaire aujourd'hui.** Tous les réglages
(clé secrète Django, identifiants MinIO, etc.) sont actuellement codés en dur dans
`backend/config/settings.py` — c'est une simplification assumée du POC (au même titre
que `DEBUG=True` ou l'absence de vrai secret manager), déjà documentée dans
`CLAUDE.md`. Pas de fichier `.env`/`.env.example` à créer pour l'instant : en ajouter
un sans variable réellement lue par le code serait trompeur. `.gitignore` ignore déjà
`.env` par anticipation si ça change plus tard.

## 8. Base de données — première initialisation

```powershell
cd backend
.venv\Scripts\Activate.ps1
python manage.py migrate
python manage.py seed_demo
python manage.py migrate_all_tenants
cd ..
```

- `migrate` : applique les migrations sur la base `default` (comptes, offices, modules
  — voir `CLAUDE.md` pour l'architecture multi-tenant).
- `seed_demo` : crée les offices de démo (`officea`, `officeb`) et les comptes
  `alice`/`bob`/`carla` (mot de passe `demo1234` pour les trois — voir `CLAUDE.md`
  pour le détail des accès de chacun).
- `migrate_all_tenants` : crée/migre le fichier SQLite de chaque office
  (`backend/tenants/`, ignoré par `.gitignore`). À relancer après tout nouvel `Office`
  créé.

Les trois commandes sont idempotentes — rejouables sans risque.

## 9. Lancement quotidien (3 commandes)

Une fois l'installation faite (étapes 1 à 8), trois processus à lancer à chaque
session de dev, chacun dans son propre terminal :

```powershell
# 1. MinIO (stockage)
docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"

# 2. Backend Django (HTTPS, port 8000)
cd backend
.venv\Scripts\Activate.ps1
python manage.py runserver_plus --cert-file ../localhost+5.pem --key-file ../localhost+5-key.pem

# 3. Frontend Vite (HTTPS, port 5173)
cd frontend
npm run dev
```

Ne pas revenir à `python manage.py runserver` nu (HTTP) : les cookies de session sont
en `Secure` (`SESSION_COOKIE_SECURE`/`CSRF_COOKIE_SECURE = True`), ils cesseraient
d'être transmis sans HTTPS.

## 10. Vérification rapide

- Ouvrir `https://officea.localhost:5173` — aucun avertissement de sécurité ne doit
  apparaître (le certificat mkcert est reconnu par le navigateur).
- Se connecter avec `carla` / `demo1234`.
- Le bouton « Changer d'office » doit permettre de basculer vers
  `officeb.localhost:5173` **sans repasser par le formulaire de connexion**.
- Onglet « Datarooms » → créer une dataroom, y uploader un fichier → doit apparaître
  dans la liste, et être visible dans la console MinIO (`http://localhost:9001`) sous
  le préfixe `officea/`.

Si un de ces points échoue, se référer à `CLAUDE.md` (section « État réel du code »)
qui documente les pièges déjà rencontrés sur cette configuration (certificats,
cookies, CORS/CSRF).
