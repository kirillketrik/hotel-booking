from django.db import models


class TourStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class TransferType(models.TextChoices):
    AIRPORT = "airport", "Airport"
    HOTEL = "hotel", "Hotel"
    CITY = "city", "City"
    CUSTOM = "custom", "Custom"


class NotificationType(models.TextChoices):
    AGENCY_SUBMITTED = "agency_submitted", "Agency Submitted"
    AGENCY_APPROVED = "agency_approved", "Agency Approved"
    AGENCY_REJECTED = "agency_rejected", "Agency Rejected"
    TOUR_SUBMITTED = "tour_submitted", "Tour Submitted"
    TOUR_APPROVED = "tour_approved", "Tour Approved"
    TOUR_REJECTED = "tour_rejected", "Tour Rejected"
    INVITATION_RECEIVED = "invitation_received", "Invitation Received"
