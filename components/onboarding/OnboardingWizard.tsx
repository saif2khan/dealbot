'use client'

import { useState } from 'react'
import StepCountry from './StepCountry'
import StepBilling from './StepBilling'
import StepProfile from './StepProfile'
import StepAvailability from './StepAvailability'
import StepFirstItem from './StepFirstItem'

const STEPS = ['Phone Number', 'Billing', 'Profile', 'Availability', 'First Item']

interface Props {
  userId: string
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

export default function OnboardingWizard({ userId }: Props) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<Partial<OnboardingData>>({})

  function next(update?: Partial<OnboardingData>) {
    if (update) setData(prev => ({ ...prev, ...update }))
    setStep(s => s + 1)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
          </div>
          <div>
            <h1 className="text-lg font-[family-name:var(--font-manrope)] font-extrabold text-slate-900 tracking-tight leading-tight">DealBot</h1>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold">Premium Curator</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-6">
          {STEPS.map((label, i) => (
            <div key={i} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-indigo-600' : 'bg-slate-200'}`} />
              <p className={`text-[10px] mt-1.5 text-center font-medium truncate ${i === step ? 'text-indigo-600' : 'text-slate-400'}`}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {step === 0 && <StepCountry userId={userId} onNext={next} />}
          {step === 1 && <StepBilling userId={userId} data={data} onNext={next} />}
          {step === 2 && <StepProfile userId={userId} onNext={next} />}
          {step === 3 && <StepAvailability userId={userId} onNext={next} />}
          {step === 4 && <StepFirstItem userId={userId} data={data} />}
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-4">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  )
}
