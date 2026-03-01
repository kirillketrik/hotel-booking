from django.urls import path

from .views import StartSearchTypeView

urlpatterns = [
    path('api/v1/ai/start-search/', StartSearchTypeView.as_view(), name='start_search'),
]
