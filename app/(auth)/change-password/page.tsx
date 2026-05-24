'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react'
import { toast } from '@/components/ui/Toast'

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export default function ChangePasswordPage() {
  const router = useRouter()
  const [show, setShow] = useState({ current: false, new: false, confirm: false })
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    const res = await fetch('/api/users/me/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setServerError(body.error ?? 'Failed to change password')
      return
    }
    toast('success', 'Password changed successfully!')
    router.push('/dashboard')
  }

  const toggle = (field: 'current' | 'new' | 'confirm') =>
    setShow((s) => ({ ...s, [field]: !s[field] }))

  return (
    <div className="flex min-h-screen items-center justify-center bg-sbc-black px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="bg-sbc-red px-6 py-3">
            <span className="font-heading text-white text-4xl tracking-widest">SBC</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <Lock size={18} className="text-sbc-red" />
          <h1 className="font-heading text-white text-3xl tracking-widest">CHANGE PASSWORD</h1>
        </div>
        <p className="text-white/40 text-sm mb-8">
          Update your account password below.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Current password */}
            <div>
              <label className="block text-white/60 text-xs uppercase tracking-widest mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  {...register('currentPassword')}
                  type={show.current ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter current password"
                  className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 pr-11 text-sm outline-none focus:border-sbc-red transition-colors placeholder:text-white/25"
                />
                <button
                  type="button"
                  onClick={() => toggle('current')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70"
                  aria-label="Toggle visibility"
                >
                  {show.current ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-red-400 text-xs mt-1.5">{errors.currentPassword.message}</p>
              )}
            </div>

            {/* New password */}
            <div>
              <label className="block text-white/60 text-xs uppercase tracking-widest mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  {...register('newPassword')}
                  type={show.new ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 pr-11 text-sm outline-none focus:border-sbc-red transition-colors placeholder:text-white/25"
                />
                <button
                  type="button"
                  onClick={() => toggle('new')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70"
                  aria-label="Toggle visibility"
                >
                  {show.new ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-red-400 text-xs mt-1.5">{errors.newPassword.message}</p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-white/60 text-xs uppercase tracking-widest mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={show.confirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat new password"
                  className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 pr-11 text-sm outline-none focus:border-sbc-red transition-colors placeholder:text-white/25"
                />
                <button
                  type="button"
                  onClick={() => toggle('confirm')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70"
                  aria-label="Toggle visibility"
                >
                  {show.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-400 text-xs mt-1.5">{errors.confirmPassword.message}</p>
              )}
            </div>

            {serverError && (
              <div className="bg-sbc-red/15 border border-sbc-red/40 text-red-300 text-sm px-4 py-3">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-sbc-red text-white font-heading tracking-widest text-xl py-3.5 hover:bg-red-700 active:bg-red-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  UPDATING…
                </>
              ) : (
                'CHANGE PASSWORD'
              )}
            </button>
          </form>
      </div>
    </div>
  )
}
