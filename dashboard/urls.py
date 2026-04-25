"""Dashboard app URL configuration."""

from django.urls import path
from . import views

urlpatterns = [
    # ── Frontend ──────────────────────────────────────────────────────────
    path('', views.dashboard_home, name='dashboard-home'),

    # ── Apprenants API ────────────────────────────────────────────────────
    path('stats/apprenants/genre', views.apprenants_genre, name='stats-apprenants-genre'),
    path('stats/apprenants/promotion', views.apprenants_promotion, name='stats-apprenants-promotion'),
    path('stats/apprenants/province', views.apprenants_province, name='stats-apprenants-province'),
    path('stats/apprenants/service', views.apprenants_service, name='stats-apprenants-service'),
    path('stats/apprenants/grade', views.apprenants_grade, name='stats-apprenants-grade'),

    # ── Personnel API ─────────────────────────────────────────────────────
    path('stats/personnel/genre', views.personnel_genre, name='stats-personnel-genre'),
    path('stats/personnel/grade', views.personnel_grade, name='stats-personnel-grade'),
]
