/**
 * SMAPRDC — Professional Administrative Report Exports
 * EXACT COPY of reference administrative layout.
 */

// ═══════════════════════════════════════════════════════════════════════════════
//  INSTITUTION + LOGO CACHE
// ═══════════════════════════════════════════════════════════════════════════════

let _instCache = null;
const _logoCache = {};

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
            if (a.non_disponible) return;
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
            if (a.non_disponible || !matrix[a.id_personnel]) return;
            matrix[a.id_personnel][day.jour] = a.present ? 'P' : 'A';
        });
    });
    return matrix;
}

function _buildOvertimeMap(days, agents) {
    const map = {};
    agents.forEach(ag => { map[ag.id] = 0; });
    days.forEach(day => {
        day.agents.forEach(a => {
            if (a.non_disponible || !map.hasOwnProperty(a.id_personnel)) return;
            map[a.id_personnel] += (a.overtime_s || 0);
        });
    });
    return map;
}

function _fmtOTh(secs) {
    if (!secs) return '';
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
    return h + 'h' + (m < 10 ? '0' : '') + m;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PDF HEADER (fixed height = HDR_H mm)
// ═══════════════════════════════════════════════════════════════════════════════
const HDR_H = 46;

function _drawPdfHeader(doc, inst, logos, periodLabel, nbJours, pageW) {
    const cX = pageW / 2;
    if (logos.left) { try { doc.addImage(logos.left, 'JPEG', 8, 4, 22, 22); } catch(e){} }
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
    const inst = await _getInstitution();
    const logos = {
        left: await _loadImageAsBase64(inst.logo_pays_url || '/static/dashboard/img/logoRDC.jpg'),
        right: await _loadImageAsBase64(inst.logo_url || '/static/dashboard/img/logoENF.png')
    };

    const { jsPDF } = window.jspdf;
    const agents = _buildAgentIndex(days);
    const matrix = _buildPresenceMatrix(days, agents);
    const overtimeMap = _buildOvertimeMap(days, agents);
    const dateStrs = days.map(d => d.jour);
    const nbJours = dateStrs.length;

    // ALWAYS landscape A4
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const firstD = _fmtDateFR(dateStrs[0]);
    const lastD = _fmtDateFR(dateStrs[dateStrs.length - 1]);
    const periodLabel = 'DU ' + firstD + ' AU ' + lastD;

    // Draw header on first page
    _drawPdfHeader(doc, inst, logos, periodLabel, nbJours, pageW);

    // ── Reference columns: #, Mat.ENF, Nom&Postnom, Mat.FP, Grade, [dates...], NbrePrés, %, NbreAbs, %, CumulRetards
    const FIXED = 5;  // fixed columns count
    const SUM = 5;    // summary columns count
    const dateColStart = FIXED;
    const dateColEnd = FIXED + nbJours;
    const sumStart = dateColEnd;
    const totalCols = FIXED + nbJours + SUM;

    // Column widths: dates & stats get FIXED narrow width, identification columns absorb rest
    const M = 3; // side margin
    const usable = pageW - 2 * M;
    const DATE_CW = 7;  // each date column: fixed 7mm
    const sumW = [8, 7, 8, 7, 11]; // NbrePrés, %, NbreAbs, %, Cumul (fixed narrow)
    const sumTotal = sumW.reduce((a, b) => a + b, 0);
    const dateTotalW = DATE_CW * nbJours;
    const idRemain = usable - dateTotalW - sumTotal; // space for identification cols
    // Distribute identification space: #(6), Mat.ENF(15), Nom(flex), Mat.FP(13), Grade(8)
    const fixMinW = 6 + 15 + 13 + 8; // 42mm for #,Mat,MatFP,Grade
    const nameW = Math.max(25, idRemain - fixMinW);
    const fixedW = [6, 15, nameW, 13, 8];

    // Column header labels
    const dateCols = dateStrs.map(d => _fmtDateFR(d));
    const fixedHead = ['#', 'Mat. ENF', 'Nom & Postnom', 'Mat. FP', 'Grade'];
    const summaryHead = ['Nbre de Prése-\nnces cumulées', 'Nbre d\'Abse-\nnces cumulées', '%', 'Cumul des Retards\nen Heures', ''];
    // Actually from reference: Nbre de Présences cumulées | Nbre | % | Nbre d'Absences cumulées | Cumul des Retards en Heures
    // Let me match exactly: the 5 summary cols from data are: NbrePrés, %, NbreAbs, %, CumulRetards
    const sumLabels = [
        'Nbre de Prése-\nnces cumulées',
        '%',
        "Nbre d'Abse-\nnces cumulées",
        '%',
        'Cumul des Retards\nen Heures'
    ];
    const fullHead = [...fixedHead, ...dateCols, ...sumLabels];

    // Sub-header rows (Début/Fin/Durée) — first 3 body rows
    const mkSub = (lbl, val) => {
        const r = ['', '', '', '', lbl];
        for (let i = 0; i < nbJours; i++) r.push(val);
        for (let i = 0; i < SUM; i++) r.push('');
        return r;
    };
    const subRows = [mkSub('Début', '8h00'), mkSub('Fin', '16h00'), mkSub('Durée', '08h00')];

    // Agent data rows
    const bodyRows = [];
    agents.forEach((ag, i) => {
        const row = [i + 1, ag.matricule, ag.agent, ag.matriculeFP, ag.grade_code];
        let pres = 0, abs = 0;
        dateStrs.forEach(d => {
            const v = (matrix[ag.id] || {})[d] || '';
            row.push(v);
            if (v === 'P') pres++;
            if (v === 'A') abs++;
        });
        const tot = pres + abs;
        const presPct = tot ? ((pres / tot) * 100).toFixed(2) : '0';
        const absPct = tot ? ((abs / tot) * 100).toFixed(2) : '0';
        row.push(pres, presPct, abs, absPct, _fmtOTh(overtimeMap[ag.id]));
        bodyRows.push(row);
    });

    // Summary rows
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
    // Fill summary cols for total rows
    totPresRow.push('', '', '', '', gPR);
    pctPresRow.push('', '', '', '', '');
    totAbsRow.push('', '', '', '', '');
    pctAbsRow.push('', '', '', '', gAR);

    const allBody = [...subRows, ...bodyRows, totPresRow, pctPresRow, totAbsRow, pctAbsRow];

    // Column styles — FULL WIDTH
    const cs = {};
    for (let i = 0; i < FIXED; i++) cs[i] = { cellWidth: fixedW[i], halign: i === 2 ? 'left' : 'center' };
    for (let i = dateColStart; i < dateColEnd; i++) cs[i] = { cellWidth: DATE_CW, halign: 'center' };
    for (let i = 0; i < SUM; i++) cs[sumStart + i] = { cellWidth: sumW[i], halign: 'center' };

    const fs = nbJours > 20 ? 4 : (nbJours > 10 ? 4.5 : 5.5);

    doc.autoTable({
        startY: HDR_H,
        head: [fullHead],
        body: allBody,
        theme: 'grid',
        tableWidth: usable,
        styles: {
            fontSize: fs, cellPadding: 0.5, lineColor: [0, 0, 0], lineWidth: 0.15,
            textColor: [0, 0, 0], overflow: 'linebreak', valign: 'middle', halign: 'center'
        },
        headStyles: {
            fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold',
            fontSize: fs - 0.5, halign: 'center', valign: 'bottom',
            cellPadding: 0.5, minCellHeight: 20
        },
        columnStyles: cs,
        // Suppress text for rotated columns in header; style body rows
        didParseCell: function (data) {
            const ri = data.row.index, ci = data.column.index, val = data.cell.raw;
            // Header: suppress date + summary text (drawn rotated in didDrawCell)
            if (data.row.section === 'head' && ci >= dateColStart) {
                data.cell.text = [];
            }
            // Sub-header rows (Début/Fin/Durée) — grey bg
            if (data.row.section === 'body' && ri < 3) {
                data.cell.styles.fillColor = [240, 240, 240];
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = fs - 0.5;
            }
            // Summary rows at bottom
            if (data.row.section === 'body' && ri >= 3 + agents.length) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [245, 245, 245];
            }
            // P/A coloring
            if (data.row.section === 'body' && ri >= 3 && ri < 3 + agents.length) {
                if (ci >= dateColStart && ci < dateColEnd) {
                    if (val === 'P') data.cell.styles.textColor = [0, 100, 0];
                    if (val === 'A') { data.cell.styles.textColor = [200, 0, 0]; data.cell.styles.fontStyle = 'bold'; }
                }
                // Agent name LEFT
                if (ci === 2) data.cell.styles.halign = 'left';
            }
        },
        // Draw rotated text for date + summary header cells
        didDrawCell: function (data) {
            if (data.row.section !== 'head') return;
            const ci = data.column.index;
            if (ci < dateColStart) return;
            const cell = data.cell;
            const label = fullHead[ci] || '';
            if (!label) return;
            doc.setFontSize(fs - 0.5);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 0, 0);
            const cx = cell.x + cell.width / 2 + 0.5;
            const cy = cell.y + cell.height - 1;
            doc.text(label.replace(/\n/g, ' '), cx, cy, { angle: 90, align: 'left' });
        },
        // Fixed top margin = header height on ALL pages
        margin: { left: M, right: M, top: HDR_H, bottom: 22 },
        didDrawPage: function (data) {
            if (data.pageNumber > 1) _drawPdfHeader(doc, inst, logos, periodLabel, nbJours, pageW);
            _drawPdfFooter(doc, inst, pageW, pageH);
        }
    });

    // Signatures on last page
    const finalY = doc.lastAutoTable.finalY || (pageH - 35);
    if (finalY + 25 > pageH - 15) {
        doc.addPage();
        _drawPdfHeader(doc, inst, logos, periodLabel, nbJours, pageW);
        _drawSignatures(doc, pageW, HDR_H + 5);
        _drawPdfFooter(doc, inst, pageW, pageH);
    } else {
        _drawSignatures(doc, pageW, finalY);
    }

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
    rows.push(['#', 'Mat. ENF', 'Nom & Postnom', 'Mat. FP', 'Grade', ...dateCols, 'Nbre Prés.', '%', 'Nbre Abs.', '%', 'Cumul Retards']);
    rows.push(['', '', '', '', 'Début', ...dateStrs.map(() => '8h00'), '', '', '', '', '']);
    rows.push(['', '', '', '', 'Fin', ...dateStrs.map(() => '16h00'), '', '', '', '', '']);
    rows.push(['', '', '', '', 'Durée', ...dateStrs.map(() => '08h00'), '', '', '', '', '']);

    agents.forEach((ag, i) => {
        const row = [i + 1, ag.matricule, ag.agent, ag.matriculeFP, ag.grade_code];
        let pres = 0, abs = 0;
        dateStrs.forEach(d => { const v = (matrix[ag.id] || {})[d] || ''; row.push(v); if (v === 'P') pres++; if (v === 'A') abs++; });
        const t = pres + abs;
        row.push(pres, t ? ((pres / t) * 100).toFixed(2) : '0', abs, t ? ((abs / t) * 100).toFixed(2) : '0', _fmtOTh(overtimeMap[ag.id]));
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
    tPR.push('', gT ? ((gP / gT) * 100).toFixed(2) + ' %' : '0', '', '', '');
    tAR.push('', '', '', gT ? ((gA / gT) * 100).toFixed(2) + ' %' : '0', '');
    rows.push(tPR); rows.push(tAR);
    rows.push([]); rows.push([]);
    rows.push(['', '', 'Chef de Division des Ress. Humaines', '', '', '', '', '', '', '', '', '', 'Directeur des Ressources']);
    rows.push([]);
    rows.push(['', '', 'MUNGA SAFI RITA', '', '', '', '', '', '', '', '', '', 'TANDU SAVA Hippolyte']);

    const wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(rows);
    const cols = [{ wch: 5 }, { wch: 14 }, { wch: 30 }, { wch: 12 }, { wch: 8 }];
    for (let i = 0; i < nbJours; i++) cols.push({ wch: 10 });
    cols.push({ wch: 8 }, { wch: 7 }, { wch: 8 }, { wch: 7 }, { wch: 12 });
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
