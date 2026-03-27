import datetime
from django.db import migrations


def seed_agencies_and_tours(apps, schema_editor):
    User = apps.get_model("users", "User")
    Agency = apps.get_model("tours", "Agency")
    AgencyEmployee = apps.get_model("tours", "AgencyEmployee")
    Location = apps.get_model("tours", "Location")
    Tour = apps.get_model("tours", "Tour")
    TourTransfer = apps.get_model("tours", "TourTransfer")

    # Use the first superuser as the owner for seed data
    owner = User.objects.filter(is_superuser=True).first()
    if owner is None:
        return  # No superuser yet — skip gracefully

    # ── Agency 1: Horizon Voyages ─────────────────────────────────────────────
    agency1, _ = Agency.objects.get_or_create(
        name="Horizon Voyages",
        defaults={
            "description": (
                "Horizon Voyages specialises in premium European escapes and "
                "cultural immersion journeys. From the sun-drenched Amalfi Coast "
                "to the ancient streets of Athens, we craft unforgettable itineraries "
                "for discerning travellers."
            ),
            "status": "approved",
        },
    )
    emp1, _ = AgencyEmployee.objects.get_or_create(
        user=owner,
        agency=agency1,
        defaults={"role": "owner"},
    )

    # Tours for Horizon Voyages
    loc_rome, _ = Location.objects.get_or_create(
        country="Italy", city="Rome",
        defaults={"latitude": 41.9028, "longitude": 12.4964},
    )
    tour1, _ = Tour.objects.get_or_create(
        title="Roman Holiday — Classic Italy in 7 Days",
        agency=agency1,
        defaults={
            "created_by": emp1,
            "description": (
                "Explore the Eternal City on a carefully curated 7-day journey. "
                "Walk through the Colosseum, toss a coin in the Trevi Fountain, "
                "and savour authentic Roman cuisine at family-run trattorias. "
                "Includes day trips to Vatican City and Tivoli."
            ),
            "price": "1490.00",
            "start_date": datetime.date(2026, 6, 1),
            "end_date": datetime.date(2026, 6, 7),
            "duration_days": 7,
            "location": loc_rome,
            "max_adults": 12,
            "max_children": 4,
            "status": "approved",
        },
    )
    TourTransfer.objects.get_or_create(
        tour=tour1,
        transfer_type="airport",
        defaults={
            "description": "Return airport–hotel transfers by private coach.",
            "price": "0.00",
            "is_included": True,
        },
    )
    TourTransfer.objects.get_or_create(
        tour=tour1,
        transfer_type="city",
        defaults={
            "description": "Daily city bus pass for unlimited local travel.",
            "price": "25.00",
            "is_included": False,
        },
    )

    loc_athens, _ = Location.objects.get_or_create(
        country="Greece", city="Athens",
        defaults={"latitude": 37.9838, "longitude": 23.7275},
    )
    tour2, _ = Tour.objects.get_or_create(
        title="Greek Mythology & Islands — 10 Days",
        agency=agency1,
        defaults={
            "created_by": emp1,
            "description": (
                "Trace the footsteps of ancient gods on this epic 10-day odyssey. "
                "Begin in Athens with the Acropolis and Agora, then island-hop to "
                "Mykonos and Santorini. Sunset views, volcanic beaches, and "
                "world-class seafood await."
            ),
            "price": "2350.00",
            "start_date": datetime.date(2026, 7, 10),
            "end_date": datetime.date(2026, 7, 19),
            "duration_days": 10,
            "location": loc_athens,
            "max_adults": 16,
            "max_children": 2,
            "status": "approved",
        },
    )
    TourTransfer.objects.get_or_create(
        tour=tour2,
        transfer_type="airport",
        defaults={
            "description": "Arrival and departure airport transfers included.",
            "price": "0.00",
            "is_included": True,
        },
    )
    TourTransfer.objects.get_or_create(
        tour=tour2,
        transfer_type="hotel",
        defaults={
            "description": "Ferry transfers between islands.",
            "price": "0.00",
            "is_included": True,
        },
    )

    loc_paris, _ = Location.objects.get_or_create(
        country="France", city="Paris",
        defaults={"latitude": 48.8566, "longitude": 2.3522},
    )
    tour3, _ = Tour.objects.get_or_create(
        title="Paris & The Loire Valley — 5 Days",
        agency=agency1,
        defaults={
            "created_by": emp1,
            "description": (
                "A five-day affair with the finest of France. Spend two days in "
                "Paris — Eiffel Tower, Louvre, Montmartre — then head south to "
                "the Loire Valley for château visits, wine tastings, and cycling "
                "through UNESCO-listed landscapes."
            ),
            "price": "980.00",
            "start_date": datetime.date(2026, 5, 15),
            "end_date": datetime.date(2026, 5, 19),
            "duration_days": 5,
            "location": loc_paris,
            "max_adults": 10,
            "max_children": 3,
            "status": "approved",
        },
    )
    TourTransfer.objects.get_or_create(
        tour=tour3,
        transfer_type="airport",
        defaults={
            "description": "Airport to Paris city centre by express shuttle.",
            "price": "0.00",
            "is_included": True,
        },
    )
    TourTransfer.objects.get_or_create(
        tour=tour3,
        transfer_type="custom",
        defaults={
            "description": "Private minivan to Loire Valley châteaux.",
            "price": "60.00",
            "is_included": False,
        },
    )

    # ── Agency 2: Silk Road Expeditions ──────────────────────────────────────
    agency2, _ = Agency.objects.get_or_create(
        name="Silk Road Expeditions",
        defaults={
            "description": (
                "Silk Road Expeditions brings you closer to Asia's most captivating "
                "destinations. From the temples of Kyoto to the floating markets of "
                "Bangkok, our expert guides lead small-group adventures that go beyond "
                "the tourist trail."
            ),
            "status": "approved",
        },
    )
    emp2, _ = AgencyEmployee.objects.get_or_create(
        user=owner,
        agency=agency2,
        defaults={"role": "owner"},
    )

    loc_tokyo, _ = Location.objects.get_or_create(
        country="Japan", city="Tokyo",
        defaults={"latitude": 35.6762, "longitude": 139.6503},
    )
    tour4, _ = Tour.objects.get_or_create(
        title="Japan: Tokyo to Kyoto — 12 Days",
        agency=agency2,
        defaults={
            "created_by": emp2,
            "description": (
                "Immerse yourself in the fascinating contrast of ancient and ultramodern "
                "Japan. Explore the neon-lit districts of Tokyo, ride the Shinkansen "
                "bullet train, meditate in Kyoto's Zen gardens, and experience the "
                "deer-filled paths of Nara. A journey that changes perspectives."
            ),
            "price": "3200.00",
            "start_date": datetime.date(2026, 9, 5),
            "end_date": datetime.date(2026, 9, 16),
            "duration_days": 12,
            "location": loc_tokyo,
            "max_adults": 10,
            "max_children": 0,
            "status": "approved",
        },
    )
    TourTransfer.objects.get_or_create(
        tour=tour4,
        transfer_type="airport",
        defaults={
            "description": "Narita/Haneda airport pickup by private car.",
            "price": "0.00",
            "is_included": True,
        },
    )
    TourTransfer.objects.get_or_create(
        tour=tour4,
        transfer_type="city",
        defaults={
            "description": "7-day JR Pass for Shinkansen and local trains.",
            "price": "0.00",
            "is_included": True,
        },
    )

    loc_bangkok, _ = Location.objects.get_or_create(
        country="Thailand", city="Bangkok",
        defaults={"latitude": 13.7563, "longitude": 100.5018},
    )
    tour5, _ = Tour.objects.get_or_create(
        title="Thailand Highlights — 9 Days",
        agency=agency2,
        defaults={
            "created_by": emp2,
            "description": (
                "Discover the best of Thailand from the buzzing streets of Bangkok "
                "to the tranquil temples of Chiang Mai and the turquoise waters of "
                "Koh Samui. Street food tours, tuk-tuk rides, and sunrise elephant "
                "sanctuaries make this an adventure to remember."
            ),
            "price": "1750.00",
            "start_date": datetime.date(2026, 11, 1),
            "end_date": datetime.date(2026, 11, 9),
            "duration_days": 9,
            "location": loc_bangkok,
            "max_adults": 14,
            "max_children": 4,
            "status": "approved",
        },
    )
    TourTransfer.objects.get_or_create(
        tour=tour5,
        transfer_type="airport",
        defaults={
            "description": "Suvarnabhumi airport to hotel by air-conditioned van.",
            "price": "0.00",
            "is_included": True,
        },
    )
    TourTransfer.objects.get_or_create(
        tour=tour5,
        transfer_type="hotel",
        defaults={
            "description": "Overnight sleeper train Bangkok–Chiang Mai.",
            "price": "0.00",
            "is_included": True,
        },
    )
    TourTransfer.objects.get_or_create(
        tour=tour5,
        transfer_type="custom",
        defaults={
            "description": "Speedboat transfer to Koh Samui.",
            "price": "35.00",
            "is_included": False,
        },
    )

    loc_marrakech, _ = Location.objects.get_or_create(
        country="Morocco", city="Marrakech",
        defaults={"latitude": 31.6295, "longitude": -7.9811},
    )
    tour6, _ = Tour.objects.get_or_create(
        title="Morocco Desert & Medina — 8 Days",
        agency=agency2,
        defaults={
            "created_by": emp2,
            "description": (
                "A vibrant 8-day journey through Morocco's most iconic landscapes. "
                "Wander the labyrinthine souks of Marrakech, sleep under a blanket "
                "of stars in the Sahara Desert, and explore the blue city of Chefchaouen. "
                "Camel rides, traditional riads, and aromatic tagines included."
            ),
            "price": "1390.00",
            "start_date": datetime.date(2026, 10, 12),
            "end_date": datetime.date(2026, 10, 19),
            "duration_days": 8,
            "location": loc_marrakech,
            "max_adults": 12,
            "max_children": 2,
            "status": "approved",
        },
    )
    TourTransfer.objects.get_or_create(
        tour=tour6,
        transfer_type="airport",
        defaults={
            "description": "Marrakech Menara airport to riad transfer.",
            "price": "0.00",
            "is_included": True,
        },
    )
    TourTransfer.objects.get_or_create(
        tour=tour6,
        transfer_type="custom",
        defaults={
            "description": "4x4 desert transfer Marrakech–Merzouga dunes.",
            "price": "0.00",
            "is_included": True,
        },
    )


def reverse_seed(apps, schema_editor):
    Agency = apps.get_model("tours", "Agency")
    Agency.objects.filter(
        name__in=["Horizon Voyages", "Silk Road Expeditions"]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("tours", "0004_invitation_role"),
    ]

    operations = [
        migrations.RunPython(seed_agencies_and_tours, reverse_code=reverse_seed),
    ]
