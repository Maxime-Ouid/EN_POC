import re

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


def clean_theme_payload(data) -> dict:
    """Valide et normalise un thème reçu du front.

    Renvoie exactement les trois clés attendues (rien de plus n'est stocké) ou
    lève ThemeValidationError avec un message affichable.
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

    return {"colors": cleaned_colors, "typography": typography, "shape": shape}
