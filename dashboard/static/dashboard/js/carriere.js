/**
 * SMAPRDC Carrière — Career Management Engine
 * Tabs: Vue Globale, États Professionnels, Congés
 */

const API = '/carriere/api';
let _personnel = [], _etats = [], _parametres = [], _conges = [], _congeTypes = [], _anneeId = 5;

const fmt = n => (n || 0).toLocaleString('fr-FR');
const D = v => v || '—';

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
    document.getElementById(tabId)?.classList.add('active');
    btn?.classList.add('active');
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function getCsrf() { const c = document.cookie.match(/csrftoken=([^;]+)/); return c ? c[1] : ''; }
async function apiPost(url, data) {
    return (await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrf() },
        body: JSON.stringify(data)
    })).json();
}

// ═══ LABEL: "En fonction" → "Disponible" ═════════════════════════════════════
function displayEtat(parametre) { return parametre === 'En fonction' ? 'Disponible' : parametre; }

// ═══ STATUS BADGE ════════════════════════════════════════════════════════════
const SIGLE_CLASS = { 'EnFx':'st-enfx','EnDT':'st-endt','F0RM':'st-form','EnCA':'st-enca','EnCC':'st-encc','EnCM':'st-encm','DSRT':'st-dsrt','MSIO':'st-msio','RTRT':'st-rtrt' };
function statusBadge(p, s) { return `<span class="status-badge ${SIGLE_CLASS[s]||'st-default'}">${displayEtat(p)||'Non défini'}</span>`; }

// ═══ BUSINESS DAYS ═══════════════════════════════════════════════════════════
function calcBD(s, e) {
    let c = 0; const d = new Date(s), end = new Date(e);
    while (d <= end) { const w = d.getDay(); if (w !== 0 && w !== 6) c++; d.setDate(d.getDate() + 1); }
    return c;
}
// Get effective jours: use stored jours_ouvrables if > 0, else calculate
function effJours(c) { return (c.jours_ouvrables && c.jours_ouvrables > 0) ? c.jours_ouvrables : calcBD(c.startdate, c.enddate); }

// ═══ DATA LOADING ════════════════════════════════════════════════════════════
async function loadAll() {
    try {
        const [pRes,eRes,prRes,cRes,ctRes] = await Promise.all([
            fetch(API+'/personnel').then(r=>r.json()), fetch(API+'/etats').then(r=>r.json()),
            fetch(API+'/parametres').then(r=>r.json()), fetch(API+'/conges').then(r=>r.json()),
            fetch(API+'/conge-types').then(r=>r.json()),
        ]);
        _personnel=pRes; _etats=eRes; _parametres=prRes; _conges=cRes; _congeTypes=ctRes;
        renderHero(); renderGlobal(); renderEtats(); renderConges(); populateDropdowns();
        document.getElementById('main-loader').style.display='none';
        document.getElementById('main-content').style.display='block';
    } catch(e) {
        console.error('[Carrière]',e);
        document.getElementById('main-loader').innerHTML='<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">Erreur de chargement</div></div>';
    }
}

// ═══ HERO ═════════════════════════════════════════════════════════════════════
function heroCard(cls,label,value,sub,icon) {
    return `<div class="hero-card ${cls}"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div><span class="icon">${icon}</span></div>`;
}
function renderHero() {
    const total=_personnel.length, etatMap={};
    _etats.forEach(e=>{etatMap[e.id_personnel]=e;});
    let enFx=0,enConge=0,other=0;
    _personnel.forEach(p=>{const e=etatMap[p.id_personnel];if(!e||e.sigle==='EnFx')enFx++;else if(['EnCA','EnCC','EnCM'].includes(e.sigle))enConge++;else other++;});
    document.getElementById('hero-summary').innerHTML=
        heroCard('c1','Personnel Total',fmt(total),'Administratif en fonction','👥')+
        heroCard('c7','Disponible',fmt(enFx),`${total?((enFx/total)*100).toFixed(1):0}%`,'✅')+
        heroCard('c3','En Congé',fmt(enConge),`${total?((enConge/total)*100).toFixed(1):0}%`,'🏖️')+
        heroCard('c5','Autres États',fmt(other),'Détachement, Mission, etc.','📋')+
        heroCard('c6','Congés Enregistrés',fmt(_conges.length),'Année en cours','📅');
}

