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


# ═══════════════════════════════════════════════════════════════════════════════
#  PRESENCE APPRENANTS (id_annee = 5, absent = 0)
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
def presence_apprenants_cours(request):
    """Présences des apprenants par cours."""
    sql = """
        SELECT IFNULL(co.cours,'N/A') AS label, COUNT(*) AS value
        FROM horaire_presence hp
        JOIN horaire h ON hp.id_horaire = h.id_horaire
        JOIN cours co ON h.id_cours = co.id_cours AND co.id_annee = h.id_annee
        WHERE h.id_annee = 5 AND hp.absent = 0
        GROUP BY co.cours
        ORDER BY value DESC
    """
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def presence_apprenants_classe(request):
    """Présences des apprenants par classe."""
    sql = """
        SELECT
            CASE
                WHEN h.groupe IS NULL OR h.groupe = ''
                THEN CONCAT(IFNULL(cl.Classe,'N/A'),' ',IFNULL(d.depSigle,'N/A'))
                ELSE CONCAT(IFNULL(cl.Classe,'N/A'),' ',h.groupe,' ',IFNULL(d.depSigle,'N/A'))
            END AS label,
            COUNT(*) AS value
        FROM horaire_presence hp
        JOIN horaire h ON hp.id_horaire = h.id_horaire
        JOIN classe cl ON cl.id_classe = h.id_classe
        LEFT JOIN departement d ON d.id_departement = h.id_departement
        WHERE h.id_annee = 5 AND hp.absent = 0
        GROUP BY cl.Classe, h.groupe, d.depSigle
        ORDER BY value DESC
    """
    return Response(_run_stats_query(sql))


# ═══════════════════════════════════════════════════════════════════════════════
#  PRESENCE PERSONNEL (isAdministratif=1, en_fonction=1)
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
def presence_personnel_summary(request):
    """Résumé des présences du personnel par mois."""
    sql = """
        SELECT
            DATE_FORMAT(pp.date_pointage, '%%Y-%%m') AS mois,
            COUNT(DISTINCT pp.id_personnel) AS agents_presents,
            COUNT(DISTINCT DATE(pp.date_pointage)) AS jours_actifs,
            COUNT(*) AS total_pointages
        FROM personnel_pointage pp
        JOIN personnel p ON p.id_personnel = pp.id_personnel
        WHERE p.isAdministratif = 1 AND p.en_fonction = 1
          AND pp.type_pointage = 1
        GROUP BY DATE_FORMAT(pp.date_pointage, '%%Y-%%m')
        ORDER BY mois DESC
    """
    with connection.cursor() as cursor:
        cursor.execute(sql)
        return Response(_dictfetchall(cursor))


@api_view(['GET'])
def presence_personnel_detail(request):
    """Détail des présences du personnel : par agent pour un mois donné."""
    mois = request.GET.get('mois', '')
    if not mois:
        return Response({'error': 'Paramètre mois requis (ex: 2026-03)'}, status=400)

    sql = """
        SELECT
            CONCAT(IFNULL(p.nom,''),' ',IFNULL(p.postnom,''),' ',IFNULL(p.prenom,'')) AS agent,
            COUNT(DISTINCT DATE(pp.date_pointage)) AS jours_presents,
            MIN(DATE(pp.date_pointage)) AS premier_pointage,
            MAX(DATE(pp.date_pointage)) AS dernier_pointage,
            COUNT(*) AS total_pointages
        FROM personnel_pointage pp
        JOIN personnel p ON p.id_personnel = pp.id_personnel
        WHERE p.isAdministratif = 1 AND p.en_fonction = 1
          AND pp.type_pointage = 1
          AND DATE_FORMAT(pp.date_pointage, '%%Y-%%m') = %s
        GROUP BY pp.id_personnel, p.nom, p.postnom, p.prenom
        ORDER BY jours_presents DESC
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [mois])
        return Response(_dictfetchall(cursor))

