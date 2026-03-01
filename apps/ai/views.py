from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import SearchRequest
from .tasks import run_ai_search_task


class StartSearchTypeView(APIView):
    def post(self, request):
        user_query = request.data.get('query')

        if not user_query:
            return Response({"error": "Query is required"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Создаем запись в базе
        search_obj = SearchRequest.objects.create(
            user=request.user if request.user.is_authenticated else None,
            query=user_query,
            status='processing'
        )

        run_ai_search_task.delay(search_obj.id, user_query)

        return Response({
            "search_id": search_obj.id,
            "message": "Search started"
        }, status=status.HTTP_201_CREATED)
