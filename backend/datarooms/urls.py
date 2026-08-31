from django.urls import path
from .views import (
    ping, login_view, mfa_setup, mfa_verify, whoami, my_offices, tenant_config, tenant_theme,
    coffre_fort_view, issue_sso_ticket, consume_sso_ticket, datarooms_view, documents_view,
    folders_view, office_users_view, office_user_detail_view, attach_office_user_view,
    dataroom_access_view, folder_access_view, document_access_view, access_restrictions_view,
    document_content_view,
)

urlpatterns = [
    path('ping/', ping),
    path('login/', login_view),
    path('mfa/setup/', mfa_setup),
    path('mfa/verify/', mfa_verify),
    path('whoami/', whoami),
    path('my-offices/', my_offices),
    path('tenant-config/', tenant_config),
    path('tenant-theme/', tenant_theme),
    path('modules/coffre-fort/', coffre_fort_view),
    path('sso/issue/', issue_sso_ticket),
    path('sso/consume/', consume_sso_ticket),
    path('datarooms/', datarooms_view),
    path('datarooms/<int:dataroom_id>/documents/', documents_view),
    path('datarooms/<int:dataroom_id>/documents/<int:document_id>/access/', document_access_view),
    path('datarooms/<int:dataroom_id>/documents/<int:document_id>/content/', document_content_view),
    path('datarooms/<int:dataroom_id>/folders/', folders_view),
    path('datarooms/<int:dataroom_id>/folders/<int:folder_id>/access/', folder_access_view),
    path('datarooms/<int:dataroom_id>/access/', dataroom_access_view),
    path('access-restrictions/', access_restrictions_view),
    path('office-users/', office_users_view),
    path('office-users/attach/', attach_office_user_view),
    path('office-users/<int:membership_id>/', office_user_detail_view),
]