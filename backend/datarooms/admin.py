from django.contrib import admin
from .models import Office, Module, OfficeMembership

# Register your models here.
@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")

@admin.register(Office)
class OfficeAdmin(admin.ModelAdmin):
    list_display = ("name", "subdomain")
    filter_horizontal = ("enabled_modules",)

@admin.register(OfficeMembership)
class OfficeMembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "office", "role")
    list_filter = ("office", "role")