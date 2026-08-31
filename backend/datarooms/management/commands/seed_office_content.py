"""Contenu de démonstration d'un office : dossiers, sous-dossiers et pièces réelles.

Séparé de `seed_demo` (comptes, offices, modules) parce que ce n'est pas la même
nature de données : `seed_demo` pose ce SANS QUOI l'application ne démarre pas,
celle-ci pose de quoi montrer quelque chose. On peut la relancer, la cibler sur un
office précis, ou ne jamais l'utiliser.

Les fichiers sont générés ici, pas lus sur le disque : un PDF, une image et un
texte fabriqués à la volée traversent vraiment le FileField, donc le stockage
S3/MinIO et le préfixe par tenant (tenancy/storage.py). Des lignes insérées
directement en base pointeraient sur des objets absents du bucket, et l'aperçu
échouerait au premier clic — exactement le genre de démonstration qui se casse
devant le client.

    python manage.py seed_office_content --office=officeb

MinIO doit tourner et le bucket exister (voir CLAUDE.md, Commandes).
"""

import zlib

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError

from datarooms.models import Dataroom, Document, Folder, Office
from datarooms.tenancy.context import TenantContext, reset_current_tenant, set_current_tenant
from datarooms.tenancy.registry import ensure_tenant_registered, tenant_alias


def _pdf(title, lines):
    """PDF minimal mais VALIDE (une page A4, Helvetica), assemblé à la main.

    Aucune dépendance : reportlab n'est pas dans requirements.txt et n'a pas à y
    entrer pour trois pages de démonstration. Les décalages de la table xref sont
    calculés à partir des objets réellement écrits — un PDF dont l'xref ment
    s'ouvre chez les uns et pas chez les autres.
    """
    text = f"BT /F1 18 Tf 60 760 Td ({title}) Tj ET\n"
    y = 720
    for line in lines:
        text += f"BT /F1 11 Tf 60 {y} Td ({line}) Tj ET\n"
        y -= 18

    stream = text.encode("latin-1", "replace")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
        b"/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"endstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + body + b"\nendobj\n"

    xref_at = len(out)
    out += f"xref\n0 {len(objects) + 1}\n".encode()
    out += b"0000000000 65535 f \n"
    for offset in offsets:
        out += f"{offset:010d} 00000 n \n".encode()
    out += (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_at}\n".encode()
        + b"%%EOF\n"
    )
    return bytes(out)


def _png(width, height, rgb):
    """PNG uni, assemblé à la main (zlib est dans la bibliothèque standard)."""
    raw = b"".join(b"\x00" + bytes(rgb) * width for _ in range(height))

    def chunk(kind, data):
        payload = kind + data
        return (
            len(data).to_bytes(4, "big")
            + payload
            + (zlib.crc32(payload) & 0xFFFFFFFF).to_bytes(4, "big")
        )

    header = width.to_bytes(4, "big") + height.to_bytes(4, "big") + bytes([8, 2, 0, 0, 0])
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


CONTENU = {
    "Vente Guerin - 8 avenue Foch": {
        "racine": [
            ("Compromis de vente.pdf", lambda: _pdf("Compromis de vente", [
                "Bien : appartement T3, 8 avenue Foch.",
                "Vendeur : M. Guerin. Acquereur : Mme Lefevre.",
                "Piece de demonstration - Espace Notarial Next.",
            ])),
            ("Notes de rendez-vous.txt", lambda: (
                "Rendez-vous du 12/09\n"
                "- Diagnostics recus, DPE classe D\n"
                "- Financement : accord de principe, offre attendue\n"
                "- Signature envisagee mi-octobre\n"
            ).encode("utf-8")),
        ],
        "dossiers": {
            "Diagnostics": [
                ("DPE.pdf", lambda: _pdf("Diagnostic de performance energetique", [
                    "Classe energie : D", "Classe climat : C", "Valable jusqu'au 12/09/2036",
                ])),
                ("Plan cadastral.png", lambda: _png(320, 220, (94, 106, 210))),
            ],
            "Identites": [
                ("Piece identite vendeur.png", lambda: _png(280, 180, (176, 141, 87))),
            ],
        },
    },
    "Succession Martin": {
        "racine": [
            ("Acte de notoriete.pdf", lambda: _pdf("Acte de notoriete", [
                "Succession de M. Martin, decede le 03/02/2026.",
                "Heritiers : deux enfants, part egale.",
                "Piece de demonstration - Espace Notarial Next.",
            ])),
            ("Inventaire.csv", lambda: (
                "bien;valeur;source\n"
                "Residence principale;285000;estimation notaire\n"
                "Compte courant;12400;releve bancaire\n"
                "Assurance vie;48000;contrat\n"
            ).encode("utf-8")),
        ],
        "dossiers": {},
    },
}


class Command(BaseCommand):
    help = "Crée dossiers, sous-dossiers et pièces de démonstration dans un office."

    def add_arguments(self, parser):
        parser.add_argument("--office", dest="subdomain", required=True)

    def handle(self, *args, **options):
        subdomain = options["subdomain"]
        office = Office.objects.using("default").filter(subdomain=subdomain).first()
        if office is None:
            raise CommandError(f"Office '{subdomain}' introuvable — lancer seed_demo d'abord ?")

        # Sans ce contexte, le routeur ne sait pas dans quelle base écrire (il lève
        # MissingTenantContext) et le chemin de stockage n'a pas de préfixe d'office.
        ensure_tenant_registered(subdomain)
        token = set_current_tenant(TenantContext(subdomain=subdomain, alias=tenant_alias(subdomain)))
        try:
            for nom, plan in CONTENU.items():
                dataroom = Dataroom.objects.filter(name=nom).first()
                if dataroom is not None:
                    self.stdout.write(f"'{nom}' existe déjà — ignoré.")
                    continue
                dataroom = Dataroom.objects.create(name=nom)
                pieces = 0

                for fichier, fabrique in plan["racine"]:
                    self._document(dataroom, None, fichier, fabrique())
                    pieces += 1

                for nom_dossier, fichiers in plan["dossiers"].items():
                    dossier = Folder.objects.create(dataroom=dataroom, parent=None, name=nom_dossier)
                    for fichier, fabrique in fichiers:
                        self._document(dataroom, dossier, fichier, fabrique())
                        pieces += 1

                self.stdout.write(self.style.SUCCESS(f"'{nom}' créé — {pieces} pièce(s)."))
        finally:
            reset_current_tenant(token)

    def _document(self, dataroom, folder, filename, content):
        Document.objects.create(
            dataroom=dataroom,
            folder=folder,
            name=filename,
            file=ContentFile(content, name=filename),
        )
