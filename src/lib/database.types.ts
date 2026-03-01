export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      project_types: {
        Row: { id: string; name: string; value: number; description: string | null }
        Insert: { id?: string; name: string; value: number; description?: string | null }
        Update: { name?: string; value?: number; description?: string | null }
      }
      drone_ranges: {
        Row: { id: string; min_drones: number; max_drones: number; coefficient: number }
        Insert: { id?: string; min_drones: number; max_drones: number; coefficient: number }
        Update: { min_drones?: number; max_drones?: number; coefficient?: number }
      }
      work_types: {
        Row: { id: string; name: string; base_value: number }
        Insert: { id?: string; name: string; base_value: number }
        Update: { name?: string; base_value?: number }
      }
      clients: {
        Row: { id: string; name: string; created_at: string }
        Insert: { id?: string; name: string; created_at?: string }
        Update: { name?: string }
      }
      sellers: {
        Row: { id: string; name: string; created_at: string }
        Insert: { id?: string; name: string; created_at?: string }
        Update: { name?: string }
      }
      projects: {
        Row: {
          id: string
          name: string
          type_id: string
          drone_count: number
          is_rework: boolean
          status: 'Active' | 'Archived'
          client_id: string | null
          workflow_status: 'preview' | 'preproduction' | 'assembly' | 'final_stretch' | 'show' | 'stop' | 'awaiting_response' | null
          global_deadline: string | null
          pitch_deadline: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type_id: string
          drone_count: number
          is_rework?: boolean
          status?: 'Active' | 'Archived'
          client_id?: string | null
          workflow_status?: 'preview' | 'preproduction' | 'assembly' | 'final_stretch' | 'show' | 'stop' | 'awaiting_response' | null
          global_deadline?: string | null
          pitch_deadline?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }
      project_sellers: {
        Row: { id: string; project_id: string; seller_id: string; created_at: string }
        Insert: { id?: string; project_id: string; seller_id: string; created_at?: string }
        Update: { project_id?: string; seller_id?: string }
      }
      project_milestones: {
        Row: {
          id: string
          project_id: string
          pitch_date: string
          comment: string | null
          created_at: string
          sort_order: number
        }
        Insert: {
          id?: string
          project_id: string
          pitch_date: string
          comment?: string | null
          created_at?: string
          sort_order?: number
        }
        Update: Partial<Database['public']['Tables']['project_milestones']['Insert']>
      }
      work_logs: {
        Row: {
          id: string
          user_id: string
          project_id: string
          work_type_id: string
          quantity: number
          date: string
          image_url: string | null
          milestone_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          work_type_id: string
          quantity: number
          date: string
          image_url?: string | null
          milestone_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['work_logs']['Insert']>
      }
      period_configs: {
        Row: {
          id: string
          period_name: string
          norm_points: number
          company_profit_coef_q1: number
          created_at: string
        }
        Insert: {
          id?: string
          period_name: string
          norm_points: number
          company_profit_coef_q1: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['period_configs']['Insert']>
      }
      user_roles: {
        Row: { user_id: string; role: 'animator' | 'manager' }
        Insert: { user_id: string; role: 'animator' | 'manager' }
        Update: { role?: 'animator' | 'manager' }
      }
      storage_config: {
        Row: { id: string; backend: string; base_path: string; s3_bucket: string | null; s3_region: string | null; is_default: boolean | null }
        Insert: { id?: string; backend: string; base_path: string; s3_bucket?: string | null; s3_region?: string | null; is_default?: boolean | null }
        Update: Partial<Database['public']['Tables']['storage_config']['Insert']>
      }
      gallery_work_categories: {
        Row: { id: string; code: string | null; name: string; parent_id: string | null }
        Insert: { id?: string; code?: string | null; name: string; parent_id?: string | null }
        Update: { code?: string | null; name?: string; parent_id?: string | null }
      }
      gallery_points_config: {
        Row: { id: string; category_id: string; code: string | null; subtype: string; complexity: string; points_min: number; points_max: number; is_bonus: boolean }
        Insert: { id?: string; category_id: string; code?: string | null; subtype: string; complexity: string; points_min: number; points_max: number; is_bonus?: boolean }
        Update: Partial<Database['public']['Tables']['gallery_points_config']['Insert']>
      }
      publications: {
        Row: {
          id: string
          author_id: string
          project_id: string | null
          work_log_id: string | null
          title: string | null
          source: string
          external_id: string | null
          telegram_chat_id: string | null
          is_published: boolean
          published_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id: string
          project_id?: string | null
          work_log_id?: string | null
          title?: string | null
          source?: string
          external_id?: string | null
          telegram_chat_id?: string | null
          is_published?: boolean
          published_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['publications']['Insert']>
      }
      publication_versions: {
        Row: {
          id: string
          publication_id: string
          version_number: number
          storage_path: string
          storage_backend: string
          media_type: 'image' | 'gif' | 'video'
          points_config_id: string | null
          points_assigned: number | null
          estimated_hours: number | null
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          publication_id: string
          version_number: number
          storage_path: string
          storage_backend?: string
          media_type: 'image' | 'gif' | 'video'
          points_config_id?: string | null
          points_assigned?: number | null
          estimated_hours?: number | null
          created_at?: string
          created_by: string
        }
        Update: Partial<Database['public']['Tables']['publication_versions']['Insert']>
      }
      publication_version_history: {
        Row: { id: string; publication_id: string; version_number: number; changed_by: string; change_description: string | null; created_at: string }
        Insert: { id?: string; publication_id: string; version_number: number; changed_by: string; change_description?: string | null; created_at?: string }
        Update: Partial<Database['public']['Tables']['publication_version_history']['Insert']>
      }
      api_keys: {
        Row: { id: string; key_hash: string; name: string; scope: string; created_at: string }
        Insert: { id?: string; key_hash: string; name: string; scope: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['api_keys']['Insert']>
      }
      tags: {
        Row: { id: string; name: string }
        Insert: { id?: string; name: string }
        Update: { name?: string }
      }
      media_tags: {
        Row: { id: string; media_id: string; tag_id: string }
        Insert: { id?: string; media_id: string; tag_id: string }
        Update: { media_id?: string; tag_id?: string }
      }
      video_comments: {
        Row: { id: string; media_id: string; timestamp_sec: number; text: string; author_id: string; created_at: string }
        Insert: { id?: string; media_id: string; timestamp_sec: number; text: string; author_id: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['video_comments']['Insert']>
      }
      user_profiles: {
        Row: { user_id: string; display_name: string | null; nickname: string | null; updated_at: string }
        Insert: { user_id: string; display_name?: string | null; nickname?: string | null; updated_at?: string }
        Update: { display_name?: string | null; nickname?: string | null; updated_at?: string }
      }
      user_salaries: {
        Row: { user_id: string; monthly_salary: number; updated_at: string }
        Insert: { user_id: string; monthly_salary: number; updated_at?: string }
        Update: { monthly_salary?: number; updated_at?: string }
      }
      telegram_link_tokens: {
        Row: { token: string; user_id: string; created_at: string; expires_at: string }
        Insert: { token: string; user_id: string; created_at?: string; expires_at?: string }
        Update: { expires_at?: string }
      }
      telegram_links: {
        Row: { telegram_id: number; user_id: string; linked_at: string }
        Insert: { telegram_id: number; user_id: string; linked_at?: string }
        Update: { telegram_id?: number; linked_at?: string }
      }
    }
    Views: {
      publication_latest: {
        Row: {
          id: string
          author_id: string
          project_id: string | null
          work_log_id: string | null
          title: string | null
          source: string
          external_id: string | null
          telegram_chat_id: string | null
          is_published: boolean
          published_url: string | null
          created_at: string
          updated_at: string
          version_id: string
          version_number: number
          storage_path: string
          storage_backend: string
          media_type: 'image' | 'gif' | 'video'
          points_config_id: string | null
          points_assigned: number | null
          estimated_hours: number | null
          version_created_at: string
          created_by: string
        }
      }
      detailed_scores: {
        Row: {
          id: string
          user_id: string
          project_id: string
          work_type_id: string
          quantity: number
          date: string
          image_url: string | null
          created_at: string
          project_name: string
          drone_count: number
          is_rework: boolean
          project_type_name: string
          k_type: number
          work_type_name: string
          base: number
          k_drones: number
          k_rework: number
          score: number
        }
      }
      user_scores_summary: {
        Row: {
          user_id: string
          quarter_start: string
          total_points: number
          work_count: number
        }
      }
    }
  }
}

export type Publication = Database['public']['Tables']['publications']['Row']
export type PublicationVersion = Database['public']['Tables']['publication_versions']['Row']

export interface PublicationLatest {
  id: string
  author_id: string
  project_id: string | null
  work_log_id: string | null
  title: string | null
  source: string
  external_id: string | null
  telegram_chat_id: string | null
  is_published: boolean
  published_url: string | null
  created_at: string
  updated_at: string
  version_id: string
  version_number: number
  storage_path: string
  storage_backend: string
  media_type: 'image' | 'gif' | 'video'
  points_config_id: string | null
  points_assigned: number | null
  estimated_hours: number | null
  version_created_at: string
  created_by: string
}

/** @deprecated Use PublicationLatest for gallery display */
export type MediaItem = PublicationLatest
