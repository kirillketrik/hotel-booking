from abc import ABC, abstractmethod
from typing import List

from apps.accommodations.enums import AccommodationType
from apps.ai.schemas import AccommodationAI


class AiSearcher(ABC):
    @property
    def categories_description(self) -> str:
        return ", ".join([f"{choice[0]} ({choice[1]})" for choice in AccommodationType.choices])

    @abstractmethod
    def search_tours(self, query: str, limit: int = 3) -> List[AccommodationAI]:
        raise NotImplemented
