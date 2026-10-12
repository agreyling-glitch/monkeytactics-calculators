(function(root){
'use strict';
function number(value,label,min=0,max=1e9){const n=Number(value);if(value===''||value==null||!Number.isFinite(n)||n<min||n>max)throw Error(label+' is outside the allowed range.');return n;}
function calculate(p){
 if(!['imperial','metric'].includes(p.units))throw Error('Choose valid units.');
 if(!Array.isArray(p.boards)||!p.boards.length||p.boards.length>50)throw Error('Add between 1 and 50 board sizes.');
 const waste=number(p.waste,'Waste',0,100),tax=number(p.tax,'Tax',0,100),metric=p.units==='metric';
 const rows=p.boards.map((b,i)=>{const label='Board '+(i+1);const t=number(b.thickness,label+' purchasing thickness',.0001)/ (metric?25.4:1),w=number(b.width,label+' purchasing width',.0001)/(metric?25.4:1),l=number(b.length,label+' length',.0001)/(metric?.3048:1),at=number(b.actualThickness,label+' actual thickness',.0001)/(metric?25.4:1),aw=number(b.actualWidth,label+' actual width',.0001)/(metric?25.4:1),quantity=number(b.quantity,label+' quantity',1,1e6),price=number(b.price,label+' price',0,1e6),density=number(b.density,label+' density',.0001,2000);
 if(!Number.isInteger(quantity))throw Error(label+' quantity must be a whole number.');if(!['board','bf'].includes(b.pricing))throw Error(label+' needs a pricing method.');
 const order=Math.ceil(quantity*(1+waste/100)-1e-10);if(order>1e6)throw Error(label+' order exceeds one million boards.');const perBoard=t*w*l/12,bf=perBoard*order,volume=at*aw*l/144*order,cost=Math.round((b.pricing==='bf'?bf:order)*price*100)/100;
 return {name:String(b.name||label).slice(0,100),quantity,order,extra:order-quantity,perBoard,bf,volume,weight:volume*density,cost};});
 const sum=key=>rows.reduce((a,r)=>a+r[key],0),subtotal=Math.round(sum('cost')*100)/100,taxCost=Math.round(subtotal*tax)/100;
 return {rows,boards:sum('order'),extra:sum('extra'),bf:sum('bf'),volume:sum('volume'),weight:sum('weight'),subtotal,taxCost,total:Math.round((subtotal+taxCost)*100)/100};
}
function convertUnits(p,units){if(p.units===units)return p;if(!['imperial','metric'].includes(units))throw Error('Invalid units');const toMetric=units==='metric';p.boards.forEach(b=>{for(const key of ['thickness','width','actualThickness','actualWidth'])b[key]=Number(b[key])*(toMetric?25.4:1/25.4);b.length=Number(b.length)*(toMetric?.3048:1/.3048);});p.units=units;return p;}
const api={calculate,convertUnits};if(typeof module==='object'&&module.exports)module.exports=api;root.LumberEngine=api;
})(typeof globalThis==='object'?globalThis:this);
