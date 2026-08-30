"""
Design tokens — Espace Notarial Next (Notantis)

Extraits verbatim du prototype front-end (artefact « Espace Notarial Next »).
Généré automatiquement à partir de tokens.css — ne pas éditer à la main,
régénérer depuis la source si le CSS change (voir DESIGN_SYSTEM.md).

Usage typique côté Python : générer des PDF/exports brandés (ReportLab,
WeasyPrint), calculer des couleurs de graphiques cohérentes avec le design
system (matplotlib/plotly), injecter des couleurs dans un contexte Jinja2/
Django sans dupliquer les valeurs en dur.
"""

import re
from dataclasses import dataclass, field
from typing import Dict

# Thème clair (valeurs par défaut du prototype)
LIGHT: Dict[str, str] = {
    "bg": "#fafafd",
    "surface": "#ffffff",
    "surface-alt": "#f5f4fb",
    "border": "#e5e2f0",
    "border-soft": "#eeecf7",
    "ink-900": "#211c3d",
    "ink-800": "#342f52",
    "ink-700": "#5b5773",
    "ink-500": "#7d7896",
    "ink-400": "#8783a0",
    "brand-ink": "#1a1258",
    "brand-ink-hover": "#241a63",
    "nav-bg": "rgba(255,255,255,.45)",
    "shell-bg": "#1a1258",
    "shell-bg-2": "#2c2170",
    "shell-text": "#ffffff",
    "shell-text-dim": "#b6acdb",
    "shell-active": "#342a7a",
    "shell-border": "rgba(255,255,255,.10)",
    "brass-700": "#6b3fd4",
    "brass-600": "#7d52dc",
    "brass-500": "#9668f4",
    "brass-400": "#ab84f7",
    "brass-100": "#f0e9fc",
    "success": "#2f8f5b",
    "success-bg": "#e4f5ec",
    "warning": "#b9820f",
    "warning-bg": "#fbf0d6",
    "critical": "#c13f3f",
    "critical-bg": "#fbe6e6",
    "info": "#5b7bfb",
    "info-bg": "#e9edfe",
    "shadow-sm": "0 1px 2px rgba(26,18,88,.06)",
    "shadow-md": "0 8px 24px rgba(26,18,88,.10)",
    "shadow-lg": "0 24px 56px rgba(26,18,88,.16)",
    "radius-sm": "6px",
    "radius-md": "10px",
    "radius-lg": "16px",
    "font-display": "'Poppins', 'Segoe UI', sans-serif",
    "font-ui": "'Inter', -apple-system, 'Segoe UI', sans-serif",
    "font-mono": "'IBM Plex Mono', 'SF Mono', Menlo, monospace",
    "login-grad-1": "rgba(150,104,244,.14)",
    "login-grad-2": "rgba(80,208,253,.24)",
    "login-grad-3": "rgba(91,123,251,.13)",
    "login-grad-4": "rgba(107,63,212,.17)",
    "login-glass-bg": "rgba(255,255,255,.72)",
    "login-glass-border": "rgba(255,255,255,.85)",
    "login-orb": "radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(255,255,255,.05))",
    "login-badge-bg": "rgba(255,255,255,.08)",
    "login-badge-border": "rgba(255,255,255,.16)",
    "app-grad-base-from": "#f2eeff",
    "app-grad-base-to": "#ecf1ff",
    "app-grad-1": "#ede4ff",
    "app-grad-2": "#b8cdff",
    "app-grad-3": "rgba(166,140,255,0.369)",
    "app-grad-4": "#c8e2f2",
    "card-bg": "rgba(255,255,255,0.5)",
    "card-border": "rgba(255,255,255,0.65)",
    "card-glass-bg": "rgb(255 255 255 / 85%)",
    "card-glass-border": "rgba(255,255,255,.7)",
    "app-orb": "radial-gradient(circle at 30% 30%, rgba(255,255,255,.55), rgba(255,255,255,.04))",
    "nav-dim": "#2f206f",
    "nav-label-c": "#372979",
    "brand-strong": "#2a1c66",
    "brand-soft": "#4e3f96",
}

