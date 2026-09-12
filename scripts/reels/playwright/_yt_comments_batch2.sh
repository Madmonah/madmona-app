#!/bin/bash
cd /e/madmona-app/scripts/reels/playwright
while read -r vid slug; do
  echo "== $slug $vid"; timeout 150 node _yt_comment.cjs "$vid" "$slug" 2>&1 | grep -E 'posted|pinned|ERR' | tail -2; sleep 5
done <<'LIST'
shT2e00ei_o law-madmona-clinic
yXFzi1yzIoI law-madmona-showroom
BILNEhZ_B8Q setup-wizard
RpoIBMP1DLE contracting-pnl
H0zZn9--jio showroom-catalog
dvKiO0NCpEk staff-attendance
uekrnSLXIfY clinic-80-calls
2Ru1LJq6z7g salon-at-risk
dotYm_EmhFw title-celebs-v2
fzkBaAmgsDg wa-bot-night
ACUn4344Kyc trend-80s-privacy
J9uSnZaz-o8 brand-12-apps
vats-AD6m6U realestate-agent-left
Tgxn7_n9CQs contracting-custody
VOXEURmPUUY clinic-1000-protocol
LIST
