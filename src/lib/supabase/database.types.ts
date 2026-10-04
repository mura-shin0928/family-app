export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      children: {
        Row: {
          birth_date: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          display_name: string
          expected_birth_date: string | null
          family_id: string
          id: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_name: string
          expected_birth_date?: string | null
          family_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_name?: string
          expected_birth_date?: string | null
          family_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          id: string
          municipality_code: string | null
          municipality_name: string | null
          name: string
          recipe_analysis_daily_limit: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          municipality_code?: string | null
          municipality_name?: string | null
          name: string
          recipe_analysis_daily_limit?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          municipality_code?: string | null
          municipality_name?: string | null
          name?: string
          recipe_analysis_daily_limit?: number | null
        }
        Relationships: []
      }
      family_members: {
        Row: {
          display_name: string
          family_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          display_name: string
          family_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          display_name?: string
          family_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          display_name: string
          expires_at: string
          family_id: string
          id: string
          invited_by: string | null
          invited_email: string
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          display_name: string
          expires_at: string
          family_id: string
          id?: string
          invited_by?: string | null
          invited_email: string
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          display_name?: string
          expires_at?: string
          family_id?: string
          id?: string
          invited_by?: string | null
          invited_email?: string
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      life_event_items: {
        Row: {
          catalog_key: string | null
          child_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          done_on: string | null
          family_id: string
          id: string
          note: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          catalog_key?: string | null
          child_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          done_on?: string | null
          family_id: string
          id?: string
          note?: string | null
          status: string
          title: string
          updated_at?: string
        }
        Update: {
          catalog_key?: string | null
          child_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          done_on?: string | null
          family_id?: string
          id?: string
          note?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "life_event_items_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "life_event_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "life_event_items_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_locations: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          family_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          family_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          family_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_locations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_locations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_analysis_usage: {
        Row: {
          count: number
          day: string
          family_id: string
        }
        Insert: {
          count: number
          day: string
          family_id: string
        }
        Update: {
          count?: number
          day?: string
          family_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_analysis_usage_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          family_id: string
          id: string
          name: string
          quantity: string | null
          recipe_id: string
          sort_order: number
          task_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          name: string
          quantity?: string | null
          recipe_id: string
          sort_order: number
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          name?: string
          quantity?: string | null
          recipe_id?: string
          sort_order?: number
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          family_id: string
          id: string
          note: string | null
          source_text: string | null
          source_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          family_id: string
          id?: string
          note?: string | null
          source_text?: string | null
          source_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          family_id?: string
          id?: string
          note?: string | null
          source_text?: string | null
          source_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_on: string | null
          family_id: string
          id: string
          is_purchase: boolean
          life_event_item_id: string | null
          note: string | null
          purchase_location_id: string | null
          sort_order: number
          status: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_on?: string | null
          family_id: string
          id?: string
          is_purchase?: boolean
          life_event_item_id?: string | null
          note?: string | null
          purchase_location_id?: string | null
          sort_order: number
          status?: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_on?: string | null
          family_id?: string
          id?: string
          is_purchase?: boolean
          life_event_item_id?: string | null
          note?: string | null
          purchase_location_id?: string | null
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_life_event_item_id_fkey"
            columns: ["life_event_item_id"]
            isOneToOne: false
            referencedRelation: "life_event_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_purchase_location_id_fkey"
            columns: ["purchase_location_id"]
            isOneToOne: false
            referencedRelation: "purchase_locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { p_token_hash: string }; Returns: string }
      add_ingredients_to_purchases: {
        Args: { p_ingredient_ids: string[]; p_recipe_id: string }
        Returns: string[]
      }
      add_life_event_item_to_task: {
        Args: {
          p_catalog_key: string
          p_child_id: string
          p_due_on?: string
          p_item_note?: string
          p_item_title: string
          p_task_note?: string
          p_task_title: string
          p_url?: string
        }
        Returns: string
      }
      check_invite_email: {
        Args: { p_email: string; p_token_hash: string }
        Returns: {
          family_name: string
          status: string
        }[]
      }
      consume_recipe_analysis_quota: { Args: never; Returns: boolean }
      create_recipe: {
        Args: {
          p_id: string
          p_ingredients: Json
          p_note: string
          p_source_text: string
          p_source_url: string
          p_title: string
        }
        Returns: undefined
      }
      create_task: {
        Args: {
          p_due_on?: string
          p_id: string
          p_is_purchase: boolean
          p_note?: string
          p_purchase_location_id?: string
          p_record_child_id?: string
          p_title: string
          p_url?: string
        }
        Returns: undefined
      }
      invitation_preview: {
        Args: { p_token_hash: string }
        Returns: {
          family_name: string
          status: string
        }[]
      }
      is_app_admin: { Args: never; Returns: boolean }
      is_family_member: { Args: { target_family_id: string }; Returns: boolean }
      next_task_sort_order: { Args: { p_family_id: string }; Returns: number }
      record_life_event_item_done: {
        Args: {
          p_catalog_key: string
          p_child_id: string
          p_done_on: string
          p_note?: string
          p_title: string
        }
        Returns: undefined
      }
      set_family_recipe_analysis_daily_limit: {
        Args: { p_daily_limit: number; p_family_id: string }
        Returns: undefined
      }
      undo_add_ingredients_to_purchases: {
        Args: { p_task_ids: string[] }
        Returns: undefined
      }
      update_recipe: {
        Args: {
          p_ingredients: Json
          p_note: string
          p_recipe_id: string
          p_source_text: string
          p_source_url: string
          p_title: string
        }
        Returns: undefined
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

