# Ajout de Office.theme — personnalisation visuelle persistée par office.
#
# Migration écrite à la main plutôt que générée : l'environnement où elle a été
# préparée n'avait pas Django 6.1 (le projet l'exige, elle n'y tournait pas).
# Elle ne contient que l'AddField attendu. À confirmer côté projet avec :
#   python manage.py makemigrations --check --dry-run
# qui doit répondre « No changes detected ».

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('datarooms', '0003_document'),
    ]

    operations = [
        migrations.AddField(
            model_name='office',
            name='theme',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
