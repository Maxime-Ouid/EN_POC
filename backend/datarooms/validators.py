import re
import unicodedata

ACCEPTED_EXTENSIONS = {
    "bmp", "gif", "jpeg", "jpg", "tif", "tiff", "pdf", "doc", "docx",
    "xls", "xlsx", "ppt", "pptx", "csv", "txt", "rtf", "htm", "html",
    "xml", "dwg", "cms", "p7m", "rar", "zip",
}
# Formats "pris en charge" — EN_vision_AMOA_MVP_v0.5_fusionne.md §4.7. Validation par
# extension uniquement ; pas d'antivirus/analyse de contenu (§7.5, hors périmètre POC).


def is_accepted_extension(filename: str) -> bool:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext in ACCEPTED_EXTENSIONS


# ---------------------------------------------------------------------------
# Personnalisation visuelle par office (Office.theme)
#
# Ce validateur BORNE, il ne connaît pas le catalogue de tokens : celui-ci vit
# dans frontend/src/theme/schema.ts et bouge avec le design system. Dupliquer la
# liste des 56 tokens ici garantirait qu'elle soit fausse un jour. On vérifie
# donc la forme, les types, les tailles et les deux presets — qui, eux, sont des
# ensembles fermés côté front comme côté produit.
# ---------------------------------------------------------------------------

THEME_MODES = ("light", "dark")
THEME_TYPOGRAPHY_KEYS = {"classique", "moderne", "editorial"}
THEME_SHAPE_KEYS = {"anguleux", "equilibre", "arrondi"}
THEME_APP_BG_KEYS = {"degrade", "uni", "quadrillage", "halo", "grain"}

# Disposition et style de la navigation. Contrairement aux tokens de couleur,
# ce sont des ensembles FERMÉS et petits : les énumérer ici ne risque pas de
# devenir faux sans qu'on s'en aperçoive, et laisser passer une valeur inconnue
# donnerait un attribut data-nav-* que le CSS ne sait pas interpréter — c'est-à-
# dire une navigation qui disparaît. Miroir de LayoutState dans
# frontend/src/theme/schema.ts.
THEME_NAV_ENUMS = {
    "navPlacement": {"left", "right", "top", "bottom"},
    "navSize": {"large", "compact", "rail"},
    "navDensity": {"dense", "confortable", "aere"},
    "navActive": {"plein", "barre", "point", "contour", "texte"},
}
THEME_NAV_FLAGS = ("showSectionLabels", "showBadges", "showPoweredBy")

# Bornes de sécurité : un thème légitime fait ~56 tokens par mode, et la valeur
# la plus longue du schéma est un rgba() d'une trentaine de caractères.
MAX_TOKENS_PER_MODE = 200
MAX_TOKEN_KEY_LEN = 64
MAX_TOKEN_VALUE_LEN = 120

_TOKEN_KEY_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


class ThemeValidationError(ValueError):
    """Charge utile de thème refusée — le message est renvoyé tel quel au client."""


def _clean_mode_colors(raw, mode: str) -> dict:
    if not isinstance(raw, dict):
        raise ThemeValidationError(f"colors.{mode} doit être un objet")
    if len(raw) > MAX_TOKENS_PER_MODE:
        raise ThemeValidationError(f"colors.{mode} : trop de tokens (max {MAX_TOKENS_PER_MODE})")

    cleaned = {}
    for key, value in raw.items():
        if not isinstance(key, str) or len(key) > MAX_TOKEN_KEY_LEN or not _TOKEN_KEY_RE.match(key):
            raise ThemeValidationError(f"colors.{mode} : nom de token invalide ({key!r})")
        if not isinstance(value, str) or not value.strip():
            raise ThemeValidationError(f"colors.{mode}.{key} doit être une chaîne non vide")
        if len(value) > MAX_TOKEN_VALUE_LEN:
            raise ThemeValidationError(f"colors.{mode}.{key} : valeur trop longue")
        # La valeur finit dans une déclaration CSS côté front : on interdit ce
        # qui permettrait d'en sortir pour injecter d'autres règles.
        if any(c in value for c in "{};<>"):
            raise ThemeValidationError(f"colors.{mode}.{key} : caractère interdit dans la valeur")
        cleaned[key] = value.strip()
    return cleaned


