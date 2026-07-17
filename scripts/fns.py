import json, io, glob, os
d = r"C:\Users\solutions\AppData\Roaming\Claude\local-agent-mode-sessions\b4c8f83c-bfd2-4d1f-a7fa-bfb88a9ebea8\7327d46d-6790-4c13-8b1a-9aee6e2447a3\local_4f4ba56b-2cfb-4d83-8fe8-624b6fdf9a43\.claude\projects"
hits = glob.glob(os.path.join(d, "**", "*list_edge_functions*.txt"), recursive=True)
p = max(hits, key=os.path.getmtime)
data = json.load(io.open(p, encoding="utf-8"))
fns = data if isinstance(data, list) else data.get("functions", [])
print("عدد الدوال:", len(fns))
for f in fns:
    s = f.get("slug", "")
    if any(k in s.lower() for k in ("wa", "whats", "webhook", "inbound", "media", "claim", "draft")):
        print(" ", s, "|", f.get("status"), "| v", f.get("version"))
