(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const storageKey = 'mt-paint-project-v1';
  const labels = {wall: 'Wall paint', ceiling: 'Ceiling paint', primer: 'Primer'};
  const money = n => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD'}).format(n);
  const fmt = n => n.toLocaleString(undefined, {maximumFractionDigits:2});
  const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const room = () => ({name:'Room 1',mode:'room',length:12,width:10,height:8,openings:0,ceiling:false,ceilingArea:120});
  const defaultSupplies = () => ['Masking / painters tape (rolls)', 'Roller covers', 'Roller frame / extension pole', 'Paint brushes', 'Paint trays / liners', 'Drop cloths / plastic sheeting', 'Sandpaper / patching materials', 'Other supplies'].map(name => ({name,quantity:0,unitPrice:0}));
  const defaults = () => ({supplies:defaultSupplies(),units:'ft',rooms:[room()],wallCoats:2,ceilingCoats:2,wallCoverage:350,ceilingCoverage:350,allowance:10,usePrimer:false,primerCoats:1,primerCoverage:300,tax:0,strategy:'cost',products:{wall:{prices:[18,45,210],enabled:[true,true,false],weight:11.5},ceiling:{prices:[15,35,160],enabled:[true,true,false],weight:11.5},primer:{prices:[12,30,135],enabled:[true,true,false],weight:11.5}}});
  let project = defaults(), result = null, timer;
  const expandedRooms = new WeakSet();
  const field = (label, path, value, min=0, max=100000, step='any') => `<label class="input-group">${label}<input type="number" data-path="${path}" value="${escape(value)}" min="${min}" max="${max}" step="${step}" required></label>`;
  function renderRooms() {
    const u = project.units === 'm' ? 'm' : 'ft';
    $('rooms').innerHTML = project.rooms.map((r,i) => `<details class="paint-room" data-room-index="${i}" ${expandedRooms.has(r)?'open':''}><summary class="paint-room-summary"><span class="paint-room-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span class="paint-room-caption"><strong id="room-title-${i}">${escape(r.name || `Room ${i+1}`)}</strong><span id="room-area-${i}">Edit measurements</span></span><span class="paint-room-edit" aria-hidden="true">Edit</span></summary><div class="paint-room-body"><div class="paint-room-head"><label class="input-group">Room / surface name<input maxlength="100" data-path="rooms.${i}.name" value="${escape(r.name)}"></label><button type="button" data-remove="${i}" ${project.rooms.length===1?'disabled':''} aria-label="Remove ${escape(r.name)}">Remove</button></div><label class="input-group">Measurement method<select data-path="rooms.${i}.mode"><option value="room" ${r.mode==='room'?'selected':''}>Rectangular room</option><option value="walls" ${r.mode==='walls'?'selected':''}>Total wall length / single wall</option></select></label><div class="paint-fields">${field(r.mode==='room'?`Room length (${u})`:`Total wall length (${u})`,`rooms.${i}.length`,r.length,.01,10000)}${r.mode==='room'?field(`Room width (${u})`,`rooms.${i}.width`,r.width,.01,10000):''}${field(`Wall height (${u})`,`rooms.${i}.height`,r.height,.01,10000)}${field(`Unpainted openings (${u}²)`,`rooms.${i}.openings`,r.openings,0,100000000)}</div><p class="paint-hint">Enter total door, window, and other unpainted wall area. Openings are deducted once, before coats.</p><label class="paint-check"><input type="checkbox" data-path="rooms.${i}.ceiling" ${r.ceiling?'checked':''}> Paint this ceiling</label>${r.ceiling&&r.mode==='walls'?field(`Ceiling area (${u}²)`,`rooms.${i}.ceilingArea`,r.ceilingArea,.01,100000000):''}</div></details>`).join('');
  }
  function render() {
    const focusedPath = document.activeElement?.dataset?.path;
    $('units').value = project.units; $('strategy').value = project.strategy; $('usePrimer').checked = project.usePrimer;
    renderRooms();
    $('finishFields').innerHTML = field('Wall paint coats','wallCoats',project.wallCoats,1,10,1)+field('Wall coverage (ft² / US gal)','wallCoverage',project.wallCoverage,1,2000)+field('Ceiling paint coats','ceilingCoats',project.ceilingCoats,1,10,1)+field('Ceiling coverage (ft² / US gal)','ceilingCoverage',project.ceilingCoverage,1,2000)+field('Extra / touch-up allowance (%)','allowance',project.allowance,0,100)+field('Sales tax (%)','tax',project.tax,0,100);
    $('supplyFields').innerHTML = project.supplies.map((item,i) => `<fieldset class="paint-product"><legend>${escape(item.name)}</legend><div class="paint-fields">${field('Quantity',`supplies.${i}.quantity`,item.quantity,0,10000,1)}${field('Price each (USD)',`supplies.${i}.unitPrice`,item.unitPrice,0,100000,.01)}</div></fieldset>`).join('');
    $('primerFields').hidden = !project.usePrimer;
    $('primerFields').innerHTML = field('Primer coats','primerCoats',project.primerCoats,1,10,1)+field('Primer coverage (ft² / US gal)','primerCoverage',project.primerCoverage,1,2000);
    $('productFields').innerHTML = Object.entries(labels).map(([id,label])=>`<fieldset class="paint-product" ${id==='primer'&&!project.usePrimer?'hidden':''}><legend>${label}</legend><div class="paint-fields">${['Quart (0.25 gal)','Gallon (1 gal)','Pail (5 gal)'].map((size,i)=>`<div><label class="paint-check"><input type="checkbox" data-path="products.${id}.enabled.${i}" ${project.products[id].enabled[i]?'checked':''}> ${size}</label>${field('Price (USD)',`products.${id}.prices.${i}`,project.products[id].prices[i],0,100000,.01)}</div>`).join('')}${field('Liquid weight (lb / gal)',`products.${id}.weight`,project.products[id].weight,.01,100)}</div></fieldset>`).join('');
    update();
    if (focusedPath) $("paintForm").querySelector(`[data-path="${focusedPath}"]`)?.focus();
  }
  function set(path,value) {
    const parts=path.split('.'); let target=project;
    parts.slice(0,-1).forEach(p=>{target=target[p];}); target[parts.at(-1)]=value;
  }
  function update() {
    clearTimeout(timer);
    try {
      result = PaintEngine.calculate(project);
      $('calcError').hidden = true;
      const areaFactor = project.units==='m'?PaintEngine.AREA_PER_M2:1;
      const unit = project.units==='m'?'m²':'ft²';
      result.rooms.forEach((r,i) => {
        $(`room-title-${i}`).textContent = r.name;
        $(`room-area-${i}`).textContent = `${fmt((r.wall+r.ceiling)/areaFactor)} ${unit} paintable${r.ceiling>0?' / includes ceiling':''}`;
      });
      const budget = [...Object.entries(labels).map(([id,label]) => [label,result.products.find(p=>p.id===id)?.cost || 0]), ['Supplies',result.suppliesSubtotal], ['Sales tax',result.taxCost]];
      const cans = p => p.counts.map((n,i)=>n?`${n} × ${['quart','gallon','5-gallon pail'][i]}${n>1?'s':''}`:'').filter(Boolean).join(' + ');
      $('resultsPanel').innerHTML = `<div class="paint-total"><span>Estimated materials + tax</span><strong>${money(result.total)}</strong><small>Project materials budget · USD</small></div><dl class="paint-budget">${budget.map(([label,cost])=>`<div><dt>${label}</dt><dd>${money(cost)}</dd></div>`).join('')}</dl><div class="paint-area-stats"><span>Net walls <b>${fmt(result.wall/areaFactor)} ${unit}</b></span><span>Ceilings <b>${fmt(result.ceiling/areaFactor)} ${unit}</b></span></div>`+result.products.filter(p=>p.needed>0).map(p=>`<article class="paint-shopping"><h4>${labels[p.id]} <span>${money(p.cost)}</span></h4><strong>${cans(p)}</strong><p>${fmt(p.needed)} gal needed → ${fmt(p.gallons)} gal to buy</p><p>${fmt(p.leftover)} gal leftover · ${p.coats} coat${p.coats>1?'s':''} · ${fmt(p.coverage)} ft²/gal</p></article>`).join('')+(result.supplies.some(item=>item.quantity>0)?`<article class="paint-shopping"><h4>Supplies <span>${money(result.suppliesSubtotal)}</span></h4>${result.supplies.filter(item=>item.quantity>0).map(item=>`<p>${escape(item.name)}: ${item.quantity} &times; ${money(item.unitPrice)} = <strong>${money(item.cost)}</strong></p>`).join('')}</article>`:'')+`<p>Liquid weight: <strong>${fmt(result.weight)} lb / ${fmt(result.weight*.45359237)} kg</strong></p><p class="paint-hint">Includes ${fmt(Number(project.allowance))}% allowance. Leftover is beyond that allowance. All products are rounded separately. Supply costs are included when entered. Labor and delivery are excluded.</p>`;
      $('roomBreakdown').innerHTML = `<div class="paint-table-scroll"><table><caption>Net paintable area before coats and allowance (${unit})</caption><thead><tr><th scope="col">Room / surface</th><th scope="col">Walls</th><th scope="col">Ceiling</th><th scope="col">Openings deducted</th></tr></thead><tbody>${result.rooms.map(r=>`<tr><th scope="row">${escape(r.name)}</th><td>${fmt(r.wall/areaFactor)}</td><td>${fmt(r.ceiling/areaFactor)}</td><td>${fmt(r.openings/areaFactor)}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">Total paintable</th><td>${fmt(result.wall/areaFactor)}</td><td>${fmt(result.ceiling/areaFactor)}</td><td>—</td></tr></tfoot></table></div>`;
      $('printBtn').disabled = $('csvBtn').disabled = false;
      timer = setTimeout(()=>{try{localStorage.setItem(storageKey,JSON.stringify(project));$('saveStatus').textContent='Project saved in this browser.';}catch{$('saveStatus').textContent='Browser saving is unavailable. Export your estimate to keep a copy.';}},400);
    } catch(e) {
      project.rooms.forEach((r,i) => { $(`room-title-${i}`).textContent = r.name || `Room ${i+1}`; $(`room-area-${i}`).textContent = 'Check project measurements'; });
      result = null; $('calcError').textContent=e.message; $('calcError').hidden=false;
      $('resultsPanel').innerHTML='<p>Complete the project details to see an updated estimate.</p>';
      $('roomBreakdown').textContent='The breakdown will appear when all measurements are valid.';
      $('printBtn').disabled=$('csvBtn').disabled=true;
      $('saveStatus').textContent='Changes with invalid or missing values have not been saved.';
    }
  }
  $('rooms').addEventListener('toggle', e => {
    const index = e.target.dataset.roomIndex;
    if (index === undefined || !e.target.isConnected) return;
    const selected = project.rooms[Number(index)];
    if (selected) { if (e.target.open) expandedRooms.add(selected); else expandedRooms.delete(selected); }
  }, true);
  $('paintForm').addEventListener('submit', e=>e.preventDefault());
  $('paintForm').addEventListener('input',e=>{
    const path=e.target.dataset.path; if(!path)return;
    set(path,e.target.type==='checkbox'?e.target.checked:e.target.value);
    if(e.target.tagName==='SELECT'||e.target.type==='checkbox') render(); else update();
  });
  $('units').addEventListener('change',()=>{
    const next=$('units').value; if(next===project.units)return;
    const multiplier=next==='m'?.3048:1/.3048;
    project.rooms.forEach(r=>{['length','width','height','openings','ceilingArea'].forEach(k=>{if(r[k]!==''&&Number.isFinite(Number(r[k])))r[k]=Number((Number(r[k])*multiplier**(['openings','ceilingArea'].includes(k)?2:1)).toPrecision(12));});});
    project.units=next;render();
  });
  $('strategy').addEventListener('change',()=>{project.strategy=$('strategy').value;update();});
  $('usePrimer').addEventListener('change',()=>{project.usePrimer=$('usePrimer').checked;render();});
  $('addRoom').addEventListener('click',()=>{if(project.rooms.length>=50)return;project.rooms.push({...room(),name:`Room ${project.rooms.length+1}`,...(project.units==='m'?{length:3.6576,width:3.048,height:2.4384,ceilingArea:11.1483648}:{})});expandedRooms.add(project.rooms[project.rooms.length-1]);render(); const names=$('rooms').querySelectorAll('input[data-path$=".name"]');names[names.length-1].focus();});
  $('rooms').addEventListener('click',e=>{const button=e.target.closest('[data-remove]');if(!button||project.rooms.length===1)return; const index=Number(button.dataset.remove);project.rooms.splice(index,1);expandedRooms.add(project.rooms[Math.min(index,project.rooms.length-1)]);render();$('rooms').querySelectorAll('input[data-path$=".name"]')[Math.min(index,project.rooms.length-1)].focus();});
  $('exampleBtn').addEventListener('click',()=>{project=defaults();project.rooms=[{...room(),name:'Living room',openings:42,ceiling:true},{...room(),name:'Bedroom',length:11,width:10,openings:36,ceiling:true}];project.usePrimer=true;expandedRooms.add(project.rooms[0]);render();});
  $('resetBtn').addEventListener('click',()=>{clearTimeout(timer);try{localStorage.removeItem(storageKey);}catch{}project=defaults();expandedRooms.add(project.rooms[0]);render();});
  $('printBtn').addEventListener('click',()=>{if(result)window.print();});
  $('csvBtn').addEventListener('click',()=>{
    if(!result)return;
    const rows=[['Paint project estimate'],['Dimensions',project.units],['Area unit','square feet'],['Allowance (%)',project.allowance],['Purchase preference',project.strategy],[],['Room','Net wall ft²','Ceiling ft²','Openings ft²'],...result.rooms.map(r=>[r.name,r.wall,r.ceiling,r.openings]),[],['Product','Coats','Coverage ft²/gal','Needed US gal','Buy US gal','Quart cans','Gallon cans','5-gallon pails','Leftover US gal','Material USD'],...result.products.map(p=>[labels[p.id],p.coats,p.coverage,p.needed,p.gallons,...p.counts,p.leftover,p.cost]),[],['Supply','Quantity','Unit price USD','Cost USD'],...result.supplies.filter(item=>item.quantity>0).map(item=>[item.name,item.quantity,item.unitPrice,item.cost]),[],['Paint subtotal USD',result.paintSubtotal],['Supplies subtotal USD',result.suppliesSubtotal],['Subtotal USD',result.subtotal],['Sales tax (%)',project.tax],['Tax USD',result.taxCost],['Total USD',result.total],['Liquid weight lb',result.weight],['Excludes labor, delivery, and container weight']];
    const quote=v=>'"'+String(typeof v==='string'&&/^[=+@\-\t\r]/.test(v)?"'"+v:v).replaceAll('"','""')+'"';
    const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(row=>row.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='paint-project-estimate.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved){PaintEngine.calculate(saved);project={...saved,supplies:saved.supplies??defaultSupplies()};}}catch{}
  expandedRooms.add(project.rooms[0]);
  render();
})();
