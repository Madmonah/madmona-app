# MADMONA — PROJECT CONTEXT (Source of Truth)

**Last updated:** June 25, 2026
**Owner:** Mohamed (محمد) — owner of مضمونة (Madmona)
**Purpose:** This file is the persistent context for ALL Claude chats in this project. Upload to "Project knowledge" and/or paste into "Project instructions" so every new chat starts with the full picture.

---

## 0. WHO YOU ARE TALKING TO

- Mohamed (محمد), owner of مضمونة (Madmona)
- Communicates in **Egyptian Arabic** (عامية). Reply in Egyptian Arabic.
- Highly **action-oriented**, batch-mode worker. "ابدأ بالمعقدة" — start with the most complex task first.
- Defers testing to the end: "هنحتبر وهبلغلك في الاخر"
- Likes **parallel work**: he tests/uploads while you handle code simultaneously.
- He runs `.bat` files only — never manual git or shell commands.

---

## 1. BUSINESS BASICS

### Brand
- **Name:** مضمونة (Madmona) — note the **ض** (NOT م د م و ن ة or any variant)
- **Site:** madmonacairo.com
- **Founded:** 2019 · **Launched: 2026** (اتفاق 25 يونيو 2026: نقول "launched 2026" مش "relaunching")
- **Identity:** GUARANTEED **rental + services marketplace** for everything that can be rented or hired (chalets, apartments, cars, cameras, equipment, halls, events + service verticals: religious, home, medical, beauty, education...). NOT a listings-only site. ⛔ **Coworking is CANCELLED PERMANENTLY (May 24 2026)** — not a category, not content, not an identity. The content gate auto-rejects any coworking content; the legacy "workspaces" RENTAL category (supplier listings) is a separate thing and stays.
- **Slogan:** ⛔ تم إزالة *"احنا بتوع الإيجار"* (اتفاق 25 يونيو 2026) — لا تُستخدم في أي محتوى أو هاشتاج بعد الآن.
- **Brand promise:** *"بنستهدف أن آلاف يحققوا دخل ثابت"*
- **Vision:** Biggest rental platform in Egypt and possibly the world.

### Business Model (THE HEART — never forget)
مضمونة = a guaranteed rental + services **marketplace** AND a **FREE full operating system (CRM + ERP)** that every supplier gets to run their whole business — live at `/admin/business-finance/[supplierId]`. NOT a listings-only site, NOT a coworking space.
- **CRM:** customers, bookings, appointments, confirmations, reviews, WhatsApp, at-risk customers, waitlists.
- **ERP:** team, attendance, shifts, payroll, expenses, branches, cash count, purchase orders, suppliers, promos, documents, reports, VAT, audit-log.
- **How we make money:** commission on bookings ONLY — **10% individuals / 5% businesses**. Listing is FREE. CRM+ERP given FREE in exchange for commission (NOT a SaaS subscription). Add-ons 100% to the supplier; insurance separate from commission.
- **Everything-platform roadmap:** (1) rentals + services [live], (2) products for sale (e-commerce), (3) restaurants/food — "rent, hire, buy, and eat — all guaranteed."
- **Differentiator:** most rental platforms just take commission. Madmona = marketplace + transaction guarantee + a full management system (CRM+ERP) for the partner.
- **Every supplier pitch MUST include:** free CRM+ERP · commission 10/5 · free listing · full protection · fast payouts · 24/7 support · AI matching. Forgetting CRM/ERP in a pitch = needs_revision. Any coworking framing = rejected.

### Three Core Marketing Pillars (in this exact order)
1. حماية كاملة
2. دفع مستحقات سريع
3. دعم مستمر

### Marketing / UI Vocabulary (LOCKED May 12 2026)
- Supplier CTA = **"ضيف الليستنج"** EVERYWHERE (app + marketing). ❌ "أجر معانا" is REMOVED — never use it.
- "أجر مننا" kept ONLY as the Marketplace tab label in BottomNav.
- Target audience: (a) suppliers — anyone, individual or business, with something to rent or a service to offer; (b) renters/customers across all categories. (The old freelancer/coworking-centric audience is retired with coworking.)

