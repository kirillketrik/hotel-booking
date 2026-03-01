from django.conf import settings
from django.db import models


class Tour(models.Model):
    title = models.CharField(max_length=255, verbose_name="Название тура")
    description = models.TextField(verbose_name="Описание тура")

    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Стоимость")
    duration_days = models.PositiveSmallIntegerField(verbose_name="Длительность (дней)")
    start_date = models.DateField(verbose_name="Дата начала")
    end_date = models.DateField(verbose_name="Дата конца")

    accommodation = models.ForeignKey(
        'accommodations.Accommodation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tours',
        verbose_name="Рекомендуемое проживание"
    )

    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='organized_tours'
    )

    is_active = models.BooleanField(default=True, verbose_name="Доступен для бронирования")

    class Meta:
        verbose_name = "Тур"
        verbose_name_plural = "Туры"

    def __str__(self):
        return f"{self.title} ({self.start_date})"
