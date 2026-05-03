/**
 * SMAPRDC Dashboard — ApexCharts Rendering Engine
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

    const badge = document.querySelector(`#${containerId} .card-badge`);
    if (badge) badge.textContent = fmt(total);

    const chart = new ApexCharts(document.querySelector(`#apex-${containerId}`), {
        chart: { type: 'pie', height: 300, toolbar: { show: false } },
        series: data.map(d => d.value),
        labels: data.map(d => d.label),
        colors: colors.slice(0, data.length),
        dataLabels: {
            enabled: true,
            formatter: (val) => val.toFixed(1) + '%',
            style: { fontSize: '13px', fontWeight: 700 },
            dropShadow: { enabled: false }
        },
        legend: {
            position: 'bottom',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'Inter',
            markers: { size: 8, shape: 'circle' },
            itemMargin: { horizontal: 8, vertical: 4 }
        },
        tooltip: {
            y: { formatter: v => fmt(v) + ' (' + ((v / total) * 100).toFixed(1) + '%)' }
        },
        stroke: { width: 2, colors: ['#ffffff'] },
        responsive: [{ breakpoint: 480, options: { legend: { position: 'bottom' } } }]
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
    const absData = data.map(d => d.value);
    let showPct = true;

    const chart = new ApexCharts(document.querySelector(`#apex-${containerId}`), {
        chart: {
            type: 'bar', height: Math.max(260, data.length * 32), toolbar: { show: false },
            events: {
                dataPointSelection: () => {
                    showPct = !showPct;
                    chart.updateSeries([{ data: showPct ? pctData : absData }]);
                    chart.updateOptions({
                        yaxis: { max: showPct ? undefined : undefined, labels: { style: { fontSize: '12px', fontWeight: 600, fontFamily: 'Inter' }, formatter: v => showPct ? v+'%' : fmt(v) } },
                        dataLabels: { formatter: v => showPct ? v+'%' : fmt(v) }
                    });
                }
            }
        },
        series: [{ data: pctData }],
        colors: colors,
        plotOptions: { bar: { horizontal: false, borderRadius: 4, columnWidth: '65%', distributed: true } },
        xaxis: {
            categories: data.map(d => d.label),
            labels: { style: { fontSize: '11px', fontWeight: 600, fontFamily: 'Inter' }, rotate: -45, rotateAlways: data.length > 5, trim: true, maxHeight: 100 }
        },
        yaxis: { labels: { style: { fontSize: '12px', fontWeight: 600, fontFamily: 'Inter' }, formatter: v => v + '%' } },
        dataLabels: { enabled: true, formatter: v => v + '%', style: { fontSize: '12px', fontWeight: 700, fontFamily: 'Inter' }, offsetY: -4 },
        legend: { show: false },
        grid: { borderColor: '#e5e7eb', padding: { top: -10, bottom: 0, left: 4, right: 4 } },
        tooltip: { y: { formatter: (v, { dataPointIndex: i }) => showPct ? v+'% ('+fmt(data[i].value)+')' : fmt(v)+' ('+pctData[i]+'%)' } }
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
        console.error(`[SMAPRDC] Error ${config.endpoint}:`, err);
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

let _apprData = null; // stored for exports

function expBtns(onPdf, onXls) {
    return `<span class="export-btns-inline" onclick="event.stopPropagation()">
        <button class="export-btn export-pdf" onclick="${onPdf}" style="padding:2px 8px;font-size:.62rem">PDF</button>
        <button class="export-btn export-excel" onclick="${onXls}" style="padding:2px 8px;font-size:.62rem">Excel</button>
    </span>`;
}

async function loadNestedPresence() {
    const container = document.getElementById('nested-pres-apprenants');
    if (!container) return;
    try {
        const res = await fetch('/stats/presence/apprenants/nested');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        _apprData = data;
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
                <span style="margin-left:auto;display:flex;align-items:center;gap:8px">
                    <span style="font-size:.72rem;opacity:.7">${totalSlots} séances — <strong style="color:${clColor}">${clRate}%</strong></span>
                    ${expBtns(`exportApprPDF(${ci})`, `exportApprXls(${ci})`)}
                    <span class="section-chevron" id="chev-${clId}">▼</span>
                </span>
            </div><div class="section-body collapsed" id="${clId}">`;

            cl.cours.forEach((co, coi) => {
                const coId = `nested-co-${ci}-${coi}`;
                const coPresent = co.slots.reduce((s, sl) => s + sl.presents, 0);
                const coExpected = co.slots.reduce((s, sl) => s + sl.attendus, 0);
                const coRate = coExpected ? ((coPresent / coExpected) * 100).toFixed(1) : 0;
                const coColor = coRate >= 75 ? '#10b981' : coRate >= 50 ? '#f59e0b' : '#ef4444';
                html += `<div class="subsection-title" onclick="toggleSection('${coId}')" style="margin-top:4px;margin-left:16px;font-size:.78rem;background:linear-gradient(135deg,#eef2ff,#e0e7ff)">
                    <span class="sec-icon">📖</span> ${co.cours}
                    <span style="margin-left:auto;display:flex;align-items:center;gap:8px">
                        <span style="font-size:.68rem;opacity:.7">${co.slots.length} séances — <strong style="color:${coColor}">${coRate}%</strong></span>
                        ${expBtns(`exportApprPDF(${ci},${coi})`, `exportApprXls(${ci},${coi})`)}
                        <span class="section-chevron" id="chev-${coId}">▼</span>
                    </span>
                </div><div class="section-body collapsed" id="${coId}" style="margin-left:16px">
                    <table class="pres-table"><thead><tr><th>Date</th><th>Début</th><th>Fin</th><th>Présents</th><th>Absents</th><th>Attendus</th><th>Taux</th><th></th></tr></thead><tbody>`;
                co.slots.forEach((s, si) => {
                    const absent = s.attendus - s.presents;
                    const color = s.taux >= 75 ? '#10b981' : s.taux >= 50 ? '#f59e0b' : '#ef4444';
                    html += `<tr><td>${s.date}</td><td>${s.debut}</td><td>${s.fin}</td><td style="color:#10b981;font-weight:600">${s.presents}</td><td style="color:#ef4444;font-weight:600">${absent}</td><td>${s.attendus}</td><td><span style="color:${color};font-weight:700">${s.taux}%</span></td>
                        <td style="white-space:nowrap;text-align:right">${expBtns(`exportApprPDF(${ci},${coi},${si})`, `exportApprXls(${ci},${coi},${si})`)}</td></tr>`;
                });
                html += '</tbody></table></div>';
            });
            html += '</div>';
        });
        container.innerHTML = html;
    } catch(e) {
        console.error('[SMAPRDC] Nested presence:', e);
        container.innerHTML = '<div class="chart-error"><span class="chart-error-text">Erreur de chargement</span></div>';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PERSONNEL PRESENCE (Month → Day → Individual table)
// ═══════════════════════════════════════════════════════════════════════════════

const MOIS_FR = {1:'Janvier',2:'Février',3:'Mars',4:'Avril',5:'Mai',6:'Juin',7:'Juillet',8:'Août',9:'Septembre',10:'Octobre',11:'Novembre',12:'Décembre'};

function fmtOT(secs) {
    if (!secs) return '—';
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
    return `${h}h${m < 10 ? '0' : ''}${m}`;
}

function rateBadge(taux) {
    const c = taux >= 75 ? '#10b981' : taux >= 50 ? '#f59e0b' : '#ef4444';
    return `<strong style="color:${c}">${taux}%</strong>`;
}

var _persData = {}; // month -> { days, weeks } stored for exports (var: accessible from exports_pro.js via window)

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
            html += `<div class="subsection-title" onclick="toggleSection('${mId}');loadMonthWeeks('${row.mois}')" style="margin-top:8px">
                <span class="sec-icon">📅</span> ${label}
                <span style="margin-left:auto;display:flex;align-items:center;gap:8px">
                    <span id="month-stats-${row.mois}" style="font-size:.75rem"></span>
                    ${expBtns(`exportPresProPDFWrapper('dash','${row.mois}')`, `exportPresProXlsWrapper('dash','${row.mois}')`)}
                    <span class="section-chevron" id="chev-${mId}">▼</span>
                </span>
            </div><div class="section-body collapsed" id="${mId}">
                <div id="pers-month-${row.mois}" data-loaded="0"><div class="chart-loading"><div class="spinner"></div></div></div>
            </div>`;
        });
        wrap.innerHTML = html;
    } catch(e) {
        console.error('[SMAPRDC] Presence personnel:', e);
        wrap.innerHTML = '<div class="chart-error"><span class="chart-error-text">Erreur de chargement</span></div>';
    }
}

function getWeekRange(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay() || 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - day + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const pad = n => n < 10 ? '0' + n : n;
    const f = dt => pad(dt.getDate()) + '-' + pad(dt.getMonth() + 1) + '-' + dt.getFullYear();
    return { key: monday.toISOString().slice(0, 10), label: `Semaine du ${f(monday)} au ${f(sunday)}` };
}

async function loadMonthWeeks(mois) {
    const container = document.getElementById('pers-month-' + mois);
    if (!container || container.dataset.loaded === '1') return;
    container.dataset.loaded = '1';
    try {
        const res = await fetch('/stats/presence/personnel/detail?mois=' + mois);
        const raw = await res.json();
        const days = raw.days;

        const weeks = {};
        days.forEach(day => {
            const w = getWeekRange(day.jour);
            if (!weeks[w.key]) weeks[w.key] = { label: w.label, key: w.key, days: [], presents: 0, attendus: 0 };
            weeks[w.key].days.push(day);
            weeks[w.key].presents += day.presents;
            weeks[w.key].attendus += day.attendus;
        });

        const sortedWeeks = Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0]));
        _persData[mois] = { days, weeks: sortedWeeks.map(([k, w]) => w) };

        let mP = 0, mAtt = 0;
        Object.values(weeks).forEach(w => { mP += w.presents; mAtt += w.attendus; });
        const mRate = mAtt ? ((mP / mAtt) * 100).toFixed(1) : 0;
        const monthStats = document.getElementById('month-stats-' + mois);
        if (monthStats) monthStats.innerHTML = '— ' + rateBadge(mRate);

        let html = '';
        sortedWeeks.forEach(([wKey, w], wi) => {
            const wId = `pers-w-${mois}-${wi}`;
            const wRate = w.attendus ? ((w.presents / w.attendus) * 100).toFixed(1) : 0;
            html += `<div class="subsection-title" onclick="toggleSection('${wId}')" style="margin-top:6px;margin-left:12px;font-size:.78rem;background:linear-gradient(135deg,#eff6ff,#dbeafe)">
                <span class="sec-icon">📆</span> ${w.label}
                <span style="margin-left:auto;display:flex;align-items:center;gap:8px">
                    <span style="font-size:.75rem">— ${rateBadge(wRate)}</span>
                    ${expBtns(`exportPresProPDFWrapper('dash','${mois}',${wi})`, `exportPresProXlsWrapper('dash','${mois}',${wi})`)}
                    <span class="section-chevron" id="chev-${wId}">▼</span>
                </span>
            </div><div class="section-body collapsed" id="${wId}">`;

            w.days.forEach((day, di) => {
                const dayId = `pers-d-${mois}-${wi}-${di}`;
                const justCount = day.justifies || 0;
                const indispCount = day.indisponibles || 0;
                html += `<div class="subsection-title" onclick="toggleSection('${dayId}')" style="margin-top:3px;margin-left:28px;font-size:.74rem;background:linear-gradient(135deg,#f0fdf4,#dcfce7)">
                    <span class="sec-icon">📋</span> ${day.jour}
                    <span style="margin-left:auto;display:flex;align-items:center;gap:8px">
                        <span style="font-size:.72rem">✅ ${day.presents}/${day.attendus} · ❌ ${day.absents}${justCount > 0 ? ' (📝' + justCount + ' just.)' : ''}${indispCount > 0 ? ' · 🚫 ' + indispCount + ' N/D' : ''} — ${rateBadge(day.taux)}</span>
                        ${expBtns(`exportPersPDF('${mois}',${wi},${di})`, `exportPersXls('${mois}',${wi},${di})`)}
                        <span class="section-chevron" id="chev-${dayId}">▼</span>
                    </span>
                </div><div class="section-body collapsed" id="${dayId}" style="margin-left:28px">
                    <table class="pres-table"><thead><tr><th>Agent</th><th>Mat. ENF</th><th>Mat. FP</th><th>Grade</th><th>Genre</th><th>Embauche</th><th>Arrivée</th><th>Départ</th><th>Présent</th><th>Justifié</th><th>H. Supp</th></tr></thead><tbody>`;
                day.agents.forEach(a => {
                    // Non-disponible personnel: show with distinct marker
                    if (a.non_disponible) {
                        html += `<tr style="opacity:.5;background:#f8fafc"><td>${a.agent}</td><td style="font-size:.72rem">${a.matricule||'—'}</td><td style="font-size:.72rem">${a.matriculeFP||'—'}</td><td style="font-size:.72rem">${a.grade_code||'—'}</td><td>${a.genre||'—'}</td><td style="font-size:.72rem">${a.recrutement_date||'—'}</td><td colspan="3" style="text-align:center;font-weight:600;color:#8b5cf6">🚫 ${a.motif_indisponibilite || 'Non disponible'}</td><td>—</td><td>—</td></tr>`;
                        return;
                    }
                    const b = a.present ? '<span style="color:#10b981;font-weight:700">✓ Oui</span>' : '<span style="color:#ef4444;font-weight:700">✗ Non</span>';
                    let justCol = '—';
                    if (!a.present) {
                        if (a.justifie) {
                            const safeMotif = (a.motif||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');
                            justCol = '<span style="color:#3b82f6;font-weight:700;cursor:pointer" title="' + (a.motif||'').replace(/"/g,'&quot;') + '" onclick="event.stopPropagation();openJustModal(' + a.id_personnel + ',\'' + day.jour + '\',true,\'' + safeMotif + '\')">✓ Oui</span>';
                        } else {
                            justCol = '<span style="color:#f59e0b;font-weight:700;cursor:pointer" onclick="event.stopPropagation();openJustModal(' + a.id_personnel + ',\'' + day.jour + '\',false,\'\')">✗ Non</span>';
                        }
                    }
                    html += `<tr><td>${a.agent}</td><td style="font-size:.72rem">${a.matricule||'—'}</td><td style="font-size:.72rem">${a.matriculeFP||'—'}</td><td style="font-size:.72rem">${a.grade_code||'—'}</td><td>${a.genre||'—'}</td><td style="font-size:.72rem">${a.recrutement_date||'—'}</td><td>${a.arrivee}</td><td>${a.depart}</td><td>${b}</td><td>${justCol}</td><td>${a.heures_sup || '—'}</td></tr>`;
                });
                html += '</tbody></table></div>';
            });
            html += '</div>';
        });
        container.innerHTML = html;
    } catch(e) {
        console.error('[SMAPRDC] Month detail:', e);
        container.innerHTML = '<span style="color:#ef4444">Erreur de chargement</span>';
    }
}

// ── Justification Modal (inline in dashboard) ───────────────────────────────

function _getCsrf() { const c = document.cookie.match(/csrftoken=([^;]+)/); return c ? c[1] : ''; }

function openJustModal(idP, dateAbs, isJust, motif) {
    let existing = document.getElementById('just-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'just-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:16px;width:420px;max-width:95vw;box-shadow:0 24px 48px rgba(0,0,0,.2);overflow:hidden;">
            <div style="padding:16px 20px;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;font-weight:700;font-size:.88rem;display:flex;align-items:center;gap:8px">
                <span>📝</span> Justificatif d'absence
                <button onclick="document.getElementById('just-modal-overlay').remove()" style="margin-left:auto;background:none;border:none;color:#fff;font-size:1.2rem;cursor:pointer">✕</button>
            </div>
            <div style="padding:20px">
                <div style="margin-bottom:12px;font-size:.78rem;color:#64748b">Agent ID: <strong>${idP}</strong> — Date: <strong>${dateAbs}</strong></div>
                <div style="margin-bottom:14px">
                    <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:6px">Statut</label>
                    <select id="just-statut" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:.82rem">
                        <option value="0" ${!isJust?'selected':''}>Non justifié</option>
                        <option value="1" ${isJust?'selected':''}>Justifié</option>
                    </select>
                </div>
                <div id="just-motif-wrap" style="${isJust?'':'display:none'}">
                    <label style="font-size:.78rem;font-weight:600;display:block;margin-bottom:6px">Motif</label>
                    <textarea id="just-motif" rows="3" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:.82rem;resize:vertical">${motif||''}</textarea>
                </div>
            </div>
            <div style="padding:12px 20px;display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #e2e8f0">
                <button onclick="document.getElementById('just-modal-overlay').remove()" style="padding:8px 16px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;font-size:.78rem">Annuler</button>
                <button onclick="saveJustification(${idP},'${dateAbs}')" style="padding:8px 16px;border:none;border-radius:8px;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;cursor:pointer;font-weight:700;font-size:.78rem">💾 Enregistrer</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    document.getElementById('just-statut').addEventListener('change', function() {
        document.getElementById('just-motif-wrap').style.display = this.value === '1' ? '' : 'none';
    });
}

async function saveJustification(idP, dateAbs) {
    const justifie = document.getElementById('just-statut').value === '1';
    const motif = document.getElementById('just-motif')?.value || '';
    try {
        const res = await fetch('/stats/presence/justificatif/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': _getCsrf() },
            body: JSON.stringify({ id_personnel: idP, date_absence: dateAbs, justifie, motif })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('just-modal-overlay')?.remove();
            const mois = dateAbs.substring(0, 7);
            const cont = document.getElementById('pers-month-' + mois);
            if (cont) { cont.dataset.loaded = '0'; loadMonthWeeks(mois); }
        }
    } catch(e) { console.error('[SMAPRDC] Justification save:', e); }
}

// ── Cumuls Heures Supplémentaires (independent summary) ─────────────────────

let _cumulLoaded = false;
async function loadPersonnelCumuls() {
    if (_cumulLoaded) return;
    _cumulLoaded = true;
    const container = document.getElementById('pres-personnel-cumuls');
    if (!container) return;
    try {
        const sumRes = await fetch('/stats/presence/personnel/summary');
        const months = await sumRes.json();
        if (!months.length) { container.innerHTML = '<div class="chart-error"><span class="chart-error-text">Aucune donnée</span></div>'; return; }

        // Fetch all months in parallel
        const allData = await Promise.all(months.map(m =>
            fetch('/stats/presence/personnel/detail?mois=' + m.mois).then(r => r.json())
        ));

        // Aggregate per agent across ALL months (respecting per-date availability)
        const agentMap = {};
        let totalExpected = 0, totalPresent = 0, totalDays = 0;
        allData.forEach(raw => {
            raw.days.forEach(day => {
                totalDays++;
                totalPresent += day.presents;
                totalExpected += day.attendus;
                day.agents.forEach(a => {
                    if (!agentMap[a.agent]) agentMap[a.agent] = { present: 0, absent: 0, expected: 0, overtime_s: 0, indisponible: 0,
                        matricule: a.matricule, matriculeFP: a.matriculeFP, grade_code: a.grade_code, genre: a.genre, recrutement_date: a.recrutement_date };
                    // Skip non-disponible personnel from presence/absence counts
                    if (a.non_disponible) {
                        agentMap[a.agent].indisponible++;
                        return;
                    }
                    agentMap[a.agent].expected += 1;
                    if (a.present) agentMap[a.agent].present++;
                    else agentMap[a.agent].absent++;
                    agentMap[a.agent].overtime_s += (a.overtime_s || 0);
                });
            });
        });

        // Sort by overtime desc
        const sorted = Object.entries(agentMap).sort((a, b) => a[0].localeCompare(b[0]));

        let html = `<div style="padding:8px 0;font-size:.72rem;opacity:.7">Période: ${months.length} mois — ${totalDays} jours travaillés — Taux global: ${rateBadge(totalExpected ? ((totalPresent/totalExpected)*100).toFixed(1) : 0)}</div>`;
        html += '<table class="pres-table"><thead><tr><th>Agent</th><th>Mat. ENF</th><th>Mat. FP</th><th>Grade</th><th>Genre</th><th>Embauche</th><th>Présences</th><th>Absences</th><th>Total attendu</th><th>H. Supp cumulées</th></tr></thead><tbody>';
        sorted.forEach(([name, ag]) => {
            html += `<tr>
                <td>${name}</td>
                <td style="font-size:.72rem">${ag.matricule||'—'}</td>
                <td style="font-size:.72rem">${ag.matriculeFP||'—'}</td>
                <td style="font-size:.72rem">${ag.grade_code||'—'}</td>
                <td>${ag.genre||'—'}</td>
                <td style="font-size:.72rem">${ag.recrutement_date||'—'}</td>
                <td style="font-weight:600;color:#10b981">${ag.present} jour${ag.present > 1 ? 's' : ''}</td>
                <td style="font-weight:600;color:#ef4444">${ag.absent} jour${ag.absent > 1 ? 's' : ''}</td>
                <td>${ag.expected} jour${ag.expected > 1 ? 's' : ''}</td>
                <td style="font-weight:700">${fmtOT(ag.overtime_s)}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch(e) {
        console.error('[SMAPRDC] Cumuls:', e);
        container.innerHTML = '<span style="color:#ef4444">Erreur de chargement</span>';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const panel = document.getElementById(tabId);
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('active');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CONTEXTUAL EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function _apprRows(ci, coi, si) {
    if (!_apprData) return [];
    const classes = ci !== undefined ? [_apprData[ci]] : _apprData;
    const rows = [];
    classes.forEach(cl => {
        const courses = (coi !== undefined) ? [cl.cours[coi]] : cl.cours;
        courses.forEach(co => {
            const slots = (si !== undefined) ? [co.slots[si]] : co.slots;
            slots.forEach(s => { rows.push([cl.classe, co.cours, s.date, s.debut, s.fin, s.presents, s.attendus - s.presents, s.attendus, s.taux + '%']); });
        });
    });
    return rows;
}

function _persRows(mois, wi, di) {
    const data = _persData[mois];
    if (!data) return [];
    let days;
    if (di !== undefined) days = [data.weeks[wi].days[di]];
    else if (wi !== undefined) days = data.weeks[wi].days;
    else days = data.days;
    const rows = [];
    days.forEach(day => {
        day.agents.forEach(a => {
            // Skip non-disponible personnel (congé, état non-EnFx)
            if (a.non_disponible) return;
            let justLabel = '—';
            if (!a.present) justLabel = a.justifie ? 'Oui' : 'Non';
            rows.push([a.agent, a.matricule||'—', a.matriculeFP||'—', a.grade_code||'—', a.genre||'—', a.recrutement_date||'—', day.jour, a.arrivee || '—', a.depart || '—', a.present ? 'Oui' : 'Non', justLabel, a.motif || '', a.heures_sup || '']);
        });
    });
    return rows;
}

function _pdfDoc(title) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const now = new Date().toLocaleDateString('fr-FR');
    doc.setFontSize(14); doc.text('SMAPRDC — ' + title, 14, 15);
    doc.setFontSize(8); doc.text('Généré le ' + now, 14, 21);
    return { doc, now };
}

// ── Apprenants contextual ───────────────────────────────────────────────
function exportApprPDF(ci, coi, si) {
    const rows = _apprRows(ci, coi, si);
    if (!rows.length) return;
    let label;
    if (si !== undefined) { const s = _apprData[ci].cours[coi].slots[si]; label = _apprData[ci].cours[coi].cours + ' — ' + s.date + ' ' + s.debut; }
    else if (coi !== undefined) label = _apprData[ci].cours[coi].cours;
    else if (ci !== undefined) label = _apprData[ci].classe;
    else label = 'Toutes classes';
    const { doc, now } = _pdfDoc('Présences Apprenants — ' + label);
    doc.autoTable({ startY: 25, head: [['Classe','Cours','Date','Début','Fin','Présents','Absents','Attendus','Taux']], body: rows, styles: { fontSize: 7, cellPadding: 1.5 }, headStyles: { fillColor: [99,102,241] } });
    doc.save('Apprenants_' + label.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf');
}
function exportApprXls(ci, coi, si) {
    const rows = _apprRows(ci, coi, si);
    if (!rows.length) return;
    let label;
    if (si !== undefined) { const s = _apprData[ci].cours[coi].slots[si]; label = _apprData[ci].cours[coi].cours + ' — ' + s.date + ' ' + s.debut; }
    else if (coi !== undefined) label = _apprData[ci].cours[coi].cours;
    else if (ci !== undefined) label = _apprData[ci].classe;
    else label = 'Toutes classes';
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['Classe','Cours','Date','Début','Fin','Présents','Absents','Attendus','Taux (%)'], ...rows]);
    ws['!cols'] = [{wch:25},{wch:30},{wch:12},{wch:8},{wch:8},{wch:8},{wch:8},{wch:8},{wch:8}];
    XLSX.utils.book_append_sheet(wb, ws, 'Apprenants');
    XLSX.writeFile(wb, 'Apprenants_' + label.replace(/[^a-zA-Z0-9]/g, '_') + '.xlsx');
}

// ── Personnel contextual ────────────────────────────────────────────────
function exportPersPDF(mois, wi, di) {
    const rows = _persRows(mois, wi, di);
    if (!rows.length) return;
    let label = mois;
    if (di !== undefined) label = _persData[mois].weeks[wi].days[di].jour;
    else if (wi !== undefined) label = _persData[mois].weeks[wi].label;
    const { doc } = _pdfDoc('Présences Personnel — ' + label);
    doc.autoTable({ startY: 25, head: [['Agent','Mat.ENF','Mat.FP','Grade','Genre','Embauche','Date','Arrivée','Départ','Présence','Justifié','Motif','H.Supp']], body: rows, styles: { fontSize: 6, cellPadding: 1.2 }, headStyles: { fillColor: [16,185,129] } });
    doc.save('Personnel_' + label.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf');
}
function exportPersXls(mois, wi, di) {
    const rows = _persRows(mois, wi, di);
    if (!rows.length) return;
    let label = mois;
    if (di !== undefined) label = _persData[mois].weeks[wi].days[di].jour;
    else if (wi !== undefined) label = _persData[mois].weeks[wi].label;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['Agent','Mat.ENF','Mat.FP','Grade','Genre','Embauche','Date','Arrivée','Départ','Présence','Justifié','Motif','H.Supp'], ...rows]);
    ws['!cols'] = [{wch:30},{wch:12},{wch:12},{wch:10},{wch:6},{wch:12},{wch:12},{wch:10},{wch:10},{wch:10},{wch:10},{wch:25},{wch:12}];
    XLSX.utils.book_append_sheet(wb, ws, 'Personnel');
    XLSX.writeFile(wb, 'Personnel_' + label.replace(/[^a-zA-Z0-9]/g, '_') + '.xlsx');
}

// ── Cumuls export ───────────────────────────────────────────────────────
function exportCumulsPDF() {
    const tbl = document.querySelector('#pres-personnel-cumuls table');
    if (!tbl) return;
    const { doc } = _pdfDoc('Cumuls Heures Supplémentaires');
    doc.autoTable({ html: tbl, startY: 25, styles: { fontSize: 7, cellPadding: 1.5 }, headStyles: { fillColor: [245,158,11] } });
    doc.save('Cumuls_Heures_Supp.pdf');
}
function exportCumulsXls() {
    const tbl = document.querySelector('#pres-personnel-cumuls table');
    if (!tbl) return;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(tbl);
    ws['!cols'] = [{wch:35},{wch:12},{wch:12},{wch:14},{wch:16}];
    XLSX.utils.book_append_sheet(wb, ws, 'Cumuls');
    XLSX.writeFile(wb, 'Cumuls_Heures_Supp.xlsx');
}

// ── Global export (all sections) ────────────────────────────────────────
async function exportGlobalPDF() {
    const apprRows = _apprRows();
    const { doc, now } = _pdfDoc('Rapport Complet de Présences');
    if (apprRows.length) {
        doc.autoTable({ startY: 25, head: [['Classe','Cours','Date','Début','Fin','Présents','Absents','Attendus','Taux']], body: apprRows, styles: { fontSize: 7, cellPadding: 1.5 }, headStyles: { fillColor: [99,102,241] } });
    }
    // Personnel from all loaded months
    const allPersRows = [];
    Object.keys(_persData).forEach(m => { allPersRows.push(..._persRows(m)); });
    if (allPersRows.length) {
        doc.addPage();
        doc.setFontSize(12); doc.text('Présences Personnel', 14, 15);
        doc.autoTable({ startY: 20, head: [['Agent','Mat.ENF','Mat.FP','Grade','Genre','Embauche','Date','Arrivée','Départ','Présence','Justifié','Motif','H.Supp']], body: allPersRows, styles: { fontSize: 6, cellPadding: 1.2 }, headStyles: { fillColor: [16,185,129] } });
    }
    // Cumuls
    const tbl = document.querySelector('#pres-personnel-cumuls table');
    if (tbl) {
        doc.addPage();
        doc.setFontSize(12); doc.text('Cumuls Heures Supplémentaires', 14, 15);
        doc.autoTable({ html: tbl, startY: 20, styles: { fontSize: 7, cellPadding: 1.5 }, headStyles: { fillColor: [245,158,11] } });
    }
    doc.save('SMAPRDC_Presences_' + now.replace(/\//g, '-') + '.pdf');
}

async function exportGlobalExcel() {
    const wb = XLSX.utils.book_new();
    const apprRows = _apprRows();
    if (apprRows.length) {
        const ws = XLSX.utils.aoa_to_sheet([['Classe','Cours','Date','Début','Fin','Présents','Absents','Attendus','Taux (%)'], ...apprRows]);
        ws['!cols'] = [{wch:25},{wch:30},{wch:12},{wch:8},{wch:8},{wch:8},{wch:8},{wch:8},{wch:8}];
        XLSX.utils.book_append_sheet(wb, ws, 'Apprenants');
    }
    const allPersRows = [];
    Object.keys(_persData).forEach(m => { allPersRows.push(..._persRows(m)); });
    if (allPersRows.length) {
        const ws = XLSX.utils.aoa_to_sheet([['Agent','Mat.ENF','Mat.FP','Grade','Genre','Embauche','Date','Arrivée','Départ','Présence','Justifié','Motif','H.Supp'], ...allPersRows]);
        ws['!cols'] = [{wch:30},{wch:12},{wch:12},{wch:10},{wch:6},{wch:12},{wch:12},{wch:10},{wch:10},{wch:10},{wch:10},{wch:25},{wch:12}];
        XLSX.utils.book_append_sheet(wb, ws, 'Personnel');
    }
    const tbl = document.querySelector('#pres-personnel-cumuls table');
    if (tbl) {
        const ws = XLSX.utils.table_to_sheet(tbl);
        ws['!cols'] = [{wch:35},{wch:12},{wch:12},{wch:14},{wch:16}];
        XLSX.utils.book_append_sheet(wb, ws, 'Cumuls');
    }
    const now = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    XLSX.writeFile(wb, 'SMAPRDC_Presences_' + now + '.xlsx');
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

    // Fetch gender breakdowns for hero cards
    let apprGender = {F: 0, M: 0}, persGender = {F: 0, M: 0};
    try {
        const [apprG, persG] = await Promise.all([
            fetch('/stats/apprenants/genre').then(r => r.json()),
            fetch('/stats/personnel/genre').then(r => r.json())
        ]);
        apprG.forEach(g => { const k = (g.label || '').toUpperCase().trim(); if (k === 'F') apprGender.F = g.value; else if (k === 'M') apprGender.M = g.value; });
        persG.forEach(g => { const k = (g.label || '').toUpperCase().trim(); if (k === 'F') persGender.F = g.value; else if (k === 'M') persGender.M = g.value; });
    } catch(e) { console.warn('Gender fetch:', e); }

    const heroContainer = document.getElementById('hero-summary');
    if (heroContainer) {
        heroContainer.innerHTML =
            heroCard('c1', 'Apprenants Inscrits', fmt(totalApprenants), 'Année académique en cours', '🎓',
                [`F: ${fmt(apprGender.F)}`, `M: ${fmt(apprGender.M)}`]) +
            heroCard('c2', 'Personnel Actif', fmt(totalPersonnel), 'Administratif en fonction', '👥',
                [`F: ${fmt(persGender.F)}`, `M: ${fmt(persGender.M)}`]) +
            heroCard('c8', 'Effectif Total', fmt(totalGeneral), 'Apprenants + Personnel', '📊',
                [`F: ${fmt(apprGender.F + persGender.F)}`, `M: ${fmt(apprGender.M + persGender.M)}`]);
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

