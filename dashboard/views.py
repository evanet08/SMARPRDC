"""
API views for the SMARPRDC statistics dashboard.
All queries use raw SQL for precise control over JOINs and IFNULL.
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
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
def apprenants_genre(request):
    """Répartition des apprenants par genre."""
    sql = """
        SELECT
            IFNULL(
                CASE e.sexe
                    WHEN 'M' THEN 'Masculin'
                    WHEN 'F' THEN 'Féminin'
                    ELSE 'N/A'
                END,
                'N/A'
            ) AS label,
            COUNT(*) AS value
        FROM etudiant e
        INNER JOIN etudiant_inscription ei ON ei.id_etudiant = e.id
        WHERE ei.id_annee = 5
        GROUP BY label
        ORDER BY value DESC
    """
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def apprenants_promotion(request):
    """Répartition des apprenants par promotion."""
    sql = """
        SELECT
            IFNULL(p.designation, 'N/A') AS label,
            COUNT(*) AS value
        FROM etudiant e
        INNER JOIN etudiant_inscription ei ON ei.id_etudiant = e.id
        INNER JOIN classe c ON c.id = ei.id_classe
        INNER JOIN promotion p ON p.id = c.id_promotion
        WHERE ei.id_annee = 5
        GROUP BY p.id, p.designation
        ORDER BY value DESC
    """
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def apprenants_province(request):
    """Répartition des apprenants par province."""
    sql = """
        SELECT
            IFNULL(pr.designation, 'N/A') AS label,
            COUNT(*) AS value
        FROM etudiant e
        INNER JOIN etudiant_inscription ei ON ei.id_etudiant = e.id
        LEFT JOIN province pr ON pr.id = e.id_province
        WHERE ei.id_annee = 5
        GROUP BY pr.id, pr.designation
        ORDER BY value DESC
    """
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def apprenants_service(request):
    """Répartition des apprenants par service / département."""
    sql = """
        SELECT
            IFNULL(s.designation, 'N/A') AS label,
            COUNT(*) AS value
        FROM etudiant e
        INNER JOIN etudiant_inscription ei ON ei.id_etudiant = e.id
        INNER JOIN classe c ON c.id = ei.id_classe
        LEFT JOIN service s ON s.id = c.id_service
        WHERE ei.id_annee = 5
        GROUP BY s.id, s.designation
        ORDER BY value DESC
    """
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def apprenants_grade(request):
    """Répartition des apprenants par grade académique."""
    sql = """
        SELECT
            IFNULL(g.designation, 'N/A') AS label,
            COUNT(*) AS value
        FROM etudiant e
        INNER JOIN etudiant_inscription ei ON ei.id_etudiant = e.id
        INNER JOIN classe c ON c.id = ei.id_classe
        LEFT JOIN grade g ON g.id = c.id_promotion
        WHERE ei.id_annee = 5
        GROUP BY g.id, g.designation
        ORDER BY value DESC
    """
    return Response(_run_stats_query(sql))


# ═══════════════════════════════════════════════════════════════════════════════
#  PERSONNEL STATS (isAdministratif = 1, en_fonction = 1)
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
def personnel_genre(request):
    """Répartition du personnel par genre."""
    sql = """
        SELECT
            IFNULL(
                CASE p.sexe
                    WHEN 'M' THEN 'Masculin'
                    WHEN 'F' THEN 'Féminin'
                    ELSE 'N/A'
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
            IFNULL(g.designation, 'N/A') AS label,
            COUNT(*) AS value
        FROM personnel p
        LEFT JOIN grade g ON g.id = p.id_grade
        WHERE p.isAdministratif = 1
          AND p.en_fonction = 1
        GROUP BY g.id, g.designation
        ORDER BY value DESC
    """
    return Response(_run_stats_query(sql))
