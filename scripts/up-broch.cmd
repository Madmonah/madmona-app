@echo off
cd /d E:\madmona-app
copy /Y ".wa-dl\RITZ New Zayed Brochure.pdf"      "ritz.pdf"  > nul
copy /Y ".wa-dl\ANNEX Brochure V2.15112024.pdf"   "annex.pdf" > nul
copy /Y ".wa-dl\IBP-Brochure.pdf"                 "ibp.pdf"   > nul
echo --- بيرفع ---
supabase storage cp ritz.pdf  "ss:///content-images/wa-recovered/ritz-new-zayed-brochure.pdf" --linked --experimental --content-type application/pdf
supabase storage cp annex.pdf "ss:///content-images/wa-recovered/annex-26-mall-brochure.pdf"  --linked --experimental --content-type application/pdf
supabase storage cp ibp.pdf   "ss:///content-images/wa-recovered/i-business-park-brochure.pdf" --linked --experimental --content-type application/pdf
echo --- الموجود ---
supabase storage ls "ss:///content-images/wa-recovered/" --linked --experimental
del ritz.pdf annex.pdf ibp.pdf > nul 2>&1
