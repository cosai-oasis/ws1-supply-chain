// Source for the generated, language-neutral JSON Schemas. No verifier imports.
const text = {type: 'string', minLength: 1};
// An explicit end-of-input assertion avoids regex-engine differences at final newlines.
const end = '(?![\\s\\S])';
const hex = n => ({type: 'string', pattern: `^[0-9a-f]{${n}}${end}`});
const list = items => ({type: 'array', items, uniqueItems: true});
const obj = properties => ({type: 'object', properties, required: Object.keys(properties), additionalProperties: false});
const maybe = schema => ({anyOf: [schema, {type: 'null'}]});
const time = {type: 'string', format: 'date-time', pattern: '^\\d{4}-\\d{2}-\\d{2}T[0-2]\\d:[0-5]\\d:[0-5]\\dZ' + end};
export const kinds = ['evaluation', 'test_environment', 'serving_environment', 'approval'];
const subject = obj({domain: text, sha256: hex(64)});
const measurement = obj({domain: text, algorithm: {enum: ['sha256', 'sha384']}, digest: {type: 'string', pattern: '^([0-9a-f]{64}|[0-9a-f]{96})' + end}});
const environment = obj({environment_id: text, measurement, adversary_exclusions: list(text), nonce: text, outcome: {enum: ['pass', 'fail', 'not_established']}});
const details = {
  evaluation: obj({evaluation_domain: text, test_environment_digest: hex(64), harness_digest: hex(64), log_digest: hex(64), outcome: {enum: ['pass', 'fail', 'not_established']}}),
  test_environment: environment,
  serving_environment: environment,
  approval: obj({evaluation_digest: hex(64), serving_environment_id: text, decision: {enum: ['approve', 'deny']}, conditions: list(obj({field: {enum: ['usage', 'region']}, op: {const: 'eq'}, value: text}))})
};
const envelope = kind => obj({
  payload: obj({profile: text, kind: {const: kind}, issuer: text, key_id: text,
    valid_from: time, valid_until: time, subject, details: details[kind],
    annotations: {type: 'object', additionalProperties: {type: 'string'}}}),
  signature: hex(128)
});
const meta = title => ({$schema: 'https://json-schema.org/draft/2020-12/schema', title});
export const bundleSchema = {...meta('Proposed deployment evidence bundle, experimental v0.1'), ...obj({
  profile: text, ...Object.fromEntries(kinds.map(k => [k, maybe(envelope(k))]))
})};
export const contextSchema = {...meta('LOCAL relying-party context; never accepted from the evidence producer'), ...obj({
  now: time, artifact_hex: {type: 'string', pattern: '^([0-9a-f]{2})+' + end},
  target_environment: text, challenge: text, usage: maybe(text), region: maybe(text),
  policy: obj({evaluation_domain: text, required_exclusions: list(text),
    test_measurement: measurement, serving_measurement: measurement,
    keys: {type: 'array', minItems: 1, items: obj({issuer: text, key_id: text, public_key: hex(64),
      roles: {type: 'array', minItems: 1, uniqueItems: true, items: {enum: kinds}},
      evaluation_domains: list(text), valid_from: time, valid_until: time,
      revocation: {enum: ['good', 'revoked', 'unknown']}})}
  })
})};
