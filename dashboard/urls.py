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

    # ── Présences Apprenants ──────────────────────────────────────────────
    path('stats/presence/apprenants/cours', views.presence_apprenants_cours, name='stats-presence-appr-cours'),
    path('stats/presence/apprenants/classe', views.presence_apprenants_classe, name='stats-presence-appr-classe'),
    path('stats/presence/apprenants/nested', views.presence_apprenants_nested, name='stats-presence-appr-nested'),

    # ── Présences Personnel ──────────────────────────────────────────────
    path('stats/presence/personnel/summary', views.presence_personnel_summary, name='stats-presence-pers-summary'),
    path('stats/presence/personnel/detail', views.presence_personnel_detail, name='stats-presence-pers-detail'),
]
