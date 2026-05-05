"""
API views for the SMAPRDC statistics dashboard.
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
        WHERE p.isAdministratif = 1 AND p.en_fonction = 1 AND p.id_personnel != 1
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
        WHERE p.isAdministratif = 1 AND p.en_fonction = 1 AND p.id_personnel != 1
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
        WHERE p.isAdministratif = 1 AND p.en_fonction = 1 AND p.id_personnel != 1
        ORDER BY mois DESC
    """
    with connection.cursor() as cursor:
        cursor.execute(sql)
        return Response(_dictfetchall(cursor))


@api_view(['GET'])
def presence_personnel_detail(request):
    """Per-day individual entries for a given month — includes absent agents + justifications.

    CRITICAL: Availability is computed PER DATE.
    A person is AVAILABLE on a given date IF:
      - isAdministratif = 1
      - en_fonction = 1
      - AND has NO active congé covering that date
      - AND has NO non-EnFx professional status (i.e., their état is 'En fonction' or unset)

    Personnel who are unavailable on a given date are:
      - NOT counted as absent
      - NOT included in total expected
      - Shown separately with a 'Non disponible' marker
    """
    from collections import OrderedDict
    from datetime import timedelta, date
    import calendar

    mois = request.GET.get('mois', '')
    if not mois:
        return Response({'error': 'Paramètre mois requis'}, status=400)

    # ── Pre-compute month boundaries for date-range queries ──────────
    parts_pre = mois.split('-')
    year_pre, month_pre = int(parts_pre[0]), int(parts_pre[1])
    _, last_day_pre = calendar.monthrange(year_pre, month_pre)
    month_start_str = f"{mois}-01"
    month_end_str = f"{mois}-{last_day_pre:02d}"

    with connection.cursor() as cursor:
        cursor.execute("SELECT valeur FROM personnel_pointage_retardacademique LIMIT 1")
        tol_row = cursor.fetchone()
        tolerance_h = 3
        if tol_row and tol_row[0]:
            try:
                raw = str(tol_row[0]).strip()
                if 'h' in raw.lower():
                    tolerance_h = int(raw.lower().split('h')[0])
                elif ':' in raw:
                    tolerance_h = int(raw.split(':')[0])
                else:
                    tolerance_h = int(raw)
            except (ValueError, IndexError):
                pass

        cursor.execute("SELECT id_coupon, heureD FROM personnel_pointage_coupon")
        coupon_map = {r[0]: r[1] for r in cursor.fetchall()}

        # All active personnel (base pool: isAdministratif + en_fonction)
        cursor.execute("""
            SELECT p.id_personnel,
                   CONCAT(IFNULL(p.nom,''),' ',IFNULL(p.postnom,''),' ',IFNULL(p.prenom,'')) AS agent,
                   p.matricule, p.matriculeFP, p.genre, p.recrutement_date,
                   IFNULL(g.code,'—') AS grade_code
            FROM personnel p
            LEFT JOIN personnel_grade_administratif g ON g.id_grade_administratif = p.id_grade_administratif
            WHERE p.isAdministratif = 1 AND p.en_fonction = 1 AND p.id_personnel != 1
            ORDER BY p.nom, p.postnom
        """)
        all_personnel = _dictfetchall(cursor)

        # ── AVAILABILITY DATA: Professional states ───────────────────────
        # Personnel with a non-EnFx état are UNAVAILABLE on ALL dates.
        # 'EnFx' (sigle) means "En fonction" = available.
        # Personnel WITHOUT any état record are considered "En fonction" (available).
        cursor.execute("""
            SELECT ep.id_personnel, pr.sigle, pr.parametre
            FROM personnel_etatprofessionnel ep
            JOIN personnel_etatprofessionnel_parametes pr ON pr.id_parametre = ep.id_parametre
            JOIN personnel p ON p.id_personnel = ep.id_personnel
            WHERE p.isAdministratif = 1 AND p.en_fonction = 1 AND p.id_personnel != 1
        """)
        etat_rows = _dictfetchall(cursor)
        # Map: id_personnel → {sigle, parametre}
        etat_map = {}
        for er in etat_rows:
            etat_map[er['id_personnel']] = {'sigle': er['sigle'], 'parametre': er['parametre']}

        # ── AVAILABILITY DATA: Active congés for this month ──────────────
        # A congé covers a date range [startdate, enddate].
        # Any personnel on congé for a given date is UNAVAILABLE on that date.
        cursor.execute("""
            SELECT pc.id_personnel, pc.startdate, pc.enddate
            FROM personnel_conges pc
            JOIN personnel p ON p.id_personnel = pc.id_personnel
            WHERE p.isAdministratif = 1 AND p.en_fonction = 1 AND p.id_personnel != 1
              AND pc.enddate >= %s AND pc.startdate <= %s
        """, [month_start_str, month_end_str])
        conge_rows = _dictfetchall(cursor)
        # Build lookup: id_personnel → list of (startdate, enddate) ranges
        conge_map = {}
        for cr in conge_rows:
            pid = cr['id_personnel']
            if pid not in conge_map:
                conge_map[pid] = []
            sd = cr['startdate'] if isinstance(cr['startdate'], date) else date.fromisoformat(str(cr['startdate']))
            ed = cr['enddate'] if isinstance(cr['enddate'], date) else date.fromisoformat(str(cr['enddate']))
            conge_map[pid].append((sd, ed))

        cursor.execute("""
            SELECT pp.id_personnel,
                CONCAT(IFNULL(p.nom,''),' ',IFNULL(p.postnom,''),' ',IFNULL(p.prenom,'')) AS agent,
                DATE(pp.date_pointage) AS jour, TIME(pp.date_pointage) AS heure,
                pp.type_pointage, pp.id_coupon
            FROM personnel_pointage pp
            JOIN personnel p ON p.id_personnel = pp.id_personnel
            WHERE p.isAdministratif = 1 AND p.en_fonction = 1 AND p.id_personnel != 1
              AND CONCAT(YEAR(pp.date_pointage), '-', LPAD(MONTH(pp.date_pointage),2,'0')) = %s
            ORDER BY pp.date_pointage
        """, [mois])
        rows = _dictfetchall(cursor)

        # Load justifications for this month (via id_coupon → date_coupon)
        cursor.execute("""
            SELECT j.id_justificatif, j.id_personnel, c.date_coupon AS date_absence,
                   j.justifie, j.motif
            FROM personnel_pointage_justificatifs j
            JOIN personnel_pointage_coupon c ON c.id_coupon = j.id_coupon
            WHERE CONCAT(YEAR(c.date_coupon), '-', LPAD(MONTH(c.date_coupon),2,'0')) = %s
        """, [mois])
        just_rows = _dictfetchall(cursor)

    # Build justification lookup: (id_personnel, date_str) -> {...}
    just_map = {}
    for jr in just_rows:
        key = f"{jr['id_personnel']}|{jr['date_absence']}"
        just_map[key] = {
            'id_justificatif': jr['id_justificatif'],
            'justifie': bool(jr['justifie']),
            'motif': jr['motif'] or ''
        }

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

    def _is_on_conge(pid, dt):
        """Check if a personnel has an active congé on a given date."""
        for sd, ed in conge_map.get(pid, []):
            if sd <= dt <= ed:
                return True
        return False

    def _has_non_enfx_etat(pid):
        """Check if a personnel has a non-EnFx professional status."""
        etat = etat_map.get(pid)
        if etat and etat['sigle'] != 'EnFx':
            return etat
        return None

    # Build pointage data per day
    days_data = OrderedDict()
    for r in rows:
        jour = str(r['jour'])
        if jour not in days_data:
            days_data[jour] = {}
        aid = r['id_personnel']
        if aid not in days_data[jour]:
            days_data[jour][aid] = {'agent': r['agent'], 'entries': [], 'exits': [],
                               'coupon_heureD': coupon_map.get(r['id_coupon'], '8h00')}
        if r['type_pointage'] == 1:
            days_data[jour][aid]['entries'].append(r['heure'])
        elif r['type_pointage'] == 2:
            days_data[jour][aid]['exits'].append(r['heure'])

    # Determine all business days in the month (reuse pre-computed boundaries)
    year_v, month_v, last_day = year_pre, month_pre, last_day_pre
    today = date.today()
    all_days_in_month = []
    for d in range(1, last_day + 1):
        dt = date(year_v, month_v, d)
        if dt.weekday() < 5 and dt <= today:  # Mon-Fri, not future
            all_days_in_month.append(str(dt))

    # ── PER-DATE availability computation ────────────────────────────────
    result = []
    for jour in all_days_in_month:
        jour_dt = date.fromisoformat(jour)
        pointage_day = days_data.get(jour, {})
        day_list = []
        day_expected = 0  # dynamic per-date expected count

        for pers in all_personnel:
            aid = pers['id_personnel']
            _pinfo = {'id_personnel': aid, 'matricule': pers.get('matricule',''), 'matriculeFP': pers.get('matriculeFP',''),
                      'grade_code': pers.get('grade_code','—'), 'genre': pers.get('genre',''),
                      'recrutement_date': str(pers.get('recrutement_date','') or '')}

            # ── Check per-date availability ──────────────────────────
            unavail_reason = None
            non_enfx = _has_non_enfx_etat(aid)
            if non_enfx:
                unavail_reason = non_enfx['parametre']
            elif _is_on_conge(aid, jour_dt):
                unavail_reason = 'En congé'

            if unavail_reason:
                # Person is NOT AVAILABLE on this date:
                # - NOT counted in expected
                # - NOT counted as absent
                # - Shown with 'non_disponible' flag for frontend display
                day_list.append({'agent': pers['agent'], **_pinfo, 'arrivee': '—',
                                 'depart': '—', 'present': False,
                                 'heures_retard': '', 'retard_s': 0,
                                 'heures_sup': '', 'overtime_s': 0,
                                 'justifie': None, 'motif': '', 'id_justificatif': None,
                                 'non_disponible': True, 'motif_indisponibilite': unavail_reason})
                continue

            # Person IS AVAILABLE on this date → count toward expected
            day_expected += 1

            if aid in pointage_day:
                info = pointage_day[aid]
                fe = min(info['entries']) if info['entries'] else None
                le = max(info['exits']) if info['exits'] else None
                # Fallback: multiple entries with big gap = entry/exit
                if not le and fe and len(info['entries']) > 1:
                    last_entry = max(info['entries'])
                    gap = parse_t(last_entry) - parse_t(fe)
                    if gap > 4 * 3600:
                        le = last_entry
                arr_s = parse_t(fe) if fe else None
                dep_s = parse_t(le) if le else None
                hd_s = parse_t(info['coupon_heureD'])
                threshold_s = hd_s + tolerance_h * 3600
                present = arr_s is not None and arr_s <= threshold_s
                retard_str = ''
                retard_s = 0
                # Retard = arrivée après heureD (ex: arrivée 10h43, heureD 8h00 → retard 2h43)
                if arr_s is not None and arr_s > hd_s:
                    retard_s = int(arr_s - hd_s)
                    retard_str = f"{int(retard_s//3600)}h{int((retard_s%3600)//60):02d}"
                # Heures Sup = (dernière sortie – première entrée) – 8h, 0 si négatif
                hsup_str = ''
                hsup_s = 0
                if arr_s is not None and dep_s is not None:
                    worked_s = dep_s - arr_s
                    overtime_raw = worked_s - 8 * 3600  # 8h standard
                    if overtime_raw > 0:
                        hsup_s = int(overtime_raw)
                        hsup_str = f"{int(hsup_s//3600)}h{int((hsup_s%3600)//60):02d}"
                day_list.append({'agent': pers['agent'], **_pinfo, 'arrivee': fmt_t(fe),
                                 'depart': fmt_t(le), 'present': present,
                                 'heures_retard': retard_str, 'retard_s': retard_s,
                                 'heures_sup': hsup_str, 'overtime_s': hsup_s,
                                 'justifie': None, 'motif': '', 'id_justificatif': None,
                                 'non_disponible': False, 'motif_indisponibilite': ''})
            else:
                # AVAILABLE but ABSENT — include justification data
                jk = f"{aid}|{jour}"
                jdata = just_map.get(jk, {'id_justificatif': None, 'justifie': False, 'motif': ''})
                day_list.append({'agent': pers['agent'], **_pinfo, 'arrivee': '—',
                                 'depart': '—', 'present': False,
                                 'heures_retard': '', 'retard_s': 0,
                                 'heures_sup': '', 'overtime_s': 0,
                                 'justifie': jdata['justifie'], 'motif': jdata['motif'],
                                 'id_justificatif': jdata['id_justificatif'],
                                 'non_disponible': False, 'motif_indisponibilite': ''})

        # Sort alphabetically by agent name
        day_list.sort(key=lambda x: x['agent'])

        p = sum(1 for a in day_list if a['present'])
        absent_count = sum(1 for a in day_list if not a['present'] and not a.get('non_disponible'))
        indisponible_count = sum(1 for a in day_list if a.get('non_disponible'))
        jst = sum(1 for a in day_list if not a['present'] and not a.get('non_disponible') and a.get('justifie'))
        result.append({'jour': jour, 'presents': p, 'absents': absent_count,
                       'justifies': jst, 'indisponibles': indisponible_count,
                       'attendus': day_expected,
                       'taux': round((p / day_expected) * 100, 1) if day_expected else 0,
                       'agents': day_list})

    return Response({'total_expected': len(all_personnel), 'days': result})


