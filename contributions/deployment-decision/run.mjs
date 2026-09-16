// Reads committed artifacts only. Does not regenerate fixtures or import expected answers into the checker.
import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {evaluate} from './checker.mjs';
const manifest = JSON.parse(readFileSync(new URL('corpus-manifest.json', import.meta.url), 'utf8'));
const bytes = readFileSync(process.argv[2] || new URL('vectors.json', import.meta.url));
if (createHash('sha256').update(bytes).digest('hex') !== manifest.sha256) throw new Error('Corpus bytes differ from manifest; no files were modified');
const corpus = JSON.parse(bytes);
const ids = corpus.cases.map(c => c.id);
if (new Set(ids).size !== ids.length || ids.length !== manifest.count || !isDeepStrictEqual(ids, manifest.ids)) throw new Error('Missing, extra or duplicate vector IDs');
const results = corpus.cases.map(c => {
  const actual = evaluate(c.input.bundle, c.input.context);
  return {id: c.id, matched: isDeepStrictEqual(actual, c.expected), actual};
});
console.log(JSON.stringify({candidate: true, count: results.length, matched: results.filter(r => r.matched).length, results}, null, 2));
if (results.some(r => !r.matched)) process.exitCode = 1;
