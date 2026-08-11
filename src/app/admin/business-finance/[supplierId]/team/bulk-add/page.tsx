'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Users, ChevronLeft, Loader2, Plus, Trash2, CheckCircle2,
  ClipboardPaste, Type, AlertCircle, Building2, ArrowDownToLine,
  Sparkles, FileSpreadsheet,
} from 'lucide-react'
// PERF: xlsx (~110KB gzipped) loaded on demand in the file handler below
// instead of shipping in this page's initial bundle (was 304KB First Load JS).
import { extractRowImages, uploadExtractedImage } from '@/lib/xlsxImages'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Branch = {
  id: string
  name: string
  code: string | null
}

type Row = {
  id: string
  name: string
  salary: string
  role: string
  role_ar: string
  notes: string
  photo: string
  phone: string
}

const ROLE_PRESETS = [
  { value: 'branch_manager', label_ar: 'مدير فرع', en: 'Branch Manager' },
  { value: 'hair_stylist', label_ar: 'Senior Stylist', en: 'Senior Stylist' },
  { value: 'hair_stylist', label_ar: 'Stylist', en: 'Stylist' },
  { value: 'hair_stylist', label_ar: 'Junior Stylist', en: 'Junior Stylist' },
  { value: 'makeup_artist', label_ar: 'MUA', en: 'Makeup Artist' },
  { value: 'nail_tech', label_ar: 'Nails', en: 'Nail Tech' },
  { value: 'helper', label_ar: 'Helper', en: 'Helper' },
  { value: 'receptionist', label_ar: 'استقبال', en: 'Receptionist' },
  { value: 'cleaner', label_ar: 'نظافة', en: 'Cleaner' },
  { value: 'trainee', label_ar: 'Trainee', en: 'Trainee' },
]

// Auto-assign role based on salary
function inferRole(salary: number): { role: string; role_ar: string } {
  if (salary >= 25000) return { role: 'hair_stylist', role_ar: 'Master Stylist' }
  if (salary >= 14000) return { role: 'hair_stylist', role_ar: 'Senior Stylist' }
  if (salary >= 10000) return { role: 'hair_stylist', role_ar: 'Stylist' }
  if (salary >= 7000) return { role: 'helper', role_ar: 'Helper' }
  return { role: 'helper', role_ar: 'Junior/Helper' }
}

// Normalize Arabic digits to ASCII + clean numbers like "12,000" or "١٢/٠٠٠"
function normalizeNumber(s: string): number | null {
  if (!s) return null
  const arabicToEn: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  }
  let normalized = s.split('').map(c => arabicToEn[c] || c).join('')
  // Remove non-digit chars except digits
  normalized = normalized.replace(/[^\d]/g, '')
  if (!normalized) return null
  const n = parseInt(normalized, 10)
  return isNaN(n) ? null : n
}

// Parse a single line: extract name + salary
function parseLine(line: string): { name: string; salary: number | null } | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  
  // Find all number sequences (Arabic or Latin digits, with possible separators)
  const numberMatch = trimmed.match(/[\d٠-٩۰-۹][\d٠-٩۰-۹\s,،\/\.\-]*[\d٠-٩۰-۹]|[\d٠-٩۰-۹]/g)
  if (!numberMatch || numberMatch.length === 0) {
    // No number — return name only
    return { name: trimmed, salary: null }
  }
  
  // Take the last number group (typically salary at end)
  const lastNumber = numberMatch[numberMatch.length - 1]
  const salary = normalizeNumber(lastNumber)
  
  // Remove the salary from the line to get the name
  const lastIdx = trimmed.lastIndexOf(lastNumber)
  let name = trimmed.substring(0, lastIdx).trim()
  // Remove trailing separators like -, :, etc
  name = name.replace(/[\-:\s]+$/, '').trim()
  
  if (!name) {
    return { name: trimmed, salary }
  }
  
  return { name, salary }
}

