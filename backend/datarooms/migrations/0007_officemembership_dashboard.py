from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('datarooms', '0006_office_theme'),
    ]

    operations = [
        migrations.AddField(
            model_name='officemembership',
            name='dashboard',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
