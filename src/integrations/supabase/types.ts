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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          cake_config: Json | null
          client_ip: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          id: string
          items: Json | null
          notes: string | null
          pickup_at: string
          status: Database["public"]["Enums"]["booking_status"]
          type: Database["public"]["Enums"]["booking_type"]
        }
        Insert: {
          cake_config?: Json | null
          client_ip?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          items?: Json | null
          notes?: string | null
          pickup_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          type: Database["public"]["Enums"]["booking_type"]
        }
        Update: {
          cake_config?: Json | null
          client_ip?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          items?: Json | null
          notes?: string | null
          pickup_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          type?: Database["public"]["Enums"]["booking_type"]
        }
        Relationships: []
      }
      cake_addons: {
        Row: {
          active: boolean
          description: string | null
          id: string
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          active?: boolean
          description?: string | null
          id?: string
          name: string
          price?: number
          sort_order?: number
        }
        Update: {
          active?: boolean
          description?: string | null
          id?: string
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: []
      }
      cake_bases: {
        Row: {
          active: boolean
          description: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          description?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      cake_fillings: {
        Row: {
          active: boolean
          description: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          description?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      cake_sizes: {
        Row: {
          active: boolean
          id: string
          label: string
          price: number | null
          servings: number
          sort_order: number
        }
        Insert: {
          active?: boolean
          id?: string
          label: string
          price?: number | null
          servings: number
          sort_order?: number
        }
        Update: {
          active?: boolean
          id?: string
          label?: string
          price?: number | null
          servings?: number
          sort_order?: number
        }
        Relationships: []
      }
      ordering_status: {
        Row: {
          id: boolean
          panettone_enabled: boolean
          standard_enabled: boolean
          torta_personalizzata_enabled: boolean
          updated_at: string
        }
        Insert: {
          id?: boolean
          panettone_enabled?: boolean
          standard_enabled?: boolean
          torta_personalizzata_enabled?: boolean
          updated_at?: string
        }
        Update: {
          id?: boolean
          panettone_enabled?: boolean
          standard_enabled?: boolean
          torta_personalizzata_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      panettoni: {
        Row: {
          active: boolean
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number | null
          price_hint: string | null
          quantity: number | null
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number | null
          price_hint?: string | null
          quantity?: number | null
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number | null
          price_hint?: string | null
          quantity?: number | null
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      specialties: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number | null
          price_hint: string | null
          quantity: number | null
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number | null
          price_hint?: string | null
          quantity?: number | null
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number | null
          price_hint?: string | null
          quantity?: number | null
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      booking_status: "da_preparare" | "pronto" | "ritirato" | "annullato"
      booking_type: "torta_personalizzata" | "standard" | "panettone"
      soaking_type: "alcolica" | "analcolica" | "latte"
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
    Enums: {
      app_role: ["admin", "staff"],
      booking_status: ["da_preparare", "pronto", "ritirato", "annullato"],
      booking_type: ["torta_personalizzata", "standard", "panettone"],
      soaking_type: ["alcolica", "analcolica", "latte"],
    },
  },
} as const
