# Experimental contract v0.1

## Trust boundary

`evaluate(bundle, context)` has two inputs. The bundle is producer-controlled. The context is supplied by the relying party through an authenticated local path and contains the actual weight bytes, target, fresh challenge, decision time, usage, region, and trust policy. A producer must never supply both inputs in a deployment integration. Keeping them beside each other in a fixture is a testing convenience.

The bundle has four required slots: evaluation, test appraisal, serving appraisal, and approval. A slot may be explicitly `null` to report unavailable evidence. An omitted slot is an input error. Signed objects have no trust-store or remote key-discovery field; extra fields are rejected. Local issuer/key pairs must be unique. Each key has an allowed role and local validity and revocation state. Evaluation keys additionally have allowed evaluation domains. No network requests occur.

## Signature and byte rules

This fixture profile is named `ws1-deployment-experiment/0.1+jcs-ed25519`. Its bytes are:

```text
UTF8("WS1-DEPLOYMENT-EXPERIMENT-v0.1") || 0x00 || UTF8(JCS(payload))
```

The 64-byte Ed25519 signature is lowercase hexadecimal. The profile, role, issuer, key ID, validity, artifact subject, all details and annotations are inside the signature. A binding to another statement is SHA-256 of the RFC 8785 canonicalized **whole envelope**, including its payload and signature. The signature preimage excludes the envelope and signature; these two byte constructions serve different purposes.

The prefix and raw hexadecimal envelope are local test framing. This is not JWS, COSE, DSSE, an EAT token, or a proposed replacement for any of them. A future adapter must specify the native signed-byte rules and carry the same semantic bindings without assuming reserialization is harmless.

Unicode property ordering uses UTF-16 code units, and non-ASCII strings remain UTF-8. The baseline carries U+1F600 and U+E000 property names plus `München` to distinguish this profile from a code-point sorter or ASCII-escaping serializer. Annotation contents have no admission semantics but remain signed.

## Evaluation rules

1. Reject malformed bundle/context structure, invalid Unicode, ambiguous local keys, inconsistent measurement widths and reversed validity windows before profile selection or authentication. These input errors take precedence even when a statement also has an unknown issuer, a bad signature or an unsupported profile. An otherwise well-formed unknown profile has a separate unsupported status. No verdict is issued for those processing failures.
2. For each non-null statement, resolve the issuer/key pair only in local policy, then check role and evaluator domain authorization. Verify the signature before using the statement's semantic claims. An unknown/unauthorized key or bad signature fails the candidate policy.
3. Check every authenticated statement and its signing-key entry at local `now`. Use `valid_from <= now < valid_until`. `valid_from` is an effective-time boundary, not proof of issuance time. Revoked keys fail; unknown revocation leaves the result not established.
4. Recompute the weight-byte SHA-256. Each authenticated statement must identify those bytes in the `weight-bytes/sha256` domain. A registry-manifest digest in that slot fails even if it has the same length or value.
5. Compare each environment measurement with its separately configured test/serving policy. Domain, algorithm and digest must all match; SHA-256 and SHA-384 require 32 and 48 bytes respectively. Each appraisal must cover every locally required adversary exclusion. Fail or inconclusive appraisals retain that meaning. Synthetic labels are not vendor measurement formats.
6. Require the evaluation domain and outcome to meet local policy, and bind evaluation to the exact supplied signed test appraisal. Require the serving appraisal's environment ID and nonce to match the local target and challenge.
7. Bind approval to the exact supplied signed evaluation and target. `deny` refuses. For `approve`, evaluate **every** condition against local observations. The v0.1 condition language supports only equality on `usage` and `region`, with conjunction semantics. An empty list explicitly means unconditional approval. An unknown operator/field is malformed, not ignored. A null observation makes the relevant condition not established; a conflicting observation fails.
8. Retain all collected reason codes in sorted unique order. A known failure takes precedence over unavailable evidence. If there are no failures but at least one unavailable premise, return not established. Only a complete pass admits. Processing errors preempt partial evidence findings.

Missing linked statements are handled through their required slots. For example, an evaluation pointing to an unavailable test appraisal cannot pass because `test_environment: null` contributes `MISSING_TEST_ENVIRONMENT`. A correct digest does not rescue a bad signature or an unknown appraisal.

## Candidate families

The machine-readable corpus defines exact expected status, verdict, admission and reasons. Case IDs and `claim` text are stable within this local revision. All expected outcomes were authored separately from evaluation; the generator never calls the checker.

| Family | Distinction exercised |
|---|---|
| Acceptances | Conditional and unconditional approval; inclusive start; an unused unknown context fact |
| Artifact | Changed local weights; signed subject mismatch in each role; wrong digest domain in each role |
| Authority/signature | Unknown issuer, wrong role/domain, rotated key ID, revoked/expired key, invalid signature in each role |
| Availability/time | Each claim missing, each claim expired, each key's revocation unknown, future claim |
| Environment | Wrong measurement value/domain, insufficient exclusions, failed/inconclusive appraisal, target/challenge substitution |
| Evaluation/approval | Wrong evidence links, wrong evaluation domain, failed/inconclusive result, denial, wrong approval target |
| Conditions | Both positions fail independently; both can be unknown; failure plus missing evidence preserves both reasons |
| Input/profile | Missing slot, boolean outcome, unsupported condition operator, producer trust-store injection, dates, measurement width, duplicate local keys, invalid Unicode |

The reference test suite also permutes object-property arrival order and checks that deeply nested malformed JSON returns a processing error without exhausting the call stack. Array order has its declared meaning: conditions are conjoined; statements are named slots. This package is not an unordered event-stream reconstruction experiment.

## Existing mechanisms and adapter work

This is a mapping of responsibilities, not a claim that the mechanisms interoperate as implemented here.

| Responsibility | Existing mechanism to investigate | Work remaining |
|---|---|---|
| Deterministic JSON bytes | [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785) | Native-envelope adapter and duplicate-rejecting wire parser |
| Signature envelope | [JWS, RFC 7515](https://www.rfc-editor.org/rfc/rfc7515) or [COSE, RFC 9052](https://www.rfc-editor.org/rfc/rfc9052) | Select one existing profile; specify protected metadata and binding digests |
| Attestation and appraisal | [RATS architecture, RFC 9334](https://www.rfc-editor.org/rfc/rfc9334) | Verify platform evidence, endorsements, freshness and artifact/workload binding; define a signed appraisal profile |
| Structural interchange | [JSON Schema 2020-12](https://json-schema.org/draft/2020-12/json-schema-core) | Independent schema/semantic implementation and native-format mappings |
| Policy and conditional approval | Relying-party policy plus an authorized signed decision | Compare existing authorization/policy representations before inventing a condition vocabulary |

## Decisions for WS1 reviewers

- Is model admission by the deployer the first agreed decision, and who supplies a second implementation and real evidence?
- Which existing signed formats should carry these claims? Can an explicit composition profile meet the use case without a new format?
- Should approval be a separate transported statement, an output of local policy, or both? Which party may authorize each condition?
- What establishes evaluator authority at evaluation time, historical appraisal validity, supersession, maximum age and revocation freshness?
- What binds model bytes to the measured workload, and how is the serving target observed? Which adversaries does each platform profile actually address?
- Which conditions need continuous enforcement after admission? Who supplies trustworthy region/usage facts, and what happens when they change?

The broad claims in the earlier discussion about universal format gaps or universal hardware protection limits are not prerequisites for this experiment and are not conclusions established by it. Successful local tests should lead to a second implementation and real adapter evidence, then to #31's existing-mechanism/profile/new-work decision gate.
