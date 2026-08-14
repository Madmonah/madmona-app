'use client'

// ============================================================================
// AgentDirectives — تبويب توجيهات الـ AI agents (الـ trend الحالي + الـ tips)
// PLACE AT: C:\madmona-app\src\components\admin\AgentDirectives.tsx
// ============================================================================

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

interface Directives {
  scope: string
  current_trend: string | null
  focus_areas: string[]
  target_audience: 'suppliers' | 'employees' | 'both' | 'customers' | null
  tips_text: string | null
  excluded_categories: string[]
  updated_at: string
}

const AUDIENCE_OPTIONS = [
  { value: 'suppliers', label: 'الموردين' },
  { value: 'employees', label: 'الموظفين' },
  { value: 'both', label: 'الاتنين' },
  { value: 'customers', label: 'العملاء' },
]

const FOCUS_PRESET_AREAS = [
  'clinics', 'restaurants', 'cafes', 'beauty', 'properties',
  'vehicles', 'tourism', 'services', 'products', 'spaces'
]

const FOCUS_LABELS: Record<string, string> = {
  clinics: 'عيادات', restaurants: 'مطاعم', cafes: 'كافيهات', beauty: 'تجميل',
  properties: 'عقارات', vehicles: 'مركبات', tourism: 'سياحة',
  services: 'خدمات', products: 'منتجات', spaces: 'مساحات'
}

