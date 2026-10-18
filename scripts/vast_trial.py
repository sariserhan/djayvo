#!/usr/bin/env python3
"""Control one explicitly authorized $10 research rental; never upload the key."""
import argparse
import json
import math
import os
from pathlib import Path
import subprocess
import shutil
import sys
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "build-cloud"
STATE = WORK / "trial-state.json"
LABEL = "djayvo-music-trial-20261018"
DISK_GB = 60
LEASE_SECONDS = 5400
HOURLY_CEILING = 0.75


def api(path, method="GET", data=None):
    key = os.environ.get("VASTAI_KEY")
    if not key:
        for relative in ("env.local", ".env.local", "apps/.env.local", "apps/site/.env.local"):
            file = ROOT / relative
            if not file.is_file():
                continue
            for line in file.read_text().splitlines():
                name, sep, value = line.strip().partition("=")
                if sep and name.strip() == "VASTAI_KEY":
                    key = value.strip().strip("\"'")
                    break
            if key:
                break
    if not key:
        raise RuntimeError("VASTAI_KEY is not configured")
    request = urllib.request.Request(
        "https://console.vast.ai/api/" + path,
        data=None if data is None else json.dumps(data).encode(),
        headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
        method=method,
    )
    with urllib.request.urlopen(request, timeout=25) as response:
        result = json.load(response)
    if isinstance(result, dict) and result.get("success") is False:
        # Provider messages may echo request values; do not log them.
        raise RuntimeError("Vast rejected request: " + path)
    return result


def instances():
    items, token = [], None
    while True:
        path = "v1/instances?limit=25"
        if token:
            path += "&after_token=" + urllib.parse.quote(token, safe="")
        result = api(path)
        page = result.get("instances")
        if not isinstance(page, list) or any(not isinstance(i.get("id"), int) for i in page):
            raise RuntimeError("Unexpected instance response; refusing to infer an empty account")
        items.extend(page)
        token = result.get("next_token")
        if not token:
            return items


def quote(offer):
    fields = ("dph_total", "storage_cost", "inet_down_cost", "inet_up_cost")
    for field in fields:
        if field not in offer or not math.isfinite(float(offer[field])) or float(offer[field]) < 0:
            raise ValueError("Missing or invalid price: " + field)
    hourly = float(offer["dph_total"]) + DISK_GB * float(offer["storage_cost"]) / 720
    # Reserve 60 GB in each direction, even though this small batch needs far less.
    reserved = hourly * LEASE_SECONDS / 3600 + 60 * (
        float(offer["inet_down_cost"]) + float(offer["inet_up_cost"]))
    if hourly > HOURLY_CEILING or reserved > 6:
        raise ValueError("Offer exceeds trial price ceiling")
    if offer.get("num_gpus") != 1 or offer.get("gpu_ram", 0) < 24000:
        raise ValueError("Trial requires one GPU with at least 24 GB")
    return {"hourly_with_60gb_disk": hourly, "reserved_lease_plus_transfer": reserved}


def offers():
    result = api("v0/bundles", "POST", {
        "limit": 30, "type": "on-demand", "verified": {"eq": True},
        "rentable": {"eq": True}, "rented": {"eq": False}, "num_gpus": {"eq": 1},
        "gpu_name": {"in": ["RTX 3090", "RTX 4090", "RTX A5000"]},
        "reliability": {"gte": 0.99}, "cpu_ram": {"gte": 32000},
        "disk_space": {"gte": DISK_GB}, "cuda_max_good": {"gte": 12.8},
        "inet_down": {"gte": 100}, "order": [["dph_total", "asc"]],
    })
    valid = []
    for offer in result.get("offers", []):
        try:
            prices = quote(offer)
        except ValueError:
            continue
        valid.append({**{k: offer[k] for k in (
            "id", "machine_id", "host_id", "gpu_name", "gpu_ram", "num_gpus", "cpu_ram", "geolocation",
            "reliability", "dph_total", "storage_cost", "inet_down_cost", "inet_up_cost")},
            **prices})
    return sorted(valid, key=lambda o: o["reserved_lease_plus_transfer"])


def write_state(state):
    temporary = STATE.with_suffix(".tmp")
    temporary.write_text(json.dumps(state, indent=2) + "\n")
    temporary.chmod(0o600)
    temporary.replace(STATE)


def retry_credit(account, previous):
    if not previous.get("destroy_requested_at"):
        raise RuntimeError("Previous trial has no cleanup receipt")
    credit = float(account["credit"])
    anchor = float(previous["starting_credit"])
    if not math.isfinite(credit) or not math.isfinite(anchor) or anchor - credit >= 7:
        raise RuntimeError("Combined trial budget is unavailable")
    return anchor


def attach_key(instance_id, public_key):
    path = "v0/instances/" + str(instance_id) + "/ssh"
    keys = api(path)["ssh_keys"]
    keys = json.loads(keys) if isinstance(keys, str) else keys
    if not isinstance(keys, list) or any(not isinstance(k, dict) for k in keys):
        raise RuntimeError("Unexpected attached-key response")
    # Account keys are inherited on creation; attaching them twice is rejected.
    if not any(k.get("public_key", "").split()[:2] == public_key.split()[:2] for k in keys):
        api(path, "POST", {"ssh_key": public_key})


