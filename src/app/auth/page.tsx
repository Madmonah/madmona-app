'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient, findUserByPhone, insertUser } from '@/lib/supabase'
import { ArrowRight, MessageSquare, Clock, Shield, Zap } from 'lucide-react'

enum AuthStep {
  PHONE = 'phone',
  OTP = 'otp', 
  WELCOME = 'welcome'
}

export default function AuthPage() {
  const [step, setStep] = useState<AuthStep>(AuthStep.PHONE)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const router = useRouter()
  const supabase = createSupabaseClient()
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleSendOTP = async () => {
    if (phoneNumber.length < 9) {
      alert('من فضلك أدخل رقم موبايل صحيح')
      return
    }

    setLoading(true)
    try {
      const fullPhone = `+20${phoneNumber}`
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
        options: {
          channel: 'sms'
        }
      })

      if (error) {
        console.error('Error sending OTP:', error)
        alert('حدث خطأ في إرسال الكود. حاول مرة أخرى.')
        return
      }

      setStep(AuthStep.OTP)
      setCountdown(30)
    } catch (error) {
      console.error('Error:', error)
      alert('حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return // Only allow digits

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-advance to next input
    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('')
    if (otpCode.length !== 4) {
      alert('من فضلك أدخل الكود كاملاً')
      return
    }

    setLoading(true)
    try {
      const fullPhone = `+20${phoneNumber}`
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otpCode,
        type: 'sms'
      })

      if (error) {
        console.error('Error verifying OTP:', error)
        alert('الكود غير صحيح. حاول مرة أخرى.')
        setOtp(['', '', '', ''])
        otpRefs.current[0]?.focus()
        return
      }

      if (data.user) {
        // Check if this is the first time user
        const existingUser = await findUserByPhone(fullPhone)

        if (!existingUser) {
          // Create new user record
          await insertUser({
            id: data.user.id,
            phone_number: fullPhone,
            is_first_time: true,
          })
          setStep(AuthStep.WELCOME)
        } else {
          // Existing user, redirect to home
          router.push('/')
        }
      }
    } catch (error) {
      console.error('Verification error:', error)
      alert('حدث خطأ في التحقق')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    await handleSendOTP()
  }

  const handleGetStarted = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Logo Section */}
      <div className="text-center pt-16 pb-12">
        <div className="w-20 h-20 bg-primary rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-brand">
          <div className="text-white font-bold text-2xl">م</div>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1">مضمونة</h1>
        <p className="text-muted-foreground">مساحتك اللي بتخصك</p>
      </div>

      <div className="flex-1 px-6 pb-8">
        {/* Phone Step */}
        {step === AuthStep.PHONE && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">أدخل رقمك</h2>
              <p className="text-muted-foreground">هنبعتلك كود تأكيد علشان نتأكد إن الرقم صحيح</p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-foreground mb-2 block">رقم الموبايل</span>
                <div className="flex gap-3">
                  <div className="input-arabic w-20 text-center">+20</div>
                  <input
                    type="tel"
                    className="input-arabic flex-1"
                    placeholder="100 222 9982"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10}
                  />
                </div>
              </label>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              باستخدام التطبيق، أنت موافق على{' '}
              <a className="text-primary underline">شروط الاستخدام</a> و{' '}
              <a className="text-primary underline">سياسة الخصوصية</a>
            </p>

            <button
              onClick={handleSendOTP}
              disabled={loading || phoneNumber.length < 9}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري الإرسال...' : 'إرسال الكود'}
            </button>
          </div>
        )}

        {/* OTP Step */}
        {step === AuthStep.OTP && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">أدخل الكود</h2>
              <p className="text-muted-foreground mb-4">أدخل الكود المكوّن من ٤ أرقام اللي وصلك على الموبايل</p>
              
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground">
                  تم الإرسال إلى <span className="font-medium text-foreground">+20 {phoneNumber}</span>
                  <button 
                    onClick={() => setStep(AuthStep.PHONE)}
                    className="text-primary text-xs mr-2 underline"
                  >
                    تعديل
                  </button>
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-center" style={{ direction: 'ltr' }}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (otpRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  className={`w-14 h-14 text-center text-xl font-semibold border-2 rounded-xl 
                    ${digit ? 'border-primary bg-primary/5' : 'border-border bg-white'} 
                    focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                    transition-colors`}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOTPChange(index, e.target.value)}
                  onKeyDown={(e) => handleOTPKeyDown(index, e)}
                />
              ))}
            </div>

            <div className="bg-accent-50 border border-accent-200 rounded-xl p-3 flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-accent flex-shrink-0" />
              <span className="text-xs text-accent-800">هنقرا الكود من الـ SMS تلقائياً</span>
            </div>

            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-sm text-muted-foreground">
                  إعادة الإرسال خلال <span className="font-medium text-primary">{countdown}</span> ثانية
                </p>
              ) : (
                <button
                  onClick={handleResendOTP}
                  className="text-primary text-sm font-medium underline"
                >
                  إرسال الكود مرة تانية
                </button>
              )}
            </div>

            <button
              onClick={handleVerifyOTP}
              disabled={loading || otp.some(d => !d)}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري التحقق...' : 'تأكيد'}
            </button>
          </div>
        )}

        {/* Welcome Step */}
        {step === AuthStep.WELCOME && (
          <div className="space-y-8 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-full mx-auto flex items-center justify-center shadow-brand">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">أهلاً بيك في مضمونة</h2>
              <p className="text-muted-foreground leading-relaxed">
                خلاص، حسابك جاهز وتقدر تحجز مساحتك دلوقتي. 
                استعد لتجربة عمل مختلفة تماماً.
              </p>
            </div>

            <div className="card p-5 space-y-4 text-right">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Clock size={16} className="text-primary" />
                </div>
                <span className="text-sm font-medium">حجز فوري في ثوانِ</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Shield size={16} className="text-primary" />
                </div>
                <span className="text-sm font-medium">دخول ذكي بدون مفاتيح</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Zap size={16} className="text-primary" />
                </div>
                <span className="text-sm font-medium">يوم تجريبي مجاني</span>
              </div>
            </div>

            <button
              onClick={handleGetStarted}
              className="w-full bg-gradient-to-r from-primary to-primary/90 text-white py-4 px-6 rounded-2xl font-semibold shadow-brand"
            >
              ابدأ الحجز
            </button>
          </div>
        )}
      </div>
    </div>
  )
}