// ═══ TAB 1: VUE GLOBALE ══════════════════════════════════════════════════════
function renderGlobal() {
    const etatMap={}; _etats.forEach(e=>{etatMap[e.id_personnel]=e;});
    const sel=document.getElementById('filter-etat-global');
    sel.innerHTML='<option value="">Tous les états</option>';
    _parametres.forEach(p=>{sel.innerHTML+=`<option value="${p.id_parametre}">${displayEtat(p.parametre)}</option>`;});

    let html='';
    _personnel.forEach((p,i)=>{
        const e=etatMap[p.id_personnel];
        html+=`<tr data-name="${(p.agent||'').toLowerCase()}" data-etat="${e?e.id_parametre:1}">
            <td style="font-weight:600;color:var(--text-muted);font-size:.72rem">${i+1}</td>
            <td style="font-weight:600">${p.agent}</td>
            <td style="font-size:.76rem">${D(p.matricule)}</td>
            <td style="font-size:.76rem">${D(p.matriculeFP)}</td>
            <td style="font-size:.76rem">${D(p.grade_code)}</td>
            <td>${D(p.genre)}</td>
            <td style="font-size:.72rem;color:var(--text-secondary)">${D(p.recrutement_date)}</td>
            <td>${statusBadge(e?e.parametre:'En fonction',e?e.sigle:'EnFx')}</td>
        </tr>`;
    });
    document.getElementById('tbody-global').innerHTML=html;
    document.getElementById('count-global').textContent=_personnel.length+' agents';
}
function filterGlobal() {
    const q=document.getElementById('search-global').value.toLowerCase();
    const etat=document.getElementById('filter-etat-global').value;
    let vis=0;
    document.querySelectorAll('#tbody-global tr').forEach(r=>{
        const ok=(!q||r.dataset.name.includes(q))&&(!etat||r.dataset.etat===etat);
        r.style.display=ok?'':'none'; if(ok)vis++;
    });
    document.getElementById('count-global').textContent=vis+' agents';
}

// ═══ TAB 2: ÉTATS PROFESSIONNELS ═════════════════════════════════════════════
function renderEtats() {
    const tbody=document.getElementById('tbody-etats'); let html='';
    const sorted=[..._etats].sort((a,b)=>(a.agent||'').localeCompare(b.agent||''));
    if(!sorted.length){html='<tr><td colspan="10" class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">Aucun état affecté</div></td></tr>';}
    else sorted.forEach((e,i)=>{
        html+=`<tr data-name="${(e.agent||'').toLowerCase()}">
            <td style="font-weight:600;color:var(--text-muted);font-size:.72rem">${i+1}</td>
            <td style="font-weight:600">${e.agent}</td>
            <td style="font-size:.76rem">${D(e.matricule)}</td>
            <td style="font-size:.76rem">${D(e.matriculeFP)}</td>
            <td style="font-size:.76rem">${D(e.grade_code)}</td>
            <td>${D(e.genre)}</td>
            <td style="font-size:.72rem;color:var(--text-secondary)">${D(e.recrutement_date)}</td>
            <td>${statusBadge(e.parametre,e.sigle)}</td>
            <td style="font-size:.76rem;font-weight:600;color:var(--text-muted)">${e.sigle}</td>
            <td><button class="btn btn-sm btn-outline" onclick="openEtatModalEdit(${e.id_personnel},${e.id_parametre})">✏️</button></td>
        </tr>`;
    });
    tbody.innerHTML=html;
    document.getElementById('count-etats').textContent=_etats.length+' affectations';
}
function filterEtats() {
    const q=document.getElementById('search-etats').value.toLowerCase();
    document.querySelectorAll('#tbody-etats tr').forEach(r=>{r.style.display=!q||(r.dataset.name&&r.dataset.name.includes(q))?'':'none';});
}
function openEtatModal(){document.getElementById('etat-personnel').value='';document.getElementById('etat-parametre').value='';openModal('modal-etat');}
function openEtatModalEdit(idP,idPr){document.getElementById('etat-personnel').value=idP;document.getElementById('etat-parametre').value=idPr;openModal('modal-etat');}
async function saveEtat(){
    const idP=document.getElementById('etat-personnel').value,idPr=document.getElementById('etat-parametre').value;
    if(!idP||!idPr){toast('⚠️ Champs requis','error');return;}
    try{const r=await apiPost(API+'/etats/save',{id_personnel:+idP,id_parametre:+idPr});if(r.success){toast('✅ État mis à jour','success');closeModal('modal-etat');await loadAll();}else toast('❌ '+r.error,'error');}catch(e){toast('❌ Erreur réseau','error');}
}

