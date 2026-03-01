from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/search/(?P<request_id>\d+)/$', consumers.SearchConsumer.as_asgi()),
]
