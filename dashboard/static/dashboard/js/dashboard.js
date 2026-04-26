/**
 * SMARPRDC Dashboard — ApexCharts Rendering Engine
 * Inspired by eSchoolStructure accueil/tableaux tab.
 * Fetches data from Django API and renders ApexCharts.
 */

// ═══════════════════════════════════════════════════════════════════════════════
//  CHART CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHARTS_CONFIG = [
    // ── Apprenants ───────────────────────────────────────────────────────
    { id:'chart-appr-genre',     endpoint:'/stats/apprenants/genre',     title:'Répartition par Genre',     icon:'♂♀', type:'pie', colors:['#3b82f6','#ec4899','#94a3b8','#64748b','#a78bfa'], section:'apprenants' },
    { id:'chart-appr-promotion', endpoint:'/stats/apprenants/promotion', title:'Par Promotion',             icon:'📚', type:'bar', colors:['#6366f1','#818cf8','#a5b4fc','#c7d2fe','#4f46e5','#7c3aed','#4338ca','#312e81','#e0e7ff','#93c5fd'], section:'apprenants' },
    { id:'chart-appr-province',  endpoint:'/stats/apprenants/province',  title:'Par Province',              icon:'🗺️', type:'bar', colors:['#06b6d4','#0ea5e9','#38bdf8','#7dd3fc','#0284c7','#0369a1','#075985','#164e63','#22d3ee','#67e8f9'], section:'apprenants' },
    { id:'chart-appr-service',   endpoint:'/stats/apprenants/service',   title:'Par Service',               icon:'🏢', type:'grid', colors:['#10b981','#34d399','#6ee7b7','#059669','#047857','#14b8a6','#2dd4bf','#0f766e','#a7f3d0','#d1fae5'], section:'apprenants' },
    { id:'chart-appr-grade',     endpoint:'/stats/apprenants/grade',     title:'Par Grade Académique',      icon:'🎓', type:'bar', colors:['#8b5cf6','#a78bfa','#c4b5fd','#7c3aed','#6d28d9','#5b21b6','#a855f7','#ddd6fe','#ede9fe','#4c1d95'], section:'apprenants' },

    // ── Personnel ────────────────────────────────────────────────────────
    { id:'chart-pers-genre',     endpoint:'/stats/personnel/genre',      title:'Répartition par Genre',     icon:'♂♀', type:'pie', colors:['#3b82f6','#ec4899','#94a3b8','#64748b','#a78bfa'], section:'personnel' },
    { id:'chart-pers-grade',     endpoint:'/stats/personnel/grade',      title:'Par Grade',                 icon:'🏅', type:'bar', colors:['#f43f5e','#fb7185','#f59e0b','#fbbf24','#ef4444','#dc2626','#b91c1c','#e11d48','#fda4af','#fecdd3'], section:'personnel' },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

const fmt = n => (n || 0).toLocaleString('fr-FR');

let apexInstances = [];

// ═══════════════════════════════════════════════════════════════════════════════
//  STATES
// ═══════════════════════════════════════════════════════════════════════════════

function showLoading(containerId) {
    const wrap = document.querySelector(`#${containerId} .chart-wrap`);
    if (!wrap) return;
    wrap.innerHTML = `
        <div class="chart-loading">
            <div class="spinner"></div>
            <span class="chart-loading-text">Chargement…</span>
        </div>`;
}

