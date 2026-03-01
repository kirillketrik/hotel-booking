import json
from channels.generic.websocket import AsyncWebsocketConsumer

class SearchConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Получаем request_id из URL (например, /ws/search/123/)
        self.request_id = self.scope['url_route']['kwargs']['request_id']
        self.group_name = f"search_{self.request_id}"

        # Присоединяем текущее соединение (channel) к группе в Redis
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        # Подтверждаем установку соединения
        await self.accept()

    async def disconnect(self, close_code):
        # При отключении удаляем канал из группы
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    # Этот метод вызывается, когда в Celery мы делаем group_send с типом "search_update"
    async def search_update(self, event):
        """
        Метод-обработчик события 'search_update'.
        Он просто пересылает данные из события напрямую в WebSocket клиенту.
        """
        # event содержит всё то, что мы передали в Celery в словаре
        await self.send(text_data=json.dumps({
            'status': event.get('status'),
            'progress': event.get('progress'),
            'new_accommodation_id': event.get('new_accommodation_id'),
            'event': event.get('event'),
            'error': event.get('error')
        }))