import logging
from unittest.mock import MagicMock, patch

import pytest
from django.conf import settings

from apps.accommodations.enums import AccommodationType
from apps.ai.schemas import TourSearchResponse
from apps.ai.searcher.gemini import GeminiSearcher

# Инициализируем логгер
logger = logging.getLogger(__name__)


# Создаем фикстуру для инициализации поисковика
@pytest.fixture
def gemini_searcher():
    return GeminiSearcher(api_key=settings.SETTINGS.AI.API_KEY.get_secret_value())


# Тестовые данные для параметризации
test_prompts = [
    ("Хочу в горы с собакой", 2),
    ("Отель в центре Москвы с бассейном", 1),
    ("Бюджетный хостел в Питере", 3),
]


@pytest.mark.parametrize("query, limit", test_prompts)
def test_search_tours_success(gemini_searcher, query, limit):
    """
    Проверяем успешный вызов поиска с разными промптами.
    """

    # 1. Готовим фейковый ответ от Gemini
    mock_response = MagicMock()
    # Эмулируем список отелей, который должен вернуть Pydantic (response.parsed.options)
    mock_accommodation = MagicMock(spec=TourSearchResponse)
    mock_accommodation.title = "Test Hotel"

    mock_response.parsed.options = [mock_accommodation] * limit

    # 2. Патчим метод generate_content клиента
    with patch.object(gemini_searcher.client.models, 'generate_content', return_value=mock_response) as mock_method:
        results = gemini_searcher.search_tours(query, limit=limit)

        # Проверяем, что метод был вызван с правильным конфигом
        mock_method.assert_called_once()
        args, kwargs = mock_method.call_args

        assert query in kwargs['contents']
        assert kwargs['config']['response_schema'] == TourSearchResponse

        # Проверяем результат
        assert len(results) == limit
        assert results[0].title == "Test Hotel"


def test_search_tours_error_handling(gemini_searcher):
    """
    Проверяем, что при ошибке API метод возвращает пустой список, а не падает.
    """
    with patch.object(gemini_searcher.client.models, 'generate_content', side_effect=Exception("API Down")):
        results = gemini_searcher.search_tours("Любой запрос")
        assert results == []



@pytest.mark.integration
def test_search_tours_real_api_call():
    """
    Интеграционный тест с логированием процесса.
    """
    logger.info("Инициализация GeminiSearcher...")
    searcher = GeminiSearcher(api_key=settings.SETTINGS.AI.API_KEY.get_secret_value())

    query = "Найди уютную агроусадьбу в Беларуси на выходные"
    limit = 2

    logger.info(f"Отправка запроса к ИИ с промптом: '{query}' (limit={limit})")
    results = searcher.search_tours(query, limit=limit)

    logger.info(f"Получено ответов от ИИ: {len(results)}")

    assert isinstance(results, list), "Результат должен быть списком"
    assert len(results) > 0, "ИИ должен был найти хотя бы один вариант"

    for i, hotel in enumerate(results):
        logger.info(f"Вариант #{i + 1}: {hotel.title} [Категория: {hotel.category}]")

        # Проверка категории
        assert hotel.category in AccommodationType.values, \
            f"Объект '{hotel.title}' имеет недопустимую категорию '{hotel.category}'"

    logger.info("Тест успешно завершен, все категории валидны.")
