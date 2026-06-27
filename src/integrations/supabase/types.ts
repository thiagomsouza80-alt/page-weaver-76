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
      achievements: {
        Row: {
          code: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          rarity: string
          updated_at: string
          xp_bonus: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          rarity?: string
          updated_at?: string
          xp_bonus?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rarity?: string
          updated_at?: string
          xp_bonus?: number
        }
        Relationships: []
      }
      app_secrets: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
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
          {
            foreignKeyName: "artist_pending_updates_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists_public"
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
      classes: {
        Row: {
          code: string
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          last_preview: string | null
          product_id: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          last_preview?: string | null
          product_id?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          last_preview?: string | null
          product_id?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "social_products"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
          {
            foreignKeyName: "entrepreneur_pending_updates_entrepreneur_id_fkey"
            columns: ["entrepreneur_id"]
            isOneToOne: false
            referencedRelation: "entrepreneurs_public"
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
      event_courtesy_codes: {
        Row: {
          assigned_user_id: string | null
          category_id: string
          code: string
          created_at: string
          created_by: string | null
          event_id: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          notes: string | null
          used_count: number
        }
        Insert: {
          assigned_user_id?: string | null
          category_id: string
          code: string
          created_at?: string
          created_by?: string | null
          event_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          notes?: string | null
          used_count?: number
        }
        Update: {
          assigned_user_id?: string | null
          category_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          event_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          notes?: string | null
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_courtesy_codes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_courtesy_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ticket_batches: {
        Row: {
          created_at: string
          ends_at: string | null
          event_id: string
          id: string
          is_active: boolean
          name: string
          price_cents: number
          quantity: number | null
          sort_order: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          name: string
          price_cents?: number
          quantity?: number | null
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          quantity?: number | null
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ticket_categories: {
        Row: {
          batch_id: string | null
          created_at: string
          description: string | null
          donation_description: string | null
          event_id: string
          id: string
          is_active: boolean
          is_free: boolean
          kind: Database["public"]["Enums"]["ticket_category_kind"]
          name: string
          per_user_limit: number
          price_cents: number
          quantity: number | null
          requires_document: boolean
          requires_donation: boolean
          sale_ends_at: string | null
          sale_starts_at: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          description?: string | null
          donation_description?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          is_free?: boolean
          kind: Database["public"]["Enums"]["ticket_category_kind"]
          name: string
          per_user_limit?: number
          price_cents?: number
          quantity?: number | null
          requires_document?: boolean
          requires_donation?: boolean
          sale_ends_at?: string | null
          sale_starts_at?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          description?: string | null
          donation_description?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          is_free?: boolean
          kind?: Database["public"]["Enums"]["ticket_category_kind"]
          name?: string
          per_user_limit?: number
          price_cents?: number
          quantity?: number | null
          requires_document?: boolean
          requires_donation?: boolean
          sale_ends_at?: string | null
          sale_starts_at?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_categories_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ticket_categories_event_id_fkey"
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
          use_batches: boolean
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
          use_batches?: boolean
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
          use_batches?: boolean
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
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_verifications: {
        Row: {
          created_at: string
          document_number: string | null
          document_url: string
          full_name: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_number?: string | null
          document_url: string
          full_name: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_number?: string | null
          document_url?: string
          full_name?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string
          status?: string
          updated_at?: string
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
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          events_cancelled: boolean
          events_changes: boolean
          events_new: boolean
          financial_refunds: boolean
          financial_withdrawals: boolean
          marketplace_messages: boolean
          news_new: boolean
          push_enabled: boolean
          retention_reminders: boolean
          social_comments: boolean
          social_followers: boolean
          social_likes: boolean
          social_posts: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          events_cancelled?: boolean
          events_changes?: boolean
          events_new?: boolean
          financial_refunds?: boolean
          financial_withdrawals?: boolean
          marketplace_messages?: boolean
          news_new?: boolean
          push_enabled?: boolean
          retention_reminders?: boolean
          social_comments?: boolean
          social_followers?: boolean
          social_likes?: boolean
          social_posts?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          events_cancelled?: boolean
          events_changes?: boolean
          events_new?: boolean
          financial_refunds?: boolean
          financial_withdrawals?: boolean
          marketplace_messages?: boolean
          news_new?: boolean
          push_enabled?: boolean
          retention_reminders?: boolean
          social_comments?: boolean
          social_followers?: boolean
          social_likes?: boolean
          social_posts?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          metadata: Json | null
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
          metadata?: Json | null
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
          metadata?: Json | null
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ranks: {
        Row: {
          code: string
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          min_xp: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          min_xp?: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          min_xp?: number
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          admin_user_id: string | null
          amount_paid_cents: number
          amount_refundable_cents: number
          created_at: string
          decided_at: string | null
          decision_reason: string | null
          event_id: string
          id: string
          organizer_id: string | null
          paid_at: string | null
          payment_transaction_id: string | null
          platform_fee_cents: number
          reason: string
          receipt_url: string | null
          requested_at: string
          status: string
          ticket_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_user_id?: string | null
          amount_paid_cents?: number
          amount_refundable_cents?: number
          created_at?: string
          decided_at?: string | null
          decision_reason?: string | null
          event_id: string
          id?: string
          organizer_id?: string | null
          paid_at?: string | null
          payment_transaction_id?: string | null
          platform_fee_cents?: number
          reason: string
          receipt_url?: string | null
          requested_at?: string
          status?: string
          ticket_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_user_id?: string | null
          amount_paid_cents?: number
          amount_refundable_cents?: number
          created_at?: string
          decided_at?: string | null
          decision_reason?: string | null
          event_id?: string
          id?: string
          organizer_id?: string | null
          paid_at?: string | null
          payment_transaction_id?: string | null
          platform_fee_cents?: number
          reason?: string
          receipt_url?: string | null
          requested_at?: string
          status?: string
          ticket_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          batch_id: string | null
          batch_name: string | null
          category_id: string | null
          category_kind:
            | Database["public"]["Enums"]["ticket_category_kind"]
            | null
          category_name: string | null
          code: string
          courtesy_code_id: string | null
          created_at: string
          document_verified_at: string | null
          donation_verified_at: string | null
          event_id: string
          holder_email: string
          holder_name: string
          holder_phone: string
          id: string
          is_courtesy: boolean
          issued_at: string
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          platform_fee_cents: number
          price_cents: number
          qr_token: string
          status: string
          unit_price_cents: number | null
          updated_at: string
          used_at: string | null
          used_by: string | null
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          batch_name?: string | null
          category_id?: string | null
          category_kind?:
            | Database["public"]["Enums"]["ticket_category_kind"]
            | null
          category_name?: string | null
          code?: string
          courtesy_code_id?: string | null
          created_at?: string
          document_verified_at?: string | null
          donation_verified_at?: string | null
          event_id: string
          holder_email: string
          holder_name: string
          holder_phone: string
          id?: string
          is_courtesy?: boolean
          issued_at?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          platform_fee_cents?: number
          price_cents?: number
          qr_token?: string
          status?: string
          unit_price_cents?: number | null
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
          user_id: string
        }
        Update: {
          batch_id?: string | null
          batch_name?: string | null
          category_id?: string | null
          category_kind?:
            | Database["public"]["Enums"]["ticket_category_kind"]
            | null
          category_name?: string | null
          code?: string
          courtesy_code_id?: string | null
          created_at?: string
          document_verified_at?: string | null
          donation_verified_at?: string | null
          event_id?: string
          holder_email?: string
          holder_name?: string
          holder_phone?: string
          id?: string
          is_courtesy?: boolean
          issued_at?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          platform_fee_cents?: number
          price_cents?: number
          qr_token?: string
          status?: string
          unit_price_cents?: number | null
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_courtesy_code_id_fkey"
            columns: ["courtesy_code_id"]
            isOneToOne: false
            referencedRelation: "event_courtesy_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string
          display_name: string | null
          headline: string | null
          links: Json
          show_achievements: boolean
          show_birth_date: boolean
          show_email: boolean
          show_phone: boolean
          show_xp: boolean
          updated_at: string
          user_id: string
          username: string | null
          visibility: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          headline?: string | null
          links?: Json
          show_achievements?: boolean
          show_birth_date?: boolean
          show_email?: boolean
          show_phone?: boolean
          show_xp?: boolean
          updated_at?: string
          user_id: string
          username?: string | null
          visibility?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          headline?: string | null
          links?: Json
          show_achievements?: boolean
          show_birth_date?: boolean
          show_email?: boolean
          show_phone?: boolean
          show_xp?: boolean
          updated_at?: string
          user_id?: string
          username?: string | null
          visibility?: string
        }
        Relationships: []
      }
      user_progression: {
        Row: {
          class_id: string | null
          comments_received: number
          created_at: string
          events_attended: number
          events_organized: number
          fans_count: number
          followers_count: number
          following_count: number
          last_activity_at: string | null
          level: number
          likes_received: number
          products_sold: number
          rank_id: string | null
          shares_received: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          class_id?: string | null
          comments_received?: number
          created_at?: string
          events_attended?: number
          events_organized?: number
          fans_count?: number
          followers_count?: number
          following_count?: number
          last_activity_at?: string | null
          level?: number
          likes_received?: number
          products_sold?: number
          rank_id?: string | null
          shares_received?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          class_id?: string | null
          comments_received?: number
          created_at?: string
          events_attended?: number
          events_organized?: number
          fans_count?: number
          followers_count?: number
          following_count?: number
          last_activity_at?: string | null
          level?: number
          likes_received?: number
          products_sold?: number
          rank_id?: string | null
          shares_received?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_progression_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progression_rank_id_fkey"
            columns: ["rank_id"]
            isOneToOne: false
            referencedRelation: "ranks"
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
      validator_invitation_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          event_id: string | null
          id: string
          metadata: Json
          organizer_id: string | null
          target_email: string | null
          target_name: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          metadata?: Json
          organizer_id?: string | null
          target_email?: string | null
          target_name?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          metadata?: Json
          organizer_id?: string | null
          target_email?: string | null
          target_name?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "validator_invitation_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validator_invitation_logs_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
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
      xp_events: {
        Row: {
          action: string
          created_at: string
          flagged: boolean
          id: string
          metadata: Json
          reason: string | null
          target_id: string | null
          target_type: string | null
          user_id: string
          xp: number
        }
        Insert: {
          action: string
          created_at?: string
          flagged?: boolean
          id?: string
          metadata?: Json
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id: string
          xp?: number
        }
        Update: {
          action?: string
          created_at?: string
          flagged?: boolean
          id?: string
          metadata?: Json
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      xp_rules: {
        Row: {
          action: string
          cooldown_seconds: number
          created_at: string
          daily_cap: number | null
          id: string
          is_active: boolean
          label: string
          per_target_once: boolean
          updated_at: string
          xp: number
        }
        Insert: {
          action: string
          cooldown_seconds?: number
          created_at?: string
          daily_cap?: number | null
          id?: string
          is_active?: boolean
          label: string
          per_target_once?: boolean
          updated_at?: string
          xp?: number
        }
        Update: {
          action?: string
          cooldown_seconds?: number
          created_at?: string
          daily_cap?: number | null
          id?: string
          is_active?: boolean
          label?: string
          per_target_once?: boolean
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
    }
    Views: {
      artists_public: {
        Row: {
          approved: boolean | null
          bio: string | null
          city: string | null
          created_at: string | null
          fan_count: number | null
          followers_count: number | null
          id: string | null
          instagram: string | null
          membership_type: string | null
          name: string | null
          portfolio_images: string[] | null
          posts_count: number | null
          profile_image_url: string | null
          segment: Database["public"]["Enums"]["artist_segment"] | null
          user_id: string | null
          youtube_url: string | null
        }
        Insert: {
          approved?: boolean | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          fan_count?: number | null
          followers_count?: number | null
          id?: string | null
          instagram?: string | null
          membership_type?: string | null
          name?: string | null
          portfolio_images?: string[] | null
          posts_count?: number | null
          profile_image_url?: string | null
          segment?: Database["public"]["Enums"]["artist_segment"] | null
          user_id?: string | null
          youtube_url?: string | null
        }
        Update: {
          approved?: boolean | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          fan_count?: number | null
          followers_count?: number | null
          id?: string | null
          instagram?: string | null
          membership_type?: string | null
          name?: string | null
          portfolio_images?: string[] | null
          posts_count?: number | null
          profile_image_url?: string | null
          segment?: Database["public"]["Enums"]["artist_segment"] | null
          user_id?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      entrepreneurs_public: {
        Row: {
          address: string | null
          badge: string | null
          created_at: string | null
          description: string | null
          followers_count: number | null
          full_description: string | null
          hero_image_url: string | null
          id: string | null
          image_url: string | null
          instagram: string | null
          name: string | null
          portfolio_images: string[] | null
          posts_count: number | null
          published: boolean | null
          slug: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          badge?: string | null
          created_at?: string | null
          description?: string | null
          followers_count?: number | null
          full_description?: string | null
          hero_image_url?: string | null
          id?: string | null
          image_url?: string | null
          instagram?: string | null
          name?: string | null
          portfolio_images?: string[] | null
          posts_count?: number | null
          published?: boolean | null
          slug?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          badge?: string | null
          created_at?: string | null
          description?: string | null
          followers_count?: number | null
          full_description?: string | null
          hero_image_url?: string | null
          id?: string | null
          image_url?: string | null
          instagram?: string | null
          name?: string | null
          portfolio_images?: string[] | null
          posts_count?: number | null
          published?: boolean | null
          slug?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_courtesy_ticket: {
        Args: {
          _category_id: string
          _holder_email: string
          _holder_name: string
          _holder_phone: string
          _target_user_id: string
        }
        Returns: string
      }
      award_xp: {
        Args: {
          _action: string
          _metadata?: Json
          _target_id?: string
          _target_type?: string
          _user: string
        }
        Returns: number
      }
      banner_increment_click: { Args: { _id: string }; Returns: undefined }
      banner_increment_view: { Args: { _id: string }; Returns: undefined }
      calc_level_for_xp: { Args: { _xp: number }; Returns: number }
      current_ticket_fee_cents: { Args: never; Returns: number }
      decrement_fan_count: { Args: { _artist_id: string }; Returns: number }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      event_attendees_count: { Args: { _event_id: string }; Returns: number }
      event_category_available: {
        Args: { _category_id: string }
        Returns: number
      }
      event_current_batch: { Args: { _event_id: string }; Returns: string }
      event_tickets_count: { Args: { _event_id: string }; Returns: number }
      generate_courtesy_codes: {
        Args: { _category_id: string; _count: number; _expires_at?: string }
        Returns: {
          assigned_user_id: string | null
          category_id: string
          code: string
          created_at: string
          created_by: string | null
          event_id: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          notes: string | null
          used_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "event_courtesy_codes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      generate_ticket_code: { Args: never; Returns: string }
      get_public_profile: {
        Args: { _username: string }
        Returns: {
          artist_id: string
          artist_name: string
          avatar_url: string
          bio: string
          city: string
          class_id: string
          cover_url: string
          display_name: string
          entrepreneur_id: string
          entrepreneur_slug: string
          followers_count: number
          following_count: number
          headline: string
          level: number
          links: Json
          rank_id: string
          show_achievements: boolean
          show_xp: boolean
          user_id: string
          username: string
          visibility: string
          xp: number
        }[]
      }
      get_vapid_public_key: { Args: never; Returns: string }
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
      is_messenger_verified: { Args: { _user: string }; Returns: boolean }
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
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      notif_pref_enabled: {
        Args: { _key: string; _user: string }
        Returns: boolean
      }
      organizer_financial_summary: {
        Args: { _organizer_id: string }
        Returns: {
          available_cents: number
          gross_revenue_cents: number
          net_revenue_cents: number
          pending_refund_cents: number
          pending_withdrawal_cents: number
          platform_fees_cents: number
          refunded_cents: number
          tickets_sold: number
          withdrawn_cents: number
        }[]
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recalc_user_rank: { Args: { _user: string }; Returns: undefined }
      redeem_courtesy_code: {
        Args: {
          _code: string
          _holder_email: string
          _holder_name: string
          _holder_phone: string
        }
        Returns: string
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
      search_users_for_validator_v2: {
        Args: { _limit?: number; _offset?: number; _q: string }
        Returns: {
          account_types: string[]
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
      ticket_category_kind:
        | "full"
        | "half"
        | "solidarity"
        | "pcd"
        | "elderly"
        | "courtesy"
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
      ticket_category_kind: [
        "full",
        "half",
        "solidarity",
        "pcd",
        "elderly",
        "courtesy",
      ],
    },
  },
} as const
