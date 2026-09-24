"""Read-only cross-language scoring and strict-wire checks. Run: python test_interop.py.

Expected results stay in this harness; neither verifier receives them.
"""
import base64
import hashlib
import importlib.metadata
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import rfc8785
from verify import MAX_BYTES, MAX_DEPTH, WireError, evaluate, evaluate_wire, parse_wire

ROOT = Path(__file__).resolve().parent


def encode(value):
    return json.dumps(value, ensure_ascii=True, separators=(",", ":")).encode()


def b64(data):
    return base64.b64encode(data).decode()


def check():
    raw = (ROOT / "vectors.json").read_bytes()
    manifest = json.loads((ROOT / "corpus-manifest.json").read_bytes())
    assert hashlib.sha256(raw).hexdigest() == manifest["sha256"]
    cases = json.loads(raw)["cases"]
    ids = [c["id"] for c in cases]
    assert ids == manifest["ids"] and len(ids) == manifest["count"] == len(set(ids))
    requests, expected, labels = [], [], []
    for case in cases:
        bundle, context = map(encode, (case["input"]["bundle"], case["input"]["context"]))
        assert evaluate(**case["input"]) == case["expected"], case["id"]
        assert evaluate_wire(bundle, context) == case["expected"], case["id"]
        requests.append(dict(bundle=b64(bundle), context=b64(context)))
        expected.append(case["expected"])
        labels.append(case["id"])

    # Literal wire cases authored independently of either parser.
    probes = [
        ("duplicate-root", b'{"a":1,"a":2}', "WIRE_DUPLICATE_KEY"),
        ("duplicate-nested", b'{"outer":[{"a":1,"a":2}]}', "WIRE_DUPLICATE_KEY"),
        ("escaped-duplicate", b'{"a":1,"\\u0061":2}', "WIRE_DUPLICATE_KEY"),
        ("prototype-duplicate", b'{"__proto__":1,"__proto__":2}', "WIRE_DUPLICATE_KEY"),
        ("malformed-utf8", b'{"a":"\xc0\xaf"}', "WIRE_UTF8"),
        ("truncated-utf8", b'{"a":"\xe2\x82"}', "WIRE_UTF8"),
        ("surrogate-value", b'{"a":"\\ud800"}', "INVALID_UNICODE"),
        ("surrogate-key", b'{"\\udfff":0}', "INVALID_UNICODE"),
        ("bom", b'\xef\xbb\xbf{}', "WIRE_JSON"),
        ("trailing-data", b'{}{}', "WIRE_JSON"),
        ("trailing-comma", b'{"a":1,}', "WIRE_JSON"),
        ("leading-zero", b'{"a":01}', "WIRE_JSON"),
        ("bad-escape", b'{"a":"\\x20"}', "WIRE_JSON"),
        ("nonfinite", b'{"a":NaN}', "WIRE_JSON"),
        ("overflow-number", b'{"a":1e999}', "WIRE_JSON"),
        ("oversized-integer", b'{"a":' + b'9'*5000 + b'}', "WIRE_JSON"),
        ("too-deep", b'[' * (MAX_DEPTH + 1) + b'0' + b']' * (MAX_DEPTH + 1), "WIRE_LIMIT"),
        ("too-large", b' ' * (MAX_BYTES + 1), "WIRE_LIMIT"),
    ]
    for name, raw_probe, error in probes:
        try:
            parse_wire(raw_probe)
            raise AssertionError(name + " was accepted")
        except WireError as exc:
            assert str(exc) == error, (name, str(exc), error)
        requests.append(dict(parse=b64(raw_probe)))
        expected.append(dict(error=error))
        labels.append(name)
    valid = [
        ("prototype-is-data", b'{"__proto__":{"polluted":true},"constructor":"value"}'),
        ("same-key-different-objects", b'[{"a":1},{"a":2}]'),
        ("escaped-pair", b'{"\\ud83d\\ude00":"M\\u00fcnchen"}'),
        ("escaped-punctuation", b'{"x":"\\\"}{[]\\\\"}'),
        ("depth-boundary", b'[' * MAX_DEPTH + b'0' + b']' * MAX_DEPTH),
        ("byte-boundary", b'{}' + b' ' * (MAX_BYTES - 2)),
    ]
    for name, raw_probe in valid:
        value = json.loads(raw_probe)
        assert parse_wire(raw_probe) == value, name
        requests.append(dict(parse=b64(raw_probe)))
        expected.append(dict(value=value))
        labels.append(name)
    # Duplicate fields are rejected on both sides of the trust boundary, even
    # if an ordinary last-value-wins parser would reconstruct the passing input.
    good = cases[0]["input"]
    for field in ("bundle", "context"):
        pair = {key: encode(value) for key, value in good.items()}
        key = "profile" if field == "bundle" else "now"
        pair[field] = b'{"' + key.encode() + b'":"ignored",' + pair[field][1:]
        refusal = dict(status="input_error", verdict=None, decision="refuse", codes=["WIRE_DUPLICATE_KEY"])
        assert evaluate_wire(pair["bundle"], pair["context"]) == refusal
        requests.append({key: b64(value) for key, value in pair.items()})
        expected.append(refusal)
        labels.append("duplicate-" + field + "-ingress")

    run = subprocess.run(["node", str(ROOT / "wire-worker.mjs")],
                         input="\n".join(json.dumps(r) for r in requests) + "\n",
                         text=True, encoding="utf-8", capture_output=True, check=True)
    actual = [json.loads(line) for line in run.stdout.splitlines()]
    assert len(actual) == len(expected)
    for name, got, want in zip(labels, actual, expected):
        assert got == want, (name, got, want)
    # Exercise the actual separate-file entrypoints, including refusal exit codes.
    with tempfile.TemporaryDirectory(prefix="ws1-wire-") as directory:
        bundle_file, context_file = (Path(directory)/name for name in ("bundle.json", "context.json"))
        for duplicate in (False, True):
            bundle_bytes = encode(good["bundle"])
            if duplicate:
                bundle_bytes = b'{"profile":"ignored",' + bundle_bytes[1:]
            bundle_file.write_bytes(bundle_bytes)
            context_file.write_bytes(encode(good["context"]))
            for program in (["node", str(ROOT/"check-wire.mjs")], [sys.executable, str(ROOT/"verify.py")]):
                child = subprocess.run(program + [str(bundle_file), str(context_file)], capture_output=True, text=True, encoding="utf-8")
                assert child.returncode == int(duplicate), child.stderr
                answer = json.loads(child.stdout)
                assert answer["decision"] == ("refuse" if duplicate else "admit")
                if duplicate:
                    assert answer["codes"] == ["WIRE_DUPLICATE_KEY"]
    assert rfc8785.dumps({"\ue000": "last", "\U0001f600": "München"}) == '{"😀":"München","\ue000":"last"}'.encode()
    # Independent Ed25519 known-answer vector: RFC 8032 section 7.1, test 1.
    from nacl.signing import VerifyKey
    VerifyKey(bytes.fromhex("d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a")).verify(b"", bytes.fromhex(
        "e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555f"
        "b8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b"))
    report = dict(status="pass", candidates=len(cases), matched=len(cases), wire_checks=len(labels)-len(cases),
                  cli_checks=4, python=sys.version.split()[0], libraries={p: importlib.metadata.version(p) for p in ["jsonschema", "rfc8785", "PyNaCl"]},
                  vector_sha256=hashlib.sha256(raw).hexdigest(),
                  source_sha256={name: hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in
                                 ["verify.py", "wire.mjs", "check-wire.mjs", "wire-worker.mjs", "test_interop.py", "test_mutations.py", "requirements.txt"]},
                  limits=["Both implementations authored in this contribution; no independent external review.",
                          "Shared contract, schemas and authored corpus; matching outcomes can preserve a shared specification error."])
    print(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    check()