export function AgentDirectives() {
  const [data, setData] = useState<Directives | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Directives>>({})

  async function load() {
    try {
      const { data: result, error } = await supabaseBrowser.rpc('get_agent_directives', { p_scope: 'global' })
      if (error) throw error
      setData(result as Directives)
      setForm(result || {})
    } catch (e) {
      console.error('AgentDirectives load error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const { data: result, error } = await supabaseBrowser.rpc('upsert_agent_directives', {
        p_scope: 'global',
        p_current_trend: form.current_trend || undefined,
        p_focus_areas: form.focus_areas || [],
        p_target_audience: form.target_audience || null,
        p_tips_text: form.tips_text || undefined,
        p_excluded_categories: form.excluded_categories || ['coworking'],
      })
      if (error) throw error
      setData(result as Directives)
      setEditing(false)
    } catch (e) {
      console.error('Save error:', e)
      alert('حصل خطأ في الحفظ')
    } finally {
      setSaving(false)
    }
  }

  function toggleFocusArea(area: string) {
    const current = form.focus_areas || []
    if (current.includes(area)) {
      setForm({ ...form, focus_areas: current.filter(a => a !== area) })
    } else {
      setForm({ ...form, focus_areas: [...current, area] })
    }
  }

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#7C8A84', fontSize: 13 }}>بتحمّل التوجيهات...</div>
  }

  if (!data) return null

  return (
    <section className="ag-dir" style={{ marginBottom: 24 }}>
      <style>{styles}</style>

      <div className="ag-card">
        <div className="ag-header">
          <div>
            <div className="ag-kicker">توجيهات الـ AI Agents · يقرأها كل الـ agents قبل أي قرار</div>
            <h3 className="ag-title">🎯 التركيز الحالي</h3>
          </div>
          {!editing && (
            <button onClick={() => { setForm(data); setEditing(true) }} className="ag-btn-edit">
              تعديل
            </button>
          )}
        </div>

        {!editing ? (
          // ==== VIEW MODE ====
          <div className="ag-view">
            {data.current_trend && (
              <div className="ag-section">
                <div className="ag-label">الـ trend الحالي</div>
                <div className="ag-value">{data.current_trend}</div>
              </div>
            )}

            <div className="ag-row">
              <div className="ag-section flex-1">
                <div className="ag-label">القطاعات المُركّز عليها</div>
                <div className="ag-chips">
                  {(data.focus_areas || []).map((area) => (
                    <span key={area} className="ag-chip on">
                      {FOCUS_LABELS[area] || area}
                    </span>
                  ))}
                  {(data.focus_areas || []).length === 0 && <span className="ag-empty">— مفيش تركيز محدد —</span>}
                </div>
              </div>

              <div className="ag-section flex-1">
                <div className="ag-label">الجمهور المستهدف</div>
                <div className="ag-value">
                  {AUDIENCE_OPTIONS.find(o => o.value === data.target_audience)?.label || '— مش محدد —'}
                </div>
              </div>
            </div>

            {data.tips_text && (
              <div className="ag-section">
                <div className="ag-label">الـ Tips (سياق إضافي للـ agents)</div>
                <div className="ag-tips">{data.tips_text}</div>
              </div>
            )}

            {data.excluded_categories && data.excluded_categories.length > 0 && (
              <div className="ag-section">
                <div className="ag-label">قطاعات ممنوعة</div>
                <div className="ag-chips">
                  {data.excluded_categories.map((c) => (
                    <span key={c} className="ag-chip off">{c}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="ag-footer">
              آخر تحديث: {new Date(data.updated_at).toLocaleString('ar-EG')}
            </div>
          </div>
        ) : (
          // ==== EDIT MODE ====
          <div className="ag-edit">
            <div className="ag-section">
              <label className="ag-label">الـ trend الحالي</label>
              <input
                type="text" className="ag-input"
                value={form.current_trend || ''}
                onChange={(e) => setForm({ ...form, current_trend: e.target.value })}
                placeholder="مثلاً: إطلاق العيادات + المطاعم"
              />
            </div>

            <div className="ag-row">
              <div className="ag-section flex-1">
                <label className="ag-label">القطاعات المُركّز عليها</label>
                <div className="ag-chips">
                  {FOCUS_PRESET_AREAS.map((area) => (
                    <button
                      key={area} type="button"
                      onClick={() => toggleFocusArea(area)}
                      className={`ag-chip ${form.focus_areas?.includes(area) ? 'on' : 'off-clickable'}`}
                    >
                      {FOCUS_LABELS[area]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ag-section flex-1">
                <label className="ag-label">الجمهور المستهدف</label>
                <div className="ag-radios">
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="ag-radio">
                      <input
                        type="radio" name="audience" value={opt.value}
                        checked={form.target_audience === opt.value}
                        onChange={() => setForm({ ...form, target_audience: opt.value as Directives['target_audience'] })}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="ag-section">
              <label className="ag-label">الـ Tips (الـ agents هيقروه قبل أي قرار)</label>
              <textarea
                className="ag-textarea" rows={4}
                value={form.tips_text || ''}
                onChange={(e) => setForm({ ...form, tips_text: e.target.value })}
                placeholder="مثلاً: التركيز على استحواذ موردين جدد. الـ commission: 10% أفراد. الـ slogan: معاملاتك مضمونة."
              />
            </div>

            <div className="ag-actions">
              <button onClick={() => setEditing(false)} className="ag-btn-cancel" disabled={saving}>
                إلغاء
              </button>
              <button onClick={handleSave} className="ag-btn-save" disabled={saving}>
                {saving ? 'بيحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

const styles = `
.ag-dir .ag-card {
  background: linear-gradient(135deg, rgba(255,255,255,.95), rgba(247,251,249,.85));
  border: 1px solid rgba(250, 129, 37,.15);
  border-radius: 18px;
  padding: 22px;
  box-shadow: 0 8px 24px -12px rgba(16,40,34,.15);
}
.ag-dir .ag-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; gap: 12px; }
.ag-dir .ag-kicker { font-size: 10.5px; font-weight: 800; letter-spacing: .08em; color: #FA8125; margin-bottom: 4px; }
.ag-dir .ag-title { font-size: 18px; font-weight: 800; margin: 0; color: #0A0A0A; }
.ag-dir .ag-btn-edit {
  font-size: 12.5px; font-weight: 700; padding: 8px 16px; border-radius: 10px;
  background: #FA8125; color: #fff; border: none; cursor: pointer; transition: .15s;
}
.ag-dir .ag-btn-edit:hover { background: #175C4F; transform: translateY(-1px); }
.ag-dir .ag-section { margin-bottom: 14px; }
.ag-dir .ag-section.flex-1 { flex: 1; }
.ag-dir .ag-row { display: flex; gap: 18px; flex-wrap: wrap; }
.ag-dir .ag-label {
  display: block; font-size: 11px; font-weight: 700; color: #7C8A84;
  letter-spacing: .04em; margin-bottom: 6px;
}
.ag-dir .ag-value { font-size: 14px; font-weight: 600; color: #0A0A0A; }
.ag-dir .ag-tips {
  font-size: 13px; line-height: 1.7; color: #41504A;
  background: rgba(255,255,255,.7); padding: 12px 14px; border-radius: 10px;
  border-inline-start: 3px solid #2FA084;
}
.ag-dir .ag-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.ag-dir .ag-chip {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 12px; font-weight: 700; padding: 6px 11px; border-radius: 999px;
  border: 1px solid transparent; cursor: pointer;
}
.ag-dir .ag-chip.on { background: #D1FAE5; color: #065F46; border-color: #6FCF97; }
.ag-dir .ag-chip.off { background: rgba(220,38,38,.08); color: #991B1B; border-color: rgba(220,38,38,.2); }
.ag-dir .ag-chip.off-clickable { background: #F3F4F6; color: #6B7280; border-color: #E5E7EB; }
.ag-dir .ag-chip.off-clickable:hover { background: #E5E7EB; }
.ag-dir .ag-empty { color: #9CA3AF; font-size: 12px; font-style: italic; }
.ag-dir .ag-input, .ag-dir .ag-textarea {
  width: 100%; font-family: inherit; font-size: 14px; padding: 10px 12px;
  border: 1px solid #E5E7EB; border-radius: 10px; background: #fff; color: #0A0A0A;
  resize: vertical;
}
.ag-dir .ag-input:focus, .ag-dir .ag-textarea:focus { outline: 2px solid #FA8125; border-color: #FA8125; }
.ag-dir .ag-radios { display: flex; flex-wrap: wrap; gap: 12px; }
.ag-dir .ag-radio { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
.ag-dir .ag-radio input { accent-color: #FA8125; }
.ag-dir .ag-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
.ag-dir .ag-btn-cancel, .ag-dir .ag-btn-save {
  font-size: 13px; font-weight: 700; padding: 9px 18px; border-radius: 10px;
  border: none; cursor: pointer; transition: .15s;
}
.ag-dir .ag-btn-cancel { background: #F3F4F6; color: #374151; }
.ag-dir .ag-btn-cancel:hover { background: #E5E7EB; }
.ag-dir .ag-btn-save { background: linear-gradient(120deg, #D4A017, #2FA084, #FA8125); color: #fff; }
.ag-dir .ag-btn-save:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px -8px rgba(250, 129, 37,.4); }
.ag-dir .ag-btn-save:disabled { opacity: .5; cursor: not-allowed; }
.ag-dir .ag-footer { font-size: 10.5px; color: #9CA3AF; margin-top: 8px; text-align: end; }
@media (max-width: 640px) { .ag-dir .ag-row { flex-direction: column; gap: 14px; } }
`
