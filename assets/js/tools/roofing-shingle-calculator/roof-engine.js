(function(root){
  'use strict';
  const SQFT_PER_M2=10.763910416709722;
  function num(value,label,min=0,max=1000000,integer=false){
    const n=Number(value);
    if(value===''||value==null||!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw new Error(`${label}: enter ${integer?'a whole number':'a number'} from ${min} to ${max}.`);
    return n;
  }
  const cash=n=>Math.round((n+Number.EPSILON)*100)/100;
  const up=n=>n>0?Math.max(1,Math.ceil(n-1e-10*Math.max(1,n))):0;
  function calculate(p){
    if(!['ft','m'].includes(p.units))throw new Error('Choose feet or meters.');
    if(!Array.isArray(p.sections)||!p.sections.length||p.sections.length>50)throw new Error('Use between 1 and 50 roof sections.');
    const factor=p.units==='m'?SQFT_PER_M2:1;
    const sections=p.sections.map((s,i)=>{
      const name=String(s.name||`Section ${i+1}`).slice(0,100);
      if(!['footprint','surface'].includes(s.mode))throw new Error(`${name}: choose horizontal footprint or measured roof area.`);
      const area=num(s.area,`${name} area`,.001,100000000);
      const deduction=num(s.deduction,`${name} excluded area`,0,100000000);
      if(deduction>area)throw new Error(`${name}: exclusions exceed entered area.`);
      // Measured roof areas never use pitch, including a stale hidden pitch.
      const rise=s.mode==='footprint'?num(s.pitch,`${name} pitch rise`,0,36):null;
      const slope=rise===null?1:Math.hypot(12,rise)/12;
      const waste=num(s.waste,`${name} waste`,0,100);
      const roof=(area-deduction)*factor*slope;
      return {name,mode:s.mode,inputArea:area*factor,deduction:deduction*factor,pitch:rise,slope,roof,waste,target:roof*(1+waste/100)};
    });
    const roof=sections.reduce((n,s)=>n+s.roof,0),target=sections.reduce((n,s)=>n+s.target,0);
    if(!['square','coverage'].includes(p.product.mode))throw new Error('Choose a shingle coverage method.');
    const coverage=p.product.mode==='square'?100/num(p.product.bundlesPerSquare,'Bundles per roofing square',.1,100):num(p.product.coverage,'Bundle coverage (ft²)',.001,100000);
    const bundlePrice=cash(num(p.product.price,'Price per bundle',0,100000));
    const bundleWeight=num(p.product.weight,'Weight per bundle (lb)',0,10000);
    const bundles=up(target/coverage);
    if(bundles>1000000)throw new Error('Split this project into smaller orders (maximum one million bundles).');
    const starterLength=num(p.starterLength,'Starter edge length',0,1000000)*(p.units==='m'?1/.3048:1);
    const capLength=num(p.capLength,'Ridge and hip cap length',0,1000000)*(p.units==='m'?1/.3048:1);
    if(!Array.isArray(p.supplies)||p.supplies.length>30)throw new Error('Use no more than 30 supply items.');
    const supplies=p.supplies.filter(s=>s.enabled).map((s,i)=>{
      const name=String(s.name||`Supply ${i+1}`).slice(0,100);
      if(!['roof','starter','cap','manual'].includes(s.mode))throw new Error(`${name}: choose a quantity method.`);
      const allowance=s.mode==='manual'?0:num(s.allowance,`${name} allowance`,0,100);
      const base=s.mode==='roof'?roof:s.mode==='starter'?starterLength:s.mode==='cap'?capLength:0;
      const coverage=s.mode==='manual'?null:num(s.coverage,`${name} package coverage`,.001,1000000);
      const quantity=s.mode==='manual'?num(s.quantity,`${name} quantity`,0,1000000,true):up(base*(1+allowance/100)/coverage);
      if(quantity>1000000)throw new Error(`${name}: split this order into smaller projects.`);
      const price=cash(num(s.price,`${name} package price`,0,100000));
      return {name,mode:s.mode,base,coverage,allowance,quantity,price,cost:cash(quantity*price)};
    });
    const tax=num(p.tax,'Sales tax',0,100),shingleCost=cash(bundles*bundlePrice),supplyCost=cash(supplies.reduce((n,s)=>n+s.cost,0));
    const subtotal=cash(shingleCost+supplyCost),taxCost=cash(subtotal*tax/100);
    return {sections,roof,target,squares:target/100,coverage,bundles,supplied:bundles*coverage,surplus:Math.max(0,bundles*coverage-target),bundlePrice,bundleWeight,weight:bundles*bundleWeight,starterLength,capLength,supplies,shingleCost,supplyCost,subtotal,taxCost,total:cash(subtotal+taxCost)};
  }
  function convertUnits(p,next){
    if(!['ft','m'].includes(next))throw new Error('Choose feet or meters.');
    if(next===p.units)return;
    const factor=next==='m'?.3048:1/.3048;
    const convert=(object,key,power)=>{if(object[key]!==''&&Number.isFinite(Number(object[key])))object[key]=Number((Number(object[key])*factor**power).toPrecision(12));};
    p.sections.forEach(s=>{convert(s,'area',2);convert(s,'deduction',2);});
    convert(p,'starterLength',1);convert(p,'capLength',1);p.units=next;
  }
  const api={calculate,convertUnits,SQFT_PER_M2};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RoofEngine=api;
})(globalThis);
