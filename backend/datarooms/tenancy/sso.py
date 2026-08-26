from django.core import signing

TICKET_SALT = "datarooms.tenancy.sso"
TICKET_MAX_AGE = 30  # secondes — juste assez pour l'aller-retour navigateur

# Registre des tickets déjà consommés, en mémoire process (suffisant pour un POC ;
# ne survit pas à un redémarrage du serveur de dev, sans conséquence ici).
_consumed_tickets = set()


def issue_ticket(user_id: int, target_subdomain: str) -> str:
    return signing.dumps({"user_id": user_id, "target": target_subdomain}, salt=TICKET_SALT)


def consume_ticket(ticket: str):
    """Retourne le payload si le ticket est valide, pas expiré et pas déjà utilisé ;
    None sinon. Usage unique : un ticket intercepté et rejoué échoue."""
    if not ticket or ticket in _consumed_tickets:
        return None
    try:
        payload = signing.loads(ticket, salt=TICKET_SALT, max_age=TICKET_MAX_AGE)
    except signing.BadSignature:
        return None
    _consumed_tickets.add(ticket)
    return payload