def _clean_layout(raw) -> dict | None:
    """Valide le bloc `layout` (disposition de la navigation).

    Renvoie None quand il est absent — et l'absence est le cas NORMAL, pas une
    erreur : tous les thèmes enregistrés avant l'existence de ce bloc n'en ont
    pas. Le front les complète avec ses valeurs par défaut, qui reproduisent
    exactement la navigation d'avant. Refuser ces thèmes rendrait toute étude
    déjà personnalisée incapable d'enregistrer quoi que ce soit.
    """
    if raw is None:
        return None
    if not isinstance(raw, dict):
        raise ThemeValidationError("layout doit être un objet")

    cleaned = {}
    for key, allowed in THEME_NAV_ENUMS.items():
        if key not in raw:
            continue
        value = raw[key]
        if value not in allowed:
            raise ThemeValidationError(
                f"layout.{key} doit valoir " + ", ".join(sorted(allowed))
            )
        cleaned[key] = value

    for key in THEME_NAV_FLAGS:
        if key not in raw:
            continue
        if not isinstance(raw[key], bool):
            raise ThemeValidationError(f"layout.{key} doit être un booléen")
        cleaned[key] = raw[key]

    return cleaned


def clean_theme_payload(data) -> dict:
    """Valide et normalise un thème reçu du front.

    Renvoie exactement les clés attendues (rien de plus n'est stocké) ou lève
    ThemeValidationError avec un message affichable. `layout` n'est présent en
    sortie que s'il l'était en entrée : un thème sans disposition personnalisée
    ne doit pas en gagner une au passage.
    """
    if not isinstance(data, dict):
        raise ThemeValidationError("le corps doit être un objet JSON")

    colors = data.get("colors")
    if not isinstance(colors, dict):
        raise ThemeValidationError("colors est requis et doit être un objet")

    cleaned_colors = {mode: _clean_mode_colors(colors.get(mode, {}), mode) for mode in THEME_MODES}

    typography = data.get("typography")
    if typography not in THEME_TYPOGRAPHY_KEYS:
        raise ThemeValidationError(
            "typography doit valoir " + ", ".join(sorted(THEME_TYPOGRAPHY_KEYS))
        )

    shape = data.get("shape")
    if shape not in THEME_SHAPE_KEYS:
        raise ThemeValidationError("shape doit valoir " + ", ".join(sorted(THEME_SHAPE_KEYS)))

    cleaned = {"colors": cleaned_colors, "typography": typography, "shape": shape}

    # Absent est le cas NORMAL, pas une anomalie : tous les thèmes enregistrés
    # avant l'arrivée des fonds n'ont pas cette clé, et doivent continuer à
    # s'afficher sur le dégradé. Une valeur inconnue, elle, est refusée — au
    # même titre qu'une typographie inconnue.
    app_bg = data.get("appBg")
    if app_bg is not None:
        if app_bg not in THEME_APP_BG_KEYS:
            raise ThemeValidationError(
                "appBg doit valoir " + ", ".join(sorted(THEME_APP_BG_KEYS))
            )
        cleaned["appBg"] = app_bg

    layout = _clean_layout(data.get("layout"))
    if layout is not None:
        cleaned["layout"] = layout
    return cleaned


# ---------------------------------------------------------------------------
# Disposition du tableau de bord (OfficeMembership.dashboard)
#
# Même principe que le thème : ce validateur BORNE une forme, il ne connaît ni
# le catalogue des widgets ni celui des templates — tous deux vivent côté front
# (frontend/src/dashboard/). Recopier ici la liste des widgets garantirait
# qu'elle soit fausse au premier widget ajouté, et le coût de se tromper est nul
# côté serveur : un identifiant inconnu est simplement ignoré à la lecture par
# le front. Ce qui compte ici, c'est qu'aucune charge utile ne puisse gonfler la
# base ni faire passer autre chose qu'une grille.
# ---------------------------------------------------------------------------

