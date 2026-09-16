# Second implementation and strict ingress

The Node and Python implementations match all 82 authored candidate results, including exact reason codes. This is a second implementation by the same contributor. It is not independent external validation or a WS1 interoperability certification.

| Responsibility | Node.js | Python |
|---|---|---|
| Schema validation | AJV | jsonschema |
| Canonicalization | canonicalize | rfc8785 |
| Ed25519 | Node crypto / OpenSSL | PyNaCl / libsodium |
| Duplicate rejection | Bounded JSON parser with decoded-name sets | Standard JSON parser with object-pairs hook and a depth scan |
| Semantic policy | checker.mjs | verify.py |

The contract, generated schemas and candidate corpus are shared. Expected answers are held in the scoring harness; neither verifier receives them. The Python verifier does not invoke Node or import the fixture generator. The optional hardware adapter's cryptography/OpenSSL dependency is separate from Python's Ed25519 verification path.

## Reproduce

```sh
python -m venv .venv
# Activate the virtual environment using the command for your shell.
python -m pip install -r requirements.txt
npm ci --ignore-scripts
npm test
python test_interop.py
python test_mutations.py
```

`test_interop.py` checks corpus bytes and exact IDs, scores both implementations, exercises 26 strict-wire cases and four separate-file CLI invocations, and checks literal JCS Unicode bytes and RFC 8032's first Ed25519 known-answer vector. It prints a JSON report without changing committed files. `interop-results.json` records one run, including source hashes.

`test_mutations.py` removes seven selected Python semantic gates and duplicate rejection from each wire parser. The seven semantic mutations must disagree with at least one authored result; removing duplicate detection must admit the duplicate-key counterexample. These nine probes supplement the 25 existing Node checker mutations. They are not an exhaustive fault model.

Use separate producer and local inputs at the boundary:

```sh
node check-wire.mjs bundle.json local-context.json
python verify.py bundle.json local-context.json
```

Both commands return exit code 0 only for admission and 1 for a refusal. File access errors are operational errors, not evidence verdicts. Never let the producer choose `local-context.json`.

## A discrepancy the second implementation exposed

The original schemas ended hex patterns with `$`. Python's regex validator accepted a final newline, and Python's hex decoder discarded it; the Node path rejected the same input. A signature, artifact byte string or public key with a final newline could therefore admit only in Python.

The schemas now use an explicit end-of-input assertion, and three new language-neutral vectors require an input error for those encodings. This tightens implementation agreement with the existing lowercase-hex contract; it does not change the signature profile.

## Bounds and remaining work

Wire inputs are capped at 1 MiB each and 64 container levels. Duplicate names are rejected after decoding escapes, so `a` and `\u0061` collide. `__proto__` is ordinary data; it cannot mutate a prototype. Invalid UTF-8, BOMs, non-finite numbers, trailing data and lone surrogates are rejected. Multiple simultaneous wire faults may produce different first-error codes.

The candidate schemas accept no numeric claim fields. These tests do not establish general-purpose cross-language JSON number interoperability. The byte limit also prevents these inline artifact fixtures from representing full model-weight files. A production adapter needs a separately authenticated artifact stream and decision/enforcement boundary.

The next independent check is another contributor implementing the contract and bringing additional cases. Native JWS/COSE composition, historical authority, revocation freshness and continuing enforcement remain open.

References: [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785), [RFC 8032 section 7.1](https://www.rfc-editor.org/rfc/rfc8032#section-7.1).
