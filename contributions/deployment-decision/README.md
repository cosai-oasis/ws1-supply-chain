# Deployment decision: local schema and vector proposal

**Status: experimental input for discussion, 15 September 2026.** Submitted for review in [WS1 PR #33](https://github.com/cosai-oasis/ws1-supply-chain/pull/33); not adopted by CoSAI. Its test results describe this implementation against its authored candidate cases.

## Decision and result

A relying party asks: **may these exact model-weight bytes enter this specific serving environment under this approval?**

The package contains a JSON Schema for the evidence bundle, a separate schema for local policy and observations, Node.js and Python offline checkers, and 82 language-neutral candidate vectors. Four cases admit; 78 refuse for a specified contradiction, missing premise, unsupported profile, or malformed input. Every refusal names an accepting twin. Both implementations check real Ed25519 signatures on synthetic statements.

The output separates verification from admission:

| Processing status | Evidence verdict | Admission | Meaning |
|---|---|---|---|
| `complete` | `pass` | `admit` | All requirements of this experimental policy are established |
| `complete` | `fail` | `refuse` | A required signature, authority check, authenticated claim or binding fails policy |
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
- [Second implementation and strict wire ingress](INTEROP.md), with [recorded results](interop-results.json)
- [Optional Azure SNP/vTPM adapter and capture instructions](hardware/README.md), with [live-capture validation](hardware/azure-validation.json)

From this directory, with Node.js 22 or later:

```sh
npm ci --ignore-scripts
npm test
npm run check
```

On Windows PowerShell with script execution disabled, use `npm.cmd` for those commands. Dependencies are pinned in `package-lock.json`. Tests require no network after installation.

`npm test` compares generated schemas and vectors with committed bytes, runs every case, permutes object-property order, checks a literal Unicode canonicalization oracle, checks deeply nested malformed input, verifies that always-admit and always-refuse implementations cannot pass, and removes 25 production checks in disposable copies. Every removed check must change at least one expected result. It writes `verification.json` and deletes the disposable copies.

`npm run check` checks the corpus digest and exact case IDs against `corpus-manifest.json`, then evaluates the existing corpus without regenerating or repairing it. The manifest detects local drift, not malicious replacement of both files. Tests remove a case and alter an expectation separately, require rejection, and verify the changed bytes are left untouched. Expected answers are supplied only to the scoring runner; the checker receives `bundle` and `context` as separate arguments. To intentionally edit the authored fixtures or schemas, change `generate.mjs` or `schema.mjs`, run `npm run generate`, and inspect the resulting diff. Generation never consults checker verdicts.

For the second implementation, install `requirements.txt` in a Python 3.11+ virtual environment, then run `python test_interop.py` and `python test_mutations.py`. The first compares both implementations on the corpus and tests 26 wire cases plus four CLI invocations. The second detects nine selected Python/wire defects. CI runs these and the Node suite on Node 22/Python 3.11 and Node 24/Python 3.13. Hardware capture is a separate, explicitly invoked test; CI does not provision cloud resources.

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

- The 82 core vectors use synthetic model bytes, keys, appraisals, measurements, identities, regions and environments. Deterministic private-key seeds in `generate.mjs` are public test material. They must never enter a real trust store.
- A separate Azure adapter has been exercised with a real SNP/vTPM capture. It verifies report/certificate signatures, the HCL-to-AK link, challenge/artifact-digest binding and a guest-written PCR value. It does not establish model execution or a complete platform appraisal, so it cannot produce a passing deployment appraisal. Intel and NVIDIA attestation are not tested here. See the adapter's narrower [limits](hardware/README.md).
- Region and usage facts come from trusted caller context. A hardware measurement does not prove location. This package does not authenticate a cloud control-plane record, deployment request or policy-store update.
- No online revocation, timestamp service, transparency log, physical-attack resistance, benchmark execution, raw-log fetching, or running model deployment is tested. The Azure adapter checks certificate signatures against a separately enrolled AMD root and checks certificate validity at a supplied time. Log and harness digests are signed references; their source bytes and quality are not checked here.
- All claims and authority entries are checked at the decision time. Historical appraisal, evaluator authority at evaluation time, superseding claims, maximum evidence age, clock skew, continuous conditions, nonce consumption and distributed races remain unresolved. A challenge match alone does not prevent repeated use of the same challenge.
- The object APIs still require already-parsed JSON. Use `check-wire.mjs` or `verify.py` for strict byte ingress: they reject duplicate decoded property names, malformed UTF-8 and lone surrogates, and bound inputs to 1 MiB and 64 container levels. This byte limit makes the inline-weight context suitable for small fixtures, not full-sized model packages. Only whole-second UTC timestamps without leap seconds are supported.
- Node and Python use different validation, canonicalization and Ed25519 libraries, but share the schemas, contract, corpus and contributor. The Node checker and generator still share libraries. Mutation results cover the listed defects; they do not establish complete coverage, independent external interoperability, or CoSAI conformance. WCM supplies the optional hardware verification dependency and is also this contributor's work.

## Source and disposition

The scope comes from [WS1 #31](https://github.com/cosai-oasis/ws1-supply-chain/issues/31), particularly the 2 September use case from `major-security` and Imran's 3 September seven-claim response. [WS1 #32](https://github.com/cosai-oasis/ws1-supply-chain/issues/32) identifies implementation pressure testing as a current need. Both threads were read on 15 September. The group has not explicitly selected this exact local policy or evidence representation.

Prepared against WS1 repository commit [`b4b09599b5fc8009f619efcdeee8162461fe6c3b`](https://github.com/cosai-oasis/ws1-supply-chain/tree/b4b09599b5fc8009f619efcdeee8162461fe6c3b), on an isolated local worktree. The repository's open and closed PR list contained no deployment claim-set implementation at that read. This does not cover private drafts or all working-group documents.

The [WCM conformance design](https://github.com/agentrust-io/weight-custody-manifest/blob/main/docs/conformance.md) informed explicit expected outcomes, exact reason matching and acceptance/refusal controls. The core decision experiment reuses no WCM schema, vectors, error codes or conformance level. The optional Azure adapter explicitly depends on WCM's hardware verifier. A new interop profile is only one possible outcome of #31; this experiment does not conclude that existing standards are insufficient.

The [WS1 contribution process](https://github.com/cosai-oasis/ws1-supply-chain/blob/b4b09599b5fc8009f619efcdeee8162461fe6c3b/CONTRIBUTING.md) requires discussion and review for submissions. This proposal is pending working-group review and makes no implementation or adoption commitment.
