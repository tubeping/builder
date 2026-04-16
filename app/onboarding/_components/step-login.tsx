'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

type Mode = 'login' | 'signup'

const TERMS_URL = '/terms'
const PRIVACY_URL = '/privacy'

export default function StepLogin() {
  const router = useRouter()
  const supabase = createSupabaseBrowser()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const allAgreed = agreeTerms && agreePrivacy

  function handleToggleAll() {
    const next = !allAgreed
    setAgreeTerms(next)
    setAgreePrivacy(next)
  }

  async function handleSubmit() {
    setError('')
    setLoading(true)

    try {
      if (!email.trim() || !password.trim()) {
        setError('이메일과 비밀번호를 입력해주세요.')
        return
      }

      if (mode === 'signup') {
        if (!name.trim()) {
          setError('이름을 입력해주세요.')
          return
        }
        if (password.length < 8) {
          setError('비밀번호는 8자 이상이어야 합니다.')
          return
        }
        if (password !== passwordConfirm) {
          setError('비밀번호가 일치하지 않습니다.')
          return
        }
        if (!allAgreed) {
          setError('필수 약관에 동의해주세요.')
          return
        }

        // Supabase 회원가입
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, agreed_terms: true, agreed_privacy: true },
          },
        })

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            setError('이미 가입된 이메일입니다.')
          } else {
            setError(signUpError.message)
          }
          return
        }

        router.push('/dashboard')
      } else {
        // Supabase 로그인
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.')
          return
        }

        router.push('/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (googleError) {
      setError('Google 로그인에 실패했습니다.')
    }
  }

  return (
    <div className="text-center">
      {/* 로고 */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          <span className="text-[#C41E1E]">Tube</span>
          <span className="text-[#111111]">Ping</span>
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          크리에이터를 위한 커머스 파트너
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-8 shadow-sm">
        {/* 탭 */}
        <div className="mb-6 flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => { setMode('login'); setError('') }}
            className={`flex-1 cursor-pointer rounded-md py-2 text-sm font-medium transition-colors ${
              mode === 'login'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            로그인
          </button>
          <button
            onClick={() => { setMode('signup'); setError('') }}
            className={`flex-1 cursor-pointer rounded-md py-2 text-sm font-medium transition-colors ${
              mode === 'signup'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            회원가입
          </button>
        </div>

        {/* 입력 폼 */}
        <div className="space-y-3 text-left">
          {mode === 'signup' && (
            <div>
              <input
                type="text"
                placeholder="이름 (채널명 또는 실명)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#C41E1E]"
              />
            </div>
          )}
          <div>
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#C41E1E]"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && mode === 'login') handleSubmit() }}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#C41E1E]"
            />
          </div>
          {mode === 'signup' && (
            <div>
              <input
                type="password"
                placeholder="비밀번호 확인"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#C41E1E]"
              />
            </div>
          )}
        </div>

        {/* 에러 */}
        {error && (
          <p className="mt-3 text-left text-xs text-[#C41E1E]">{error}</p>
        )}

        {/* 제출 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-5 w-full cursor-pointer rounded-xl bg-[#C41E1E] py-3 text-sm font-medium text-white hover:bg-[#A01818] transition-colors disabled:opacity-50"
        >
          {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>

        {/* 구분선 */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-gray-400">또는</span>
          </div>
        </div>

        {/* 약관 동의 (회원가입 시에만) */}
        {mode === 'signup' && (
          <div className="mb-4 space-y-2 text-left">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={allAgreed}
                onChange={handleToggleAll}
                className="h-4 w-4 rounded accent-[#C41E1E]"
              />
              <span className="text-sm font-medium text-gray-900">전체 동의</span>
            </label>
            <div className="ml-6 space-y-1.5">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="h-3.5 w-3.5 rounded accent-[#C41E1E]"
                />
                <span className="text-xs text-gray-600">
                  <span className="text-[#C41E1E]">[필수]</span>{' '}
                  <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#C41E1E]">이용약관</a> 동의
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(e) => setAgreePrivacy(e.target.checked)}
                  className="h-3.5 w-3.5 rounded accent-[#C41E1E]"
                />
                <span className="text-xs text-gray-600">
                  <span className="text-[#C41E1E]">[필수]</span>{' '}
                  <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#C41E1E]">개인정보처리방침</a> 동의
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Google 로그인 */}
        <button
          onClick={() => {
            if (mode === 'signup' && !allAgreed) {
              setError('약관에 동의해주세요.')
              return
            }
            handleGoogle()
          }}
          className="w-full flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google로 계속하기
        </button>
      </div>
    </div>
  )
}
