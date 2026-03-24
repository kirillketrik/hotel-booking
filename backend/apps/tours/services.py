from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.common.notifications import notify, notify_admins
from apps.tours.enums import (
    AgencyStatus,
    EmployeeRole,
    InvitationStatus,
    NotificationType,
    TourStatus,
)
from apps.tours.models import (
    Agency,
    AgencyEmployee,
    Hotel,
    HotelImage,
    HotelRoom,
    Invitation,
    Location,
    Tour,
    TourImage,
    TourTransfer,
)

# ---------------------------------------------------------------------------
# Agency
# ---------------------------------------------------------------------------


def agency_create(*, user, name: str, description: str, logo=None) -> Agency:
    agency = Agency(
        name=name,
        description=description,
        owner=user,
        status=AgencyStatus.PENDING,
    )
    if logo:
        agency.logo = logo
    agency.save()

    AgencyEmployee.objects.create(
        user=user,
        agency=agency,
        role=EmployeeRole.ADMIN,
    )

    notify_admins(
        title="New agency submitted for review",
        message=f'Agency "{name}" has been submitted and requires moderation.',
        notification_type=NotificationType.AGENCY_SUBMITTED,
    )

    return agency


def agency_update(*, agency: Agency, **data) -> Agency:
    allowed_fields = {"name", "description", "logo"}
    for field, value in data.items():
        if field in allowed_fields:
            setattr(agency, field, value)
    agency.status = AgencyStatus.PENDING
    agency.rejection_reason = ""
    agency.save()

    notify_admins(
        title="Agency updated — pending re-review",
        message=f'Agency "{agency.name}" was updated and requires moderation.',
        notification_type=NotificationType.AGENCY_SUBMITTED,
    )

    return agency


def agency_approve(*, agency: Agency) -> Agency:
    agency.status = AgencyStatus.APPROVED
    agency.rejection_reason = ""
    agency.save()

    _notify_agency_admins(
        agency=agency,
        title="Your agency has been approved",
        message=f'Congratulations! Your agency "{agency.name}" has been approved.',
        notification_type=NotificationType.AGENCY_APPROVED,
    )

    return agency


def agency_reject(*, agency: Agency, reason: str) -> Agency:
    agency.status = AgencyStatus.REJECTED
    agency.rejection_reason = reason
    agency.save()

    _notify_agency_admins(
        agency=agency,
        title="Your agency has been rejected",
        message=(
            f'Your agency "{agency.name}" was rejected. Reason: {reason}'
        ),
        notification_type=NotificationType.AGENCY_REJECTED,
    )

    return agency


# ---------------------------------------------------------------------------
# Invitation
# ---------------------------------------------------------------------------


def invitation_create(
    *,
    agency: Agency,
    created_by: AgencyEmployee,
    invited_email: str | None = None,
    invited_user=None,
    expires_at=None,
) -> Invitation:
    invitation = Invitation(
        agency=agency,
        created_by=created_by,
        invited_email=invited_email,
        invited_user=invited_user,
        expires_at=expires_at,
    )
    invitation.save()

    if invited_user:
        notify(
            recipient=invited_user,
            title=f"You have been invited to join {agency.name}",
            message=(
                f'You received an invitation to join the agency "{agency.name}". '
                f"Use your invitation link to accept or decline."
            ),
            notification_type=NotificationType.INVITATION_RECEIVED,
        )

    return invitation


def invitation_accept(*, invitation: Invitation, user) -> AgencyEmployee:
    _validate_invitation(invitation=invitation, user=user)

    employee = AgencyEmployee.objects.create(
        user=user,
        agency=invitation.agency,
        role=EmployeeRole.OPERATOR,
    )

    invitation.status = InvitationStatus.ACCEPTED
    invitation.save()

    return employee


def invitation_reject(*, invitation: Invitation, user) -> Invitation:
    _validate_invitation(invitation=invitation, user=user)

    invitation.status = InvitationStatus.REJECTED
    invitation.save()

    return invitation


def _validate_invitation(*, invitation: Invitation, user) -> None:
    if invitation.status != InvitationStatus.PENDING:
        raise ValidationError("This invitation is no longer pending.")

    if invitation.expires_at and invitation.expires_at < timezone.now():
        raise ValidationError("This invitation has expired.")

    if invitation.invited_user and invitation.invited_user != user:
        raise ValidationError("This invitation was sent to a different user.")


