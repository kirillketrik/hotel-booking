from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tours", "0003_owner_role_remove_agency_owner"),
    ]

    operations = [
        migrations.AddField(
            model_name="invitation",
            name="role",
            field=models.CharField(
                choices=[("admin", "Admin"), ("operator", "Operator")],
                default="operator",
                max_length=20,
                verbose_name="Assigned Role",
            ),
        ),
    ]
