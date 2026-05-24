'use client'
import { Suspense, useState } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-sbc-black" />}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const passwordChanged = searchParams.get('changed') === '1'
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setAuthError(null)
    const result = await signIn('credentials', {
      username: data.username,
      password: data.password,
      redirect: false,
    })
    if (result?.error) {
      setAuthError('Invalid username or password')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex h-full min-h-screen">
      {/* ── Left panel ── */}
      <div className="relative hidden lg:flex w-1/2 bg-sbc-red flex-col items-center justify-center overflow-hidden p-12">
        {/* Watermark */}
        <span
          className="absolute select-none pointer-events-none font-heading text-white leading-none"
          style={{ fontSize: '22rem', opacity: 0.08 }}
          aria-hidden
        >
          SBC
        </span>

        {/* Badge */}
        <div className="relative z-10 mb-8 h-20 w-20 rounded-lg bg-white shadow-[0_16px_35px_rgba(255,255,255,0.35)]">
          <Image src="/images/logo.png" alt="SBC Logo" fill sizes="80px" className="object-contain p-1.5" priority />
        </div>

        <h1 className="relative z-10 font-heading text-white text-5xl tracking-widest text-center leading-tight">
          THE SUMMIT<br />BIBLE CHURCH
        </h1>
        <p className="relative z-10 mt-5 text-white/70 text-center text-sm leading-relaxed">
          SBC Reporting System
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-sbc-black px-8 py-12">
        {/* Mobile badge */}
        <div className="flex justify-center mb-8 lg:hidden">
          <div className="relative h-14 w-14 rounded-lg bg-white shadow-[0_12px_24px_rgba(255,255,255,0.22)]">
            <Image src="/images/logo.png" alt="SBC Logo" fill sizes="56px" className="object-contain p-1" priority />
          </div>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="font-heading text-white text-5xl tracking-widest mb-1">WELCOME BACK</h2>
          <p className="text-white/40 text-sm mb-8">Sign in to your account to continue</p>

          {passwordChanged && (
            <div className="mb-6 bg-green-600/15 border border-green-500/40 text-green-300 text-sm px-4 py-3">
              Password changed successfully. Please sign in.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Username */}
            <div>
              <label className="block text-white/60 text-xs uppercase tracking-widest mb-2">
                Username
              </label>
              <input
                {...register('username')}
                type="text"
                autoComplete="username"
                placeholder="Enter your username"
                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm outline-none focus:border-sbc-red transition-colors placeholder:text-white/25"
              />
              {errors.username && (
                <p className="text-red-400 text-xs mt-1.5">{errors.username.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-white/60 text-xs uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 pr-12 text-sm outline-none focus:border-sbc-red transition-colors placeholder:text-white/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1.5">{errors.password.message}</p>
              )}
            </div>

            {/* Auth error */}
            {authError && (
              <div className="bg-sbc-red/15 border border-sbc-red/40 text-red-300 text-sm px-4 py-3">
                {authError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-sbc-red text-white font-heading tracking-widest text-xl py-3.5 hover:bg-red-700 active:bg-red-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  SIGNING IN...
                </>
              ) : (
                'SIGN IN'
              )}
            </button>
          </form>

          <p className="mt-7 text-white/25 text-xs text-center">
            Forgot your password? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
