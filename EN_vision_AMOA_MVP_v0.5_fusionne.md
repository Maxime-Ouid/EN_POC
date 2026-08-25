# Espace Notarial — Vision AMOA du projet (MVP)

| | |
|---|---|
| **Objet** | Document de vision fonctionnelle et technique du futur Espace Notarial |
| **Finalité** | Servir de base à la MOE (enioka) pour l'estimation des charges du MVP |
| **Produit** | Nouvel Espace Notarial (EN Next) — cœur : gestion de dataroom |
| **Sources** | Notes de cadrage AMOA ; Directive Sécurité Numérique du Notariat (DSN 2026) ; atelier de cadrage du 21/08/2026 |
| **Version du document** | 0.5 — enrichie des éléments de l'atelier de cadrage du 21/08/2026 |
| **Auteur (AMOA)** | — |
| **Statut** | Pour chiffrage |

> Ce document décrit la **vision de l'AMOA** sur le projet cible : objectifs, périmètre, fonctionnalités attendues et orientations d'architecture. Il ne contient pas de chiffrage ; il a vocation à donner à la MOE la compréhension nécessaire pour estimer les charges de développement du MVP.

---

## 1. Contexte et objectifs

L'Espace Notarial (EN) actuel est un service de partage de dossiers en ligne très apprécié des clients des offices notariaux. Le projet vise à le refondre tout en :

- **conservant les fonctionnalités existantes** appréciées des utilisateurs ;
- **se rapprochant des offices** et en leur proposant, le plus simplement possible (sans développement spécifique lourd et difficile à maintenir), une solution adaptable à leurs besoins ;
- faisant du nouvel EN un outil dont le **cœur est la gestion de dataroom**, capable de s'intégrer à l'écosystème applicatif des offices. Dans un premier temps avec les produits Notantis comme par exemple **Confiance RIB** et le **coffre-fort électronique** *(confirmé hors périmètre d'implémentation du MVP, mais l'architecture doit rester ouverte à ce type d'intégration — réunion du 21/08/2026)*.

Une **dataroom** est avant tout destinée aux **opérations immobilières complexes** (ventes d'actifs, opérations multi-actifs, dossiers avec de nombreuses parties prenantes et pièces juridiques, techniques et administratives). Elle vise à centraliser, structurer et sécuriser l'ensemble des documents d'un dossier tout au long de l'opération, et à en organiser le partage contrôlé entre les intervenants (office, client, vendeur, acquéreur, conseils…). C'est ce cas d'usage — illustré par l'exemple d'arborescence en **Annexe A** — qui structure la conception du produit.

> **Complément (réunion de cadrage, 21/08/2026)** — Le MVP doit être livré pour **juin 2027**, échéance déjà communiquée aux offices. Consigne du commanditaire : se concentrer sur le socle (reprise fiable de l'existant §4 + ajouts §3.2) avant d'envisager les évolutions du §8.

---

## 2. Vision cible

Le nouvel EN repose sur une architecture **multi-tenant** : chaque office dispose de son propre EN, isolé de celui des autres offices. Un utilisateur possède un compte unique lui donnant accès à un ou plusieurs offices (tenants).

Cette orientation doit permettre :

- une **isolation des données** (base de données et arborescence de fichiers) par office ;
- des **sauvegardes et reprises** de données propres à chaque office ;
- un **versionnage différencié** des EN (par exemple pour gérer une régression après migration, ou faire tester de nouvelles fonctionnalités à des offices « beta-testeurs ») ;
- le **déploiement de modules spécifiques** à un office sans impacter les autres ;
- une **modulation des ressources** dédiées, afin que les offices de grande taille bénéficient d'une capacité de calcul plus importante.

> **Complément (réunion de cadrage, 21/08/2026)** — Enjeu concret derrière le « déploiement de modules spécifiques » : aujourd'hui, une demande de développement spécifique pour un office aboutit à un **clonage complet du code source** (NOTANTIS maintient une vingtaine de forks divergents, coûteux et rarement refacturés à l'infra). L'objectif est de sortir de ce modèle avec un socle commun et des modules activables/désactivables par office. Le développeur historique de la V1 a déjà démontré la faisabilité technique (activation d'un module de paiement en bac à sable) lors d'une démonstration interne (cf. §11).

### 2.1 Notion de portefeuille
Au-dessus de la dataroom, un **portefeuille** regroupe plusieurs datarooms liées à un même client ou à une même opération complexe, et offre une **vue consolidée** de l'ensemble. Il permet de retrouver facilement toutes les datarooms d'un client ou d'une même opération. Exemples : une opération multi-actifs (une dataroom par immeuble, regroupées dans un même portefeuille) ou un projet **APUI** (chaque participant administre sa propre dataroom au sein d'un projet partagé, l'office pilotant l'ensemble depuis le portefeuille). La **dataroom** reste l'unité de l'opération notariale.

> **Complément (réunion de cadrage, 21/08/2026)** — Le portefeuille a vocation à **remplacer la notion actuelle d'« espace client »** (aujourd'hui : un dossier/dataroom est rattaché à un espace client, qui peut en regrouper plusieurs). Deux questions restent ouvertes, non tranchées lors de l'atelier : l'accès au portefeuille donne-t-il automatiquement accès à toutes les datarooms qu'il contient ? Une dataroom peut-elle appartenir à plusieurs portefeuilles ? (cf. §11).

---

## 3. Périmètre du MVP

### 3.1 Fonctionnalités existantes à conserver
Reprise des fonctionnalités de l'EN « V1 » décrites au §4.

### 3.2 Ajouts attendus pour le MVP
- **Audit trail** : historique de tous les accès et modifications apportées au contenu d'une dataroom.
- **Méta-données de dataroom** : formulaire à champs définis, avec possibilité d'ajouter des champs spécifiques au besoin d'une dataroom.
- **Notion de portefeuille** : regroupement de datarooms et vue consolidée (cf. §2.1).
- **Gestion de la facturation** : détail d'usage par client pour refacturation en marque grise (cf. §4.6) et API d'intégration comptable côté administration (cf. §5.1).
- **Lien temporaire d'accès restreint** : création d'un lien temporaire pour donner la possibilité de télécharger un document à une personne non membre de la dataroom. *Complément (réunion du 21/08/2026)* : envisager d'étendre ce mécanisme au **dépôt** (permettre à un tiers, ex. un expert, de déposer un fichier dans une dataroom précise) via un lien à usage unique, avec un accès **sandboxé** ne laissant voir ni l'arborescence complète ni les noms des autres fichiers.
- **Reporting sur les datarooms** : production d'indicateurs et de tableaux de bord sur l'activité des datarooms, à deux niveaux :
  - **côté EN d'un office** : reporting sur les datarooms de l'office (volumétrie, usage, activité des membres, stockage consommé, questions/réponses…), à destination du superadmin et des membres de l'office ;
  - **côté application d'administration (support)** : reporting consolidé et transverse sur l'ensemble des EN (par office, par tenant), pour le pilotage global de la plateforme (cf. §5.1).
