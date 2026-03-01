from django.contrib import admin

from apps.accommodations.models import AccommodationAmenity


@admin.register(AccommodationAmenity)
class AccommodationAmenityAdmin(admin.ModelAdmin):
    list_display = ('name',)
    list_display_links = ('name',)
    search_fields = ('name',)
    ordering = ('name',)
