from django.core.management import call_command
from django.core.management.base import BaseCommand

from datarooms.models import Office
from datarooms.tenancy.registry import ensure_tenant_registered


class Command(BaseCommand):
    help = "Enregistre et migre la base SQLite de chaque Office (une base par tenant)."

    def add_arguments(self, parser):
        parser.add_argument("--office", dest="subdomain", default=None)

    def handle(self, *args, **options):
        offices = Office.objects.using("default").all()
        if options["subdomain"]:
            offices = offices.filter(subdomain=options["subdomain"])
        if not offices.exists():
            self.stdout.write(self.style.WARNING("Aucun office trouvé — lancer seed_demo d'abord ?"))
            return
        for office in offices:
            alias = ensure_tenant_registered(office.subdomain)
            self.stdout.write(f"Migration tenant '{office.subdomain}' -> '{alias}'")
            call_command("migrate", database=alias, verbosity=1)
        self.stdout.write(self.style.SUCCESS(f"{offices.count()} base(s) tenant à jour."))
