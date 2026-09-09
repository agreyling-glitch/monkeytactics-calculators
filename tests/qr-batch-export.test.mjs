import assert from 'node:assert/strict';
import test from 'node:test';
import { createStoredZip, createStoredZipAsync } from '../apps/qr-studio/src/utils/batchZip.ts';
import { allocateBatchName } from '../apps/qr-studio/src/utils/batchFilenames.ts';

test('allocates names safely across collisions and Windows reserved names', () => {
 const used = new Set(['thumbnail-contact-sheet']);
 assert.equal(allocateBatchName('Menu',used),'Menu');
 assert.equal(allocateBatchName('menu',used),'menu-2');
 assert.equal(allocateBatchName('menu-2',used),'menu-2-2');
 assert.equal(allocateBatchName('CON',used),'qr-CON');
 assert.equal(allocateBatchName('thumbnail-contact-sheet',used),'thumbnail-contact-sheet-2');
});

test('sync and async ZIPs preserve Unicode names, data, CRC and directory offsets',async () => {
 const bytes = new TextEncoder().encode('123456789');
 const entries = [{name:'Café.svg',bytes},{name:'東京.png',bytes:new Uint8Array([0,1,255])}];
 const sync = createStoredZip(entries);
 const progress=[];
 assert.deepEqual(await createStoredZipAsync(entries,(n)=>progress.push(n)),sync);
 assert.deepEqual(progress,[1,2]);
 const view = new DataView(sync.buffer);
 assert.equal(view.getUint16(6,true),0x800);
 assert.equal(view.getUint32(14,true),0xcbf43926);
 const nameLength=view.getUint16(26,true);
 assert.equal(new TextDecoder().decode(sync.slice(30,30+nameLength)),'Café.svg');
 assert.deepEqual(sync.slice(30+nameLength,30+nameLength+bytes.length),bytes);
 const end=sync.length-22;
 assert.equal(view.getUint32(end,true),0x06054b50);
 assert.equal(view.getUint16(end+10,true),2);
 const directory=view.getUint32(end+16,true);
 assert.equal(view.getUint32(directory,true),0x02014b50);
 assert.equal(view.getUint16(directory+8,true),0x800);
 assert.equal(view.getUint32(directory+42,true),0);
});
