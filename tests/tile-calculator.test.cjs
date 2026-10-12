const test=require('node:test');
const assert=require('node:assert/strict');
const {calculate,convertUnits,SQFT_PER_M2}=require('../assets/js/tools/tile-calculator/tile-engine.js');
const product=()=>({name:'Example',units:'in',mode:'dimensions',length:12,width:12,perBox:15,coverage:15,price:45,weight:57});
const project=()=>({units:'ft',surfaces:[{name:'Floor',type:'floor',length:12,width:10,deduction:0,waste:10}],products:{floor:product(),wall:product()},supplies:[],tax:0});
test('known floor example buys nine cartons with 135 pieces and a $405 subtotal',()=>{
 const r=calculate(project()),p=r.products[0];assert.equal(r.area,120);assert.equal(p.target,132);assert.equal(p.tiles,132);assert.equal(p.boxes,9);assert.equal(p.boxedTiles,135);assert.equal(p.extraPieces,3);assert.equal(p.surplus,3);assert.equal(p.cost,405);assert.equal(r.weight,513);assert.equal(r.total,405);
});
test('combines same-product surfaces before rounding but keeps floor and wall orders separate',()=>{
 const p=project();p.surfaces=[{name:'A',type:'floor',length:2,width:2,deduction:0,waste:0},{name:'B',type:'floor',length:2,width:2,deduction:0,waste:0},{name:'Wall',type:'wall',length:2,width:2,deduction:0,waste:0}];const r=calculate(p);assert.equal(r.products[0].boxes,1);assert.equal(r.products[1].boxes,1);assert.equal(r.total,90);
});
test('deducts excluded areas before applying each surface allowance',()=>{
 const p=project();p.surfaces[0].deduction=20;p.surfaces[0].waste=15;const r=calculate(p);assert.equal(r.area,100);assert.ok(Math.abs(r.target-115)<1e-10);assert.equal(r.products[0].boxes,8);
});
test('carton coverage overrides dimensions and defines effective coverage per piece',()=>{
 const p=project();p.products.floor.mode='coverage';p.products.floor.coverage=14;const r=calculate(p).products[0];assert.equal(r.boxes,10);assert.equal(r.tiles,142);assert.equal(r.boxedTiles,150);assert.equal(r.supplied,140);
});
test('metric surface conversion and inch/mm product conversion preserve the order',()=>{
 const p=project(),before=calculate(p);convertUnits(p,'m');const after=calculate(p);assert.equal(after.products[0].boxes,before.products[0].boxes);assert.ok(Math.abs(after.area-before.area)<1e-8);convertUnits(p,'ft');assert.ok(Math.abs(p.surfaces[0].length-12)<1e-8);
 p.products.floor.units='mm';p.products.floor.length=304.8;p.products.floor.width=304.8;assert.equal(calculate(p).products[0].boxes,before.products[0].boxes);
});
test('supplies use net area, independent allowance, selected scope and full packages',()=>{
 const p=project();p.surfaces[0].waste=50;p.surfaces.push({name:'Wall',type:'wall',length:10,width:5,deduction:0,waste:20});p.supplies=[{enabled:true,name:'Adhesive',mode:'coverage',scope:'floor',coverage:50,allowance:10,price:25},{enabled:true,name:'Grout',mode:'coverage',scope:'all',coverage:100,allowance:0,price:18},{enabled:true,name:'Spacers',mode:'manual',scope:'all',quantity:2,price:6.5},{enabled:false,name:'Disabled',mode:'coverage',coverage:0}];p.tax=8.25;const r=calculate(p);assert.deepEqual(r.supplies.map(s=>s.quantity),[3,2,2]);assert.equal(r.supplyCost,124);assert.equal(r.taxCost,Math.round(r.subtotal*8.25)/100);
});
test('zero net surface area buys no tiles and no coverage-based supplies',()=>{
 const p=project();p.surfaces[0].deduction=120;p.supplies=[{enabled:true,name:'Adhesive',mode:'coverage',scope:'all',coverage:50,allowance:10,price:25}];const r=calculate(p);assert.equal(r.total,0);assert.equal(r.products[0].boxes,0);assert.equal(r.supplies[0].quantity,0);
});
test('rejects invalid measurements, product counts, coverage and supply input',()=>{
 for(const mutate of [p=>p.surfaces[0].length='',p=>p.surfaces[0].width=-1,p=>p.surfaces[0].deduction=121,p=>p.surfaces[0].waste=Infinity,p=>p.products.floor.perBox=1.5,p=>{p.products.floor.mode='coverage';p.products.floor.coverage=0;},p=>p.tax=-1,p=>p.supplies=[{enabled:true,name:'Spacers',mode:'manual',scope:'all',quantity:1.5,price:5}]]){const p=project();mutate(p);assert.throws(()=>calculate(p));}
});
test('exact carton boundaries do not overbuy after metric conversion',()=>{
 const p=project();p.surfaces[0]={name:'Floor',type:'floor',length:15,width:1,deduction:0,waste:0};assert.equal(calculate(p).products[0].boxes,1);convertUnits(p,'m');assert.equal(calculate(p).products[0].boxes,1);
});
test('orders cover target area with the minimum whole carton count',()=>{
 let seed=531;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
 for(let i=0;i<300;i++){const p=project();p.surfaces[0].length=1+rand()*100;p.surfaces[0].width=1+rand()*100;p.surfaces[0].waste=rand()*30;p.products.floor.mode='coverage';p.products.floor.coverage=1+rand()*50;const r=calculate(p).products[0];assert.ok(r.supplied+1e-7>=r.target);assert.ok((r.boxes-1)*r.coverage<r.target+1e-7);assert.ok(r.extraPieces>=0);}
});
const vm=require('node:vm'),fs=require('node:fs');
test('controller renders, handles invalid inputs, changes units, includes supplies and exports',()=>{
 const nodes=new Map(),listeners=new Map(),saved=new Map();let download,printed=false;
 const get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',innerHTML:'',textContent:'',dataset:{},addEventListener(event,fn){listeners.set(id+':'+event,fn);},querySelector(){return null;},querySelectorAll(){return [{focus(){}}];},focus(){}});return nodes.get(id);};
 const context={document:{getElementById:get,createElement(){download={click(){},remove(){}};return download;},body:{append(){}}},TileEngine:{calculate,convertUnits,SQFT_PER_M2},Intl,localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},setTimeout:fn=>{fn();return 1;},clearTimeout(){},window:{print(){printed=true;}},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},Blob};
 vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/tools/tile-calculator/tile-calculator.js'),'utf8'),context);
 const fire=(id,event,target={})=>listeners.get(id+':'+event)({target,preventDefault(){}});
 assert.match(get('resultsPanel').innerHTML,/9 boxes/);assert.equal(saved.size,1);
 fire('tileForm','input',{dataset:{path:'surfaces.0.length'},type:'number',value:''});assert.equal(get('calcError').hidden,false);assert.equal(get('csvBtn').disabled,true);
 fire('tileForm','input',{dataset:{path:'surfaces.0.length'},type:'number',value:'12'});assert.equal(get('calcError').hidden,true);
 get('units').value='m';fire('units','change');assert.match(get('surfaceBreakdown').innerHTML,/m²/);
 fire('exampleBtn','click');assert.match(get('surfaceBreakdown').innerHTML,/Shower wall/);assert.match(get('resultsPanel').innerHTML,/Adhesive/);
 fire('tileForm','input',{dataset:{path:'surfaces.0.name'},type:'text',value:'<img src=x>'});assert.match(get('surfaceBreakdown').innerHTML,/&lt;img/);assert.doesNotMatch(get('surfaceBreakdown').innerHTML,/<img/);
 fire('csvBtn','click');assert.equal(download.download,'tile-project-estimate.csv');fire('printBtn','click');assert.equal(printed,true);
 fire('addSurface','click');assert.match(get('surfaces').innerHTML,/data-surface-index="2"/);
 fire('resetBtn','click');assert.doesNotMatch(get('surfaceBreakdown').innerHTML,/Shower wall/);
});
