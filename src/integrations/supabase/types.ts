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
          followers_count: number
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
          posts_count: number
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
          followers_count?: number
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
          posts_count?: number
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
          followers_count?: number
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
          posts_count?: number
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
          followers_count: number
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
          posts_count: number
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
          followers_count?: number
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
          posts_count?: number
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
          followers_count?: number
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
          posts_count?: number
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
      social_comments: {
        Row: {
          author_avatar_url: string | null
          author_name: string
          content: string
          created_at: string
          hidden: boolean
          id: string
          parent_comment_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          author_avatar_url?: string | null
          author_name: string
          content: string
          created_at?: string
          hidden?: boolean
          id?: string
          parent_comment_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string
          content?: string
          created_at?: string
          hidden?: boolean
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "social_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_follows: {
        Row: {
          created_at: string
          follower_user_id: string
          id: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          follower_user_id: string
          id?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          follower_user_id?: string
          id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      social_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_notifications: {
        Row: {
          actor_avatar_url: string | null
          actor_name: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          post_id: string | null
          preview: string | null
          read: boolean
          target_id: string | null
          target_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_avatar_url?: string | null
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          preview?: string | null
          read?: boolean
          target_id?: string | null
          target_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_avatar_url?: string | null
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          preview?: string | null
          read?: boolean
          target_id?: string | null
          target_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          author_avatar_url: string | null
          author_name: string
          author_type: string
          comments_count: number
          content: string | null
          created_at: string
          deleted: boolean
          hidden: boolean
          id: string
          likes_count: number
          media_type: string
          media_urls: string[] | null
          shares_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          author_avatar_url?: string | null
          author_name: string
          author_type?: string
          comments_count?: number
          content?: string | null
          created_at?: string
          deleted?: boolean
          hidden?: boolean
          id?: string
          likes_count?: number
          media_type?: string
          media_urls?: string[] | null
          shares_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string
          author_type?: string
          comments_count?: number
          content?: string | null
          created_at?: string
          deleted?: boolean
          hidden?: boolean
          id?: string
          likes_count?: number
          media_type?: string
          media_urls?: string[] | null
          shares_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_products: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          entrepreneur_id: string | null
          external_url: string | null
          hidden: boolean
          id: string
          images: string[] | null
          name: string
          price: number | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          entrepreneur_id?: string | null
          external_url?: string | null
          hidden?: boolean
          id?: string
          images?: string[] | null
          name: string
          price?: number | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          entrepreneur_id?: string | null
          external_url?: string | null
          hidden?: boolean
          id?: string
          images?: string[] | null
          name?: string
          price?: number | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      social_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      social_saved_posts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_shares: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_user_status: {
        Row: {
          created_at: string
          reason: string | null
          status: string
          suspended_until: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          reason?: string | null
          status?: string
          suspended_until?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          reason?: string | null
          status?: string
          suspended_until?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
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
      is_user_blocked: { Args: { _user_id: string }; Returns: boolean }
      social_decrement_followers: {
        Args: { _target_id: string; _target_type: string }
        Returns: number
      }
      social_decrement_likes: { Args: { _post_id: string }; Returns: number }
      social_increment_comments: { Args: { _post_id: string }; Returns: number }
      social_increment_followers: {
        Args: { _target_id: string; _target_type: string }
        Returns: number
      }
      social_increment_likes: { Args: { _post_id: string }; Returns: number }
      social_increment_shares: { Args: { _post_id: string }; Returns: number }
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
