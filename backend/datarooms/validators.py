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
