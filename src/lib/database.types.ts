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
      app_user: {
        Row: {
          id: string
          role: 'parent' | 'child'
          display_name: string
          created_at: string
        }
        Insert: {
          id?: string
          role: 'parent' | 'child'
          display_name: string
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'parent' | 'child'
          display_name?: string
          created_at?: string
        }
      }
      link_parent_child: {
        Row: {
          id: string
          parent_id: string
          child_id: string
        }
        Insert: {
          id?: string
          parent_id: string
          child_id: string
        }
        Update: {
          id?: string
          parent_id?: string
          child_id?: string
        }
      }
      child_settings: {
        Row: {
          child_id: string
          yen_per_point: number
          closing_day: number
          base_allowance_yen: number
        }
        Insert: {
          child_id: string
          yen_per_point: number
          closing_day: number
          base_allowance_yen?: number
        }
        Update: {
          child_id?: string
          yen_per_point?: number
          closing_day?: number
          base_allowance_yen?: number
        }
      }
      rule_snapshot: {
        Row: {
          id: string
          child_id: string
          month: string
          label: string
          points: number
          status: 'awaiting_approval' | 'active'
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          child_id: string
          month: string
          label: string
          points: number
          status?: 'awaiting_approval' | 'active'
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          month?: string
          label?: string
          points?: number
          status?: 'awaiting_approval' | 'active'
          created_by?: string
          created_at?: string
        }
      }
      rule_approval: {
        Row: {
          id: string
          snapshot_id: string
          approver_id: string
          role: 'parent' | 'child'
          decision: 'approved' | 'rejected'
          decided_at: string
        }
        Insert: {
          id?: string
          snapshot_id: string
          approver_id: string
          role: 'parent' | 'child'
          decision: 'approved' | 'rejected'
          decided_at?: string
        }
        Update: {
          id?: string
          snapshot_id?: string
          approver_id?: string
          role?: 'parent' | 'child'
          decision?: 'approved' | 'rejected'
          decided_at?: string
        }
      }
      point_entry: {
        Row: {
          id: string
          child_id: string
          snapshot_id: string | null
          occurs_on: string
          delta_points: number
          note: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          child_id: string
          snapshot_id?: string | null
          occurs_on: string
          delta_points: number
          note?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          snapshot_id?: string | null
          occurs_on?: string
          delta_points?: number
          note?: string | null
          created_by?: string
          created_at?: string
        }
      }
      monthly_summary: {
        Row: {
          child_id: string
          month: string
          total_points: number
          total_yen: number
          status: 'collecting' | 'finalized'
          finalized_by: string | null
          finalized_at: string | null
        }
        Insert: {
          child_id: string
          month: string
          total_points: number
          total_yen: number
          status?: 'collecting' | 'finalized'
          finalized_by?: string | null
          finalized_at?: string | null
        }
        Update: {
          child_id?: string
          month?: string
          total_points?: number
          total_yen?: number
          status?: 'collecting' | 'finalized'
          finalized_by?: string | null
          finalized_at?: string | null
        }
      }
    }
    Views: {
      [_: string]: {
        Row: {
          [key: string]: Json
        }
      }
    }
    Functions: {
      [_: string]: {
        Args: {
          [key: string]: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_: string]: never
    }
  }
}
