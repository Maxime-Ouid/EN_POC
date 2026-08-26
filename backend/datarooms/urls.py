from django.urls import path
from .views import (
    ping, login_view, whoami, my_offices, tenant_config, coffre_fort_view,
    issue_sso_ticket, consume_sso_ticket, datarooms_view, documents_view,
)

urlpatterns = [
    path('ping/', ping),
    path('login/', login_view),
    path('whoami/', whoami),
    path('my-offices/', my_offices),
    path('tenant-config/', tenant_config),
    path('modules/coffre-fort/', coffre_fort_view),
    path('sso/issue/', issue_sso_ticket),
    path('sso/consume/', consume_sso_ticket),
    path('datarooms/', datarooms_view),
    path('datarooms/<int:dataroom_id>/documents/', documents_view),
]