"""Replay a private capture with explicit local expectations; emit a shareable summary.

python test_hardware.py --evidence EVIDENCE --context LOCAL_CONTEXT --now ISO_TIME
The summary contains hashes and outcomes, not raw quotes or machine identifiers.
"""
import argparse
import base64
import hashlib
import importlib.metadata
import json
from datetime import datetime
from pathlib import Path

from azure_adapter import ROOT_FILE, ROOT_SHA256, appraise, serving_details
from verify import parse_wire


def run(evidence, local, now):
    def verify(raw, **changes):
        return appraise(raw, now=now, **(local | changes))
    positive = verify(evidence)
    assert positive["cryptographic_checks_verified"], positive
    assert positive["decision"] == "refuse" and positive["deployment_verdict"] == "not_established"
    checks = {"authentic_capture": True, "authentic_capture_does_not_admit": True}
    document = parse_wire(evidence)
    def encoded(doc):
        return json.dumps(doc, separators=(",", ":")).encode()
    def changed(name, field, offset):
        doc = dict(document)
        data = bytearray(base64.b64decode(doc[field]))
        data[offset] ^= 1
        doc[field] = base64.b64encode(data).decode()
        check_refusal(name, encoded(doc))
    def check_refusal(name, raw, **kwargs):
        got = verify(raw, **kwargs)
        assert not got["cryptographic_checks_verified"] and got["decision"] == "refuse", (name, got)
        checks[name] = True
    check_refusal("wrong_challenge", evidence, nonce="ff" * 32)
    check_refusal("wrong_artifact", evidence, artifact_sha256="ff" * 32)
    changed("tampered_snp_measurement", "hcl_b64", 32 + 0x90)
    changed("tampered_snp_signature", "hcl_b64", 32 + 0x2A0)
    changed("tampered_tpm_signature", "tpm_signature_b64", -1)
    changed("tampered_tpm_quote", "tpm_quote_b64", -1)
    check_refusal("producer_root_injection", encoded(document | {"root_pem": ROOT_FILE.read_text()}))
    check_refusal("missing_chain", encoded(document | {"intermediates_pem": []}))
    check_refusal("untrusted_leaf", encoded(document | {"vcek_pem": ROOT_FILE.read_text()}))
    check_refusal("truncated_hcl", encoded(document | {"hcl_b64": "AA=="}))
    details = serving_details(positive, environment_id="local-test-target", nonce=local["nonce"])
    assert details["outcome"] == "not_established" and details["adversary_exclusions"] == []
    checks["projection_preserves_missing_premises"] = True
    # Integration into the candidate signed evidence chain is deliberately
    # synthetic: even when an authorized fixture appraiser signs it, no admit.
    import copy
    import rfc8785
    from nacl.signing import SigningKey
    from verify import ROOT, PREFIX, evaluate
    case = copy.deepcopy(json.loads((ROOT/"vectors.json").read_bytes())["cases"][0]["input"])
    bundle, context = case["bundle"], case["context"]
    assert hashlib.sha256(bytes.fromhex(context["artifact_hex"])).hexdigest() == local["artifact_sha256"]
    context["challenge"] = local["nonce"]
    context["policy"]["serving_measurement"] = positive["measurement"]
    payload = bundle["serving_environment"]["payload"]
    payload["details"] = serving_details(positive, environment_id=context["target_environment"], nonce=local["nonce"])
    payload["annotations"] = {"hardware_evidence_sha256": positive["evidence_sha256"]}
    bundle["serving_environment"]["signature"] = SigningKey(bytes([3])*32).sign(PREFIX+rfc8785.dumps(payload)).signature.hex()
    decision = evaluate(bundle, context)
    assert decision == dict(status="complete", verdict="fail", decision="refuse",
                            codes=["APPRAISAL_SERVING_ENVIRONMENT", "THREAT_SERVING_ENVIRONMENT"]), decision
    checks["signed_projection_cannot_bypass_deployment_policy"] = True
    return dict(status="pass", checked_at=now.isoformat(), checks=checks, check_count=len(checks),
                evidence_sha256=positive["evidence_sha256"], root_certificate_sha256=ROOT_SHA256,
                nonce_sha256=hashlib.sha256(bytes.fromhex(local["nonce"])).hexdigest(),
                artifact_sha256=local["artifact_sha256"],
                libraries={p: importlib.metadata.version(p) for p in ["weight-custody-manifest", "cryptography"]},
                source_sha256={p: hashlib.sha256((Path(__file__).parent/p).read_bytes()).hexdigest() for p in
                               ["azure_adapter.py", "capture_azure.py", "test_hardware.py", "requirements-hardware.txt"]},
                cryptographic_checks_verified=True, deployment_decision="refuse",
                limits=["Raw device-identifying evidence retained privately; this summary is not a portable attestation.",
                        "Demonstrates SNP/chain signatures, HCL AK link, fresh challenge binding and guest-written PCR 23.",
                        "Does not establish executed model identity, current revocation, full platform policy, nonce consumption or continuing enforcement.",
                        "WCM is another project by the same contributor; this adapter is not independent external validation."])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence", type=Path, required=True)
    parser.add_argument("--context", type=Path, required=True)
    parser.add_argument("--now", required=True)
    args = parser.parse_args()
    local = parse_wire(args.context.read_bytes())
    print(json.dumps(run(args.evidence.read_bytes(), local, datetime.fromisoformat(args.now)), indent=2))
