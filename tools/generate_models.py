#!/usr/bin/env python3
"""Generate game-ready GLB assets from reference crops via Tripo3D v3 API."""
import json
import os
import sys
import time
import urllib.request

BASE = "https://openapi.tripo3d.ai/v3"
KEY = os.environ.get("TRIPO_KEY", "")
PROXY = "http://127.0.0.1:7890"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REFS = os.path.join(ROOT, "assets", "refs")
OUT = os.path.join(ROOT, "assets", "models")

ASSETS = {
    "cat":    ("cat.png",    30000, "standard"),
    "island": ("island.png", 20000, "standard"),
    "house":  ("house.png",  50000, "standard"),
    "bridge": ("bridge.png", 40000, "standard"),
}


def opener():
    return urllib.request.build_opener(
        urllib.request.ProxyHandler({"http": PROXY, "https": PROXY})
    )


def api_get(path):
    r = urllib.request.Request(BASE + path)
    r.add_header("Authorization", "Bearer " + KEY)
    with opener().open(r, timeout=120) as resp:
        return json.loads(resp.read())


def api_post_json(path, payload):
    r = urllib.request.Request(BASE + path, data=json.dumps(payload).encode(), method="POST")
    r.add_header("Authorization", "Bearer " + KEY)
    r.add_header("Content-Type", "application/json")
    with opener().open(r, timeout=120) as resp:
        return json.loads(resp.read())


def upload(path):
    import mimetypes
    boundary = "----tripoboundary42"
    name = os.path.basename(path)
    ctype = mimetypes.guess_type(path)[0] or "image/png"
    with open(path, "rb") as f:
        payload = f.read()
    body = (
        "--" + boundary + "\r\n"
        + "Content-Disposition: form-data; name=\"file\"; filename=\"" + name + "\"\r\n"
        + "Content-Type: " + ctype + "\r\n\r\n"
    ).encode() + payload + ("\r\n--" + boundary + "--\r\n").encode()
    r = urllib.request.Request(BASE + "/files", data=body, method="POST")
    r.add_header("Authorization", "Bearer " + KEY)
    r.add_header("Content-Type", "multipart/form-data; boundary=" + boundary)
    with opener().open(r, timeout=180) as resp:
        return json.loads(resp.read())


def create_task(file_token, face_limit, tex_q):
    payload = {
        "input": file_token,
        "model": "v3.1-20260211",
        "texture": True,
        "pbr": False,
        "face_limit": face_limit,
        "texture_quality": tex_q,
        "geometry_quality": "standard",
        "orientation": "align_image",
    }
    return api_post_json("/generation/image-to-model", payload)


def wait_task(task_id, timeout=1800):
    t0 = time.time()
    last = -1
    while True:
        res = api_get("/tasks/" + task_id)
        d = res.get("data", {})
        status = d.get("status")
        progress = d.get("progress", 0)
        if progress != last:
            print("  [%s] %s %s%%" % (task_id[:12], status, progress), flush=True)
            last = progress
        if status == "success":
            return d
        if status in ("failed", "cancelled", "banned"):
            raise RuntimeError("task %s: %s" % (status, json.dumps(d)[:500]))
        if time.time() - t0 > timeout:
            raise TimeoutError(task_id)
        time.sleep(5)


def main():
    if not KEY:
        sys.exit("TRIPO_KEY env var required")
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[1:] if len(sys.argv) > 1 else None
    state_path = os.path.join(OUT, "_state.json")
    state = {}
    if os.path.exists(state_path):
        state = json.load(open(state_path))

    for name, (ref, faces, texq) in ASSETS.items():
        if only and name not in only:
            continue
        glb_path = os.path.join(OUT, name + ".glb")
        if os.path.exists(glb_path) and os.path.getsize(glb_path) > 10000:
            print("[%s] already done, skip" % name)
            continue
        print("[%s] uploading %s ..." % (name, ref), flush=True)
        up = upload(os.path.join(REFS, ref))
        token = up["data"]["file_token"]
        print("[%s] file_token=%s -> create task" % (name, token), flush=True)
        task = create_task(token, faces, texq)
        task_id = task["data"]["task_id"]
        state[name] = task_id
        json.dump(state, open(state_path, "w"))
        print("[%s] task_id=%s" % (name, task_id), flush=True)
        result = wait_task(task_id)
        url = None
        out = result.get("output", {})
        for k in ("model", "model_url", "base_model", "pbr_model"):
            if isinstance(out.get(k), str) and out[k].startswith("http"):
                url = out[k]
                break
        if not url:
            raise RuntimeError("no model url in output: " + json.dumps(out)[:500])
        print("[%s] downloading %s..." % (name, url[:90]), flush=True)
        r = urllib.request.Request(url)
        with opener().open(r, timeout=300) as resp:
            blob = resp.read()
        with open(glb_path, "wb") as f:
            f.write(blob)
        print("[%s] saved %s (%d bytes)" % (name, glb_path, len(blob)), flush=True)

    bal = api_get("/account/balance")
    print("balance:", json.dumps(bal.get("data")))


if __name__ == "__main__":
    main()
