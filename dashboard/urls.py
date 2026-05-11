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

    # ── Présences ─────────────────────────────────────────────────────────
    path('stats/presence/apprenants/nested', views.presence_apprenants_nested, name='stats-presence-appr-nested'),

    # ── Présences Personnel ──────────────────────────────────────────────
    path('stats/presence/personnel/summary', views.presence_personnel_summary, name='stats-presence-pers-summary'),
    path('stats/presence/personnel/detail', views.presence_personnel_detail, name='stats-presence-pers-detail'),

    # ── Carrière ──────────────────────────────────────────────────────────
    path('carriere', views.carriere_home, name='carriere-home'),
    path('carriere/api/personnel', views.carriere_personnel, name='carriere-personnel'),
    path('carriere/api/etats', views.carriere_etats, name='carriere-etats'),
    path('carriere/api/parametres', views.carriere_parametres, name='carriere-parametres'),
    path('carriere/api/conge-types', views.carriere_conge_types, name='carriere-conge-types'),
    path('carriere/api/conges', views.carriere_conges, name='carriere-conges'),
    path('carriere/api/etats/save', views.carriere_etats_save, name='carriere-etats-save'),
    path('carriere/api/etats/delete', views.carriere_etats_delete, name='carriere-etats-delete'),
    path('carriere/api/conges/save', views.carriere_conges_save, name='carriere-conges-save'),
    path('carriere/api/conges/update', views.carriere_conges_update, name='carriere-conges-update'),
    path('carriere/api/conges/delete', views.carriere_conges_delete, name='carriere-conges-delete'),
    path('carriere/api/liste-declarative', views.carriere_liste_declarative, name='carriere-liste-declarative'),

    # ── Justificatifs ─────────────────────────────────────────────────────
    path('stats/presence/justificatif/save', views.justificatif_save, name='justificatif-save'),
    path('stats/presence/justificatif/history', views.justificatif_history, name='justificatif-history'),
    path('stats/presence/justificatifs', views.justificatifs_list, name='justificatifs-list'),

    # ── Institution ───────────────────────────────────────────────────────
    path('stats/institution', views.institution_info, name='institution-info'),

    # ── Paramètres de base (CRUD) ─────────────────────────────────────────
    path('carriere/api/params/tables', views.params_tables_list, name='params-tables-list'),
    path('carriere/api/params/crud', views.params_crud, name='params-crud'),
]