# ---------------------------------------------------------------------------
# Tour
# ---------------------------------------------------------------------------


def tour_create(
    *,
    agency: Agency,
    created_by: AgencyEmployee,
    title: str,
    description: str,
    price,
    start_date,
    end_date,
    location_data: dict,
    max_adults: int,
    max_children: int,
    cover_image=None,
    hotels: list[dict] | None = None,
    transfers: list[dict] | None = None,
    images: list | None = None,
) -> Tour:
    location, _ = Location.objects.get_or_create(
        country=location_data["country"],
        city=location_data["city"],
        defaults={
            "latitude": location_data.get("latitude"),
            "longitude": location_data.get("longitude"),
        },
    )

    duration_days = (end_date - start_date).days

    tour = Tour(
        agency=agency,
        created_by=created_by,
        title=title,
        description=description,
        price=price,
        start_date=start_date,
        end_date=end_date,
        duration_days=duration_days,
        location=location,
        max_adults=max_adults,
        max_children=max_children,
        status=TourStatus.PENDING,
    )
    if cover_image:
        tour.cover_image = cover_image
    tour.save()

    if hotels:
        for hotel_data in hotels:
            _create_hotel(tour=tour, hotel_data=hotel_data)

    if transfers:
        TourTransfer.objects.bulk_create(
            [TourTransfer(tour=tour, **t) for t in transfers]
        )

    if images:
        for idx, image_file in enumerate(images):
            TourImage.objects.create(tour=tour, image=image_file, order=idx)

    notify_admins(
        title="New tour submitted for review",
        message=f'Tour "{title}" by "{agency.name}" requires moderation.',
        notification_type=NotificationType.TOUR_SUBMITTED,
    )

    return tour


def _create_hotel(*, tour: Tour, hotel_data: dict) -> Hotel:
    rooms_data = hotel_data.pop("rooms", [])
    images_data = hotel_data.pop("images", [])
    amenity_ids = hotel_data.pop("amenity_ids", [])

    hotel = Hotel(tour=tour, **hotel_data)
    hotel.save()

    if amenity_ids:
        hotel.amenities.set(amenity_ids)

    if rooms_data:
        HotelRoom.objects.bulk_create(
            [HotelRoom(hotel=hotel, **r) for r in rooms_data]
        )

    for idx, image_file in enumerate(images_data):
        HotelImage.objects.create(hotel=hotel, image=image_file, order=idx)

    return hotel


def tour_update(*, tour: Tour, **data) -> Tour:
    allowed_fields = {
        "title",
        "description",
        "cover_image",
        "price",
        "start_date",
        "end_date",
        "max_adults",
        "max_children",
    }
    for field, value in data.items():
        if field in allowed_fields:
            setattr(tour, field, value)

    if "start_date" in data or "end_date" in data:
        tour.duration_days = (tour.end_date - tour.start_date).days

    tour.status = TourStatus.PENDING
    tour.rejection_reason = ""
    tour.save()

    notify_admins(
        title="Tour updated — pending re-review",
        message=f'Tour "{tour.title}" was updated and requires moderation.',
        notification_type=NotificationType.TOUR_SUBMITTED,
    )

    return tour


def tour_approve(*, tour: Tour) -> Tour:
    tour.status = TourStatus.APPROVED
    tour.rejection_reason = ""
    tour.save()

    _notify_agency_admins(
        agency=tour.agency,
        title="Your tour has been approved",
        message=f'Your tour "{tour.title}" has been approved and is now live.',
        notification_type=NotificationType.TOUR_APPROVED,
    )

    return tour


def tour_reject(*, tour: Tour, reason: str) -> Tour:
    tour.status = TourStatus.REJECTED
    tour.rejection_reason = reason
    tour.save()

    _notify_agency_admins(
        agency=tour.agency,
        title="Your tour has been rejected",
        message=(f'Your tour "{tour.title}" was rejected. Reason: {reason}'),
        notification_type=NotificationType.TOUR_REJECTED,
    )

    return tour


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _notify_agency_admins(
    *, agency: Agency, title: str, message: str, notification_type: str
) -> None:
    """Notify all employees with role=ADMIN of the given agency."""
    admins = AgencyEmployee.objects.filter(
        agency=agency, role=EmployeeRole.ADMIN
    ).select_related("user")
    for employee in admins:
        notify(
            recipient=employee.user,
            title=title,
            message=message,
            notification_type=notification_type,
        )