# Bornes de sécurité. La grille du front fait 12 colonnes ; on accepte jusqu'à 48
# pour ne pas avoir à toucher au backend si elle est un jour redécoupée, tout en
# refusant les valeurs absurdes qui rendraient le rendu illisible.
DASHBOARD_MAX_WIDGETS = 40
DASHBOARD_MAX_COLS = 48
DASHBOARD_MAX_ROWS = 400
DASHBOARD_MAX_H = 40
# Onglets : le front s'arrête à 8 écrans de 32 caractères (src/dashboard/types.ts).
# Ces bornes-ci sont plus larges à dessein — le serveur empêche l'abus, il ne
# réimplémente pas les règles d'affichage, qui bougeront sans lui.
DASHBOARD_MAX_PAGES = 16
DASHBOARD_MAX_PAGE_NAME = 64
DASHBOARD_MAX_OPTIONS = 10
DASHBOARD_MAX_OPTION_VALUE_LEN = 120
DASHBOARD_MAX_SLUG_LEN = 64

_SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


class DashboardValidationError(ValueError):
    """Charge utile de tableau de bord refusée — le message part tel quel au client."""


def _clean_slug(raw, field: str) -> str:
    if not isinstance(raw, str) or not _SLUG_RE.match(raw) or len(raw) > DASHBOARD_MAX_SLUG_LEN:
        raise DashboardValidationError(f"{field} doit être un identifiant en minuscules-tirets")
    return raw


def _clean_int(raw, field: str, minimum: int, maximum: int) -> int:
    # `isinstance(True, int)` vaut True en Python : sans ce garde-fou, un booléen
    # passerait pour une coordonnée et vaudrait 0 ou 1 sans que personne ne le voie.
    if isinstance(raw, bool) or not isinstance(raw, int):
        raise DashboardValidationError(f"{field} doit être un entier")
    if raw < minimum or raw > maximum:
        raise DashboardValidationError(f"{field} doit être compris entre {minimum} et {maximum}")
    return raw


def _clean_widget_options(raw, index: int) -> dict:
    """Réglages libres d'un widget — dictionnaire plat de scalaires, borné.

    Ouvert volontairement : un widget qui gagne un réglage (nombre de lignes,
    période affichée) ne doit pas imposer une migration. Plat et scalaire
    volontairement aussi : rien d'imbriqué ne peut donc grossir sans limite.
    """
    if raw is None:
        return {}
    if not isinstance(raw, dict):
        raise DashboardValidationError(f"widgets[{index}].options doit être un objet")
    if len(raw) > DASHBOARD_MAX_OPTIONS:
        raise DashboardValidationError(
            f"widgets[{index}].options dépasse {DASHBOARD_MAX_OPTIONS} réglages"
        )
    cleaned = {}
    for key, value in raw.items():
        name = _clean_slug(key, f"widgets[{index}].options")
        if isinstance(value, bool) or isinstance(value, int):
            cleaned[name] = value
        elif isinstance(value, str) and len(value) <= DASHBOARD_MAX_OPTION_VALUE_LEN:
            cleaned[name] = value
        else:
            raise DashboardValidationError(
                f"widgets[{index}].options.{name} doit être un booléen, un entier "
                f"ou une chaîne de moins de {DASHBOARD_MAX_OPTION_VALUE_LEN} caractères"
            )
    return cleaned