function showError(containerId, msg) {
    const wrap = document.querySelector(`#${containerId} .chart-wrap`);
    if (!wrap) return;
    wrap.innerHTML = `
        <div class="chart-error">
            <span class="chart-error-icon">⚠️</span>
            <span class="chart-error-text">${msg}</span>
        </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CHART RENDERERS
// ═══════════════════════════════════════════════════════════════════════════════

function renderPieChart(containerId, data, colors) {
    const wrap = document.querySelector(`#${containerId} .chart-wrap`);
    if (!wrap) return;

    const total = data.reduce((s, d) => s + d.value, 0);
    wrap.innerHTML = `<div id="apex-${containerId}"></div>`;

    // Update badge
    const badge = document.querySelector(`#${containerId} .card-badge`);
    if (badge) badge.textContent = fmt(total);

    const chart = new ApexCharts(document.querySelector(`#apex-${containerId}`), {
        chart: { type: 'pie', height: 280, toolbar: { show: false } },
        series: data.map(d => d.value),
        labels: data.map(d => d.label),
        colors: colors.slice(0, data.length),
        dataLabels: {
            enabled: true,
            formatter: (val) => val.toFixed(1) + '%',
            style: { fontSize: '10px', fontWeight: 600 },
            dropShadow: { enabled: false }
        },
        legend: {
            position: 'bottom',
            fontSize: '11px',
            fontWeight: 500,
            fontFamily: 'Inter',
            markers: { size: 8, shape: 'circle' },
            itemMargin: { horizontal: 8, vertical: 4 }
        },
        tooltip: {
            y: {
                formatter: v => fmt(v) + ' (' + ((v / total) * 100).toFixed(1) + '%)'
            }
        },
        stroke: { width: 2, colors: ['#ffffff'] },
        responsive: [{
            breakpoint: 480,
            options: { legend: { position: 'bottom' } }
        }]
    });
    chart.render();
    apexInstances.push(chart);
}

