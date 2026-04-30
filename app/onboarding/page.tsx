'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

/**
 * 온보딩 — OAuth/이메일 가입 직후 1회 진입.
 *
 * MVP: 인증 확인되면 즉시 /dashboard로. (채널 정보 단계는 추후 추가)
 * 미인증: /login으로.
 */
export default function OnboardingPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'redirecting' | 'error'>('checking')

  useEffect(() => {
    let alive = true
    const check = async () => {
      try {
        const supabase = createSupabaseBrowser()
        const { data: { user } } = await supabase.auth.getUser()
        if (!alive) return
        if (user) {
          setStatus('redirecting')
          router.replace('/dashboard')
        } else {
          setStatus('redirecting')
          router.replace('/login')
        }
      } catch {
        if (alive) setStatus('error')
      }
    }
    check()
    return () => { alive = false }
  }, [router])

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAFAF7]">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />
        <p className="mt-3 text-sm text-gray-500">
          {status === 'error' ? '연결에 문제가 있어요. 다시 시도해주세요.' : '잠시만요…'}
        </p>
      </div>
    </main>
  )
}
