import django_filters

from apps.tours.models import Tour


class TourFilter(django_filters.FilterSet):
    # Price range
    price_min = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    price_max = django_filters.NumberFilter(field_name="price", lookup_expr="lte")

    # Date range
    start_date_from = django_filters.DateFilter(
        field_name="start_date", lookup_expr="gte"
    )
    start_date_to = django_filters.DateFilter(
        field_name="start_date", lookup_expr="lte"
    )

    # Duration
    duration_min = django_filters.NumberFilter(
        field_name="duration_days", lookup_expr="gte"
    )
    duration_max = django_filters.NumberFilter(
        field_name="duration_days", lookup_expr="lte"
    )

    # Participants
    min_adults = django_filters.NumberFilter(
        field_name="max_adults", lookup_expr="gte"
    )
    min_children = django_filters.NumberFilter(
        field_name="max_children", lookup_expr="gte"
    )

    # Location (case-insensitive)
    country = django_filters.CharFilter(
        field_name="location__country", lookup_expr="iexact"
    )
    city = django_filters.CharFilter(
        field_name="location__city", lookup_expr="iexact"
    )

    # Status
    status = django_filters.CharFilter(field_name="status", lookup_expr="exact")

    class Meta:
        model = Tour
        fields: list = []
