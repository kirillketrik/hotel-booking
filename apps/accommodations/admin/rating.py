from django.contrib import admin

from apps.accommodations.models import AccommodationRating


@admin.register(AccommodationRating)
class AccommodationRatingAdmin(admin.ModelAdmin):
    list_display = ('accommodation', 'user', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
    search_fields = ('accommodation__title', 'user__email', 'comment')
