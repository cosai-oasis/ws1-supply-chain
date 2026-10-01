"""Experimental Azure SNP/vTPM adapter. Verifies a bounded cryptographic claim.

No network, fixture keys, caller clock lookup, producer trust enrollment, or
admission side effects. PCR 23 is guest-writable: matching it does not prove
that a measured model was executed. Successful checks therefore remain
not_established for deployment. See hardware/README.md for the exact boundary.
"""
import base64
import hashlib
import re
from datetime import datetime
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from wcm import AzureSnpVtpmVerifier, TrustStore, QuoteFormatError
from wcm.snp import extract_snp_report_from_hcl, parse_snp_report

from verify import WireError, parse_wire

ROOT_FILE = Path(__file__).resolve().parent / "hardware" / "amd-genoa-root.pem"
ROOT_SHA256 = "4c6598d19c18719c5dfd4a7d335f674e5bfe1d8f800cea2cf270c10d103db2f1"
FIELDS = {"kind", "hcl_b64", "ak_pem", "tpm_quote_b64", "tpm_signature_b64", "vcek_pem", "intermediates_pem"}


def appraise(evidence: bytes, *, nonce: str, artifact_sha256: str, now: datetime):
    """nonce, expected artifact and time are relying-party inputs, never evidence fields.

The existing WCM verifier checks SNP/chain signatures, HCL-to-AK binding,
TPM signature, PCR digest and qualifying data. Here channel_binding carries
the artifact digest; it is NOT an attested TLS key or a proof of channel ownership.
"""
    if (not re.fullmatch(r"[0-9a-f]{64}", nonce) or
            not re.fullmatch(r"[0-9a-f]{64}", artifact_sha256) or now.tzinfo is None):
        raise ValueError("Local policy requires 32-byte nonce/digest and timezone-aware time")
    response = dict(evidence_sha256=hashlib.sha256(evidence).hexdigest(),
                    cryptographic_checks_verified=False, deployment_verdict="fail",
                    decision="refuse", measurement=None, codes=[])
    try:
        document = parse_wire(evidence)
        if (not isinstance(document, dict) or set(document) != FIELDS or
                document["kind"] != "wcm-azure-snp-vtpm/v1" or
                any(not isinstance(document[k], str) for k in FIELDS - {"intermediates_pem"}) or
                not isinstance(document["intermediates_pem"], list) or
                len(document["intermediates_pem"]) != 1 or
                not isinstance(document["intermediates_pem"][0], str)):
            raise ValueError("Unsupported evidence structure")
        hcl = base64.b64decode(document["hcl_b64"], validate=True)
        if len(hcl) > 16384:
            raise ValueError("Oversized HCL")
        report = parse_snp_report(extract_snp_report_from_hcl(hcl))
        # AMD ABI v2-v5 retain the report-data, measurement and signature offsets
        # used here. No claims about the additional version-specific policy bits.
        if report.version not in (2, 3, 4, 5):
            raise ValueError("Unreviewed SNP report version")
        runtime = hcl[32 + 1184:]
        if len(runtime) < 20:
            raise ValueError("Truncated HCL runtime")
        length = int.from_bytes(runtime[16:20], "little")
        if length > len(runtime[20:]) or any(runtime[20 + length:]):
            raise ValueError("HCL runtime length mismatch")
        runtime_doc = parse_wire(runtime[20:20 + length])
        candidates = [k for k in runtime_doc["keys"] if k.get("kid") == "HCLAkPub"]
        if len(candidates) != 1:
            raise ValueError("Ambiguous HCL AK")
        # Compare BOTH RSA components; the library currently compares only n.
        jwk = candidates[0]
        public = serialization.load_pem_public_key(document["ak_pem"].encode()).public_numbers()
        integer = lambda v: int.from_bytes(base64.b64decode(v + "=" * (-len(v) % 4), altchars=b"-_", validate=True), "big")
        if jwk["kty"] != "RSA" or integer(jwk["n"]) != public.n or integer(jwk["e"]) != public.e:
            raise ValueError("HCL AK mismatch")
        for name in ("tpm_quote_b64", "tpm_signature_b64"):
            if len(base64.b64decode(document[name], validate=True)) > 4096:
                raise ValueError("Oversized TPM evidence")
        root = x509.load_pem_x509_certificate(ROOT_FILE.read_bytes())
        if root.fingerprint(hashes.SHA256()).hex() != ROOT_SHA256:
            raise ValueError("Local root changed without review")
        trust = TrustStore()
        trust.add_root(root)
        verification = AzureSnpVtpmVerifier(trust).verify(
            base64.b64encode(evidence).decode(), expected_nonce=nonce,
            channel_binding=bytes.fromhex(artifact_sha256),
            expected_workload_measurement="sha256:" + artifact_sha256, now=now)
        if not verification.verified:
            response["codes"] = ["AZURE_CRYPTOGRAPHIC_CHECK_FAILED"]
            return response
    except (WireError, QuoteFormatError, ValueError, TypeError, KeyError, IndexError, AttributeError, OverflowError):
        response["codes"] = ["AZURE_EVIDENCE_INVALID"]
        return response
    response.update(cryptographic_checks_verified=True, deployment_verdict="not_established",
                    measurement=dict(domain="amd-sev-snp/launch-measurement", algorithm="sha384", digest=report.measurement.hex()),
                    codes=["MODEL_EXECUTION_NOT_ESTABLISHED", "PLATFORM_POLICY_NOT_ESTABLISHED",
                           "REVOCATION_FRESHNESS_NOT_ESTABLISHED", "SINGLE_USE_CHALLENGE_NOT_ESTABLISHED"])
    return response


def serving_details(appraisal, *, environment_id, nonce):
    """Project verified measurement into a candidate appraisal for signing upstream.

An appraiser still supplies its own identity, authority, time window and signature.
The target identifier is a local association, not an Azure-attested identity.
No adversary exclusion or successful deployment verdict is invented here.
"""
    if not appraisal["cryptographic_checks_verified"] or appraisal["measurement"] is None:
        raise ValueError("No authenticated measurement to transport")
    return dict(environment_id=environment_id, measurement=appraisal["measurement"],
                adversary_exclusions=[], nonce=nonce, outcome="not_established")
