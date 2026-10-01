"""Second implementation of CONTRACT.md; no JS checker or fixture imports.

Shares the published schemas and contract, but uses Python jsonschema, rfc8785
and PyNaCl/libsodium instead of AJV, canonicalize and Node/OpenSSL Ed25519.
This is implementation diversity, not independent authorship or review.
"""
from __future__ import annotations

import calendar
import hashlib
import json
import math
import re
from pathlib import Path

import rfc8785
from jsonschema import Draft202012Validator, FormatChecker
from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

PROFILE = "ws1-deployment-experiment/0.1+jcs-ed25519"
PREFIX = b"WS1-DEPLOYMENT-EXPERIMENT-v0.1\0"
KINDS = ("evaluation", "test_environment", "serving_environment", "approval")
MAX_BYTES, MAX_DEPTH = 1048576, 64
ROOT = Path(__file__).resolve().parent


class WireError(ValueError):
    pass


def unicode_valid(value):
    todo = [value]
    while todo:
        item = todo.pop()
        if isinstance(item, str):
            try:
                item.encode("utf-8")
            except UnicodeEncodeError:
                return False
        elif isinstance(item, dict):
            todo.extend(item.keys())
            todo.extend(item.values())
        elif isinstance(item, list):
            todo.extend(item)
    return True


def parse_wire(data: bytes):
    if not isinstance(data, bytes):
        raise TypeError("Wire input must be bytes")
    if len(data) > MAX_BYTES:
        raise WireError("WIRE_LIMIT")
    try:
        text = data.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise WireError("WIRE_UTF8") from exc
    # Bound nesting before the standard parser can hit Python's recursion limit.
    depth, quoted, escape = 0, False, False
    for char in text:
        if quoted:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                quoted = False
        elif char == '"':
            quoted = True
        elif char in "[{":
            depth += 1
            if depth > MAX_DEPTH:
                raise WireError("WIRE_LIMIT")
        elif char in "]}":
            depth -= 1

    def pairs(entries):
        result = {}
        for key, value in entries:
            if key in result:
                raise WireError("WIRE_DUPLICATE_KEY")
            result[key] = value
        return result

    def bad_constant(_):
        raise WireError("WIRE_JSON")

    def number(value):
        parsed = float(value)
        if not math.isfinite(parsed):
            raise WireError("WIRE_JSON")
        return parsed

    try:
        result = json.loads(text, object_pairs_hook=pairs, parse_constant=bad_constant, parse_float=number)
    except WireError:
        raise
    except (ValueError, RecursionError) as exc:
        raise WireError("WIRE_JSON") from exc
    if not unicode_valid(result):
        raise WireError("INVALID_UNICODE")
    return result


formats = FormatChecker()


@formats.checks("date-time")
def whole_second_utc(value):
    if not isinstance(value, str):
        return True
    match = re.fullmatch(r"([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})Z", value)
    if not match:
        return False
    year, month, day, hour, minute, second = map(int, match.groups())
    return (1 <= month <= 12 and 1 <= day <= calendar.monthrange(year, month)[1]
            and hour < 24 and minute < 60 and second < 60)


BUNDLE = Draft202012Validator(json.loads((ROOT / "bundle.schema.json").read_text()), format_checker=formats)
CONTEXT = Draft202012Validator(json.loads((ROOT / "context.schema.json").read_text()), format_checker=formats)


def result(status, verdict=None, codes=()):
    return dict(status=status, verdict=verdict,
                decision="admit" if status == "complete" and verdict == "pass" else "refuse",
                codes=sorted(set(codes)))