// ═══ TAB 3: CONGÉS (ACCORDION + TABLE) ═══════════════════════════════════════
function renderConges() {
    const container=document.getElementById('conges-accordion');
    const sel=document.getElementById('filter-conge-type');
    sel.innerHTML='<option value="">Tous les types</option>';
    _congeTypes.forEach(ct=>{sel.innerHTML+=`<option value="${ct.id_congetype}">${ct.congename}</option>`;});

    const byP={};
    _conges.forEach(c=>{if(!byP[c.id_personnel])byP[c.id_personnel]={agent:c.agent,matricule:c.matricule,matriculeFP:c.matriculeFP,grade_code:c.grade_code,genre:c.genre,recrutement_date:c.recrutement_date,conges:[]};byP[c.id_personnel].conges.push(c);});
    _personnel.forEach(p=>{if(!byP[p.id_personnel])byP[p.id_personnel]={agent:p.agent,matricule:p.matricule,matriculeFP:p.matriculeFP,grade_code:p.grade_code,genre:p.genre,recrutement_date:p.recrutement_date,conges:[]};});

    const sorted=Object.entries(byP).sort((a,b)=>a[1].agent.localeCompare(b[1].agent));
    let html='';
    sorted.forEach(([idP,data])=>{
        const totalJ=data.conges.reduce((s,c)=>s+effJours(c),0);
        const nb=data.conges.length, accId='acc-'+idP;

        html+=`<div class="accordion-item" data-name="${data.agent.toLowerCase()}" data-types="${data.conges.map(c=>c.id_congetype).join(',')}">
            <div class="accordion-header" onclick="toggleAccordion('${accId}')">
                <span class="agent-name">${data.agent}</span>
                <div class="agent-meta">
                    <span style="font-size:.68rem;color:var(--text-muted)">${D(data.matricule)} · ${D(data.grade_code)} · ${D(data.genre)}</span>
                    ${nb>0?`<span class="status-badge st-enca">${nb} congé${nb>1?'s':''} · ${totalJ}j.</span>`:'<span class="status-badge st-enfx">Aucun</span>'}
                    <span class="accordion-chevron" id="chev-${accId}">▼</span>
                </div>
            </div>
            <div class="accordion-body" id="${accId}">`;

        if(!nb){html+='<div class="empty-state"><div class="empty-state-text">Aucun congé</div></div>';}
        else{
            const cum={};
            data.conges.forEach(c=>{if(!cum[c.id_congetype])cum[c.id_congetype]={name:c.congename||'?',total:0,pre:c.nbrePredefini,max:c.totalJoursType};cum[c.id_congetype].total+=effJours(c);});

            html+='<div class="cumul-summary">';
            Object.values(cum).forEach(ct=>{
                const pct=ct.pre&&ct.max?((ct.total/ct.max)*100).toFixed(0):null;
                const col=pct!==null?(pct>90?'#ef4444':pct>70?'#f59e0b':'#10b981'):'#6366f1';
                html+=`<div class="cumul-chip"><span class="dot" style="background:${col}"></span>${ct.name}: <strong>${ct.total}j.</strong>${ct.pre?` <span style="font-size:.64rem;opacity:.7">/ ${ct.max}j.</span>`:'<span style="font-size:.64rem;opacity:.7"> ∞</span>'}</div>`;
            });
            html+='</div>';

            html+=`<table class="data-table" style="margin-top:8px"><thead><tr>
                <th>Type</th><th>Date début</th><th>Date fin</th><th>Jours ouvrables</th><th>Cumul type</th><th>Restant</th><th>Plafond</th><th>Utilisation</th>
            </tr></thead><tbody>`;
            data.conges.forEach(c=>{
                const j=effJours(c);
                const cumT=cum[c.id_congetype]?cum[c.id_congetype].total:j;
                const plaf=c.nbrePredefini?c.totalJoursType:null;
                const reste=plaf!==null?Math.max(0,plaf-cumT):null;
                const pct=plaf?Math.min(100,(cumT/plaf)*100):null;
                const barCls=pct!==null?(pct>90?'red':pct>70?'amber':'green'):'green';
                html+=`<tr>
                    <td style="font-weight:600">${c.congename||'?'}</td>
                    <td>${c.startdate}</td><td>${c.enddate}</td>
                    <td style="font-weight:700;color:var(--accent-amber)">${j}</td>
                    <td style="font-weight:600;color:var(--accent-indigo)">${cumT}</td>
                    <td style="font-weight:600;color:${reste!==null?(reste<=5?'var(--accent-red)':'var(--accent-emerald)'):'var(--text-muted)'}">${reste!==null?reste:'∞'}</td>
                    <td>${plaf!==null?plaf:'∞'}</td>
                    <td style="min-width:100px">${pct!==null?`<div class="progress-bar"><div class="progress-fill ${barCls}" style="width:${pct}%"></div></div><span style="font-size:.64rem;font-weight:600">${pct.toFixed(0)}%</span>`:'—'}</td>
                </tr>`;
            });
            html+='</tbody></table>';
        }
        html+='</div></div>';
    });
    container.innerHTML=html;
}

function toggleAccordion(id){
    const b=document.getElementById(id),ch=document.getElementById('chev-'+id);
    b.classList.toggle('open'); ch?.classList.toggle('open');
}
function filterConges(){
    const q=document.getElementById('search-conges').value.toLowerCase(),tid=document.getElementById('filter-conge-type').value;
    document.querySelectorAll('#conges-accordion .accordion-item').forEach(it=>{
        const ok=(!q||it.dataset.name.includes(q))&&(!tid||(it.dataset.types||'').split(',').includes(tid));
        it.style.display=ok?'':'none';
    });
}

// ═══ DROPDOWNS ════════════════════════════════════════════════════════════════
function populateDropdowns(){
    const opts='<option value="">— Sélectionner —</option>'+_personnel.map(p=>`<option value="${p.id_personnel}">${p.agent}</option>`).join('');
    document.getElementById('etat-personnel').innerHTML=opts;
    document.getElementById('conge-personnel').innerHTML=opts;
    document.getElementById('etat-parametre').innerHTML='<option value="">— Sélectionner —</option>'+_parametres.map(p=>`<option value="${p.id_parametre}">${displayEtat(p.parametre)} (${p.sigle})</option>`).join('');
    document.getElementById('conge-type').innerHTML='<option value="">— Sélectionner —</option>'+_congeTypes.map(ct=>`<option value="${ct.id_congetype}" data-predefini="${ct.nbrePredefini}" data-total="${ct.totalJours||0}">${ct.congename}</option>`).join('');
}

