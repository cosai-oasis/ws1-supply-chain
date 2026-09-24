"""Causal probes for selected gates in the Python verifier and wire parsers.

These complement the existing JS checker mutations; they do not measure
exhaustive coverage. Mutations live in memory or automatically removed files.
"""
import base64
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def check():
    source = (ROOT/"verify.py").read_text(encoding="utf-8")
    cases = json.loads((ROOT/"vectors.json").read_bytes())["cases"]
    mutations = [
        ("signature", 'VerifyKey(bytes.fromhex(key["public_key"])).verify(\n                PREFIX + rfc8785.dumps(payload), bytes.fromhex(envelope["signature"]))', 'None'),
        ("artifact", 'payload["subject"] != {"domain": "weight-bytes/sha256", "sha256": artifact}', 'False'),
        ("claim-and-key-time", 'not window["valid_from"] <= now < window["valid_until"]', 'False'),
        ("condition", 'actual != condition["value"]', 'False'),
        ("measurement", 'details["measurement"] != expected_measurement', 'False'),
        ("binding", 'details[field] != digest', 'False'),
        ("unknown-admission", 'verdict == "pass"', 'verdict != "fail"'),
    ]
    detected = {}
    for name, before, after in mutations:
        assert source.count(before) == 1, name
        scope = {"__file__": str(ROOT/"verify.py"), "__name__": "mutation"}
        exec(compile(source.replace(before, after), str(ROOT/"verify.py"), "exec"), scope)
        failures = [c["id"] for c in cases if scope["evaluate"](**c["input"]) != c["expected"]]
        assert failures, "surviving mutation: " + name
        detected["python-" + name] = failures

    probe = b'{"a":1,"\\u0061":2}'
    scope = {"__file__": str(ROOT/"verify.py"), "__name__": "mutation"}
    assert source.count('if key in result:') == 1
    exec(compile(source.replace('if key in result:', 'if False:'), str(ROOT/"verify.py"), "exec"), scope)
    assert scope["parse_wire"](probe) == {"a": 2}
    detected["python-duplicate-key"] = ["escaped-duplicate"]
    js = (ROOT/"wire.mjs").read_text(encoding="utf-8")
    assert js.count('names.has(key)') == 1
    mutant = ROOT/".mutant-wire.mjs"
    try:
        mutant.write_text(js.replace('names.has(key)', 'false'), encoding="utf-8")
        code = "import {parseWire} from './.mutant-wire.mjs'; console.log(JSON.stringify(parseWire(Buffer.from(process.argv[1], 'base64'))));"
        run = subprocess.run(["node", "--input-type=module", "-e", code, base64.b64encode(probe).decode()],
                             cwd=ROOT, check=True, capture_output=True, text=True)
        assert json.loads(run.stdout) == {"a": 2}
        detected["node-duplicate-key"] = ["escaped-duplicate"]
    finally:
        mutant.unlink(missing_ok=True)
    print(json.dumps({"status": "pass", "mutants_killed": len(detected), "detected_by": detected}, indent=2))
    return detected


if __name__ == "__main__":
    check()
