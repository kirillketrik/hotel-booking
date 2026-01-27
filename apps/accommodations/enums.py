from django.db import models
from django.utils.translation import gettext_lazy as _


class AccommodationTypes(models.TextChoices):
    HOTEL = 'HOTEL', _('Отель / Гостиница')
    HOSTEL = 'HOSTEL', _('Хостел')
    FARMSTAND = 'FARM', _('Агроусадьба')
    RESORT = 'RESORT', _('Санаторий / Пансионат')
    RECREATION_CENTER = 'REC_CTR', _('База отдыха')
    APARTMENT = 'APART', _('Апартаменты / Квартира')
    COTTAGE = 'COTTAGE', _('Коттедж / Дом посуточно')
    GLAMPING = 'GLAMP', _('Глэмпинг / Кемпинг')