# Thème sombre — ne contient QUE les overrides (les clés absentes ici
# gardent leur valeur LIGHT, ex. --font-ui, ...)
DARK_OVERRIDES: Dict[str, str] = {
    "bg": "#100d1f",
    "surface": "#171330",
    "surface-alt": "#1c1740",
    "border": "#332a5e",
    "border-soft": "#2a2350",
    "ink-900": "#efedf7",
    "ink-800": "#ddd9ec",
    "ink-700": "#b3aecb",
    "ink-500": "#9d97ba",
    "ink-400": "#8983a8",
    "brand-ink": "#1a1258",
    "brand-ink-hover": "#241a63",
    "nav-bg": "rgba(16,13,31,.40)",
    "shell-bg": "#140d42",
    "shell-bg-2": "#1c1558",
    "shell-text": "#ffffff",
    "shell-text-dim": "#a89ed4",
    "shell-active": "#2c2170",
    "shell-border": "rgba(255,255,255,.08)",
    "brass-700": "#b99cf7",
    "brass-600": "#ab8ff5",
    "brass-500": "#9668f4",
    "brass-400": "#8656d9",
    "brass-100": "rgba(150,104,244,.16)",
    "success": "#7fbf9c",
    "success-bg": "rgba(47,143,91,.18)",
    "warning": "#e3b25b",
    "warning-bg": "rgba(185,130,15,.20)",
    "critical": "#e08a8a",
    "critical-bg": "rgba(193,63,63,.20)",
    "info": "#8fa8ff",
    "info-bg": "rgba(91,123,251,.20)",
    "shadow-sm": "0 1px 2px rgba(0,0,0,.4)",
    "shadow-md": "0 8px 24px rgba(0,0,0,.45)",
    "shadow-lg": "0 24px 56px rgba(0,0,0,.6)",
    "login-grad-1": "rgba(150,104,244,.18)",
    "login-grad-2": "rgba(80,208,253,.26)",
    "login-grad-3": "rgba(91,123,251,.15)",
    "login-grad-4": "rgba(171,143,245,.16)",
    "login-glass-bg": "rgba(28,23,64,.62)",
    "login-glass-border": "rgba(255,255,255,.14)",
    "login-orb": "radial-gradient(circle at 30% 30%, rgba(255,255,255,.20), rgba(255,255,255,.02))",
    "login-badge-bg": "rgba(255,255,255,.06)",
    "login-badge-border": "rgba(255,255,255,.14)",
    "app-grad-base-from": "#100d1f",
    "app-grad-base-to": "#1c1740",
    "app-grad-1": "rgba(150,104,244,.16)",
    "app-grad-2": "rgba(91,123,251,.14)",
    "app-grad-3": "rgba(150,104,244,.10)",
    "app-grad-4": "rgba(80,208,253,.08)",
    "card-bg": "rgba(23,19,48,.55)",
    "card-border": "rgba(255,255,255,.08)",
    "card-glass-bg": "rgba(28,23,64,.75)",
    "card-glass-border": "rgba(255,255,255,.12)",
    "app-orb": "radial-gradient(circle at 30% 30%, rgba(255,255,255,.22), rgba(255,255,255,.02))",
    "nav-dim": "#a89ed4",
    "nav-label-c": "#a89ed4",
    "brand-strong": "#ffffff",
    "brand-soft": "#a89ed4",
}

def resolve(theme: str = "light") -> Dict[str, str]:
    """Retourne le jeu de tokens complet et résolu pour un thème donné ("light" | "dark")."""
    if theme == "dark":
        return {**LIGHT, **DARK_OVERRIDES}
    return dict(LIGHT)

def css_custom_properties(theme: str = "light") -> str:
    """Sérialise les tokens en bloc `--nom: valeur;` prêt à coller dans un <style>."""
    tokens = resolve(theme)
    return "\n".join(f"  --{k}: {v};" for k, v in tokens.items())



# ===========================================================================
# Personnalisation par l'étude (« marque grise »)
#
# Port Python du moteur JS embarqué dans le prototype (Personnalisation →
# Apparence, window.TenantTheme). Les DEUX implémentations doivent rester
# strictement identiques (même schéma TOKEN_SCHEMA, mêmes clés, mêmes valeurs
# par défaut) — si l'une évolue, reporter le changement dans l'autre.
#
# Historique : une première version (26/08/2026 matin) limitait l'édition à
# 2 couleurs ancres (primaire/accent) et calculait tout le reste par écarts
# HSL mesurés une fois sur la palette Notantis, pour garantir la cohérence
# par construction. À la demande explicite de l'utilisateur ("je veux que
# toutes les variables soient modifiables... les couleurs des textes et des
# icônes également"), cette version (26/08/2026 après-midi) expose CHAQUE
# variable de couleur individuellement, par thème — plus de dérivation.
# Le garde-fou de cohérence n'existe donc plus par construction : c'est un
# choix assumé, documenté dans DESIGN_SYSTEM.md §9. Cette version est aussi
# nettement plus simple côté Python : plus de maths HSL, juste un schéma de
# valeurs par défaut et une fusion (merge) avec les overrides d'une étude.
# ===========================================================================


