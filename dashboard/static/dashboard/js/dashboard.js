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

    // Update badge
    const badge = document.querySelector(`#${containerId} .card-badge`);
    if (badge) badge.textContent = fmt(total);

    const chart = new ApexCharts(document.querySelector(`#apex-${containerId}`), {
        chart: { type: 'bar', height: Math.max(280, data.length * 28), toolbar: { show: false } },
        series: [{ data: data.map(d => d.value) }],
        colors: colors,
        plotOptions: {
            bar: {
                horizontal: false,
                borderRadius: 4,
                columnWidth: '55%',
                distributed: true
            }
        },
        xaxis: {
            categories: data.map(d => d.label),
            labels: {
                style: { fontSize: '10px', fontWeight: 600, fontFamily: 'Inter' },
                rotate: -45,
                rotateAlways: data.length > 5,
                trim: true,
                maxHeight: 100
            }
        },
        yaxis: {
            labels: {
                style: { fontSize: '11px', fontWeight: 500, fontFamily: 'Inter' }
            }
        },
        dataLabels: {
            enabled: true,
            formatter: v => fmt(v),
            style: { fontSize: '10px', fontWeight: 700, fontFamily: 'Inter' },
            offsetY: -4
        },
        legend: { show: false },
        grid: { borderColor: '#e5e7eb', yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
        tooltip: {
            y: { formatter: v => fmt(v) + ' (' + ((v / total) * 100).toFixed(1) + '%)' }
        }
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

    // Compute proportional flex-grow: min 1, scaled by percentage
    const maxVal = sorted.length ? sorted[0].value : 1;

    wrap.innerHTML = `<div class="stat-flex">${sorted.map((d, i) => {
        const pct = total ? (d.value / total * 100) : 0;
        // Min width ~80px, grow proportionally
        const grow = Math.max(1, Math.round((d.value / maxVal) * 6));
        const bg = palette[i % palette.length];
        return `<div class="stat-flex-item" style="flex-grow:${grow};background:${bg}">
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
//  DASHBOARD INIT
// ═══════════════════════════════════════════════════════════════════════════════

async function initDashboard() {
    // Destroy any previous charts
    apexInstances.forEach(c => { try { c.destroy(); } catch(e) {} });
    apexInstances = [];

    const results = await Promise.all(CHARTS_CONFIG.map(loadChart));

    // Compute section totals
    let totalApprenants = 0;
    let totalPersonnel = 0;

    results.forEach(r => {
        if (r.section === 'apprenants') totalApprenants = Math.max(totalApprenants, r.total);
        if (r.section === 'personnel')  totalPersonnel  = Math.max(totalPersonnel, r.total);
    });

    const totalGeneral = totalApprenants + totalPersonnel;

    // Render hero cards
    const heroContainer = document.getElementById('hero-summary');
    if (heroContainer) {
        heroContainer.innerHTML =
            heroCard('c1', 'Apprenants Inscrits', fmt(totalApprenants), 'Année académique en cours', '🎓') +
            heroCard('c2', 'Personnel Actif',     fmt(totalPersonnel),  'Administratif en fonction', '👥') +
            heroCard('c8', 'Effectif Total',      fmt(totalGeneral),    'Apprenants + Personnel',    '📊') +
            heroCard('c5', 'Graphiques',          '7',                  '5 apprenants · 2 personnel','📈') +
            heroCard('c3', 'Indicateurs',         results.filter(r => r.total > 0).length + '/7', 'Endpoints actifs', '✅');
    }

    // Hide loader, show content
    const loader = document.getElementById('main-loader');
    const content = document.getElementById('main-content');
    if (loader) loader.style.display = 'none';
    if (content) content.style.display = 'block';
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', initDashboard);