function renderBarChart(containerId, data, colors) {
    const wrap = document.querySelector(`#${containerId} .chart-wrap`);
    if (!wrap) return;

    const total = data.reduce((s, d) => s + d.value, 0);
    wrap.innerHTML = `<div id="apex-${containerId}"></div>`;

    const badge = document.querySelector(`#${containerId} .card-badge`);
    if (badge) badge.textContent = fmt(total);

    const pctData = data.map(d => total ? +((d.value / total) * 100).toFixed(1) : 0);

    const chart = new ApexCharts(document.querySelector(`#apex-${containerId}`), {
        chart: { type: 'bar', height: Math.max(280, data.length * 28), toolbar: { show: false } },
        series: [{ data: pctData }],
        colors: colors,
        plotOptions: { bar: { horizontal: false, borderRadius: 4, columnWidth: '55%', distributed: true } },
        xaxis: {
            categories: data.map(d => d.label),
            labels: { style: { fontSize: '10px', fontWeight: 600, fontFamily: 'Inter' }, rotate: -45, rotateAlways: data.length > 5, trim: true, maxHeight: 100 }
        },
        yaxis: { max: 100, labels: { style: { fontSize: '11px', fontWeight: 500, fontFamily: 'Inter' }, formatter: v => v + '%' } },
        dataLabels: { enabled: true, formatter: v => v + '%', style: { fontSize: '10px', fontWeight: 700, fontFamily: 'Inter' }, offsetY: -4 },
        legend: { show: false },
        grid: { borderColor: '#e5e7eb', yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
        tooltip: { y: { formatter: (v, { dataPointIndex: i }) => v + '% (' + fmt(data[i].value) + ')' } }
    });
    chart.render();
    apexInstances.push(chart);
}

function renderHBarChart(containerId, data, colors) {
    const wrap = document.querySelector(`#${containerId} .chart-wrap`);
    if (!wrap) return;

    const total = data.reduce((s, d) => s + d.value, 0);
    wrap.innerHTML = `<div id="apex-${containerId}"></div>`;

    const badge = document.querySelector(`#${containerId} .card-badge`);
    if (badge) badge.textContent = fmt(total);

    const pctData = data.map(d => total ? +((d.value / total) * 100).toFixed(1) : 0);

    const chart = new ApexCharts(document.querySelector(`#apex-${containerId}`), {
        chart: { type: 'bar', height: Math.max(400, data.length * 30), toolbar: { show: false } },
        series: [{ data: pctData }],
        colors: colors,
        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%', distributed: true } },
        yaxis: { categories: data.map(d => d.label), labels: { style: { fontSize: '10px', fontWeight: 600, fontFamily: 'Inter' }, maxWidth: 250 } },
        xaxis: { max: Math.ceil(Math.max(...pctData) + 2), labels: { formatter: v => v + '%', style: { fontSize: '10px', fontFamily: 'Inter' } } },
        dataLabels: { enabled: true, formatter: v => v + '%', style: { fontSize: '10px', fontWeight: 700, fontFamily: 'Inter' } },
        legend: { show: false },
        grid: { borderColor: '#e5e7eb' },
        tooltip: { y: { formatter: (v, { dataPointIndex: i }) => v + '% (' + fmt(data[i].value) + ')' } }
    });
    chart.render();
    apexInstances.push(chart);
}

function renderGrid(containerId, data) {
    const wrap = document.querySelector(`#${containerId} .chart-wrap`);
    if (!wrap) return;

    const total = data.reduce((s, d) => s + d.value, 0);

    // Update badge
    const badge = document.querySelector(`#${containerId} .card-badge`);
    if (badge) badge.textContent = fmt(total);

    // Sort by value descending
    const sorted = [...data].sort((a, b) => b.value - a.value);

    // Color palette
    const palette = [
        '#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b',
        '#ef4444','#ec4899','#0ea5e9','#14b8a6','#f97316',
        '#7c3aed','#0d9488','#d946ef','#3b82f6','#84cc16',
        '#e11d48','#0284c7','#059669','#dc2626','#4f46e5'
    ];

    // 5 width tiers based on value intervals
    const tierWidth = (v) => {
        if (v >= 100) return 350;
        if (v >= 50)  return 280;
        if (v >= 10)  return 210;
        if (v >= 5)   return 160;
        return 120;
    };

    wrap.innerHTML = `<div class="stat-flex">${sorted.map((d, i) => {
        const pct = total ? (d.value / total * 100) : 0;
        const w = tierWidth(d.value);
        const bg = palette[i % palette.length];
        return `<div class="stat-flex-item" style="width:${w}px;flex-grow:0;background:${bg}">
            <div class="stat-flex-label">${d.label || 'N/A'}</div>
            <div class="stat-flex-value">${fmt(d.value)}</div>
            <div class="stat-flex-pct">${pct.toFixed(1)}%</div>
        </div>`;
    }).join('')}</div>`;
}


// ═══════════════════════════════════════════════════════════════════════════════
//  DATA FETCHING
// ═══════════════════════════════════════════════════════════════════════════════

async function loadChart(config) {
    showLoading(config.id);
    try {
        const res = await fetch(config.endpoint);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!data || data.length === 0) {
            showError(config.id, 'Aucune donnée disponible');
            return { section: config.section, total: 0 };
        }

        if (config.type === 'pie') {
            renderPieChart(config.id, data, config.colors);
        } else if (config.type === 'grid') {
            renderGrid(config.id, data);
        } else if (config.type === 'hbar') {
            renderHBarChart(config.id, data, config.colors);
        } else {
            renderBarChart(config.id, data, config.colors);
        }

        const total = data.reduce((s, d) => s + d.value, 0);
        return { section: config.section, total };
    } catch (err) {
        console.error(`[SMARPRDC] Error ${config.endpoint}:`, err);
        showError(config.id, 'Erreur de chargement');
        return { section: config.section, total: 0 };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COLLAPSIBLE SECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function toggleSection(sectionId) {
    const body = document.getElementById(sectionId);
    const toggle = body.previousElementSibling;
    const chevron = document.getElementById('chev-' + sectionId);

    if (body.classList.contains('collapsed')) {
        body.classList.remove('collapsed');
        toggle.classList.remove('closed');
    } else {
        body.classList.add('collapsed');
        toggle.classList.add('closed');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HERO CARD BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function heroCard(colorClass, label, value, subtitle, iconEmoji, extras) {
    let extrasHtml = '';
    if (extras && extras.length) {
        extrasHtml = '<div class="gender-split">' + extras.map(e => `<span>${e}</span>`).join('') + '</div>';
    }
    return `
        <div class="hero-card ${colorClass}">
            <div class="label">${label}</div>
            <div class="value">${value}</div>
            ${subtitle ? `<div class="sub">${subtitle}</div>` : ''}
            ${extrasHtml}
            <span class="icon">${iconEmoji}</span>
        </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  NESTED PRESENCE APPRENANTS (Class → Course → time-slot table)
// ═══════════════════════════════════════════════════════════════════════════════

async function loadNestedPresence() {
    const container = document.getElementById('nested-pres-apprenants');
    if (!container) return;
    try {
        const res = await fetch('/stats/presence/apprenants/nested');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.length) { container.innerHTML = '<div class="chart-error"><span class="chart-error-text">Aucune donnée</span></div>'; return; }
        let html = '';
        data.forEach((cl, ci) => {
            const clId = 'nested-cl-' + ci;
            const totalSlots = cl.cours.reduce((s, c) => s + c.slots.length, 0);
            const clPresent = cl.cours.reduce((s, c) => s + c.slots.reduce((ss, sl) => ss + sl.presents, 0), 0);
            const clExpected = cl.cours.reduce((s, c) => s + c.slots.reduce((ss, sl) => ss + sl.attendus, 0), 0);
            const clRate = clExpected ? ((clPresent / clExpected) * 100).toFixed(1) : 0;
            const clColor = clRate >= 75 ? '#10b981' : clRate >= 50 ? '#f59e0b' : '#ef4444';
            html += `<div class="subsection-title" onclick="toggleSection('${clId}')" style="margin-top:8px">
                <span class="sec-icon">📚</span> ${cl.classe}
                <span style="margin-left:auto;font-size:.72rem;opacity:.7">${totalSlots} séances — <strong style="color:${clColor}">${clRate}%</strong></span>
                <span class="section-chevron" id="chev-${clId}">▼</span>
            </div><div class="section-body collapsed" id="${clId}">`;
            cl.cours.forEach((co, coi) => {
                const coId = `nested-co-${ci}-${coi}`;
                const coPresent = co.slots.reduce((s, sl) => s + sl.presents, 0);
                const coExpected = co.slots.reduce((s, sl) => s + sl.attendus, 0);
                const coRate = coExpected ? ((coPresent / coExpected) * 100).toFixed(1) : 0;
                const coColor = coRate >= 75 ? '#10b981' : coRate >= 50 ? '#f59e0b' : '#ef4444';
                html += `<div class="subsection-title" onclick="toggleSection('${coId}')" style="margin-top:4px;margin-left:16px;font-size:.78rem;background:linear-gradient(135deg,#eef2ff,#e0e7ff)">
                    <span class="sec-icon">📖</span> ${co.cours}
                    <span style="margin-left:auto;font-size:.68rem;opacity:.7">${co.slots.length} séances — <strong style="color:${coColor}">${coRate}%</strong></span>
                    <span class="section-chevron" id="chev-${coId}">▼</span>
                </div><div class="section-body collapsed" id="${coId}" style="margin-left:16px">
                    <table class="pres-table"><thead><tr><th>Date</th><th>Début</th><th>Fin</th><th>Présents</th><th>Attendus</th><th>Taux</th></tr></thead><tbody>`;
                co.slots.forEach(s => {
                    const color = s.taux >= 75 ? '#10b981' : s.taux >= 50 ? '#f59e0b' : '#ef4444';
                    html += `<tr><td>${s.date}</td><td>${s.debut}</td><td>${s.fin}</td><td>${s.presents}</td><td>${s.attendus}</td><td><span style="color:${color};font-weight:700">${s.taux}%</span></td></tr>`;
                });
                html += '</tbody></table></div>';
            });
            html += '</div>';
        });
        container.innerHTML = html;
    } catch(e) {
        console.error('[SMARPRDC] Nested presence:', e);
        container.innerHTML = '<div class="chart-error"><span class="chart-error-text">Erreur de chargement</span></div>';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PERSONNEL PRESENCE (Month → Day → Individual table)
// ═══════════════════════════════════════════════════════════════════════════════

const MOIS_FR = {1:'Janvier',2:'Février',3:'Mars',4:'Avril',5:'Mai',6:'Juin',7:'Juillet',8:'Août',9:'Septembre',10:'Octobre',11:'Novembre',12:'Décembre'};

async function loadPresencePersonnel() {
    const wrap = document.getElementById('pres-personnel-wrap');
    if (!wrap) return;
    wrap.innerHTML = '<div class="chart-loading"><div class="spinner"></div><span class="chart-loading-text">Chargement…</span></div>';
    try {
        const res = await fetch('/stats/presence/personnel/summary');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.length) { wrap.innerHTML = '<div class="chart-error"><span class="chart-error-text">Aucune donnée</span></div>'; return; }
        let html = '';
        data.forEach((row, mi) => {
            const parts = row.mois.split('-');
            const label = MOIS_FR[parseInt(parts[1])] + ' ' + parts[0];
            const mId = 'pres-month-' + mi;
            html += `<div class="subsection-title" onclick="toggleSection('${mId}');loadMonthDays('${row.mois}')" style="margin-top:8px">
                <span class="sec-icon">📅</span> ${label}
                <span class="section-chevron" id="chev-${mId}">▼</span>
            </div><div class="section-body collapsed" id="${mId}">
                <div id="pers-month-${row.mois}" data-loaded="0"><div class="chart-loading"><div class="spinner"></div></div></div>
            </div>`;
        });
        wrap.innerHTML = html;
    } catch(e) {
        console.error('[SMARPRDC] Presence personnel:', e);
        wrap.innerHTML = '<div class="chart-error"><span class="chart-error-text">Erreur de chargement</span></div>';
    }
}

async function loadMonthDays(mois) {
    const container = document.getElementById('pers-month-' + mois);
    if (!container || container.dataset.loaded === '1') return;
    container.dataset.loaded = '1';
    try {
        const res = await fetch('/stats/presence/personnel/detail?mois=' + mois);
        const days = await res.json();
        let html = '';
        days.forEach((day, di) => {
            const dayId = `pers-day-${mois}-${di}`;
            const pc = day.agents.filter(a => a.present).length;
            html += `<div class="subsection-title" onclick="toggleSection('${dayId}')" style="margin-top:4px;margin-left:16px;font-size:.78rem;background:linear-gradient(135deg,#f0fdf4,#dcfce7)">
                <span class="sec-icon">📋</span> ${day.jour}
                <span style="margin-left:auto;font-size:.68rem;opacity:.7">${pc}/${day.agents.length} présents</span>
                <span class="section-chevron" id="chev-${dayId}">▼</span>
            </div><div class="section-body collapsed" id="${dayId}" style="margin-left:16px">
                <table class="pres-table"><thead><tr><th>Agent</th><th>Arrivée</th><th>Départ</th><th>Présent</th><th>H. Supp</th></tr></thead><tbody>`;
            day.agents.forEach(a => {
                const b = a.present ? '<span style="color:#10b981;font-weight:700">✓ Oui</span>' : '<span style="color:#ef4444;font-weight:700">✗ Non</span>';
                html += `<tr><td>${a.agent}</td><td>${a.arrivee}</td><td>${a.depart}</td><td>${b}</td><td>${a.heures_sup||'—'}</td></tr>`;
            });
            html += '</tbody></table></div>';
        });
        container.innerHTML = html;
    } catch(e) { container.innerHTML = '<span style="color:#ef4444">Erreur</span>'; }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD INIT
// ═══════════════════════════════════════════════════════════════════════════════

async function initDashboard() {
    apexInstances.forEach(c => { try { c.destroy(); } catch(e) {} });
    apexInstances = [];

    const results = await Promise.all(CHARTS_CONFIG.map(loadChart));
    loadPresencePersonnel();
    loadNestedPresence();

    let totalApprenants = 0, totalPersonnel = 0;
    results.forEach(r => {
        if (r.section === 'apprenants') totalApprenants = Math.max(totalApprenants, r.total);
        if (r.section === 'personnel')  totalPersonnel  = Math.max(totalPersonnel, r.total);
    });

    const totalGeneral = totalApprenants + totalPersonnel;
    const chartCount = CHARTS_CONFIG.length;
    const activeCount = results.filter(r => r.total > 0).length;

    const heroContainer = document.getElementById('hero-summary');
    if (heroContainer) {
        heroContainer.innerHTML =
            heroCard('c1', 'Apprenants Inscrits', fmt(totalApprenants), 'Année académique en cours', '🎓') +
            heroCard('c2', 'Personnel Actif',     fmt(totalPersonnel),  'Administratif en fonction', '👥') +
            heroCard('c8', 'Effectif Total',      fmt(totalGeneral),    'Apprenants + Personnel',    '📊') +
            heroCard('c5', 'Graphiques',          String(chartCount),   '+ tableaux de présences',   '📈') +
            heroCard('c3', 'Indicateurs',         activeCount+'/'+chartCount, 'Endpoints actifs',    '✅');
    }

    const loader = document.getElementById('main-loader');
    const content = document.getElementById('main-content');
    if (loader) loader.style.display = 'none';
    if (content) content.style.display = 'block';
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', initDashboard);