def _hex_to_rgb(hexcolor: str):
    h = hexcolor.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _rgb_to_hex(r: float, g: float, b: float) -> str:
    return '#' + ''.join(f'{max(0, min(255, round(v))):02x}' for v in (r, g, b))


def parse_color(value: str):
    """Accepte #rgb / #rrggbb / #rrggbbaa / rgb(...) / rgba(...) / "r g b / a%"
    (les deux syntaxes CSS coexistent dans tokens.css) et renvoie (hex, alpha)."""
    v = value.strip()
    if v.startswith('#'):
        h = v[1:]
        if len(h) == 3:
            h = ''.join(c * 2 for c in h)
        r, g, b = _hex_to_rgb('#' + h[:6])
        a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
        return _rgb_to_hex(r, g, b), a
    m = re.match(r'rgba?\(([^)]+)\)', v)
    if m:
        body = m.group(1)
        alpha_part = None
        if '/' in body:
            body, alpha_part = body.split('/', 1)
        comps = body.replace(',', ' ').split()
        try:
            r, g, b = (float(c) for c in comps[:3])
        except ValueError:
            return '#000000', 1.0
        if alpha_part is not None:
            araw = alpha_part.strip()
        elif len(comps) > 3:
            araw = comps[3]
        else:
            araw = None
        if araw is None:
            a = 1.0
        elif araw.endswith('%'):
            a = float(araw[:-1]) / 100
        else:
            a = float(araw)
        return _rgb_to_hex(r, g, b), a
    return '#000000', 1.0


def compose_color(hexcolor: str, alpha: float = 1.0) -> str:
    alpha = max(0.0, min(1.0, alpha))
    if alpha >= 1:
        return hexcolor
    r, g, b = _hex_to_rgb(hexcolor)
    return f'rgba({r},{g},{b},{round(alpha, 2)})'


