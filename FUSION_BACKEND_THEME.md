# Fusion backend de `front/design-system-components` dans `back_evolution`

Note à destination du collègue propriétaire de la branche `front/design-system-components` :
la partie **backend** de la fonctionnalité de personnalisation par office (`Office.theme`)
a été reprise dans `back_evolution` le 28/08/2026, **sans toucher à `frontend/`**. Ce
document explique ce qui a été repris, ce qui a changé, et ce qu'il faut faire à la
prochaine fusion/rebase de `front/design-system-components` sur `back_evolution` (ou
l'inverse) pour ne pas dupliquer le travail ni recréer les conflits déjà résolus ici.

## Ce qui a été repris tel quel

Logique strictement identique à celle écrite sur `front/design-system-components` — aucune
divergence fonctionnelle, juste une réécriture des mêmes fichiers dans l'état où ils se
trouvent sur `back_evolution` :

- `Office.theme` (`JSONField(null=True, blank=True)`) sur le modèle `Office`.
- Le bloc `validators.py` : `THEME_MODES`, `THEME_TYPOGRAPHY_KEYS`, `THEME_SHAPE_KEYS`,
  `THEME_NAV_ENUMS`, `THEME_NAV_FLAGS`, `MAX_TOKENS_PER_MODE`, `MAX_TOKEN_KEY_LEN`,
  `MAX_TOKEN_VALUE_LEN`, `_TOKEN_KEY_RE`, `ThemeValidationError`, `_clean_mode_colors`,
  `_clean_layout`, `clean_theme_payload`.
- La vue `tenant_theme` (`GET`/`PUT`, lecture ouverte à tout membre, écriture réservée
  `admin`/`superadmin`, `204` si l'office n'a jamais personnalisé).
- La route `tenant-theme/` dans `urls.py`.
- Les tests `ThemeValidatorTests` (12 tests sur `clean_theme_payload`, couleurs et bloc
  `layout`) et `TenantThemeApiTests` (10 tests d'intégration GET/PUT).

## Ce qui a changé, et pourquoi

**Uniquement la migration.** `front/design-system-components` a créé
`0004_office_theme.py`, dépendant de `0003_document` (son point de divergence d'avec
`main`). Entre-temps, `back_evolution` a ajouté `0004_folder_document_folder.py` (modèle
`Folder`) puis `0005_accessrestriction.py` (modèle `AccessRestriction`) — les numéros `0004`
et `0005` sont donc déjà pris. La migration a été régénérée par Django lui-même
(`python manage.py makemigrations datarooms`) sous le nom **`0006_office_theme.py`**,
dépendant de `0005_accessrestriction`. Contenu de l'`AddField` strictement identique,
seuls le numéro et la dépendance changent.

Rien d'autre n'a changé : ni le nom des symboles, ni leur emplacement relatif dans chaque
fichier (la vue `tenant_theme` est au même endroit, entre `tenant_config` et
`coffre_fort_view` ; la route au même endroit dans `urls.py`).

## Ce qu'il faut faire à la prochaine fusion/rebase

Quand `front/design-system-components` sera fusionnée (ou rebasée) avec `back_evolution` :

1. **Ne pas réintroduire** la migration `0004_office_theme.py` de
   `front/design-system-components` — elle est remplacée par `0006_office_theme.py` côté
   `back_evolution`. Si Git la propose comme fichier à ajouter lors du merge, la supprimer.
2. **Ne pas réintroduire** les ajouts de `front/design-system-components` à `models.py`
   (champ `theme`), `validators.py` (bloc thème), `views.py` (vue `tenant_theme` + import),
   `urls.py` (route `tenant-theme/`) et `tests.py` (`ThemeValidatorTests`,
   `TenantThemeApiTests`) pour cette fonctionnalité précise — garder la version déjà
   présente sur `back_evolution` sur ces hunks-là (contenu identique, numérotation de
   migration différente).
3. **Garder tel quel tout le reste** de `front/design-system-components` : l'intégralité de
   `frontend/`, `.claude/skills/design-system/`, `docs/design-system/`,
   `docs/espace-notarial-v1.md` — ce merge-ci ne les concerne pas, ils n'ont pas
   d'équivalent côté `back_evolution`.
4. Après la fusion, relancer `python manage.py makemigrations --check --dry-run` (doit
   répondre « No changes detected ») pour confirmer l'absence de divergence résiduelle
   entre les modèles et les migrations, puis `python manage.py test` pour la suite complète.

## Récapitulatif fichier → action

| Fichier | Action à la fusion |
|---|---|
| `backend/datarooms/models.py` | Garder la version `back_evolution` (contenu identique) |
| `backend/datarooms/validators.py` | Garder la version `back_evolution` (contenu identique) |
| `backend/datarooms/views.py` | Garder la version `back_evolution` (contenu identique) |
| `backend/datarooms/urls.py` | Garder la version `back_evolution` (contenu identique) |
| `backend/datarooms/tests.py` | Garder la version `back_evolution` (contenu identique) |
| `backend/datarooms/migrations/0004_office_theme.py` | Supprimer (remplacée par `0006_office_theme.py`) |
| `backend/datarooms/migrations/0006_office_theme.py` | Nouveau fichier, à garder |
| Tout `frontend/` | Garder tel quel, aucun changement de ce côté |
| `.claude/skills/design-system/`, `docs/design-system/`, `docs/espace-notarial-v1.md` | Garder tel quel |
