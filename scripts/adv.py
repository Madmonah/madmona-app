import json, collections, sys, io, re, os
p = r"C:\Users\solutions\AppData\Roaming\Claude\local-agent-mode-sessions\b4c8f83c-bfd2-4d1f-a7fa-bfb88a9ebea8\7327d46d-6790-4c13-8b1a-9aee6e2447a3\local_4f4ba56b-2cfb-4d83-8fe8-624b6fdf9a43\.claude\projects\C--Users-solutions-AppData-Roaming-Claude-local-agent-mode-sessions-b4c8f83c-bfd2-4d1f-a7fa-bfb88a9ebea8-7327d46d-6790-4c13-8b1a-9aee6e2447a3-local-4f4ba56b-2cfb-4d83-8fe8-624b6fdf9a43-outputs\cee53a75-2bd3-4b66-99e1-14d27687b8cf\tool-results\mcp-901e42ff-d2f9-4cdc-bdf9-36fb58f09b9c-get_advisors-1783970122726.txt"
raw = open(p, encoding='utf-8').read()
# find the json blob
m = re.search(r'\{.*\}', raw, re.S)
data = json.loads(m.group(0))
lints = data.get('lints', data if isinstance(data, list) else [])
if isinstance(lints, dict):
    lints = lints.get('lints', [])
c = collections.Counter()
byname = collections.defaultdict(list)
for l in lints:
    key = (l.get('level'), l.get('name'))
    c[key] += 1
    byname[l.get('name')].append(l.get('metadata', {}).get('name') or l.get('title'))
print("TOTAL:", len(lints))
for (lvl, name), n in c.most_common():
    print(f"{lvl:8} {name:45} {n}")
print("\n--- ERROR level details ---")
for l in lints:
    if l.get('level') == 'ERROR':
        md = l.get('metadata') or {}
        print(" -", l.get('name'), "|", md.get('schema'), md.get('name'), "|", (l.get('detail') or '')[:120])
