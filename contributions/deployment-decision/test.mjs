import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, unlinkSync} from 'node:fs';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {createHash, createPublicKey, verify} from 'node:crypto';
import canonicalize from 'canonicalize';
import {generated} from './generate.mjs';
import {evaluate, signingBytes} from './checker.mjs';

const root = new URL('.', import.meta.url);
const read = name => readFileSync(new URL(name, root));
const digest = data => createHash('sha256').update(data).digest('hex');
const corpus = JSON.parse(read('vectors.json'));
const before = digest(read('vectors.json'));
const cases = corpus.cases;
const tested = [], mutationResults = [];
function test(name, fn) { fn(); tested.push(name); console.log(`PASS ${name}`); }
test('generated artifacts reproduce byte for byte', () => {
  for (const [name, data] of Object.entries(generated())) assert.equal(read(name).toString(), JSON.stringify(data, null, 2) + '\n', name);
});
test('unique complete corpus with an accepting twin for every refusal', () => {
  assert.equal(new Set(cases.map(c => c.id)).size, cases.length);
  for (const c of cases) {
    assert.equal(c.status, 'candidate_against_proposed');
    if (c.expected.decision === 'refuse') assert.equal(cases.find(x => x.id === c.twin)?.expected.decision, 'admit', c.id);
  }
});
test('every candidate matches exact status, verdict, admission and reason codes', () => {
  for (const c of cases) assert.deepEqual(evaluate(c.input.bundle, c.input.context), c.expected, c.id);
});
test('deeply nested malformed JSON returns a processing error without throwing', () => {
  for (const field of ['bundle', 'context']) {
    for (const leaf of ['null', '"\\ud800"']) {
      const input = structuredClone(cases[0].input);
      input[field].extra = JSON.parse('{"child":'.repeat(50000) + leaf + '}'.repeat(50000));
      assert.deepEqual(evaluate(input.bundle, input.context), {
        status: 'input_error', verdict: null, decision: 'refuse',
        codes: [leaf === 'null' ? (field === 'bundle' ? 'INPUT_SCHEMA' : 'CONTEXT_SCHEMA') : 'INVALID_UNICODE']
      });
    }
  }
});
const reverse = value => Array.isArray(value) ? value.map(reverse) :
  value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).reverse().map(([k, v]) => [k, reverse(v)])) : value;
test('object-property arrival order does not change any result', () => {
  for (const c of cases) assert.deepEqual(evaluate(reverse(c.input.bundle), reverse(c.input.context)), c.expected, c.id);
});
test('condition order does not skip the last condition', () => {
  // Input conditions cannot simply be shuffled without re-signing: instead check both signed failures.
  for (const id of ['wrong-usage', 'wrong-region', 'unknown-usage', 'unknown-region']) {
    const c = cases.find(c => c.id === id); assert.deepEqual(evaluate(c.input.bundle, c.input.context), c.expected);
  }
});
test('JCS UTF-16 sorting and UTF-8 text have a literal independent expectation', () => {
  const probe = {'\ue000': 'last', '\u{1f600}': 'München'};
  assert.equal(canonicalize(probe), '{"😀":"München","":"last"}');
  const pointSorted = JSON.stringify(Object.fromEntries(Object.entries(probe).sort(([a], [b]) => a.codePointAt(0) - b.codePointAt(0))));
  assert.notEqual(pointSorted, canonicalize(probe));
});
test('baseline signatures verify and fail without the domain prefix', () => {
  const c = cases[0];
  for (const [kind, env] of Object.entries(c.input.bundle).filter(([k]) => k !== 'profile')) {
    const entry = c.input.context.policy.keys.find(k => k.roles.includes(kind));
    const pub = createPublicKey({key: Buffer.from('302a300506032b6570032100' + entry.public_key, 'hex'), format: 'der', type: 'spki'});
    assert.ok(verify(null, signingBytes(env.payload), pub, Buffer.from(env.signature, 'hex')));
    assert.equal(verify(null, Buffer.from(canonicalize(env.payload)), pub, Buffer.from(env.signature, 'hex')), false);
  }
});
test('checker does not receive or read expected answers', () => {
  const c = structuredClone(cases[0]); c.expected = {decision: 'refuse'};
  assert.equal(evaluate(c.input.bundle, c.input.context).decision, 'admit');
  const source = read('checker.mjs').toString();
  assert.ok(!source.includes('vectors.json') && !source.includes('generate.mjs'));
});
test('always-admit and always-refuse implementations both fail the corpus', () => {
  assert.ok(cases.some(c => c.expected.decision !== 'admit'));
  assert.ok(cases.some(c => c.expected.decision !== 'refuse'));
});

