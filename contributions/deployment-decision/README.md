# Deployment decision: local schema and vector proposal

**Status: experimental input for discussion, 15 September 2026.** This package has not been submitted to or adopted by CoSAI. Its test results describe this implementation against its authored candidate cases.

## Decision and result

A relying party asks: **may these exact model-weight bytes enter this specific serving environment under this approval?**

The package contains a JSON Schema for the evidence bundle, a separate schema for local policy and observations, a small offline checker, and 74 language-neutral candidate vectors. Four cases admit; 70 refuse for a specified contradiction, missing premise, unsupported profile, or malformed input. Every refusal names an accepting twin. The reference implementation checks real Ed25519 signatures on synthetic statements.

The output separates verification from admission:

| Processing status | Evidence verdict | Admission | Meaning |
|---|---|---|---|
| `complete` | `pass` | `admit` | All requirements of this experimental policy are established |
| `complete` | `fail` | `refuse` | At least one authenticated claim or binding contradicts policy |
| `complete` | `not_established` | `refuse` | A required premise is unavailable or inconclusive |
| `input_error` | `null` | `refuse` | The evidence or local context is malformed |
| `unsupported` | `null` | `refuse` | The named cryptographic/serialization profile is unsupported |

Refusal does not assert that a model is unsafe. Admission does not establish model safety, legal compliance, or that enforcement occurred. This is a decision at one supplied time; continuing deployment is outside this experiment.

## Inspect and run

- [Contract and open questions](CONTRACT.md)
- [Bundle schema](bundle.schema.json) and [local-context schema](context.schema.json)
- [Candidate vectors](vectors.json), with explicit inputs and expected outputs
- [Checker](checker.mjs) and [read-only runner](run.mjs)
- [Verification evidence](verification.json), including which cases detect each removed check

From this directory, with Node.js 22 or later:

```sh
npm ci --ignore-scripts
npm test
npm run check
```

On Windows PowerShell with script execution disabled, use `npm.cmd` for those commands. Dependencies are pinned in `package-lock.json`. Tests require no network after installation.

`npm test` compares generated schemas and vectors with committed bytes, runs every case, permutes object-property order, checks a literal Unicode canonicalization oracle, verifies that always-admit and always-refuse implementations cannot pass, and removes 23 production checks in disposable copies. Every removed check must change at least one expected result. It writes `verification.json` and deletes the disposable copies.

`npm run check` checks the corpus digest and exact case IDs against `corpus-manifest.json`, then evaluates the existing corpus without regenerating or repairing it. The manifest detects local drift, not malicious replacement of both files. Tests remove a case and alter an expectation separately, require rejection, and verify the changed bytes are left untouched. Expected answers are supplied only to the scoring runner; the checker receives `bundle` and `context` as separate arguments. To intentionally edit the authored fixtures or schemas, change `generate.mjs` or `schema.mjs`, run `npm run generate`, and inspect the resulting diff. Generation never consults checker verdicts.

## How the seven claims map

| Claim in WS1 #31 | Proposed representation | Executed check |
|---|---|---|
| 1. Exact artifact identity | `subject.domain` and `subject.sha256` in each signed statement | SHA-256 recomputed over local `artifact_hex`; domain must be `weight-bytes/sha256` |
| 2. Evaluator authority | Local issuer/key enrollment, role, evaluation-domain scope, validity, revocation | Signer data cannot enroll a key or expand authority |
| 3. Evaluation bound to artifact and test environment | Signed `evaluation`; digest of the entire signed test appraisal | Exact artifact, evaluation domain, result, and appraisal-envelope binding |
| 4. Serving-environment attestation | Synthetic signed `serving_environment` appraisal | Local target ID, challenge, measurement domain/algorithm/value, exclusions, appraisal outcome |
| 5. Test-environment attestation | Synthetic signed `test_environment` appraisal | Measurement policy, exclusions, appraisal outcome, and binding from evaluation |
| 6. Canonicalization profile and version | Profile inside every signed payload | Exact profile; RFC 8785 canonicalization and domain-separated Ed25519 verification |
| 7. Time and validity | Local `now`; each statement and trust entry has `valid_from`/`valid_until` | Inclusive start, exclusive expiry, no implicit clock or expired-claim fallback |

The digest itself does not expire; the statements about it do. Evaluator authority is local policy, so its freshness cannot be established by the evaluator asserting that it remains authorized.

An additional signed **approval** binds the evaluation to the serving target and carries conditions. This is an explicit experiment choice for the conditional-approval gap in #31. It requires its own locally authorized approver. It is not implied to be part of an agreed WS1 minimum.

## Limits

- All model bytes, keys, appraisals, measurements, identities, regions and environments are synthetic. Deterministic private-key seeds in `generate.mjs` are public test material. They must never enter a real trust store.
- No AMD, Intel, NVIDIA or cloud attestation is parsed or validated. The environment statements represent outputs of a separately trusted appraiser. Their signatures prove attribution and integrity under fixture keys, not the truth of a hardware claim. Model-to-workload binding remains a required adapter obligation.
- Region and usage facts come from trusted caller context. A hardware measurement does not prove location. This package does not authenticate a cloud control-plane record, deployment request or policy-store update.
- No online revocation, certificate chains, timestamp service, transparency log, physical-attack resistance, benchmark execution, raw-log fetching, or running deployment is tested. Log and harness digests are signed references; their source bytes and quality are not checked here.
- All claims and authority entries are checked at the decision time. Historical appraisal, evaluator authority at evaluation time, superseding claims, maximum evidence age, clock skew, continuous conditions, nonce consumption and distributed races remain unresolved. A challenge match alone does not prevent repeated use of the same challenge.
- The checker API accepts already-parsed JSON values. A wire adapter must reject duplicate object names before parsing; ordinary `JSON.parse` cannot recover discarded duplicates. The committed corpus does not establish wire-parser conformance. Lone surrogate strings are explicitly rejected. Only whole-second UTC timestamps without leap seconds are supported.
- The reference checker and corpus were authored in the same local task and share the canonicalization library and Node crypto implementation. Mutation results measure sensitivity to the 23 listed defects. They do not establish complete coverage, independent interoperability, or CoSAI conformance.

## Source and disposition

The scope comes from [WS1 #31](https://github.com/cosai-oasis/ws1-supply-chain/issues/31), particularly the 2 September use case from `major-security` and Imran's 3 September seven-claim response. [WS1 #32](https://github.com/cosai-oasis/ws1-supply-chain/issues/32) identifies implementation pressure testing as a current need. Both threads were read on 15 September. The group has not explicitly selected this exact local policy or evidence representation.

Prepared against WS1 repository commit [`b4b09599b5fc8009f619efcdeee8162461fe6c3b`](https://github.com/cosai-oasis/ws1-supply-chain/tree/b4b09599b5fc8009f619efcdeee8162461fe6c3b), on an isolated local worktree. The repository's open and closed PR list contained no deployment claim-set implementation at that read. This does not cover private drafts or all working-group documents.

The [WCM conformance design](https://github.com/agentrust-io/weight-custody-manifest/blob/main/docs/conformance.md) informed explicit expected outcomes, exact reason matching and acceptance/refusal controls. No WCM schema, vectors, error codes or conformance level is reused or claimed. A new interop profile is only one possible outcome of #31; this experiment does not conclude that existing standards are insufficient.

The [WS1 contribution process](https://github.com/cosai-oasis/ws1-supply-chain/blob/b4b09599b5fc8009f619efcdeee8162461fe6c3b/CONTRIBUTING.md) requires discussion and review for submissions. This local package makes no external commitment and changes no working-group state.
