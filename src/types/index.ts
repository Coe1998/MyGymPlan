export type UserRole = 'coach' | 'cliente'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
}