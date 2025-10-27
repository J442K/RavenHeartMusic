import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabase'

const schema = z.object({
  identifier: z.string().min(3), // email or username
  password: z.string().min(8),
})

export default function Login({ onSuccess }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const toEmail = (id) => id.includes('@') ? id : `${id}@noemail.ravenheart.local`

  const onSubmit = async ({ identifier, password }) => {
    if (!supabase) { alert('Auth not configured. Add Supabase env vars.'); return }
    const email = toEmail(identifier)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const msg = (error?.message || '').toLowerCase()
      const hint = msg.includes('invalid') ? 'Check username or password.'
        : msg.includes('email not confirmed') ? 'Confirm your email in Supabase or disable confirmations.'
        : 'Try registering first, then login.'
      alert(`Raven says: wrong bones. ${hint}`)
      return
    }
    onSuccess?.()
  }

  const onGitHub = async () => {
    if (!supabase) { alert('Auth not configured. Add Supabase env vars.'); return }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: window.location.origin } })
    if (error) {
      const msg = (error?.message || '').toLowerCase()
      const hint = msg.includes('provider not enabled') ? 'Enable GitHub provider in Supabase Auth.'
        : msg.includes('callback') ? 'Check the callback URL in Supabase → GitHub settings.'
        : 'Verify GitHub OAuth app Client ID/Secret in Supabase.'
      alert(`Raven refuses: bad omen. ${hint}`)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-black border border-blood p-6 jagged" style={{ borderRadius: '8px' }}>
      <input {...register('identifier')} placeholder="Email or raven name" className="w-full text-silver bg-transparent border-b border-blood p-2" />
      {errors.identifier && <div className="text-blood text-xs mt-1">Min 3 chars</div>}
      <input {...register('password')} type="password" placeholder="Crypt key" className="w-full text-silver bg-transparent border-b border-blood p-2 mt-4" />
      {errors.password && <div className="text-blood text-xs mt-1">Min 8 chars</div>}
      <button disabled={isSubmitting} className="mt-6 w-full bg-blood text-black font-black p-2 jagged hover-blood" style={{ borderRadius: '8px' }}>{isSubmitting ? 'Summoning…' : 'Enter the coven'}</button>
      <div className="mt-4 text-center text-silver opacity-70">or</div>
      <button type="button" onClick={onGitHub} className="mt-4 w-full bg-silver text-black font-bold p-2 jagged hover:bg-blood hover:text-black" style={{ borderRadius: '8px' }}>
        Sign in with GitHub
      </button>
    </form>
  )
}