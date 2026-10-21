// Every sample the microscope can show has real photos on disk, each with a scale and a credit.
//   node --test tools/samples/*.test.mjs   (from lantern-hill/)

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

// samples/index.js builds its toast and jars with the DOM as it loads, so its ids are read, not imported
const ids = [...readFileSync(new URL('../../web/js/samples/index.js', import.meta.url), 'utf8').matchAll(/\{id:'(\w+)', from:/g)].map(m => m[1]);
const photos = JSON.parse(readFileSync(new URL('../../web/micrographs/micrographs.json', import.meta.url), 'utf8'));

test('every sample has a photo, sized and credited', () => {
  assert.equal(ids.length, 19);
  for (const id of ids) {
    assert.ok(photos[id]?.length, `${id}: no photos; run tools/samples/micrographs.mjs`);
    for (const p of photos[id]) {
      assert.ok(existsSync(new URL(`../../web/micrographs/${p.file}`, import.meta.url)), `${id}: ${p.file} is missing`);
      assert.ok(p.across > 0 && p.w > 0 && p.h > 0, `${p.file}: no size, so no scale bar`);
      assert.ok(p.kind && p.by && p.license && p.page, `${p.file}: no label or credit`);
    }
  }
});
