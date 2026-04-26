"""
API views for the SMARPRDC statistics dashboard.
All queries use raw SQL adapted to the actual db_rdc_enf schema.
"""

from django.db import connection
from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response


# ═══════════════════════════════════════════════════════════════════════════════
#  HELPER
# ═══════════════════════════════════════════════════════════════════════════════

def _dictfetchall(cursor):
    """Return all rows from a cursor as a list of dicts."""
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _run_stats_query(sql):
    """Execute a stats SQL and return [{"label": ..., "value": ...}, ...]."""
    with connection.cursor() as cursor:
        cursor.execute(sql)
        return _dictfetchall(cursor)


# ═══════════════════════════════════════════════════════════════════════════════
#  FRONTEND VIEW
# ═══════════════════════════════════════════════════════════════════════════════

def dashboard_home(request):
    """Serve the main dashboard page."""
    return render(request, 'dashboard/dashboard.html')


# ═══════════════════════════════════════════════════════════════════════════════
#  APPRENANTS STATS (id_annee = 5)
#  Filter: etudiant_inscription.id_annee = 5
#  Grade: personnel_grade_administratif.code via e.id_grade_administratif
#  Promotion: CONCAT(classe.Classe, jourSoir, groupe)
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
def apprenants_genre(request):
    """Répartition des apprenants par genre."""
    sql = """
        SELECT IFNULL(e.genre,'N/A') AS label, COUNT(*) AS value
        FROM etudiant e
        JOIN etudiant_inscription i ON e.id_etudiant = i.id_etudiant
        WHERE i.id_annee = 5
        GROUP BY e.genre
    """
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def apprenants_promotion(request):
    """Répartition des apprenants par promotion (Classe + groupe + depSigle)."""
    sql = """
        SELECT
            CASE
                WHEN i.groupe IS NULL OR i.groupe = ''
                THEN CONCAT(IFNULL(c.Classe,'N/A'),' ',IFNULL(d.depSigle,'N/A'))
                ELSE CONCAT(IFNULL(c.Classe,'N/A'),' ',i.groupe,' ',IFNULL(d.depSigle,'N/A'))
            END AS label,
            COUNT(*) AS value
        FROM etudiant e
        JOIN etudiant_inscription i ON e.id_etudiant = i.id_etudiant
        JOIN classe c ON c.id_classe = i.id_classe
        LEFT JOIN departement d ON d.id_departement = i.id_departement
        WHERE i.id_annee = 5
        GROUP BY c.Classe, i.groupe, d.depSigle
    """
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def apprenants_province(request):
    """Répartition des apprenants par province de provenance."""
    sql = """
        SELECT IFNULL(e.province_provenance,'N/A') AS label, COUNT(*) AS value
        FROM etudiant e
        JOIN etudiant_inscription i ON e.id_etudiant = i.id_etudiant
        WHERE i.id_annee = 5
        GROUP BY e.province_provenance
    """
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def apprenants_service(request):
    """Répartition des apprenants par service attaché."""
    sql = """
        SELECT IFNULL(e.service_attache,'N/A') AS label, COUNT(*) AS value
        FROM etudiant e
        JOIN etudiant_inscription i ON e.id_etudiant = i.id_etudiant
        WHERE i.id_annee = 5
        GROUP BY e.service_attache
    """
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def apprenants_grade(request):
    """Répartition des apprenants par grade administratif."""
    sql = """
        SELECT IFNULL(g.code,'N/A') AS label, COUNT(*) AS value
        FROM etudiant e
        JOIN etudiant_inscription i ON e.id_etudiant = i.id_etudiant
        LEFT JOIN personnel_grade_administratif g
            ON e.id_grade_administratif = g.id_grade_administratif
        WHERE i.id_annee = 5
        GROUP BY g.code
    """
    return Response(_run_stats_query(sql))


# ═══════════════════════════════════════════════════════════════════════════════
#  PERSONNEL STATS (isAdministratif = 1, en_fonction = 1)
#  Grade: personnel_grade_administratif.code via p.id_grade_administratif
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
def personnel_genre(request):
    """Répartition du personnel par genre."""
    sql = """
        SELECT IFNULL(p.genre,'N/A') AS label, COUNT(*) AS value
        FROM personnel p
        WHERE p.isAdministratif = 1 AND p.en_fonction = 1
        GROUP BY p.genre
    """
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def personnel_grade(request):
    """Répartition du personnel par grade administratif."""
    sql = """
        SELECT IFNULL(g.code,'N/A') AS label, COUNT(*) AS value
        FROM personnel p
        LEFT JOIN personnel_grade_administratif g
            ON p.id_grade_administratif = g.id_grade_administratif
        WHERE p.isAdministratif = 1 AND p.en_fonction = 1
        GROUP BY g.code
    """
    return Response(_run_stats_query(sql))
