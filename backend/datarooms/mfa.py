import base64
import io

from django_otp.qr import write_qrcode_image


def qr_code_data_uri(config_url: str) -> str:
    """Rend l'URI otpauth:// d'un TOTPDevice en QR code SVG, en data URI —
    consommable directement par un <img> côté frontend, sans lib JS supplémentaire.
    Réutilise le helper fourni par django-otp lui-même plutôt que de refaire l'appel
    à la lib qrcode à la main."""
    buffer = io.BytesIO()
    write_qrcode_image(config_url, buffer)
    return "data:image/svg+xml;base64," + base64.b64encode(buffer.getvalue()).decode()
