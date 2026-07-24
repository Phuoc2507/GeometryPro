export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      projects: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          plan_code: string
          plan_credits: number
          plan_expires_at: string | null
          plan_tier: string
          plan_type: string | null
          purchased_credits: number
          credits_reset_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          plan_code?: string
          plan_credits?: number
          plan_expires_at?: string | null
          plan_tier?: string
          plan_type?: string | null
          purchased_credits?: number
          credits_reset_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          plan_code?: string
          plan_credits?: number
          plan_expires_at?: string | null
          plan_tier?: string
          plan_type?: string | null
          purchased_credits?: number
          credits_reset_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: { amount: number; created_at: string | null; id: string; order_code: number; plan_code: string | null; status: string | null; updated_at: string | null; user_id: string }
        Insert: { amount: number; created_at?: string | null; id?: string; order_code: number; plan_code?: string | null; status?: string | null; updated_at?: string | null; user_id: string }
        Update: { amount?: number; created_at?: string | null; id?: string; order_code?: number; plan_code?: string | null; status?: string | null; updated_at?: string | null; user_id?: string }
        Relationships: [
          { foreignKeyName: "orders_plan_code_fkey"; columns: ["plan_code"]; isOneToOne: false; referencedRelation: "plans"; referencedColumns: ["code"] },
          { foreignKeyName: "orders_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["user_id"] }
        ]
      }
      plans: {
        Row: { active: boolean; code: string; credits_per_cycle: number; cycle_days: number; duration_days: number; name: string; price_vnd: number; tier: string }
        Insert: { active?: boolean; code: string; credits_per_cycle: number; cycle_days: number; duration_days: number; name: string; price_vnd: number; tier: string }
        Update: { active?: boolean; code?: string; credits_per_cycle?: number; cycle_days?: number; duration_days?: number; name?: string; price_vnd?: number; tier?: string }
        Relationships: []
      }
      pricing_config: {
        Row: { key: string; value: number }
        Insert: { key: string; value: number }
        Update: { key?: string; value?: number }
        Relationships: []
      }
      usage_counters: {
        Row: { feature: string; used: number; user_id: string; window_start: string }
        Insert: { feature: string; used?: number; user_id: string; window_start?: string }
        Update: { feature?: string; used?: number; user_id?: string; window_start?: string }
        Relationships: []
      }
      credit_ledger: {
        Row: { balance_after: number; created_at: string; delta: number; id: string; reason: string; ref: string | null; user_id: string }
        Insert: { balance_after: number; created_at?: string; delta: number; id?: string; reason: string; ref?: string | null; user_id: string }
        Update: { balance_after?: number; created_at?: string; delta?: number; id?: string; reason?: string; ref?: string | null; user_id?: string }
        Relationships: []
      }
      saved_geometries: {
        Row: {
          created_at: string
          geometry_data: Json
          id: string
          is_history: boolean
          is_public: boolean
          name: string
          project_id: string | null
          prompt: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          geometry_data: Json
          id?: string
          is_history?: boolean
          is_public?: boolean
          name: string
          project_id?: string | null
          prompt?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          geometry_data?: Json
          id?: string
          is_history?: boolean
          is_public?: boolean
          name?: string
          project_id?: string | null
          prompt?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_geometries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_quota: {
        Args: { p_feature: string; p_max: number; p_period_days: number; p_user_id: string }
        Returns: Json
      }
      effective_tier: {
        Args: { p: Database["public"]["Tables"]["profiles"]["Row"] }
        Returns: string
      }
      grant_credits: {
        Args: { p_amount: number; p_reason: string; p_ref: string; p_to_purchased?: boolean; p_user_id: string }
        Returns: Json
      }
      refund_credits: {
        Args: { p_amount: number; p_ref: string; p_user_id: string }
        Returns: Json
      }
      spend_credits: {
        Args: { p_cost: number; p_reason: string; p_ref?: string | null; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