- **Tags** *(point soulevé lors de l'atelier du 21/08/2026, absent de la v0.4 — statut MVP/V+ à confirmer)* : possibilité de taguer une dataroom (et potentiellement un document) pour faciliter la recherche et le classement.

### 3.3 Hors périmètre MVP (versions futures)
- Intégration de l'IA : agent IA d'actions (le **chatbot de support** est un *nice to have* envisageable dès le MVP ; l'**ouverture MCP** est à anticiper dès le MVP — cf. §8.1).
- Gestion des états d'une dataroom.
- Intégration à une GED.

Ces orientations sont décrites au §8 pour donner une vision de la trajectoire produit, mais ne font pas partie du MVP.

---

## 4. Fonctionnalités attendues (reprise de l'existant)

### 4.1 Dataroom
- Liste des datarooms accessibles.
- Vue consolidée des datarooms par portefeuille (cf. §2.1).
- Recherche de dataroom via une recherche plein texte.
- Consultation de la dataroom en arborescence et en tableau (cf. exemple en **Annexe A**).
- Filtrage des documents non consultés ; déplier / replier l'arborescence.
- Prévisualisation et téléchargement d'un document ; téléchargement groupé au format ZIP.
- Synchronisation d'une dataroom avec le système de fichiers local. Les outils de synchronisation actuels, Transfert Data et StructMaker, devront être remplacés par une solution plus intégrée à l'application WEB.
  > **Complément (réunion du 21/08/2026)** — Cible technique confirmée : stockage **S3 (ou compatible)** + **PostgreSQL**, notamment pour bénéficier nativement de l'upload résilient/repris (utile sur de gros volumes — cas cité en réunion : plusieurs téraoctets sur certaines datarooms). Une démonstration technique interne (développeur historique de la V1) a déjà validé un upload en tâche de fond, sans bloquer la navigation, sur cette base.
- Partage d'une dataroom entre 2 offices (typiquement vendeur et acquéreur), avec possibilité d'activer ou non la synchronisation des fichiers en temps réel.
  > ⚠️ **Point de vigilance (réunion du 21/08/2026)** : le mécanisme actuel de sélection de l'office destinataire expose la **liste complète des offices clients NOTANTIS** — jugé non souhaitable par le commanditaire. La cible doit prévoir un mécanisme d'appariement plus sûr (ex. échange de code entre les deux offices) plutôt qu'un annuaire ouvert.
- Cycle de vie d'une dataroom : création / clôture / archivage / suppression / durée de conservation.

### 4.2 Gestion des documents et des sous-dossiers
- Ajouter / Renommer / Déplacer / Supprimer un document.
- Ajouter des informations à un document ; ajouter un état à un document.
- Ajout multiple de documents.
- Ajouter / Renommer / Déplacer / Supprimer un sous-dossier.
- Notification par mail lors de l'ajout de documents.
- Rechercher un document dans une dataroom.

### 4.3 Questions / Réponses
- Consultation des questions/réponses ; filtrage (avec / sans réponse).
- Poser une question dans une dataroom ou sur un document en particulier.
- Répondre à une question ; désactiver une question ; supprimer une question ou une réponse.
- Télécharger la liste des questions.
- Modération des questions (valider / refuser / supprimer) et des réponses (modifier / valider / refuser / supprimer).
- Notification par mail des questions et réponses.

> **Complément (réunion du 21/08/2026)** — Dans la V1 actuelle, un membre de l'office ne peut pas répondre à une question depuis l'application d'administration : il doit se connecter côté « client » pour le faire. À corriger dans la cible (réponse possible depuis l'EN de l'office).

### 4.4 Membres d'une dataroom
- Liste des membres ; consultation des coordonnées d'un membre ; date de dernière connexion.
- Renvoi des identifiants à un client.
- Gestion des droits de lecture/écriture sur les dossiers et fichiers, par utilisateur ou par groupe d'utilisateurs. Les groupes sont définis dans le paramétrage de la dataroom.

### 4.5 Compte & paramétrage de l'office
- Changement de mot de passe ; gestion de son compte.
- Préférences d'affichage et de notification.
- Personnalisation du logo et des coordonnées de l'office.

### 4.6 Ajouts MVP
- **Audit trail** sur le contenu d'une dataroom (accès et modifications).
- **Méta-données** de dataroom configurables (champs définis + champs spécifiques).
- **Template de dataRoom** : Possibilité de créer des templates d'arborescence de Dataroom ou d'utiliser des templates définies par défaut (cf. exemple d'arborescence en **Annexe A**). *Complément (réunion du 21/08/2026)* : envisager un **template suggéré par défaut**, construit à partir des structures les plus utilisées (anonymisées) à travers les offices, proposé à ceux qui n'ont pas encore leurs propres templates.
- **Gestion de la facturation** — deux volets :
  - **Détail d'usage par client (refacturation en marque grise)** : fournir à chaque office un **détail précis de l'utilisation de l'EN pour chacun de ses clients**, afin de lui permettre de **refacturer le service à ses clients sous sa propre marque** (marque grise). La mesure d'usage repose sur l'**espace disque utilisé par les datarooms** (consommation de stockage), agrégé par client, avec une restitution exploitable (consultation et/ou export). Implique de **calculer et suivre la consommation de stockage par dataroom** — métrique de stockage également nécessaire au dimensionnement (cf. §9).
  - **Intégration comptable NOTANTIS (côté administration)** : l'application d'administration expose une **API** facilitant l'intégration de la **facturation des offices** dans les outils de comptabilité de NOTANTIS (cf. §5.1).
- **Reporting sur les datarooms** — indicateurs et tableaux de bord à deux niveaux :
  - **côté EN d'un office** : reporting sur les datarooms de l'office (volumétrie, usage, activité des membres, stockage consommé, questions/réponses…), à destination du superadmin et des membres de l'office. Il s'appuie notamment sur le **suivi de la consommation de stockage par dataroom** (cf. ci-dessus et §9) et sur l'**audit trail** (accès et modifications).
  - **côté application d'administration (support)** : reporting consolidé et transverse sur l'ensemble des EN (par office, par tenant), pour le pilotage global de la plateforme (cf. §5.1).
- **Tags** *(réunion du 21/08/2026 — statut MVP/V+ à confirmer, cf. §3.2)* : taguer une dataroom (et potentiellement un document) pour faciliter la recherche et le classement.
- **Lien temporaire d'accès restreint** *(réunion du 21/08/2026, cf. §3.2)* : au téléchargement comme, potentiellement, au dépôt de fichier, avec accès sandboxé.

### 4.7 Formats de documents pris en charge (repris de la V1)
La V1 reconnaît les principaux types de fichiers ci-dessous (avec icône associée). Ce périmètre est à reprendre et conditionne notamment le **moteur de prévisualisation**. Un exemple concret de dataroom illustrant ces formats et la profondeur d'arborescence est fourni en **Annexe A** ; la **répartition réelle des formats** observée sur la plateforme actuelle (volumes et pourcentages d'usage) est détaillée en **Annexe B**.

| Extension(s) | Type |
|---|---|
| .bmp, .gif, .jpeg / .jpg | Image |
| .tif / .tiff | Image multi-page |
| .pdf | Fichier PDF |
| .doc / .docx | Document Word |
| .xls / .xlsx | Tableau Excel |
| .ppt / .pptx | Présentation PowerPoint |
| .csv | Fichier texte structuré |
| .txt | Fichier texte |
| .rtf | Document bureautique |
| .htm / .html | Page HTML |
| .xml | Document XML |
| .dwg | Plan (AutoCAD) |
| .cms, .p7m | Fichier signé électroniquement |
| .rar, .zip | Fichier compressé |

- **Prévisualisation** : PDF uniquement en vue arborescence ; PDF, Word, Excel, textes, images, vidéos et sons en vue tableau.
- **Documents spéciaux** : états *« en attente »* (document bientôt disponible) et *« non applicable »* (document non disponible pour ce dossier).

---

## 5. Architecture cible

### 5.1 De l'existant vers la cible
Dans sa version actuelle, l'EN est composé de deux applications :

- **Administration** (réseau interne REAL uniquement) : selon le rôle (admin, superadmin, membre), donne accès aux fonctionnalités de l'office ; le profil **hyperadmin** donne accès à tous les EN et à la gestion des offices.
- **Cliente** (accessible depuis Internet) : permet à un client d'accéder à un sous-ensemble des fonctionnalités.

Dans la nouvelle version, l'application se compose de deux composants :

- **L'EN** : une instance par office, en logique **multi-tenant** (chaque office a son tenant ; un utilisateur peut accéder à plusieurs tenants).
- **L'application d'administration** : une instance unique, réservée au **support**, qui remplace l'« hyperadmin » actuel et permet de gérer l'ensemble des EN. Elle permet notamment d'**envoyer des notifications aux EN** (par exemple : information de maintenance, nouveauté, alerte), avec un ciblage possible (tous les EN, un sous-ensemble d'offices, un EN donné), la notification étant ensuite diffusée aux utilisateurs de l'EN concerné. Elle **expose également une API de facturation** facilitant l'intégration de la **facturation des offices** dans les outils de comptabilité de NOTANTIS (cf. §4.6). Elle offre enfin un **reporting consolidé et transverse** sur l'ensemble des EN (par office, par tenant) pour le pilotage global de la plateforme (cf. §4.6).

> **Complément (réunion du 21/08/2026)** — Dans la V1 actuelle, seules deux personnes disposent d'un accès « hyperadmin », et les autorisations sont codées en dur dans l'application (absence de vraie gestion de rôles). Illustre la nécessité, côté cible, d'une gestion de rôles authentique pour l'application d'administration.

### 5.2 Isolation par office (multi-tenant)
Pour chaque office, l'isolation porte sur :
- la **base de données** (méta-données de tous les modules activés sur l'EN de l'office) ;
- l'**arborescence des fichiers** de la dataroom.

> **Complément (réunion du 21/08/2026)** — Motivation concrète : dans la V1 actuelle (base unique partagée), un incident sur un office oblige à restaurer l'intégralité de la base puis à extraire manuellement les données de l'office concerné — coût de support important que l'isolation par office doit supprimer.

### 5.3 Gestion des tenants & authentification
- Un utilisateur dispose d'un **seul compte** mais peut accéder à **plusieurs tenants**.
- Chaque utilisateur, quel que soit son rôle, se connecte à l'EN de l'office souhaité via une **URL dédiée** (ex. : `office1.espacenotarial.fr`) et est redirigé vers un **module d'authentification commun** à tous les EN. Une fois connecté, l'utilisateur est redirigé vers l'EN souhaité avec des droits adaptés à cet EN.

> **Complément (réunion du 21/08/2026)** — Illustration du problème actuel que corrige le compte unique multi-tenant : aujourd'hui, un même utilisateur peut être contraint de recréer un second compte au sein d'un **même** office (ex. un admin doit se recréer un compte « client » pour accéder au site public de son propre office).

### 5.4 API
La notion d'**API** est centrale. Le lien entre l'application d'administration et les différentes instances d'EN repose sur l'exposition réciproque d'informations via API, permettant la synchronisation des applications.

### 5.5 Personnalisation par office
- Nom de domaine dédié pour l'EN d'un office (ex. : `office1.espacenotarial.fr`).
- Personnalisation de l'UI de l'EN à la charte de l'office.

> **Complément (réunion du 21/08/2026)** — Confirmé : le positionnement visé est la **marque grise** (personnalisation visuelle — logo, couleurs — sur un sous-domaine NOTANTIS), et non la marque blanche (domaine et identité propres à l'office, sans mention de NOTANTIS).

![Repreésentation de l'architeture cible](archi_generale_v2.drawio.png)
---

## 6. Rôles cibles

- **Superadmin** — administrateur de l'Espace Notarial de l'office.
- **Admin** — notaire référent d'un dossier.
- **Membre** — membre de l'office.
- **Client** — client de l'office.

(Le support dispose d'un accès dédié via l'application d'administration centralisée.)

---

## 7. Exigences non fonctionnelles (NFR)

Le nouvel EN est une **solution hébergée utilisée par les offices** ; à ce titre, il s'inscrit dans le périmètre de la **Directive Sécurité Numérique du Notariat** (DSN 2026 — Circulaire CSN N° 2026-1, entrée en vigueur le 01/01/2026). La directive impose un socle de **32 mesures** réparties sur **10 objectifs de sécurité**, opposables lors des inspections. La solution doit donc être conçue de manière à **permettre aux offices clients de rester conformes**, et le fournisseur de l'EN doit pouvoir figurer dans la cartographie des prestataires de chaque office.

> **Contrainte de calendrier réglementaire** : conformité totale exigée au **1ᵉʳ janvier 2027**, inspections possibles dès le **2ᵉ semestre 2026**. Les exigences ci-dessous doivent être intégrées **« by design »** dès le MVP, et non traitées a posteriori.

**Correspondance NFR ↔ objectifs DSN**

| Catégorie NFR | Objectifs DSN concernés |
|---|---|
| Hébergement & souveraineté | OS1 |
| Identités, accès & habilitations | OS3, OS8 |
| Authentification forte | OS5 |
| Sécurité de l'architecture & des échanges | OS4 |
| Protection contre les codes malveillants | OS6 |
| Disponibilité, continuité & reprise | OS9 |
| Traçabilité & journalisation | OS10 |
| Confidentialité & RGPD | RGPD (UE 2016/679) — transverse |

### 7.1 Hébergement & souveraineté numérique (OS1)
- Hébergement **et** exploitation des données dans l'**Union européenne**, par des entités à **capitaux européens**.
- Recours **privilégié à un cloud qualifié SecNumCloud** ; à défaut, analyse de risque documentée au regard du **secret professionnel** et du **RGPD**.
- Proscription des solutions soumises aux lois extraterritoriales (Cloud Act, FISA 702), sauf impossibilité technique justifiée.
- Maintien des composants logiciels (y compris dépendances) dans des **versions supportées** et à jour des correctifs de sécurité.
- Le fournisseur de l'EN doit fournir un **point de contact** et la **matrice des flux** nécessaires à la cartographie de l'office.

### 7.2 Identités, accès & habilitations (OS3, OS8)
- **Comptes individuels** (compatible avec le compte unique multi-tenant) et principe du **moindre privilège**.
- Droits attribués uniquement aux utilisateurs et applications **authentifiés**.
- **Comptes applicatifs dédiés** pour les intégrations / l'API (cf. §5.4), sans ouverture de session interactive.
- Gestion fine des droits par utilisateur et par groupe (cf. §4.4) et **séparation des rôles** (cf. §6).
- **Comptes d'administration dédiés et tracés** pour l'application d'administration support.

### 7.3 Authentification forte (OS5)
- **MFA (authentification forte) obligatoire** pour les accès exposés sur Internet (espace client **et** application d'administration).
- **Politique de mot de passe robuste**, conforme aux recommandations ANSSI/CNIL.

### 7.4 Sécurité de l'architecture & des échanges (OS4)
- Communications via **protocoles sécurisés** (HTTPS/TLS, etc.).
- **Cloisonnement logique fort entre tenants** : l'isolation multi-tenant (cf. §5.2) constitue une mesure de cloisonnement au sens de l'OS4.
- **Filtrage applicatif** (WAF) des flux entrants et sortants exposés.

### 7.5 Protection contre les codes malveillants (OS6)
- **Analyse antimalware des fichiers téléversés** dans les datarooms — point critique, l'EN recevant des documents d'origine externe et d'une grande diversité de formats (cf. répartition en **Annexe B**).
- Hébergement des solutions de protection en UE.

### 7.6 Disponibilité, continuité & reprise d'activité (OS9)
- **Sauvegardes par office** (rendues possibles par l'isolation §5.2), **régulièrement testées**, avec restauration opérationnelle.
- **Plans de continuité et de reprise (PCA/PRA)** ; objectifs **RTO/RPO à définir**.
- **Chiffrement robuste** des données hébergées ; le prestataire d'hébergement **ne doit pas avoir accès aux clés**.
- Objectif de **disponibilité (SLA) à définir**.

### 7.7 Traçabilité & journalisation (OS10)
- **Journalisation des événements de sécurité** avec **horodatage fiable** (base de temps).
- L'**audit trail** (cf. §4.6) répond à cet objectif côté métier — préciser le **périmètre des événements** tracés et la **durée de conservation**.
- Capacité d'**investigation post-incident** et procédure de **remontée d'incident**.

### 7.8 Confidentialité, secret professionnel & RGPD (transverse)

L'EN traite des **données à caractère personnel** (identités et coordonnées des membres, clients, parties prenantes) et des **documents couverts par le secret professionnel notarial**. La conformité au **RGPD** (Règlement UE 2016/679) est **transverse** et doit être intégrée **« by design »** dès le MVP. Les exigences ci-dessous s'y ajoutent aux mesures de sécurité des §7.1 à §7.7.

**Rôles et responsabilités**
- Répartition claire des rôles : chaque **office est responsable de traitement**, le **fournisseur de l'EN (NOTANTIS)** agit comme **sous-traitant** au sens de l'**article 28**.
- **Contrat de sous-traitance / DPA** encadrant les traitements, avec engagements de confidentialité, d'assistance et de sécurité.
- **Sous-traitance ultérieure** (hébergeur, services tiers) : encadrée, listée et soumise à autorisation de l'office (art. 28.2), les hébergeurs restant en **UE** (cf. §7.1).

**Principes de protection des données**
- **Privacy by design & by default** (art. 25) : minimisation des données collectées, paramétrage protecteur par défaut.
- **Minimisation et exactitude** : ne collecter que les données nécessaires aux finalités ; permettre leur mise à jour.
- **Limitation des finalités** : les données d'une dataroom ne sont exploitées que pour l'opération notariale concernée (et, le cas échéant, la facturation en marque grise, cf. §4.6).

**Durées de conservation et suppression**
- **Durées de conservation définies** par type de données, articulées avec le **cycle de vie de la dataroom** (création / clôture / archivage / suppression / durée de conservation, cf. §4.1) et avec les **obligations de conservation propres au notariat** (qui peuvent primer sur l'effacement).
- **Purge / anonymisation** automatisable à l'échéance des durées de conservation.

**Droits des personnes**
- Capacité à répondre aux **droits des personnes** : accès, rectification, effacement, limitation, opposition et **portabilité**, y compris dans le contexte multi-tenant.
- Outillage permettant de **retrouver, extraire ou supprimer** les données d'une personne, dans le respect des obligations légales de conservation (arbitrage à documenter en cas de conflit droit à l'effacement / conservation notariale).

**Traçabilité, gouvernance et incidents**
- **Registre des traitements** et documentation de conformité tenus à jour.
- **AIPD / analyse d'impact (DPIA)** à mener si le traitement présente un risque élevé (art. 35).
- **Gestion des violations de données** : détection (cf. journalisation §7.7), procédure de **notification à la CNIL sous 72 h** et information des personnes le cas échéant.

**Sécurité et localisation**
- **Chiffrement en transit et au repos** (art. 32) ; cohérent avec le chiffrement des données hébergées et la non-détention des clés par l'hébergeur (cf. §7.6).
- **Localisation et souveraineté** des données en UE (cf. §7.1).
- **Consentement et traceurs** : gestion des cookies / traceurs conforme (recommandations CNIL) sur les interfaces exposées, notamment côté client.

### 7.9 Performance & scalabilité
- Dimensionnement adapté au **multi-tenant** et **modulation des ressources par office** (cf. §2), pour permettre aux offices de grande taille de disposer d'une capacité accrue.
- Objectifs de performance **à définir** : temps de réponse, volumétrie (nombre de datarooms / documents), taille maximale des téléversements, génération de **téléchargements ZIP volumineux**.

### 7.10 Réversibilité (sortie du prestataire)

La **réversibilité** est l'obligation, pour le fournisseur d'un service informatique, de permettre à son client de **récupérer l'intégralité de ses données** et de **changer de prestataire** (ou de réinternaliser) sans perte, dépendance technique ni coût prohibitif, à l'échéance ou en cas de rupture du contrat. C'est une **clause contractuelle** désormais attendue dans les services notariaux, cohérente avec le **droit à la portabilité** du RGPD (art. 20, cf. §7.8) et avec les exigences des référentiels cloud (SecNumCloud, cf. §7.1). L'EN étant une **solution hébergée** mutualisée, elle doit être conçue pour la rendre effective dès le MVP.

- **Restitution des données** : capacité à exporter, pour un office donné, **l'ensemble de ses données** — documents et arborescence, méta-données, membres et droits, questions/réponses, journaux / audit trail — dans des **formats ouverts, documentés et exploitables** (pas de format propriétaire fermé).
- **Portée par office (tenant)** : la restitution s'effectue **office par office**, ce que facilite l'**isolation multi-tenant** (cf. §5.2) ; un office peut être extrait sans impacter les autres.
- **Documentation de réversibilité** : mise à disposition du **modèle de données**, de la structure des exports et des **procédures de reprise**, permettant à un tiers de réexploiter les données.
- **Assistance à la sortie** : accompagnement du transfert vers un autre prestataire ou une réinternalisation, avec une **fenêtre de réversibilité** et des **modalités (délais, formats, support) définies contractuellement**.
- **Suppression en fin de contrat** : après restitution et réversibilité, **effacement sécurisé et vérifiable** des données côté prestataire et de ses sauvegardes (cohérent avec les durées de conservation, cf. §7.8).
- **Miroir de la reprise V1 → cible** : les mécanismes d'export et de documentation attendus pour la réversibilité recoupent l'outillage de migration (cf. §10) — à concevoir de manière cohérente, dans les deux sens (entrée et sortie).



> **Note de périmètre** : certaines mesures de la DSN relèvent du SI propre de l'office (postes de travail, EDR, durcissement BIOS, VPN, cloisonnement réseau local…) et non de l'EN ; elles ne sont pas reprises ici. Les seuils précis (SLA, RTO/RPO, performances) restent **à arbitrer**.

---

## 8. Trajectoire produit (versions futures, hors MVP)

### 8.1 Intelligence artificielle
- **Chatbot** *(nice to have dans le MVP)* : répondre aux questions des clients pour assurer un support de 1er niveau et ainsi alléger l'équipe support. À considérer comme souhaitable mais non indispensable dans le périmètre MVP.
- **Agent IA** : réaliser des actions sur les datarooms à partir du langage naturel (l'agent accompagne l'utilisateur en posant des questions, et exécute les actions décrites par l'utilisateur).
- **Ouverture MCP (à anticiper dès le MVP)** : prévoir dès le MVP les conditions (API et architecture) permettant, dans une version future, le développement de serveurs **MCP (Model Context Protocol)** afin de faciliter l'intégration de l'EN avec les **outils d'IA internes d'un office**. L'objectif n'est pas de développer le MCP au MVP, mais de ne pas obérer cette évolution.

> **Complément (réunion du 21/08/2026)** — Deux nuances discutées : (1) l'analyse automatique des fichiers déposés (pour pré-classer une dataroom) soulève une question juridique non tranchée — les documents appartiennent au client final et non à l'office, le droit de les faire lire par une IA reste incertain (piste évoquée : anonymisation préalable) ; (2) vision produit à plus long terme évoquée par le commanditaire : qu'un office dépose ses fichiers en vrac et que l'outil **génère automatiquement l'arborescence adaptée** — relève de l'agent IA ci-dessus, explicitement hors MVP.

### 8.2 Gestion des états d'une dataroom
- Suivre le **cycle de vie** d'une dataroom au moyen d'états (par exemple : *en préparation*, *active*, *en attente*, *clôturée*, *archivée*), conditionnant les actions possibles et la visibilité selon l'état.
- Permettre des **transitions** entre états, le cas échéant avec déclenchement d'actions associées (notifications, archivage, gel des modifications…).
- Les états et leurs règles de gestion restent **à spécifier**.

> **Complément (réunion du 21/08/2026)** — Motivation métier concrète : la facturation actuelle (mensuelle, sur le stockage) peut être contournée en clôturant un dossier juste avant la fin du mois puis en le réactivant juste après. Une gestion d'états plus fine permettrait un historique temporel réel de l'activité (et non un simple relevé de fin de mois).

### 8.3 Synchronisation avec une GED
- Permettre la **synchronisation d'une dataroom avec une GED** (Gestion Électronique de Documents) externe, afin que les documents circulent sans ressaisie entre l'EN et l'outil de gestion documentaire de l'office.
- S'appuyer sur l'expérience du **développement en cours pour l'application ONV** : connexion avec l'**API de Stonal**, premier cas concret d'intégration EN ↔ GED à capitaliser.
- Sens et modalités de synchronisation (descendante, montante ou bidirectionnelle), périmètre des données échangées et gestion des conflits restent **à spécifier**.

---

## 9. Volumétrie de référence

Les données suivantes constituent une **baseline indicative** pour le dimensionnement ; plusieurs métriques fines restent à compléter (cf. note ci-dessous).

**Contexte marché (source : données 2023)**
- ~6 946 offices notariaux, 17 457 notaires, 62 702 collaborateurs.
- 5,1 millions d'actes par an ; forte croissance (+64 % d'offices entre 2016 et 2025, ~303 créations 2024-2025).
- Plateforme actuelle utilisée par « plusieurs milliers d'offices ».

**Plateforme actuelle (février 2026)**

| Indicateur | Valeur |
|---|---|
| Total dossiers | 65 410 |
| Dossiers actifs (< 90 j) | 9,8 % (~6 400) |
| Dossiers créés par mois | ~869 |
| Comptes admins actifs (< 90 j) | 27 % |
| Comptes en doublon | 69,8 % |
| Parties prenantes jamais connectées après invitation | 37,6 % |


> **Métriques encore manquantes pour un dimensionnement ferme** : volume de stockage total et taille moyenne / maximale des fichiers, nombre de documents par dataroom, nombre d'utilisateurs concurrents et pics de charge, débit d'upload / download. À compléter pour chiffrer l'infrastructure et les NFR de performance.

> **Note** : la **consommation de stockage par dataroom** n'est pas qu'une donnée de dimensionnement — c'est aussi la **mesure d'usage qui fonde la facturation en marque grise** (cf. §4.6). Le suivi du stockage par dataroom (agrégé par client et par office) est donc un besoin **fonctionnel** du MVP, et pas seulement un indicateur d'exploitation.

---

## 10. Reprise de données (migration V1 → cible)

La reprise **intégrale** des données de l'EN actuel est un **prérequis non négociable** du projet : aucun office ne doit perdre de données lors de la bascule. La difficulté centrale est que l'**architecture cible est radicalement différente de l'architecture source** — base unique/partagée et arborescence de fichiers historique côté V1, vers une logique **multi-tenant isolée par office** (cf. §5.2) avec un **modèle de données refondu**. La reprise ne peut donc pas être une simple copie : elle suppose une **transformation** des données d'un modèle vers l'autre.

### 10.1 Stratégies de migration
Deux axes de décision structurent la migration : **(a)** le **rythme de bascule des offices** et **(b)** le **périmètre de reprise des datarooms**. Ces deux axes sont indépendants et se combinent librement.

**a) Bascule des offices**
- **Bascule globale (tous les offices en une seule fois)** : la plus rapide mais porteuse d'un **risque élevé** — effet de masse, absence de retour arrière progressif, support potentiellement saturé en cas d'anomalie généralisée. **Non recommandée.**
- **Bascule office par office (recommandée)** : rendue possible par l'isolation multi-tenant (§5.2) et le **double run** (§10.6). On démarre par quelques **offices pilotes** (petits et grands, cf. §10.6), puis on bascule les **offices volontaires** à leur rythme, en fixant une **date limite de bascule** au-delà de laquelle les offices restants sont migrés d'office. Cette approche limite le risque et lisse la charge de support.

**b) Reprise des datarooms**
- **Scénario 1 — sans reprise des datarooms existantes** : la nouvelle version ne fait que de la **création de nouvelles datarooms** ; les datarooms historiques restent consultables sur la V1 le temps nécessaire. La **reprise de datarooms existantes** peut alors être proposée **à la demande, sur devis**, au cas par cas.
- **Scénario 2 — reprise intégrale** : **toutes les datarooms** existantes sont migrées vers la cible (cf. exhaustivité, §10.2). C'est l'option la plus ambitieuse et la plus coûteuse.

Le choix entre ces scénarios impacte directement la **charge de migration** (fonction de la volumétrie, cf. §9) et le **calendrier de bascule** ; il reste à arbitrer.

### 10.2 Objectif
- **Exhaustivité** : récupérer l'ensemble des données, structurées comme non structurées, malgré la rupture d'architecture.
- **Fidélité** : préserver le sens métier (rattachements, droits, historiques) après transformation.
- **Continuité** : assurer la continuité d'accès pour les offices en activité, sans interruption durable.

### 10.3 Périmètre des données à reprendre
- **Données structurées** (base de données) : datarooms, dossiers / sous-dossiers, méta-données, membres et coordonnées, droits et groupes, questions / réponses, journaux et historiques.
- **Données non structurées** (système de fichiers) : documents et **arborescence** associée, y compris les documents désactivés à conserver.
- **Comptes et identités** : à dédoublonner (la baseline indique ~69,8 % de comptes en doublon, cf. §9).

> **Complément (réunion du 21/08/2026)** — Point de vocabulaire à garder pour le mapping (§10.4) : la V1 actuelle nomme « dossier » ce que ce document appelle « dataroom », et « espace client » ce qui deviendra le « portefeuille » (§2.1).

- **Dossiers clôturés / archivés** : à reprendre également (valeur de mémoire pérenne).

### 10.4 Démarche de reprise
1. **Inventaire et cartographie** des données source (modèle de données V1, arborescence fichiers, volumétrie — cf. §9).
2. **Modèle de correspondance (mapping)** source → cible, explicitant pour chaque entité les transformations, les valeurs par défaut et les cas non mappables.
3. **Outillage de migration** rejouable et idempotent (scripts / ETL), exécutable **office par office** (cohérent avec l'isolation multi-tenant).
4. **Reprise des fichiers** vers la nouvelle arborescence, avec conservation des liens document ↔ méta-données.
5. **Exécution par lots** (par office / par tenant), permettant une bascule progressive.

### 10.5 Garanties d'intégrité et de réversibilité
- **Contrôles de complétude** : comptages avant/après, rapprochement des volumes, **empreintes (checksums)** des fichiers pour garantir l'intégrité binaire.
- **Réconciliation** des comptes et des droits après transformation.
- **Journal de migration** détaillé (succès, rejets, anomalies) et traitement des cas d'erreur.
- **Réversibilité** : possibilité de rejouer ou d'annuler une reprise tant que la bascule n'est pas confirmée.

### 10.6 Recette et bascule
- **Jeux de contrôle** et validation fonctionnelle des données migrées **avant toute bascule**.
- **Double run** : coexistence transitoire des deux plateformes ; aucun office n'est basculé avant validation.
- **Offices pilotes** pour valider la reprise sur des cas réels (petits et grands offices) avant généralisation.

### 10.7 Points d'attention
- **Mapping des droits** : le modèle de droits cible (par utilisateur / par groupe, cf. §4.4) peut différer du modèle V1 → transformation potentiellement non triviale.
- **Conservation de l'historique / audit trail** existant : à reprendre ou à reconstituer, périmètre à arbitrer.
- **Continuité des identifiants** (URL, références de documents) si des liens externes existent.
- **Dépendances** : accès au modèle de données et aux données de la V1, documentation source, fenêtre et durée d'indisponibilité acceptables.

> La reprise de données constitue vraisemblablement un **lot à part entière** du chiffrage ; sa charge dépend directement de la volumétrie (§9) et de la qualité de la documentation du modèle source.

---

## 11. Points à clarifier

Éléments qui restent à préciser :

- Technologie et mécanisme du module d'authentification commun (fédération / SSO). Intégration de Id.Not
- Remplacement de l'outil de synchronisation avec le système de fichiers local.
- Disponibilité et qualité de la documentation du modèle de données source V1.
- Périmètre précis des événements tracés par l'audit trail, et reprise de l'historique existant.
- Modèle de provisionnement des ressources par office.
- Conception du portefeuille pour couvrir nativement les cas APUI, et son articulation avec la notion actuelle d'« espace client » qu'il a vocation à remplacer (cf. §2.1) : comportement en cascade des droits d'accès, appartenance d'une dataroom à plusieurs portefeuilles.
- Modalités contractuelles de **réversibilité** à arbitrer : fenêtre de sortie, formats d'export, périmètre de l'assistance et délais (cf. §7.10).
- *(réunion du 21/08/2026)* Le développeur historique de la V1 a réalisé une démonstration technique interne d'une architecture V2 (Python, stockage S3, activation de modules par office, upload en tâche de fond) — à récupérer (documentation, choix techniques) pour éclairer le chiffrage plutôt que repartir de zéro sur des sujets déjà explorés.

### 11.1 Écarts avec l'existant

Une comparaison entre l'EN actuel (V1) et la présente vision a mis en évidence des fonctionnalités existantes **non couvertes** ou **partiellement couvertes** par le périmètre décrit. Elles sont à arbitrer pour le chiffrage et la reprise de l'existant.

**Écarts structurants**
- **Types de dossiers autres que la dataroom** : la vision est centrée sur la dataroom, alors que la V1 gère aussi le **travail collaboratif** (modes confidentiel / partagé) et le **dossier de divorce** (groupes Conjoint n°1 / n°2, Magistrats). Sont-ils repris, abandonnés ou fusionnés dans le modèle dataroom cible ?
- **Groupes prédéfinis et modèles de droits par défaut** : la V1 s'appuie sur des groupes métier prédéfinis (Étude, Vendeur, Acquéreur, Conjoints, Magistrats, externe) et des matrices de droits par défaut selon le type de dossier, là où la vision (§4.4) ne décrit que des groupes libres.
- **Règles de cloisonnement des Questions / Réponses** : visibilité selon le type de dossier et le mode (confidentiel / partagé), espace de Q/R réservé à l'étude, possibilité d'interdire les Q/R sur un dossier — non explicités.
- **Réponse aux questions depuis l'administration** *(réunion du 21/08/2026)* : dans la V1, un membre de l'office ne peut pas répondre à une question depuis l'application d'administration (il doit basculer côté client) — à corriger nativement dans la cible (cf. §4.3).

**Fonctionnalités unitaires à confirmer** (absentes ou partielles) : réinitialisation autonome du mot de passe (« mot de passe oublié ? »), acceptation / consultation des CGU, changement de mot de passe imposé à la première connexion, onboarding client par courriel, **panier de téléchargement**, compteurs et mise en évidence des documents non consultés, **désactivation / réactivation** des documents, **synthèse d'activité PDF** par dossier, option de notification « rapport quotidien », téléchargement du manuel / aide en ligne.

---

## Annexe A — Exemple d'arborescence de dataroom (anonymisée)

À titre d'illustration, l'arborescence ci-dessous représente une dataroom réelle (dossier de vente d'un actif immobilier), **anonymisée** : les noms de sociétés, de personnes, de commune, les références cadastrales et les numéros d'actes ont été remplacés par des libellés génériques ; les dates réelles sont conservées. Elle donne un ordre de grandeur de la **profondeur d'arborescence**, de la **typologie des documents** et des **formats** à prendre en charge (cf. §4.7), et illustre le besoin de **templates d'arborescence** (cf. §4.6).

```
├── 1. Aspects sociétaires
│   ├── 1.1. Société A
│   │   ├── 1. SOCIÉTÉ A - Statuts constitutifs - 11.09.2025 (pdf)
│   │   ├── 2. SOCIÉTÉ A - Statuts modificatifs - Article 15 - 19.12.2025 - Avec certification (pdf)
│   │   └── 3. Pouvoir Général SOCIÉTÉ A - [INITIALES] à [INITIALES] - 06.01.2026 (pdf)
│   └── 1.2. Société B
│       ├── 1. SOCIÉTÉ B - Statuts MAJ 15.07.2025 (pdf)
│       └── 2. SOCIÉTÉ B - PV AG (nomination président) 16.12.2019 (pdf)
│
├── 2. Présentation de l'actif
│   ├── 2.1. Plans
│   │   ├── 2.1.1. Plan cadastral
│   │   │   └── 1. [REF] - COMMUNE X - Extrait du plan cadastral (pdf)
│   │   ├── 2.1.2. Plan des aménagements intérieurs
│   │   │   ├── 1. [REF] - COMMUNE X - Plan d'aménagement intérieur T2 (pdf)
│   │   │   ├── 2. [REF] - COMMUNE X - Plan des intérieurs superficies utiles T3 (pdf)
│   │   │   └── 3. [REF] - COMMUNE X - Plan des intérieurs surfaces de plancher T4 (pdf)
│   │   ├── 2.1.3. Plan SDP ou SHON
│   │   │   ├── 1. Plan des intérieurs surfaces de plancher T4 (dwg)
│   │   │   └── 2. Plan des intérieurs surfaces de plancher T4 (pdf)
│   │   └── 2.1.4. Plans topographiques
│   │       ├── 1. Plan topographique T1 (dwg)
│   │       ├── 2. Plan topographique T1 (pdf)
│   │       └── 3. [REF] - Géoportail (pdf)
│   └── 2.2. Note de désignation
│       └── 1. [REF] - Note de désignation (doc)
│
├── 3. Droit de propriété
│   ├── 3.1. Titre immédiat
│   │   └── 1. Vente SOCIÉTÉ C - SOCIÉTÉ A du 10.12.2025 (pdf)
│   ├── 3.2. Titres antérieurs
│   │   ├── 1. Dépôt fusion de SCI X - SOCIÉTÉ C du 17.07.2008 (pdf)
│   │   ├── 2. PV cadastre réunion parcellaire en [PARCELLE] du 20.06.1994 (pdf)
│   │   ├── 3. Vente [PARCELLE], [PARCELLE] et [PARCELLE] du 20.11.1989 (pdf)
│   │   ├── 4. Acte rectificatif (contenance cadastrale) entre NOM1 et NOM2 du 20.11.1989 (pdf)
│   │   ├── 5. Arrêté préfectoral remaniement cadastral du 03.10.1988 (pdf)
│   │   ├── 6. Attestation immo [PARCELLE] [PARCELLE] NOM2 suite décès NOM2 du 02.10.1984 (pdf)
│   │   ├── 7. Attestation immo [PARCELLE] et [PARCELLE] décès NOM3 à NOM3 et NOM4 du 23.02.1965 (pdf)
│   │   └── 8. Acte notoriété décès NOM5 - [PARCELLE] [PARCELLE] à NOM2 du 17.05.1955 (pdf)
│   └── 3.3. Origine de propriété
│       └── 1. Note sur l'origine de propriété (doc)
│
├── 4. Situation hypothécaire
│   ├── 4.1. Fiche personnelle
│   │   ├── 1. EHF personnel 15.07.2026 (pdf)
│   │   ├── 2. EHF personnel SOCIÉTÉ C du 09.05.2023 (pdf)
│   │   └── 3. EHF personnel SOCIÉTÉ C du 16.07.2019 (pdf)
│   ├── 4.2. Fiche immeuble
│   │   ├── 1. EHF [PARCELLE] - [PARCELLE] et [PARCELLE] du 17.05.2023 (pdf)
│   │   ├── 2. EHF [PARCELLE] du 22.07.2019 (pdf)
│   │   └── 3. Fiche immeuble 15.07.2026 (pdf)
│   └── 4.3. Fiche réelle
│       └── 1. EHF réel 15.07.2026 (pdf)
│
├── 5. Servitudes
│   ├── 5.1. Actes constitutifs
│   │   ├── 5.1.1. Servitude de canalisation 1966
│   │   │   └── 1. Convention de servitude du 14.10.1966 (pdf)
│   │   ├── 5.1.2. Servitude de passage 1975
│   │   │   └── 1. Donation NOM3 + Servitude du 31.10.1975 (pdf)
│   │   └── 5.1.3. Servitude de passage 1989
│   │       ├── 1. Courrier relatif à [PARCELLE] du 11.03.2008 (pdf)
│   │       └── 2. Vente par SOCIÉTÉ D à SCI Y du 21.11.1989 (pdf)
│   └── 5.2. Note sur les servitudes
│       └── 1. [REF] - Note sur les servitudes (doc)
│
├── 6. Organisation juridique (Non concerné)
│
├── 7. Urbanisme
│   ├── 7.1. Documents d'urbanisme
│   │   └── 1. Note de renseignements d'urbanisme du 15.07.2026 (pdf)
│   ├── 7.2. Cadastre
│   │   ├── 1. Modèle 1 du 01.07.2026 (pdf)
│   │   └── 2. Plan de situation du 01.07.2026 (pdf)
│   ├── 7.3. PLU
│   └── 7.4. DPU
│       └── 1. Droit de Préemption du 13.07.2026 (pdf)
│
├── 8. Autorisations administratives
│   ├── 8.1. Autorisation de construction
│   │   └── 8.1.1. PC 1989
│   │       ├── 1. Demande de PC [N° PC] du 25.07.1989 (pdf)
│   │       ├── 2. Arrêté de PC [N° PC] du 14.10.1989 (pdf)
│   │       ├── 3. DAT de PC [N° PC] du 25.11.1989 (pdf)
│   │       ├── 4. Conformité - Lettre mairie sur délivrance du 16.02.1990 (pdf)
│   │       ├── ...
│   │       └── 15. Ensemble pièces PC et affichage_PC [N° PC] (pdf)
│   ├── 8.2. Établissements Recevant du Public
│   │   ├── 1. Rapport commission de sécurité du 06.11.2014 (pdf)
│   │   ├── 2. Arrêté ouverture du 24.11.2014 (pdf)
│   │   ├── 3. PV de visite - avis favorable du 26.01.2021 (pdf)
│   │   ├── 4. Avis favorable reclassement en 3ème catégorie du 01.03.2023 (pdf)
│   │   └── 5. Rapport de sécurité contre l'incendie dans les ERP - SCI Y (pdf)
│   └── 8.3. CDEC - CDAC Publicité
│       └── 1. Permis d'enseigne non validé par le bailleur (pdf)
│
├── 9. Assurances
│   ├── 9.1. Assurances propriétaire
│   └── 9.2. Assurances construction
│
├── 10. Diagnostics
│   ├── 10.1. Amiante
│   │   └── 1. Dossier Technique Amiante [OPÉRATEUR] [REF] du 29.05.2026 (pdf)
│   ├── 10.2. DPE
│   │   └── 1. DPE Bâtiment Entier - [SURFACE] m² - Validité 04.06.2033 (pdf)
│   ├── 10.3. Termites
│   │   └── 1. Arrêté préfectoral [DÉPARTEMENT] - zone de surveillance termites (pdf)
│   ├── 10.4. Mérules
│   ├── 10.5. Assainissement
│   ├── 10.6. État des Risques
│   │   └── 1. État des Risques du 09.07.2026 (pdf)
│   └── 10.7. Radon
│
├── 11. Environnement
│   ├── 11.1. ICPE
│   │   └── 1. Demande de renseignement - ICPE (pdf)
│   ├── 11.2. Base de données
│   │   ├── 1. Ex-Basol du 01.07.2026 (pdf)
│   │   └── 2. Installations classées du 01.07.2026 (pdf)
│   ├── 11.3. Géorisques
│   │   ├── 1. Rapport Géorisques du 09.07.2026 (pdf)
│   │   └── 2. Synthèse Géorisques du 09.07.2026 (pdf)
│   ├── 11.4. ERRIAL
│   │   └── 1. ERRIAL du 01.07.2026 (pdf)
│   ├── 11.5. ERPS
│   │   └── 1. ERPS du 09.07.2026 (pdf)
│   └── 11.6. Étude environnementale
│       ├── 1. Étude environnementale phase 1 - BUREAU DE CONTRÔLE - 2007 (pdf)
│       └── 2. Audit énergétique du 28.05.2026 (pdf)
│
├── 12. Situation locative
│   ├── 12.1. Bail commercial
│   ├── 12.2. Avenant au bail commercial
│   ├── 12.3. Demande de renouvellement locataire
│   ├── 12.4. Correspondance locative
│   ├── 12.5. Acte de cession de fonds de commerce
│   ├── 12.6. Acte de cession de parts sociales
│   ├── 12.7. Contrat de domiciliation
│   ├── 12.8. Caution bancaire
│   ├── 12.9. Attestation d'assurance locataire
│   ├── 12.10. Quittances - Loyers
│   └── 12.11. Charges
│
├── 13. Technique
│   └── 13.1. Installations techniques
│       ├── 13.1.1. Rapport de vérification électrique
│       ├── 13.1.2. Rapport vérification toiture terrasse
│       └── 13.1.3. Courrier décret tertiaire
│           ├── 1. ENSEIGNE X 1 (xml)
│           ├── 2. ENSEIGNE X 3 (xml)
│           ├── ...
│           └── 23. ENSEIGNE X 30 (xml)
│
└── 14. Fiscalité
    ├── 14.1. Taxe foncière
    │   ├── 1. TF 2022 (pdf)
    │   ├── 2. TF 2023 (pdf)
    │   └── 3. TF 2024 (pdf)
    ├── 14.2. Option TVA
    └── 14.3. Libellé Révision valeur locative (rev-k)
        ├── 1. Accusé de dépôt de déclaration REV-K (pdf)
        └── 2. Documents de travail (pdf)
```

---

## Annexe B — Répartition des types de fichiers (plateforme actuelle)

Le tableau ci-dessous recense les **types de fichiers réellement présents** dans les datarooms de la plateforme actuelle, avec le **nombre de fichiers actifs** et le **pourcentage d'utilisation** associés. Cette répartition éclaire le dimensionnement du **moteur de prévisualisation** et le périmètre des formats à prendre en charge (cf. §4.7) : le **PDF représente à lui seul plus de 91 %** des fichiers, et les cinq premiers formats (PDF, JPEG, DWG, Word, Excel) couvrent près de **97 %** du volume. La longue traîne (vidéos, audio, formats CAO, messages électroniques, archives, formats signés…) reste marginale en volume mais illustre la **diversité des formats** à ingérer et à sécuriser (cf. analyse antimalware, §7.5).

| Extension | Description | Nb fichiers actifs | % utilisation |
|---|---|---:|---:|
| pdf | Acrobat PDF | 12 662 593 | 91,37 |
| jpg | Image JPEG | 377 722 | 2,73 |
| dwg | Plan ou dessin d'architecte | 167 182 | 1,21 |
| doc | Word | 112 003 | 0,81 |
| xlsx | Excel | 89 118 | 0,64 |
| docx | Word | 73 658 | 0,53 |
| txt | Texte | 72 270 | 0,52 |
| msg | Message électronique | 64 556 | 0,47 |
| zip | Compressé ZIP | 40 966 | 0,30 |
| xls | Excel | 39 524 | 0,29 |
| png | Image PNG | 38 480 | 0,28 |
| jpeg | Image JPEG | 25 043 | 0,18 |
| wait | En attente | 14 614 | 0,11 |
| tif | Image TIF | 13 478 | 0,10 |
| csv | CSV | 7 478 | 0,05 |
| bak | Plan ou dessin d'architecte | 7 350 | 0,05 |
| xml | XML | 3 796 | 0,03 |
| pptx | PowerPoint | 3 633 | 0,03 |
| rar | Compressé RAR | 2 728 | 0,02 |
| 7z | Compressé 7zip | 2 633 | 0,02 |
| gif | Image GIF | 2 437 | 0,02 |
| pat | Motif bitmap | 2 234 | 0,02 |
| bmp | Image BMP | 2 144 | 0,02 |
| sor | Standard Optical Reflectometer | 1 947 | 0,01 |
| rtf | RTF | 1 659 | 0,01 |
| xlsm | Excel avec macro | 1 595 | 0,01 |
| na | Non applicable | 1 369 | 0,01 |
| mpg | Vidéo MPEG | 1 200 | 0,01 |
| dxf | Plan ou dessin d'architecte | 1 171 | 0,01 |
| eml | Message électronique | 1 149 | 0,01 |
| html | HTML | 1 093 | 0,01 |
| mp4 | Vidéo MP4 | 971 | 0,01 |
| pc3 | Plan ou dessin d'architecte | 934 | 0,01 |
| htm | HTML | 874 | 0,01 |
| ctb | Plan ou dessin d'architecte | 841 | 0,01 |
| dwl | Plan ou dessin d'architecte | 706 | 0,01 |
| ai | Image vectorielle | 650 | 0,00 |
| dwl2 | Plan ou dessin d'architecte | 644 | 0,00 |
| avi | Vidéo AVI | 638 | 0,00 |
| ppt | PowerPoint | 619 | 0,00 |
| mov | Vidéo QuickTime | 480 | 0,00 |
| ifc | Plan ou dessin d'architecte | 454 | 0,00 |
| tiff | Image TIFF | 438 | 0,00 |
| rvt | Plan ou dessin d'architecte | 354 | 0,00 |
| xlsb | Excel Binaire | 313 | 0,00 |
| flw | Fusion | 237 | 0,00 |
| vsd | Microsoft Visio | 230 | 0,00 |
| psd | Photoshop | 207 | 0,00 |
| xps | XML | 128 | 0,00 |
| svg | Image SVG | 97 | 0,00 |
| wmv | Vidéo Windows Media | 81 | 0,00 |
| gpg | Clé publique | 69 | 0,00 |
| wav | Audio WAV | 53 | 0,00 |
| gz | Compressé GZ | 48 | 0,00 |
| vcf | Carte de visite | 47 | 0,00 |
| skp | Plan ou dessin d'architecte | 36 | 0,00 |
| dws | Plan ou dessin d'architecte | 36 | 0,00 |
| pps | Diaporama PowerPoint | 34 | 0,00 |
| vsdx | Fichier Visio | 31 | 0,00 |
| mpp | Microsoft Project | 25 | 0,00 |
| ppsx | PowerPoint | 24 | 0,00 |
| iso | Fichier image (CD ou DVD) à graver | 21 | 0,00 |
| cms | Signé numériquement | 17 | 0,00 |
| z01 | Compressé ZIP | 12 | 0,00 |
| epw | Dessin | 11 | 0,00 |
| xsd | Schéma XSD | 10 | 0,00 |
| p7m | Signé numériquement | 9 | 0,00 |
| flv | Vidéo Flash | 9 | 0,00 |
| z02 | Compressé ZIP | 7 | 0,00 |
| aac | Audio AAC | 5 | 0,00 |
| m4a | Audio M4A | 5 | 0,00 |
| bz2 | Compressé bz2 | 3 | 0,00 |
| mp3 | Audio MP3 | 3 | 0,00 |
| tar | Compressé TAR | 3 | 0,00 |
| m4v | Vidéo MP4 | 2 | 0,00 |
| ogg | Fichier audio | 1 | 0,00 |
| pkcs | Signé numériquement | 1 | 0,00 |
| mpt | Microsoft Project | 1 | 0,00 |
| wma | Audio Windows Media | 1 | 0,00 |
| mkv | Fichier vidéo | 1 | 0,00 |
| kdbx | KeePass | 1 | 0,00 |
| ogv | Fichier vidéo | 1 | 0,00 |
| json | JSON | 1 | 0,00 |
| vdx | Microsoft Visio | 1 | 0,00 |
| flac | Audio FLAC | 1 | 0,00 |
| emlx | Message électronique | 1 | 0,00 |
| mpeg | Vidéo MPEG | 1 | 0,00 |
| las | Données lidar aéroportées | 1 | 0,00 |
| jpe | Image JPEG | 1 | 0,00 |
| z03 | Compressé ZIP | 1 | 0,00 |
| pkcs7 | Signé numériquement | 1 | 0,00 |
| z04 – z10 | Compressé ZIP (volumes multiples) | 0 | 0,00 |

> **Lecture** : les pourcentages sont arrondis à deux décimales ; les formats sous le seuil de 0,005 % apparaissent à `0,00`. Données extraites de la plateforme actuelle (cf. §9).
