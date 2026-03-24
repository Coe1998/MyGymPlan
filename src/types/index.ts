export type UserRole = 'coach' | 'cliente' | 'atleta'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  piano: 'free' | 'pro'
  created_at: string
}