def evaluate(bundle, context):
    if not unicode_valid(bundle) or not unicode_valid(context):
        return result("input_error", codes=["INVALID_UNICODE"])
    if not BUNDLE.is_valid(bundle):
        return result("input_error", codes=["INPUT_SCHEMA"])
    if not CONTEXT.is_valid(context):
        return result("input_error", codes=["CONTEXT_SCHEMA"])
    policy = context["policy"]
    keys = {(key["issuer"], key["key_id"]): key for key in policy["keys"]}
    if len(keys) != len(policy["keys"]):
        return result("input_error", codes=["DUPLICATE_TRUST_KEY"])
    payloads = [bundle[k]["payload"] for k in KINDS if bundle[k] is not None]
    measures = [policy["test_measurement"], policy["serving_measurement"]]
    measures.extend(p["details"]["measurement"] for p in payloads if p["kind"].endswith("_environment"))
    if any(len(m["digest"]) != {"sha256": 64, "sha384": 96}[m["algorithm"]] for m in measures):
        return result("input_error", codes=["MEASUREMENT_SHAPE"])
    if any(p["valid_from"] >= p["valid_until"] for p in list(keys.values()) + payloads):
        return result("input_error", codes=["VALIDITY_ORDER"])
    if bundle["profile"] != PROFILE or any(p["profile"] != PROFILE for p in payloads):
        return result("unsupported", codes=["UNSUPPORTED_PROFILE"])
    failures, unknowns, authenticated = set(), set(), {}
    now = context["now"]
    artifact = hashlib.sha256(bytes.fromhex(context["artifact_hex"])).hexdigest()
    for kind in KINDS:
        envelope = bundle[kind]
        suffix = kind.upper()
        if envelope is None:
            unknowns.add("MISSING_" + suffix)
            continue
        payload = envelope["payload"]
        key = keys.get((payload["issuer"], payload["key_id"]))
        if (key is None or kind not in key["roles"] or
                (kind == "evaluation" and policy["evaluation_domain"] not in key["evaluation_domains"])):
            failures.add("AUTHORITY_" + suffix)
            continue
        try:
            VerifyKey(bytes.fromhex(key["public_key"])).verify(
                PREFIX + rfc8785.dumps(payload), bytes.fromhex(envelope["signature"]))
        except BadSignatureError:
            failures.add("SIGNATURE_" + suffix)
            continue
        authenticated[kind] = payload["details"]
        for prefix, window in [("KEY_TIME_", key), ("TIME_", payload)]:
            if not window["valid_from"] <= now < window["valid_until"]:
                failures.add(prefix + suffix)
        if key["revocation"] == "revoked":
            failures.add("REVOKED_" + suffix)
        elif key["revocation"] == "unknown":
            unknowns.add("REVOCATION_" + suffix)
        if payload["subject"] != {"domain": "weight-bytes/sha256", "sha256": artifact}:
            failures.add("ARTIFACT_" + suffix)
        details = payload["details"]
        if kind.endswith("_environment"):
            expected_measurement = policy["test_measurement" if kind == "test_environment" else "serving_measurement"]
            if details["measurement"] != expected_measurement:
                failures.add("MEASUREMENT_" + suffix)
            if not set(policy["required_exclusions"]).issubset(details["adversary_exclusions"]):
                failures.add("THREAT_" + suffix)
            if details["outcome"] == "fail":
                failures.add("APPRAISAL_" + suffix)
            elif details["outcome"] == "not_established":
                unknowns.add("APPRAISAL_" + suffix)

    def binding(details, field, linked, code):
        if bundle[linked] is not None:
            digest = hashlib.sha256(rfc8785.dumps(bundle[linked])).hexdigest()
            if details[field] != digest:
                failures.add(code)

    if "evaluation" in authenticated:
        details = authenticated["evaluation"]
        if details["evaluation_domain"] != policy["evaluation_domain"]:
            failures.add("EVALUATION_DOMAIN")
        if details["outcome"] == "fail":
            failures.add("EVALUATION_RESULT")
        elif details["outcome"] == "not_established":
            unknowns.add("EVALUATION_RESULT")
        binding(details, "test_environment_digest", "test_environment", "TEST_BINDING")
    if "serving_environment" in authenticated:
        details = authenticated["serving_environment"]
        if details["environment_id"] != context["target_environment"]:
            failures.add("TARGET_BINDING")
        if details["nonce"] != context["challenge"]:
            failures.add("CHALLENGE_BINDING")
    if "approval" in authenticated:
        details = authenticated["approval"]
        binding(details, "evaluation_digest", "evaluation", "APPROVAL_BINDING")
        if details["serving_environment_id"] != context["target_environment"]:
            failures.add("APPROVAL_TARGET")
        if details["decision"] != "approve":
            failures.add("APPROVAL_DENIED")
        for condition in details["conditions"]:
            actual = context[condition["field"]]
            code = "CONDITION_" + condition["field"].upper()
            if actual is None:
                unknowns.add(code)
            elif actual != condition["value"]:
                failures.add(code)
    return result("complete", "fail" if failures else "not_established" if unknowns else "pass", failures | unknowns)


def evaluate_wire(bundle_bytes, context_bytes):
    try:
        return evaluate(parse_wire(bundle_bytes), parse_wire(context_bytes))
    except WireError as exc:
        return result("input_error", codes=[str(exc)])


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Verify separate producer bundle and local context files")
    parser.add_argument("bundle", type=Path)
    parser.add_argument("context", type=Path)
    args = parser.parse_args()
    def read_bounded(path):
        with path.open("rb") as stream:
            return stream.read(MAX_BYTES + 1)
    answer = evaluate_wire(read_bounded(args.bundle), read_bounded(args.context))
    print(json.dumps(answer, indent=2))
    raise SystemExit(0 if answer["decision"] == "admit" else 1)