// Remove real production gates in disposable copies and require the corpus to detect each removal.
// No switch to disable verification exists in the shipped checker.
const source = read('checker.mjs').toString();
const mutations = [
  ['signature', "!verify(null, signingBytes(p), publicKey, Buffer.from(env.signature, 'hex'))", 'false'],
  ['authority', "!key || !key.roles.includes(kind) || (kind === 'evaluation' && !key.evaluation_domains.includes(context.policy.evaluation_domain))", '!key'],
  ['artifact-digest', "p.subject.domain !== 'weight-bytes/sha256' || p.subject.sha256 !== artifact", "p.subject.domain !== 'weight-bytes/sha256'"],
  ['artifact-domain', "p.subject.domain !== 'weight-bytes/sha256' || p.subject.sha256 !== artifact", 'p.subject.sha256 !== artifact'],
  ['claim-time', '!inWindow(context.now, p)', 'false'],
  ['authority-time', '!inWindow(context.now, key)', 'false'],
  ['revoked', "key.revocation === 'revoked'", 'false'],
  ['unknown-revocation', "key.revocation === 'unknown'", 'false'],
  ['measurement', '!sameMeasurement(d.measurement, expected)', 'false'],
  ['measurement-shape', "m.digest.length !== (m.algorithm === 'sha256' ? 64 : 96)", 'false'],
  ['validity-order', 'item.valid_from >= item.valid_until', 'false'],
  ['threat', 'context.policy.required_exclusions.some(x => !d.adversary_exclusions.includes(x))', 'false'],
  ['evaluation-domain', 'd.evaluation_domain !== context.policy.evaluation_domain', 'false'],
  ['test-binding', 'bundle.test_environment && d.test_environment_digest !== digestEnvelope(bundle.test_environment)', 'false'],
  ['target', 'd.environment_id !== context.target_environment', 'false'],
  ['challenge', 'd.nonce !== context.challenge', 'false'],
  ['approval-binding', 'bundle.evaluation && d.evaluation_digest !== digestEnvelope(bundle.evaluation)', 'false'],
  ['approval-target', 'd.serving_environment_id !== context.target_environment', 'false'],
  ['approval-denial', "d.decision !== 'approve'", 'false'],
  ['condition-failure', 'observed !== condition.value', 'false'],
  ['condition-unknown', 'unknown(`CONDITION_${condition.field.toUpperCase()}`)', 'void 0'],
  ['missing-claim', 'unknown(`MISSING_${kind.toUpperCase()}`)', 'void 0'],
  ['unknown-profile', "bundle.profile !== PROFILE || kinds.some(k => bundle[k] && bundle[k].payload.profile !== PROFILE)", 'false'],
  ['last-condition', 'for (const condition of d.conditions)', 'for (const condition of d.conditions.slice(0, 1))'],
  ['not-established-admission', "status === 'complete' && verdict === 'pass'", "status === 'complete' && verdict !== 'fail'"]
];
for (const [name, from, to] of mutations) {
  assert.equal(source.split(from).length, 2, `mutation must match exactly once: ${name}`);
  const url = new URL(`.mutant-${name}.mjs`, root);
  try {
    writeFileSync(url, source.replace(from, to));
    const {evaluate: mutant} = await import(url.href);
    const detectedBy = cases.filter(c => !isDeepStrictEqual(mutant(c.input.bundle, c.input.context), c.expected)).map(c => c.id);
    assert.ok(detectedBy.length, `surviving mutation: ${name}`);
    mutationResults.push({name, detectedBy}); console.log(`KILLED ${name}: ${detectedBy.length} cases`);
  } finally { unlinkSync(url); }
}
test('read-only runner succeeds without changing committed vectors', () => {
  const result = JSON.parse(execFileSync(process.execPath, [fileURLToPath(new URL('run.mjs', root))], {encoding: 'utf8'}));
  assert.equal(result.count, cases.length); assert.equal(result.matched, cases.length);
  assert.equal(digest(read('vectors.json')), before);
});
test('runner rejects changed or incomplete fixtures and preserves their bytes', () => {
  for (const edit of [c => {c.cases.pop();}, c => {c.cases[0].expected.decision = 'refuse';}]) {
    const changed = structuredClone(corpus); edit(changed);
    const url = new URL('.mutant-corpus.json', root);
    try {
      const bytes = Buffer.from(JSON.stringify(changed)); writeFileSync(url, bytes);
      const result = spawnSync(process.execPath, [fileURLToPath(new URL('run.mjs', root)), fileURLToPath(url)], {encoding: 'utf8'});
      assert.equal(result.status, 1); assert.match(result.stderr, /Corpus bytes differ from manifest/);
      assert.deepEqual(readFileSync(url), bytes);
    } finally { unlinkSync(url); }
  }
});
const report = {status: 'pass', runtime: process.version, platform: process.platform,
  candidates: cases.length, matched: cases.length, checks: tested, mutantsKilled: mutationResults.length,
  mutations: mutationResults, vectorSha256: before,
  artifactSha256: Object.fromEntries(['checker.mjs', 'bundle.schema.json', 'context.schema.json', 'schema.mjs', 'generate.mjs', 'run.mjs', 'test.mjs', 'package-lock.json', 'corpus-manifest.json'].map(name => [name, digest(read(name))])),
  limits: ['One locally authored implementation and corpus; not independent interoperability.',
    'Synthetic platform-appraisal statements; no vendor quote, hardware, network revocation or deployment gate exercised.']};
writeFileSync(new URL('verification.json', root), JSON.stringify(report, null, 2) + '\n');
console.log(`PASS ${cases.length} candidates; ${tested.length} harness checks; ${mutationResults.length} mutants killed.`);
