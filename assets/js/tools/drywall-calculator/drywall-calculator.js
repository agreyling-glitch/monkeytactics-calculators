(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const key = 'mt-drywall-project-v1';
  const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
  const fmt = n => n.toLocaleString(undefined,{maximumFractionDigits:2});
  const escape = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const groupLabel = id => id === 'ceiling' ? 'Ceiling board' : 'Wall board';
  const surface = () => ({name:'Room 1 walls',type:'wall',mode:'room',length:12,width:10,height:8,deduction:0,waste:10});
  const presets={'4x8':{length:96,width:48,weight:50},'4x10':{length:120,width:48,weight:62.5},'4x12':{length:144,width:48,weight:75}};
  const product=name=>({name,...presets['4x8'],units:'in',mode:'dimensions',perBox:1,coverage:32,price:0});
  const supply = name => ({name,mode:'manual',scope:'all',enabled:false,quantity:0,price:0,coverage:100,allowance:10});
  const defaults = () => ({units:'ft',surfaces:[surface()],products:{ceiling:product('Ceiling board'),wall:product('Wall board')},tax:0,supplies:[supply('Joint compound (containers)'),supply('Joint tape (rolls)'),supply('Drywall screws (boxes)'),supply('Corner bead (pieces)'),supply('Adhesive (tubes)'),supply('Tools / other supplies')]});
  let project=defaults(), result=null, timer;
  const expanded = new WeakSet();
  const field = (label,path,value,min=0,max=1000000,step='any') => `<label class="input-group">${label}<input type="number" data-path="${path}" value="${escape(value)}" min="${min}" max="${max}" step="${step}" required></label>`;
  const select = (label,path,value,options) => `<label class="input-group">${label}<select data-path="${path}">${options.map(([v,l])=>`<option value="${v}" ${value===v?'selected':''}>${l}</option>`).join('')}</select></label>`;
  const check = (label,path,value) => `<label class="drywall-check"><input type="checkbox" data-path="${path}" ${value?'checked':''}> ${label}</label>`;
  function render() {
    const focused = document.activeElement?.dataset?.path;
    const u=project.units;
    $('units').value=u;
    $('surfaces').innerHTML=project.surfaces.map((s,i)=>`<details class="drywall-room" data-surface-index="${i}" ${expanded.has(s)?'open':''}><summary class="drywall-room-summary"><span class="drywall-room-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span class="drywall-room-caption"><strong id="surface-name-${i}">${escape(s.name)}</strong><span id="surface-area-${i}">Edit measurements</span></span><span class="drywall-room-edit" aria-hidden="true">Edit</span></summary><div class="drywall-room-body"><div class="drywall-room-head"><label class="input-group">Surface name<input data-path="surfaces.${i}.name" maxlength="100" value="${escape(s.name)}"></label><button type="button" data-remove="${i}" ${project.surfaces.length===1?'disabled':''} aria-label="Remove ${escape(s.name)}">Remove</button></div>${select('Board product group',`surfaces.${i}.type`,s.type,[['ceiling','Ceiling board'],['wall','Wall board']])}${s.type==='wall'?select('Measurement method',`surfaces.${i}.mode`,s.mode,[['room','Four room walls'],['surface','Single rectangular wall']]):''}<div class="drywall-fields">${field(`Length (${u})`,`surfaces.${i}.length`,s.length,.001,10000)}${field(`${s.mode==='room'?'Room width':s.type==='wall'?'Height':'Width'} (${u})`,`surfaces.${i}.width`,s.width,.001,10000)}${s.mode==='room'?field(`Room height (${u})`,`surfaces.${i}.height`,s.height,.001,10000):''}${field(`Openings / excluded area (${u}&sup2;)`,`surfaces.${i}.deduction`,s.deduction,0,100000000)}${field('Cutting waste / spare allowance (%)',`surfaces.${i}.waste`,s.waste,0,100)}</div><p class="drywall-hint">Room mode measures all four walls; add ceilings separately. Deduct combined door and window areas once. Single-wall mode uses length and height. Changing measurement method keeps the entered values; check their meaning before ordering.</p></div></details>`).join('');
    $('productFields').innerHTML=Object.entries(project.products).map(([id,p])=>`<fieldset class="drywall-product"><legend>${groupLabel(id)}</legend><label class="input-group">Product name / thickness / reference<input maxlength="100" data-path="products.${id}.name" value="${escape(p.name)}"></label><label class="input-group">Sheet size<select data-preset="${id}"><option value="">Custom / keep current</option>${Object.keys(presets).map(v=>`<option value="${v}">${v.replace('x',' &times; ')} ft</option>`).join('')}</select></label><div class="drywall-fields">${field('Sheet length (in)',`products.${id}.length`,p.length,.1,10000)}${field('Sheet width (in)',`products.${id}.width`,p.width,.1,10000)}${field('Price per sheet (USD)',`products.${id}.price`,p.price,0,100000,.01)}${field('Weight per sheet (lb)',`products.${id}.weight`,p.weight,0,10000)}</div><p class="drywall-hint">Example weights are illustrative. Replace with your selected board label, including thickness and product type. Sheet dimensions stay in inches when room units change.</p></fieldset>`).join('');
    $('supplyFields').innerHTML=project.supplies.map((s,i)=>`<fieldset class="drywall-product"><legend>${escape(s.name)}</legend>${check('Include this supply',`supplies.${i}.enabled`,s.enabled)}${s.enabled?`<div class="drywall-fields">${select('Quantity method',`supplies.${i}.mode`,s.mode,[['coverage','Package coverage'],['manual','Manual quantity']])}${s.mode==='coverage'?select('Apply to',`supplies.${i}.scope`,s.scope,[['all','All board surfaces'],['ceiling','Ceilings only'],['wall','Walls only']])+field('Coverage (ft&sup2; / package)',`supplies.${i}.coverage`,s.coverage,.001,100000)+field('Supply allowance (%)',`supplies.${i}.allowance`,s.allowance,0,100):field('Packages / pieces to buy',`supplies.${i}.quantity`,s.quantity,0,1000000,1)}${field('Price per package / piece (USD)',`supplies.${i}.price`,s.price,0,100000,.01)}</div>`:''}</fieldset>`).join('');
    $('taxFields').innerHTML=field('Sales tax on board and supplies (%)','tax',project.tax,0,100);
    $('addSurface').disabled=project.surfaces.length>=50;
    update();
    if(focused)$('drywallForm').querySelector(`[data-path="${focused}"]`)?.focus();
  }
  function update() {
    clearTimeout(timer);
    try {
      result=DrywallEngine.calculate(project);
      const factor=project.units==='m'?DrywallEngine.SQFT_PER_M2:1,u=project.units==='m'?'m²':'ft²';
      $('calcError').hidden=true;
      result.surfaces.forEach((s,i)=>{
        $(`surface-name-${i}`).textContent=s.name;
        $(`surface-area-${i}`).textContent=`${fmt(s.area/factor)} ${u} net / ${groupLabel(s.type)} / ${s.waste}% allowance`;
      });
      const ceiling=result.products[0],wall=result.products[1];
      const budget=[['Ceiling board',ceiling.cost],['Wall board',wall.cost],['Supplies',result.supplyCost],['Sales tax',result.taxCost]];
      $('resultsPanel').innerHTML=`<div class="drywall-total"><span>Estimated materials + tax</span><strong>${money(result.total)}</strong><small>USD &middot; enter your product and supply prices</small></div><dl class="drywall-budget">${budget.map(([label,cost])=>`<div><dt>${label}</dt><dd>${money(cost)}</dd></div>`).join('')}</dl><div class="drywall-area-stats"><span>Net board area<b>${fmt(result.area/factor)} ${u}</b></span><span>With sheet allowance<b>${fmt(result.target/factor)} ${u}</b></span></div>`+result.products.filter(p=>p.area>0).map(p=>`<article class="drywall-shopping"><h4>${escape(p.name)} <span>${money(p.cost)}</span></h4><strong>${fmt(p.boxes)} sheets</strong><p>Whole sheets rounded after combining this product group</p><p>${fmt(p.supplied/factor)} ${u} purchased &middot; ${fmt(p.surplus/factor)} ${u} beyond allowance</p><p>${fmt(p.coverage)} ft&sup2;/sheet &middot; ${money(p.boxPrice)}/sheet</p></article>`).join('')+(result.supplies.length?`<article class="drywall-shopping"><h4>Supplies <span>${money(result.supplyCost)}</span></h4>${result.supplies.map(s=>`<p>${escape(s.name)}: <strong>${fmt(s.quantity)}</strong> &times; ${money(s.price)} = ${money(s.cost)}</p>`).join('')}</article>`:'')+`<p>Board weight: <strong>${fmt(result.weight)} lb / ${fmt(result.weight*.45359237)} kg</strong></p><p class="drywall-hint">Weight excludes packaging and supplies. Costs exclude labor and delivery. Ceiling and wall products are ordered separately. Prices of zero contribute no cost; enter every price for a complete budget.</p>`;
      $('surfaceBreakdown').innerHTML=`<div class="drywall-table-scroll"><table><caption>Surface areas in ${u}; product purchases combine surfaces in the same group.</caption><thead><tr><th scope="col">Surface</th><th scope="col">Product group</th><th scope="col">Net area</th><th scope="col">Allowance</th><th scope="col">Order area</th></tr></thead><tbody>${result.surfaces.map(s=>`<tr><th scope="row">${escape(s.name)}</th><td>${groupLabel(s.type)}</td><td>${fmt(s.area/factor)}</td><td>${s.waste}%</td><td>${fmt(s.target/factor)}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row" colspan="2">Project total</th><td>${fmt(result.area/factor)}</td><td>&mdash;</td><td>${fmt(result.target/factor)}</td></tr></tfoot></table></div>`;
      $('printBtn').disabled=$('csvBtn').disabled=false;
      timer=setTimeout(()=>{try{localStorage.setItem(key,JSON.stringify(project));$('saveStatus').textContent='Project saved in this browser.';}catch{$('saveStatus').textContent='Browser saving is unavailable. Export your estimate to keep a copy.';}},400);
    }catch(e){
      result=null;$('calcError').hidden=false;$('calcError').textContent=e.message;
      $('resultsPanel').textContent='Complete the project details to see your estimate.';
      $('surfaceBreakdown').textContent='The breakdown will appear when all project values are valid.';
      project.surfaces.forEach((s,i)=>{$(`surface-name-${i}`).textContent=s.name||`Surface ${i+1}`;$(`surface-area-${i}`).textContent='Check project details';});
      $('printBtn').disabled=$('csvBtn').disabled=true;
      $('saveStatus').textContent='Invalid or incomplete changes have not been saved.';
    }
  }
  function set(path,value){const parts=path.split('.');let target=project;parts.slice(0,-1).forEach(p=>target=target[p]);target[parts.at(-1)]=value;}
  $('drywallForm').addEventListener('submit',e=>e.preventDefault());
  $('drywallForm').addEventListener('input',e=>{
    const path=e.target.dataset.path;if(!path)return;
    if(path.match(/^products\.(ceiling|wall)\.units$/)){
      const p=project.products[path.split('.')[1]],factor=e.target.value==='mm'?25.4:1/25.4;
      if(p.units!==e.target.value)['length','width'].forEach(k=>{if(p[k]!==''&&Number.isFinite(Number(p[k])))p[k]=Number((Number(p[k])*factor).toPrecision(12));});
    }
    set(path,e.target.type==='checkbox'?e.target.checked:e.target.value);
    if(path.endsWith('.type') && e.target.value==='ceiling')project.surfaces[Number(path.split('.')[1])].mode='surface';
    if(e.target.tagName==='SELECT'||e.target.type==='checkbox')render();else update();
  });
  $('productFields').addEventListener('change',e=>{
    const id=e.target.dataset.preset,preset=presets[e.target.value];if(!id||!preset)return;
    Object.assign(project.products[id],preset,{units:'in',mode:'dimensions'});render();
  });
  $('surfaces').addEventListener('toggle',e=>{
    const i=e.target.dataset.surfaceIndex;if(i===undefined||!e.target.isConnected)return;
    const s=project.surfaces[Number(i)];if(s){if(e.target.open)expanded.add(s);else expanded.delete(s);}
  },true);
  $('surfaces').addEventListener('click',e=>{
    const button=e.target.closest('[data-remove]');if(!button||project.surfaces.length===1)return;
    const i=Number(button.dataset.remove);project.surfaces.splice(i,1);const next=Math.min(i,project.surfaces.length-1);expanded.add(project.surfaces[next]);render();$('surfaces').querySelectorAll('input[data-path$=".name"]')[next].focus();
  });
  $('addSurface').addEventListener('click',()=>{
    if(project.surfaces.length>=50)return;
    const s={...surface(),name:`Surface ${project.surfaces.length+1}`};
    if(project.units==='m'){s.length=3.6576;s.width=3.048;s.height=2.4384;}
    project.surfaces.push(s);expanded.add(s);render();const fields=$('surfaces').querySelectorAll('input[data-path$=".name"]');fields[fields.length-1].focus();
  });
  $('units').addEventListener('change',()=>{DrywallEngine.convertUnits(project,$('units').value);render();});
  $('resetBtn').addEventListener('click',()=>{clearTimeout(timer);try{localStorage.removeItem(key);}catch{}project=defaults();expanded.add(project.surfaces[0]);render();});
  $('exampleBtn').addEventListener('click',()=>{
    project=defaults();project.surfaces=[{...surface(),name:'Bedroom walls',deduction:32},{...surface(),name:'Bedroom ceiling',type:'ceiling',mode:'surface'}];
    project.products.ceiling.price=16;project.products.wall.price=15;project.tax=8;
    project.supplies[0].enabled=true;project.supplies[0].quantity=2;project.supplies[0].price=20;expanded.add(project.surfaces[0]);render();
  });
  $('printBtn').addEventListener('click',()=>{if(result)window.print();});
  $('csvBtn').addEventListener('click',()=>{
    if(!result)return;
    const rows=[['Drywall project estimate'],['Surface measurement units',project.units],['Export area unit','square feet'],[],['Surface','Group','Measurement method','Net ft²','Deduction ft²','Waste %','Order ft²'],...result.surfaces.map(s=>[s.name,s.type,project.surfaces[result.surfaces.indexOf(s)].mode,s.area,s.deduction,s.waste,s.target]),[],['Product','Coverage method','Coverage ft²/sheet','Sheets/unit','Pieces needed','Sheets','Purchased pieces','Purchased ft²','Surplus ft² beyond allowance','Extra pieces','Price/sheet USD','Board cost USD','Board weight lb'],...result.products.map(p=>[p.name,p.mode,p.coverage,p.perBox,p.tiles,p.boxes,p.boxedTiles,p.supplied,p.surplus,p.extraPieces,p.boxPrice,p.cost,p.weight]),[],['Supply','Method','Scope','Coverage ft²/package','Supply allowance %','Quantity','Unit price USD','Cost USD'],...result.supplies.map(s=>[s.name,s.mode,s.scope,s.coverage??'',s.allowance,s.quantity,s.price,s.cost]),[],['Board subtotal USD',result.tileCost],['Supply subtotal USD',result.supplyCost],['Sales tax %',project.tax],['Tax USD',result.taxCost],['Total USD',result.total],['Excludes labor, delivery, packaging weight, and supply weight']];
    const quote=v=>'"'+String(typeof v==='string'&&/^[\s]*[=+@\-]/.test(v)?"'"+v:v).replaceAll('"','""')+'"';
    const blob=new Blob(['\ufeff'+rows.map(row=>row.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='drywall-project-estimate.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  try{const saved=JSON.parse(localStorage.getItem(key));if(saved){DrywallEngine.calculate(saved);if(!saved.supplies)saved.supplies=[];project=saved;}}catch{}
  expanded.add(project.surfaces[0]);render();
})();