def _clean_widgets(raw_widgets, where: str) -> list:
    """Widgets d'un seul écran.

    Un même widget ne peut apparaître qu'une fois DANS UN ÉCRAN — deux instances
    du même identifiant rendraient la clé React ambiguë et le retrait
    imprévisible côté front. En revanche le même widget sur deux onglets
    différents est légitime : on peut vouloir ses dossiers récents partout.
    """
    if not isinstance(raw_widgets, list):
        raise DashboardValidationError(f"{where}.widgets doit être une liste")
    if len(raw_widgets) > DASHBOARD_MAX_WIDGETS:
        raise DashboardValidationError(
            f"{where} ne peut pas dépasser {DASHBOARD_MAX_WIDGETS} widgets"
        )

    widgets = []
    seen = set()
    for index, raw in enumerate(raw_widgets):
        if not isinstance(raw, dict):
            raise DashboardValidationError(f"{where}.widgets[{index}] doit être un objet")
        widget_id = _clean_slug(raw.get("id"), f"{where}.widgets[{index}].id")
        if widget_id in seen:
            raise DashboardValidationError(
                f"le widget « {widget_id} » apparaît deux fois dans {where}"
            )
        seen.add(widget_id)

        prefix = f"{where}.widgets[{index}]"
        widget = {
            "id": widget_id,
            "x": _clean_int(raw.get("x"), f"{prefix}.x", 0, DASHBOARD_MAX_COLS - 1),
            "y": _clean_int(raw.get("y"), f"{prefix}.y", 0, DASHBOARD_MAX_ROWS),
            "w": _clean_int(raw.get("w"), f"{prefix}.w", 1, DASHBOARD_MAX_COLS),
            "h": _clean_int(raw.get("h"), f"{prefix}.h", 1, DASHBOARD_MAX_H),
        }
        options = _clean_widget_options(raw.get("options"), index)
        if options:
            widget["options"] = options
        widgets.append(widget)

    return widgets


def _clean_page_name(raw, where: str) -> str:
    """Nom d'onglet : du texte, court, sans caractères de contrôle.

    Le nom est écrit par l'utilisateur et réaffiché tel quel : on borne la
    longueur (la barre d'onglets ne s'étire pas) et on retire les caractères de
    contrôle, qui ne servent qu'à fabriquer un libellé trompeur.
    """
    if not isinstance(raw, str):
        raise DashboardValidationError(f"{where}.name doit être une chaîne")
    name = "".join(ch for ch in raw if ch.isprintable()).strip()
    if not name:
        raise DashboardValidationError(f"{where}.name ne peut pas être vide")
    return name[:DASHBOARD_MAX_PAGE_NAME]


def clean_dashboard_payload(data) -> dict:
    """Valide et normalise une disposition d'accueil reçue du front.

    Renvoie exactement `{"template": str|None, "pages": [...]}` — rien d'autre
    n'est stocké — ou lève DashboardValidationError avec un message affichable.

    COMPATIBILITÉ : les dispositions enregistrées avant les onglets ont la forme
    `{"template": ..., "widgets": [...]}`. Elles sont converties en un onglet
    unique plutôt que refusées — sinon l'accueil de tous ceux qui avaient déjà
    rangé le leur repartirait à zéro le jour du déploiement, sans qu'ils
    comprennent pourquoi. Cette branche pourra disparaître quand plus aucune
    ligne de OfficeMembership.dashboard n'aura la vieille forme.
    """
    if not isinstance(data, dict):
        raise DashboardValidationError("le corps doit être un objet JSON")

    raw_pages = data.get("pages")
    if raw_pages is None and isinstance(data.get("widgets"), list):
        raw_pages = [{"id": "accueil", "name": "Accueil", "widgets": data["widgets"]}]

    if not isinstance(raw_pages, list):
        raise DashboardValidationError("pages est requis et doit être une liste")
    if not raw_pages:
        raise DashboardValidationError("un tableau de bord doit avoir au moins un écran")
    if len(raw_pages) > DASHBOARD_MAX_PAGES:
        raise DashboardValidationError(
            f"un tableau de bord ne peut pas dépasser {DASHBOARD_MAX_PAGES} écrans"
        )

    pages = []
    seen_ids = set()
    for index, raw in enumerate(raw_pages):
        where = f"pages[{index}]"
        if not isinstance(raw, dict):
            raise DashboardValidationError(f"{where} doit être un objet")
        page_id = _clean_slug(raw.get("id"), f"{where}.id")
        if page_id in seen_ids:
            raise DashboardValidationError(f"l'écran « {page_id} » apparaît deux fois")
        seen_ids.add(page_id)
        pages.append({
            "id": page_id,
            "name": _clean_page_name(raw.get("name"), where),
            "widgets": _clean_widgets(raw.get("widgets"), where),
        })

    template = data.get("template")
    if template is not None:
        template = _clean_slug(template, "template")

    return {"template": template, "pages": pages}


