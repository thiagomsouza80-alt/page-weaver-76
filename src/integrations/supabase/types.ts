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
      event_validators: {
        Row: {
          added_by: string
          created_at: string
          ends_at: string | null
          event_id: string
          id: string
          last_access_at: string | null
          organizer_id: string
          permissions: Json
          starts_at: string
          status: string
          updated_at: string
          user_id: string
          validations_count: number
          validator_avatar_url: string | null
          validator_email: string | null
          validator_name: string
        }
        Insert: {
          added_by: string
          created_at?: string
          ends_at?: string | null
          event_id: string
          id?: string
          last_access_at?: string | null
          organizer_id: string
          permissions?: Json
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
          validations_count?: number
          validator_avatar_url?: string | null
          validator_email?: string | null
          validator_name: string
        }
        Update: {
          added_by?: string
          created_at?: string
          ends_at?: string | null
          event_id?: string
          id?: string
          last_access_at?: string | null
          organizer_id?: string
          permissions?: Json
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
          validations_count?: number
          validator_avatar_url?: string | null
          validator_email?: string | null
          validator_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_validators_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_validators_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          approval_status: string
          author_id: string | null
          content: string
          created_at: string
          description: string
          event_date: string
          id: string
          image_position: string
          image_url: string | null
          location: string
          organizer_id: string | null
          published: boolean
          rejection_reason: string | null
          slug: string
          ticket_price_cents: number
          ticket_type: string
          tickets_enabled: boolean
          tickets_total: number | null
          title: string
          updated_at: string
        }
        Insert: {
          approval_status?: string
          author_id?: string | null
          content: string
          created_at?: string
          description: string
          event_date: string
          id?: string
          image_position?: string
          image_url?: string | null
          location: string
          organizer_id?: string | null
          published?: boolean
          rejection_reason?: string | null
          slug: string
          ticket_price_cents?: number
          ticket_type?: string
          tickets_enabled?: boolean
          tickets_total?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          approval_status?: string
          author_id?: string | null
          content?: string
          created_at?: string
          description?: string
          event_date?: string
          id?: string
          image_position?: string
          image_url?: string | null
          location?: string
          organizer_id?: string | null
          published?: boolean
          rejection_reason?: string | null
          slug?: string
          ticket_price_cents?: number
          ticket_type?: string
          tickets_enabled?: boolean
          tickets_total?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
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
      financial_audit_logs: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      homepage_banners: {
        Row: {
          active: boolean
          button_text: string | null
          clicks: number
          created_at: string
          display_order: number
          end_date: string | null
          id: string
          image_url: string | null
          link_url: string | null
          start_date: string | null
          subtitle: string | null
          title: string | null
          updated_at: string
          video_url: string | null
          views: number
        }
        Insert: {
          active?: boolean
          button_text?: string | null
          clicks?: number
          created_at?: string
          display_order?: number
          end_date?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          start_date?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          video_url?: string | null
          views?: number
        }
        Update: {
          active?: boolean
          button_text?: string | null
          clicks?: number
          created_at?: string
          display_order?: number
          end_date?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          start_date?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          video_url?: string | null
          views?: number
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
          related_event_id: string | null
          slug: string
          summary: string
          tickets_enabled: boolean
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
          related_event_id?: string | null
          slug: string
          summary: string
          tickets_enabled?: boolean
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
          related_event_id?: string | null
          slug?: string
          summary?: string
          tickets_enabled?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      organizers: {
        Row: {
          approval_status: string
          approved_at: string | null
          bio: string | null
          created_at: string
          document: string | null
          email: string
          id: string
          instagram: string | null
          logo_url: string | null
          name: string
          organization_name: string
          phone: string
          rejection_reason: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          bio?: string | null
          created_at?: string
          document?: string | null
          email: string
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name: string
          organization_name: string
          phone: string
          rejection_reason?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          bio?: string | null
          created_at?: string
          document?: string | null
          email?: string
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name?: string
          organization_name?: string
          phone?: string
          rejection_reason?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      payment_gateway_config: {
        Row: {
          active: boolean
          client_id: string | null
          environment: string
          id: boolean
          provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          client_id?: string | null
          environment?: string
          id?: boolean
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          client_id?: string | null
          environment?: string
          id?: boolean
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_cents: number
          buyer_email: string
          buyer_name: string
          buyer_phone: string
          buyer_user_id: string
          created_at: string
          event_id: string
          fee_cents: number
          id: string
          organizer_id: string | null
          paid_at: string | null
          pix_copy_paste: string | null
          pix_expires_at: string | null
          pix_qrcode: string | null
          provider: string
          provider_transaction_id: string | null
          raw_payload: Json | null
          status: string
          ticket_id: string | null
          total_cents: number
          updated_at: string
        }
        Insert: {
          amount_cents: number
          buyer_email: string
          buyer_name: string
          buyer_phone: string
          buyer_user_id: string
          created_at?: string
          event_id: string
          fee_cents: number
          id?: string
          organizer_id?: string | null
          paid_at?: string | null
          pix_copy_paste?: string | null
          pix_expires_at?: string | null
          pix_qrcode?: string | null
          provider?: string
          provider_transaction_id?: string | null
          raw_payload?: Json | null
          status?: string
          ticket_id?: string | null
          total_cents: number
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          buyer_email?: string
          buyer_name?: string
          buyer_phone?: string
          buyer_user_id?: string
          created_at?: string
          event_id?: string
          fee_cents?: number
          id?: string
          organizer_id?: string | null
          paid_at?: string | null
          pix_copy_paste?: string | null
          pix_expires_at?: string | null
          pix_qrcode?: string | null
          provider?: string
          provider_transaction_id?: string | null
          raw_payload?: Json | null
          status?: string
          ticket_id?: string | null
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: boolean
          ticket_fee_cents: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: boolean
          ticket_fee_cents?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: boolean
          ticket_fee_cents?: number
          updated_at?: string
          updated_by?: string | null
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
      tickets: {
        Row: {
          batch_id: string | null
          code: string
          created_at: string
          event_id: string
          holder_email: string
          holder_name: string
          holder_phone: string
          id: string
          issued_at: string
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          platform_fee_cents: number
          price_cents: number
          qr_token: string
          status: string
          updated_at: string
          used_at: string | null
          used_by: string | null
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          code?: string
          created_at?: string
          event_id: string
          holder_email: string
          holder_name: string
          holder_phone: string
          id?: string
          issued_at?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          platform_fee_cents?: number
          price_cents?: number
          qr_token?: string
          status?: string
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
          user_id: string
        }
        Update: {
          batch_id?: string | null
          code?: string
          created_at?: string
          event_id?: string
          holder_email?: string
          holder_name?: string
          holder_phone?: string
          id?: string
          issued_at?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          platform_fee_cents?: number
          price_cents?: number
          qr_token?: string
          status?: string
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
      validations_log: {
        Row: {
          created_at: string
          event_id: string
          id: string
          ip_address: string | null
          participant_name: string | null
          result: string
          scanned_code: string | null
          ticket_id: string | null
          user_agent: string | null
          validator_name: string | null
          validator_user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          ip_address?: string | null
          participant_name?: string | null
          result: string
          scanned_code?: string | null
          ticket_id?: string | null
          user_agent?: string | null
          validator_name?: string | null
          validator_user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          ip_address?: string | null
          participant_name?: string | null
          result?: string
          scanned_code?: string | null
          ticket_id?: string | null
          user_agent?: string | null
          validator_name?: string | null
          validator_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validations_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validations_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount_cents: number
          approved_at: string | null
          approved_by: string | null
          cpf: string
          created_at: string
          full_name: string
          id: string
          organizer_id: string
          paid_at: string | null
          paid_by: string | null
          pix_key: string
          receipt_path: string | null
          receipt_url: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
          whatsapp: string
        }
        Insert: {
          admin_notes?: string | null
          amount_cents: number
          approved_at?: string | null
          approved_by?: string | null
          cpf: string
          created_at?: string
          full_name: string
          id?: string
          organizer_id: string
          paid_at?: string | null
          paid_by?: string | null
          pix_key: string
          receipt_path?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
          whatsapp: string
        }
        Update: {
          admin_notes?: string | null
          amount_cents?: number
          approved_at?: string | null
          approved_by?: string | null
          cpf?: string
          created_at?: string
          full_name?: string
          id?: string
          organizer_id?: string
          paid_at?: string | null
          paid_by?: string | null
          pix_key?: string
          receipt_path?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      banner_increment_click: { Args: { _id: string }; Returns: undefined }
      banner_increment_view: { Args: { _id: string }; Returns: undefined }
      current_ticket_fee_cents: { Args: never; Returns: number }
      decrement_fan_count: { Args: { _artist_id: string }; Returns: number }
      event_attendees_count: { Args: { _event_id: string }; Returns: number }
      event_tickets_count: { Args: { _event_id: string }; Returns: number }
      generate_ticket_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_fan_count: { Args: { _artist_id: string }; Returns: number }
      is_event_validator: {
        Args: { _event: string; _user: string }
        Returns: boolean
      }
      is_user_blocked: { Args: { _user_id: string }; Returns: boolean }
      log_financial_event: {
        Args: {
          _action: string
          _entity_id: string
          _entity_type: string
          _metadata?: Json
        }
        Returns: string
      }
      log_validation: {
        Args: {
          _event_id: string
          _participant_name: string
          _result: string
          _scanned_code: string
          _ticket_id: string
          _user_agent?: string
        }
        Returns: string
      }
      organizer_financial_summary: {
        Args: { _organizer_id: string }
        Returns: {
          available_cents: number
          gross_revenue_cents: number
          net_revenue_cents: number
          pending_withdrawal_cents: number
          platform_fees_cents: number
          tickets_sold: number
          withdrawn_cents: number
        }[]
      }
      search_users_for_validator: {
        Args: { _q: string }
        Returns: {
          account_type: string
          avatar_url: string
          city: string
          email: string
          name: string
          phone: string
          user_id: string
        }[]
      }
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
      validator_event_summary: {
        Args: { _event_id: string }
        Returns: {
          tickets_remaining: number
          tickets_total: number
          tickets_validated: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "organizer"
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
      app_role: ["admin", "user", "organizer"],
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
