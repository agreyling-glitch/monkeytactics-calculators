(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const key = 'mt-tile-project-v1';
  const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
  const fmt = n => n.toLocaleString(undefined,{maximumFractionDigits:2});
  const escape = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const groupLabel = id => id === 'floor' ? 'Floor tile' : 'Wall / backsplash tile';
  const surface = () => ({name:'Room 1 floor',type:'floor',length:12,width:10,deduction:0,waste:10});
  const presets = {
    '6x6':{length:6,width:6,perBox:44,weight:41.8},
    '12x12':{length:12,width:12,perBox:15,weight:57},
    '12x24':{length:12,width:24,perBox:8,weight:60.8},
    '24x24':{length:24,width:24,perBox:4,weight:60.8}
  };
  const product = (name,preset) => ({name,...presets[preset],units:'in',mode:'dimensions',coverage:preset==='12x12'?15:16,price:0});
  const supply = (name,mode='manual',scope='all',coverage=50) => ({name,mode,scope,enabled:false,quantity:0,price:0,coverage,allowance:10});
  const defaults = () => ({units:'ft',surfaces:[surface()],products:{floor:product('Floor tile','12x12'),wall:product('Wall tile','12x24')},tax:0,supplies:[supply('Adhesive / thinset (bags)','coverage'),supply('Grout (packages)','coverage','all',100),supply('Underlayment / membrane (rolls)','coverage','floor',100),supply('Spacers / leveling clips (packs)'),supply('Sealer (containers)'),supply('Trim / edging (pieces)'),supply('Tools / other supplies')]});
  let project=defaults(), result=null, timer;
  const expanded = new WeakSet();
  const field = (label,path,value,min=0,max=1000000,step='any') => `<label class="input-group">${label}<input type="number" data-path="${path}" value="${escape(value)}" min="${min}" max="${max}" step="${step}" required></label>`;
  const select = (label,path,value,options) => `<label class="input-group">${label}<select data-path="${path}">${options.map(([v,l])=>`<option value="${v}" ${value===v?'selected':''}>${l}</option>`).join('')}</select></label>`;
  const check = (label,path,value) => `<label class="tile-check"><input type="checkbox" data-path="${path}" ${value?'checked':''}> ${label}</label>`;
  function render() {
    const focused = document.activeElement?.dataset?.path;
    const u=project.units;
    $('units').value=u;
    $('surfaces').innerHTML=project.surfaces.map((s,i)=>`<details class="tile-room" data-surface-index="${i}" ${expanded.has(s)?'open':''}><summary class="tile-room-summary"><span class="tile-room-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span class="tile-room-caption"><strong id="surface-name-${i}">${escape(s.name)}</strong><span id="surface-area-${i}">Edit measurements</span></span><span class="tile-room-edit" aria-hidden="true">Edit</span></summary><div class="tile-room-body"><div class="tile-room-head"><label class="input-group">Surface name<input data-path="surfaces.${i}.name" maxlength="100" value="${escape(s.name)}"></label><button type="button" data-remove="${i}" ${project.surfaces.length===1?'disabled':''} aria-label="Remove ${escape(s.name)}">Remove</button></div>${select('Tile product group',`surfaces.${i}.type`,s.type,[['floor','Floor tile'],['wall','Wall / backsplash tile']])}<div class="tile-fields">${field(`Length (${u})`,`surfaces.${i}.length`,s.length,.001,10000)}${field(`${s.type==='wall'?'Height':'Width'} (${u})`,`surfaces.${i}.width`,s.width,.001,10000)}${field(`Untiled / excluded area (${u}&sup2;)`,`surfaces.${i}.deduction`,s.deduction,0,100000000)}${field('Cutting waste / spare allowance (%)',`surfaces.${i}.waste`,s.waste,0,100)}</div><p class="tile-hint">Deduct doors, windows, or areas not being tiled once. Split irregular shapes into rectangles. Waste is adjustable for each surface.</p></div></details>`).join('');
    $('productFields').innerHTML=Object.entries(project.products).map(([id,p])=>`<fieldset class="tile-product"><legend>${groupLabel(id)}</legend><label class="input-group">Product name / reference<input maxlength="100" data-path="products.${id}.name" value="${escape(p.name)}"></label><label class="input-group">Start from an example size<select data-preset="${id}"><option value="">Custom / keep current values</option>${Object.keys(presets).map(v=>`<option value="${v}">${v.replace('x',' &times; ')} in</option>`).join('')}</select></label><p class="tile-hint">Example sizes include illustrative carton counts and weights. Confirm these against your product; prices start at zero.</p><div class="tile-fields">${select('Tile dimension units',`products.${id}.units`,p.units,[['in','Inches'],['mm','Millimeters']])}${select('Carton coverage method',`products.${id}.mode`,p.mode,[['dimensions','From tile dimensions'],['coverage','From carton label']])}${field(`Tile length (${p.units})`,`products.${id}.length`,p.length,.1,10000)}${field(`Tile width (${p.units})`,`products.${id}.width`,p.width,.1,10000)}${field('Tiles / sheets per box',`products.${id}.perBox`,p.perBox,1,100000,1)}${p.mode==='coverage'?field('Carton coverage (ft&sup2; / box)',`products.${id}.coverage`,p.coverage,.001,100000):''}${field('Price per box (USD)',`products.${id}.price`,p.price,0,100000,.01)}${field('Tile contents weight per box (lb)',`products.${id}.weight`,p.weight,0,10000)}</div></fieldset>`).join('');
    $('supplyFields').innerHTML=project.supplies.map((s,i)=>`<fieldset class="tile-product"><legend>${escape(s.name)}</legend>${check('Include this supply',`supplies.${i}.enabled`,s.enabled)}${s.enabled?`<div class="tile-fields">${select('Quantity method',`supplies.${i}.mode`,s.mode,[['coverage','Package coverage'],['manual','Manual quantity']])}${s.mode==='coverage'?select('Apply to',`supplies.${i}.scope`,s.scope,[['all','All tiled surfaces'],['floor','Floors only'],['wall','Walls only']])+field('Coverage (ft&sup2; / package)',`supplies.${i}.coverage`,s.coverage,.001,100000)+field('Supply allowance (%)',`supplies.${i}.allowance`,s.allowance,0,100):field('Packages / pieces to buy',`supplies.${i}.quantity`,s.quantity,0,1000000,1)}${field('Price per package / piece (USD)',`supplies.${i}.price`,s.price,0,100000,.01)}</div>`:''}</fieldset>`).join('');
    $('taxFields').innerHTML=field('Sales tax on tile and supplies (%)','tax',project.tax,0,100);
    $('addSurface').disabled=project.surfaces.length>=50;
    update();
    if(focused)$('tileForm').querySelector(`[data-path="${focused}"]`)?.focus();
  }
  function update() {
    clearTimeout(timer);
    try {
      result=TileEngine.calculate(project);
      const factor=project.units==='m'?TileEngine.SQFT_PER_M2:1,u=project.units==='m'?'m²':'ft²';
      $('calcError').hidden=true;
      result.surfaces.forEach((s,i)=>{
        $(`surface-name-${i}`).textContent=s.name;
        $(`surface-area-${i}`).textContent=`${fmt(s.area/factor)} ${u} net / ${groupLabel(s.type)} / ${s.waste}% allowance`;
      });
      const floor=result.products[0],wall=result.products[1];
      const budget=[['Floor tile',floor.cost],['Wall tile',wall.cost],['Supplies',result.supplyCost],['Sales tax',result.taxCost]];
      $('resultsPanel').innerHTML=`<div class="tile-total"><span>Estimated materials + tax</span><strong>${money(result.total)}</strong><small>USD &middot; enter your product and supply prices</small></div><dl class="tile-budget">${budget.map(([label,cost])=>`<div><dt>${label}</dt><dd>${money(cost)}</dd></div>`).join('')}</dl><div class="tile-area-stats"><span>Net tiled area<b>${fmt(result.area/factor)} ${u}</b></span><span>With tile allowance<b>${fmt(result.target/factor)} ${u}</b></span></div>`+result.products.filter(p=>p.area>0).map(p=>`<article class="tile-shopping"><h4>${escape(p.name)} <span>${money(p.cost)}</span></h4><strong>${fmt(p.boxes)} boxes &middot; ${fmt(p.boxedTiles)} tiles / sheets</strong><p>${fmt(p.tiles)} pieces needed with allowance &middot; ${fmt(p.extraPieces)} extra pieces from carton rounding</p><p>${fmt(p.supplied/factor)} ${u} purchased &middot; ${fmt(p.surplus/factor)} ${u} beyond allowance</p><p>${fmt(p.coverage)} ft&sup2;/box &middot; ${money(p.boxPrice)}/box</p></article>`).join('')+(result.supplies.length?`<article class="tile-shopping"><h4>Supplies <span>${money(result.supplyCost)}</span></h4>${result.supplies.map(s=>`<p>${escape(s.name)}: <strong>${fmt(s.quantity)}</strong> &times; ${money(s.price)} = ${money(s.cost)}</p>`).join('')}</article>`:'')+`<p>Tile contents weight: <strong>${fmt(result.weight)} lb / ${fmt(result.weight*.45359237)} kg</strong></p><p class="tile-hint">Weight excludes packaging and supplies. Costs exclude labor and delivery. Floor and wall products are ordered separately. Zero-priced items are not included in the budget.</p>`;
      $('surfaceBreakdown').innerHTML=`<div class="tile-table-scroll"><table><caption>Surface areas in ${u}; product purchases combine surfaces in the same group.</caption><thead><tr><th scope="col">Surface</th><th scope="col">Product group</th><th scope="col">Net area</th><th scope="col">Allowance</th><th scope="col">Order area</th></tr></thead><tbody>${result.surfaces.map(s=>`<tr><th scope="row">${escape(s.name)}</th><td>${groupLabel(s.type)}</td><td>${fmt(s.area/factor)}</td><td>${s.waste}%</td><td>${fmt(s.target/factor)}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row" colspan="2">Project total</th><td>${fmt(result.area/factor)}</td><td>&mdash;</td><td>${fmt(result.target/factor)}</td></tr></tfoot></table></div>`;
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
  $('tileForm').addEventListener('submit',e=>e.preventDefault());
  $('tileForm').addEventListener('input',e=>{
    const path=e.target.dataset.path;if(!path)return;
    if(path.match(/^products\.(floor|wall)\.units$/)){
      const p=project.products[path.split('.')[1]],factor=e.target.value==='mm'?25.4:1/25.4;
      if(p.units!==e.target.value)['length','width'].forEach(k=>{if(p[k]!==''&&Number.isFinite(Number(p[k])))p[k]=Number((Number(p[k])*factor).toPrecision(12));});
    }
    set(path,e.target.type==='checkbox'?e.target.checked:e.target.value);
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
    if(project.units==='m'){s.length=3.6576;s.width=3.048;}
    project.surfaces.push(s);expanded.add(s);render();const fields=$('surfaces').querySelectorAll('input[data-path$=".name"]');fields[fields.length-1].focus();
  });
  $('units').addEventListener('change',()=>{TileEngine.convertUnits(project,$('units').value);render();});
  $('resetBtn').addEventListener('click',()=>{clearTimeout(timer);try{localStorage.removeItem(key);}catch{}project=defaults();expanded.add(project.surfaces[0]);render();});
  $('exampleBtn').addEventListener('click',()=>{
    project=defaults();project.surfaces=[{...surface(),name:'Bathroom floor',length:8,width:6},{...surface(),name:'Shower wall',type:'wall',length:8,width:7,deduction:4,waste:15}];
    project.products.floor.price=45;project.products.wall.price=48;project.tax=8;
    project.supplies[0].enabled=true;project.supplies[0].price=25;project.supplies[1].enabled=true;project.supplies[1].price=18;expanded.add(project.surfaces[0]);render();
  });
  $('printBtn').addEventListener('click',()=>{if(result)window.print();});
  $('csvBtn').addEventListener('click',()=>{
    if(!result)return;
    const rows=[['Tile project estimate'],['Surface measurement units',project.units],['Export area unit','square feet'],[],['Surface','Group','Net ft²','Deduction ft²','Waste %','Order ft²'],...result.surfaces.map(s=>[s.name,s.type,s.area,s.deduction,s.waste,s.target]),[],['Product','Coverage method','Coverage ft²/box','Tiles/box','Pieces needed','Boxes','Purchased pieces','Purchased ft²','Surplus ft² beyond allowance','Extra pieces','Price/box USD','Tile cost USD','Tile weight lb'],...result.products.map(p=>[p.name,p.mode,p.coverage,p.perBox,p.tiles,p.boxes,p.boxedTiles,p.supplied,p.surplus,p.extraPieces,p.boxPrice,p.cost,p.weight]),[],['Supply','Method','Scope','Coverage ft²/package','Supply allowance %','Quantity','Unit price USD','Cost USD'],...result.supplies.map(s=>[s.name,s.mode,s.scope,s.coverage??'',s.allowance,s.quantity,s.price,s.cost]),[],['Tile subtotal USD',result.tileCost],['Supply subtotal USD',result.supplyCost],['Sales tax %',project.tax],['Tax USD',result.taxCost],['Total USD',result.total],['Excludes labor, delivery, packaging weight, and supply weight']];
    const quote=v=>'"'+String(typeof v==='string'&&/^[\s]*[=+@\-]/.test(v)?"'"+v:v).replaceAll('"','""')+'"';
    const blob=new Blob(['\ufeff'+rows.map(row=>row.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='tile-project-estimate.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  try{const saved=JSON.parse(localStorage.getItem(key));if(saved){TileEngine.calculate(saved);if(!saved.supplies)saved.supplies=[];project=saved;}}catch{}
  expanded.add(project.surfaces[0]);render();
})();
