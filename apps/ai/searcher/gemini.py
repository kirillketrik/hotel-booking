from typing import List
import logging
from google import genai

from apps.ai.schemas import AccommodationAI, TourSearchResponse
from apps.ai.searcher.base import AiSearcher

logger = logging.getLogger(__name__)


class GeminiSearcher(AiSearcher):
    def __init__(self, api_key: str):

        self.client = genai.Client(api_key=api_key)
        self.model_id = "gemini-2.5-flash"

    def search_tours(self, query: str, limit: int = 3) -> List[AccommodationAI]:
        config = {
            "response_mime_type": "application/json",
            "response_schema": TourSearchResponse,
            "system_instruction": self._get_system_instructions(limit)
        }

        try:
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=f"Запрос пользователя: {query}",
                config=config
            )
            logging.info(f"Parsed response: {response.parsed}")
            return response.parsed.options

        except Exception as e:
            logging.error(f"Gemini API Error: {e}")
            return []

    def _get_system_instructions(self, limit: int) -> str:
        return (
            f"Ты — эксперт по туризму. Твоя задача — найти {limit} вариантов жилья. "
            f"Используй ТОЛЬКО следующие категории: {self.categories_description}. "
            "Если точных данных нет, подбери наиболее подходящие реально существующие объекты."
        )
