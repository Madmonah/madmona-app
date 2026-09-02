'use client';
// Madmona ERP — المحاسبة (شجرة حسابات · قيود · قوائم مالية · استيراد Excel)
import { supabaseBrowser as supabase } from '@/lib/supabase-browser';
import { useT } from '@/lib/i18n/LanguageProvider'
import { jsonObj } from '@/lib/rpc';
import { useEffect, useMemo, useState } from 'react';
// PERF: xlsx (~430KB raw / ~110KB gzipped) is only used by the import flow
// below, so it is loaded on demand instead of shipping in this page's initial
// bundle (this page was 292KB First Load JS).

const G = { dark: '#059669', mid: '#34D399', teal: '#2FA084', light: '#6FCF97', bg: '#FAFAF7', ink: '#0A0A0A' };

type Account = { id: string; code: string; name_ar: string; account_type: string; is_postable: boolean; parent_id: string | null };
type TBRow = { code: string; name_ar: string; account_type: string; balance_debit: number; balance_credit: number };

const TYPE_AR: Record<string, string> = { asset: 'أصول', liability: 'التزامات', equity: 'حقوق ملكية', revenue: 'إيرادات', expense: 'مصروفات' };

const IMPORT_TARGETS: Record<string, { label: string; fields: { key: string; label: string }[] }> = {
  mart_products: { label: 'منتجات (مارت)', fields: [
    { key: 'name_ar', label: 'اسم المنتج' }, { key: 'price', label: 'السعر' },
    { key: 'compare_at_price', label: 'السعر قبل الخصم' }, { key: 'category', label: 'التصنيف' },
    { key: 'unit', label: 'الوحدة' }, { key: 'brand', label: 'الماركة' },
    { key: 'barcode', label: 'الباركود' }, { key: 'photo_url', label: 'رابط الصورة' },
    { key: 'in_stock', label: 'متوفر (true/false)' } ] },
  accounts: { label: 'شجرة حسابات', fields: [
    { key: 'code', label: 'كود الحساب' }, { key: 'name_ar', label: 'اسم الحساب' },
    { key: 'account_type', label: 'النوع (asset/liability/equity/revenue/expense)' },
    { key: 'parent_code', label: 'كود الحساب الأب' } ] },
  opening_balances: { label: 'أرصدة افتتاحية', fields: [
    { key: 'account_code', label: 'كود الحساب' }, { key: 'debit', label: 'مدين' },
    { key: 'credit', label: 'دائن' }, { key: 'as_of', label: 'التاريخ (YYYY-MM-DD)' } ] },
  transactions: { label: 'حركات مالية (وارد/صادر)', fields: [
    { key: 'direction', label: 'الاتجاه (in/out أو وارد/صادر)' }, { key: 'amount_egp', label: 'المبلغ' },
    { key: 'category', label: 'التصنيف' }, { key: 'payment_method', label: 'طريقة الدفع' },
    { key: 'description', label: 'الوصف' }, { key: 'occurred_at', label: 'التاريخ' } ] },
};

const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 });

