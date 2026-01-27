from typing import TypedDict


class UserRegisterDTO(TypedDict):
    email: str
    first_name: str
    last_name: str
    password: str
