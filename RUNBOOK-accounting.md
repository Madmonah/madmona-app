# 📒 رَنبوك المحاسبة — مضمونة

آخر تحديث: **13 يوليو 2026**

---

## القاعدة الذهبية

> **أي حركة فلوس في أي شركة لازم تنزل قيد محاسبي أوتوماتيك. من غير أي تدخّل يدوي.**

لو حركة اتسجّلت ومنزلش ليها قيد — دي **باج**، مش سلوك عادي.

---

## الدورة الكاملة

```
مصدر الحركة  ─────►  financial_transactions  ─────►  erp_journal_entries
(مصروف/بيعة/…)      (تريجر auto_create_txn_*)      (تريجر trg_erp_auto_post_tx)
                                                     + erp_journal_lines (مدين/دائن)
```

كل حاجة بتعدّي من **`financial_transactions`**. ده القلب.
أي جدول عايز ينزل الدفاتر، لازم يكتب فيه.

---

## المصادر المربوطة

كلها متأكَّد منها بالتجربة (13 يوليو 2026): حركة مالية ✅ + قيد ✅

| المصدر | الجدول | التريجر | الاتجاه |
|---|---|---|---|
| مصروف | `branch_expenses` | `trg_auto_txn_branch_expense` | صادر |
| بيعة ماركت | `marketplace_orders` | `trg_post_marketplace_order` | وارد + قيد عمولة |
| مرتب | `salary_payments` | `trg_auto_txn_salary` | صادر |
| سلفة موظف | `employee_advances` | `trg_auto_txn_advance` | صادر |
| دفع فاتورة | `bill_payments` | `trg_auto_txn_bill_pay` | صادر |
| سحب كاش | `cash_withdrawals` | `trg_auto_txn_withdrawal` | صادر |
| إكرامية | `tips` | `trg_auto_txn_tip` | وارد |
| حجز | `branch_bookings` | `trg_auto_txn_booking` | وارد |
| شراء مخزن | `inventory_stock_movements` | `trg_auto_txn_stock_movement` | صادر |
| بيع مخزن | `inventory_stock_movements` | `trg_auto_txn_stock_movement` | وارد |

**الإلغاء / الاسترجاع:** `trg_void_refunded_order` بيعلّم الحركة `is_void`
→ `trg_erp_auto_reverse_tx` بيعمل قيد عكسي، **وبيعكس قيد العمولة كمان**.

---

## تجهيز الشركات

- **شركة جديدة** → تريجر `trg_erp_provision_supplier` على `suppliers` بيعملها
  **29 حساب** + إعدادات ERP + يفعّل الترحيل التلقائي. **من غير أي تدخّل.**
- **يدوي لو احتجت:** `select erp_provision_supplier('<supplier_id>');` — آمنة للتكرار.
- **الشركات الموقوفة** (`subscription_status = 'suspended'`) **مبتنزلش قيود** بقصد.
  `guard_suspended_supplier` بيمنع أي حركة مالية عليها.

---

## شجرة الحسابات — المفاتيح المهمة

| الكود | الحساب | `system_key` |
|---|---|---|
| 1100 | الخزينة / النقدية | `cash` |
| 1110 | البنك | `bank` |
| 1120 | محفظة / إنستاباي | `ewallet` |
| 2400 | مستحقات مضمونة (عمولات) | `commission_payable` |
| 4100 | مبيعات | `sales` |
| 5200 | رواتب وأجور | `salaries` |
| 5300 | إيجار | `rent` |
| 5400 | كهرباء ومياه | `utilities` |
| 5500 | تسويق وإعلانات | `marketing` |
| 5600 | عمولات مضمونة | `commission_expense` |
| 5800 | مصروفات نثرية | `misc_expense` |

**توجيه المصروف:** `erp_auto_post_transaction` بتربط `category_snapshot` بالحساب الصح.
أي تصنيف مش في القايمة → **5800 نثرية** (ملاذ أخير).

**حساب الكاش:** بيتحدد من `payment_method`:
`bank` / `transfer` / `cheque` → 1110 · `instapay` / `wallet` → 1120 · **الباقي** → 1100

---

## فحص صحة سريع

```sql
-- 1) الدفاتر متزنة؟ لازم = 0
select sum(debit) - sum(credit) from erp_journal_lines;

-- 2) حركات مالية من غير قيد؟ لازم = 0
select count(*) from financial_transactions ft
where coalesce(ft.is_void, false) = false
  and not exists (select 1 from erp_journal_entries je
                  where je.source_type = 'financial_transaction' and je.source_id = ft.id)
  and not is_supplier_suspended(ft.supplier_id);

-- 3) شركات من غير شجرة حسابات؟ لازم = 0
select count(*) from suppliers s
where not exists (select 1 from erp_accounts a where a.supplier_id = s.id);

-- 4) دوال متكرّرة (بتكسر PostgREST)؟ لازم فاضي
select proname, count(*) from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' group by 1 having count(*) > 1;
```