# ═══════════════════════════════════════════════════════════════════════════════
#  CARRIÈRE — Frontend + API
# ═══════════════════════════════════════════════════════════════════════════════

def carriere_home(request):
    """Serve the career management page."""
    return render(request, 'dashboard/carriere.html')


@api_view(['GET'])
def carriere_personnel(request):
    """List personnel (administratif, en_fonction)."""
    sql = """
        SELECT p.id_personnel,
               CONCAT(IFNULL(p.nom,''),' ',IFNULL(p.postnom,''),' ',IFNULL(p.prenom,'')) AS agent,
               p.matricule, p.matriculeFP, p.genre, p.recrutement_date,
               IFNULL(g.code,'—') AS grade_code
        FROM personnel p
        LEFT JOIN personnel_grade_administratif g ON g.id_grade_administratif = p.id_grade_administratif
        WHERE p.isAdministratif = 1 AND p.en_fonction = 1 AND p.id_personnel != 1
        ORDER BY p.nom, p.postnom
    """
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def carriere_etats(request):
    """Current professional states with agent info."""
    sql = """
        SELECT ep.id_etatpro, ep.id_personnel, ep.id_parametre,
               CONCAT(IFNULL(p.nom,''),' ',IFNULL(p.postnom,''),' ',IFNULL(p.prenom,'')) AS agent,
               p.matricule, p.matriculeFP, p.genre, p.recrutement_date,
               IFNULL(g.code,'—') AS grade_code,
               pr.parametre, pr.sigle
        FROM personnel_etatprofessionnel ep
        JOIN personnel p ON p.id_personnel = ep.id_personnel
        JOIN personnel_etatprofessionnel_parametes pr ON pr.id_parametre = ep.id_parametre
        LEFT JOIN personnel_grade_administratif g ON g.id_grade_administratif = p.id_grade_administratif
        WHERE p.isAdministratif = 1 AND p.en_fonction = 1 AND p.id_personnel != 1
        ORDER BY p.nom, p.postnom
    """
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def carriere_parametres(request):
    """List all professional state parameters."""
    sql = "SELECT id_parametre, parametre, sigle FROM personnel_etatprofessionnel_parametes ORDER BY id_parametre"
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def carriere_conge_types(request):
    """List congé types with predefined info."""
    sql = "SELECT id_congetype, congename, nbrePredefini, totalJours FROM personnel_conge_types ORDER BY id_congetype"
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def carriere_conges(request):
    """List all congés with agent and type info."""
    sql = """
        SELECT pc.id_conge, pc.id_personnel, pc.id_congetype, pc.startdate, pc.enddate, pc.id_annee,
               pc.jours_ouvrables,
               CONCAT(IFNULL(p.nom,''),' ',IFNULL(p.postnom,''),' ',IFNULL(p.prenom,'')) AS agent,
               p.matricule, p.matriculeFP, p.genre, p.recrutement_date,
               IFNULL(g.code,'—') AS grade_code,
               ct.congename, ct.nbrePredefini, ct.totalJours AS totalJoursType
        FROM personnel_conges pc
        JOIN personnel p ON p.id_personnel = pc.id_personnel
        LEFT JOIN personnel_conge_types ct ON ct.id_congetype = pc.id_congetype
        LEFT JOIN personnel_grade_administratif g ON g.id_grade_administratif = p.id_grade_administratif
        WHERE p.isAdministratif = 1 AND p.en_fonction = 1 AND p.id_personnel != 1
          AND pc.id_annee = 5
        ORDER BY pc.startdate DESC
    """
    return Response(_run_stats_query(sql))


