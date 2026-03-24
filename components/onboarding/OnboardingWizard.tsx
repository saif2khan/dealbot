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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`}
              />
              <p className={`text-xs mt-1 text-center ${i === step ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow p-8">
          {step === 0 && <StepCountry userId={userId} onNext={next} />}
          {step === 1 && <StepBilling userId={userId} data={data} onNext={next} />}
          {step === 2 && <StepProfile userId={userId} onNext={next} />}
          {step === 3 && <StepAvailability userId={userId} onNext={next} />}
          {step === 4 && <StepFirstItem userId={userId} data={data} />}
        </div>
      </div>
    </div>
  )
}
