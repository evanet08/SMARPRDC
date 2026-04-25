/**
 * SMARPRDC Dashboard — Chart Rendering Engine
 * Fetches data from Django API and renders Chart.js doughnut charts.
 */

// ═══════════════════════════════════════════════════════════════════════════════
//  COLOR PALETTES
// ═══════════════════════════════════════════════════════════════════════════════

const PALETTES = {
    indigo:  ['#6366f1','#818cf8','#a5b4fc','#c7d2fe','#e0e7ff','#4f46e5','#4338ca','#3730a3','#312e81','#7c3aed'],
    ocean:   ['#06b6d4','#22d3ee','#67e8f9','#0ea5e9','#38bdf8','#7dd3fc','#0284c7','#0369a1','#075985','#0c4a6e'],
    emerald: ['#10b981','#34d399','#6ee7b7','#a7f3d0','#059669','#047857','#065f46','#064e3b','#14b8a6','#2dd4bf'],
    sunset:  ['#f43f5e','#fb7185','#fda4af','#f59e0b','#fbbf24','#fcd34d','#ef4444','#dc2626','#b91c1c','#991b1b'],
    violet:  ['#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe','#7c3aed','#6d28d9','#5b21b6','#4c1d95','#a855f7','#d946ef'],
    mixed:   ['#6366f1','#06b6d4','#10b981','#f59e0b','#f43f5e','#8b5cf6','#0ea5e9','#14b8a6','#ec4899','#84cc16'],
    gender:  ['#6366f1','#f43f5e','#94a3b8'],
};

// ═══════════════════════════════════════════════════════════════════════════════
//  CHART CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHARTS_CONFIG = [
    // ── Apprenants ───────────────────────────────────────────────────────
    {
        id:       'chart-appr-genre',
        endpoint: '/stats/apprenants/genre',
        title:    'Genre',
        palette:  'gender',
        section:  'apprenants',
    },
    {
        id:       'chart-appr-promotion',
        endpoint: '/stats/apprenants/promotion',
        title:    'Promotion',
        palette:  'indigo',
        section:  'apprenants',
    },
    {
        id:       'chart-appr-province',
        endpoint: '/stats/apprenants/province',
        title:    'Province',
        palette:  'ocean',
        section:  'apprenants',
    },
    {
        id:       'chart-appr-service',
        endpoint: '/stats/apprenants/service',
        title:    'Service',
        palette:  'emerald',
        section:  'apprenants',
    },
    {
        id:       'chart-appr-grade',
        endpoint: '/stats/apprenants/grade',
        title:    'Grade',
        palette:  'violet',
        section:  'apprenants',
    },

    // ── Personnel ────────────────────────────────────────────────────────
    {
        id:       'chart-pers-genre',
        endpoint: '/stats/personnel/genre',
        title:    'Genre',
        palette:  'gender',
        section:  'personnel',
    },
    {
        id:       'chart-pers-grade',
        endpoint: '/stats/personnel/grade',
        title:    'Grade',
        palette:  'sunset',
        section:  'personnel',
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format a number with thousand separators.
 */
function formatNumber(n) {
    return new Intl.NumberFormat('fr-FR').format(n);
}

/**
 * Extend a palette to match data length by cycling colors.
 */
function getColors(paletteName, count) {
    const base = PALETTES[paletteName] || PALETTES.mixed;
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(base[i % base.length]);
    }
    return colors;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CHART RENDERING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Show loading state inside a chart wrapper.
 */
function showLoading(containerId) {
    const wrapper = document.querySelector(`#${containerId} .chart-wrapper`);
    if (!wrapper) return;
    wrapper.innerHTML = `
        <div class="chart-loading">
            <div class="spinner"></div>
            <span class="chart-loading-text">Chargement…</span>
        </div>
    `;
}

/**
 * Show error state inside a chart wrapper.
 */
function showError(containerId, message) {
    const wrapper = document.querySelector(`#${containerId} .chart-wrapper`);
    if (!wrapper) return;
    wrapper.innerHTML = `
        <div class="chart-error">
            <span class="chart-error-icon">⚠</span>
            <span class="chart-error-text">${message}</span>
        </div>
    `;
}

/**
 * Render a doughnut chart with a center total.
 */
function renderChart(containerId, data, paletteName) {
    const wrapper = document.querySelector(`#${containerId} .chart-wrapper`);
    if (!wrapper) return;

    const total = data.reduce((sum, d) => sum + d.value, 0);
    const colors = getColors(paletteName, data.length);

    // Build DOM
    wrapper.innerHTML = `
        <canvas id="canvas-${containerId}"></canvas>
        <div class="chart-center-total">
            <div class="total-number">${formatNumber(total)}</div>
            <div class="total-label">Total</div>
        </div>
    `;

    // Update badge
    const badge = document.querySelector(`#${containerId} .chart-card-badge`);
    if (badge) badge.textContent = formatNumber(total);

    const ctx = document.getElementById(`canvas-${containerId}`).getContext('2d');

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                data: data.map(d => d.value),
                backgroundColor: colors,
                borderColor: 'rgba(26, 31, 46, 0.8)',
                borderWidth: 2,
                hoverBorderColor: '#fff',
                hoverBorderWidth: 2,
                hoverOffset: 8,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: { family: 'Inter', size: 11, weight: '500' },
                        padding: 12,
                        boxWidth: 12,
                        boxHeight: 12,
                        borderRadius: 3,
                        useBorderRadius: true,
                    },
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    titleFont: { family: 'Inter', size: 13, weight: '600' },
                    bodyFont: { family: 'Inter', size: 12 },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true,
                    boxPadding: 4,
                    callbacks: {
                        label: function(ctx) {
                            const pct = ((ctx.parsed / total) * 100).toFixed(1);
                            return ` ${ctx.label}: ${formatNumber(ctx.parsed)} (${pct}%)`;
                        },
                    },
                },
            },
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1000,
                easing: 'easeOutQuart',
            },
        },
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DATA FETCHING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch stats from a single API endpoint and render.
 */
