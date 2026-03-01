from typing import List, Literal
from pydantic import BaseModel, Field, HttpUrl

AccommodationCategory = Literal[
    'HOTEL', 'HOSTEL', 'FARM', 'RESORT',
    'REC_CTR', 'APART', 'COTTAGE', 'GLAMP'
]


class RoomTypeAI(BaseModel):
    name: str
    provider: str
    booking_url: HttpUrl


class AccommodationAI(BaseModel):
    title: str
    category: AccommodationCategory = Field(description="Тип объекта из строгого списка")
    description: str
    amenities: List[str]
    min_price: float
    booking_url: HttpUrl
    image_urls: List[HttpUrl]
    room_types: List[RoomTypeAI]


class TourSearchResponse(BaseModel):
    options: List[AccommodationAI]
