from django.db import migrations


def create_base_amenities(apps, schema_editor):
    Amenity = apps.get_model('accommodations', 'AccommodationAmenity')

    amenities_list = [
        # Интернет и связь
        "Бесплатный Wi-Fi", "Интернет в номере",

        # Питание (важнейшие фильтры)
        "Завтрак включен", "Завтрак «шведский стол»", "Все включено", "Ресторан", "Бар",

        # Инфраструктура
        "Парковка", "Бассейн", "Тренажерный зал", "Спа-центр", "Конференц-зал",

        # Сервисы
        "Круглосуточная стойка регистрации", "Трансфер от/до аэропорта", "Прачечная",
        "Обслуживание номеров", "Хранение багажа",

        # В номере
        "Кондиционер", "Фен", "Холодильник", "Телевизор", "Сейф в номере",

        # Правила и дети
        "Можно с питомцами", "Семейные номера", "Детская игровая площадка",
        "Лифт", "Номера для некурящих"
    ]

    amenities = [
        Amenity(name=name) for name in amenities_list
    ]

    Amenity.objects.bulk_create(amenities)


def remove_amenities(apps, schema_editor):
    Amenity = apps.get_model('accommodations', 'AccommodationAmenity')
    Amenity.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ('accommodations', '0001_initial'),  # Замени на имя последней миграции в этом приложении
    ]

    operations = [
        migrations.RunPython(create_base_amenities, reverse_code=remove_amenities),
    ]
