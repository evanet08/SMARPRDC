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
#  PRESENCE APPRENANTS – Detailed per time slot
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
def presence_apprenants_nested(request):
    """Class → Course → time slots with present/expected/rate."""
    from collections import OrderedDict
    sql = """
        SELECT h.id_horaire,
            CASE WHEN h.groupe IS NULL OR h.groupe = ''
                THEN CONCAT(IFNULL(cl.Classe,'N/A'),' ',IFNULL(d.depSigle,'N/A'))
                ELSE CONCAT(IFNULL(cl.Classe,'N/A'),' ',h.groupe,' ',IFNULL(d.depSigle,'N/A'))
            END AS classe_label,
            h.id_classe, IFNULL(h.groupe,'') AS grp, h.id_departement,
            IFNULL(co.cours,'N/A') AS cours_label,
            h.date, h.debut, h.fin,
            COUNT(hp.id_presence) AS presents
        FROM horaire h
        JOIN horaire_presence hp ON hp.id_horaire = h.id_horaire AND hp.absent = 0
        JOIN classe cl ON cl.id_classe = h.id_classe
        LEFT JOIN departement d ON d.id_departement = h.id_departement
        JOIN cours co ON h.id_cours = co.id_cours AND co.id_annee = h.id_annee
        WHERE h.id_annee = 5
        GROUP BY h.id_horaire
        ORDER BY classe_label, cours_label, h.date DESC
    """
    expected_sql = """
        SELECT i.id_classe, IFNULL(i.groupe,'') AS grp, i.id_departement, COUNT(*) AS expected
        FROM etudiant_inscription i WHERE i.id_annee = 5
        GROUP BY i.id_classe, IFNULL(i.groupe,''), i.id_departement
    """
    with connection.cursor() as cursor:
        cursor.execute(expected_sql)
        exp_map = {f"{r['id_classe']}|{r['grp']}|{r['id_departement']}": r['expected']
                   for r in _dictfetchall(cursor)}
        cursor.execute(sql)
        rows = _dictfetchall(cursor)

    classes = OrderedDict()
    for r in rows:
        cl, co = r['classe_label'], r['cours_label']
        key = f"{r['id_classe']}|{r['grp']}|{r['id_departement']}"
        exp = exp_map.get(key, r['presents'])
        rate = round((r['presents'] / exp) * 100, 1) if exp else 0
        if cl not in classes:
            classes[cl] = OrderedDict()
        if co not in classes[cl]:
            classes[cl][co] = []
        classes[cl][co].append({
            'date': r['date'], 'debut': r['debut'], 'fin': r['fin'],
            'presents': r['presents'], 'attendus': exp, 'taux': rate
        })

    return Response([
        {'classe': cl, 'cours': [{'cours': co, 'slots': slots} for co, slots in cours.items()]}
        for cl, cours in classes.items()
    ])


# ═══════════════════════════════════════════════════════════════════════════════
#  PRESENCE PERSONNEL – Per day with arrival/departure/overtime
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
def presence_personnel_summary(request):
    """List of months with presence data."""
    sql = """
        SELECT DISTINCT CONCAT(YEAR(pp.date_pointage), '-', LPAD(MONTH(pp.date_pointage),2,'0')) AS mois
        FROM personnel_pointage pp
        JOIN personnel p ON p.id_personnel = pp.id_personnel
        WHERE p.isAdministratif = 1 AND p.en_fonction = 1
        ORDER BY mois DESC
    """
    with connection.cursor() as cursor:
        cursor.execute(sql)
        return Response(_dictfetchall(cursor))


@api_view(['GET'])
def presence_personnel_detail(request):
    """Per-day individual entries for a given month."""
    from collections import OrderedDict
    from datetime import timedelta
    mois = request.GET.get('mois', '')
    if not mois:
        return Response({'error': 'Paramètre mois requis'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("SELECT valeur FROM personnel_pointage_retardacademique LIMIT 1")
        tol_row = cursor.fetchone()
        tolerance_h = 3
        if tol_row and tol_row[0]:
            try:
                tolerance_h = int(str(tol_row[0]).replace('h','').replace('H','').split(':')[0])
            except (ValueError, IndexError):
                pass

        cursor.execute("SELECT id_coupon, heureD FROM personnel_pointage_coupon")
        coupon_map = {r[0]: r[1] for r in cursor.fetchall()}

        cursor.execute("SELECT COUNT(*) FROM personnel WHERE isAdministratif=1 AND en_fonction=1")
        expected = cursor.fetchone()[0] or 0

        cursor.execute("""
            SELECT pp.id_personnel,
                CONCAT(IFNULL(p.nom,''),' ',IFNULL(p.postnom,''),' ',IFNULL(p.prenom,'')) AS agent,
                DATE(pp.date_pointage) AS jour, TIME(pp.date_pointage) AS heure,
                pp.type_pointage, pp.id_coupon
            FROM personnel_pointage pp
            JOIN personnel p ON p.id_personnel = pp.id_personnel
            WHERE p.isAdministratif = 1 AND p.en_fonction = 1
              AND CONCAT(YEAR(pp.date_pointage), '-', LPAD(MONTH(pp.date_pointage),2,'0')) = %s
            ORDER BY pp.date_pointage
        """, [mois])
        rows = _dictfetchall(cursor)

    def parse_t(t):
        if isinstance(t, timedelta):
            return t.total_seconds()
        s = str(t).replace('h',':').replace('H',':')
        p = s.split(':')
        return int(p[0]) * 3600 + (int(p[1]) if len(p) > 1 else 0) * 60

    def fmt_t(t):
        if t is None:
            return '—'
        if isinstance(t, timedelta):
            ts = int(t.total_seconds())
            return f"{ts//3600}h{(ts%3600)//60:02d}"
        return str(t)

    days = OrderedDict()
    for r in rows:
        jour = str(r['jour'])
        if jour not in days:
            days[jour] = {}
        aid = r['id_personnel']
        if aid not in days[jour]:
            days[jour][aid] = {'agent': r['agent'], 'entries': [], 'exits': [],
                               'coupon_heureD': coupon_map.get(r['id_coupon'], '8h00')}
        if r['type_pointage'] == 1:
            days[jour][aid]['entries'].append(r['heure'])
        elif r['type_pointage'] == 2:
            days[jour][aid]['exits'].append(r['heure'])

    result = []
    for jour, agents in days.items():
        day_list = []
        for info in agents.values():
            fe = min(info['entries']) if info['entries'] else None
            le = max(info['exits']) if info['exits'] else None
            arr_s = parse_t(fe) if fe else None
            hd_s = parse_t(info['coupon_heureD'])
            present = arr_s is not None and arr_s <= hd_s + tolerance_h * 3600
            overtime = ''
            overtime_s = 0
            if fe and le:
                worked = parse_t(le) - parse_t(fe)
                if worked > 8 * 3600:
                    extra = worked - 8 * 3600
                    overtime_s = int(extra)
                    overtime = f"{int(extra//3600)}h{int((extra%3600)//60):02d}"
            day_list.append({'agent': info['agent'], 'arrivee': fmt_t(fe),
                             'depart': fmt_t(le), 'present': present,
                             'heures_sup': overtime, 'overtime_s': overtime_s})
        day_list.sort(key=lambda x: x['arrivee'])
        p = sum(1 for a in day_list if a['present'])
        result.append({'jour': jour, 'presents': p, 'absents': expected - p,
                       'attendus': expected, 'taux': round((p / expected) * 100, 1) if expected else 0,
                       'agents': day_list})

    return Response({'total_expected': expected, 'days': result})