export default function BulkAddEmployeesPage({
  params,
}: {
  params: { supplierId: string }
}) {
  const { supplierId } = params
  const router = useRouter()
  
  const [supplier, setSupplier] = useState<{ business_name: string } | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  
  const [mode, setMode] = useState<'paste' | 'manual' | 'excel'>('paste')
  const [pasteText, setPasteText] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  // Load supplier + branches
  useEffect(() => {
    (async () => {
      // @ts-expect-error
      const { data: sup } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
      setSupplier(sup as any)
      // @ts-expect-error
      const { data: br } = await supabase.from('supplier_branches').select('id, name, code').eq('supplier_id', supplierId).order('code')
      setBranches((br || []) as Branch[])
      if (br && br.length > 0) setSelectedBranch(br[0].id)
    })()
  }, [supplierId])
  
  // Parse paste text into rows
  function parsePasteText() {
    if (!pasteText.trim()) {
      setRows([])
      return
    }
    const lines = pasteText.split('\n').filter(l => l.trim())
    const newRows: Row[] = lines.map((line, i) => {
      const parsed = parseLine(line)
      const salary = parsed?.salary || 0
      const roleInfo = inferRole(salary)
      return {
        id: `${Date.now()}-${i}`,
        name: parsed?.name || '',
        salary: parsed?.salary?.toString() || '',
        role: roleInfo.role,
        role_ar: roleInfo.role_ar,
        notes: '',
        photo: '',
        phone: '',
      }
    })
    setRows(newRows)
    setMode('manual') // switch to manual mode to review
  }

  // Excel mode: parse xlsx/csv — بيقرا الاسم والمرتب والوظيفة والصورة والتليفون تلقائي
  const [excelError, setExcelError] = useState<string | null>(null)
  const [excelFileName, setExcelFileName] = useState('')
  const [excelBusy, setExcelBusy] = useState<string | null>(null)
  async function onExcelFile(file: File) {
    setExcelError(null)
    try {
      const buf = await file.arrayBuffer()
      const XLSX = await import('xlsx')
      const wb = XLSX.read(buf)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: null })
      if (!json.length) { setExcelError('الشيت فاضي'); return }
      // الصور المدفونة جوه الشيت — بتترفع وتتربط بالموظف حسب الصف
      const embedded = await extractRowImages(buf)
      const normH = (s: string) => String(s || '').trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه')
      const headers = Object.keys(json[0])
      const findCol = (aliases: string[]) => headers.find(h => aliases.some(a => normH(a) === normH(h))) || null
      const cName   = findCol(['name', 'full_name', 'الاسم', 'اسم الموظف', 'الموظف', 'اسم'])
      const cSalary = findCol(['salary', 'salary_egp', 'المرتب', 'الراتب', 'مرتب'])
      const cRole   = findCol(['role', 'role_ar', 'الوظيفة', 'المسمى', 'الدور', 'المسمى الوظيفي'])
      const cPhoto  = findCol(['photo', 'photo_url', 'image', 'img', 'الصورة', 'صورة', 'رابط الصورة', 'لينك الصورة'])
      const cPhone  = findCol(['phone', 'mobile', 'تليفون', 'موبايل', 'رقم', 'الرقم', 'واتساب'])
      const cNotes  = findCol(['notes', 'ملاحظات', 'ملاحظة'])
      if (!cName) { setExcelError('مش لاقي عمود الاسم في الشيت — سمّيه "الاسم" أو "name"'); return }
      const newRows: Row[] = json
        .map((r, origIdx) => ({ r, origIdx }))
        .filter(({ r }) => String(r[cName] || '').trim())
        .map(({ r, origIdx }, i) => {
          void i
          const salaryNum = cSalary ? (normalizeNumber(String(r[cSalary] ?? '')) || 0) : 0
          const inferred = inferRole(salaryNum)
          const roleTxt = cRole ? String(r[cRole] || '').trim() : ''
          const preset = roleTxt ? ROLE_PRESETS.find(pr => normH(pr.label_ar) === normH(roleTxt) || normH(pr.en) === normH(roleTxt)) : null
          return {
            id: `${Date.now()}-x${i}`,
            name: String(r[cName]).trim(),
            salary: salaryNum ? String(salaryNum) : '',
            role: preset ? preset.value : inferred.role,
            role_ar: preset ? preset.label_ar : (roleTxt || inferred.role_ar),
            notes: cNotes ? String(r[cNotes] || '').trim() : '',
            photo: cPhoto ? String(r[cPhoto] || '').trim() : '',
            phone: cPhone ? String(r[cPhone] || '').trim() : '',
            _sheetRow: origIdx + 1,
          } as Row & { _sheetRow: number }
        })
      // ارفع الصور المدفونة للموظفين اللي ملهمش لينك صورة
      if (embedded.size > 0) {
        for (let i = 0; i < newRows.length; i++) {
          const nr = newRows[i] as Row & { _sheetRow?: number }
          if (nr.photo) continue
          const img = embedded.get(nr._sheetRow ?? -1)
          if (!img) continue
          setExcelBusy(`بترفع صورة ${nr.name}… (${i + 1}/${newRows.length})`)
          const url = await uploadExtractedImage(img, supplierId, 'employee', nr.name)
          if (url) nr.photo = url
        }
        setExcelBusy(null)
      }
      setExcelFileName(file.name)
      setRows(newRows)
      setMode('manual') // review
    } catch (e: any) {
      setExcelError(e?.message || 'مش قادر أقرا الملف')
    }
  }

  // Manual mode: add empty row
  function addRow() {
    setRows(prev => [...prev, {
      id: `${Date.now()}-new`,
      name: '',
      salary: '',
      role: 'hair_stylist',
      role_ar: 'Stylist',
      notes: '',
      photo: '',
      phone: '',
    }])
  }
  
  function updateRow(id: string, patch: Partial<Row>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }
  
  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
  }
  
  // Initialize 5 empty rows when switching to manual mode
  function startManualMode() {
    if (rows.length === 0) {
      setRows(Array.from({ length: 5 }, (_, i) => ({
        id: `${Date.now()}-${i}`,
        name: '',
        salary: '',
        role: 'hair_stylist',
        role_ar: 'Stylist',
        notes: '',
        photo: '',
        phone: '',
      })))
    }
    setMode('manual')
  }
  
  // Submit
  async function handleSubmit() {
    const validRows = rows.filter(r => r.name.trim())
    if (validRows.length === 0) {
      alert('ما فيش أسماء صحيحة للإضافة')
      return
    }
    if (!selectedBranch) {
      alert('اختار فرع الأول')
      return
    }
    
    setSubmitting(true)
    setResult(null)
    
    const payload = validRows.map(r => ({
      full_name: r.name.trim(),
      role: r.role,
      role_ar: r.role_ar,
      salary_egp: r.salary ? normalizeNumber(r.salary) : null,
      metadata: {
        ...(r.notes ? { notes: r.notes } : {}),
        ...(r.photo ? { photo_url: r.photo } : {}),
        ...(r.phone ? { phone: r.phone } : {}),
      },
    }))
    
    // @ts-expect-error
    const { data, error } = await supabase.rpc('admin_bulk_add_employees', {
      p_supplier_id: supplierId,
      p_branch_id: selectedBranch,
      p_employees: payload,
    })
    
    if (error) {
      setResult({ success: false, error: error.message })
    } else {
      setResult(data)
      if (data?.inserted > 0) {
        // Keep only failed rows
        const failedNames = new Set((data.errors || []).map((e: any) => e.name))
        setRows(rows.filter(r => failedNames.has(r.name.trim())))
      }
    }
    setSubmitting(false)
  }
  
  const totalRows = rows.length
  const validRowsCount = rows.filter(r => r.name.trim()).length
  const totalPayroll = rows.reduce((sum, r) => sum + (normalizeNumber(r.salary) || 0), 0)
  
  if (!supplier) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link
            href={`/admin/business-finance/${supplierId}/team`}
            className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            رجوع للفريق
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">
                B2B PARTNER · BULK ADD EMPLOYEES
              </p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">
                إضافة موظفين Bulk · {supplier.business_name}
              </h1>
              <p className="text-sm text-[#6B7280] mt-1">
                الصق ليستة، أو ارفع شيت Excel (بالصور)، أو أضفهم يدوي صف صف
              </p>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Result banner */}
        {result && (
          <div className={`rounded-2xl p-4 border ${
            result.success !== false ? 'bg-[#FA8125]/5 border-[#FA8125]/20' : 'bg-red-50 border-red-200'
          }`}>
            {result.success !== false ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-[#FA8125]" />
                  <p className="text-sm font-black text-[#1A2E26]">
                    تم إضافة {result.inserted} موظف بنجاح
                    {result.skipped > 0 && ` · ${result.skipped} متخطي`}
                  </p>
                </div>
                {result.inserted_employees && result.inserted_employees.length > 0 && (
                  <div className="mt-3 text-xs text-[#6B7280] space-y-1 max-h-32 overflow-y-auto">
                    {result.inserted_employees.map((emp: any) => (
                      <div key={emp.id} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-[#FA8125]" />
                        <span>PIN {emp.pin} — {emp.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-amber-700 space-y-1">
                    <p className="font-bold mb-1">صفوف متخطية:</p>
                    {result.errors.map((e: any, i: number) => (
                      <div key={i}>· {e.name}: {e.error}</div>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/admin/business-finance/${supplierId}/team`}
                    className="px-3 py-1.5 rounded-lg bg-[#FA8125] text-white text-xs font-bold"
                  >
                    شوف الفريق
                  </Link>
                  <button
                    onClick={() => { setResult(null); setRows([]); setPasteText('') }}
                    className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-[#1A2E26] text-xs font-bold"
                  >
                    إضافة دفعة جديدة
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-black text-red-900">حصل خطأ</p>
                  <p className="text-xs text-red-700 mt-1">{result.error}</p>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Branch selector */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-2 block">
            الفرع
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {branches.map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedBranch(b.id)}
                className={`px-3 py-2.5 rounded-xl text-sm font-bold border transition-all text-right ${
                  selectedBranch === b.id
                    ? 'bg-[#FA8125] text-white border-[#FA8125]'
                    : 'bg-[#FAFAF7] text-[#1A2E26] border-gray-100 hover:border-[#FA8125]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{b.name}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
        
        {/* Mode tabs */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setMode('paste')}
              className={`flex-1 px-4 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                mode === 'paste'
                  ? 'bg-[#FA8125]/5 text-[#FA8125] border-b-2 border-[#FA8125]'
                  : 'text-[#6B7280] hover:text-[#1A2E26]'
              }`}
            >
              <ClipboardPaste className="w-4 h-4" />
              لصق ليستة
            </button>
            <button
              onClick={startManualMode}
              className={`flex-1 px-4 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                mode === 'manual'
                  ? 'bg-[#FA8125]/5 text-[#FA8125] border-b-2 border-[#FA8125]'
                  : 'text-[#6B7280] hover:text-[#1A2E26]'
              }`}
            >
              <Type className="w-4 h-4" />
              إدخال يدوي
            </button>
            <button
              onClick={() => setMode('excel')}
              className={`flex-1 px-4 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                mode === 'excel'
                  ? 'bg-[#FA8125]/5 text-[#FA8125] border-b-2 border-[#FA8125]'
                  : 'text-[#6B7280] hover:text-[#1A2E26]'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              شيت Excel
            </button>
          </div>

          {/* EXCEL MODE */}
          {mode === 'excel' && (
            <div className="p-4 space-y-3">
              <div className="bg-[#FA8125]/5 border border-[#FA8125]/20 rounded-xl p-3 text-xs text-[#1A2E26]">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-[#FA8125] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-1">ارفع شيت (.xlsx / .csv) والأعمدة بتتقري تلقائي:</p>
                    <ul className="space-y-0.5 list-disc mr-4 text-[#6B7280]">
                      <li><b>الاسم</b> (إجباري) · المرتب · الوظيفة</li>
                      <li><b>الصور</b>: مدفونة جوه الشيت (بتتقري تلقائي 📸) أو عمود برابط الصورة · تليفون · ملاحظات</li>
                      <li>عربي أو إنجليزي في أسماء الأعمدة — الاتنين شغالين</li>
                    </ul>
                  </div>
                </div>
              </div>
              <input
                type="file" accept=".xlsx,.xls,.csv"
                className="w-full text-sm file:ml-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-[#FA8125] file:text-white file:font-bold file:cursor-pointer"
                onChange={(e) => e.target.files?.[0] && onExcelFile(e.target.files[0])}
              />
              {excelBusy && <p className="text-xs font-bold text-[#FA8125] flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> {excelBusy}</p>}
              {excelFileName && <p className="text-xs text-[#6B7280]">📄 {excelFileName}</p>}
              {excelError && <p className="text-xs font-bold text-red-600">{excelError}</p>}
            </div>
          )}
          
          {/* PASTE MODE */}
          {mode === 'paste' && (
            <div className="p-4 space-y-3">
              <div className="bg-[#FA8125]/5 border border-[#FA8125]/20 rounded-xl p-3 text-xs text-[#1A2E26]">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-[#FA8125] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-1">صيغ مدعومة (هـ يتعرف عليها تلقائياً):</p>
                    <ul className="space-y-0.5 list-disc mr-4 text-[#6B7280]">
                      <li>عمرو محمد 14000</li>
                      <li>محمود - 13,000</li>
                      <li>ابو حمزه ١٠٠٠٠</li>
                      <li>فارس ١٢/٠٠٠</li>
                      <li>كامبو: 15000</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder={"الصق هنا، اسم بسطر واحد:\n\nعمرو محمد 14000\nمحمود 13000\nابو حمزه 10000"}
                rows={10}
                className="w-full px-4 py-3 rounded-xl bg-[#FAFAF7] border border-gray-100 text-sm text-[#1A2E26] focus:outline-none focus:border-[#FA8125] placeholder-[#6B7280] resize-y font-mono"
                dir="rtl"
              />
              
              <button
                onClick={parsePasteText}
                disabled={!pasteText.trim()}
                className="w-full px-4 py-3 rounded-xl bg-[#FA8125] hover:opacity-90 text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
              >
                <ArrowDownToLine className="w-4 h-4" />
                حلّل + اعرض للمراجعة
              </button>
            </div>
          )}
          
          {/* MANUAL MODE */}
          {mode === 'manual' && (
            <div className="p-4 space-y-3">
              {rows.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#1A2E26]">ابدأ بإضافة موظف</p>
                  <button
                    onClick={addRow}
                    className="mt-3 px-4 py-2 rounded-xl bg-[#FA8125] text-white text-sm font-bold inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> إضافة موظف
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280]">
                          <th className="text-right pb-2 pl-2 w-8">#</th>
                          <th className="text-right pb-2 pl-2">الاسم</th>
                          <th className="text-right pb-2 pl-2 w-32">المرتب (ج)</th>
                          <th className="text-right pb-2 pl-2 w-40">الدور</th>
                          <th className="pb-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, idx) => (
                          <tr key={row.id} className="border-t border-gray-100">
                            <td className="py-2 pl-2 text-xs text-[#6B7280] font-mono">{idx + 1}</td>
                            <td className="py-2 pl-2">
                              <div className="flex items-center gap-2">
                                {row.photo && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={row.photo} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                )}
                                <input
                                  type="text"
                                  value={row.name}
                                  onChange={e => updateRow(row.id, { name: e.target.value })}
                                  placeholder="اسم الموظف"
                                  className="w-full px-2 py-1.5 rounded-lg bg-[#FAFAF7] border border-transparent hover:border-gray-200 focus:border-[#FA8125] focus:outline-none text-sm text-[#1A2E26] placeholder-[#6B7280]"
                                />
                              </div>
                            </td>
                            <td className="py-2 pl-2">
                              <input
                                type="text"
                                value={row.salary}
                                onChange={e => {
                                  const newSalary = e.target.value
                                  const numSalary = normalizeNumber(newSalary) || 0
                                  const inferred = inferRole(numSalary)
                                  updateRow(row.id, { 
                                    salary: newSalary,
                                    role: inferred.role,
                                    role_ar: inferred.role_ar,
                                  })
                                }}
                                placeholder="مرتب"
                                className="w-full px-2 py-1.5 rounded-lg bg-[#FAFAF7] border border-transparent hover:border-gray-200 focus:border-[#FA8125] focus:outline-none text-sm text-[#1A2E26] placeholder-[#6B7280] font-mono"
                              />
                            </td>
                            <td className="py-2 pl-2">
                              <select
                                value={`${row.role}:${row.role_ar}`}
                                onChange={e => {
                                  const [role, role_ar] = e.target.value.split(':')
                                  updateRow(row.id, { role, role_ar })
                                }}
                                className="w-full px-2 py-1.5 rounded-lg bg-[#FAFAF7] border border-transparent hover:border-gray-200 focus:border-[#FA8125] focus:outline-none text-sm text-[#1A2E26]"
                              >
                                {ROLE_PRESETS.map(p => (
                                  <option key={`${p.value}:${p.label_ar}`} value={`${p.value}:${p.label_ar}`}>
                                    {p.label_ar}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 text-center">
                              <button
                                onClick={() => removeRow(row.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-[#6B7280] hover:text-red-600 transition-colors"
                                title="احذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <button
                    onClick={addRow}
                    className="w-full p-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#FA8125] text-[#6B7280] hover:text-[#FA8125] text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    صف جديد
                  </button>
                </>
              )}
            </div>
          )}
        </section>
        
        {/* Footer / Submit */}
        {rows.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 p-4 sticky bottom-4 shadow-lg">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-sm">
                <p className="text-[#1A2E26] font-black">
                  {validRowsCount} من {totalRows} جاهزين
                </p>
                {totalPayroll > 0 && (
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    إجمالي المرتبات: {totalPayroll.toLocaleString()} ج/شهر
                  </p>
                )}
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || validRowsCount === 0 || !selectedBranch}
                className="px-6 py-3 rounded-xl bg-[#FA8125] hover:opacity-90 text-sm font-black text-white flex items-center gap-2 disabled:opacity-40 transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري الإضافة...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    احفظ كل الموظفين
                  </>
                )}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