### Commission Model
- **Individuals:** 10%
- **Businesses:** 5%
- Lowest in the Egyptian rental market

### Brand Colors (LOCKED — match live site madmonacairo.com, May 23 2026)
- Background: **cream `#FAFAF7`** + subtle gradient-mesh (green/teal tints)
- Greens: `#1F6F5F` (primary), `#2d7a52`, `#2FA084`, `#6FCF97`
- Text: `#0A0A0A`
- **Gold accent + gradients ALLOWED** — gold→green `#d4a017` → `#2FA084` → `#1F6F5F` on CTAs (supersedes the old no-gold/no-gradient lock)
- ❌ Old palette (deep green #1F5F3F, burnt orange/rust #C2410C, ivory #FAF7F0) is RETIRED

### Design Style (match live site madmonacairo.com)
- Cream background + subtle green/teal gradient-mesh, glass white cards, soft shadows, rounded corners (20px cards / 999px pills)
- Fonts: **Cairo** (Arabic) + **Inter** (Latin)
- Real photos preferred over AI-generated visuals

### Logo
- Green "OK hand sign" integrated with Arabic letter "م"
- "مضمونة" Arabic wordmark below
- "MADMONA" in small caps
- Canva asset ID: `MAHG9FuFn4w`

### Canva
- Brand Kit ID: `kAHG5eeYZMA`
- ⚠️ **CRITICAL QUIRK:** Brand Kit overrides explicit hex colors to orange/yellow. For dark-green-base designs, do NOT use `brand_kit_id` in `generate-design`. Supply colors directly in prompt.
- Folder structure: Master Hub `FAHHodGFqLg` → Brand Assets & Logo `FAHHobJi39Q`, Ads & Social Media `FAHHoSTddMI`, Space Photos Real `FAHHoVfqFXQ`
- For text editing on Canva native designs: `start-editing-transaction` → `perform-editing-operations` (replace_text) → `commit-editing-transaction`. Thumbnail URLs expire quickly.

### Social Handles (all live, confirmed May 2026)
- Instagram: `@madmona.cairo` (with dot)
- Facebook: `/MadmonaCairo`
- TikTok: `@madmonacairo`
- YouTube: `@Madmonacairo`
- LinkedIn: `/in/madmona-cairo-a48a71406`
- X: `@madmonacairo`
- Threads: `@madmona.cairo` (with dot, linked to IG)

### Office / Contact
- Address: ٧ شارع سليمان عَزْمي، النزهة، مصر الجديدة، القاهرة (Azmy with **ز**, NOT ظ)
- Coordinates: 30.1134075, 31.3655983
- Phone: +201002229982
- Hours: **24/7** (changed May 2026)
- Maps: https://share.google/QbWskGlQ49AUTJrTc

---

## 2. TECH STACK

- **Frontend:** Next.js on Vercel
- **Backend:** Supabase (Postgres + Edge Functions + Storage + Auth)
- **DNS:** Cloudflare
- **Repo:** github.com/Madmonah/madmona-app
- **Local:** E:\madmona-app  ⚠️ (اتنقل من C:\ لـ E:\ — يونيو 2026. `C:\madmona-app` مبقاش موجود. كل المسارات لازم تكون E:\)
- **Supabase project ID:** `mjhflxpxunwycbiquoig`
- **Supabase URL:** `https://mjhflxpxunwycbiquoig.supabase.co`

### Key IDs
- Madmona admin supplier ID (DB): `7310f6ef-e474-4ef8-8b8a-388b5e1f5694` (kyc_status='approved')
- Madmona admin profile ID: `147cd904-3228-401c-8b5f-79f43d6d081f`
- InstaPay: `5220001000009207` (بنك مصر)

### Known Tech Issues / Decisions
- `next.config.mjs` has `ignoreBuildErrors=true` (Supabase JS v2.45+ Insert generic resolving to `never`). Proper fix = migrate to `@supabase/ssr`. Deferred.
- Phone OTP/Twilio dropped (too expensive for Egypt). Using WhatsApp confirmation instead.

---

## 3. DEPLOY PIPELINE — Single Source of Truth (May 13 2026 root fix)

⚠️ **NEVER use `git push` for deploys.** That path is dead. Don't debug git push timeouts.

### Process
1. ⚠️ **المشروع على `E:\madmona-app`** (مش C:). كل ملفات الـ.bat لسه بتقول `cd /d C:\madmona-app` — **بايظة ومحتاجة تتصلّح لـ E:**.
2. **مفيش ملف اسمه `DEPLOY.bat`.** أنضف ملف ديبلوي = `DEPLOY-CLEAN.bat` (بيشغّل `vercel --prod --yes`) بس مساره غلط (C:).
3. **الديبلوي الصح:** من جوّه `E:\madmona-app` شغّل `vercel --prod --yes` مباشرة.

### Git = code backup only, NOT a deploy pipeline.

### Vercel Project
- Project: `project-ew64j`
- Project ID: `prj_Anl9KWbT8pSqbbXs0ZMlTO67Xg8s`
- Org/Team: `team_j4CSSICBqtcXrCfl4ZP6p06T`
- Alias: www.madmonacairo.com

### `.vercelignore` rules
- Anchor patterns with `/` for root-only (e.g. `/route.ts` NOT `route.ts`).
- The unanchored `route.ts` once excluded ALL Next.js API routes → 404'd everything. Verify before deploys.

---

## 4. ENGINEERING RULES (Mohamed explicit demands)

### RULE 1 — Root cause only, NEVER band-aids (مسكنات)
Before ANY code change:
1. READ actual code on disk at C:\madmona-app
2. TRACE UI → API → DB with real SQL queries
3. Document plan in `system_runbook` table BEFORE editing
4. State impact on other flows
5. Define verification plan
- Always check `system_runbook` + past chats BEFORE diagnosing.

### RULE 2 — Universal enforcement at data layer
Policy rules for user-facing messages MUST be enforced at the **DB trigger** level, not just AI prompts. Prompt-only enforcement gets bypassed by parallel pipelines.
- WhatsApp policy: `trg_enforce_whatsapp_policy` on `whatsapp_outbound_queue` BEFORE INSERT/UPDATE
- Function: `enforce_whatsapp_outbound_policy()`
- Violations logged to `whatsapp_policy_violations`
- Admin phone `+201002229982` is exempt

### RULE 3 — Default to FULL automation
"لا انا عايزة اوتوماتيد" — don't propose manual fallbacks unless full automation is technically blocked and you've explained why.
- When an agent is "not working", FIRST check `enabled=TRUE` in `agent_registry`. Don't debug code until you've verified the flag.

### RULE 4 — Style rules
1. Try first if reversible/cheap. VERIFY before proposing cycles/irreversibles.
2. Don't drift to new tasks when current ones unfinished.
3. Use REAL Supabase data, never guess.
4. Act decisively when authorized — don't ask for confirmation repeatedly.
5. Try-first = SAFE actions. Verify = cycles / ads / deploys.

### RULE 5 — Persistent Learning Protocol
EVERY instruction / correction / preference / rule Mohamed gives MUST be saved to:
1. `userMemories` (Claude's memory system)
2. `system_runbook` table (DB persistent docs)
3. **This file** (`MADMONA_PROJECT_CONTEXT.md`)

Before responding to any new directive, check: saved? If not, save first.
Goal: zero repeated instructions across sessions. Same applies to solved problems — they must never recur.

### RULE 6 — Verify DB triggers are ATTACHED, not just defined
When memory or runbook references a DB trigger, VERIFY it's attached:
```sql
SELECT tgname FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = '<table>' AND NOT t.tgisinternal;
```
Functions without triggers are dead code. (Lesson: `enforce_whatsapp_outbound_policy` was defined but trigger NOT attached → signup-bot violated policy.)

---

## 5. WHATSAPP — Pipeline & Policy

### Infrastructure
- WABA: `808213428675221`
- Phone ID: `1084433138092430`
- Quality: GREEN
- Webhook: `https://mjhflxpxunwycbiquoig.supabase.co/functions/v1/whatsapp-webhook`
- Verify token: `madmona_webhook_verify_token_2026`

### Auto-Responder
- Model: Claude Sonnet 4.6
- Replies in Egyptian colloquial within ~3 seconds
- Classifies inbound as `supplier_lead` / `customer_lead`
- `supplier_lead` → pending_review queue at `/admin/wa-review`
- `customer_lead` → auto-sends

### Brand Name Enforcement
- Regex on every outbound enforces `مضمونة` (with ض)
- Auto-corrects: مدمونة, مدمونه, مظمونة, مذمونة, متمونة → مضمونة
- Madmoonah, Madmonna, Madmounah → Madmona

### URL Enforcement (auto-rewritten)
- `/list-your-asset` → `/add-listing`
- `/supplier/register` → `/add-listing` (in WA only; supplier dashboard intentionally uses /supplier/register)
- `/auth/signup` → `/add-listing`
- `/categories/<slug>` → `/marketplace?category=<slug>`
- `/marketplace/<top-level-slug>` → `/marketplace?category=<slug>`

### POLICY — NEVER ASK FOR PII via WhatsApp
NEVER say:
- "بعتلي اسمك" / "ارسل لي اسمك"
- "بعتلي إيميلك" / "أعمللك حساب"
- "I'll create your account"

The `/add-listing` wizard collects info anonymously. WhatsApp role = answer questions + direct to form.

### Enforcement Layers
1. **AI prompt:** Auto-responder system prompt
2. **DB trigger:** `trg_enforce_whatsapp_policy` blocks at INSERT — sets `status='blocked_by_policy'` and logs to `whatsapp_policy_violations`
3. **Edge function rewritten:** `whatsapp-signup-bot v3` removed all PII-asking branches; signup intent → redirect to `/add-listing` only

### Send-via-DB Pattern
```sql
INSERT INTO whatsapp_outbound_queue (recipient_phone, recipient_name, message, agent_name, campaign, status, scheduled_at)
VALUES (...);
SELECT public.fire_whatsapp_outbound_send();
SELECT pg_sleep(8);
SELECT public.process_whatsapp_outbound_queue();
```

### Edge Function Auth
- `whatsapp-send-real` has `verify_jwt: false`, accepts `{to, text, agent_name}`
- `whatsapp-bulk-template` requires anon JWT in `Authorization` + agent secret in `x-agent-secret`
- `Authorization` header reserved for Supabase JWTs; agent secrets in separate `x-agent-secret` header

---

## 6. SUPPLIER ACQUISITION (Listing-First Flow)

### Wizard
- URL: `madmonacairo.com/add-listing`
- 5 steps: (1) category → (2) basics → (3) price → (4) photos → (5) contact
- Token-based (no auth required initially)
- Auto-claim via `MadmonaListingClaimer` in root layout

### Categories (now FULLY DB-DRIVEN — May 16+ 2026)
The wizard is DB-driven: `categories.track` IN ('rentals','services','hybrid'). ~27 mains → 6 groups; `/marketplace` shows 3 track tabs (TrackTab). Attributes wired via `AttributeFieldRenderer`. The old hardcoded `MAIN_CATEGORIES` array is retired.
- "workspaces" stays a normal RENTAL category (supplier listings) — separate from the cancelled coworking identity; don't confuse the two.
⚠️ Category changes go through the DB (`categories` table + `attributes`); no hardcoded-array dual-write needed.

### Supplier Pitch — REQUIRED elements (every outbound)
1. Commission: 10% individuals / 5% businesses
2. Founded 2019
3. International-grade tech / latest AI
4. Full protection (حماية كاملة)
5. Fast payouts (دفع مستحقات سريع)
6. 24/7 support (دعم 24/7)
7. AI matching

Outreach links MUST NOT trigger WhatsApp warning banner — test in incognito before mass send. Goal: suppliers acting NOW, not waiting.

### Scrapers
- **Hatla2ee:** `eg.hatla2ee.com/ar/car/page/N` — ~35-38 unique Egyptian mobiles per page, 30+ pages
- **OLX v2:** 28 URLs across 11 governorates + 5 coastal areas
- **OLX Egypt = Dubizzle Egypt** (same inventory — don't scrape both)
- Bayut, Aqarmap, Property Finder, Facebook Marketplace need JS rendering (don't expose phones in static HTML)
- Phone normalization: `01XXXXXXXXX` → `+201XXXXXXXXX` before INSERT into `cold_leads.phone`

### Cron
- `supplier-acquisition-cron` daily 6 AM UTC (8 AM Cairo): OLX scrape + template send + 24-72h follow-up
- ⚠️ Currently broken: OLX scraper produces 0 new leads in 14+ days

---

## 7. PHOTO ORPHAN — 4-Layer Defense (May 13 2026)

### Problem
Wizard's StepPhotos kept uploads in local React state. Photos lost on page close/refresh. 60+ orphan files accumulated (36 MB).

### Defense Stack
1. **Wizard auto-save** — `StepPhotos` `onUpload` prop. Every upload/remove persists immediately. (in code, may need deploy)
2. **Background reaper** — Edge function `storage-orphan-reaper`. Cron `*/5 * * * *` runs `attach_matched`. Cron `0 2 * * *` runs `full_sweep` with `min_age_minutes=60`.
3. **API hardening** — `/api/listing-drafts/upload` rejects requests without valid token. (in code, may need deploy)
4. **Health alerter** — `check_storage_orphan_health()` runs every 15 min (`7,22,37,52 * * * *`). WhatsApps admin if any photo > 10 min old isn't attached. Rate-limited 1/hour.

### Verification (any time)
```sql
SELECT public.check_storage_orphan_health();
-- Expected: {orphans_unattached: 0, stale_anon: 0, alert_sent: false}
```

### Pattern (apply to ANY user-upload component)
auto-save + reaper + API gate + alerter

---

## 8. LISTING SLUG GENERATION (May 13 fix)

`claim_listing_draft` was creating listings without slugs → `/marketplace/null` → 404.

**Fix:** BEFORE INSERT trigger `trg_auto_listing_slug` on `listings`. Auto-generates pattern: `listing-<8 chars of id>-<4 random chars>` if slug is NULL/empty. Backfilled all existing NULL slugs.

---

## 9. AI OS (Phase Ω — LIVE)

~49 agents across 8 teams (76+ active crons):
- Sales (10)
- Marketing (10)
- Creative (4)
- Operations (3)
- Strategic (2)
- Support (3)
- Intelligence (7)
- Growth (3)

25 DB tables. Phase 5 includes:
- META self-improving agent (prompt-optimizer)
- Performance tracker
- Revenue attribution
- Competitor pricing spy
- Customer success
- Email responder
- Listing photographer

Admin hub: `/admin/ai-os`

**QC / approval gate (May 24 2026):** every marketing post passes `trg_content_publish_gate` (auto-rejects coworking; otherwise → `pending_review`). `marketing-qc` edge fn (cron 124, */10) auto-approves low/medium-risk and holds high-risk. Marketing WhatsApp/email held for owner approval via `trg_marketing_wa_gate`. Live customer replies + transactional + alerts are unaffected. Coworking crons 34/35 DELETED. Owner approves via `qc_approve()/qc_reject()` + view `v_pending_approvals`; digest cron 125 every 6h.

---

## 10. SOCIAL CONTENT WORKFLOW

### Daily Marketing Tasks
- DM/WhatsApp replies across platforms
- Facebook group posts (value-first, mention Madmona organically)
- Reply templates in Egyptian Arabic for: pricing, location/amenities, general greetings, Google Review requests

### Instagram
- Story workflow: Canva design retrieval → Google Calendar event with design links + sticker instructions
- Meta Business Suite blocks automation → stories with interactive stickers MUST be posted manually via IG mobile app
- Facebook-only stories without stickers can use web composer if video file is pre-downloaded

### Canva Approved Designs
- 3 approved Instagram post designs (cream-background layout)
- Approved welcome post: design ID `DAHHw74yy2A`

### Pending IG Token
- 32 drafted `instagram_reels` blocked
- Mohamed must regenerate at Graph API Explorer with `instagram_basic` + `instagram_content_publish` scopes
- Paste at `/admin/refresh-fb-token`

---

## 11. KEY DB TABLES (cheat sheet)

| Table | Purpose |
|---|---|
| `listing_drafts` | Wizard drafts (token-based) |
| `listing_drafts_audit` | Per-update change log |
| `listing_drafts_failures` | API PATCH failures |
| `listings` | Real published listings |
| `listing_photos` | Photos per listing |
| `pricing_rules` | Per-listing pricing (period_type, price, currency) |
| `marketplace_suppliers` | Supplier accounts (commission_rate, kyc_status) |
| `profiles` | User accounts (role: supplier/customer/admin) |
| `cold_leads` | Scraped leads pre-contact |
| `whatsapp_outbound_queue` | Outbound queue (status, agent_name, campaign) |
| `whatsapp_messages` | Inbound + outbound history |
| `whatsapp_conversations` | Conversations by phone |
| `whatsapp_policy_violations` | Blocked outbound log |
| `agent_registry` | All 42 agents with `enabled` flag |
| `content_drafts` | Reel/post drafts |
| `system_runbook` | Persistent docs / known issues / resolutions |
| `v_storage_objects` | Public view of `storage.objects` (for PostgREST access) |

---

## 12. ACTIONS — PROHIBITED vs ALLOWED

### Things Claude must NEVER do
- Reproduce copyrighted song lyrics, poems, or articles verbatim
- Quote 15+ words from any single source
- Ask for PII (name/email/etc) via WhatsApp
- Promise "I'll create your account" via WhatsApp
- Use Canva `brand_kit_id` when generating dark-green Madmona designs
- Run band-aid fixes (مسكنات) when a root cause exists
- Auto-deploy without verification on irreversible/cost-incurring changes

### Things Claude SHOULD do by default
- Reply in Egyptian Arabic
- Save every new instruction to memory + runbook + this file
- Read code on disk before diagnosing
- Use real Supabase data (never guess)
- Default to full automation
- Verify DB triggers are ATTACHED, not just defined
- Use vercel CLI via DEPLOY.bat (not git push) for deploys

---

## 13. RECENT SOLVED PROBLEMS (do NOT let recur)

| Problem | Root Cause | Fix |
|---|---|---|
| Git push deploys silently failing | 150 MB payload, HTTP 408 timeout | Switched to `vercel deploy --prod` via DEPLOY.bat |
| Wizard data loss | Old `await persist; next();` advanced even on API failure | Now `const t = await persist; if (t) next();` |
| Listings appearing on /marketplace then 404 on click | `claim_listing_draft` not setting slug | BEFORE INSERT trigger `trg_auto_listing_slug` |
| signup-bot violation "بعتلي اسمك" | Hardcoded strings + trigger NOT attached | Rewrote bot v3 + attached `trg_enforce_whatsapp_policy` |
| Listings with photos disappearing from supplier view | `claim_listing_draft` requires ≥1 photo for `published` status | Manual publish + wizard photos-required (deploy pending) |
| محمد طاهر "photos broken" complaint | Photos in local React state never persisted | 4-layer defense (auto-save + reaper + API gate + alerter) |
| Click-to-WA ads stopped, no tracking | Open issue | TBD |
| OLX scraper 0 leads / 14 days | Edge function silently broken | TBD |

---

## 14. CURRENT FUNNEL STATE (May 13 2026)

- **313** cold leads scraped (250 contacted, 0 net new today)
- **19** real suppliers registered
- **6** real suppliers have ≥1 published listing (32% conversion)
- **13** suppliers approved but ZERO listings (68% leak — likely stuck in claimed-draft-with-no-photos state)
- **29** total published listings (17 real supplier + 12 admin-seeded)

---

## 15. UPDATE PROTOCOL FOR THIS FILE

Whenever Mohamed gives a new instruction, rule, preference, or you solve a recurring problem:
1. Append to relevant section in this file
2. Update `Last updated` date at top
3. Save to `userMemories` (concise, ≤500 chars per entry)
4. Save to `system_runbook` (full detail with verification SQL)

This file is the **single source of truth**. If anything contradicts it, fix the contradiction.
