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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      artist_pending_updates: {
        Row: {
          admin_notes: string | null
          artist_id: string
          changes: Json
          created_at: string
          id: string
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          artist_id: string
          changes: Json
          created_at?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          artist_id?: string
          changes?: Json
          created_at?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_pending_updates_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          approved: boolean
          bio: string | null
          birth_date: string | null
          city: string | null
          created_at: string
          email: string
          fan_count: number
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          instagram: string | null
          membership_approved_at: string | null
          membership_expires_at: string | null
          membership_type: string
          name: string
          phone: string | null
          portfolio_images: string[] | null
          profile_image_url: string | null
          segment: Database["public"]["Enums"]["artist_segment"]
          updated_at: string
          user_id: string | null
          youtube_url: string | null
        }
        Insert: {
          approved?: boolean
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          email: string
          fan_count?: number
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          instagram?: string | null
          membership_approved_at?: string | null
          membership_expires_at?: string | null
          membership_type?: string
          name: string
          phone?: string | null
          portfolio_images?: string[] | null
          profile_image_url?: string | null
          segment: Database["public"]["Enums"]["artist_segment"]
          updated_at?: string
          user_id?: string | null
          youtube_url?: string | null
        }
        Update: {
          approved?: boolean
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          email?: string
          fan_count?: number
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          instagram?: string | null
          membership_approved_at?: string | null
          membership_expires_at?: string | null
          membership_type?: string
          name?: string
          phone?: string | null
          portfolio_images?: string[] | null
          profile_image_url?: string | null
          segment?: Database["public"]["Enums"]["artist_segment"]
          updated_at?: string
          user_id?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      entrepreneur_pending_updates: {
        Row: {
          admin_notes: string | null
          changes: Json
          created_at: string
          entrepreneur_id: string
          id: string
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          changes: Json
          created_at?: string
          entrepreneur_id: string
          id?: string
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          changes?: Json
          created_at?: string
          entrepreneur_id?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrepreneur_pending_updates_entrepreneur_id_fkey"
            columns: ["entrepreneur_id"]
            isOneToOne: false
            referencedRelation: "entrepreneurs"
            referencedColumns: ["id"]
          },
        ]
      }
      entrepreneurs: {
        Row: {
          address: string | null
          badge: string
          birth_date: string | null
          created_at: string
          description: string
          email: string | null
          full_description: string | null
          guardian_name: string | null
          guardian_phone: string | null
          hero_image_url: string | null
          id: string
          image_url: string | null
          instagram: string | null
          name: string
          phone: string | null
          portfolio_images: string[] | null
          published: boolean
          slug: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          badge: string
          birth_date?: string | null
          created_at?: string
          description: string
          email?: string | null
          full_description?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          hero_image_url?: string | null
          id?: string
          image_url?: string | null
          instagram?: string | null
          name: string
          phone?: string | null
          portfolio_images?: string[] | null
          published?: boolean
          slug: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          badge?: string
          birth_date?: string | null
          created_at?: string
          description?: string
          email?: string | null
          full_description?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          hero_image_url?: string | null
          id?: string
          image_url?: string | null
          instagram?: string | null
          name?: string
          phone?: string | null
          portfolio_images?: string[] | null
          published?: boolean
          slug?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      event_attendees: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          description: string
          event_date: string
          id: string
          image_position: string
          image_url: string | null
          location: string
          published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          description: string
          event_date: string
          id?: string
          image_position?: string
          image_url?: string | null
          location: string
          published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          description?: string
          event_date?: string
          id?: string
          image_position?: string
          image_url?: string | null
          location?: string
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      fan_clicks: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      news: {
        Row: {
          author_id: string | null
          category: string
          content: string
          created_at: string
          gallery_images: string[] | null
          id: string
          image_position: string
          image_url: string | null
          published: boolean
          slug: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string
          content: string
          created_at?: string
          gallery_images?: string[] | null
          id?: string
          image_position?: string
          image_url?: string | null
          published?: boolean
          slug: string
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string
          gallery_images?: string[] | null
          id?: string
          image_position?: string
          image_url?: string | null
          published?: boolean
          slug?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          id: string
          logo_url: string
          name: string
          website_url: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          logo_url: string
          name: string
          website_url?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          logo_url?: string
          name?: string
          website_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      decrement_fan_count: { Args: { _artist_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_fan_count: { Args: { _artist_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user"
      artist_segment:
        | "cosplayer"
        | "cosmaker"
        | "kpop"
        | "ilustrador"
        | "quadrinista"
        | "colecionador"
        | "desenvolvedor_jogos"
        | "fan_cultura_pop"
        | "youtuber"
        | "influenciador_digital"
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
      app_role: ["admin", "user"],
      artist_segment: [
        "cosplayer",
        "cosmaker",
        "kpop",
        "ilustrador",
        "quadrinista",
        "colecionador",
        "desenvolvedor_jogos",
        "fan_cultura_pop",
        "youtuber",
        "influenciador_digital",
      ],
    },
  },
} as const
