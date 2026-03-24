from django.db import models


class AgencyStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class EmployeeRole(models.TextChoices):
    ADMIN = "admin", "Admin"
    OPERATOR = "operator", "Operator"


class InvitationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    REJECTED = "rejected", "Rejected"