@api_view(['GET'])
def carriere_liste_declarative(request):
    """Return data for the Liste Déclarative: all administrative personnel in service
    with extended fields (grade, specialite, grade_administratif, naissance, etc.)."""
    sql = """
        SELECT p.id_personnel,
               p.matricule,
               CONCAT(IFNULL(p.nom,''),' ',IFNULL(p.postnom,''),' ',IFNULL(p.prenom,'')) AS nom_complet,
               p.genre,
               p.date_naissance,
               p.province_origine,
               IFNULL(gr.sigle,'—') AS niveau_etudes,
               IFNULL(sp.specialite,'—') AS domaine_etudes,
               p.matriculeFP,
               p.date_engagement,
               IFNULL(ga.code,'—') AS grade_stat,
               p.fonction,
               p.acte_nomination,
               p.ref_acte_engagement
        FROM personnel p
        LEFT JOIN personnel_grade gr ON gr.id_grade = p.id_grade
        LEFT JOIN personnel_specialite sp ON sp.id_specialite = p.id_specialite
        LEFT JOIN personnel_grade_administratif ga ON ga.id_grade_administratif = p.id_grade_administratif
        WHERE p.isAdministratif = 1 AND p.en_fonction = 1 AND p.id_personnel != 1
        ORDER BY p.nom, p.postnom
    """
    return Response(_run_stats_query(sql))


