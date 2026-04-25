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
#  Real schema: etudiant (id_etudiant, genre, province_provenance, promotion,
#               id_service, id_grade) → etudiant_inscription → classe
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
def apprenants_genre(request):
    """Répartition des apprenants par genre."""
    sql = """
        SELECT
            IFNULL(
                CASE e.genre
                    WHEN 'M' THEN 'Masculin'
                    WHEN 'F' THEN 'Féminin'
                    ELSE IFNULL(NULLIF(e.genre, ''), 'N/A')
                END,
                'N/A'
            ) AS label,
            COUNT(*) AS value
        FROM etudiant e
        INNER JOIN etudiant_inscription ei ON ei.id_etudiant = e.id_etudiant
        WHERE ei.id_annee = 5
        GROUP BY label
        ORDER BY value DESC
    """
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def apprenants_promotion(request):
    """Répartition des apprenants par promotion (Classe designation)."""
    sql = """
        SELECT
            IFNULL(NULLIF(c.Classe, ''), 'N/A') AS label,
            COUNT(*) AS value
        FROM etudiant e
        INNER JOIN etudiant_inscription ei ON ei.id_etudiant = e.id_etudiant
        INNER JOIN classe c ON c.id_classe = ei.id_classe
        WHERE ei.id_annee = 5
        GROUP BY c.id_classe, c.Classe
        ORDER BY value DESC
    """
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def apprenants_province(request):
    """Répartition des apprenants par province de provenance."""
    sql = """
        SELECT
            IFNULL(NULLIF(e.province_provenance, ''), 'N/A') AS label,
            COUNT(*) AS value
        FROM etudiant e
        INNER JOIN etudiant_inscription ei ON ei.id_etudiant = e.id_etudiant
        WHERE ei.id_annee = 5
        GROUP BY label
        ORDER BY value DESC
    """
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def apprenants_service(request):
    """Répartition des apprenants par service de provenance."""
    sql = """
        SELECT
            IFNULL(s.service, 'N/A') AS label,
            COUNT(*) AS value
        FROM etudiant e
        INNER JOIN etudiant_inscription ei ON ei.id_etudiant = e.id_etudiant
        LEFT JOIN etudiant_service_provenance s ON s.id_service = e.id_service
        WHERE ei.id_annee = 5
        GROUP BY s.id_service, s.service
        ORDER BY value DESC
    """
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def apprenants_grade(request):
    """Répartition des apprenants par grade académique."""
    sql = """
        SELECT
            IFNULL(g.grade, 'N/A') AS label,
            COUNT(*) AS value
        FROM etudiant e
        INNER JOIN etudiant_inscription ei ON ei.id_etudiant = e.id_etudiant
        LEFT JOIN personnel_grade g ON g.id_grade = e.id_grade
        WHERE ei.id_annee = 5
        GROUP BY g.id_grade, g.grade
        ORDER BY value DESC
    """
    return Response(_run_stats_query(sql))


# ═══════════════════════════════════════════════════════════════════════════════
#  PERSONNEL STATS (isAdministratif = 1, en_fonction = 1)
#  Real schema: personnel (id_personnel, genre, id_grade, isAdministratif,
#               en_fonction) → personnel_grade
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
def personnel_genre(request):
    """Répartition du personnel par genre."""
    sql = """
        SELECT
            IFNULL(
                CASE p.genre
                    WHEN 'M' THEN 'Masculin'
                    WHEN 'F' THEN 'Féminin'
                    ELSE IFNULL(NULLIF(p.genre, ''), 'N/A')
                END,
                'N/A'
            ) AS label,
            COUNT(*) AS value
        FROM personnel p
        WHERE p.isAdministratif = 1
          AND p.en_fonction = 1
        GROUP BY label
        ORDER BY value DESC
    """
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def personnel_grade(request):
    """Répartition du personnel par grade."""
    sql = """
        SELECT
            IFNULL(g.grade, 'N/A') AS label,
            COUNT(*) AS value
        FROM personnel p
        LEFT JOIN personnel_grade g ON g.id_grade = p.id_grade
        WHERE p.isAdministratif = 1
          AND p.en_fonction = 1
        GROUP BY g.id_grade, g.grade
        ORDER BY value DESC
    """
    return Response(_run_stats_query(sql))
