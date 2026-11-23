/* P.C.Mobile — banco SQLite público em modo somente leitura. */
'use strict';
const $=id=>document.getElementById(id);
let records=[], filtered=[], entries=[], visible=0, busy=false, observer=null;
const PAGE_SIZE=25;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
function setStatus(message,error=false){$('status').hidden=!message;$('status').textContent=message;$('status').className='status'+(error?' error':'');}
function option(value,label){let o=document.createElement('option');o.value=value;o.textContent=label;return o;}
function unique(values){return [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));}
function parseAlternatives(v){try{let a=typeof v==='string'?JSON.parse(v):v;if(Array.isArray(a))return a.map((x,i)=>typeof x==='string'?{letra:'ABCDE'[i]||String(i+1),texto:x}:{letra:x.letra||'ABCDE'[i],texto:x.texto??x.alternativa??''});if(a&&typeof a==='object')return Object.entries(a).map(([letra,texto])=>({letra,texto}));}catch{}return [];}
function unpack(rows){return rows.map(r=>({...r,alternativas:parseAlternatives(r.alternativas_json),tipo:String(r.tipo||'normal').toLowerCase(),tag:r.tag||'',grupo_id:r.grupo_id||'',modalidade:r.modalidade||'',variante:r.variante||'',ano:r.ano||'',numero:Number(r.numero||0)}));}
async function load(){busy=true;setStatus('Carregando banco de questões...');$('results').replaceChildren();for(const id of ['search','materia','modulo','tipo'])$(id).disabled=true;
try{
 if(typeof initSqlJs!=='function')throw Error('Não foi possível carregar a biblioteca SQLite. Verifique sua conexão com a internet.');
 const SQL=await initSqlJs({locateFile:f=>`https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/${f}`});
 const response=await fetch('./questoes.db?v='+Date.now(),{cache:'no-store'});
 if(!response.ok)throw Error(`Não foi possível baixar questoes.db (HTTP ${response.status}).`);
 const buffer=await response.arrayBuffer();const db=new SQL.Database(new Uint8Array(buffer));
 try{
 const columns=db.exec('PRAGMA table_info(questoes)')[0]?.values.map(r=>r[1])||[];
 if(!columns.includes('enunciado')||!columns.includes('alternativas_json'))throw Error('O banco não tem o formato de questões esperado.');
 const wanted=['hash','materia','modulo','enunciado','alternativas_json','resposta_texto','comentario','tipo','tag','ano','grupo_id','numero','total_grupo','modalidade','variante'];
 const select=wanted.map(k=>columns.includes(k)?`"${k}"`:`NULL AS "${k}"`).join(',');
 let q=db.exec(`SELECT ${select} FROM questoes`);
 records=unpack(q.length?q[0].values.map(values=>Object.fromEntries(q[0].columns.map((col,i)=>[col,values[i]]))):[]);
 } finally {db.close()}
 $('total').textContent=records.length;
 $('subjects').textContent=unique(records.map(r=>r.materia)).length;
 fillSubjects();for(const id of ['search','materia','modulo','tipo'])$(id).disabled=false;
 setStatus('');applyFilters();
 }catch(e){console.error(e);setStatus('Falha ao carregar o banco: '+e.message,true);$('count').textContent='—';}
 busy=false;
}
function fillSubjects(){const prev=$('materia').value;$('materia').replaceChildren(option('','Todas as matérias'));for(const x of unique(records.map(r=>r.materia)))$('materia').append(option(x,x));if([...$('materia').options].some(o=>o.value===prev))$('materia').value=prev;fillModules()}
function fillModules(){const prev=$('modulo').value;const m=$('materia').value;const subset=records.filter(x=>!m||x.materia===m);$('modulo').replaceChildren(option('','Todos os módulos'));for(const x of unique(subset.map(r=>r.modulo)))$('modulo').append(option(x,x));if([...$('modulo').options].some(o=>o.value===prev))$('modulo').value=prev;}
function applyFilters(){if(busy)return;const text=fold($('search').value.trim());const m=$('materia').value,mod=$('modulo').value,t=$('tipo').value;
 filtered=records.filter(r=>(!m||r.materia===m)&&(!mod||r.modulo===mod)&&(!t||r.tipo===t)&&(!text||fold([r.enunciado,...r.alternativas.map(a=>a.texto),r.comentario,r.tag].join(' ')).includes(text)));
 $('count').textContent=filtered.length.toLocaleString('pt-BR');
 const grouped=new Map();entries=[];
 for(const r of filtered){
  if((r.tipo==='simulado'||r.tipo==='prova')&&r.grupo_id){
   if(!grouped.has(r.grupo_id)){const entry={group:[],key:r.grupo_id};grouped.set(r.grupo_id,entry);entries.push(entry)}
   grouped.get(r.grupo_id).group.push(r);
  }else{entries.push({question:r})}
 }
 visible=0;$('results').replaceChildren();setStatus(filtered.length?'':'Nenhuma questão encontrada.');renderNext();}
function questionCard(r){let node=document.createElement('article');node.className='card';const correct=fold(r.resposta_texto).trim();
let alts=r.alternativas.map(a=>`<div class="alt ${correct&&fold(a.texto).trim()===correct?'correct':''}"><b>${esc(a.letra)}.</b>${esc(a.texto)}</div>`).join('');
node.innerHTML=`<div class="meta"><span class="chip">${esc(r.materia||'Sem matéria')}</span><span class="chip">${esc(r.modulo||'Sem módulo')}</span>${r.tag?`<span class="chip">${esc(r.tag)} · ${esc(r.modalidade)} · ${esc(r.variante)}</span>`:''}</div><div class="question">${esc(r.enunciado)}</div>${alts}${r.resposta_texto?`<div class="answer"><b>Resposta:</b> ${esc(r.resposta_texto)}</div>`:''}${r.comentario?`<details class="comment"><summary>Ver comentário</summary><p>${esc(r.comentario)}</p></details>`:''}`;return node;}
function renderNext(){
 if(visible>=entries.length)return;
 const batch=entries.slice(visible,visible+PAGE_SIZE);visible+=batch.length;
 const frag=document.createDocumentFragment();
 for(const entry of batch){
  if(entry.question){frag.append(questionCard(entry.question));continue}
  const group=entry.group,r=group[0],det=document.createElement('details');det.className='group';
  const sum=document.createElement('summary');
  const label=[r.tag||r.tipo,r.modalidade,r.variante,r.ano].filter(Boolean).join(' · ');
  sum.innerHTML=`<span>${esc(label)}</span><small>${group.length} questão(ões)</small>`;
  det.append(sum);
  det.addEventListener('toggle',()=>{
   if(!det.open||det.querySelector('.inside'))return;
   const inner=document.createElement('div');inner.className='inside';
   group.sort((a,b)=>a.numero-b.numero).forEach(q=>inner.append(questionCard(q)));
   det.append(inner);
  });
  frag.append(det);
 }
 $('results').append(frag);
}
$('search').addEventListener('input',applyFilters);$('materia').addEventListener('change',()=>{fillModules();applyFilters()});$('modulo').addEventListener('change',applyFilters);$('tipo').addEventListener('change',applyFilters);$('reload').addEventListener('click',load);
observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&!busy)renderNext()},{rootMargin:'350px'});observer.observe($('sentinel'));load();