@api_view(['POST'])
def carriere_etats_save(request):
    """Upsert professional state for a personnel."""
    import json
    data = request.data
    id_personnel = data.get('id_personnel')
    id_parametre = data.get('id_parametre')
    if not id_personnel or not id_parametre:
        return Response({'success': False, 'error': 'Champs requis manquants'}, status=400)

    with connection.cursor() as cursor:
        # Check existing
        cursor.execute(
            "SELECT id_etatpro FROM personnel_etatprofessionnel WHERE id_personnel = %s",
            [id_personnel]
        )
        row = cursor.fetchone()
        if row:
            cursor.execute(
                "UPDATE personnel_etatprofessionnel SET id_parametre = %s WHERE id_personnel = %s",
                [id_parametre, id_personnel]
            )
        else:
            cursor.execute(
                "INSERT INTO personnel_etatprofessionnel (id_personnel, id_parametre) VALUES (%s, %s)",
                [id_personnel, id_parametre]
            )
    return Response({'success': True})


@api_view(['POST'])
def carriere_conges_save(request):
    """Create a new congé."""
    data = request.data
    id_personnel = data.get('id_personnel')
    id_congetype = data.get('id_congetype')
    startdate = data.get('startdate')
    enddate = data.get('enddate')
    jours_ouvrables = data.get('jours_ouvrables', 0)
    id_annee = data.get('id_annee', 5)

    if not all([id_personnel, id_congetype, startdate, enddate]):
        return Response({'success': False, 'error': 'Champs requis manquants'}, status=400)

    with connection.cursor() as cursor:
        cursor.execute(
            """INSERT INTO personnel_conges (id_personnel, id_congetype, startdate, enddate, jours_ouvrables, id_annee)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            [id_personnel, id_congetype, startdate, enddate, jours_ouvrables, id_annee]
        )
    return Response({'success': True})


# ═══════════════════════════════════════════════════════════════════════════════
#  JUSTIFICATIFS — CRUD for absence justifications
#  Table schema: (id_justificatif, id_personnel, id_coupon, motif, justifie, id_user)
#  id_coupon → personnel_pointage_coupon.date_coupon (the absence date)
#  id_user  → the connected user who validated the justification
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
def justificatif_save(request):
    """Upsert an absence justification (justifié/non justifié + motif)."""
    data = request.data
    id_personnel = data.get('id_personnel')
    date_absence = data.get('date_absence')
    justifie = 1 if data.get('justifie') else 0
    motif = data.get('motif', '') or ''

    if not id_personnel or not date_absence:
        return Response({'success': False, 'error': 'Champs requis manquants'}, status=400)

    with connection.cursor() as cursor:
        # Find the coupon for this date
        cursor.execute(
            "SELECT id_coupon FROM personnel_pointage_coupon WHERE date_coupon = %s LIMIT 1",
            [date_absence]
        )
        coupon_row = cursor.fetchone()
        if not coupon_row:
            return Response({'success': False, 'error': 'Aucun coupon trouvé pour cette date'}, status=404)
        id_coupon = coupon_row[0]

        # Check if justification already exists for this personnel + coupon
        cursor.execute(
            "SELECT id_justificatif FROM personnel_pointage_justificatifs WHERE id_personnel = %s AND id_coupon = %s",
            [id_personnel, id_coupon]
        )
        row = cursor.fetchone()
        if row:
            cursor.execute(
                "UPDATE personnel_pointage_justificatifs SET justifie = %s, motif = %s WHERE id_justificatif = %s",
                [justifie, motif, row[0]]
            )
            return Response({'success': True, 'id_justificatif': row[0], 'action': 'updated'})
        else:
            cursor.execute(
                """INSERT INTO personnel_pointage_justificatifs (id_personnel, id_coupon, motif, justifie, id_user)
                   VALUES (%s, %s, %s, %s, %s)""",
                [id_personnel, id_coupon, motif, justifie, 1]
            )
            return Response({'success': True, 'id_justificatif': cursor.lastrowid, 'action': 'created'})


@api_view(['GET'])
def justificatif_history(request):
    """Return absence history for a given agent (with justification status)."""
    id_personnel = request.GET.get('id_personnel')
    if not id_personnel:
        return Response({'error': 'id_personnel requis'}, status=400)

    with connection.cursor() as cursor:
        # Get agent info
        cursor.execute("""
            SELECT p.id_personnel,
                   CONCAT(IFNULL(p.nom,''),' ',IFNULL(p.postnom,''),' ',IFNULL(p.prenom,'')) AS agent,
                   p.matricule, IFNULL(g.code,'—') AS grade_code
            FROM personnel p
            LEFT JOIN personnel_grade_administratif g ON g.id_grade_administratif = p.id_grade_administratif
            WHERE p.id_personnel = %s
        """, [id_personnel])
        pers_info = _dictfetchall(cursor)

        # Get all justifications for this agent (via coupon → date)
        cursor.execute("""
            SELECT j.id_justificatif, c.date_coupon AS date_absence, j.justifie, j.motif
            FROM personnel_pointage_justificatifs j
            JOIN personnel_pointage_coupon c ON c.id_coupon = j.id_coupon
            WHERE j.id_personnel = %s
            ORDER BY c.date_coupon DESC
        """, [id_personnel])
        justificatifs = _dictfetchall(cursor)

    return Response({
        'agent': pers_info[0] if pers_info else {},
        'justificatifs': justificatifs
    })


@api_view(['GET'])
def justificatifs_list(request):
    """List all justifications for a given month (or all)."""
    mois = request.GET.get('mois', '')

    with connection.cursor() as cursor:
        if mois:
            cursor.execute("""
                SELECT j.id_justificatif, j.id_personnel, c.date_coupon AS date_absence,
                       j.justifie, j.motif,
                       CONCAT(IFNULL(p.nom,''),' ',IFNULL(p.postnom,''),' ',IFNULL(p.prenom,'')) AS agent,
                       p.matricule, IFNULL(g.code,'—') AS grade_code
                FROM personnel_pointage_justificatifs j
                JOIN personnel_pointage_coupon c ON c.id_coupon = j.id_coupon
                JOIN personnel p ON p.id_personnel = j.id_personnel
                LEFT JOIN personnel_grade_administratif g ON g.id_grade_administratif = p.id_grade_administratif
                WHERE CONCAT(YEAR(c.date_coupon), '-', LPAD(MONTH(c.date_coupon),2,'0')) = %s
                ORDER BY c.date_coupon DESC, p.nom
            """, [mois])
        else:
            cursor.execute("""
                SELECT j.id_justificatif, j.id_personnel, c.date_coupon AS date_absence,
                       j.justifie, j.motif,
                       CONCAT(IFNULL(p.nom,''),' ',IFNULL(p.postnom,''),' ',IFNULL(p.prenom,'')) AS agent,
                       p.matricule, IFNULL(g.code,'—') AS grade_code
                FROM personnel_pointage_justificatifs j
                JOIN personnel_pointage_coupon c ON c.id_coupon = j.id_coupon
                JOIN personnel p ON p.id_personnel = j.id_personnel
                LEFT JOIN personnel_grade_administratif g ON g.id_grade_administratif = p.id_grade_administratif
                ORDER BY c.date_coupon DESC, p.nom
            """)
        return Response(_dictfetchall(cursor))


# ═══════════════════════════════════════════════════════════════════════════════
#  INSTITUTION — Metadata + logos for official PDF reports
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
def institution_info(request):
    """Return institution metadata for PDF header.
    Logos are served as static assets from /static/dashboard/img/.
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT nom_institution, sigle, telephone, email, site,
                   ministere, categorie, siege, pays
            FROM institution LIMIT 1
        """)
        row = cursor.fetchone()
        if not row:
            return Response({'error': 'Aucune institution trouvée'}, status=404)

        cols = [c[0] for c in cursor.description]
        data = dict(zip(cols, row))

        # Static logo paths (served from Django static files)
        data['logo_url'] = '/static/dashboard/img/logoENF.png'
        data['logo_ministere_url'] = '/static/dashboard/img/logoMinFin.png'
        data['logo_pays_url'] = '/static/dashboard/img/logoRDC.jpg'

    return Response(data)