# ---- Référentiel des variables éditables -----------------------------------
# type "hex"  : couleur opaque.
# type "rgba" : couleur + opacité.
# type "orb"  : halo radial à 2 arrêts (formes flottantes) — seule la teinte
#               est éditable ; l'écart d'opacité centre/bord (a_from/a_to)
#               reste fixe par thème pour garder l'effet de lueur.
TOKEN_SCHEMA = [
    {"key": "bg", "group": "surfaces", "label": "Fond de page", "type": "hex", "light": "#fafafd", "dark": "#100d1f"},
    {"key": "surface", "group": "surfaces", "label": "Surface (cartes, champs, modales)", "type": "hex", "light": "#ffffff", "dark": "#171330"},
    {"key": "surface-alt", "group": "surfaces", "label": "Surface secondaire", "type": "hex", "light": "#f5f4fb", "dark": "#1c1740"},
    {"key": "border", "group": "surfaces", "label": "Bordure standard", "type": "hex", "light": "#e5e2f0", "dark": "#332a5e"},
    {"key": "border-soft", "group": "surfaces", "label": "Séparateur discret", "type": "hex", "light": "#eeecf7", "dark": "#2a2350"},

    {"key": "app-grad-base-from", "group": "appbg", "label": "Dégradé — départ", "type": "hex", "light": "#f2eeff", "dark": "#100d1f"},
    {"key": "app-grad-base-to", "group": "appbg", "label": "Dégradé — arrivée", "type": "hex", "light": "#ecf1ff", "dark": "#1c1740"},
    {"key": "app-grad-1", "group": "appbg", "label": "Halo haut-gauche", "type": "rgba", "light": "#ede4ff", "dark": "rgba(150,104,244,.16)"},
    {"key": "app-grad-2", "group": "appbg", "label": "Halo haut-droite", "type": "rgba", "light": "#b8cdff", "dark": "rgba(91,123,251,.14)"},
    {"key": "app-grad-3", "group": "appbg", "label": "Halo bas-droite", "type": "rgba", "light": "rgba(166,140,255,.369)", "dark": "rgba(150,104,244,.10)"},
    {"key": "app-grad-4", "group": "appbg", "label": "Halo bas-gauche", "type": "rgba", "light": "#c8e2f2", "dark": "rgba(80,208,253,.08)"},
    {"key": "app-orb", "group": "appbg", "label": "Formes flottantes", "type": "orb", "light": "#ffffff", "dark": "#ffffff",
     "a_from_light": .55, "a_to_light": .04, "a_from_dark": .22, "a_to_dark": .02},

    {"key": "card-bg", "group": "cards", "label": "Fond des cartes", "type": "rgba", "light": "rgba(255,255,255,.5)", "dark": "rgba(23,19,48,.55)"},
    {"key": "card-border", "group": "cards", "label": "Bordure des cartes", "type": "rgba", "light": "rgba(255,255,255,.65)", "dark": "rgba(255,255,255,.08)"},
    {"key": "card-glass-bg", "group": "cards", "label": "Fond de la barre du haut", "type": "rgba", "light": "rgb(255 255 255 / 85%)", "dark": "rgba(28,23,64,.75)"},
    {"key": "card-glass-border", "group": "cards", "label": "Bordure de la barre du haut", "type": "rgba", "light": "rgba(255,255,255,.7)", "dark": "rgba(255,255,255,.12)"},

    {"key": "ink-900", "group": "text", "label": "Texte principal", "type": "hex", "light": "#211c3d", "dark": "#efedf7"},
    {"key": "ink-800", "group": "text", "label": "Texte secondaire fort", "type": "hex", "light": "#342f52", "dark": "#ddd9ec"},
    {"key": "ink-700", "group": "text", "label": "Libellés de formulaire", "type": "hex", "light": "#5b5773", "dark": "#b3aecb"},
    {"key": "ink-500", "group": "text", "label": "Texte atténué", "type": "hex", "light": "#7d7896", "dark": "#9d97ba"},
    {"key": "ink-400", "group": "text", "label": "Texte le plus discret (icônes incluses)", "type": "hex", "light": "#8783a0", "dark": "#8983a8"},

    {"key": "brand-ink", "group": "brand", "label": "Couleur principale", "type": "hex", "light": "#1a1258", "dark": "#1a1258"},
    {"key": "brand-ink-hover", "group": "brand", "label": "Survol du bouton principal", "type": "hex", "light": "#241a63", "dark": "#241a63"},
    {"key": "brass-700", "group": "brand", "label": "Accent — foncé", "type": "hex", "light": "#6b3fd4", "dark": "#b99cf7"},
    {"key": "brass-600", "group": "brand", "label": "Accent — bouton", "type": "hex", "light": "#7d52dc", "dark": "#ab8ff5"},
    {"key": "brass-500", "group": "brand", "label": "Couleur d'accent", "type": "hex", "light": "#9668f4", "dark": "#9668f4"},
    {"key": "brass-400", "group": "brand", "label": "Accent — clair", "type": "hex", "light": "#ab84f7", "dark": "#8656d9"},
    {"key": "brass-100", "group": "brand", "label": "Accent — fond de badge", "type": "rgba", "light": "#f0e9fc", "dark": "rgba(150,104,244,.16)"},

    {"key": "nav-bg", "group": "sidebar", "label": "Fond de la navigation", "type": "rgba", "light": "rgba(255,255,255,.45)", "dark": "rgba(16,13,31,.40)"},
    {"key": "shell-bg", "group": "sidebar", "label": "Fond des sous-menus volants et de la page de connexion", "type": "hex", "light": "#1a1258", "dark": "#140d42"},
    {"key": "shell-bg-2", "group": "sidebar", "label": "Fond — sélecteur d'office", "type": "hex", "light": "#2c2170", "dark": "#1c1558"},
    {"key": "shell-text", "group": "sidebar", "label": "Texte de la sidebar", "type": "hex", "light": "#ffffff", "dark": "#ffffff"},
    {"key": "shell-text-dim", "group": "sidebar", "label": "Texte atténué de la sidebar", "type": "hex", "light": "#b6acdb", "dark": "#a89ed4"},
    {"key": "shell-active", "group": "sidebar", "label": "Item de navigation actif", "type": "hex", "light": "#342a7a", "dark": "#2c2170"},
    {"key": "shell-border", "group": "sidebar", "label": "Séparateurs internes", "type": "rgba", "light": "rgba(255,255,255,.10)", "dark": "rgba(255,255,255,.08)"},
    {"key": "brand-strong", "group": "sidebar", "label": "Nom d'utilisateur (pied de sidebar)", "type": "hex", "light": "#2a1c66", "dark": "#ffffff"},
    {"key": "brand-soft", "group": "sidebar", "label": "Mention \"propulsé par\"", "type": "hex", "light": "#4e3f96", "dark": "#a89ed4"},
    {"key": "nav-dim", "group": "sidebar", "label": "Icônes de navigation inactives", "type": "hex", "light": "#2f206f", "dark": "#a89ed4"},
    {"key": "nav-label-c", "group": "sidebar", "label": "Libellés de section (\"GÉNÉRAL\"…)", "type": "hex", "light": "#372979", "dark": "#a89ed4"},

    {"key": "success", "group": "status", "label": "Succès — texte/icône", "type": "hex", "light": "#2f8f5b", "dark": "#7fbf9c"},
    {"key": "success-bg", "group": "status", "label": "Succès — fond", "type": "rgba", "light": "#e4f5ec", "dark": "rgba(47,143,91,.18)"},
    {"key": "warning", "group": "status", "label": "Alerte — texte/icône", "type": "hex", "light": "#b9820f", "dark": "#e3b25b"},
    {"key": "warning-bg", "group": "status", "label": "Alerte — fond", "type": "rgba", "light": "#fbf0d6", "dark": "rgba(185,130,15,.20)"},
    {"key": "critical", "group": "status", "label": "Bloquant — texte/icône", "type": "hex", "light": "#c13f3f", "dark": "#e08a8a"},
    {"key": "critical-bg", "group": "status", "label": "Bloquant — fond", "type": "rgba", "light": "#fbe6e6", "dark": "rgba(193,63,63,.20)"},
    {"key": "info", "group": "status", "label": "Info — texte/icône", "type": "hex", "light": "#5b7bfb", "dark": "#8fa8ff"},
    {"key": "info-bg", "group": "status", "label": "Info — fond", "type": "rgba", "light": "#e9edfe", "dark": "rgba(91,123,251,.20)"},

    {"key": "login-grad-1", "group": "login", "label": "Halo 1", "type": "rgba", "light": "rgba(150,104,244,.14)", "dark": "rgba(150,104,244,.18)"},
    {"key": "login-grad-2", "group": "login", "label": "Halo 2", "type": "rgba", "light": "rgba(80,208,253,.24)", "dark": "rgba(80,208,253,.26)"},
    {"key": "login-grad-3", "group": "login", "label": "Halo 3", "type": "rgba", "light": "rgba(91,123,251,.13)", "dark": "rgba(91,123,251,.15)"},
    {"key": "login-grad-4", "group": "login", "label": "Halo 4", "type": "rgba", "light": "rgba(107,63,212,.17)", "dark": "rgba(171,143,245,.16)"},
    {"key": "login-orb", "group": "login", "label": "Formes flottantes", "type": "orb", "light": "#ffffff", "dark": "#ffffff",
     "a_from_light": .95, "a_to_light": .05, "a_from_dark": .20, "a_to_dark": .02},
    {"key": "login-glass-bg", "group": "login", "label": "Fond de la carte de connexion", "type": "rgba", "light": "rgba(255,255,255,.72)", "dark": "rgba(28,23,64,.62)"},
    {"key": "login-glass-border", "group": "login", "label": "Bordure de la carte de connexion", "type": "rgba", "light": "rgba(255,255,255,.85)", "dark": "rgba(255,255,255,.14)"},
    {"key": "login-badge-bg", "group": "login", "label": "Fond du badge Id.Not", "type": "rgba", "light": "rgba(255,255,255,.08)", "dark": "rgba(255,255,255,.06)"},
    {"key": "login-badge-border", "group": "login", "label": "Bordure du badge Id.Not", "type": "rgba", "light": "rgba(255,255,255,.16)", "dark": "rgba(255,255,255,.14)"},
]

