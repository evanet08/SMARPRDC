/**
 * SMAPRDC — Professional Administrative Report Exports
 * Generates official PDF/Excel reports matching the institutional reference layout.
 * Used for weekly and monthly presence reports.
 * Daily exports remain unchanged (handled in dashboard.js / carriere.js).
 */

// ═══════════════════════════════════════════════════════════════════════════════
//  INSTITUTION + LOGO CACHE
// ═══════════════════════════════════════════════════════════════════════════════

let _instCache = null;
const _logoCache = {}; // url → base64 data URI

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
                    id: a.id_personnel, matricule: a.matricule || 'N.U',
                    agent: a.agent, grade_code: a.grade_code || 'N.U'
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
//  PDF HEADER — Official institutional header
// ═══════════════════════════════════════════════════════════════════════════════

function _drawPdfHeader(doc, inst, logos, periodLabel, nbJours, pageW) {
    const cX = pageW / 2;

    // Left logo (DRC coat of arms / MinFin)
    if (logos.left) {
        try { doc.addImage(logos.left, 'JPEG', 10, 5, 24, 24); } catch (e) {}
    }
    // Right logo (ENF)
    if (logos.right) {
        try { doc.addImage(logos.right, 'PNG', pageW - 34, 5, 24, 24); } catch (e) {}
    }

    // Center titles
    doc.setFontSize(9); doc.setFont(undefined, 'bold');
    doc.text((inst.ministere || 'MINISTERE DES FINANCES').toUpperCase(), cX, 10, { align: 'center' });
    doc.setFontSize(8);
    doc.text('SECRETARIAT GENERAL', cX, 15, { align: 'center' });
    doc.text((inst.categorie || "DIRECTION GENERALE DE L'ECOLE NATIONALE DES FINANCES").toUpperCase(), cX, 20, { align: 'center' });
    doc.setFontSize(8);
    doc.text('DIRECTION DES RESSOURCES', cX, 25, { align: 'center' });

    // Horizontal line
    doc.setDrawColor(0); doc.setLineWidth(0.5);
    doc.line(10, 29, pageW - 10, 29);

    // Report type + period
    let y = 34;
    doc.setFontSize(7.5); doc.setFont(undefined, 'normal');
    doc.text('Type de Rapport :', cX - 2, y, { align: 'right' });
    doc.setFont(undefined, 'bold');
    doc.text(' SYNTHESE DES PRESENCES DES AGENTS', cX - 1, y);
    y += 4;
    doc.setFont(undefined, 'bold');
    doc.text('Période : ' + periodLabel, cX, y, { align: 'center' });
    y += 4;
    doc.text('Nombre de jour de prestation : ' + nbJours, cX, y, { align: 'center' });

    return y + 3;
}

function _drawPdfFooter(doc, inst, pageW, pageH) {
    const y = pageH - 5;
    doc.setFontSize(5.5); doc.setFont(undefined, 'normal'); doc.setTextColor(100);
    doc.text('LMDSoft', 10, y);
    const email = 'Email : ' + (inst.email || 'info@enf-rdc.cd');
    doc.setTextColor(255, 0, 0); doc.text(email, 45, y); doc.setTextColor(100);
    doc.text('Tél : ' + (inst.telephone || ''), pageW / 2, y, { align: 'center' });
    doc.text('Site : ' + (inst.site || 'enf-rdc.cd'), pageW - 40, y);
    doc.text('LMDSoft', pageW - 10, y, { align: 'right' });
    doc.setTextColor(0);
}

