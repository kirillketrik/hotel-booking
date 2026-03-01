# apps/ai/models.py
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class SearchStatus(models.TextChoices):
    PENDING = 'PENDING', _('В очереди')
    PROCESSING = 'PROCESSING', _('Выполняется')
    SUCCESS = 'SUCCESS', _('Завершено успешно')
    FAILED = 'FAILED', _('Ошибка')


class SearchRequest(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="search_requests",
        verbose_name=_("Пользователь")
    )
    query = models.TextField(
        verbose_name=_("Текстовый запрос")
    )
    status = models.CharField(
        max_length=20,
        choices=SearchStatus.choices,
        default=SearchStatus.PENDING,
        verbose_name=_("Статус поиска")
    )

    error_message = models.TextField(
        null=True,
        blank=True,
        verbose_name=_("Сообщение об ошибке")
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Дата создания")
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Дата обновления")
    )

    class Meta:
        verbose_name = _("Запрос на поиск")
        verbose_name_plural = _("Запросы на поиск")
        ordering = ['-created_at']

    def __str__(self):
        return f"Search #{self.id} ({self.status})"