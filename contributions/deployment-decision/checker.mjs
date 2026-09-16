import {createHash, createPublicKey, verify} from 'node:crypto';
import {readFileSync} from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import canonicalize from 'canonicalize';

export const PROFILE = 'ws1-deployment-experiment/0.1+jcs-ed25519';
const PREFIX = Buffer.from('WS1-DEPLOYMENT-EXPERIMENT-v0.1\0', 'utf8');
const SPKI = Buffer.from('302a300506032b6570032100', 'hex');
const kinds = ['evaluation', 'test_environment', 'serving_environment', 'approval'];
const ajv = new Ajv2020({allErrors: true, strict: true});
addFormats(ajv);
const schema = name => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const validBundle = ajv.compile(schema('bundle.schema.json'));
const validContext = ajv.compile(schema('context.schema.json'));
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const digestEnvelope = env => hash(Buffer.from(canonicalize(env)));
export const signingBytes = payload => Buffer.concat([PREFIX, Buffer.from(canonicalize(payload), 'utf8')]);
const inWindow = (now, item) => item.valid_from <= now && now < item.valid_until;
const sameMeasurement = (a, b) => a.domain === b.domain && a.algorithm === b.algorithm && a.digest === b.digest;
const finish = (status, verdict, codes) => ({status, verdict, decision: status === 'complete' && verdict === 'pass' ? 'admit' : 'refuse', codes: [...new Set(codes)].sort()});
const wellFormed = value => {
  // Walk parsed JSON without consuming the call stack on malformed nested input.
  const pending = [value];
  while (pending.length) {
    const item = pending.pop();
    if (typeof item === 'string' && !item.isWellFormed()) return false;
    if (item && typeof item === 'object') {
      for (const [key, child] of Object.entries(item)) {
        if (!key.isWellFormed()) return false;
        pending.push(child);
      }
    }
  }
  return true;
};

// Inputs are JSON values already parsed with duplicate-key rejection at the wire boundary.
// This function has no network access, fixture expectations, clock lookup, or private keys.
export function evaluate(bundle, context) {
  if (!wellFormed(bundle) || !wellFormed(context)) return finish('input_error', null, ['INVALID_UNICODE']);
  if (!validBundle(bundle)) return finish('input_error', null, ['INPUT_SCHEMA']);
  if (!validContext(context)) return finish('input_error', null, ['CONTEXT_SCHEMA']);
  const ids = context.policy.keys.map(k => JSON.stringify([k.issuer, k.key_id]));
  if (new Set(ids).size !== ids.length) return finish('input_error', null, ['DUPLICATE_TRUST_KEY']);
  // Structural processing errors precede profile, authority and signature results.
  const payloads = kinds.filter(k => bundle[k] !== null).map(k => bundle[k].payload);
  const measurements = [context.policy.test_measurement, context.policy.serving_measurement,
    ...payloads.filter(p => p.kind.endsWith('_environment')).map(p => p.details.measurement)];
  for (const m of measurements) {
    if (m.digest.length !== (m.algorithm === 'sha256' ? 64 : 96)) return finish('input_error', null, ['MEASUREMENT_SHAPE']);
  }
  for (const item of [...context.policy.keys, ...payloads]) {
    if (item.valid_from >= item.valid_until) return finish('input_error', null, ['VALIDITY_ORDER']);
  }
  if (bundle.profile !== PROFILE || kinds.some(k => bundle[k] && bundle[k].payload.profile !== PROFILE)) {
    return finish('unsupported', null, ['UNSUPPORTED_PROFILE']);
  }
  const failures = [], unknowns = [];
  const fail = code => failures.push(code);
  const unknown = code => unknowns.push(code);
  const authenticated = new Set();
  const artifact = hash(Buffer.from(context.artifact_hex, 'hex'));
  for (const kind of kinds) {
    const env = bundle[kind];
    if (env === null) { unknown(`MISSING_${kind.toUpperCase()}`); continue; }
    const p = env.payload;
    const key = context.policy.keys.find(k => k.issuer === p.issuer && k.key_id === p.key_id);
    if (!key || !key.roles.includes(kind) || (kind === 'evaluation' && !key.evaluation_domains.includes(context.policy.evaluation_domain))) {
      fail(`AUTHORITY_${kind.toUpperCase()}`); continue;
    }
    const publicKey = createPublicKey({key: Buffer.concat([SPKI, Buffer.from(key.public_key, 'hex')]), format: 'der', type: 'spki'});
    if (!verify(null, signingBytes(p), publicKey, Buffer.from(env.signature, 'hex'))) {
      fail(`SIGNATURE_${kind.toUpperCase()}`); continue;
    }
    authenticated.add(kind);
    if (!inWindow(context.now, key)) fail(`KEY_TIME_${kind.toUpperCase()}`);
    if (key.revocation === 'revoked') fail(`REVOKED_${kind.toUpperCase()}`);
    if (key.revocation === 'unknown') unknown(`REVOCATION_${kind.toUpperCase()}`);
    if (!inWindow(context.now, p)) fail(`TIME_${kind.toUpperCase()}`);
    if (p.subject.domain !== 'weight-bytes/sha256' || p.subject.sha256 !== artifact) fail(`ARTIFACT_${kind.toUpperCase()}`);
    if (kind.endsWith('_environment')) {
      const d = p.details;
      const expected = kind === 'test_environment' ? context.policy.test_measurement : context.policy.serving_measurement;
      if (!sameMeasurement(d.measurement, expected)) fail(`MEASUREMENT_${kind.toUpperCase()}`);
      if (context.policy.required_exclusions.some(x => !d.adversary_exclusions.includes(x))) fail(`THREAT_${kind.toUpperCase()}`);
      if (d.outcome === 'fail') fail(`APPRAISAL_${kind.toUpperCase()}`);
      if (d.outcome === 'not_established') unknown(`APPRAISAL_${kind.toUpperCase()}`);
    }
  }
  if (authenticated.has('evaluation')) {
    const d = bundle.evaluation.payload.details;
    if (d.evaluation_domain !== context.policy.evaluation_domain) fail('EVALUATION_DOMAIN');
    if (d.outcome === 'fail') fail('EVALUATION_RESULT');
    if (d.outcome === 'not_established') unknown('EVALUATION_RESULT');
    if (bundle.test_environment && d.test_environment_digest !== digestEnvelope(bundle.test_environment)) fail('TEST_BINDING');
  }
  if (authenticated.has('serving_environment')) {
    const d = bundle.serving_environment.payload.details;
    if (d.environment_id !== context.target_environment) fail('TARGET_BINDING');
    if (d.nonce !== context.challenge) fail('CHALLENGE_BINDING');
  }
  if (authenticated.has('approval')) {
    const d = bundle.approval.payload.details;
    if (bundle.evaluation && d.evaluation_digest !== digestEnvelope(bundle.evaluation)) fail('APPROVAL_BINDING');
    if (d.serving_environment_id !== context.target_environment) fail('APPROVAL_TARGET');
    if (d.decision !== 'approve') fail('APPROVAL_DENIED');
    for (const condition of d.conditions) {
      const observed = context[condition.field];
      if (observed === null) unknown(`CONDITION_${condition.field.toUpperCase()}`);
      else if (observed !== condition.value) fail(`CONDITION_${condition.field.toUpperCase()}`);
    }
  }
  // A known contradiction outranks unavailable evidence, while every reason is retained.
  return finish('complete', failures.length ? 'fail' : unknowns.length ? 'not_established' : 'pass', [...failures, ...unknowns]);
}
