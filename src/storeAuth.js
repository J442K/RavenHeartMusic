import { create } from 'zustand'
import { supabase } from './lib/supabase'

export const useAuthStore = create((set) => ({
  user: null,
  setUser: (u) => set({ user: u }),
  signOut: async () => { await supabase.auth.signOut(); set({ user: null }) },
}))

export async function initAuthListener() {
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  useAuthStore.getState().setUser(data?.session?.user || null)
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setUser(session?.user || null)
  })
}