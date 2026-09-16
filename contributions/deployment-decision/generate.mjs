// Deterministic fixture authoring. Never imported by the verifier or ordinary runner.
// Seeds below are PUBLIC TEST MATERIAL; none may be enrolled in a real trust store.
import {createHash, createPrivateKey, createPublicKey, sign} from 'node:crypto';
import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import canonicalize from 'canonicalize';
import {bundleSchema, contextSchema} from './schema.mjs';

const PROFILE = 'ws1-deployment-experiment/0.1+jcs-ed25519';
const kinds = ['evaluation', 'test_environment', 'serving_environment', 'approval'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const hashEnvelope = env => digest(Buffer.from(canonicalize(env)));
const seedKey = n => createPrivateKey({key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), Buffer.alloc(32, n)]), format: 'der', type: 'pkcs8'});
const privateKeys = Object.fromEntries(kinds.map((k, i) => [k, seedKey(i + 1)]));
const seal = (kind, payload) => ({payload, signature: sign(null,
  Buffer.concat([Buffer.from('WS1-DEPLOYMENT-EXPERIMENT-v0.1\0'), Buffer.from(canonicalize(payload))]), privateKeys[kind]).toString('hex')});
const clone = structuredClone;
const OK = {status: 'complete', verdict: 'pass', decision: 'admit', codes: []};
const expected = (verdict, ...codes) => ({status: 'complete', verdict, decision: 'refuse', codes: codes.sort()});
const inputError = code => ({status: 'input_error', verdict: null, decision: 'refuse', codes: [code]});
const unsupported = {status: 'unsupported', verdict: null, decision: 'refuse', codes: ['UNSUPPORTED_PROFILE']};
const start = '2026-09-15T12:00:00Z', end = '2026-09-15T13:00:00Z';

export function baseline() {
  const artifact = Buffer.from('Synthetic WS1 model weights\n');
  const measurement = {domain: 'synthetic-snp-launch', algorithm: 'sha384', digest: 'ab'.repeat(48)};
  const context = {now: '2026-09-15T12:30:00Z', artifact_hex: artifact.toString('hex'),
    target_environment: 'serve-1', challenge: 'local-fresh-challenge-001', usage: 'internal', region: 'region-a',
    policy: {evaluation_domain: 'example-bank/internal-assistant', required_exclusions: ['remote-host-software'],
      test_measurement: clone(measurement), serving_measurement: clone(measurement),
      keys: kinds.map(k => ({issuer: `test:${k}`, key_id: 'test-key-1',
        public_key: createPublicKey(privateKeys[k]).export({format: 'der', type: 'spki'}).subarray(-32).toString('hex'),
        roles: [k], evaluation_domains: k === 'evaluation' ? ['example-bank/internal-assistant'] : [],
        valid_from: start, valid_until: end, revocation: 'good'}))}
  };
  const payload = (kind, details) => ({profile: PROFILE, kind, issuer: `test:${kind}`, key_id: 'test-key-1',
    valid_from: start, valid_until: end, subject: {domain: 'weight-bytes/sha256', sha256: digest(artifact)}, details,
    // This pair distinguishes UTF-16 property sorting from Unicode code-point sorting.
    annotations: {'\ue000': 'private-use label', '\u{1f600}': 'München synthetic fixture'}});
  const environment = (id, nonce) => ({environment_id: id, measurement: clone(measurement),
    adversary_exclusions: ['remote-host-software'], nonce, outcome: 'pass'});
  const bundle = {profile: PROFILE};
  bundle.test_environment = seal('test_environment', payload('test_environment', environment('test-1', 'historical-test-challenge')));
  bundle.serving_environment = seal('serving_environment', payload('serving_environment', environment('serve-1', context.challenge)));
  bundle.evaluation = seal('evaluation', payload('evaluation', {evaluation_domain: context.policy.evaluation_domain,
    test_environment_digest: hashEnvelope(bundle.test_environment), harness_digest: '11'.repeat(32), log_digest: '22'.repeat(32), outcome: 'pass'}));
  bundle.approval = seal('approval', payload('approval', {evaluation_digest: hashEnvelope(bundle.evaluation),
    serving_environment_id: 'serve-1', decision: 'approve', conditions: [
      {field: 'usage', op: 'eq', value: 'internal'}, {field: 'region', op: 'eq', value: 'region-a'}]}));
  return {bundle, context};
}

