import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabase'

const schema = z.object({
  username: z.string().min(3).regex(/^[a-z0-9_-]+$/i),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(8),
})

export default function Register({ onSuccess }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    if (!supabase) { alert('Auth not configured. Add Supabase env vars.'); return }
    const email = data.email || `${data.username}@noemail.ravenheart.local`
    const { data: res, error } = await supabase.auth.signUp({
      email,
      password: data.password,
      options: { data: { username: data.username, wantsEmail: !!data.email } }
    })
    if (error) {
      console.error('Supabase signUp error:', error)
      const msg = (error?.message || '').toLowerCase()
      const hint =
        msg.includes('signups not allowed') || msg.includes('signup disabled') ? 'Enable sign-ups in Supabase Auth settings.' :
        (msg.includes('email') && msg.includes('invalid')) ? 'Provide a valid email or disable confirmations for testing.' :
        (msg.includes('already') && msg.includes('exist')) || msg.includes('already registered') ? 'Account may already exist — try logging in.' :
        msg.includes('password') ? 'Use a stronger password (min 8).' :
        'Check Supabase Auth config (confirm email, captcha, providers).'
      alert(`Raven refuses: bad omen. ${hint}\nDetails: ${error?.message || 'unknown error'}`)
      return
    }
    onSuccess?.(res?.user)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-black border border-blood p-6 jagged" style={{ borderRadius: '8px' }}>
      <input {...register('username')} placeholder="Choose your raven name" className="w-full text-silver bg-transparent border-b border-blood p-2" />
      {errors.username && <div className="text-blood text-xs mt-1">Min 3, letters/numbers/_/-</div>}

      <input {...register('email')} placeholder="Optional e-mail" className="w-full text-silver bg-transparent border-b border-blood p-2 mt-4" />
      {errors.email && <div className="text-blood text-xs mt-1">Invalid e-mail</div>}

      <input {...register('password')} type="password" placeholder="Crypt key (min 8)" className="w-full text-silver bg-transparent border-b border-blood p-2 mt-4" />
      {errors.password && <div className="text-blood text-xs mt-1">Min 8 chars</div>}

      <button disabled={isSubmitting} className="mt-6 w-full bg-blood text-black font-black p-2 jagged hover-blood" style={{ borderRadius: '8px' }}>{isSubmitting ? 'Binding pact…' : 'Sign the pact'}</button>
    </form>
  )
}