GROUPS = [
    {"id": "surfaces", "label": "Fonds & surfaces"},
    {"id": "appbg", "label": "Dégradé de fond (tableau de bord)"},
    {"id": "cards", "label": "Cartes (effet verre)"},
    {"id": "text", "label": "Texte"},
    {"id": "brand", "label": "Marque & accent"},
    {"id": "sidebar", "label": "Barre latérale"},
    {"id": "status", "label": "Statuts"},
    {"id": "login", "label": "Écran de connexion"},
]

TYPOGRAPHY_PRESETS = {
    "classique": {"label": "Classique", "display": "'Poppins','Segoe UI',sans-serif", "ui": "'Inter',-apple-system,'Segoe UI',sans-serif"},
    "moderne":   {"label": "Moderne",   "display": "'Sora','Segoe UI',sans-serif",    "ui": "'Inter',-apple-system,'Segoe UI',sans-serif"},
    "editorial": {"label": "Éditorial", "display": "'Fraunces',Georgia,serif",         "ui": "'Inter',-apple-system,'Segoe UI',sans-serif"},
}

SHAPE_PRESETS = {
    "anguleux":  {"label": "Anguleux",  "sm": "4px", "md": "6px",  "lg": "10px"},
    "equilibre": {"label": "Équilibré", "sm": "6px", "md": "10px", "lg": "16px"},
    "arrondi":   {"label": "Arrondi",   "sm": "8px", "md": "14px", "lg": "22px"},
}