// Changes remain correctly signed unless a case explicitly tests tampering.
function changeSigned(input, kind, edit) {
  edit(input.bundle[kind].payload);
  input.bundle[kind] = seal(kind, input.bundle[kind].payload);
  if (kind === 'test_environment') changeSigned(input, 'evaluation', p => {p.details.test_environment_digest = hashEnvelope(input.bundle.test_environment);});
  if (kind === 'evaluation') changeSigned(input, 'approval', p => {p.details.evaluation_digest = hashEnvelope(input.bundle.evaluation);});
}

export function fixtures() {
  const cases = [];
  const add = (id, claim, edit, result, twin = 'admit-conditional') => {
    const input = baseline(); edit(input);
    cases.push({id, status: 'candidate_against_proposed', claim, twin, input, expected: clone(result)});
  };
  add('admit-conditional', 'All claims and both conditions established', () => {}, OK, null);
  add('admit-unconditional', 'An explicitly empty condition list means unconditional approval', i => changeSigned(i, 'approval', p => {p.details.conditions = [];}), OK, null);
  add('admit-window-start', 'Validity begins inclusively', i => {i.context.now = start;}, OK, null);
  add('admit-no-region-needed', 'Unknown region is harmless when no approval condition uses it', i => {
    i.context.region = null; changeSigned(i, 'approval', p => {p.details.conditions = p.details.conditions.filter(c => c.field !== 'region');});
  }, OK, null);
  add('wrong-weight-bytes', 'Recompute the artifact digest over local bytes', i => {i.context.artifact_hex = Buffer.from('different model').toString('hex');}, expected('fail', ...kinds.map(k => `ARTIFACT_${k.toUpperCase()}`)));
  for (const kind of kinds) {
    const K = kind.toUpperCase();
    add(`missing-${kind}`, 'An explicitly unavailable claim never passes', i => {i.bundle[kind] = null;}, expected('not_established', `MISSING_${K}`));
    add(`wrong-subject-${kind}`, 'Every signed claim binds to the exact weight digest', i => changeSigned(i, kind, p => {p.subject.sha256 = 'ff'.repeat(32);}), expected('fail', `ARTIFACT_${K}`));
    add(`wrong-domain-${kind}`, 'A registry digest is not a weight-byte digest even if the bytes match', i => changeSigned(i, kind, p => {p.subject.domain = 'oci-manifest/sha256';}), expected('fail', `ARTIFACT_${K}`));
    add(`bad-signature-${kind}`, 'A signature failure is a contradiction, not missing evidence', i => {i.bundle[kind].signature = '00'.repeat(64);
      if (kind === 'test_environment') changeSigned(i, 'evaluation', p => {p.details.test_environment_digest = hashEnvelope(i.bundle.test_environment);});
      if (kind === 'evaluation') changeSigned(i, 'approval', p => {p.details.evaluation_digest = hashEnvelope(i.bundle.evaluation);});
    }, expected('fail', `SIGNATURE_${K}`));
    add(`expired-${kind}`, 'Each claim expires independently', i => changeSigned(i, kind, p => {p.valid_until = i.context.now;}), expected('fail', `TIME_${K}`));
    add(`revocation-unknown-${kind}`, 'Unreachable revocation cannot become permission', i => {i.context.policy.keys.find(k => k.roles.includes(kind)).revocation = 'unknown';}, expected('not_established', `REVOCATION_${K}`));
  }
  add('untrusted-evaluator', 'Signer-supplied identity cannot enroll a key', i => changeSigned(i, 'evaluation', p => {p.issuer = 'untrusted:evaluator';}), expected('fail', 'AUTHORITY_EVALUATION'));
  add('wrong-key-role', 'A trusted platform key is not an authorized evaluator', i => {i.context.policy.keys[0].roles = ['test_environment'];}, expected('fail', 'AUTHORITY_EVALUATION'));
  add('wrong-authority-domain', 'Evaluator authority is scoped by relying-party policy', i => {i.context.policy.keys[0].evaluation_domains = ['other-domain'];}, expected('fail', 'AUTHORITY_EVALUATION'));
  add('rotated-key-id', 'An unenrolled new key ID cannot inherit authority', i => changeSigned(i, 'evaluation', p => {p.key_id = 'test-key-2';}), expected('fail', 'AUTHORITY_EVALUATION'));
  add('revoked-evaluator', 'Revocation defeats a cryptographically valid signature', i => {i.context.policy.keys[0].revocation = 'revoked';}, expected('fail', 'REVOKED_EVALUATION'));
  add('expired-authority', 'Authority validity is independent of claim validity', i => {i.context.policy.keys[0].valid_until = i.context.now;}, expected('fail', 'KEY_TIME_EVALUATION'));
  add('future-claim', 'A not-yet-valid claim cannot authorize deployment', i => changeSigned(i, 'evaluation', p => {p.valid_from = '2026-09-15T12:45:00Z';}), expected('fail', 'TIME_EVALUATION'));
  add('wrong-evaluation-domain', 'The benchmark domain must match local policy', i => changeSigned(i, 'evaluation', p => {p.details.evaluation_domain = 'other-domain';}), expected('fail', 'EVALUATION_DOMAIN'));
  add('failed-evaluation', 'Authenticated evaluation failure refuses admission', i => changeSigned(i, 'evaluation', p => {p.details.outcome = 'fail';}), expected('fail', 'EVALUATION_RESULT'));
  add('unknown-evaluation', 'An inconclusive evaluation is not a failure or a pass', i => changeSigned(i, 'evaluation', p => {p.details.outcome = 'not_established';}), expected('not_established', 'EVALUATION_RESULT'));
  add('wrong-test-binding', 'Evaluation identifies the exact signed test appraisal', i => changeSigned(i, 'evaluation', p => {p.details.test_environment_digest = 'ff'.repeat(32);}), expected('fail', 'TEST_BINDING'));
  for (const kind of ['test_environment', 'serving_environment']) {
    const K = kind.toUpperCase();
    add(`wrong-measurement-${kind}`, 'Changed stack/firmware measurement requires reappraisal', i => changeSigned(i, kind, p => {p.details.measurement.digest = 'cd'.repeat(48);}), expected('fail', `MEASUREMENT_${K}`));
    add(`wrong-measurement-domain-${kind}`, 'Same-length measurements from different platforms are not interchangeable', i => changeSigned(i, kind, p => {p.details.measurement.domain = 'synthetic-tdx-mrtd';}), expected('fail', `MEASUREMENT_${K}`));
    add(`failed-appraisal-${kind}`, 'Platform appraisal failure is not cured by its valid signature', i => changeSigned(i, kind, p => {p.details.outcome = 'fail';}), expected('fail', `APPRAISAL_${K}`));
    add(`unknown-appraisal-${kind}`, 'Unavailable appraisal does not authorize deployment', i => changeSigned(i, kind, p => {p.details.outcome = 'not_established';}), expected('not_established', `APPRAISAL_${K}`));
    add(`missing-threat-${kind}`, 'A signed appraisal must cover the required adversary', i => changeSigned(i, kind, p => {p.details.adversary_exclusions = []; }), expected('fail', `THREAT_${K}`));
  }
  add('physical-owner-required', 'Policy cannot infer physical-owner protection from a software threat claim', i => {i.context.policy.required_exclusions.push('physical-owner');}, expected('fail', 'THREAT_SERVING_ENVIRONMENT', 'THREAT_TEST_ENVIRONMENT'));
  add('wrong-target', 'Serving appraisal identifies this deployment target', i => changeSigned(i, 'serving_environment', p => {p.details.environment_id = 'serve-2';}), expected('fail', 'TARGET_BINDING'));
  add('replayed-serving-evidence', 'A previously signed serving appraisal cannot satisfy a new challenge', i => {i.context.challenge = 'new-challenge-002';}, expected('fail', 'CHALLENGE_BINDING'));
  add('wrong-approval-binding', 'Approval covers this exact evaluation', i => changeSigned(i, 'approval', p => {p.details.evaluation_digest = 'ff'.repeat(32);}), expected('fail', 'APPROVAL_BINDING'));
  add('wrong-approval-target', 'Approval for another serving target is not transferable', i => changeSigned(i, 'approval', p => {p.details.serving_environment_id = 'serve-2';}), expected('fail', 'APPROVAL_TARGET'));
  add('denied-approval', 'A signed refusal stays a refusal', i => changeSigned(i, 'approval', p => {p.details.decision = 'deny';}), expected('fail', 'APPROVAL_DENIED'));
  for (const field of ['usage', 'region']) {
    add(`wrong-${field}`, 'Every approval condition is checked, including the last one', i => {i.context[field] = 'other';}, expected('fail', `CONDITION_${field.toUpperCase()}`));
    add(`unknown-${field}`, 'Unknown condition facts remain not established', i => {i.context[field] = null;}, expected('not_established', `CONDITION_${field.toUpperCase()}`));
  }
  add('failure-with-missing-evidence', 'Known contradiction takes precedence while preserving missing-evidence reasons', i => {i.bundle.test_environment = null; i.context.usage = 'external';}, expected('fail', 'CONDITION_USAGE', 'MISSING_TEST_ENVIRONMENT'));
  add('unknown-bundle-profile', 'No silent fallback to a different serialization profile', i => {i.bundle.profile = 'unknown/2';}, unsupported);
  add('unknown-signed-profile', 'Each signed statement names its profile', i => changeSigned(i, 'approval', p => {p.profile = 'unknown/2';}), unsupported);
  add('missing-required-slot', 'Omission is malformed; explicit null represents unavailability', i => {delete i.bundle.approval;}, inputError('INPUT_SCHEMA'));
  add('unknown-condition-operator', 'Unknown condition semantics cannot be ignored', i => changeSigned(i, 'approval', p => {p.details.conditions[0].op = 'approximately';}), inputError('INPUT_SCHEMA'));
  add('boolean-appraisal', 'Boolean values cannot masquerade as an appraisal outcome', i => changeSigned(i, 'serving_environment', p => {p.details.outcome = true;}), inputError('INPUT_SCHEMA'));
  add('producer-trust-store', 'The evidence bundle cannot carry a trust-store override', i => {i.bundle.keys = i.context.policy.keys;}, inputError('INPUT_SCHEMA'));
  add('invalid-date', 'Impossible dates are input errors', i => changeSigned(i, 'evaluation', p => {p.valid_until = '2026-02-30T13:00:00Z';}), inputError('INPUT_SCHEMA'));
  add('reversed-validity', 'A reversed window is malformed', i => changeSigned(i, 'evaluation', p => {p.valid_until = p.valid_from;}), inputError('VALIDITY_ORDER'));
  add('wrong-measurement-width', 'Algorithm and measurement width must agree', i => changeSigned(i, 'serving_environment', p => {p.details.measurement.digest = 'ab'.repeat(32);}), inputError('MEASUREMENT_SHAPE'));
  add('duplicate-trust-key', 'Ambiguous local key enrollment is a context error', i => {i.context.policy.keys.push(clone(i.context.policy.keys[0]));}, inputError('DUPLICATE_TRUST_KEY'));
  add('malformed-local-context', 'Missing local decision time is not an evidence verdict', i => {delete i.context.now;}, inputError('CONTEXT_SCHEMA'));
  add('invalid-unicode', 'Lone surrogates are rejected before canonicalization', i => {i.bundle.evaluation.payload.annotations.note = '\ud800';}, inputError('INVALID_UNICODE'));
  add('leap-second-outside-profile', 'This experiment supports whole UTC seconds 00 through 59', i => {i.context.now = '2026-09-15T12:30:60Z';}, inputError('CONTEXT_SCHEMA'));
  return {profile: 'ws1-candidate-vector-set/0.1', provenance: 'Synthetic fixtures authored locally for WS1 #31; not adopted conformance cases.', cases};
}

export const generated = () => {
  const corpus = fixtures();
  return {'bundle.schema.json': bundleSchema, 'context.schema.json': contextSchema, 'vectors.json': corpus,
    'corpus-manifest.json': {count: corpus.cases.length, ids: corpus.cases.map(c => c.id),
      sha256: digest(Buffer.from(JSON.stringify(corpus, null, 2) + '\n'))}};
};
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = new URL('.', import.meta.url); mkdirSync(dir, {recursive: true});
  for (const [name, value] of Object.entries(generated())) writeFileSync(new URL(name, dir), JSON.stringify(value, null, 2) + '\n');
  console.log(`Generated two schemas and ${fixtures().cases.length} candidate vectors.`);
}