def destroy(state):
    # Only the newly created, locally recorded trial may be destroyed.
    candidates = [i for i in instances() if i["id"] == state.get("id") or
                  (not state.get("id") and i.get("label") == LABEL)]
    if len(candidates) > 1:
        raise RuntimeError("Ambiguous trial instances; manual reconciliation required")
    found = candidates[0] if candidates else None
    if found is not None:
        if found.get("label") != LABEL:
            raise RuntimeError("Refusing to delete an instance with a different label")
        state["id"] = found["id"]
        api("v0/instances/" + str(found["id"]), "DELETE")
    state["destroy_requested_at"] = time.time()
    write_state(state)


def watch():
    state = json.loads(STATE.read_text())
    failures = 0
    while True:
        state = json.loads(STATE.read_text())
        if state.get("destroy_requested_at"):
            return
        try:
            current = api("v0/users/current")
            spent = max(0, state["starting_credit"] - float(current["credit"]))
            failures = 0
            if time.time() >= state["deadline"] or spent >= 7:
                break
        except Exception:
            failures += 1
            if failures >= 3:
                break
        time.sleep(20)
    print("Trial watchdog requesting cleanup", flush=True)
    # An independent local process survives the interactive agent turn.
    # shortcut: provider/network outages can delay deletion; this is not a provider-enforced cap.
    while True:
        try:
            destroy(state)
            print("Cleanup request accepted", flush=True)
            return
        except Exception:
            print("Cleanup unavailable; retrying in 20 seconds", flush=True)
            time.sleep(20)


def main():
    global WORK, STATE, LABEL, LEASE_SECONDS, HOURLY_CEILING
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["status", "offers", "rent", "destroy", "watch"])
    parser.add_argument("--offer", type=int)
    parser.add_argument("--training", action="store_true", help="Approved separate two-hour style-adapter trial")
    parser.add_argument("--training-retry", action="store_true", help="Approved single replacement, sharing the original budget")
    args = parser.parse_args()
    if args.training or args.training_retry:
        WORK = ROOT / ("build-style-training-retry" if args.training_retry else "build-style-training")
        STATE = WORK / "trial-state.json"
        LABEL = "djayvo-style-training-20261018" + ("-retry" if args.training_retry else "")
        LEASE_SECONDS = 7200
        HOURLY_CEILING = 0.50
    WORK.mkdir(exist_ok=True)
    if args.action == "status":
        account = api("v0/users/current")
        print(json.dumps({"credit": account.get("credit"), "total_spend": account.get("total_spend"),
                          "autobill_amount": account.get("autobill_amount"),
                          "instances": [{k: i.get(k) for k in ("id", "label", "actual_status", "gpu_name", "dph_total")}
                                        for i in instances()]}, indent=2))
    elif args.action == "offers":
        result = offers()
        (WORK / "offers.json").write_text(json.dumps(result, indent=2) + "\n")
        print(json.dumps(result[:8], indent=2))
    elif args.action == "rent":
        public_key = (WORK / "trial-key.pub").read_text().strip()
        if not public_key.startswith("ssh-ed25519 ") or not shutil.which("caffeinate"):
            raise RuntimeError("Trial SSH key or sleep inhibitor is missing")
        if STATE.exists():
            raise RuntimeError("Trial state already exists; refusing another rental")
        if instances():
            raise RuntimeError("Existing rentals found; account-wide budget tracking would be ambiguous")
        account = api("v0/users/current")
        if float(account.get("credit", 0)) < 7:
            raise RuntimeError("Insufficient credit for reserved trial budget")
        available = offers()
        starting_credit = float(account["credit"])
        if args.training_retry:
            previous = json.loads((ROOT / "build-style-training/trial-state.json").read_text())
            starting_credit = retry_credit(account, previous)
            # Excluding the entire previous location also excludes its physical host.
            available = [o for o in available if o["geolocation"] != previous["offer"]["geolocation"]]
        offer = next((o for o in available if o["id"] == args.offer), None)
        if (args.training or args.training_retry) and args.offer is None:
            offer = next((o for o in available if o["gpu_name"] == "RTX 3090" and
                          o["geolocation"].endswith(", US")), None)
        if offer is None:
            raise RuntimeError("Selected offer is unavailable or outside limits")
        state = {"label": LABEL, "offer": offer, "starting_credit": starting_credit,
                 "credit_before_this_attempt": float(account["credit"]),
                 "started_at": time.time(), "deadline": time.time() + LEASE_SECONDS,
                 "budget_usd": 10, "disk_gb": DISK_GB}
        write_state(state)  # Prevent duplicate rental if the create response is lost.
        with (WORK / "watchdog.log").open("a") as log:
            subprocess.Popen(["caffeinate", "-i", sys.executable, str(Path(__file__).resolve()), "watch"] +
                             (["--training-retry"] if args.training_retry else ["--training"] if args.training else []),
                             stdout=log, stderr=log, stdin=subprocess.DEVNULL, start_new_session=True)
        # The watchdog also reconciles by unique label if this response is lost.
        result = api("v0/asks/" + str(offer["id"]), "PUT", {
            "image": "pytorch/pytorch@sha256:b85566342b86d13a67712e9315d40cdc2dad7f8d86df1aff3831f80835edbcca", "disk": DISK_GB,
            "label": LABEL, "runtype": "ssh_direct" if args.training_retry else "ssh", "target_state": "running", "cancel_unavail": True,
        })
        state["id"] = result["new_contract"]
        write_state(state)
        try:
            attach_key(state["id"], public_key)
        except Exception:
            destroy(state)
            raise
        print(json.dumps(state, indent=2))
    elif args.action == "destroy":
        destroy(json.loads(STATE.read_text()))
        print("Trial deletion requested; verify status next")
    else:
        watch()


if __name__ == "__main__":
    main()