_TOKENS_BY_KEY = {t["key"]: t for t in TOKEN_SCHEMA}


def default_colors():
    """{"light": {key: valeur, ...}, "dark": {...}} — valeurs par défaut du schéma."""
    return {
        "light": {t["key"]: t["light"] for t in TOKEN_SCHEMA},
        "dark": {t["key"]: t["dark"] for t in TOKEN_SCHEMA},
    }


@dataclass
class TenantTheme:
    colors: dict = field(default_factory=default_colors)
    typography: str = "classique"
    shape: str = "equilibre"


def default_state() -> TenantTheme:
    return TenantTheme()


def normalize_state(overrides: "TenantTheme | dict | None") -> TenantTheme:
    """Fusionne des valeurs partielles (ex. une ligne base de données) avec les
    valeurs par défaut du schéma — clés/thèmes/presets inconnus sont ignorés."""
    state = default_state()
    if overrides is None:
        return state
    if isinstance(overrides, TenantTheme):
        overrides = {"colors": overrides.colors, "typography": overrides.typography, "shape": overrides.shape}
    colors_in = overrides.get("colors") or {}
    for mode in ("light", "dark"):
        for key, val in (colors_in.get(mode) or {}).items():
            if key in _TOKENS_BY_KEY and isinstance(val, str):
                state.colors[mode][key] = val
    if overrides.get("typography") in TYPOGRAPHY_PRESETS:
        state.typography = overrides["typography"]
    if overrides.get("shape") in SHAPE_PRESETS:
        state.shape = overrides["shape"]
    return state


def _resolve_token_value(t: dict, state: TenantTheme, mode: str) -> str:
    raw = state.colors[mode].get(t["key"], t[mode])
    if t["type"] == "orb":
        hexcolor, _alpha = parse_color(raw)
        r, g, b = _hex_to_rgb(hexcolor)
        a_from = t["a_from_light"] if mode == "light" else t["a_from_dark"]
        a_to = t["a_to_light"] if mode == "light" else t["a_to_dark"]
        return f'radial-gradient(circle at 30% 30%, rgba({r},{g},{b},{a_from}), rgba({r},{g},{b},{a_to}))'
    return raw


def theme_vars(state: "TenantTheme | dict | None" = None, mode: str = "light") -> Dict[str, str]:
    """Résout toutes les variables de couleur pour un thème donné (+ typographie/formes)."""
    state = normalize_state(state) if not isinstance(state, TenantTheme) else state
    out = {t["key"]: _resolve_token_value(t, state, mode) for t in TOKEN_SCHEMA}
    typo = TYPOGRAPHY_PRESETS.get(state.typography, TYPOGRAPHY_PRESETS["classique"])
    shape = SHAPE_PRESETS.get(state.shape, SHAPE_PRESETS["equilibre"])
    out["font-display"] = typo["display"]
    out["font-ui"] = typo["ui"]
    out["radius-sm"] = shape["sm"]
    out["radius-md"] = shape["md"]
    out["radius-lg"] = shape["lg"]
    return out


def theme_css(state: "TenantTheme | dict | None" = None) -> str:
    """Sérialise le thème d'une étude en CSS prêt à injecter (même structure à
    3 blocs que tokens.css : :root clair, @media dark, :root[data-theme=dark])."""
    state = normalize_state(state) if not isinstance(state, TenantTheme) else state
    light_vars = theme_vars(state, "light")
    dark_vars = theme_vars(state, "dark")

    def body(d, indent="  "):
        return "\n".join(f"{indent}--{k}: {v};" for k, v in d.items())

    return (
        ":root{\n" + body(light_vars) + "\n}\n"
        '@media (prefers-color-scheme: dark){\n  :root:not([data-theme="light"]){\n'
        + body(dark_vars, "    ") + "\n  }\n}\n"
        ':root[data-theme="dark"]{\n' + body(dark_vars) + "\n}\n"
    )
