@echo off
cd /d E:\madmona-app
echo === فحص الصياغة (بدون حل الأنواع الخارجية) ===
npx --yes deno@2 eval --no-lock "const s=await Deno.readTextFile('supabase/functions/whatsapp-webhook/index.ts'); const r=await import('https://deno.land/x/ts_morph@21.0.1/mod.ts').catch(()=>null); console.log('حجم:',s.length); const bad=[...s.matchAll(/inboundMediaId/g)].length; console.log('inboundMediaId مرات:',bad);"
echo EXIT=%ERRORLEVEL%
