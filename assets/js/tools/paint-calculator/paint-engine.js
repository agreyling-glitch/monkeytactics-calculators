/* Pure project math shared by the browser and Node tests. */
(function (root) {
  'use strict';
  const AREA_PER_M2 = 10.763910416709722;
  function number(value, label, min = 0, max = 1000000, integer = false) {
    if (value === '' || value == null || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max || (integer && !Number.isInteger(Number(value)))) throw new Error(`${label}: enter ${integer ? 'a whole number' : 'a number'} from ${min} to ${max}.`);
    return Number(value);
  }
  function purchase(gallons, product, strategy) {
    const sizes = [0.25, 1, 5];
    const prices = product.prices.map((p) => Math.round(number(p, 'Container price', 0, 100000) * 100) / 100);
    const weight = number(product.weight, 'Liquid weight per gallon', 0.01, 100);
    const enabled = sizes.map((_, i) => Boolean(product.enabled[i]));
    if (!enabled.some(Boolean)) throw new Error('Enable at least one container size for each required product.');
    if (gallons > 100000) throw new Error('Project exceeds the 100,000 gallon planning limit. Split it into smaller projects.');
    const target = Math.ceil(gallons * 4 - 1e-9);
    let best = null;
    const units = [1, 4, 20];
    const active = units.map((u, i) => enabled[i] ? i : -1).filter(i => i >= 0);
    // Enumerate bounded counts of all sizes except the cheapest per quart.
    // An optimal plan never needs a full exchange cycle of a more expensive size.
    const base = active.reduce((a, b) => prices[a] / units[a] < prices[b] / units[b] ? a : b);
    const others = active.filter(i => i !== base);
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    const limit = i => units[base] / gcd(units[base], units[i]);
    const consider = counts => {
      const supplied = counts.reduce((s, n, i) => s + n * units[i], 0);
      const cost = Math.round(counts.reduce((s, n, i) => s + n * prices[i], 0) * 100) / 100;
      const cans = counts.reduce((a, b) => a + b, 0);
      const candidate = {counts, gallons: supplied / 4, cost, cans, leftover: supplied / 4 - gallons, weight: supplied / 4 * weight};
      const key = strategy === 'volume' ? [supplied, cost, cans] : [cost, supplied, cans];
      if (!best || key.some((v, i) => v < best.key[i] && key.slice(0, i).every((x, j) => x === best.key[j]))) best = {...candidate, key};
    };
    // For least volume, choose the smallest enabled unit as the base.
    if (strategy === 'volume') {
      const smallest = active[0];
      const max = Math.ceil(target / units[smallest]);
      // All enabled sizes divide each other, so exact minimal volume is known.
      const totalUnits = max * units[smallest];
      // Solve cost for that exact volume through the same cost planner, then
      // retain only combinations with the exact target (bounded enumeration).

      const costBase = base;
      const walk = (k, counts, used) => {
        if (k === others.length) {
          const remaining = totalUnits - used;
          if (remaining >= 0 && remaining % units[costBase] === 0) { counts[costBase] = remaining / units[costBase]; consider([...counts]); }
          return;
        }
        const i = others[k];
        for (let n = 0; n <= Math.min(Math.floor((totalUnits - used) / units[i]), limit(i)); n++) { counts[i] = n; walk(k + 1, counts, used + n * units[i]); }
      };
      walk(0, [0, 0, 0], 0);
    } else {
      const walk = (k, counts, used) => {
        if (k === others.length) { counts[base] = Math.max(0, Math.ceil((target - used) / units[base])); consider([...counts]); return; }
        const i = others[k];
        for (let n = 0; n <= Math.min(Math.ceil(target / units[i]), limit(i)); n++) { counts[i] = n; walk(k + 1, counts, used + n * units[i]); }
      };
      walk(0, [0, 0, 0], 0);
    }
    return best;
  }
  function calculate(project) {
    if (!['cost', 'volume'].includes(project.strategy)) throw new Error('Choose a purchase preference.');
    if (!['ft', 'm'].includes(project.units)) throw new Error('Choose feet or meters.');
    if (!Array.isArray(project.rooms) || !project.rooms.length || project.rooms.length > 50) throw new Error('Use between 1 and 50 rooms.');
    const factor = project.units === 'm' ? AREA_PER_M2 : 1;
    const rooms = project.rooms.map((r, i) => {
      const name = String(r.name || `Room ${i + 1}`).slice(0, 100);
      if (!['room', 'walls'].includes(r.mode)) throw new Error(`${name}: choose a measurement method.`);
      const length = number(r.length, `${name} length`, 0.01, 10000);
      const height = number(r.height, `${name} height`, 0.01, 10000);
      const width = r.mode === 'room' ? number(r.width, `${name} width`, 0.01, 10000) : 0;
      const gross = (r.mode === 'room' ? 2 * (length + width) : length) * height;
      const openings = number(r.openings, `${name} openings`, 0, 100000000);
      if (openings > gross) throw new Error(`${name}: openings exceed wall area.`);
      const ceiling = r.ceiling ? (r.mode === 'room' ? length * width : number(r.ceilingArea, `${name} ceiling area`, 0.01, 100000000)) : 0;
      return {name, wall: (gross - openings) * factor, ceiling: ceiling * factor, openings: openings * factor};
    });
    const allowance = number(project.allowance, 'Allowance', 0, 100);
    const tax = number(project.tax, 'Sales tax', 0, 100);
    const wall = rooms.reduce((s, r) => s + r.wall, 0), ceiling = rooms.reduce((s, r) => s + r.ceiling, 0);
    const specs = [['wall', wall, project.wallCoats, project.wallCoverage], ['ceiling', ceiling, project.ceilingCoats, project.ceilingCoverage]];
    if (project.usePrimer) specs.push(['primer', wall + ceiling, project.primerCoats, project.primerCoverage]);
    const products = specs.map(([id, area, coats, coverage]) => {
      coats = number(coats, `${id} coats`, 1, 10, true);
      coverage = number(coverage, `${id} coverage`, 1, 2000);
      const gallons = area * coats * (1 + allowance / 100) / coverage;
      return {id, area, coats, coverage, needed: gallons, ...(gallons > 0 ? purchase(gallons, project.products[id], project.strategy) : {counts: [0,0,0], gallons: 0, cost: 0, leftover: 0, weight: 0})};
    });
    const supplyInputs = project.supplies ?? [];
    if (!Array.isArray(supplyInputs) || supplyInputs.length > 30) throw new Error('Use no more than 30 supply items.');
    const supplies = supplyInputs.map((item, i) => {
      const name = String(item.name || `Supply ${i + 1}`).slice(0, 100);
      const quantity = number(item.quantity, `${name} quantity`, 0, 10000, true);
      const unitPrice = Math.round(number(item.unitPrice, `${name} unit price`, 0, 100000) * 100) / 100;
      return {name, quantity, unitPrice, cost: Math.round(quantity * unitPrice * 100) / 100};
    });
    const paintSubtotal = products.reduce((s, p) => s + p.cost, 0);
    const suppliesSubtotal = Math.round(supplies.reduce((s, item) => s + item.cost, 0) * 100) / 100;
    const subtotal = Math.round((paintSubtotal + suppliesSubtotal) * 100) / 100;
    const taxCost = Math.round(subtotal * tax) / 100;
    return {rooms, wall, ceiling, products, supplies, paintSubtotal, suppliesSubtotal, subtotal, taxCost, total: subtotal + taxCost, weight: products.reduce((s,p) => s+p.weight,0)};
  }
  const api = {calculate, purchase, AREA_PER_M2};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PaintEngine = api;
})(typeof globalThis === 'undefined' ? this : globalThis);

