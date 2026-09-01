from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django_otp.plugins.otp_totp.models import TOTPDevice

from datarooms.models import HyperadminAccess, Office, Module, OfficeMembership

# Vecteur de test officiel RFC 6238 ("12345678901234567890" en ASCII) — secret fixe et
# connu pour la démo, pas de génération aléatoire : voir CLAUDE.md pour la commande qui
# calcule un code TOTP valide à partir de ce secret au moment de la présentation.
DEMO_TOTP_KEY = "3132333435363738393031323334353637383930"

class Command(BaseCommand):
    help = "Crée des données de démo pour le POC"

    def handle(self, *args, **options):
        coffre_fort, _ = Module.objects.get_or_create(
            slug="coffre-fort",
            defaults={"name": "Coffre-fort", "description": "Module de stockage sécurisé (démo)"}
        )
        Module.objects.get_or_create(
            slug="confiance-rib",
            defaults={"name": "ConfianceRIB", "description": "Vérification de RIB (démo)"}
        )

        office_a, _ = Office.objects.get_or_create(
            subdomain="officea",
            defaults={"name": "Office A - Notaires Associés", "primary_color": "#1a56db"}
        )
        office_a.enabled_modules.add(coffre_fort)

        office_b, _ = Office.objects.get_or_create(
            subdomain="officeb",
            defaults={"name": "Office B - Étude Martin", "primary_color": "#b45309"}
        )
        # office_b n'a volontairement aucun module activé, pour montrer le contraste

        def make_user(username):
            user, _ = User.objects.get_or_create(username=username)
            user.set_password("demo1234")
            user.save()
            return user

        alice = make_user("alice")
        OfficeMembership.objects.get_or_create(user=alice, office=office_a, defaults={"role": "admin"})

        bob = make_user("bob")
        OfficeMembership.objects.get_or_create(user=bob, office=office_b, defaults={"role": "membre"})

        # carla : LE compte à utiliser en démo pour prouver l'identité partagée
        carla = make_user("carla")
        OfficeMembership.objects.get_or_create(user=carla, office=office_a, defaults={"role": "superadmin"})
        OfficeMembership.objects.get_or_create(user=carla, office=office_b, defaults={"role": "superadmin"})

        # Dispositif TOTP préconfiguré pour carla — pas d'enrôlement à faire en direct
        # pendant la démo. Secret fixe, voir DEMO_TOTP_KEY ci-dessus.
        TOTPDevice.objects.get_or_create(
            user=carla, name="demo",
            defaults={"key": DEMO_TOTP_KEY, "confirmed": True},
        )

        # hyperadmin : rôle Notantis transverse à tous les offices (HyperadminAccess),
        # distinct du rôle "superadmin" d'OfficeMembership porté par carla (scopé,
        # lui, à office_a/office_b précisément). Pas de TOTPDevice préconfiguré
        # (contrairement à carla) : ce compte n'a pas de scénario de démo en direct
        # dédié, premier login enrôle son dispositif comme alice/bob.
        hyperadmin = make_user("hyperadmin")
        HyperadminAccess.objects.get_or_create(user=hyperadmin)

        self.stdout.write(self.style.SUCCESS(
            "Données de démo créées (alice, bob, carla, hyperadmin / mdp: demo1234)."
        ))