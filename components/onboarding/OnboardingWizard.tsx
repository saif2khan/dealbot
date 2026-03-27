'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StepCountry from './StepCountry'
import StepBilling from './StepBilling'
import StepProfile from './StepProfile'
import StepAvailability from './StepAvailability'

const STEPS = ['Phone', 'Profile', 'Agent', 'Billing']

interface Props {
  userId: string
  initialStep?: number
  billingDone?: boolean
}

export interface OnboardingData {
  country: string
  telnyxNumber: string
  telnyxNumberId: string
  address: string
  addressArea: string
  phone: string
  globalInstructions: string
  availabilityText: string
}

export default function OnboardingWizard({ userId, initialStep = 0, billingDone = false }: Props) {
  const [step, setStep] = useState(initialStep)
  const [data, setData] = useState<Partial<OnboardingData>>({})
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function next(update?: Partial<OnboardingData>) {
    if (update) setData(prev => ({ ...prev, ...update }))
    const nextStep = step + 1
    if (nextStep >= STEPS.length) {
      router.push('/dashboard')
    } else {
      setStep(nextStep)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start md:justify-center px-4 py-8">
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
          </div>
          <div>
            <h1 className="text-base font-[family-name:var(--font-manrope)] font-extrabold text-slate-900 tracking-tight leading-tight">BZARP</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Your Marketplace Assistant</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-5">
          {STEPS.map((label, i) => (
            <div key={i} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-indigo-600' : 'bg-slate-200'}`} />
              <p className={`hidden sm:block text-[10px] mt-1.5 text-center font-medium truncate ${i === step ? 'text-indigo-600' : 'text-slate-400'}`}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Step counter — mobile only */}
        <p className="sm:hidden text-xs text-slate-400 text-center mb-4">
          Step {step + 1} of {STEPS.length} — <span className="text-indigo-600 font-semibold">{STEPS[step]}</span>
        </p>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-8">
          {step === 0 && <StepCountry userId={userId} onNext={next} />}
          {step === 1 && <StepProfile userId={userId} onNext={next} />}
          {step === 2 && <StepAvailability userId={userId} onNext={next} />}
          {step === 3 && <StepBilling userId={userId} data={data} onNext={next} billingDone={billingDone} />}
        </div>

        <div className="flex items-center justify-end mt-4 px-1">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">logout</span>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
