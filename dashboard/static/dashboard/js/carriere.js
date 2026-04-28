/**
 * SMARPRDC Carrière — Career Management Engine
 * Tabs: Vue Globale, États Professionnels, Congés
 */

const API = '/carriere/api';
let _personnel = [], _etats = [], _parametres = [], _conges = [], _congeTypes = [], _anneeId = 5;

// ═══════════════════════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

const fmt = n => (n || 0).toLocaleString('fr-FR');

function toast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = msg;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3500);
}

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const panel = document.getElementById(tabId);
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('active');
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function getCsrf() {
    const c = document.cookie.match(/csrftoken=([^;]+)/);
    return c ? c[1] : '';
}

async function apiPost(url, data) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrf() },
        body: JSON.stringify(data)
    });
    return res.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STATUS BADGE
// ═══════════════════════════════════════════════════════════════════════════════

const SIGLE_CLASS = {
    'EnFx': 'st-enfx', 'EnDT': 'st-endt', 'F0RM': 'st-form',
    'EnCA': 'st-enca', 'EnCC': 'st-encc', 'EnCM': 'st-encm',
    'DSRT': 'st-dsrt', 'MSIO': 'st-msio', 'RTRT': 'st-rtrt'
};

function statusBadge(parametre, sigle) {
    const cls = SIGLE_CLASS[sigle] || 'st-default';
    return `<span class="status-badge ${cls}">${parametre || 'Non défini'}</span>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DATA LOADING
// ═══════════════════════════════════════════════════════════════════════════════

async function loadAll() {
    try {
        const [pRes, eRes, prRes, cRes, ctRes] = await Promise.all([
            fetch(API + '/personnel').then(r => r.json()),
            fetch(API + '/etats').then(r => r.json()),
            fetch(API + '/parametres').then(r => r.json()),
            fetch(API + '/conges').then(r => r.json()),
            fetch(API + '/conge-types').then(r => r.json()),
        ]);
        _personnel = pRes; _etats = eRes; _parametres = prRes;
        _conges = cRes; _congeTypes = ctRes;

        renderHero();
        renderGlobal();
        renderEtats();
        renderConges();
        populateDropdowns();

        document.getElementById('main-loader').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    } catch (e) {
        console.error('[Carrière] Load error:', e);
        document.getElementById('main-loader').innerHTML =
            '<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">Erreur de chargement des données</div></div>';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HERO CARDS
// ═══════════════════════════════════════════════════════════════════════════════

function heroCard(cls, label, value, sub, icon) {
    return `<div class="hero-card ${cls}">
        <div class="label">${label}</div>
        <div class="value">${value}</div>
        <div class="sub">${sub}</div>
        <span class="icon">${icon}</span>
    </div>`;
}

function renderHero() {
    const total = _personnel.length;
    // Build etat map
    const etatMap = {};
    _etats.forEach(e => { etatMap[e.id_personnel] = e; });
    let enFx = 0, enConge = 0, other = 0;
    _personnel.forEach(p => {
        const e = etatMap[p.id_personnel];
        if (!e || e.sigle === 'EnFx') enFx++;
        else if (['EnCA','EnCC','EnCM'].includes(e.sigle)) enConge++;
        else other++;
    });
    const totalConges = _conges.length;

    const h = document.getElementById('hero-summary');
    h.innerHTML =
        heroCard('c1', 'Personnel Total', fmt(total), 'Administratif en fonction', '👥') +
        heroCard('c7', 'En Fonction', fmt(enFx), `${total ? ((enFx/total)*100).toFixed(1) : 0}% du personnel`, '✅') +
        heroCard('c3', 'En Congé', fmt(enConge), `${total ? ((enConge/total)*100).toFixed(1) : 0}% du personnel`, '🏖️') +
        heroCard('c5', 'Autres États', fmt(other), 'Détachement, Mission, etc.', '📋') +
        heroCard('c6', 'Congés Enregistrés', fmt(totalConges), 'Toutes périodes confondues', '📅');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB 1: VUE GLOBALE
// ═══════════════════════════════════════════════════════════════════════════════

function renderGlobal() {
    const etatMap = {};
    _etats.forEach(e => { etatMap[e.id_personnel] = e; });

    // Populate filter
    const sel = document.getElementById('filter-etat-global');
    sel.innerHTML = '<option value="">Tous les états</option>';
    _parametres.forEach(p => {
        sel.innerHTML += `<option value="${p.id_parametre}">${p.parametre}</option>`;
    });

    const tbody = document.getElementById('tbody-global');
    let html = '';
    _personnel.forEach((p, i) => {
        const e = etatMap[p.id_personnel];
        const parametre = e ? e.parametre : 'En fonction';
        const sigle = e ? e.sigle : 'EnFx';
        html += `<tr data-name="${(p.agent||'').toLowerCase()}" data-etat="${e ? e.id_parametre : 1}">
            <td style="font-weight:600;color:var(--text-muted);font-size:.72rem">${i + 1}</td>
            <td style="font-weight:600">${p.agent}</td>
            <td style="font-size:.76rem;color:var(--text-secondary)">${p.matricule || '—'}</td>
            <td>${p.genre || '—'}</td>
            <td>${statusBadge(parametre, sigle)}</td>
            <td style="font-size:.72rem;color:var(--text-muted)">—</td>
        </tr>`;
    });
    tbody.innerHTML = html;
    document.getElementById('count-global').textContent = _personnel.length + ' agents';
}

function filterGlobal() {
    const q = document.getElementById('search-global').value.toLowerCase();
    const etat = document.getElementById('filter-etat-global').value;
    const rows = document.querySelectorAll('#tbody-global tr');
    let vis = 0;
    rows.forEach(r => {
        const nameMatch = !q || r.dataset.name.includes(q);
        const etatMatch = !etat || r.dataset.etat === etat;
        r.style.display = nameMatch && etatMatch ? '' : 'none';
        if (nameMatch && etatMatch) vis++;
    });
    document.getElementById('count-global').textContent = vis + ' agents';
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB 2: ÉTATS PROFESSIONNELS
// ═══════════════════════════════════════════════════════════════════════════════

function renderEtats() {
    const tbody = document.getElementById('tbody-etats');
    let html = '';
    if (!_etats.length) {
        html = '<tr><td colspan="5" class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">Aucun état professionnel affecté</div></td></tr>';
    } else {
        _etats.forEach((e, i) => {
            html += `<tr data-name="${(e.agent||'').toLowerCase()}">
                <td style="font-weight:600;color:var(--text-muted);font-size:.72rem">${i + 1}</td>
                <td style="font-weight:600">${e.agent}</td>
                <td>${statusBadge(e.parametre, e.sigle)}</td>
                <td style="font-size:.76rem;font-weight:600;color:var(--text-muted)">${e.sigle}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="openEtatModalEdit(${e.id_personnel}, ${e.id_parametre})">✏️ Modifier</button>
                </td>
            </tr>`;
        });
    }
    tbody.innerHTML = html;
    document.getElementById('count-etats').textContent = _etats.length + ' affectations';
}

function filterEtats() {
    const q = document.getElementById('search-etats').value.toLowerCase();
    document.querySelectorAll('#tbody-etats tr').forEach(r => {
        r.style.display = !q || (r.dataset.name && r.dataset.name.includes(q)) ? '' : 'none';
    });
}

function openEtatModal() {
    document.getElementById('etat-personnel').value = '';
    document.getElementById('etat-parametre').value = '';
    openModal('modal-etat');
}

function openEtatModalEdit(idPersonnel, idParametre) {
    document.getElementById('etat-personnel').value = idPersonnel;
    document.getElementById('etat-parametre').value = idParametre;
    openModal('modal-etat');
}

async function saveEtat() {
    const idPersonnel = document.getElementById('etat-personnel').value;
    const idParametre = document.getElementById('etat-parametre').value;
    if (!idPersonnel || !idParametre) { toast('⚠️ Veuillez remplir tous les champs', 'error'); return; }

    try {
        const res = await apiPost(API + '/etats/save', { id_personnel: +idPersonnel, id_parametre: +idParametre });
        if (res.success) {
            toast('✅ État professionnel mis à jour', 'success');
            closeModal('modal-etat');
            await loadAll();
        } else {
            toast('❌ ' + (res.error || 'Erreur'), 'error');
        }
    } catch (e) {
        toast('❌ Erreur réseau', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB 3: CONGÉS (ACCORDION)
// ═══════════════════════════════════════════════════════════════════════════════

function calcBusinessDays(start, end) {
    let count = 0;
    const d = new Date(start);
    const e = new Date(end);
    while (d <= e) {
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) count++;
        d.setDate(d.getDate() + 1);
    }
    return count;
}

function renderConges() {
    const container = document.getElementById('conges-accordion');

    // Populate type filter
    const sel = document.getElementById('filter-conge-type');
    sel.innerHTML = '<option value="">Tous les types</option>';
    _congeTypes.forEach(ct => {
        sel.innerHTML += `<option value="${ct.id_congetype}">${ct.congename}</option>`;
    });

    // Group conges by personnel
    const byPersonnel = {};
    _conges.forEach(c => {
        if (!byPersonnel[c.id_personnel]) {
            byPersonnel[c.id_personnel] = { agent: c.agent, conges: [] };
        }
        byPersonnel[c.id_personnel].conges.push(c);
    });

    // Also add personnel with no congés
    _personnel.forEach(p => {
        if (!byPersonnel[p.id_personnel]) {
            byPersonnel[p.id_personnel] = { agent: p.agent, conges: [] };
        }
    });

    // Sort by name
    const sorted = Object.entries(byPersonnel).sort((a, b) => a[1].agent.localeCompare(b[1].agent));

    let html = '';
    sorted.forEach(([idP, data]) => {
        const totalJours = data.conges.reduce((s, c) => s + calcBusinessDays(c.startdate, c.enddate), 0);
        const nbConges = data.conges.length;
        const accId = 'acc-' + idP;

        html += `<div class="accordion-item" data-name="${data.agent.toLowerCase()}" data-types="${data.conges.map(c=>c.id_congetype).join(',')}">
            <div class="accordion-header" onclick="toggleAccordion('${accId}')">
                <span class="agent-name">${data.agent}</span>
                <div class="agent-meta">
                    ${nbConges > 0 ? `<span class="status-badge st-enca">${nbConges} congé${nbConges > 1 ? 's' : ''}</span>` : '<span class="status-badge st-enfx">Aucun congé</span>'}
                    <span style="font-size:.72rem;font-weight:600;color:var(--text-muted)">${totalJours} j. ouvrables</span>
                    <span class="accordion-chevron" id="chev-${accId}">▼</span>
                </div>
            </div>
            <div class="accordion-body" id="${accId}">`;

        if (!nbConges) {
            html += '<div class="empty-state"><div class="empty-state-text">Aucun congé enregistré</div></div>';
        } else {
            // Cumul par type
            const cumulByType = {};
            data.conges.forEach(c => {
                if (!cumulByType[c.id_congetype]) {
                    cumulByType[c.id_congetype] = { name: c.congename || 'Type inconnu', total: 0, nbrePredefini: c.nbrePredefini, totalJours: c.totalJoursType };
                }
                cumulByType[c.id_congetype].total += calcBusinessDays(c.startdate, c.enddate);
            });

            // Cumul summary chips
            html += '<div class="cumul-summary">';
            Object.entries(cumulByType).forEach(([tid, ct]) => {
                const pct = ct.nbrePredefini && ct.totalJours ? ((ct.total / ct.totalJours) * 100).toFixed(0) : null;
                const color = pct !== null ? (pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981') : '#6366f1';
                html += `<div class="cumul-chip">
                    <span class="dot" style="background:${color}"></span>
                    <span>${ct.name}: <strong>${ct.total} j.</strong></span>
                    ${ct.nbrePredefini ? `<span style="font-size:.64rem;opacity:.7">/ ${ct.totalJours} j.</span>` : '<span style="font-size:.64rem;opacity:.7">∞</span>'}
                </div>`;
            });
            html += '</div>';

            // Conge cards
            html += '<div class="conge-cards">';
            data.conges.forEach(c => {
                const jours = calcBusinessDays(c.startdate, c.enddate);
                const cumul = cumulByType[c.id_congetype] ? cumulByType[c.id_congetype].total : jours;
                const plafond = c.nbrePredefini ? c.totalJoursType : null;
                const reste = plafond !== null ? Math.max(0, plafond - cumul) : null;
                const pct = plafond ? Math.min(100, (cumul / plafond) * 100) : null;
                const barClass = pct !== null ? (pct > 90 ? 'red' : pct > 70 ? 'amber' : 'green') : 'green';

                html += `<div class="conge-card">
                    <div class="conge-card-type" style="color:var(--accent-indigo)">
                        🏖️ ${c.congename || 'Type inconnu'}
                    </div>
                    <div class="conge-card-dates">
                        📅 ${c.startdate} → ${c.enddate}
                    </div>
                    <div class="conge-card-stats">
                        <div class="conge-stat pris">
                            <span class="conge-stat-label">Jours pris</span>
                            <span class="conge-stat-value">${jours}</span>
                        </div>
                        <div class="conge-stat cumul">
                            <span class="conge-stat-label">Cumul</span>
                            <span class="conge-stat-value">${cumul}</span>
                        </div>
                        ${plafond !== null ? `
                        <div class="conge-stat reste">
                            <span class="conge-stat-label">Restant</span>
                            <span class="conge-stat-value">${reste}</span>
                        </div>
                        <div class="conge-stat plafond">
                            <span class="conge-stat-label">Plafond</span>
                            <span class="conge-stat-value">${plafond}</span>
                        </div>` : ''}
                    </div>
                    ${plafond !== null ? `<div class="progress-bar"><div class="progress-fill ${barClass}" style="width:${pct}%"></div></div>` : ''}
                </div>`;
            });
            html += '</div>';
        }
        html += '</div></div>';
    });

    container.innerHTML = html;
}

function toggleAccordion(id) {
    const body = document.getElementById(id);
    const chev = document.getElementById('chev-' + id);
    if (body.classList.contains('open')) {
        body.classList.remove('open');
        if (chev) chev.classList.remove('open');
    } else {
        body.classList.add('open');
        if (chev) chev.classList.add('open');
    }
}

function filterConges() {
    const q = document.getElementById('search-conges').value.toLowerCase();
    const typeId = document.getElementById('filter-conge-type').value;
    document.querySelectorAll('#conges-accordion .accordion-item').forEach(item => {
        const nameMatch = !q || item.dataset.name.includes(q);
        const types = item.dataset.types || '';
        const typeMatch = !typeId || types.split(',').includes(typeId);
        item.style.display = nameMatch && typeMatch ? '' : 'none';
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DROPDOWNS
// ═══════════════════════════════════════════════════════════════════════════════

function populateDropdowns() {
    // Personnel selects
    const pOpts = '<option value="">— Sélectionner —</option>' +
        _personnel.map(p => `<option value="${p.id_personnel}">${p.agent}</option>`).join('');
    document.getElementById('etat-personnel').innerHTML = pOpts;
    document.getElementById('conge-personnel').innerHTML = pOpts;

    // Parametres select
    document.getElementById('etat-parametre').innerHTML =
        '<option value="">— Sélectionner —</option>' +
        _parametres.map(p => `<option value="${p.id_parametre}">${p.parametre} (${p.sigle})</option>`).join('');

    // Conge types select
    document.getElementById('conge-type').innerHTML =
        '<option value="">— Sélectionner —</option>' +
        _congeTypes.map(ct => `<option value="${ct.id_congetype}" data-predefini="${ct.nbrePredefini}" data-total="${ct.totalJours || 0}">${ct.congename}</option>`).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CONGÉ MODAL LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

function openCongeModal() {
    document.getElementById('conge-personnel').value = '';
    document.getElementById('conge-type').value = '';
    document.getElementById('conge-start').value = '';
    document.getElementById('conge-end').value = '';
    document.getElementById('conge-plafond-info').style.display = 'none';
    openModal('modal-conge');
}

function onCongeTypeChange() {
    const sel = document.getElementById('conge-type');
    const opt = sel.options[sel.selectedIndex];
    const info = document.getElementById('conge-plafond-info');
    if (opt && opt.dataset.predefini === '1') {
        const total = parseInt(opt.dataset.total) || 0;
        info.style.display = 'block';
        document.getElementById('conge-cumul-preview').innerHTML =
            `<div class="cumul-chip"><span class="dot" style="background:#f59e0b"></span>
            Plafond annuel: <strong>${total} jours ouvrables</strong></div>`;
    } else {
        info.style.display = 'none';
    }
}

async function saveConge() {
    const idP = document.getElementById('conge-personnel').value;
    const idCT = document.getElementById('conge-type').value;
    const start = document.getElementById('conge-start').value;
    const end = document.getElementById('conge-end').value;

    if (!idP || !idCT || !start || !end) { toast('⚠️ Veuillez remplir tous les champs', 'error'); return; }
    if (new Date(start) > new Date(end)) { toast('⚠️ La date de début doit être avant la fin', 'error'); return; }

    const jours = calcBusinessDays(start, end);

    // Check plafond
    const sel = document.getElementById('conge-type');
    const opt = sel.options[sel.selectedIndex];
    if (opt && opt.dataset.predefini === '1') {
        const plafond = parseInt(opt.dataset.total) || 0;
        // Cumul for this person + type in current year
        const cumul = _conges
            .filter(c => c.id_personnel === +idP && c.id_congetype === +idCT && c.id_annee === _anneeId)
            .reduce((s, c) => s + calcBusinessDays(c.startdate, c.enddate), 0);
        if (cumul + jours > plafond) {
            toast(`⚠️ Plafond dépassé ! Cumul actuel: ${cumul}j + ${jours}j = ${cumul + jours}j > ${plafond}j`, 'error');
            return;
        }
    }

    try {
        const res = await apiPost(API + '/conges/save', {
            id_personnel: +idP, id_congetype: +idCT,
            startdate: start, enddate: end, id_annee: _anneeId
        });
        if (res.success) {
            toast('✅ Congé enregistré avec succès', 'success');
            closeModal('modal-conge');
            await loadAll();
        } else {
            toast('❌ ' + (res.error || 'Erreur'), 'error');
        }
    } catch (e) {
        toast('❌ Erreur réseau', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', loadAll);
