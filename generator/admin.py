from django.contrib import admin

from .models import SavedCrossword


@admin.register(SavedCrossword)
class SavedCrosswordAdmin(admin.ModelAdmin):
    list_display = ('id', 'created_at')
    readonly_fields = ('id', 'created_at')
