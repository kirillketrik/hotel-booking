from django.db import migrations, models


def migrate_owner_to_role(apps, schema_editor):
    """
    For every Agency, find the AgencyEmployee whose user matches
    agency.owner and set their role to 'owner'.
    All other admins stay as 'admin'.
    """
    Agency = apps.get_model("tours", "Agency")
    AgencyEmployee = apps.get_model("tours", "AgencyEmployee")

    for agency in Agency.objects.select_related("owner").all():
        AgencyEmployee.objects.filter(
            agency=agency, user=agency.owner
        ).update(role="owner")


def reverse_owner_role(apps, schema_editor):
    AgencyEmployee = apps.get_model("tours", "AgencyEmployee")
    AgencyEmployee.objects.filter(role="owner").update(role="admin")


class Migration(migrations.Migration):
    dependencies = [
        ("tours", "0002_seed_amenities"),
    ]

    operations = [
        # 1. Extend the role field choices to include 'owner'
        migrations.AlterField(
            model_name="agencyemployee",
            name="role",
            field=models.CharField(
                choices=[
                    ("owner", "Owner"),
                    ("admin", "Admin"),
                    ("operator", "Operator"),
                ],
                max_length=20,
                verbose_name="Role",
            ),
        ),
        # 2. Data-migrate: set role='owner' where user == agency.owner
        migrations.RunPython(
            migrate_owner_to_role,
            reverse_code=reverse_owner_role,
        ),
        # 3. Drop the owner FK from Agency
        migrations.RemoveField(
            model_name="agency",
            name="owner",
        ),
    ]
