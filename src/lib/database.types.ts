export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      household: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code?: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          invite_code?: string;
          created_by?: string;
          created_at?: string;
        };
      };
      app_user: {
        Row: {
          id: string;
          household_id: string;
          role: 'parent' | 'child';
          display_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          role: 'parent' | 'child';
          display_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          role?: 'parent' | 'child';
          display_name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      link_parent_child: {
        Row: {
          id: string;
          household_id: string;
          parent_id: string;
          child_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          parent_id: string;
          child_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          parent_id?: string;
          child_id?: string;
          created_at?: string;
        };
      };
      child_settings: {
        Row: {
          child_id: string;
          yen_per_point: number;
          updated_at: string;
        };
        Insert: {
          child_id: string;
          yen_per_point?: number;
          updated_at?: string;
        };
        Update: {
          child_id?: string;
          yen_per_point?: number;
          updated_at?: string;
        };
      };
      rule_snapshot: {
        Row: {
          id: string;
          household_id: string;
          child_id: string;
          target_month: string;
          label: string;
          point_value: number;
          status: 'draft' | 'pending_child_approval' | 'pending_parent_approval' | 'active' | 'rejected';
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          child_id: string;
          target_month: string;
          label: string;
          point_value: number;
          status?: 'draft' | 'pending_child_approval' | 'pending_parent_approval' | 'active' | 'rejected';
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          child_id?: string;
          target_month?: string;
          label?: string;
          point_value?: number;
          status?: 'draft' | 'pending_child_approval' | 'pending_parent_approval' | 'active' | 'rejected';
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      rule_approval: {
        Row: {
          id: string;
          rule_snapshot_id: string;
          approver_id: string;
          approver_role: 'parent' | 'child';
          decision: 'approved' | 'rejected';
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          rule_snapshot_id: string;
          approver_id: string;
          approver_role: 'parent' | 'child';
          decision: 'approved' | 'rejected';
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          rule_snapshot_id?: string;
          approver_id?: string;
          approver_role?: 'parent' | 'child';
          decision?: 'approved' | 'rejected';
          comment?: string | null;
          created_at?: string;
        };
      };
      point_log: {
        Row: {
          id: string;
          household_id: string;
          child_id: string;
          rule_snapshot_id: string | null;
          target_month: string;
          occurred_on: string;
          point_delta: number;
          note: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          child_id: string;
          rule_snapshot_id?: string | null;
          target_month: string;
          occurred_on: string;
          point_delta: number;
          note?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          child_id?: string;
          rule_snapshot_id?: string | null;
          target_month?: string;
          occurred_on?: string;
          point_delta?: number;
          note?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      month_summary: {
        Row: {
          id: string;
          household_id: string;
          child_id: string;
          target_month: string;
          total_points: number;
          yen_per_point: number;
          total_yen: number;
          status: 'open' | 'closed';
          closed_by: string | null;
          closed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          child_id: string;
          target_month: string;
          total_points?: number;
          yen_per_point?: number;
          total_yen?: number;
          status?: 'open' | 'closed';
          closed_by?: string | null;
          closed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          child_id?: string;
          target_month?: string;
          total_points?: number;
          yen_per_point?: number;
          total_yen?: number;
          status?: 'open' | 'closed';
          closed_by?: string | null;
          closed_at?: string | null;
          updated_at?: string;
        };
      };
      operation_log: {
        Row: {
          id: string;
          household_id: string;
          actor_id: string;
          action_type: string;
          target_table: string;
          target_id: string | null;
          summary: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          actor_id: string;
          action_type: string;
          target_table: string;
          target_id?: string | null;
          summary: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          actor_id?: string;
          action_type?: string;
          target_table?: string;
          target_id?: string | null;
          summary?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
    Views: {
      [_: string]: {
        Row: Record<string, Json>;
      };
    };
    Functions: {
      [_: string]: {
        Args: Record<string, Json>;
        Returns: Json;
      };
    };
    Enums: {
      [_: string]: never;
    };
  };
}
