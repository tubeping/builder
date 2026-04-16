'use client'

import StepLogin from './_components/step-login'

export default function OnboardingPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8 min-h-screen">
      <div className="w-full max-w-lg">
        <StepLogin />
      </div>
    </main>
  )
}
