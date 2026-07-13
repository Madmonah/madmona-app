@echo off
setlocal
echo === صفحات عامة (لازم 200) ===
for %%p in (/ /real-estate/market /marketplace /careers) do (
  curl.exe -s -o NUL -w "%%p -> %%{http_code}\n" https://www.madmonacairo.com%%p
)
echo.
echo === لوحة الادمن بدون كوكي (لازم 307 = تحويل للبوابة) ===
curl.exe -s -o NUL -w "/admin -> %%{http_code}\n" https://www.madmonacairo.com/admin
echo.
echo === بوابة الادمن بدون كوكي (لازم 401) ===
curl.exe -s -o NUL -w "/api/admin/rpc -> %%{http_code}\n" -X POST -H "Content-Type: application/json" -d "{\"fn\":\"admin_listings_facets\"}" https://www.madmonacairo.com/api/admin/rpc
echo.
echo === دالة مش في القايمة البيضا (لازم 401 قبل ما توصل اصلا) ===
curl.exe -s -w "\n" -X POST -H "Content-Type: application/json" -d "{\"fn\":\"drop_everything\"}" https://www.madmonacairo.com/api/admin/rpc
echo ---DONE---
