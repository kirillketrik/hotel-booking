import uuid6
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("tours", "0005_seed_agencies_tours"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Wishlist",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid6.uuid7,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="wishlist_items",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="User",
                    ),
                ),
                (
                    "tour",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="wishlisted_by",
                        to="tours.tour",
                        verbose_name="Tour",
                    ),
                ),
            ],
            options={
                "verbose_name": "Wishlist Item",
                "verbose_name_plural": "Wishlist Items",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="wishlist",
            constraint=models.UniqueConstraint(
                fields=["user", "tour"], name="unique_user_tour_wishlist"
            ),
        ),
    ]