function _drawSignatures(doc, pageW, startY) {
    let y = startY + 10;
    doc.setFontSize(7.5); doc.setFont(undefined, 'normal');
    doc.text('Chef de Division des Ress. Humaines', 50, y, { align: 'center' });
    doc.text('Directeur des Ressources', pageW - 55, y, { align: 'center' });
    y += 14;
    doc.setFont(undefined, 'bold');
    doc.text('____________________________', 50, y, { align: 'center' });
    doc.text('____________________________', pageW - 55, y, { align: 'center' });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PROFESSIONAL PDF EXPORT (WEEKLY = Portrait, MONTHLY = Landscape)
// ═══════════════════════════════════════════════════════════════════════════════

async function exportPresProPDF(days, label, filename) {
    if (!days || !days.length) return;
    const inst = await _getInstitution();

    // Load logos as base64
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
    const isMonthly = nbJours > 7;

    const orient = isMonthly ? 'l' : 'p';
    const doc = new jsPDF(orient, 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const firstD = _fmtDateFR(dateStrs[0]);
    const lastD = _fmtDateFR(dateStrs[dateStrs.length - 1]);
    const periodLabel = 'DU ' + firstD + ' AU ' + lastD;

    const startY = _drawPdfHeader(doc, inst, logos, periodLabel, nbJours, pageW);

    // ── Build table ─────────────────────────────────────────────────────
    const dateCols = dateStrs.map(d => _fmtDateFR(d));
    const fixedHead = ['#', 'Mat.', 'Nom & Postnom', 'Grade'];
    const summaryHead = ['Nbre\nPrés.', '%', 'Nbre\nAbs.', '%', 'Cumul\nRetards\nen Heures'];
    const fullHead = [...fixedHead, ...dateCols, ...summaryHead];

    // Sub-header rows: Début, Fin, Durée
    const mkSubRow = (lbl, val) => ['', '', '', lbl, ...dateStrs.map(() => val), '', '', '', '', ''];
    const subRows = [mkSubRow('Début', '8h00'), mkSubRow('Fin', '16h00'), mkSubRow('Durée', '08h00')];

    // Agent rows
    const bodyRows = [];
    agents.forEach((ag, i) => {
        const row = [i + 1, ag.matricule, ag.agent, ag.grade_code];
        let pres = 0, abs = 0;
        dateStrs.forEach(d => {
            const v = (matrix[ag.id] || {})[d] || '';
            row.push(v);
            if (v === 'P') pres++;
            if (v === 'A') abs++;
        });
        const tot = pres + abs;
        row.push(pres, tot ? ((pres / tot) * 100).toFixed(2) : '0',
                 abs, tot ? ((abs / tot) * 100).toFixed(2) : '0',
                 _fmtOTh(overtimeMap[ag.id]));
        bodyRows.push(row);
    });

    // Summary rows
    const totPresRow = ['', '', 'Nbre Total des Presences', ''];
    const pctPresRow = ['', '', '', '%'];
    const totAbsRow = ['', '', 'Total des Absences', ''];
    const pctAbsRow = ['', '', '', '%'];
    let gP = 0, gA = 0;
    dateStrs.forEach(d => {
        let dP = 0, dA = 0;
        agents.forEach(ag => { const v = (matrix[ag.id] || {})[d] || ''; if (v === 'P') dP++; if (v === 'A') dA++; });
        const dT = dP + dA;
        totPresRow.push(dP); pctPresRow.push(dT ? ((dP / dT) * 100).toFixed(2) : '0');
        totAbsRow.push(dA); pctAbsRow.push(dT ? ((dA / dT) * 100).toFixed(2) : '0');
        gP += dP; gA += dA;
    });
    const gT = gP + gA;
    const gPR = gT ? ((gP / gT) * 100).toFixed(2) : '0';
    const gAR = gT ? ((gA / gT) * 100).toFixed(2) : '0';
    totPresRow.push('', '', '', '', gPR + ' %');
    pctPresRow.push('', '', '', '', '');
    totAbsRow.push('', '', '', '', '');
    pctAbsRow.push('', '', '', '', gAR + ' %');

    const allBody = [...subRows, ...bodyRows, totPresRow, pctPresRow, totAbsRow, pctAbsRow];

    // Column styles
    const colW = isMonthly ? Math.min(7, (pageW - 90) / nbJours) : Math.min(11, (pageW - 100) / nbJours);
    const cs = {};
    cs[0] = { cellWidth: 7 };
    cs[1] = { cellWidth: isMonthly ? 16 : 20 };
    cs[2] = { cellWidth: isMonthly ? 30 : 40 };
    cs[3] = { cellWidth: isMonthly ? 10 : 12 };
    for (let i = 4; i < 4 + nbJours; i++) cs[i] = { cellWidth: colW, halign: 'center' };
    const sb = 4 + nbJours;
    cs[sb] = { cellWidth: 9, halign: 'center' };
    cs[sb + 1] = { cellWidth: 8, halign: 'center' };
    cs[sb + 2] = { cellWidth: 9, halign: 'center' };
    cs[sb + 3] = { cellWidth: 8, halign: 'center' };
    cs[sb + 4] = { cellWidth: 13, halign: 'center' };

    const fs = isMonthly ? 4.5 : 5.5;

    doc.autoTable({
        startY: startY,
        head: [fullHead],
        body: allBody,
        theme: 'grid',
        styles: { fontSize: fs, cellPadding: 0.7, lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0], overflow: 'linebreak', valign: 'middle' },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: isMonthly ? 4 : 5, halign: 'center', valign: 'bottom', cellPadding: 0.8 },
        columnStyles: cs,
        didParseCell: function (data) {
            const ri = data.row.index, ci = data.column.index, val = data.cell.raw;
            if (ri < 3) { data.cell.styles.fillColor = [235, 235, 235]; data.cell.styles.fontStyle = 'bold'; data.cell.styles.fontSize = fs - 0.5; }
            if (ri >= 3 + agents.length) { data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = [245, 245, 245]; }
            if (ri >= 3 && ri < 3 + agents.length && ci >= 4 && ci < 4 + nbJours) {
                if (val === 'P') data.cell.styles.textColor = [0, 100, 0];
                if (val === 'A') { data.cell.styles.textColor = [200, 0, 0]; data.cell.styles.fontStyle = 'bold'; }
            }
        },
        margin: { left: 4, right: 4, bottom: 28 },
        didDrawPage: function (data) {
            if (data.pageNumber > 1) _drawPdfHeader(doc, inst, logos, periodLabel, nbJours, pageW);
            _drawPdfFooter(doc, inst, pageW, pageH);
        }
    });

    const finalY = doc.lastAutoTable.finalY || (pageH - 40);
    if (finalY + 30 > pageH - 10) { doc.addPage(); _drawPdfHeader(doc, inst, logos, periodLabel, nbJours, pageW); _drawSignatures(doc, pageW, 50); _drawPdfFooter(doc, inst, pageW, pageH); }
    else _drawSignatures(doc, pageW, finalY);

    doc.save(filename + '.pdf');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PROFESSIONAL EXCEL EXPORT (WEEKLY / MONTHLY)
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
    rows.push(['#', 'Matricule', 'Nom & Postnom', 'Grade', ...dateCols, 'Nbre Prés.', '%', 'Nbre Abs.', '%', 'Cumul Retards']);
    rows.push(['', '', '', 'Début', ...dateStrs.map(() => '8h00'), '', '', '', '', '']);
    rows.push(['', '', '', 'Fin', ...dateStrs.map(() => '16h00'), '', '', '', '', '']);
    rows.push(['', '', '', 'Durée', ...dateStrs.map(() => '08h00'), '', '', '', '', '']);

    agents.forEach((ag, i) => {
        const row = [i + 1, ag.matricule, ag.agent, ag.grade_code];
        let pres = 0, abs = 0;
        dateStrs.forEach(d => { const v = (matrix[ag.id] || {})[d] || ''; row.push(v); if (v === 'P') pres++; if (v === 'A') abs++; });
        const t = pres + abs;
        row.push(pres, t ? ((pres / t) * 100).toFixed(2) : '0', abs, t ? ((abs / t) * 100).toFixed(2) : '0', _fmtOTh(overtimeMap[ag.id]));
        rows.push(row);
    });

    const tPR = ['', '', 'Nbre Total Présences', ''], tAR = ['', '', 'Total Absences', ''];
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

    const wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(rows);
    const cols = [{ wch: 5 }, { wch: 14 }, { wch: 32 }, { wch: 8 }];
    for (let i = 0; i < nbJours; i++) cols.push({ wch: 10 });
    cols.push({ wch: 8 }, { wch: 7 }, { wch: 8 }, { wch: 7 }, { wch: 12 });
    ws['!cols'] = cols;
    XLSX.utils.book_append_sheet(wb, ws, 'Présences');
    XLSX.writeFile(wb, filename + '.xlsx');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WRAPPERS — Called from dashboard.js / carriere.js
//  For weekly/monthly → professional format
//  For daily → falls back to legacy simple export
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
        // Daily → legacy export (no change needed)
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
