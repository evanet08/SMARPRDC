/**
 * SMAPRDC — Professional Administrative Report Exports
 * EXACT COPY of reference administrative layout.
 */

// ═══════════════════════════════════════════════════════════════════════════════
//  INSTITUTION + LOGO CACHE
// ═══════════════════════════════════════════════════════════════════════════════

let _instCache = null;
const _logoCache = {};
let _siglesCache = null;

async function _getInstitution() {
    if (_instCache) return _instCache;
    try {
        const res = await fetch('/stats/institution');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        _instCache = await res.json();
    } catch (e) {
        console.warn('[exports_pro] Institution fetch failed:', e);
        _instCache = {
            nom_institution: "ECOLE NATIONALE DES FINANCES", sigle: "ENF",
            ministere: "Ministere des Finances",
            categorie: "Direction Générale de l'Ecole Nationale des Finances",
            telephone: "(+243)994034954", email: "info@enf-rdc.cd", site: "enf-rdc.cd",
            logo_url: '/static/dashboard/img/logoENF.png',
            logo_ministere_url: '/static/dashboard/img/logoMinFin.png',
            logo_pays_url: '/static/dashboard/img/logoRDC.jpg'
        };
    }
    return _instCache;
}

async function _loadImageAsBase64(url) {
    if (_logoCache[url]) return _logoCache[url];
    try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => { _logoCache[url] = reader.result; resolve(reader.result); };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (e) { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function _fmtDateFR(d) { const p = d.split('-'); return p[2] + '-' + p[1] + '-' + p[0]; }

function _buildAgentIndex(days) {
    const map = {};
    days.forEach(day => {
        day.agents.forEach(a => {
            if (!map[a.id_personnel]) {
                map[a.id_personnel] = {
                    id: a.id_personnel,
                    matricule: a.matricule || 'N.U',
                    matriculeFP: a.matriculeFP || '',
                    agent: a.agent,
                    grade_code: a.grade_code || 'N.U'
                };
            }
        });
    });
    return Object.values(map).sort((a, b) => a.agent.localeCompare(b.agent));
}

function _buildPresenceMatrix(days, agents) {
    const matrix = {};
    agents.forEach(ag => { matrix[ag.id] = {}; });
    days.forEach(day => {
        day.agents.forEach(a => {
            if (!matrix[a.id_personnel]) return;
            if (a.non_disponible) {
                // Show the sigle of the professional state (e.g. 'Cg', 'Dét', etc.)
                matrix[a.id_personnel][day.jour] = a.sigle_indisponibilite || 'N/D';
            } else {
                matrix[a.id_personnel][day.jour] = a.present ? 'P' : 'A';
            }
        });
    });
    return matrix;
}

function _buildOvertimeMap(days, agents) {
    const map = {};
    agents.forEach(ag => { map[ag.id] = 0; });
    days.forEach(day => {
        day.agents.forEach(a => {
            if (!map.hasOwnProperty(a.id_personnel)) return;
            if (a.non_disponible) return; // No overtime tracking for unavailable agents
            map[a.id_personnel] += (a.overtime_s || 0);
        });
    });
    return map;
}

function _buildRetardMap(days, agents) {
    const map = {};
    agents.forEach(ag => { map[ag.id] = 0; });
    days.forEach(day => {
        day.agents.forEach(a => {
            if (!map.hasOwnProperty(a.id_personnel)) return;
            if (a.non_disponible) return; // No retard tracking for unavailable agents
            map[a.id_personnel] += (a.retard_s || 0);
        });
    });
    return map;
}

function _fmtOTh(secs) {
    if (!secs) return '';
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
    return h + 'h' + (m < 10 ? '0' : '') + m;
}

async function _fetchSigles() {
    if (_siglesCache) return _siglesCache;
    try {
        const res = await fetch('/carriere/api/parametres');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        _siglesCache = await res.json();
    } catch (e) { _siglesCache = []; }
    // Always include Cg for congé
    if (!_siglesCache.find(s => s.sigle === 'Cg')) _siglesCache.push({ sigle: 'Cg', parametre: 'Congé' });
    return _siglesCache;
}

function _drawLegend(doc, sigles, matrix, agents, dateStrs, startY, pageW, pageH, M) {
    // Collect only sigles actually used in this report
    const used = new Set();
    agents.forEach(ag => { dateStrs.forEach(d => { const v = (matrix[ag.id] || {})[d] || ''; if (v && v !== 'P' && v !== 'A') used.add(v); }); });
    if (used.size === 0) return startY;
    const items = sigles.filter(s => used.has(s.sigle));
    if (items.length === 0) return startY;
    // Check page space
    const needed = 8 + items.length * 4;
    let y = startY;
    if (y + needed > pageH - 20) { doc.addPage(); y = 12; }
    y += 5;
    doc.setDrawColor(150); doc.setLineWidth(0.2);
    doc.line(M + 5, y, pageW / 3, y); y += 4;
    doc.setFontSize(7); doc.setFont(undefined, 'bold'); doc.setTextColor(80, 40, 160);
    doc.text('LÉGENDE DES SIGLES', M + 6, y); y += 4;
    doc.setFont(undefined, 'normal'); doc.setTextColor(0);
    doc.setFontSize(6.5);
    items.forEach(s => {
        doc.setFont(undefined, 'bold'); doc.setTextColor(120, 60, 200);
        doc.text(s.sigle, M + 8, y);
        doc.setFont(undefined, 'normal'); doc.setTextColor(60);
        doc.text(' = ' + (s.parametre || ''), M + 8 + doc.getTextWidth(s.sigle) + 1, y);
        y += 3.5;
    });
    // Also add P/A
    doc.setFont(undefined, 'bold'); doc.setTextColor(0, 100, 0);
    doc.text('P', M + 8, y); doc.setFont(undefined, 'normal'); doc.setTextColor(60);
    doc.text(' = Présent', M + 8 + doc.getTextWidth('P') + 1, y); y += 3.5;
    doc.setFont(undefined, 'bold'); doc.setTextColor(200, 0, 0);
    doc.text('A', M + 8, y); doc.setFont(undefined, 'normal'); doc.setTextColor(60);
    doc.text(' = Absent', M + 8 + doc.getTextWidth('A') + 1, y); y += 3.5;
    doc.setTextColor(0);
    return y;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PDF HEADER (fixed height = HDR_H mm)
// ═══════════════════════════════════════════════════════════════════════════════
const HDR_H = 44;

function _drawPdfHeader(doc, inst, logos, periodLabel, nbJours, pageW) {
    const cX = pageW / 2;
    if (logos.left) { try { doc.addImage(logos.left, 'PNG', 8, 4, 22, 22); } catch(e){} }
    if (logos.right) { try { doc.addImage(logos.right, 'PNG', pageW - 30, 4, 22, 22); } catch(e){} }
    doc.setFontSize(9); doc.setFont(undefined, 'bold');
    doc.text((inst.ministere || 'MINISTERE DES FINANCES').toUpperCase(), cX, 9, { align: 'center' });
    doc.setFontSize(8);
    doc.text('SECRETARIAT GENERAL', cX, 14, { align: 'center' });
    doc.text((inst.categorie || "DIRECTION GENERALE DE L'ECOLE NATIONALE DES FINANCES").toUpperCase(), cX, 19, { align: 'center' });
    doc.setFont(undefined, 'bold');
    doc.text('DIRECTION DES RESSOURCES', cX, 24, { align: 'center' });
    doc.setDrawColor(0); doc.setLineWidth(0.4);
    doc.line(6, 27, pageW - 6, 27);
    doc.setFontSize(7); doc.setFont(undefined, 'normal');
    doc.text('Type de Rapport :', cX - 2, 31, { align: 'right' });
    doc.setFont(undefined, 'bold');
    doc.text(' SYNTHESE DES PRESENCES DES AGENTS', cX - 1, 31);
    doc.text('Période : ' + periodLabel, cX, 35, { align: 'center' });
    doc.text('Nombre de jour de prestation : ' + nbJours, cX, 39, { align: 'center' });
}

function _drawPdfFooter(doc, inst, pageW, pageH) {
    const y = pageH - 4;
    doc.setFontSize(5.5); doc.setFont(undefined, 'normal'); doc.setTextColor(100);
    doc.text('LMDSoft', 6, y);
    doc.setTextColor(255, 0, 0);
    doc.text('Email : ' + (inst.email || 'info@enf-rdc.cd'), 30, y);
    doc.setTextColor(100);
    doc.text('Tél : ' + (inst.telephone || ''), pageW / 2, y, { align: 'center' });
    doc.text('Site : ' + (inst.site || 'enf-rdc.cd'), pageW - 35, y);
    doc.text('LMDSoft', pageW - 6, y, { align: 'right' });
    doc.setTextColor(0);
}

function _drawSignatures(doc, pageW, startY) {
    let y = startY + 8;
    doc.setFontSize(7); doc.setFont(undefined, 'normal');
    doc.text('Chef de Division des Ress. Humaines', pageW * 0.25, y, { align: 'center' });
    doc.text('Directeur des Ressources', pageW * 0.75, y, { align: 'center' });
    y += 10;
    doc.setFont(undefined, 'bold');
    doc.text('MUNGA SAFI RITA', pageW * 0.25, y, { align: 'center' });
    doc.text('TANDU SAVA Hippolyte', pageW * 0.75, y, { align: 'center' });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PROFESSIONAL PDF — EXACT REFERENCE LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

async function exportPresProPDF(days, label, filename) {
    if (!days || !days.length) return;
    const sigles = await _fetchSigles();
    const inst = await _getInstitution();
    const logos = {
        left: await _loadImageAsBase64(inst.logo_url || '/static/dashboard/img/logoENF.png'),
        right: await _loadImageAsBase64(inst.logo_ministere_url || '/static/dashboard/img/logoMinFin.png')
    };

    const { jsPDF } = window.jspdf;
    const agents = _buildAgentIndex(days);
    const matrix = _buildPresenceMatrix(days, agents);
    const overtimeMap = _buildOvertimeMap(days, agents);
    const retardMap = _buildRetardMap(days, agents);
    const dateStrs = days.map(d => d.jour);
    const nbJours = dateStrs.length;

    const doc = new jsPDF('l', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const firstD = _fmtDateFR(dateStrs[0]);
    const lastD = _fmtDateFR(dateStrs[dateStrs.length - 1]);
    const periodLabel = 'DU ' + firstD + ' AU ' + lastD;
    _drawPdfHeader(doc, inst, logos, periodLabel, nbJours, pageW);

    // 6 summary columns: Prés.Nbre, Prés.%, Abs.Nbre, Abs.%, RetardCum, SupCum
    const FIXED = 5;
    const SUM = 6;
    const dateColStart = FIXED;
    const dateColEnd = FIXED + nbJours;
    const sumStart = dateColEnd;

    const M = 3;
    const usable = pageW - 2 * M;
    const ID_NUM_W = 6, ID_MAT_W = 15, ID_MATFP_W = 13, ID_GRADE_W = 8;
    const fixedIdNoName = ID_NUM_W + ID_MAT_W + ID_MATFP_W + ID_GRADE_W;

    const DATE_CW_BASE = 6.5;
    const sumBaseW = [7, 7, 7, 7, 10, 10];
    const sumBaseTotal = sumBaseW.reduce((a, b) => a + b, 0);

    const NAME_MAX = nbJours <= 7 ? 55 : 65;
    const NAME_MIN = 25;
    const nameRaw = usable - fixedIdNoName - DATE_CW_BASE * nbJours - sumBaseTotal;
    const nameW = Math.min(NAME_MAX, Math.max(NAME_MIN, nameRaw));

    const remaining = usable - fixedIdNoName - nameW;
    const totalWeight = DATE_CW_BASE * nbJours + sumBaseTotal;
    const scale = remaining / totalWeight;
    const DATE_CW = Math.round(DATE_CW_BASE * scale * 10) / 10;
    const sumW = sumBaseW.map(w => Math.round(w * scale * 10) / 10);
    const fixedW = [ID_NUM_W, ID_MAT_W, nameW, ID_MATFP_W, ID_GRADE_W];

    const dateCols = dateStrs.map(d => _fmtDateFR(d));
    const fixedHead = ['#', 'Mat. ENF', 'Nom & Postnom', 'Mat. FP', 'Grade'];
    // Short labels for rotated text — group titles drawn manually in didDrawCell
    const sumLabels = ['Nbre', '%', 'Nbre', '%', 'Heures Retard Cumulées', 'Heures Sup Cumulées'];
    const fullHead = [...fixedHead, ...dateCols, ...sumLabels];

    const mkHeadSub = (lbl, val) => {
        const r = [];
        for (let i = 0; i < FIXED; i++) r.push('');
        for (let i = 0; i < nbJours; i++) r.push(val);
        for (let i = 0; i < SUM; i++) r.push('');
        r[FIXED - 1] = lbl;
        return r;
    };
    const headRows = [
        fullHead,
        mkHeadSub('Début', '8h00'),
        mkHeadSub('Fin', '16h00'),
        mkHeadSub('Durée', '08h00')
    ];

    const bodyRows = [];
    agents.forEach((ag, i) => {
        const row = [i + 1, ag.matricule, ag.agent, ag.matriculeFP, ag.grade_code];
        let pres = 0, abs = 0;
        dateStrs.forEach(d => {
            const v = (matrix[ag.id] || {})[d] || '';
            row.push(v);
            if (v === 'P') pres++;
            else if (v === 'A') abs++;
            // else: sigle (indisponible) — not counted as P or A
        });
        const tot = pres + abs;
        const presPct = tot ? ((pres / tot) * 100).toFixed(2) : '0';
        const absPct = tot ? ((abs / tot) * 100).toFixed(2) : '0';
        row.push(pres, presPct, abs, absPct, _fmtOTh(retardMap[ag.id]), _fmtOTh(overtimeMap[ag.id]));
        bodyRows.push(row);
    });

    const mkTotRow = (lbl) => { const r = ['', '', lbl, '', '']; return r; };
    const totPresRow = mkTotRow('Nbre Total des Presences');
    const pctPresRow = mkTotRow('%');
    const totAbsRow = mkTotRow('Total des Absences');
    const pctAbsRow = mkTotRow('%');
    let gP = 0, gA = 0;
    dateStrs.forEach(d => {
        let dP = 0, dA = 0;
        agents.forEach(ag => { const v = (matrix[ag.id] || {})[d] || ''; if (v === 'P') dP++; if (v === 'A') dA++; });
        const dT = dP + dA;
        totPresRow.push(dP);
        pctPresRow.push(dT ? ((dP / dT) * 100).toFixed(2) : '0');
        totAbsRow.push(dA);
        pctAbsRow.push(dT ? ((dA / dT) * 100).toFixed(2) : '0');
        gP += dP; gA += dA;
    });
    const gT = gP + gA;
    const gPR = gT ? ((gP / gT) * 100).toFixed(2) + ' %' : '0';
    const gAR = gT ? ((gA / gT) * 100).toFixed(2) + ' %' : '0';
    totPresRow.push('', '', '', '', gPR, '');
    pctPresRow.push('', '', '', '', '', '');
    totAbsRow.push('', '', '', '', '', '');
    pctAbsRow.push('', '', '', '', '', gAR);

    const allBody = [...bodyRows, totPresRow, pctPresRow, totAbsRow, pctAbsRow];

    const cs = {};
    for (let i = 0; i < FIXED; i++) cs[i] = { cellWidth: fixedW[i], halign: i === 2 ? 'left' : 'center' };
    for (let i = dateColStart; i < dateColEnd; i++) cs[i] = { cellWidth: DATE_CW, halign: 'center' };
    for (let i = 0; i < SUM; i++) cs[sumStart + i] = { cellWidth: sumW[i], halign: 'center' };

    const fs = nbJours <= 7 ? 6.5 : (nbJours <= 15 ? 5.5 : (nbJours <= 22 ? 4.5 : 4));
    const HDR_CELL_H = 32;
    const agentCount = agents.length;

    // Track first-page header cell positions for manual group titles
    let _sumCellPositions = {};

    doc.autoTable({
        startY: HDR_H,
        head: headRows,
        body: allBody,
        theme: 'grid',
        tableWidth: usable,
        styles: {
            fontSize: fs, cellPadding: 0.5, lineColor: [0, 0, 0], lineWidth: 0.15,
            textColor: [0, 0, 0], overflow: 'linebreak', valign: 'middle', halign: 'center'
        },
        headStyles: {
            fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold',
            fontSize: fs - 0.5, halign: 'center', valign: 'middle', cellPadding: 0.5
        },
        columnStyles: cs,
        didParseCell: function (data) {
            const ri = data.row.index, ci = data.column.index, val = data.cell.raw;
            if (data.row.section === 'head') {
                if (ri === 0 && ci >= dateColStart) {
                    data.cell.text = [];
                    data.cell.styles.minCellHeight = HDR_CELL_H;
                }
                if (ri === 0 && ci < dateColStart) {
                    data.cell.styles.minCellHeight = HDR_CELL_H;
                    data.cell.styles.valign = 'middle';
                    data.cell.styles.fillColor = [235, 240, 250];
                }
                // Summary header row 0: light blue bg
                if (ri === 0 && ci >= sumStart) {
                    data.cell.styles.fillColor = [230, 235, 255];
                }
                // Date header row 0: light green bg
                if (ri === 0 && ci >= dateColStart && ci < dateColEnd) {
                    data.cell.styles.fillColor = [235, 250, 240];
                }
                if (ri > 0 && (ci < FIXED - 1 || ci >= sumStart)) {
                    data.cell.text = [];
                    data.cell.styles.lineWidth = 0;
                    data.cell.styles.fillColor = [255, 255, 255];
                }
                if (ri > 0 && ci === FIXED - 1) {
                    data.cell.styles.fillColor = [245, 245, 245];
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fontSize = fs - 0.5;
                }
                if (ri > 0 && ci >= dateColStart && ci < dateColEnd) {
                    data.cell.styles.fillColor = [245, 250, 248];
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fontSize = fs - 0.5;
                }
            }
            if (data.row.section === 'body') {
                // Zebra striping
                if (ri < agentCount && ri % 2 === 1) {
                    data.cell.styles.fillColor = [250, 250, 255];
                }
                if (ri >= agentCount) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [240, 240, 245];
                }
                if (ri < agentCount && ci >= dateColStart && ci < dateColEnd) {
                    if (val === 'P') data.cell.styles.textColor = [0, 120, 0];
                    else if (val === 'A') { data.cell.styles.textColor = [200, 0, 0]; data.cell.styles.fontStyle = 'bold'; }
                    else if (val && val !== '') { data.cell.styles.textColor = [120, 60, 200]; data.cell.styles.fontStyle = 'bold'; }
                }
                if (ci === 2) data.cell.styles.halign = 'left';
            }
        },
        didDrawCell: function (data) {
            if (data.row.section !== 'head' || data.row.index !== 0) return;
            const ci = data.column.index;
            if (ci < dateColStart) return;
            const cell = data.cell;
            if (ci >= sumStart) { _sumCellPositions[ci] = { x: cell.x, y: cell.y, w: cell.width, h: cell.height }; }
            // Date columns: rotated labels, well centered
            if (ci >= dateColStart && ci < dateColEnd) {
                const lbl = dateCols[ci - dateColStart] || '';
                if (!lbl) return;
                doc.setFontSize(fs - 0.5); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 60, 30);
                const cx = cell.x + cell.width / 2 + 0.8;
                doc.text(lbl, cx, cell.y + cell.height - 2, { angle: 90, align: 'left' });
            }
            // Summary columns: all rotated for consistency
            if (ci >= sumStart) {
                const labels = ['Prés. Nbre', 'Prés. %', 'Abs. Nbre', 'Abs. %', 'H. Retard Cum.', 'H. Sup Cum.'];
                const colors = [[0,100,0],[0,100,0],[180,0,0],[180,0,0],[100,70,0],[0,60,140]];
                const idx = ci - sumStart;
                doc.setFontSize(fs - 0.5); doc.setFont(undefined, 'bold');
                doc.setTextColor(colors[idx][0], colors[idx][1], colors[idx][2]);
                const cx = cell.x + cell.width / 2 + 0.8;
                doc.text(labels[idx], cx, cell.y + cell.height - 2, { angle: 90, align: 'left' });
            }
            doc.setTextColor(0);
        },
        margin: { left: M, right: M, top: HDR_H, bottom: 22 },
        didDrawPage: function (data) {
            // Footer only — header is NOT repeated on subsequent pages
            _drawPdfFooter(doc, inst, pageW, pageH);
            // Set top margin for subsequent pages (no header)
            if (data.pageNumber === 1) data.settings.margin.top = 10;
        }
    });

    let finalY = doc.lastAutoTable.finalY || (pageH - 35);
    // Draw legend (only sigles actually used)
    finalY = _drawLegend(doc, sigles, matrix, agents, dateStrs, finalY, pageW, pageH, M);
    // Signatures
    if (finalY + 28 > pageH - 15) {
        doc.addPage();
        _drawSignatures(doc, pageW, 15);
        _drawPdfFooter(doc, inst, pageW, pageH);
        finalY = 15 + 28;
    } else {
        _drawSignatures(doc, pageW, finalY);
        finalY += 28;
    }

    // ── Timestamp (document content, above footer) ──
    if (finalY + 8 > pageH - 15) { doc.addPage(); finalY = 15; _drawPdfFooter(doc, inst, pageW, pageH); }
    const _now = new Date();
    const _dateFr = _now.toLocaleDateString('fr-FR', {day:'2-digit',month:'2-digit',year:'numeric'}).replace(/\//g, '-');
    const _timeFr = _now.toLocaleTimeString('fr-FR', {hour12:false});
    doc.setFontSize(7); doc.setFont(undefined, 'italic'); doc.setTextColor(80);
    doc.text('Générée par SMAPRDC le ' + _dateFr + ' à ' + _timeFr, pageW / 2, finalY, { align: 'center' });
    doc.setTextColor(0);

    doc.save(filename + '.pdf');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PROFESSIONAL EXCEL EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

async function exportPresProXls(days, label, filename) {
    if (!days || !days.length) return;
    const inst = await _getInstitution();
    const agents = _buildAgentIndex(days);
    const matrix = _buildPresenceMatrix(days, agents);
    const overtimeMap = _buildOvertimeMap(days, agents);
    const retardMap = _buildRetardMap(days, agents);
    const dateStrs = days.map(d => d.jour);
    const nbJours = dateStrs.length;
    const firstD = _fmtDateFR(dateStrs[0]), lastD = _fmtDateFR(dateStrs[dateStrs.length - 1]);

    const rows = [];
    rows.push([(inst.ministere || 'MINISTERE DES FINANCES').toUpperCase()]);
    rows.push(['SECRETARIAT GENERAL']);
    rows.push([(inst.categorie || "DIRECTION GENERALE DE L'ECOLE NATIONALE DES FINANCES").toUpperCase()]);
    rows.push(['DIRECTION DES RESSOURCES']);
    rows.push([]);
    rows.push(['Type de Rapport : SYNTHESE DES PRESENCES DES AGENTS']);
    rows.push(['Période : DU ' + firstD + ' AU ' + lastD]);
    rows.push(['Nombre de jour de prestation : ' + nbJours]);
    rows.push([]);

    const dateCols = dateStrs.map(d => _fmtDateFR(d));
    rows.push(['#', 'Mat. ENF', 'Nom & Postnom', 'Mat. FP', 'Grade', ...dateCols, 'Nbre Prés.', '%', 'Nbre Abs.', '%', 'Cumul Retards', 'Cumul H. Sup']);
    rows.push(['', '', '', '', 'Début', ...dateStrs.map(() => '8h00'), '', '', '', '', '', '']);
    rows.push(['', '', '', '', 'Fin', ...dateStrs.map(() => '16h00'), '', '', '', '', '', '']);
    rows.push(['', '', '', '', 'Durée', ...dateStrs.map(() => '08h00'), '', '', '', '', '', '']);

    agents.forEach((ag, i) => {
        const row = [i + 1, ag.matricule, ag.agent, ag.matriculeFP, ag.grade_code];
        let pres = 0, abs = 0;
        dateStrs.forEach(d => { const v = (matrix[ag.id] || {})[d] || ''; row.push(v); if (v === 'P') pres++; else if (v === 'A') abs++; });
        const t = pres + abs;
        row.push(pres, t ? ((pres / t) * 100).toFixed(2) : '0', abs, t ? ((abs / t) * 100).toFixed(2) : '0', _fmtOTh(retardMap[ag.id]), _fmtOTh(overtimeMap[ag.id]));
        rows.push(row);
    });

    const tPR = ['', '', 'Nbre Total Présences', '', ''], tAR = ['', '', 'Total Absences', '', ''];
    let gP = 0, gA = 0;
    dateStrs.forEach(d => {
        let dP = 0, dA = 0;
        agents.forEach(ag => { const v = (matrix[ag.id] || {})[d] || ''; if (v === 'P') dP++; if (v === 'A') dA++; });
        tPR.push(dP); tAR.push(dA); gP += dP; gA += dA;
    });
    const gT = gP + gA;
    tPR.push('', gT ? ((gP / gT) * 100).toFixed(2) + ' %' : '0', '', '', '', '');
    tAR.push('', '', '', gT ? ((gA / gT) * 100).toFixed(2) + ' %' : '0', '', '');
    rows.push(tPR); rows.push(tAR);
    rows.push([]); rows.push([]);
    rows.push(['', '', 'Chef de Division des Ress. Humaines', '', '', '', '', '', '', '', '', '', '', 'Directeur des Ressources']);
    rows.push([]);
    rows.push(['', '', 'MUNGA SAFI RITA', '', '', '', '', '', '', '', '', '', '', 'TANDU SAVA Hippolyte']);

    const wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(rows);
    const cols = [{ wch: 5 }, { wch: 14 }, { wch: 30 }, { wch: 12 }, { wch: 8 }];
    for (let i = 0; i < nbJours; i++) cols.push({ wch: 10 });
    cols.push({ wch: 8 }, { wch: 7 }, { wch: 8 }, { wch: 7 }, { wch: 12 }, { wch: 12 });
    ws['!cols'] = cols;
    XLSX.utils.book_append_sheet(wb, ws, 'Présences');
    XLSX.writeFile(wb, filename + '.xlsx');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WRAPPERS
// ═══════════════════════════════════════════════════════════════════════════════

const _MOIS_EXPORT = {1:'Janvier',2:'Fevrier',3:'Mars',4:'Avril',5:'Mai',6:'Juin',7:'Juillet',8:'Aout',9:'Septembre',10:'Octobre',11:'Novembre',12:'Decembre'};

function _resolvePresData(source, mois, wi, di) {
    const store = (source === 'carr') ? (window._carrPresData || {}) : (window._persData || {});
    const data = store[mois];
    if (!data) return null;
    if (di !== undefined) return { days: [data.weeks[wi].days[di]], label: data.weeks[wi].days[di].jour, fname: 'Presences_' + data.weeks[wi].days[di].jour, isDaily: true };
    if (wi !== undefined) return { days: data.weeks[wi].days, label: data.weeks[wi].label, fname: 'Presences_Semaine_' + data.weeks[wi].key, isDaily: false };
    const p = mois.split('-');
    return { days: data.days, label: (_MOIS_EXPORT[parseInt(p[1])] || '') + ' ' + p[0], fname: 'Presences_' + mois, isDaily: false };
}

function exportPresProPDFWrapper(source, mois, wi, di) {
    const r = _resolvePresData(source, mois, wi, di);
    if (!r) return;
    if (r.isDaily) {
        if (source === 'carr') { if (typeof exportCarrPresPDF === 'function') exportCarrPresPDF(mois, wi, di); }
        else { if (typeof exportPersPDF === 'function') exportPersPDF(mois, wi, di); }
        return;
    }
    exportPresProPDF(r.days, r.label, r.fname);
}

function exportPresProXlsWrapper(source, mois, wi, di) {
    const r = _resolvePresData(source, mois, wi, di);
    if (!r) return;
    if (r.isDaily) {
        if (source === 'carr') { if (typeof exportCarrPresXls === 'function') exportCarrPresXls(mois, wi, di); }
        else { if (typeof exportPersXls === 'function') exportPersXls(mois, wi, di); }
        return;
    }
    exportPresProXls(r.days, r.label, r.fname);
}
