from django.db import migrations

AMENITIES = [
    ("WiFi", "wifi"),
    ("Swimming Pool", "pool"),
    ("Gym / Fitness Center", "gym"),
    ("Spa", "spa"),
    ("Restaurant", "restaurant"),
    ("Bar / Lounge", "bar"),
    ("Parking", "parking"),
    ("Air Conditioning", "air-conditioning"),
    ("Breakfast Included", "breakfast"),
    ("Room Service", "room-service"),
    ("Airport Shuttle", "shuttle"),
    ("Laundry Service", "laundry"),
    ("Concierge", "concierge"),
    ("Pet Friendly", "pet-friendly"),
    ("Beachfront", "beachfront"),
    ("Sea View", "sea-view"),
    ("Kids Club", "kids-club"),
    ("Conference Room", "conference-room"),
    ("24-Hour Reception", "reception-24h"),
    ("Safe / Security Box", "safe"),
]


def seed_amenities(apps, schema_editor):
    Amenity = apps.get_model("tours", "Amenity")
    Amenity.objects.bulk_create(
        [Amenity(name=name, icon=icon) for name, icon in AMENITIES],
        ignore_conflicts=True,
    )


def unseed_amenities(apps, schema_editor):
    Amenity = apps.get_model("tours", "Amenity")
    Amenity.objects.filter(name__in=[name for name, _ in AMENITIES]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("tours", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_amenities, reverse_code=unseed_amenities),
    ]
