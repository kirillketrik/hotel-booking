from django.conf import settings as django_settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.tours.services import booking_confirm_payment


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        import stripe

        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
        webhook_secret = (
            django_settings.SETTINGS.STRIPE.WEBHOOK_SECRET.get_secret_value()
        )

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except (stripe.error.SignatureVerificationError, ValueError):
            return Response({"error": "Invalid signature"}, status=400)

        if event["type"] == "payment_intent.succeeded":
            payment_intent_id = event["data"]["object"]["id"]
            booking_confirm_payment(payment_intent_id=payment_intent_id)

        return Response({"received": True})
