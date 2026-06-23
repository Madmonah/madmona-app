# -*- coding: utf-8 -*-
"""
Madmona CapCut Reel Worker - STEP 1
Pulls reels tagged metadata.engine='capcut' from Supabase, builds a CapCut
draft from the scenes, and drops it into the CapCut drafts folder so it
appears inside CapCut Desktop ready to open.

Place this file in  C:\\madmona-capcutapi  and run via run-capcut-worker.bat
Fill your values in the .env file (same folder).
"""
import os, sys, json, time, traceback

# --- load .env ---
def load_env():
    env = {}
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(p):
        for line in open(p, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env

ENV = load_env()
SUPABASE_URL = ENV.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY  = ENV.get("SUPABASE_SERVICE_KEY", "")
DRAFT_DIR    = ENV.get("CAPCUT_DRAFT_DIR", "").strip()

import requests
from create_draft import create_draft
from add_text_impl import add_text_impl
from save_draft_impl import save_draft_impl

def find_capcut_draft_dir():
    if DRAFT_DIR:
        return DRAFT_DIR
    la = os.environ.get("LOCALAPPDATA", "")
    candidates = [
        os.path.join(la, "CapCut", "User Data", "Projects", "com.lveditor.draft"),
        os.path.join(la, "JianyingPro", "User Data", "Projects", "com.lveditor.draft"),
    ]
    for c in candidates:
        if os.path.isdir(c):
            return c
    return None

def fetch_jobs():
    url = f"{SUPABASE_URL}/rest/v1/reel_scripts"
    params = {
        "select": "id,title,scenes,total_duration_sec,metadata",
        "status": "eq.script_ready",
        "metadata->>engine": "eq.capcut",
    }
    h = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}
    r = requests.get(url, params=params, headers=h, timeout=30)
    r.raise_for_status()
    return r.json()

def mark_built(job_id, draft_id):
    url = f"{SUPABASE_URL}/rest/v1/reel_scripts?id=eq.{job_id}"
    h = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}",
         "Content-Type": "application/json", "Prefer": "return=minimal"}
    body = {"metadata": {"engine": "capcut", "capcut_built": True, "capcut_draft_id": draft_id}}
    requests.patch(url, headers=h, data=json.dumps(body), timeout=30)

def build_draft(job, draft_dir):
    scenes = job.get("scenes") or []
    if isinstance(scenes, str):
        scenes = json.loads(scenes)
    total = job.get("total_duration_sec") or max(15, len(scenes) * 5)
    per = max(2.0, round(total / max(1, len(scenes)), 2))

    script, draft_id = create_draft(1080, 1920)
    t = 0.0
    for i, sc in enumerate(scenes):
        txt = (sc.get("text") or "").strip()
        if not txt:
            t += per; continue
        is_last = (i == len(scenes) - 1)
        add_text_impl(
            text=txt, start=t, end=t + per, draft_id=draft_id,
            font_color="#FFD700" if (i == 0 or is_last) else "#FFFFFF",
            font_size=11.0 if (i == 0 or is_last) else 9.0,
            transform_y=0.0, track_name="text_main",
        )
        t += per

    # save into CapCut drafts folder so it appears in the app
    res = save_draft_impl(draft_id, draft_dir)
    return draft_id, res

def main():
    if not (SUPABASE_URL and SERVICE_KEY):
        print("ERROR: fill SUPABASE_URL and SUPABASE_SERVICE_KEY in .env"); return
    draft_dir = find_capcut_draft_dir()
    if not draft_dir:
        print("ERROR: could not find CapCut drafts folder. Set CAPCUT_DRAFT_DIR in .env"); return
    print("CapCut drafts folder:", draft_dir)
    print("Polling Supabase for CapCut reels...  (Ctrl+C to stop)")
    while True:
        try:
            jobs = fetch_jobs()
            todo = [j for j in jobs if not (j.get("metadata") or {}).get("capcut_built")]
            if todo:
                print(f"\n{len(todo)} reel(s) to build.")
                for j in todo:
                    try:
                        did, res = build_draft(j, draft_dir)
                        mark_built(j["id"], did)
                        print(f"  [OK] '{j.get('title')}'  ->  draft {did}")
                    except Exception as e:
                        print(f"  [FAIL] {j.get('title')}: {e}")
                        traceback.print_exc()
                print("Done. Open CapCut Desktop to see the drafts.")
            else:
                print(".", end="", flush=True)
        except Exception as e:
            print("poll error:", e)
        time.sleep(20)

if __name__ == "__main__":
    main()
