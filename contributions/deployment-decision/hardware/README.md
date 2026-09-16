# Azure SNP/vTPM adapter experiment

On 16 September 2026, a disposable Azure `Standard_DC2as_v5` confidential VM produced a version-5 SNP report, a Genoa endorsement chain, and an AK-signed TPM quote over a caller challenge and a synthetic artifact digest. The VM had no public IP. [azure-validation.json](azure-validation.json) records the capture hash, verification source hashes and 14 passing checks.

The adapter uses `weight-custody-manifest==0.28.2` for SNP/chain signatures, the HCL-to-AK link, TPM signatures, PCR-23 digest matching and qualifying-data verification. It adds bounded, duplicate-rejecting ingress, an explicit report-version boundary, an RSA exponent check, and verifier-side trust-root pinning. WCM is another project by this contributor; using it is not independent external validation.

The result is deliberately `cryptographic_checks_verified: true`, `deployment_verdict: not_established`, `decision: refuse`. The guest can reset and extend PCR 23. A matching value proves what was quoted under that AK, not which model executed. No adversary exclusions are inferred. A synthetic signed projection into the WS1 checker also refuses when the required platform premises are missing.

## Trust anchor

`amd-genoa-root.pem` was obtained independently from AMD's [Genoa KDS certificate-chain endpoint](https://kdsintf.amd.com/vcek/v1/Genoa/cert_chain), rather than enrolled from evidence. Its DER SHA-256 is:

```text
4c6598d19c18719c5dfd4a7d335f674e5bfe1d8f800cea2cf270c10d103db2f1
```

This adapter profile pins that root. Other processors need explicitly reviewed local enrollment. The capture's chain did not validate against the initially checked Milan root; the Genoa root was then retrieved from AMD. Merely accepting the last certificate supplied by a producer would defeat the authority boundary.

## Capture and replay

Use an isolated Azure SNP VM with vTPM and Secure Boot enabled. `capture_azure.py` resets application PCR 23 and must not run on an existing workload's VM. Install `tpm2-tools` and Python 3.10+ on that test VM. The run used Ubuntu confidential image `Canonical:0001-com-ubuntu-confidential-vm-jammy:22_04-lts-cvm:22.04.202608270`.

The relying party generates a random 32-byte challenge and records the artifact's SHA-256 independently. On the test VM:

```sh
sudo python3 capture_azure.py --artifact weights.bin --nonce <64-lowercase-hex-challenge> --out evidence.json
```

The script hashes the actual file bytes, extends PCR 23, and requests qualifying data `SHA256(nonce_bytes || artifact_sha256_bytes)`. The artifact digest in this binding is not a TLS transport key. The script reads HCL and AK material from the vTPM and obtains the VCEK/ASK from Azure's fixed local THIM endpoint. It does not enroll a trust root.

Transfer the evidence to the relying party. Retain it privately: HCL and VCEK include machine identifiers. Create a local context file containing only the independently recorded `nonce` and `artifact_sha256`, then run:

```sh
python -m pip install -r requirements-hardware.txt
python test_hardware.py --evidence evidence.json --context local-capture-context.json --now <timezone-aware-ISO-time>
```

For the synthetic composition check, `weights.bin` must contain the UTF-8 bytes `Synthetic WS1 model weights` followed by LF, matching the core corpus. The adapter itself accepts other caller-supplied artifact digests. The test prints a summary without raw evidence, tenant/subscription IDs or device identities. Destroy the disposable cloud resources after transferring the capture. Cloud capture is never triggered by CI.

## What was tested

The original capture validates under the separately enrolled root. Changed challenges and artifact digests, modified SNP measurements/signatures, modified TPM quotes/signatures, missing chains, an untrusted leaf, injected root fields and truncated HCL are rejected. Projection keeps the outcome unavailable, and signing that projection under an authorized fixture key does not bypass deployment policy.

## Limits

- This is one Azure capture over synthetic artifact bytes, not a model benchmark or a running-model deployment.
- The pinned library verifies certificate/report signatures and validity, but this experiment does not establish full vendor certificate-extension/TCB-policy conformance, current revocation, or an acceptable firmware/security-policy floor.
- A matched challenge demonstrates binding to the requested exchange. This stateless adapter does not consume the challenge, enforce a maximum age, or prevent repeated acceptance of the same exchange.
- PCR 23 is guest-writable. Model execution, measured-loader integrity, ownership of a transport key, target identity, location and continuing enforcement remain unestablished.
- The raw capture is retained privately for replay. The committed summary is an execution record, not independently verifiable hardware evidence. Reproduce with your own capture; the public CI jobs exercise only the core and wire tests.
- AMD report v2-v5 offsets used here were checked against the ABI and upstream parsing code; this is not validation of every version-specific field. Azure's zero-padded HCL tail is accepted only when the declared JSON slice fits and the remaining bytes are zero.

Sources: [Microsoft guest-attestation guidance](https://learn.microsoft.com/en-us/azure/confidential-computing/guest-attestation-confidential-vms), [Azure HCL structures](https://github.com/Azure/azure-guest-attestation-sdk/blob/main/crates/azure-guest-attestation-sdk/src/report.rs), [AMD SEV specifications](https://www.amd.com/en/developer/sev.html), [Google SNP ABI parsing](https://github.com/google/go-sev-guest/blob/main/abi/abi.go), [WCM Azure verifier](https://github.com/agentrust-io/weight-custody-manifest/blob/main/python/src/wcm/azure_vtpm.py).
