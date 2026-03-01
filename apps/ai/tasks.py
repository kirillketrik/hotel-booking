import requests
from asgiref.sync import async_to_sync
from celery import shared_task
from channels.layers import get_channel_layer
from django.core.files.base import ContentFile
from django.db import transaction

from apps.accommodations.models import Accommodation, AccommodationImage
from apps.accommodations.models import AccommodationAmenity, RoomType
from apps.ai.searcher import AiSearcher


@shared_task(bind=True)
def run_ai_search_task(self, request_id: int, user_query: str):
    channel_layer = get_channel_layer()
    group_name = f"search_{request_id}"
    ai_searcher: AiSearcher
    try:
        from apps.ai.searcher.factory import get_ai_searcher
        ai_searcher = get_ai_searcher()
    except Exception as e:
        async_to_sync(channel_layer.group_send)(
            group_name, {"type": "search_update", "status": "Config Error", "error": str(e)}
        )
        return

    try:
        results = ai_searcher.search_tours(user_query, limit=3)

        for index, item in enumerate(results):
            with transaction.atomic():
                # Создаем отель
                accommodation = Accommodation.objects.create(
                    title=item.title,
                    category=item.category,
                    description=item.description,
                    min_price=item.min_price,
                    booking_url=item.booking_url
                )

                # Добавляем удобства (обработка M2M)
                for am_name in item.amenities:
                    amenity, _ = AccommodationAmenity.objects.get_or_create(title=am_name)
                    accommodation.amenities.add(amenity)

                # Создаем номера
                for rt in item.room_types:
                    RoomType.objects.create(
                        accommodation=accommodation,
                        name=rt.name,
                        provider=rt.provider,
                        booking_url=rt.booking_url
                    )

                if item.image_urls:
                    download_accommodation_images.delay(accommodation.id, item.image_urls, request_id)

                async_to_sync(channel_layer.group_send)(
                    group_name, {
                        "type": "search_update",
                        "status": f"Found {accommodation.title}. Media is loading...",
                        "progress": 20 + (index + 1) * 20,
                        "new_accommodation_id": accommodation.id
                    }
                )

            async_to_sync(channel_layer.group_send)(
                group_name, {
                    "type": "search_update",
                    "status": f"Found {accommodation.title}",
                    "progress": 20 + (index + 1) * 25,
                    "new_accommodation_id": accommodation.id
                }
            )

    except Exception as e:
        async_to_sync(channel_layer.group_send)(
            group_name, {"type": "search_update", "status": "Error occurred", "error": str(e)}
        )
        raise e

    # Завершение
    async_to_sync(channel_layer.group_send)(
        group_name, {"type": "search_update", "status": "Completed", "progress": 100}
    )


@shared_task
def download_accommodation_images(accommodation_id, image_urls, request_id=None):
    """
    Задача на скачивание и сохранение изображений для конкретного объекта.
    """
    try:
        accommodation = Accommodation.objects.get(id=accommodation_id)
    except Accommodation.DoesNotExist:
        return f"Accommodation {accommodation_id} not found"

    saved_count = 0
    for url in image_urls:
        try:
            response = requests.get(url, timeout=15)
            response.raise_for_status()

            file_name = f"acc_{accommodation_id}_{saved_count}.jpg"

            img_instance = AccommodationImage(accommodation=accommodation)

            img_instance.image.save(
                file_name,
                ContentFile(response.content),
                save=True
            )
            saved_count += 1

        except Exception as e:
            print(f"Failed to download image from {url}: {e}")
            continue

    if request_id:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"search_{request_id}",
            {
                "type": "search_update",
                "status": f"Photos updated for {accommodation.title}",
                "accommodation_id": accommodation_id,
                "event": "images_loaded"
            }
        )

    return f"Saved {saved_count} images for ID {accommodation_id}"
