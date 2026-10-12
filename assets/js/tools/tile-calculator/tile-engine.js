(function (root) {
  'use strict';
  const SQFT_PER_M2 = 10.763910416709722;
  const TYPES = ['floor', 'wall'];
  function numeric(value, label, min = 0, max = 1000000, integer = false) {
    const n = Number(value);
    if (value === '' || value == null || !Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
      throw new Error(`${label}: enter ${integer ? 'a whole number' : 'a number'} from ${min} to ${max}.`);
    }
    return n;
  }
  const cents = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const roundUp = n => Math.ceil(n - 1e-9 * Math.max(1, Math.abs(n)));
  function calculate(project) {
    if (!['ft', 'm'].includes(project.units)) throw new Error('Choose feet or meters.');
    if (!Array.isArray(project.surfaces) || !project.surfaces.length || project.surfaces.length > 50) throw new Error('Use between 1 and 50 surfaces.');
    const factor = project.units === 'm' ? SQFT_PER_M2 : 1;
    const tax = numeric(project.tax, 'Sales tax', 0, 100);
    const surfaces = project.surfaces.map((s, i) => {
      const name = String(s.name || `Surface ${i + 1}`).slice(0, 100);
      if (!TYPES.includes(s.type)) throw new Error(`${name}: choose floor or wall tile.`);
      const length = numeric(s.length, `${name} length`, 0.001, 10000);
      const width = numeric(s.width, `${name} width / height`, 0.001, 10000);
      const deduction = numeric(s.deduction, `${name} deductions`, 0, 100000000);
      if (deduction > length * width) throw new Error(`${name}: deductions exceed surface area.`);
      const waste = numeric(s.waste, `${name} waste`, 0, 100);
      const area = (length * width - deduction) * factor;
      return {name, type:s.type, area, deduction:deduction * factor, waste, target:area * (1 + waste / 100)};
    });
    const products = TYPES.map(id => {
      const p = project.products[id];
      if (!p || !['in','mm'].includes(p.units) || !['dimensions','coverage'].includes(p.mode)) throw new Error(`${id}: choose tile units and carton coverage method.`);
      const name = String(p.name || `${id} tile`).slice(0, 100);
      const tileLength = numeric(p.length, `${id} tile length`, 0.1, 10000);
      const tileWidth = numeric(p.width, `${id} tile width`, 0.1, 10000);
      const tileArea = p.units === 'in' ? tileLength * tileWidth / 144 : tileLength * tileWidth / 1000000 * SQFT_PER_M2;
      const perBox = numeric(p.perBox, `${id} tiles per box`, 1, 100000, true);
      const coverage = p.mode === 'coverage' ? numeric(p.coverage, `${id} carton coverage (ft²)`, .001, 100000) : tileArea * perBox;
      const boxPrice = cents(numeric(p.price, `${id} price per box`, 0, 100000));
      const boxWeight = numeric(p.weight, `${id} weight per box (lb)`, 0, 10000);
      const grouped = surfaces.filter(s => s.type === id);
      const area = grouped.reduce((n,s) => n+s.area,0);
      const target = grouped.reduce((n,s) => n+s.target,0);
      const boxes = target > 0 ? Math.max(1,roundUp(target / coverage)) : 0;
      if (boxes > 1000000) throw new Error(`${id}: split this project into smaller orders (maximum one million boxes).`);
      const supplied = boxes * coverage;
      // When label coverage overrides nominal dimensions, use the label's
      // implied coverage per piece so tile counts and carton counts agree.
      const tiles = target > 0 ? Math.max(1,roundUp(target / (coverage / perBox))) : 0;
      return {id,name,area,target,coverage,perBox,tileArea,tiles,boxes,boxedTiles:boxes*perBox,supplied,surplus:Math.max(0,supplied-target),extraPieces:boxes*perBox-tiles,cost:cents(boxes*boxPrice),boxPrice,boxWeight,weight:boxes*boxWeight,mode:p.mode};
    });
    const inputs = project.supplies || [];
    if (!Array.isArray(inputs) || inputs.length > 30) throw new Error('Use no more than 30 supply items.');
    const supplies = inputs.filter(s => s.enabled).map((s, i) => {
      const name = String(s.name || `Supply ${i+1}`).slice(0,100);
      if (!['manual','coverage'].includes(s.mode) || !['all','floor','wall'].includes(s.scope)) throw new Error(`${name}: choose a quantity method and surface group.`);
      const price = cents(numeric(s.price, `${name} package price`,0,100000));
      const coverage = s.mode === 'coverage' ? numeric(s.coverage, `${name} package coverage (ft²)`,.001,100000) : null;
      const allowance = s.mode === 'coverage' ? numeric(s.allowance, `${name} allowance`,0,100) : 0;
      const area = surfaces.filter(a => s.scope === 'all' || a.type === s.scope).reduce((n,a) => n+a.area,0);
      const quantity = s.mode === 'coverage' ? (area > 0 ? Math.max(1,roundUp(area*(1+allowance/100)/coverage)) : 0) : numeric(s.quantity,`${name} quantity`,0,1000000,true);
      if (quantity > 1000000) throw new Error(`${name}: split this project into smaller supply orders.`);
      return {name,quantity,price,cost:cents(quantity*price),mode:s.mode,scope:s.scope,coverage,allowance,area};
    });
    const tileCost = cents(products.reduce((n,p)=>n+p.cost,0));
    const supplyCost = cents(supplies.reduce((n,s)=>n+s.cost,0));
    const subtotal = cents(tileCost+supplyCost), taxCost = cents(subtotal*tax/100);
    return {surfaces,products,supplies,tileCost,supplyCost,subtotal,taxCost,total:cents(subtotal+taxCost),area:surfaces.reduce((n,s)=>n+s.area,0),target:surfaces.reduce((n,s)=>n+s.target,0),weight:products.reduce((n,p)=>n+p.weight,0)};
  }
  function convertUnits(project, next) {
    if (!['ft','m'].includes(next)) throw new Error('Choose feet or meters.');
    if (next === project.units) return;
    const factor = next === 'm' ? .3048 : 1/.3048;
    project.surfaces.forEach(s => ['length','width','deduction'].forEach(key => {
      if (s[key] !== '' && Number.isFinite(Number(s[key]))) s[key] = Number((Number(s[key])*factor**(key==='deduction'?2:1)).toPrecision(12));
    }));
    project.units = next;
  }
  const api = {calculate,convertUnits,SQFT_PER_M2};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TileEngine = api;
})(globalThis);
