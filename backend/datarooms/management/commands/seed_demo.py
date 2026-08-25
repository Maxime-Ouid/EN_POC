from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from datarooms.models import Office, Module, OfficeMembership

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

        self.stdout.write(self.style.SUCCESS("Données de démo créées (alice, bob, carla / mdp: demo1234)."))