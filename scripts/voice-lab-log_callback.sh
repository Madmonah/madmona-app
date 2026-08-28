#!/bin/bash
# ============================================================================
# 📋 (٢٨ أغسطس ٢٠٢٦) تسجيل طلب معاودة الاتصال
# الخط الواحد مايقدرش يحوّل مكالمة لموظف وهو مشغول — فبنسجّل الرقم
# والفريق بيكلمه. أحسن من إن المكالمة تضيع.
#
# 💰 مفيش استهلاك API — مجرد كتابة في ملف + نداء webhook للمنصة.
# ============================================================================
CALLER="$1"
TOPIC="${2:-general}"
STAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG=/var/log/madmona-callbacks.log

echo "$STAMP | $CALLER | $TOPIC" >> "$LOG"

# إشعار المنصة (best-effort — لو فشل الطلب متسجّل في اللوج برضه)
SITE="${MADMONA_SITE:-https://www.madmonacairo.com}"
curl -s -m 10 -X POST "$SITE/api/leads/capture" \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$CALLER\",\"source\":\"voice-call\",\"topic\":\"$TOPIC\"}" \
  >/dev/null 2>&1 || true

exit 0
