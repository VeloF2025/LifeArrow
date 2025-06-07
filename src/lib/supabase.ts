import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'staff' | 'client'
          first_name: string | null
          last_name: string | null
          email: string | null
          phone: string | null
          date_of_birth: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'admin' | 'staff' | 'client'
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          date_of_birth?: string | null
        }
        Update: {
          role?: 'admin' | 'staff' | 'client'
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          date_of_birth?: string | null
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          profile_id: string | null
          client_code: string
          emergency_contact: string | null
          medical_conditions: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          profile_id?: string | null
          client_code: string
          emergency_contact?: string | null
          medical_conditions?: string[]
        }
        Update: {
          emergency_contact?: string | null
          medical_conditions?: string[]
          updated_at?: string
        }
      }
      scans: {
        Row: {
          id: string
          client_id: string
          scan_date: string
          body_score: number | null
          muscle_mass: number | null
          body_fat_percentage: number | null
          metabolic_age: number | null
          visceral_fat: number | null
          bone_density: number | null
          hydration_level: number | null
          raw_data: Record<string, any> | null
          file_path: string | null
          created_at: string
        }
        Insert: {
          client_id: string
          scan_date?: string
          body_score?: number | null
          muscle_mass?: number | null
          body_fat_percentage?: number | null
          metabolic_age?: number | null
          visceral_fat?: number | null
          bone_density?: number | null
          hydration_level?: number | null
          raw_data?: Record<string, any> | null
          file_path?: string | null
        }
        Update: {
          body_score?: number | null
          muscle_mass?: number | null
          body_fat_percentage?: number | null
          metabolic_age?: number | null
          visceral_fat?: number | null
          bone_density?: number | null
          hydration_level?: number | null
          raw_data?: Record<string, any> | null
          file_path?: string | null
        }
      }
      bookings: {
        Row: {
          id: string
          client_id: string
          appointment_date: string
          duration_minutes: number
          service_type: string
          status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          client_id: string
          appointment_date: string
          duration_minutes?: number
          service_type: string
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
          notes?: string | null
        }
        Update: {
          appointment_date?: string
          duration_minutes?: number
          service_type?: string
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
          notes?: string | null
          updated_at?: string
        }
      }
    }
  }
}