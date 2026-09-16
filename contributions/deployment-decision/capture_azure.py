#!/usr/bin/env python3
"""Capture on a disposable Azure SNP VM. Requires tpm2-tools, Python >=3.10.

Resets application PCR 23: use only on a dedicated test VM. The caller provides
the challenge; this script measures the supplied artifact bytes. Evidence is
private by default because HCL/VCEK include device identifiers.
"""
import argparse
import base64
import hashlib
import json
import re
import subprocess
import tempfile
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


def capture(artifact, nonce):
    if not re.fullmatch(r"[0-9a-f]{64}", nonce):
        raise ValueError("nonce must be 32 bytes of lowercase hexadecimal")
    digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
    # Bind the caller's challenge and artifact digest in the fresh AK quote.
    binding = hashlib.sha256(bytes.fromhex(nonce) + bytes.fromhex(digest)).hexdigest()
    with tempfile.TemporaryDirectory(prefix="ws1-capture-") as directory:
        root = Path(directory)
        def run(*args):
            return subprocess.run(args, check=True, capture_output=True, timeout=30).stdout
        hcl = run("tpm2_nvread", "-C", "o", "0x01400001")
        run("tpm2_readpublic", "-c", "0x81000003", "-f", "pem", "-o", str(root/"ak.pem"))
        run("tpm2_pcrreset", "23")
        run("tpm2_pcrextend", "23:sha256=" + digest)
        run("tpm2_quote", "-c", "0x81000003", "-l", "sha256:23", "-q", binding,
            "-m", str(root/"quote.msg"), "-s", str(root/"quote.sig"), "-g", "sha256")
        request = urllib.request.Request("http://169.254.169.254/metadata/THIM/amd/certification", headers={"Metadata": "true"})
        # Fixed Azure-local certificate endpoint. No producer-controlled URL.
        with urllib.request.urlopen(request, timeout=20) as response:
            thim = json.load(response)
        chain = re.findall(r"-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----", thim["certificateChain"], re.S)
        if len(chain) < 2:
            raise ValueError("missing AMD certificate chain")
        return {
            "kind": "wcm-azure-snp-vtpm/v1",
            "hcl_b64": base64.b64encode(hcl).decode(),
            "ak_pem": (root/"ak.pem").read_text(),
            "tpm_quote_b64": base64.b64encode((root/"quote.msg").read_bytes()).decode(),
            "tpm_signature_b64": base64.b64encode((root/"quote.sig").read_bytes()).decode(),
            "vcek_pem": thim["vcekCert"],
            "intermediates_pem": chain[:-1],
            # Never enroll the producer's root. Verifier fetches/enrolls its own.
        }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifact", required=True, type=Path)
    parser.add_argument("--nonce", required=True)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    document = capture(args.artifact, args.nonce)
    args.out.write_text(json.dumps(document, separators=(",", ":")) + "\n")
    args.out.chmod(0o600)
    print(json.dumps({"captured_at": datetime.now(timezone.utc).isoformat(),
                      "evidence_sha256": hashlib.sha256(args.out.read_bytes()).hexdigest(),
                      "bytes": args.out.stat().st_size}))