---

## لما حاجة تقع

### «حركة اتسجّلت ومفيش قيد»
1. الشركة موقوفة؟ → `select is_supplier_suspended('<id>');`
   لو `true` → ده سلوك **صح**، مش باج.
2. الترحيل مقفول؟ → `select * from erp_settings where supplier_id='<id>';`
3. شجرة الحسابات ناقصة؟ → `select erp_provision_supplier('<id>');`

### «الحفظ بيفشل في صمت»
الفورم مش بيفحص الخطأ.
**دايماً:** `const { error } = await supabase.rpc(...)` — واعرضه للمستخدم.
مبنقفلش الفورم غير لما الحفظ ينجح **فعلاً**.

### «function is not unique»
فيه نسختين من نفس الدالة بنفس أسماء البارامترات.
امسح القديمة: `drop function public.<name>(<old signature>);`

---

## الأخطاء اللي اتصلّحت (13 يوليو 2026) — متكرّرش

| الباج | السبب الحقيقي |
|---|---|
| مش عارف يضيف مصروف | نسختين من `admin_record_expense` → `is not unique`، والفورم مكانش بيفحص الخطأ فبيفشل في صمت |
| كل الحفظ في `/admin/company` بيفشل | لوحة الأدمن بكوكي مش Supabase Auth → `auth.uid()` = NULL → `is_admin()` = false. الحل: `/api/admin/company` بـ service_role |
| فورم المنتج: تكتب حرف واحد بس | كومبوننت الـinput معرّف **جوّه** الـmodal → React بيعيد بناءه كل حرف → الفوكس بيضيع. **عرّفه دايماً برّه** |
| أي حركة مخزن بتضرب | `update_inventory_stock_on_movement` كانت مركّبة على `inventory_movements` (فيها `item_id`) وهي مكتوبة لـ `product_id`. الصح: `inventory_stock_movements` |
| الرصيد بيتضاعف | تريجرين بنفس الوظيفة على نفس الجدول |
| أي حركة مالية بلا فرع بتضرب | `refresh_daily_close` بتكتب في `daily_closes.branch_id` (NOT NULL) من غير فحص |
| الاسترجاع بيعكس البيعة بس | قيد العمولة كان بيفضل مرحّل → المورّد يفضل مدين لمضمونة على أوردر اترجّع |

---

## 🚨 قاعدتين لازم تتحطّوا في أي كود جديد

### 1. صفحة تحت `/admin`؟ استخدم `adminRpc`
```ts
import { adminRpc } from '@/lib/adminRpc'
await adminRpc('admin_import_inventory', { ... })   // ✅
await supabase.rpc('admin_import_inventory', {...}) // ⛔ forbidden
```
**ليه:** لوحة `/admin` مقفولة بكوكي مش بـ Supabase Auth → `auth.uid()` = NULL
→ `is_admin()` = false → كل RPC محميّة بترجع `forbidden`.

أي RPC محميّة جديدة **لازم تتضاف** لقايمة `ALLOWED` في `src/app/api/admin/rpc/route.ts`.

### 2. أي `.rpc()` لازم يتفحص الخطأ
```ts
const { error } = await supabase.rpc(...)   // ✅ افحص واعرض
if (error) { setErr(error.message); return }

await supabase.rpc(...)                     // ⛔ بيفشل في صمت
onSaved()                                    //    الفورم بيقفل كأنه نجح
```

**ده اللي خلّى باج المصاريف مستخبّي لأسابيع.**

#### شبكة الأمان (اتعملت 13 يوليو 2026)
- **`rpcSafe(supabase, 'fn', {...})`** — نفس السلوك بالظبط، بس بيسجّل الخطأ
  في الكونسول **وبيطلّع تنبيه أحمر على الشاشة**. اتحطّت في **51 نداء / 27 ملف**
  كانوا بيفشلوا في صمت.
- **`rpcOrThrow(supabase, 'fn', {...})`** — بيرمي Error. للكود الجديد جوه try/catch.
- **`<RpcErrorToast />`** في الـroot layout — بيسمع الحدث ويعرض التنبيه.
  يعني **مفيش فشل هيعدّي من غير ما تشوفه تاني**، حتى في كود مكتوب غلط.

---

## ⚠️ لسه مش مربوط

- **`wallet_transactions`** — محفظة العميل. محتاجة حساب التزام «محفظة عملاء» في شجرة الحسابات.
- **`product_orders`** — الجدول فاضي.
- **`marketplace_payments`** — الجدول فاضي.

---

## نظامين مخزن — انتبه

| الجدول | الحالة |
|---|---|
| `inventory_products` + `inventory_stock_movements` | ✅ **الحي** — ERP بيستخدمه (264 منتج) |
| `inventory_items` + `inventory_movements` | ⚠️ **ميت** — 13 صنف، صفر حركة |

أي شغل مخزن جديد → **`inventory_stock_movements`**.
