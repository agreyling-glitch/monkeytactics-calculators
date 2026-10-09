const test = require('node:test');
const assert = require('node:assert/strict');
const {calculate,purchase,AREA_PER_M2} = require('../assets/js/tools/paint-calculator/paint-engine.js');
const product = {prices:[18,45,210],enabled:[true,true,true],weight:11.5};
const project = () => ({units:'ft',rooms:[{name:'Room',mode:'room',length:12,width:10,height:8,openings:42,ceiling:true}],wallCoats:2,ceilingCoats:1,wallCoverage:350,ceilingCoverage:400,allowance:10,tax:8.25,usePrimer:true,primerCoats:1,primerCoverage:300,strategy:'cost',products:{wall:product,ceiling:product,primer:product}});
test('deducts openings before coats and keeps ceiling and primer purchases separate',()=>{
 const r=calculate(project());assert.equal(r.wall,310);assert.equal(r.ceiling,120);
 assert.ok(Math.abs(r.products[0].needed-310*2*1.1/350)<1e-10);
 assert.ok(Math.abs(r.products[2].needed-430*1.1/300)<1e-10);
 assert.equal(r.products.length,3);assert.equal(r.taxCost,Math.round(r.subtotal*8.25)/100);
});
test('metric dimensions preserve project quantities',()=>{
 const p=project(), a=calculate(p);p.units='m';p.rooms[0].length*=.3048;p.rooms[0].width*=.3048;p.rooms[0].height*=.3048;p.rooms[0].openings*=.3048**2;
 const b=calculate(p);assert.ok(Math.abs(a.wall-b.wall)<1e-9);assert.equal(a.total,b.total);
});
test('total wall mode supports manual ceilings and multiple room totals',()=>{
 const p=project();p.rooms.push({name:'Hall',mode:'walls',length:20,height:9,openings:20,ceiling:true,ceilingArea:45});const r=calculate(p);assert.equal(r.wall,470);assert.equal(r.ceiling,165);
});
test('rejects missing, nonfinite, negative, and impossible inputs',()=>{
 for(const change of [p=>p.rooms[0].length='',p=>p.rooms[0].openings=999,p=>p.wallCoats=1.5,p=>p.wallCoverage=0,p=>p.tax=-1,p=>p.rooms[0].height=Infinity,p=>p.products={wall:{...product,enabled:[false,false,false]}}]) {const p=project();change(p);assert.throws(()=>calculate(p));}
});
test('zero paintable area needs no containers',()=>{const p=project();p.rooms[0].openings=352;p.rooms[0].ceiling=false;const r=calculate(p);assert.equal(r.total,0);assert.equal(r.weight,0);});
test('planner agrees with exhaustive search across enabled sizes, prices and preferences',()=>{
 for(const prices of [[18,45,210],[1,100,1000],[100,1,100],[100,100,1],[0,0,0],[4.99,19.96,99.8]])for(let mask=1;mask<8;mask++)for(const gallons of [.01,.25,.26,1,1.01,4.9,5,5.01,8.7])for(const strategy of ['cost','volume']) {
  const p={...product,prices,enabled:[1,2,4].map(bit=>Boolean(mask&bit))}; const actual=purchase(gallons,p,strategy);let best;
  for(let q=0;q<=Math.ceil(gallons*4)+20;q++)for(let g=0;g<=Math.ceil(gallons)+5;g++)for(let b=0;b<=Math.ceil(gallons/5)+1;b++){
   if((q&&!p.enabled[0])||(g&&!p.enabled[1])||(b&&!p.enabled[2]))continue;
   const volume=q*.25+g+b*5;if(volume+1e-9<gallons)continue;
   const cost=Math.round((q*prices[0]+g*prices[1]+b*prices[2])*100)/100;
   const key=strategy==='cost'?[cost,volume,q+g+b]:[volume,cost,q+g+b];
   if(!best||key.some((v,i)=>v<best[i]&&key.slice(0,i).every((x,j)=>x===best[j])))best=key;
  }
  assert.deepEqual(strategy==='cost'?[actual.cost,actual.gallons,actual.cans]:[actual.gallons,actual.cost,actual.cans],best,JSON.stringify({prices,mask,gallons,strategy}));
 }
});
test('exact container boundaries avoid floating point overbuying',()=>{assert.equal(purchase(1+1e-12,product,'volume').gallons,1);});
const vm = require('node:vm');
const fs = require('node:fs');
test('controller updates estimates, invalid states, units, saved projects and exports',()=>{
 const nodes=new Map(), listeners=new Map(), saved=new Map();let download, printed=false;
 const get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',innerHTML:'',textContent:'',dataset:{},addEventListener(event,fn){listeners.set(id+':'+event,fn);},querySelector(){return null;},querySelectorAll(){return [{focus(){}}];},focus(){}});return nodes.get(id);};
 const context={document:{getElementById:get,createElement(){download={click(){},remove(){}};return download;},body:{append(){}}},PaintEngine:{calculate,purchase,AREA_PER_M2},Intl,localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},setTimeout:fn=>{fn();return 1;},clearTimeout(){},window:{print(){printed=true;}},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},Blob};
 vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/tools/paint-calculator/paint-calculator.js'),'utf8'),context);
 const fire=(id,event,target={})=>listeners.get(id+':'+event)({target,preventDefault(){}});
 assert.match(get('resultsPanel').innerHTML,/Wall paint/);assert.equal(saved.size,1);
 fire('paintForm','input',{dataset:{path:'rooms.0.length'},type:'number',value:''});assert.equal(get('calcError').hidden,false);assert.equal(get('csvBtn').disabled,true);
 fire('paintForm','input',{dataset:{path:'rooms.0.length'},type:'number',value:'12'});assert.equal(get('calcError').hidden,true);
 get('units').value='m';fire('units','change');assert.match(get('roomBreakdown').innerHTML,/m²/);assert.match(get('rooms').innerHTML,/3.6576/);
 fire('exampleBtn','click');assert.match(get('roomBreakdown').innerHTML,/Living room/);assert.match(get('resultsPanel').innerHTML,/Primer/);
 fire('paintForm','input',{dataset:{path:'rooms.0.name'},type:'text',value:'<img src=x onerror=alert(1)>'});assert.match(get('roomBreakdown').innerHTML,/&lt;img/);assert.doesNotMatch(get('roomBreakdown').innerHTML,/<img/);
 fire('csvBtn','click');assert.equal(download.download,'paint-project-estimate.csv');fire('printBtn','click');assert.equal(printed,true);
 fire('addRoom','click');assert.match(get('rooms').innerHTML,/data-room-index="2"/);
 fire('resetBtn','click');assert.doesNotMatch(get('roomBreakdown').innerHTML,/Living room/);
});
test('supply quantities contribute to subtotal and tax without changing paint requirements',()=>{
 const p=project(), before=calculate(p);
 p.supplies=[{name:'Masking tape',quantity:3,unitPrice:6.5},{name:'Rollers',quantity:2,unitPrice:8.99},{name:'Owned brush',quantity:0,unitPrice:20}];
 const after=calculate(p);
 assert.equal(after.suppliesSubtotal,37.48);
 assert.equal(after.subtotal,Math.round((before.subtotal+37.48)*100)/100);
 assert.equal(after.taxCost,Math.round(after.subtotal*8.25)/100);
 assert.deepEqual(after.products,before.products);assert.equal(after.weight,before.weight);
});
test('supply fields reject missing prices, negative quantities and fractional item counts',()=>{
 for(const item of [{quantity:-1,unitPrice:5},{quantity:1.5,unitPrice:5},{quantity:1,unitPrice:''},{quantity:1,unitPrice:Infinity}]){
  const p=project();p.supplies=[{name:'Tape',...item}];assert.throws(()=>calculate(p));
 }
});
