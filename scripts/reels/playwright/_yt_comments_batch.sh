#!/bin/bash
# كومنت أول بلينك على كل شورت لسه من غير كومنت (١٢/٩) — واحد ورا التاني على CDP 9223
cd /e/madmona-app/scripts/reels/playwright
while read -r vid slug; do
  echo "== $slug $vid"; node _yt_comment.cjs "$vid" "$slug" 2>&1 | tail -2; sleep 4
done <<'LIST'
kSg4I9OggmM biz-blockbuster-netflix
UvUqA1rPGMM biz-kodak-digital
WERTFl9Hct4 noir-contractor-day
shT2e00ei_o law-madmona-clinic
yXFzi1yzIoI law-madmona-showroom
BILNEhZ_B8Q setup-wizard
RpoIBMP1DLE contracting-pnl
H0zZn9--jio showroom-catalog
dvKiO0NCpEk staff-attendance
uekrnSLXIfY clinic-80-calls
2Ru1LJq6z7g salon-at-risk
dotYm_EmhFw title-celebs-v2
LIST