# ---------------------------------------------------------------------------
# Tags (catalogue de l'office — modèle Tag)
#
# Même parti pris que le thème : on BORNE la forme, on ne duplique pas ici ce qui
# vit ailleurs. La différence est que la palette de tags, elle, EST un ensemble
# fermé et court — six intentions, pas 56 tokens : l'énumérer ici ne risque pas de
# devenir faux sans qu'on s'en aperçoive, et laisser passer une clé inconnue
# donnerait une pastille sans couleur côté front.
# ---------------------------------------------------------------------------

TAG_COLORS = ("brass", "info", "success", "warning", "critical", "neutral")
TAG_NAME_MAX = 60


class TagValidationError(ValueError):
    """Payload de tag refusé (nom vide/trop long, couleur hors palette)."""


def tag_slug(name: str) -> str:
    """Clé de déduplication d'un nom de tag DANS un office.

    Volontairement plus agressive que `slugify` : les accents sont repliés et la
    casse écrasée, pour que « Copropriété », « copropriete » et « COPROPRIETE »
    soient le même tag. Sans ça, la création à la volée depuis un dossier
    fabriquerait trois entrées du catalogue pour un seul concept — exactement ce
    que le catalogue est censé éviter.
    """
    folded = unicodedata.normalize("NFKD", name)
    folded = "".join(c for c in folded if not unicodedata.combining(c))
    slug = re.sub(r"[^a-z0-9]+", "-", folded.lower()).strip("-")
    # Un nom entièrement non-latin (cyrillique, idéogrammes…) se réduirait à
    # une chaîne vide et rendrait tous ces tags identiques : on retombe alors
    # sur le nom brut normalisé, qui reste une clé exacte.
    return slug or unicodedata.normalize("NFKC", name).strip().lower()


def clean_tag_payload(data, *, partial: bool = False) -> dict:
    """Valide {"name": str, "color": str} pour la création (POST) ou la mise à
    jour (PATCH, `partial=True` — seules les clés présentes sont retournées)."""
    if not isinstance(data, dict):
        raise TagValidationError("payload de tag invalide")

    cleaned = {}

    if "name" in data or not partial:
        raw_name = data.get("name")
        if not isinstance(raw_name, str):
            raise TagValidationError("nom requis")
        name = " ".join(raw_name.split())
        if not name:
            raise TagValidationError("nom requis")
        if len(name) > TAG_NAME_MAX:
            raise TagValidationError(f"nom trop long ({TAG_NAME_MAX} caractères maximum)")
        cleaned["name"] = name

    if "color" in data:
        color = data.get("color")
        if color not in TAG_COLORS:
            raise TagValidationError("couleur de tag inconnue")
        cleaned["color"] = color
    elif not partial:
        cleaned["color"] = TAG_COLORS[0]

    return cleaned


def clean_tag_ids(raw) -> list:
    """Valide une liste d'identifiants de tags reçue pour une affectation.

    N'affirme PAS que ces tags existent — c'est la vue qui les résout dans la base
    tenant et rejette ceux qui n'y sont pas (un id valide ailleurs ne doit pas
    passer ici, même principe que `_resolve_folder` pour les dossiers).
    """
    if not isinstance(raw, list):
        raise TagValidationError("« tags » doit être une liste d'identifiants")
    if len(raw) > 50:
        raise TagValidationError("50 tags maximum par élément")
    ids = []
    for value in raw:
        if isinstance(value, bool) or not isinstance(value, int):
            raise TagValidationError("identifiant de tag invalide")
        if value not in ids:
            ids.append(value)
    return ids