export default function ErpAccountingPage() {
  // 🌍 (٢ سبتمبر ٢٠٢٦) ترجمة شاشات الإدارة
  const { t } = useT()
  const [supplierId, setSupplierId] = useState<string>('');
  const [tab, setTab] = useState<'coa' | 'entry' | 'reports' | 'import'>('reports');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [msg, setMsg] = useState<{ t: 'ok' | 'err'; m: string } | null>(null);
  const flash = (t: 'ok' | 'err', m: string) => { setMsg({ t, m }); setTimeout(() => setMsg(null), 6000); };

  useEffect(() => { (async () => {
    const p = new URLSearchParams(window.location.search).get('supplier');
    if (p) { setSupplierId(p); return; }
    const { data } = await supabase.rpc('my_supplier_links');
    // الدالة بترجّع jsonb، فالعناصر جواها Json مش كائنات مكتوبة.
    const links = (Array.isArray(data) ? data : []).map(x => jsonObj<{ supplier_id: string }>(x));
    if (links[0]?.supplier_id) setSupplierId(links[0].supplier_id);
  })(); }, []);

  const loadAccounts = async () => {
    if (!supplierId) return;
    const { data } = await supabase.from('erp_accounts').select('id,code,name_ar,account_type,is_postable,parent_id')
      .eq('supplier_id', supplierId).eq('is_active', true).order('code');
    setAccounts((data as Account[]) || []);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAccounts(); }, [supplierId]);

  const seedCoa = async () => {
    const { data } = await supabase.rpc('erp_seed_default_coa', { p_supplier_id: supplierId });
    const r = jsonObj<{ ok: boolean; error: string; accounts_created: number }>(data);
    if (r.ok) { flash('ok', `تم إنشاء ${r.accounts_created} حساب`); loadAccounts(); }
    else flash('err', r.error || t('erp.error'));
  };

  // ---------- قيد يدوي ----------
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [entryMemo, setEntryMemo] = useState('');
  const [lines, setLines] = useState([{ account_id: '', debit: '', credit: '' }, { account_id: '', debit: '', credit: '' }]);
  const totals = useMemo(() => lines.reduce((a, l) => ({ d: a.d + (+l.debit || 0), c: a.c + (+l.credit || 0) }), { d: 0, c: 0 }), [lines]);

  const saveEntry = async () => {
    const payload = lines.filter(l => l.account_id && ((+l.debit || 0) > 0 || (+l.credit || 0) > 0))
      .map(l => ({ account_id: l.account_id, debit: +l.debit || 0, credit: +l.credit || 0 }));
    const { data } = await supabase.rpc('erp_create_entry', {
      p_supplier_id: supplierId, p_entry_date: entryDate, p_memo: entryMemo, p_lines: payload, p_auto_post: true });
    const r = jsonObj<{ ok: boolean; error: string; entry_no: string }>(data);
    if (r.ok) { flash('ok', `تم ترحيل القيد رقم ${r.entry_no}`);
      setLines([{ account_id: '', debit: '', credit: '' }, { account_id: '', debit: '', credit: '' }]); setEntryMemo(''); }
    else flash('err', r.error || t('erp.error'));
  };

  // ---------- التقارير ----------
  const monthStartStr = (() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); })();
  const [from, setFrom] = useState(monthStartStr);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<'tb' | 'income' | 'bs'>('tb');
  const [tb, setTb] = useState<TBRow[]>([]);
  const [income, setIncome] = useState<any>(null);
  const [bs, setBs] = useState<any>(null);

  const runReport = async () => {
    if (report === 'tb') {
      const { data } = await supabase.rpc('erp_trial_balance', { p_supplier_id: supplierId, p_from: from, p_to: to });
      setTb((data as TBRow[]) || []);
    } else if (report === 'income') {
      const { data } = await supabase.rpc('erp_income_statement', { p_supplier_id: supplierId, p_from: from, p_to: to });
      setIncome(data);
    } else {
      const { data } = await supabase.rpc('erp_balance_sheet', { p_supplier_id: supplierId, p_as_of: to });
      setBs(data);
    }
  };

  // ---------- استيراد Excel ----------
  const [impType, setImpType] = useState<string>('mart_products');
  const [impFile, setImpFile] = useState<string>('');
  const [impCols, setImpCols] = useState<string[]>([]);
  const [impRows, setImpRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [listingId, setListingId] = useState('');
  const [impBusy, setImpBusy] = useState(false);
  const [impResult, setImpResult] = useState<any>(null);

  const onFile = async (f: File) => {
    setImpFile(f.name); setImpResult(null);
    const buf = await f.arrayBuffer();
    const XLSX = await import('xlsx');
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: null });
    setImpRows(json);
    const cols = json.length ? Object.keys(json[0]) : [];
    setImpCols(cols);
    const auto: Record<string, string> = {};
    const fields = IMPORT_TARGETS[impType].fields;
    cols.forEach(c => { const hit = fields.find(fl => fl.key === c || fl.label === c); if (hit) auto[c] = hit.key; });
    setMapping(auto);
  };

  const runImport = async () => {
    if (!impRows.length) return flash('err', 'ارفع ملف الأول');
    setImpBusy(true); setImpResult(null);
    try {
      let batchId: string | null = null; const total = { ok: 0, fail: 0 };
      for (let i = 0; i < impRows.length; i += 1000) {
        const chunk = impRows.slice(i, i + 1000);
        const { data: sub } = await supabase.rpc('erp_import_submit', {
          p_supplier_id: supplierId, p_entity_type: impType, p_file_name: impFile,
          p_mapping: mapping, p_rows: chunk,
          p_target: impType === 'mart_products' ? { listing_id: listingId } : {} });
        const subR = jsonObj<{ ok: boolean; error: string; batch_id: string }>(sub);
        if (!subR.ok) throw new Error(subR.error || 'فشل رفع الدفعة');
        // لو `ok` صحيحة فالدالة رجّعت batch_id — نتحقق صراحةً بدل ما نمرر
        // قيمة فاضية للمعالجة وتفشل برسالة غامضة.
        if (!subR.batch_id) throw new Error('الرفع نجح بس مرجعش رقم الدفعة');
        batchId = subR.batch_id;
        const { data: proc } = await supabase.rpc('erp_import_process', { p_batch_id: batchId });
        const procR = jsonObj<{ ok: boolean; error: string; ok_rows: number; failed_rows: number }>(proc);
        if (!procR.ok) throw new Error(procR.error || 'فشل المعالجة');
        total.ok += procR.ok_rows ?? 0; total.fail += procR.failed_rows ?? 0;
      }
      setImpResult(total);
      if (total.fail > 0 && batchId) {
        const { data: errs } = await supabase.from('erp_import_rows')
          .select('row_no,error').eq('batch_id', batchId).eq('status', 'failed').limit(20);
        setImpResult({ ...total, errors: errs });
      }
      flash(total.fail === 0 ? 'ok' : 'err', `تم: ${total.ok} صف ناجح، ${total.fail} فشل`);
    } catch (e: any) { flash('err', e.message); }
    setImpBusy(false);
  };

  // ---------- UI ----------
  const card: React.CSSProperties = { background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: 20, boxShadow: '0 4px 24px rgba(250, 129, 37,.08)', border: '1px solid rgba(250, 129, 37,.1)' };
  const btn: React.CSSProperties = { background: `linear-gradient(90deg, ${G.teal}, ${G.dark})`, color: '#fff', border: 0, borderRadius: 999, padding: '10px 24px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
  const inp: React.CSSProperties = { border: `1px solid rgba(250, 129, 37,.25)`, borderRadius: 12, padding: '8px 12px', fontFamily: 'inherit', background: '#fff', width: '100%' };
  const th: React.CSSProperties = { padding: '10px 12px', textAlign: 'right', fontSize: 13, color: G.dark, borderBottom: `2px solid ${G.teal}` };
  const td: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid rgba(0,0,0,.06)', fontSize: 14 };
  const postable = accounts.filter(a => a.is_postable);

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: G.bg, color: G.ink, fontFamily: "'Cairo', 'Inter', sans-serif", padding: '24px 16px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ color: G.dark, fontSize: 26, fontWeight: 800, marginBottom: 4 }}>{t('erp.accounting_title')}</h1>
        <p style={{ color: '#555', marginTop: 0 }}>{t('erp.accounting_sub')}</p>

        {msg && <div style={{ ...card, padding: 12, marginBottom: 12, borderRight: `4px solid ${msg.t === 'ok' ? G.teal : '#c0392b'}` }}>{msg.m}</div>}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {([['reports', t('erp.statements')], ['entry', 'قيد يومية'], ['coa', t('erp.chart_tree')], ['import', t('erp.import_excel')]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ ...btn, background: tab === k ? btn.background : '#fff', color: tab === k ? '#fff' : G.dark, border: tab === k ? 0 : `1.5px solid ${G.teal}` }}>{l}</button>
          ))}
        </div>

        {tab === 'coa' && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, color: G.dark, fontSize: 18 }}>شجرة الحسابات ({accounts.length})</h2>
              {accounts.length === 0 && <button style={btn} onClick={seedCoa}>{t('erp.create_default_tree')}</button>}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>{t('erp.code')}</th><th style={th}>{t('erp.name')}</th><th style={th}>{t('erp.type')}</th><th style={th}>{t('erp.post')}</th></tr></thead>
              <tbody>{accounts.map(a => (
                <tr key={a.id}>
                  <td style={{ ...td, fontWeight: a.is_postable ? 400 : 800 }}>{a.code}</td>
                  <td style={{ ...td, paddingRight: a.parent_id ? 28 : 12, fontWeight: a.is_postable ? 400 : 800 }}>{a.name_ar}</td>
                  <td style={td}>{TYPE_AR[a.account_type]}</td>
                  <td style={td}>{a.is_postable ? '✓' : '—'}</td>
                </tr>))}</tbody>
            </table>
          </div>
        )}

        {tab === 'entry' && (
          <div style={card}>
            <h2 style={{ marginTop: 0, color: G.dark, fontSize: 18 }}>{t('erp.new_entry')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10, marginBottom: 12 }}>
              <input type="date" style={inp} value={entryDate} onChange={e => setEntryDate(e.target.value)} />
              <input style={inp} placeholder={t('erp.memo')} value={entryMemo} onChange={e => setEntryMemo(e.target.value)} />
            </div>
            {lines.map((l, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px', gap: 8, marginBottom: 8 }}>
                <select style={inp} value={l.account_id} onChange={e => setLines(v => v.map((x, j) => j === i ? { ...x, account_id: e.target.value } : x))}>
                  <option value="">— اختر الحساب —</option>
                  {postable.map(a => <option key={a.id} value={a.id}>{a.code} · {a.name_ar}</option>)}
                </select>
                <input style={inp} type="number" placeholder={t('erp.debit')} value={l.debit} onChange={e => setLines(v => v.map((x, j) => j === i ? { ...x, debit: e.target.value, credit: '' } : x))} />
                <input style={inp} type="number" placeholder={t('erp.credit')} value={l.credit} onChange={e => setLines(v => v.map((x, j) => j === i ? { ...x, credit: e.target.value, debit: '' } : x))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
              <button style={{ ...btn, background: '#fff', color: G.dark, border: `1.5px solid ${G.teal}` }} onClick={() => setLines(v => [...v, { account_id: '', debit: '', credit: '' }])}>{t('erp.add_line')}</button>
              <span style={{ fontWeight: 700, color: totals.d === totals.c && totals.d > 0 ? G.mid : '#c0392b' }}>
                مدين {fmt(totals.d)} · دائن {fmt(totals.c)} {totals.d === totals.c && totals.d > 0 ? '✓ متوازن' : '✗'}
              </span>
              <button style={{ ...btn, marginRight: 'auto', opacity: totals.d === totals.c && totals.d > 0 ? 1 : .5 }} disabled={!(totals.d === totals.c && totals.d > 0)} onClick={saveEntry}>{t('erp.post_entry')}</button>
            </div>
          </div>
        )}

        {tab === 'reports' && (
          <div style={card}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
              <select style={{ ...inp, width: 200 }} value={report} onChange={e => setReport(e.target.value as any)}>
                <option value="tb">ميزان المراجعة</option>
                <option value="income">{t('erp.income_statement')}</option>
                <option value="bs">{t('erp.balance_sheet')}</option>
              </select>
              {report !== 'bs' && <input type="date" style={{ ...inp, width: 160 }} value={from} onChange={e => setFrom(e.target.value)} />}
              <input type="date" style={{ ...inp, width: 160 }} value={to} onChange={e => setTo(e.target.value)} />
              <button style={btn} onClick={runReport}>{t('erp.view')}</button>
            </div>

            {report === 'tb' && tb.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={th}>{t('erp.code')}</th><th style={th}>{t('erp.account')}</th><th style={th}>{t('erp.debit')}</th><th style={th}>{t('erp.credit')}</th></tr></thead>
                <tbody>{tb.map(r => <tr key={r.code}><td style={td}>{r.code}</td><td style={td}>{r.name_ar}</td><td style={td}>{fmt(r.balance_debit)}</td><td style={td}>{fmt(r.balance_credit)}</td></tr>)}
                <tr style={{ fontWeight: 800, background: 'rgba(47,160,132,.08)' }}>
                  <td style={td} colSpan={2}>{t('erp.total')}</td>
                  <td style={td}>{fmt(tb.reduce((a, r) => a + +r.balance_debit, 0))}</td>
                  <td style={td}>{fmt(tb.reduce((a, r) => a + +r.balance_credit, 0))}</td>
                </tr></tbody>
              </table>)}

            {report === 'income' && income?.ok && (
              <div>
                <h3 style={{ color: G.dark }}>{t('erp.revenues')}</h3>
                {income.revenue.map((r: any) => <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,.05)' }}><span>{r.code} · {r.name_ar}</span><b>{fmt(r.amount)}</b></div>)}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 800, color: G.mid }}><span>{t('erp.total_revenue')}</span><span>{fmt(income.total_revenue)}</span></div>
                <h3 style={{ color: G.dark }}>{t('erp.expenses')}</h3>
                {income.expenses.map((r: any) => <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,.05)' }}><span>{r.code} · {r.name_ar}</span><b>{fmt(r.amount)}</b></div>)}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 800 }}><span>{t('erp.total_expense')}</span><span>{fmt(income.total_expenses)}</span></div>
                <div style={{ ...card, marginTop: 12, background: `linear-gradient(90deg, rgba(212,160,23,.1), rgba(47,160,132,.12))`, display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 18 }}>
                  <span>صافي {income.net_income >= 0 ? t('erp.profit') : t('erp.loss')}</span><span style={{ color: income.net_income >= 0 ? G.dark : '#c0392b' }}>{fmt(income.net_income)} ج.م</span>
                </div>
              </div>)}

            {report === 'bs' && bs?.ok && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <h3 style={{ color: G.dark }}>{t('erp.assets')}</h3>
                  {bs.assets.map((r: any) => <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,.05)' }}><span>{r.name_ar}</span><b>{fmt(r.amount)}</b></div>)}
                  <div style={{ fontWeight: 800, padding: '8px 0', color: G.mid }}>الإجمالي: {fmt(bs.total_asset)}</div>
                </div>
                <div>
                  <h3 style={{ color: G.dark }}>{t('erp.liab_equity')}</h3>
                  {bs.liabilitys.map((r: any) => <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,.05)' }}><span>{r.name_ar}</span><b>{fmt(r.amount)}</b></div>)}
                  {bs.equitys.map((r: any) => <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,.05)' }}><span>{r.name_ar}</span><b>{fmt(r.amount)}</b></div>)}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}><span>{t('erp.net_income')}</span><b>{fmt(bs.net_income_to_date)}</b></div>
                  <div style={{ fontWeight: 800, padding: '8px 0', color: G.mid }}>الإجمالي: {fmt(bs.total_liability + bs.total_equity_incl_income)}</div>
                </div>
                <div style={{ gridColumn: '1/-1', textAlign: 'center', fontWeight: 800, color: bs.balanced ? G.mid : '#c0392b' }}>
                  {bs.balanced ? '✓ الميزانية متوازنة' : '✗ الميزانية غير متوازنة — راجع القيود'}
                </div>
              </div>)}
          </div>
        )}

        {tab === 'import' && (
          <div style={card}>
            <h2 style={{ marginTop: 0, color: G.dark, fontSize: 18 }}>استيراد من Excel</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 10, marginBottom: 12 }}>
              <select style={inp} value={impType} onChange={e => { setImpType(e.target.value); setMapping({}); }}>
                {Object.entries(IMPORT_TARGETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <input type="file" accept=".xlsx,.xls,.csv" style={inp} onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
            </div>
            {impType === 'mart_products' && (
              <input style={{ ...inp, marginBottom: 12 }} placeholder="listing_id بتاع المتجر (مطلوب للمنتجات)" value={listingId} onChange={e => setListingId(e.target.value)} />
            )}

            {impCols.length > 0 && (
              <>
                <h3 style={{ color: G.dark, fontSize: 15 }}>ربط الأعمدة ({impRows.length} صف)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, marginBottom: 14 }}>
                  {impCols.map(c => (
                    <div key={c} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, minWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c}>{c}</span>
                      <select style={inp} value={mapping[c] || ''} onChange={e => setMapping(m => ({ ...m, [c]: e.target.value }))}>
                        <option value="">— تجاهل —</option>
                        {IMPORT_TARGETS[impType].fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <button style={{ ...btn, opacity: impBusy ? .6 : 1 }} disabled={impBusy} onClick={runImport}>
                  {impBusy ? t('erp.importing') : `استيراد ${impRows.length} صف`}
                </button>
              </>
            )}

            {impResult && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: 'rgba(47,160,132,.08)' }}>
                <b>النتيجة:</b> {impResult.ok} ناجح · {impResult.fail} فشل
                {impResult.errors?.map((e: any) => <div key={e.row_no} style={{ fontSize: 13, color: '#c0392b' }}>صف {e.row_no}: {e.error}</div>)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
