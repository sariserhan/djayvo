#!/usr/bin/env python3
"""Bundle committed history and synthetic Linux references for the Mac checkpoint."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("dist/djayvo-mac-handoff.tar.gz"))
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    if subprocess.check_output(["git", "status", "--porcelain"], cwd=root, text=True):
        raise ValueError("commit the reviewed source/evidence before packaging the handoff")
    provenance_path = root / "renders/fixtures/synthetic-speech.provenance.json"
    provenance = json.loads(provenance_path.read_text())
    fixture = root / "renders/fixtures/synthetic-speech.wav"
    digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    if provenance["is_human_recording"] is not False or digest(fixture) != provenance["sha256"]:
        raise ValueError("only the verified synthetic fixture may enter this handoff")
    files = [fixture, provenance_path]
    artifacts = json.loads((root / "docs/evidence/m0/artifacts.json").read_text())
    for style in ("hiphop", "reggae", "experimental"):
        for extension in (".wav", ".score.json", ".report.json", ".events.tsv"):
            relative = f"renders/m0/remix.{style}{extension}"
            path = root / relative
            if digest(path) != artifacts[relative]["sha256"]:
                raise ValueError(f"reference hash mismatch: {relative}")
            files.append(path)
    bundle = output.parent / "djayvo-history.bundle"
    subprocess.run(["git", "bundle", "create", str(bundle), "--all"], cwd=root, check=True)
    with tarfile.open(output, "w:gz") as archive:
        archive.add(bundle, arcname="djayvo-transfer/repository.bundle")
        archive.add(root / "docs/mac-agent-handoff.md", arcname="djayvo-transfer/MAC_HANDOFF.md")
        for path in files:
            archive.add(path, arcname="djayvo-transfer/" + path.relative_to(root).as_posix())
    checksum = digest(output)
    output.with_name(output.name + ".sha256").write_text(f"{checksum}  {output.name}\n")
    print(f"PASS: {output} ({output.stat().st_size} bytes)")
    print(f"SHA-256: {checksum}")


if __name__ == "__main__":
    main()
