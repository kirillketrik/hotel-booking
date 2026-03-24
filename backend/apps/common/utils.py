from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler


def handle_django_validation_error(exc, context):
    if isinstance(exc, DjangoValidationError):
        data = (
            exc.message_dict if hasattr(exc, "message_dict") else exc.messages
        )
        exc = DRFValidationError(detail=data)

    response = exception_handler(exc, context)

    if response is None and isinstance(exc, DRFValidationError):
        return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

    return response
