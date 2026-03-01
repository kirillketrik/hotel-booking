from django.contrib import admin
from django.utils.safestring import mark_safe
from apps.accommodations.models import Accommodation, AccommodationImage, AccommodationRating


class AccommodationImageInline(admin.TabularInline):
    model = AccommodationImage
    extra = 1
    readonly_fields = ('preview',)

    def preview(self, obj):
        if obj.image:
            return mark_safe(f'<img src="{obj.image.url}" width="100" />')
        return "Нет изображения"

    preview.short_description = "Предпросмотр"


class AccommodationRatingInline(admin.TabularInline):
    model = AccommodationRating
    extra = 0
    readonly_fields = ('user', 'rating', 'comment', 'created_at')
    can_delete = True

    # Запрещаем редактирование отзывов прямо из отеля, чтобы не искажать данные
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Accommodation)
class AccommodationAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'price_min', 'price_max', 'rating', 'is_published', 'user')
    list_filter = ('category', 'is_published', 'amenities')
    search_fields = ('title', 'description', 'user__email')
    filter_horizontal = ('amenities',)  # Удобный виджет для выбора удобств (ManytoMany)
    readonly_fields = ('rating',)  # Вычисляемое поле только для чтения

    inlines = [AccommodationImageInline, AccommodationRatingInline]

    # Группировка полей для красоты
    fieldsets = (
        ("Основная информация", {
            'fields': ('title', 'category', 'description', 'user', 'is_published')
        }),
        ("Ценовая политика", {
            'fields': (('price_min', 'price_max'),)
        }),
        ("Характеристики", {
            'fields': ('amenities', 'rating')
        }),
    )