// ═══ CONGÉ MODAL ═════════════════════════════════════════════════════════════
function openCongeModal(){
    ['conge-personnel','conge-type','conge-start','conge-end'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('conge-jours').value='';
    document.getElementById('conge-plafond-info').style.display='none';
    openModal('modal-conge');
}

function autoCalcJours() {
    const start = document.getElementById('conge-start').value;
    const end = document.getElementById('conge-end').value;
    if (start && end && new Date(start) <= new Date(end)) {
        document.getElementById('conge-jours').value = calcBD(start, end);
    }
}

function onCongeTypeChange(){
    const sel=document.getElementById('conge-type'),opt=sel.options[sel.selectedIndex],info=document.getElementById('conge-plafond-info');
    if(opt&&opt.dataset.predefini==='1'){info.style.display='block';document.getElementById('conge-cumul-preview').innerHTML=`<div class="cumul-chip"><span class="dot" style="background:#f59e0b"></span>Plafond: <strong>${parseInt(opt.dataset.total)||0} j.</strong></div>`;}
    else info.style.display='none';
}

async function saveConge(){
    const idP=document.getElementById('conge-personnel').value;
    const idCT=document.getElementById('conge-type').value;
    const start=document.getElementById('conge-start').value;
    const end=document.getElementById('conge-end').value;
    const joursInput=parseInt(document.getElementById('conge-jours').value)||0;

    if(!idP||!idCT||!start||!end||joursInput<1){toast('⚠️ Champs requis (y compris jours > 0)','error');return;}
    if(new Date(start)>new Date(end)){toast('⚠️ Dates invalides','error');return;}

    // Check plafond using user-provided jours
    const sel=document.getElementById('conge-type'),opt=sel.options[sel.selectedIndex];
    if(opt&&opt.dataset.predefini==='1'){
        const plaf=parseInt(opt.dataset.total)||0;
        const cum=_conges.filter(c=>c.id_personnel===+idP&&c.id_congetype===+idCT).reduce((s,c)=>s+effJours(c),0);
        if(cum+joursInput>plaf){toast(`⚠️ Plafond dépassé: ${cum}+${joursInput}=${cum+joursInput} > ${plaf}j`,'error');return;}
    }

    try{
        const r=await apiPost(API+'/conges/save',{id_personnel:+idP,id_congetype:+idCT,startdate:start,enddate:end,jours_ouvrables:joursInput,id_annee:_anneeId});
        if(r.success){toast('✅ Congé enregistré','success');closeModal('modal-conge');await loadAll();}
        else toast('❌ '+r.error,'error');
    }catch(e){toast('❌ Erreur réseau','error');}
}

// ═══ EXPORT PDF / EXCEL ══════════════════════════════════════════════════════
function _pdfDoc(title){
    const {jsPDF}=window.jspdf,doc=new jsPDF('l','mm','a4');
    doc.setFontSize(14);doc.text('SMAPRDC — '+title,14,15);
    doc.setFontSize(8);doc.text('Généré le '+new Date().toLocaleDateString('fr-FR'),14,21);
    return doc;
}
const HDR_GLOBAL=['#','Nom','Mat. ENF','Mat. FP','Grade','Genre','Embauche','État'];
const HDR_ETATS=['#','Agent','Mat. ENF','Mat. FP','Grade','Genre','Embauche','État','Sigle'];
const HDR_CONGES=['Agent','Mat. ENF','Grade','Type','Début','Fin','Jours','Cumul','Restant','Plafond'];

function _globalRows(){
    const eMap={};_etats.forEach(e=>{eMap[e.id_personnel]=e;});
    return _personnel.map((p,i)=>{const e=eMap[p.id_personnel];return[i+1,p.agent,D(p.matricule),D(p.matriculeFP),D(p.grade_code),D(p.genre),D(p.recrutement_date),displayEtat(e?e.parametre:'En fonction')];});
}
function _etatsRows(){return _etats.map((e,i)=>[i+1,e.agent,D(e.matricule),D(e.matriculeFP),D(e.grade_code),D(e.genre),D(e.recrutement_date),displayEtat(e.parametre),e.sigle]);}
function _congesRows(){
    const cum={};
    _conges.forEach(c=>{const k=c.id_personnel+'_'+c.id_congetype;if(!cum[k])cum[k]=0;cum[k]+=effJours(c);});
    return _conges.map(c=>{
        const j=effJours(c),k=c.id_personnel+'_'+c.id_congetype,cumT=cum[k]||j;
        const plaf=c.nbrePredefini?c.totalJoursType:null,reste=plaf!==null?Math.max(0,plaf-cumT):null;
        return[c.agent,D(c.matricule),D(c.grade_code),c.congename||'?',c.startdate,c.enddate,j,cumT,reste!==null?reste:'∞',plaf!==null?plaf:'∞'];
    });
}

function exportPDF(section){
    const doc=_pdfDoc({global:'Vue Globale du Personnel',etats:'États Professionnels',conges:'Congés du Personnel'}[section]);
    const hdr={global:HDR_GLOBAL,etats:HDR_ETATS,conges:HDR_CONGES}[section];
    const rows={global:_globalRows,etats:_etatsRows,conges:_congesRows}[section]();
    doc.autoTable({startY:25,head:[hdr],body:rows,styles:{fontSize:7,cellPadding:1.5},headStyles:{fillColor:[99,102,241]}});
    doc.save('SMAPRDC_'+section+'_'+new Date().toISOString().slice(0,10)+'.pdf');
}
function exportExcel(section){
    const hdr={global:HDR_GLOBAL,etats:HDR_ETATS,conges:HDR_CONGES}[section];
    const rows={global:_globalRows,etats:_etatsRows,conges:_congesRows}[section]();
    const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet([hdr,...rows]);
    XLSX.utils.book_append_sheet(wb,ws,section);
    XLSX.writeFile(wb,'SMAPRDC_'+section+'_'+new Date().toISOString().slice(0,10)+'.xlsx');
}

// ═══ TAB 4: STATISTIQUES (ApexCharts) ════════════════════════════════════════
let _statsLoaded = false;
let _statsCharts = [];

async function loadCarriereStats() {
    if (_statsLoaded) return;
    _statsLoaded = true;

    // Load presence data in parallel
    loadCarrierePresence();

    // Destroy previous charts if any
    _statsCharts.forEach(c => { try { c.destroy(); } catch(e) {} });
    _statsCharts = [];

    // 1) Genre chart (pie)
    try {
        const data = await fetch('/stats/personnel/genre').then(r => r.json());
        const total = data.reduce((s, d) => s + d.value, 0);
        const wrap = document.getElementById('wrap-stats-genre');
        const badge = document.getElementById('badge-stats-genre');
        if (badge) badge.textContent = fmt(total);
        wrap.innerHTML = '<div id="apex-genre"></div>';
        const c = new ApexCharts(document.querySelector('#apex-genre'), {
            chart: { type: 'pie', height: 300, toolbar: { show: false } },
            series: data.map(d => d.value),
            labels: data.map(d => d.label || 'N/A'),
            colors: ['#3b82f6', '#ec4899', '#94a3b8', '#64748b'],
            dataLabels: { enabled: true, formatter: v => v.toFixed(1) + '%', style: { fontSize: '13px', fontWeight: 700 }, dropShadow: { enabled: false } },
            legend: { position: 'bottom', fontSize: '12px', fontWeight: 600 },
            tooltip: { y: { formatter: v => fmt(v) + ' agents' } }
        });
        c.render(); _statsCharts.push(c);
    } catch(e) {
        document.getElementById('wrap-stats-genre').innerHTML = '<div style="text-align:center;color:#ef4444;padding:40px">Erreur</div>';
    }

    // 2) Grade chart (bar)
    try {
        const data = await fetch('/stats/personnel/grade').then(r => r.json());
        const total = data.reduce((s, d) => s + d.value, 0);
        const wrap = document.getElementById('wrap-stats-grade');
        const badge = document.getElementById('badge-stats-grade');
        if (badge) badge.textContent = fmt(total);
        wrap.innerHTML = '<div id="apex-grade"></div>';
        const c = new ApexCharts(document.querySelector('#apex-grade'), {
            chart: { type: 'bar', height: 300, toolbar: { show: false } },
            series: [{ name: 'Effectif', data: data.map(d => d.value) }],
            xaxis: { categories: data.map(d => d.label || 'N/A'), labels: { style: { fontSize: '10px' } } },
            colors: ['#f43f5e'],
            plotOptions: { bar: { borderRadius: 6, columnWidth: '55%', distributed: true } },
            dataLabels: { enabled: true, style: { fontSize: '11px', fontWeight: 700 } },
            legend: { show: false },
            tooltip: { y: { formatter: v => fmt(v) + ' agents' } }
        });
        c.render(); _statsCharts.push(c);
    } catch(e) {
        document.getElementById('wrap-stats-grade').innerHTML = '<div style="text-align:center;color:#ef4444;padding:40px">Erreur</div>';
    }

    // 3) État professionnel chart (from already loaded data)
    try {
        const etatMap = {};
        _etats.forEach(e => {
            const label = displayEtat(e.parametre);
            if (!etatMap[label]) etatMap[label] = 0;
            etatMap[label]++;
        });
        // Add "Disponible" for personnel without état
        const assignedIds = new Set(_etats.map(e => e.id_personnel));
        let disponible = 0;
        _personnel.forEach(p => { if (!assignedIds.has(p.id_personnel)) disponible++; });
        if (disponible > 0) etatMap['Disponible'] = (etatMap['Disponible'] || 0) + disponible;

        const labels = Object.keys(etatMap);
        const values = Object.values(etatMap);
        const total = values.reduce((s, v) => s + v, 0);
        const wrap = document.getElementById('wrap-stats-etat');
        const badge = document.getElementById('badge-stats-etat');
        if (badge) badge.textContent = fmt(total);
        wrap.innerHTML = '<div id="apex-etat"></div>';
        const colors = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ec4899','#ef4444','#06b6d4','#64748b','#f43f5e'];
        const c = new ApexCharts(document.querySelector('#apex-etat'), {
            chart: { type: 'donut', height: 300, toolbar: { show: false } },
            series: values,
            labels: labels,
            colors: colors.slice(0, labels.length),
            dataLabels: { enabled: true, formatter: v => v.toFixed(1) + '%', style: { fontSize: '12px', fontWeight: 700 }, dropShadow: { enabled: false } },
            legend: { position: 'bottom', fontSize: '12px', fontWeight: 600 },
            tooltip: { y: { formatter: v => fmt(v) + ' agents' } }
        });
        c.render(); _statsCharts.push(c);
    } catch(e) {
        document.getElementById('wrap-stats-etat').innerHTML = '<div style="text-align:center;color:#ef4444;padding:40px">Erreur</div>';
    }
}

// ═══ PRÉSENCES / ABSENCES ════════════════════════════════════════════════════
const MOIS_FR = {1:'Janvier',2:'Février',3:'Mars',4:'Avril',5:'Mai',6:'Juin',7:'Juillet',8:'Août',9:'Septembre',10:'Octobre',11:'Novembre',12:'Décembre'};
function fmtOT(s){if(!s)return'—';const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return`${h}h${m<10?'0':''}${m}`;}
function rateBadge(t){const c=t>=75?'#10b981':t>=50?'#f59e0b':'#ef4444';return`<strong style="color:${c}">${t}%</strong>`;}
function expBtnsC(pdfFn,xlsFn){return`<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();${pdfFn}" style="padding:3px 8px;font-size:.62rem">📄</button><button class="btn btn-success btn-sm" onclick="event.stopPropagation();${xlsFn}" style="padding:3px 8px;font-size:.62rem">📗</button>`;}

function toggleSec(id){
    const el=document.getElementById(id);
    if(!el)return;
    el.classList.toggle('collapsed');
    const ch=document.getElementById('chev-'+id);
    if(ch)ch.classList.toggle('open');
}

function getWeekRange(dateStr){
    const d=new Date(dateStr),day=d.getDay()||7;
    const mon=new Date(d);mon.setDate(d.getDate()-day+1);
    const sun=new Date(mon);sun.setDate(mon.getDate()+6);
    const pad=n=>n<10?'0'+n:n;
    const f=dt=>pad(dt.getDate())+'-'+pad(dt.getMonth()+1)+'-'+dt.getFullYear();
    return{key:mon.toISOString().slice(0,10),label:`Semaine du ${f(mon)} au ${f(sun)}`};
}

// Data store for exports
let _carrPresData = {};
const PRES_HDR = ['Agent','Mat.ENF','Mat.FP','Grade','Genre','Embauche','Date','Arrivée','Départ','Présence','H.Supp'];

function _presRows(days){
    const rows=[];
    days.forEach(day=>{day.agents.forEach(a=>{
        rows.push([a.agent,a.matricule||'—',a.matriculeFP||'—',a.grade_code||'—',a.genre||'—',a.recrutement_date||'—',day.jour,a.arrivee||'—',a.depart||'—',a.present?'Oui':'Non',a.heures_sup||'']);
    });});
    return rows;
}

function _carrPdfDoc(title){
    const {jsPDF}=window.jspdf,doc=new jsPDF('l','mm','a4');
    doc.setFontSize(14);doc.text('SMAPRDC — '+title,14,15);
    doc.setFontSize(8);doc.text('Généré le '+new Date().toLocaleDateString('fr-FR'),14,21);
    return doc;
}

function exportCarrPresPDF(mois,wi,di){
    const data=_carrPresData[mois];if(!data)return;
    let days,label=mois;
    if(di!==undefined){days=[data.weeks[wi].days[di]];label=data.weeks[wi].days[di].jour;}
    else if(wi!==undefined){days=data.weeks[wi].days;label=data.weeks[wi].label;}
    else{days=data.days;const p=mois.split('-');label=MOIS_FR[parseInt(p[1])]+' '+p[0];}
    const rows=_presRows(days);if(!rows.length)return;
    const doc=_carrPdfDoc('Présences Personnel — '+label);
    doc.autoTable({startY:25,head:[PRES_HDR],body:rows,styles:{fontSize:6,cellPadding:1.2},headStyles:{fillColor:[16,185,129]}});
    doc.save('Presences_'+label.replace(/[^a-zA-Z0-9]/g,'_')+'.pdf');
}
function exportCarrPresXls(mois,wi,di){
    const data=_carrPresData[mois];if(!data)return;
    let days,label=mois;
    if(di!==undefined){days=[data.weeks[wi].days[di]];label=data.weeks[wi].days[di].jour;}
    else if(wi!==undefined){days=data.weeks[wi].days;label=data.weeks[wi].label;}
    else{days=data.days;const p=mois.split('-');label=MOIS_FR[parseInt(p[1])]+' '+p[0];}
    const rows=_presRows(days);if(!rows.length)return;
    const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet([PRES_HDR,...rows]);
    ws['!cols']=[{wch:30},{wch:12},{wch:12},{wch:10},{wch:6},{wch:12},{wch:12},{wch:10},{wch:10},{wch:10},{wch:12}];
    XLSX.utils.book_append_sheet(wb,ws,'Présences');
    XLSX.writeFile(wb,'Presences_'+label.replace(/[^a-zA-Z0-9]/g,'_')+'.xlsx');
}

let _presLoaded=false;
async function loadCarrierePresence(){
    if(_presLoaded)return;
    _presLoaded=true;
    const wrap=document.getElementById('carr-pres-wrap');
    const cumWrap=document.getElementById('carr-cumuls-wrap');
    try{
        const months=await fetch('/stats/presence/personnel/summary').then(r=>r.json());
        if(!months.length){wrap.innerHTML='<div class="empty-state"><div class="empty-state-text">Aucune donnée de présence</div></div>';cumWrap.innerHTML=wrap.innerHTML;return;}

        let html='';
        months.forEach((row,mi)=>{
            const parts=row.mois.split('-');
            const label=MOIS_FR[parseInt(parts[1])]+' '+parts[0];
            const mId='carr-m-'+mi;
            html+=`<div class="subsection-title" onclick="toggleSec('${mId}');loadCarrMonth('${row.mois}')" style="margin-top:6px">
                <span class="sec-icon">📅</span> ${label}
                <span style="margin-left:auto;display:flex;align-items:center;gap:8px">
                    <span id="carr-ms-${row.mois}" style="font-size:.75rem"></span>
                    ${expBtnsC("exportCarrPresPDF('"+row.mois+"')","exportCarrPresXls('"+row.mois+"')")}
                    <span class="section-chevron" id="chev-${mId}">▼</span>
                </span>
            </div><div class="section-body collapsed" id="${mId}">
                <div id="carr-md-${row.mois}" data-loaded="0"><div class="chart-loading"><div class="spinner"></div></div></div>
            </div>`;
        });
        wrap.innerHTML=html;
        document.getElementById('pres-period-info').textContent=months.length+' mois';

        // Cumuls
        const allData=await Promise.all(months.map(m=>fetch('/stats/presence/personnel/detail?mois='+m.mois).then(r=>r.json())));
        const agentMap={};
        let tExp=0,tPres=0,tDays=0;
        allData.forEach(raw=>{raw.days.forEach(day=>{tDays++;tPres+=day.presents;tExp+=day.attendus;
            day.agents.forEach(a=>{
                if(!agentMap[a.agent])agentMap[a.agent]={present:0,absent:0,expected:0,overtime_s:0,matricule:a.matricule,matriculeFP:a.matriculeFP,grade_code:a.grade_code,genre:a.genre,recrutement_date:a.recrutement_date};
                agentMap[a.agent].expected+=1;if(a.present)agentMap[a.agent].present++;else agentMap[a.agent].absent++;
                agentMap[a.agent].overtime_s+=(a.overtime_s||0);
            });
        });});
        const sorted=Object.entries(agentMap).sort((a,b)=>a[0].localeCompare(b[0]));
        let ch=`<div style="padding:6px 0;font-size:.72rem;opacity:.7">Période: ${months.length} mois — ${tDays} jours — Taux: ${rateBadge(tExp?((tPres/tExp)*100).toFixed(1):0)}</div>`;
        ch+='<table class="pres-table"><thead><tr><th>Agent</th><th>Mat.ENF</th><th>Mat.FP</th><th>Grade</th><th>Genre</th><th>Embauche</th><th>Présences</th><th>Absences</th><th>Attendu</th><th>H.Supp</th></tr></thead><tbody>';
        sorted.forEach(([name,ag])=>{
            ch+=`<tr><td>${name}</td><td style="font-size:.72rem">${ag.matricule||'—'}</td><td style="font-size:.72rem">${ag.matriculeFP||'—'}</td><td style="font-size:.72rem">${ag.grade_code||'—'}</td><td>${ag.genre||'—'}</td><td style="font-size:.72rem">${ag.recrutement_date||'—'}</td>
                <td style="font-weight:600;color:#10b981">${ag.present}j</td><td style="font-weight:600;color:#ef4444">${ag.absent}j</td><td>${ag.expected}j</td><td style="font-weight:700">${fmtOT(ag.overtime_s)}</td></tr>`;
        });
        ch+='</tbody></table>';
        cumWrap.innerHTML=ch;
    }catch(e){
        console.error('[Carrière] Presence:',e);
        wrap.innerHTML='<div style="color:#ef4444;padding:20px">Erreur de chargement</div>';
        cumWrap.innerHTML=wrap.innerHTML;
    }
}

async function loadCarrMonth(mois){
    const container=document.getElementById('carr-md-'+mois);
    if(!container||container.dataset.loaded==='1')return;
    container.dataset.loaded='1';
    try{
        const raw=await fetch('/stats/presence/personnel/detail?mois='+mois).then(r=>r.json());
        const days=raw.days;
        let mP=0,mAtt=0;
        days.forEach(d=>{mP+=d.presents;mAtt+=d.attendus;});
        const mRate=mAtt?((mP/mAtt)*100).toFixed(1):0;
        const ms=document.getElementById('carr-ms-'+mois);
        if(ms)ms.innerHTML='— '+rateBadge(mRate);

        // Group by week
        const weeks={};
        days.forEach(day=>{
            const w=getWeekRange(day.jour);
            if(!weeks[w.key])weeks[w.key]={label:w.label,key:w.key,days:[],presents:0,attendus:0};
            weeks[w.key].days.push(day);
            weeks[w.key].presents+=day.presents;
            weeks[w.key].attendus+=day.attendus;
        });
        const sortedWeeks=Object.entries(weeks).sort((a,b)=>a[0].localeCompare(b[0]));

        // Store for exports
        _carrPresData[mois]={days,weeks:sortedWeeks.map(([k,w])=>w)};

        let html='';
        sortedWeeks.forEach(([wKey,w],wi)=>{
            const wId=`carr-w-${mois}-${wi}`;
            const wRate=w.attendus?((w.presents/w.attendus)*100).toFixed(1):0;
            html+=`<div class="subsection-title" onclick="toggleSec('${wId}')" style="margin-top:6px;margin-left:12px;font-size:.78rem;background:linear-gradient(135deg,#eff6ff,#dbeafe)">
                <span class="sec-icon">📆</span> ${w.label}
                <span style="margin-left:auto;display:flex;align-items:center;gap:8px">
                    <span style="font-size:.72rem">— ${rateBadge(wRate)}</span>
                    ${expBtnsC("exportCarrPresPDF('"+mois+"',"+wi+")","exportCarrPresXls('"+mois+"',"+wi+")")}
                    <span class="section-chevron" id="chev-${wId}">▼</span>
                </span>
            </div><div class="section-body collapsed" id="${wId}">`;

            w.days.forEach((day,di)=>{
                const dayId=`carr-d-${mois}-${wi}-${di}`;
                html+=`<div class="subsection-title" onclick="toggleSec('${dayId}')" style="margin-top:3px;margin-left:28px;font-size:.74rem;background:linear-gradient(135deg,#f0fdf4,#dcfce7)">
                    <span class="sec-icon">📋</span> ${day.jour}
                    <span style="margin-left:auto;display:flex;align-items:center;gap:8px">
                        <span style="font-size:.72rem">✅ ${day.presents} · ❌ ${day.absents} — ${rateBadge(day.taux)}</span>
                        ${expBtnsC("exportCarrPresPDF('"+mois+"',"+wi+","+di+")","exportCarrPresXls('"+mois+"',"+wi+","+di+")")}
                        <span class="section-chevron" id="chev-${dayId}">▼</span>
                    </span>
                </div><div class="section-body collapsed" id="${dayId}" style="margin-left:28px">
                    <table class="pres-table"><thead><tr><th>Agent</th><th>Mat.ENF</th><th>Mat.FP</th><th>Grade</th><th>Genre</th><th>Embauche</th><th>Arrivée</th><th>Départ</th><th>Présent</th><th>H.Supp</th></tr></thead><tbody>`;
                day.agents.forEach(a=>{
                    const b=a.present?'<span style="color:#10b981;font-weight:700">✓</span>':'<span style="color:#ef4444;font-weight:700">✗</span>';
                    html+=`<tr><td>${a.agent}</td><td style="font-size:.72rem">${a.matricule||'—'}</td><td style="font-size:.72rem">${a.matriculeFP||'—'}</td><td style="font-size:.72rem">${a.grade_code||'—'}</td><td>${a.genre||'—'}</td><td style="font-size:.72rem">${a.recrutement_date||'—'}</td><td>${a.arrivee}</td><td>${a.depart}</td><td>${b}</td><td>${a.heures_sup||'—'}</td></tr>`;
                });
                html+='</tbody></table></div>';
            });
            html+='</div>';
        });
        container.innerHTML=html;
    }catch(e){
        console.error('[Carrière] Month:',e);
        container.innerHTML='<span style="color:#ef4444">Erreur</span>';
    }
}

// ═══ EXPORT CUMULS (STATS TAB) ═══════════════════════════════════════════════
function exportCumulsCarrPDF(){
    const tbl=document.querySelector('#carr-cumuls-wrap table');
    if(!tbl)return;
    const doc=_carrPdfDoc('Cumuls Heures Supplémentaires');
    doc.autoTable({html:tbl,startY:25,styles:{fontSize:6,cellPadding:1.2},headStyles:{fillColor:[245,158,11]}});
    doc.save('SMAPRDC_Cumuls_'+new Date().toISOString().slice(0,10)+'.pdf');
}
function exportCumulsCarrXls(){
    const tbl=document.querySelector('#carr-cumuls-wrap table');
    if(!tbl)return;
    const wb=XLSX.utils.book_new(),ws=XLSX.utils.table_to_sheet(tbl);
    ws['!cols']=[{wch:30},{wch:12},{wch:12},{wch:10},{wch:6},{wch:12},{wch:10},{wch:10},{wch:10},{wch:12}];
    XLSX.utils.book_append_sheet(wb,ws,'Cumuls');
    XLSX.writeFile(wb,'SMAPRDC_Cumuls_'+new Date().toISOString().slice(0,10)+'.xlsx');
}

// ═══ INIT ════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', loadAll);
