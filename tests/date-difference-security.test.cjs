const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('tools/date-difference-calculator.html', 'utf8');
function setup() {
  const context = vm.createContext({});
  const dates = source.slice(source.indexOf('  function parseDateInput('), source.indexOf('  function fmtDateLong('));
  const phases = source.slice(source.indexOf('  function escapeHTML('), source.indexOf("  phaseList.addEventListener('input'"));
  vm.runInContext(`let phaseIdCounter = 0; let workPhases = []; const workStart = {value:'2026-10-21'}; const today = new Date(2026,9,21); const PHASE_COLORS = ['#abcdef']; const addDays = (d,n) => new Date(d.getFullYear(), d.getMonth(), d.getDate()+n); const phaseList = {innerHTML:'', querySelector:()=>({querySelector:()=>({value:''})})}; ${dates} ${phases}`, context);
  return code => vm.runInContext(code, context);
}
test('untrusted fields cannot override internal IDs or inject phase markup', () => {
  const run = setup();
  const payload = '\"><img src=x onerror="globalThis.compromised=true">';
  for (const field of ['id','name','start','end','buffer','gap','region','color','dependencyId','dependencyRule']) {
    run(`workPhases = [newPhase(${JSON.stringify({[field]:payload})})]; renderPhaseEditor();`);
    assert.equal(run('phaseList.innerHTML.includes("<img")'), false, field);
    assert.match(run('workPhases[0].id'), /^phase-\d+$/);
  }
});
test('invalid types, dates, enums, ranges and unknown properties normalize safely', () => {
  const run = setup();
  for (const input of [null, [], 4, 'text', {name:{},start:'2026-02-30',end:'bad',buffer:91,gap:0,color:'#fff',region:'bad',dependencyRule:'bad',extra:'x'}]) {
    const phase = JSON.parse(run(`JSON.stringify(newPhase(${JSON.stringify(input)}))`));
    assert.equal(phase.start,'2026-10-21');
    assert.equal(phase.end,'2026-10-27');
    assert.equal(phase.buffer,0); assert.equal(phase.gap,1);
    assert.equal(phase.color,'#abcdef'); assert.equal(phase.region,'inherit');
    assert.equal(phase.dependencyId,''); assert.equal(phase.dependencyRule,'none');
    assert.equal(phase.extra,undefined);
  }
  assert.equal(run(`newPhase({name:'a'.repeat(100)}).name.length`),60);
});
test('valid shared plans preserve fields and restore earlier dependencies using local IDs', () => {
  const run = setup();
  const restore = source.slice(source.indexOf("    if (params.has('phases'))"), source.indexOf("    if (params.has('rstart'))"));
  const saved = [{id:'attacker',name:'Design',start:'2026-10-01',end:'2026-10-09',buffer:3,gap:2,color:'#123ABC',region:'us',dependencyRule:'none'}, {name:'Build',dependencyIndex:0,dependencyRule:'next-business'}];
  run(`const params = {has:()=>true,get:()=>${JSON.stringify(JSON.stringify(saved))}};`);
  run(restore);
  assert.equal(run('workPhases[1].dependencyId'),run('workPhases[0].id'));
  assert.equal(run('workPhases[0].name'),'Design');
  assert.equal(run('workPhases[0].color'),'#123ABC');
  assert.equal(run('workPhases[0].buffer'),3);
  assert.equal(run('workPhases[0].start'),'2026-10-01');
  assert.notEqual(run('workPhases[0].id'),'attacker');
});