async function loadChart(config) {
    showLoading(config.id);
    try {
        const response = await fetch(config.endpoint);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (!data || data.length === 0) {
            showError(config.id, 'Aucune donnée disponible');
            return { section: config.section, total: 0 };
        }

        renderChart(config.id, data, config.palette);
        const total = data.reduce((sum, d) => sum + d.value, 0);
        return { section: config.section, total };
    } catch (err) {
        console.error(`[SMARPRDC] Error loading ${config.endpoint}:`, err);
        showError(config.id, 'Erreur de chargement');
        return { section: config.section, total: 0 };
    }
}

/**
 * Load all charts and update summary cards.
 */
async function initDashboard() {
    const results = await Promise.all(CHARTS_CONFIG.map(loadChart));

    // Compute section totals (take max per section to avoid double counting)
    let totalApprenants = 0;
    let totalPersonnel  = 0;

    results.forEach(r => {
        if (r.section === 'apprenants') totalApprenants = Math.max(totalApprenants, r.total);
        if (r.section === 'personnel') totalPersonnel  = Math.max(totalPersonnel, r.total);
    });

    // Update summary cards
    const elAppr = document.getElementById('summary-apprenants');
    const elPers = document.getElementById('summary-personnel');
    const elTot  = document.getElementById('summary-total');

    if (elAppr) { elAppr.textContent = formatNumber(totalApprenants); elAppr.classList.remove('loading'); }
    if (elPers) { elPers.textContent = formatNumber(totalPersonnel);  elPers.classList.remove('loading'); }
    if (elTot)  { elTot.textContent  = formatNumber(totalApprenants + totalPersonnel); elTot.classList.remove('loading'); }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', initDashboard);
