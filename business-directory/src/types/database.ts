export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: number
          ip_hash: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: never
          ip_hash?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: never
          ip_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_categories: {
        Row: {
          business_id: string
          category_id: string
          is_primary: boolean
        }
        Insert: {
          business_id: string
          category_id: string
          is_primary?: boolean
        }
        Update: {
          business_id?: string
          category_id?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "business_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      business_events: {
        Row: {
          business_id: string
          event_type: Database["public"]["Enums"]["business_event_type"]
          id: number
          locale: string | null
          occurred_at: string
          referrer: string | null
          session_hash: string | null
        }
        Insert: {
          business_id: string
          event_type: Database["public"]["Enums"]["business_event_type"]
          id?: never
          locale?: string | null
          occurred_at?: string
          referrer?: string | null
          session_hash?: string | null
        }
        Update: {
          business_id?: string
          event_type?: Database["public"]["Enums"]["business_event_type"]
          id?: never
          locale?: string | null
          occurred_at?: string
          referrer?: string | null
          session_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_id: string
          closes: string
          day_of_week: number
          id: string
          opens: string
        }
        Insert: {
          business_id: string
          closes: string
          day_of_week: number
          id?: string
          opens: string
        }
        Update: {
          business_id?: string
          closes?: string
          day_of_week?: number
          id?: string
          opens?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_photos: {
        Row: {
          alt: string | null
          alt_i18n: Json
          business_id: string
          created_at: string
          id: string
          sort_order: number
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          alt?: string | null
          alt_i18n?: Json
          business_id: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          alt?: string | null
          alt_i18n?: Json
          business_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_photos_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address_line1: string
          address_line2: string | null
          amenities: string[]
          city_id: string
          created_at: string
          description: string | null
          description_i18n: Json
          email: string | null
          id: string
          latitude: number | null
          locality_id: string | null
          location: unknown
          longitude: number | null
          market_code: string
          name: string
          name_i18n: Json
          owner_id: string | null
          phone: string | null
          postal_code: string | null
          price_level: number | null
          published_at: string | null
          rating: number
          review_count: number
          search_vector: unknown
          slug: string
          socials: Json
          status: Database["public"]["Enums"]["business_status"]
          updated_at: string
          verified: boolean
          website: string | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          amenities?: string[]
          city_id: string
          created_at?: string
          description?: string | null
          description_i18n?: Json
          email?: string | null
          id?: string
          latitude?: number | null
          locality_id?: string | null
          location: unknown
          longitude?: number | null
          market_code: string
          name: string
          name_i18n?: Json
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          price_level?: number | null
          published_at?: string | null
          rating?: number
          review_count?: number
          search_vector?: unknown
          slug: string
          socials?: Json
          status?: Database["public"]["Enums"]["business_status"]
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          amenities?: string[]
          city_id?: string
          created_at?: string
          description?: string | null
          description_i18n?: Json
          email?: string | null
          id?: string
          latitude?: number | null
          locality_id?: string | null
          location?: unknown
          longitude?: number | null
          market_code?: string
          name?: string
          name_i18n?: Json
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          price_level?: number | null
          published_at?: string | null
          rating?: number
          review_count?: number
          search_vector?: unknown
          slug?: string
          socials?: Json
          status?: Database["public"]["Enums"]["business_status"]
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          icon: string | null
          id: string
          name: string
          name_i18n: Json
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          name_i18n?: Json
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          name_i18n?: Json
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          active: boolean
          centroid: unknown
          created_at: string
          id: string
          market_code: string
          name: string
          name_i18n: Json
          population_rank: number | null
          slug: string
          state: string | null
        }
        Insert: {
          active?: boolean
          centroid: unknown
          created_at?: string
          id?: string
          market_code: string
          name: string
          name_i18n?: Json
          population_rank?: number | null
          slug: string
          state?: string | null
        }
        Update: {
          active?: boolean
          centroid?: unknown
          created_at?: string
          id?: string
          market_code?: string
          name?: string
          name_i18n?: Json
          population_rank?: number | null
          slug?: string
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cities_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
        ]
      }
      claims: {
        Row: {
          business_id: string
          claimant_id: string
          contact_phone: string | null
          created_at: string
          decision_note: string | null
          document_paths: string[]
          evidence: Json
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          role_at_business: string
          status: Database["public"]["Enums"]["claim_status"]
        }
        Insert: {
          business_id: string
          claimant_id: string
          contact_phone?: string | null
          created_at?: string
          decision_note?: string | null
          document_paths?: string[]
          evidence?: Json
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_at_business: string
          status?: Database["public"]["Enums"]["claim_status"]
        }
        Update: {
          business_id?: string
          claimant_id?: string
          contact_phone?: string | null
          created_at?: string
          decision_note?: string | null
          document_paths?: string[]
          evidence?: Json
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_at_business?: string
          status?: Database["public"]["Enums"]["claim_status"]
        }
        Relationships: [
          {
            foreignKeyName: "claims_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_claimant_id_fkey"
            columns: ["claimant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          business_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hours_overrides: {
        Row: {
          business_id: string
          closed: boolean
          closes: string | null
          id: string
          note: string | null
          on_date: string
          opens: string | null
        }
        Insert: {
          business_id: string
          closed?: boolean
          closes?: string | null
          id?: string
          note?: string | null
          on_date: string
          opens?: string | null
        }
        Update: {
          business_id?: string
          closed?: boolean
          closes?: string | null
          id?: string
          note?: string | null
          on_date?: string
          opens?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hours_overrides_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      list_items: {
        Row: {
          added_at: string
          business_id: string
          list_id: string
          note: string | null
          sort_order: number
        }
        Insert: {
          added_at?: string
          business_id: string
          list_id: string
          note?: string | null
          sort_order?: number
        }
        Update: {
          added_at?: string
          business_id?: string
          list_id?: string
          note?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "list_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          share_slug: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["list_visibility"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          share_slug?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["list_visibility"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          share_slug?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["list_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "lists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      localities: {
        Row: {
          active: boolean
          centroid: unknown
          city_id: string
          created_at: string
          id: string
          name: string
          name_i18n: Json
          slug: string
        }
        Insert: {
          active?: boolean
          centroid?: unknown
          city_id: string
          created_at?: string
          id?: string
          name: string
          name_i18n?: Json
          slug: string
        }
        Update: {
          active?: boolean
          centroid?: unknown
          city_id?: string
          created_at?: string
          id?: string
          name?: string
          name_i18n?: Json
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "localities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      markets: {
        Row: {
          active: boolean
          bounds: number[]
          code: string
          created_at: string
          currency: string
          dial_code: string
          locales: string[]
          name: string
          name_i18n: Json
          time_zone: string
        }
        Insert: {
          active?: boolean
          bounds: number[]
          code: string
          created_at?: string
          currency: string
          dial_code: string
          locales?: string[]
          name: string
          name_i18n?: Json
          time_zone: string
        }
        Update: {
          active?: boolean
          bounds?: number[]
          code?: string
          created_at?: string
          currency?: string
          dial_code?: string
          locales?: string[]
          name?: string
          name_i18n?: Json
          time_zone?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          city_promotions: boolean
          email_enabled: boolean
          frequency: string
          offers: boolean
          push_enabled: boolean
          reviews_on_saved: boolean
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          city_promotions?: boolean
          email_enabled?: boolean
          frequency?: string
          offers?: boolean
          push_enabled?: boolean
          reviews_on_saved?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          city_promotions?: boolean
          email_enabled?: boolean
          frequency?: string
          offers?: boolean
          push_enabled?: boolean
          reviews_on_saved?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          business_id: string
          description: string | null
          id: string
          terms: string | null
          title: string
          title_i18n: Json
          valid_from: string
          valid_to: string
        }
        Insert: {
          business_id: string
          description?: string | null
          id?: string
          terms?: string | null
          title: string
          title_i18n?: Json
          valid_from: string
          valid_to: string
        }
        Update: {
          business_id?: string
          description?: string | null
          id?: string
          terms?: string | null
          title?: string
          title_i18n?: Json
          valid_from?: string
          valid_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          currency: string
          features: Json
          id: string
          name: string
          name_i18n: Json
          price_monthly: number
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          currency?: string
          features?: Json
          id?: string
          name: string
          name_i18n?: Json
          price_monthly?: number
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          currency?: string
          features?: Json
          id?: string
          name?: string
          name_i18n?: Json
          price_monthly?: number
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          created_at: string
          full_name: string | null
          id: string
          locale: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          locale?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          locale?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      promoted_placements: {
        Row: {
          business_id: string
          category_id: string | null
          city_id: string | null
          ends_at: string
          id: string
          starts_at: string
          surface: string
          weight: number
        }
        Insert: {
          business_id: string
          category_id?: string | null
          city_id?: string | null
          ends_at: string
          id?: string
          starts_at?: string
          surface: string
          weight?: number
        }
        Update: {
          business_id?: string
          category_id?: string | null
          city_id?: string | null
          ends_at?: string
          id?: string
          starts_at?: string
          surface?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "promoted_placements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promoted_placements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promoted_placements_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action: string
          count: number
          user_id: string
          window_start: string
        }
        Insert: {
          action: string
          count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          action?: string
          count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_photos: {
        Row: {
          id: string
          review_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          id?: string
          review_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          id?: string
          review_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_photos_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_replies: {
        Row: {
          author_id: string
          body: string
          business_id: string
          created_at: string
          id: string
          review_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          business_id: string
          created_at?: string
          id?: string
          review_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          business_id?: string
          created_at?: string
          id?: string
          review_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_replies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_reports: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          reason: string
          reporter_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          review_id: string
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          review_id: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          review_id?: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "review_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_votes: {
        Row: {
          created_at: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_id: string
          body: string
          business_id: string
          created_at: string
          edited_at: string | null
          id: string
          rating: number
          status: Database["public"]["Enums"]["review_status"]
        }
        Insert: {
          author_id: string
          body: string
          business_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          rating: number
          status?: Database["public"]["Enums"]["review_status"]
        }
        Update: {
          author_id?: string
          body?: string
          business_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          rating?: number
          status?: Database["public"]["Enums"]["review_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          id: string
          name: string
          notify: boolean
          params: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notify?: boolean
          params: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notify?: boolean
          params?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          business_id: string
          currency: string
          duration_min: number | null
          id: string
          name: string
          name_i18n: Json
          price_max: number | null
          price_min: number | null
          sort_order: number
        }
        Insert: {
          business_id: string
          currency?: string
          duration_min?: number | null
          id?: string
          name: string
          name_i18n?: Json
          price_max?: number | null
          price_min?: number | null
          sort_order?: number
        }
        Update: {
          business_id?: string
          currency?: string
          duration_min?: number | null
          id?: string
          name?: string
          name_i18n?: Json
          price_max?: number | null
          price_min?: number | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          business_id: string
          cancel_at: string | null
          created_at: string
          current_period_end: string | null
          id: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          cancel_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          cancel_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_claim: {
        Args: { p_claim_id: string; p_note?: string }
        Returns: {
          business_id: string
          claimant_id: string
          contact_phone: string | null
          created_at: string
          decision_note: string | null
          document_paths: string[]
          evidence: Json
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          role_at_business: string
          status: Database["public"]["Enums"]["claim_status"]
        }
        SetofOptions: {
          from: "*"
          to: "claims"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      business_is_public: { Args: { target: string }; Returns: boolean }
      business_reviews: {
        Args: {
          p_business_id: string
          p_limit?: number
          p_offset?: number
          p_sort?: string
        }
        Returns: {
          author_avatar: string
          author_id: string
          author_name: string
          body: string
          created_at: string
          edited_at: string
          helpful_count: number
          id: string
          photo_paths: string[]
          rating: number
          reply_body: string
          reply_created_at: string
          total_count: number
          viewer_is_author: boolean
          viewer_voted: boolean
        }[]
      }
      consume_rate_limit: {
        Args: { p_action: string; p_max: number; p_window: string }
        Returns: boolean
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      delete_own_account: { Args: never; Returns: undefined }
      directory_stats: {
        Args: never
        Returns: {
          category_count: number
          city_count: number
          listing_count: number
          review_count: number
        }[]
      }
      facet_amenities: {
        Args: { p_city_slug?: string }
        Returns: {
          amenity: string
          listing_count: number
        }[]
      }
      facet_localities: {
        Args: { p_city_slug: string }
        Returns: {
          listing_count: number
          name: string
          name_i18n: Json
          slug: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_open_at: {
        Args: { p_at?: string; p_business_id: string }
        Returns: boolean
      }
      jsonb_values_text: { Args: { source: Json }; Returns: string }
      nearby_businesses: {
        Args: { p_business_id: string; p_limit?: number; p_radius_km?: number }
        Returns: {
          address_line1: string
          city_name: string
          distance_km: number
          id: string
          is_open: boolean
          locality_name: string
          name: string
          name_i18n: Json
          photo_url: string
          price_level: number
          rating: number
          review_count: number
          same_category: boolean
          slug: string
          verified: boolean
        }[]
      }
      owns_business: { Args: { target: string }; Returns: boolean }
      record_audit: {
        Args: {
          p_action: string
          p_after?: Json
          p_before?: Json
          p_entity_id: string
          p_entity_type: string
        }
        Returns: number
      }
      reject_claim: {
        Args: { p_claim_id: string; p_note: string }
        Returns: {
          business_id: string
          claimant_id: string
          contact_phone: string | null
          created_at: string
          decision_note: string | null
          document_paths: string[]
          evidence: Json
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          role_at_business: string
          status: Database["public"]["Enums"]["claim_status"]
        }
        SetofOptions: {
          from: "*"
          to: "claims"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_eligibility: {
        Args: { p_business_id: string }
        Returns: {
          can_review: boolean
          existing_review_id: string
          reason: string
        }[]
      }
      search_businesses: {
        Args: {
          p_amenities?: string[]
          p_at?: string
          p_category_slugs?: string[]
          p_city_slug?: string
          p_lat?: number
          p_lng?: number
          p_locality_slug?: string
          p_min_rating?: number
          p_open_now?: boolean
          p_page?: number
          p_page_size?: number
          p_price_levels?: number[]
          p_query?: string
          p_radius_km?: number
          p_sort?: string
        }
        Returns: {
          address_line1: string
          amenities: string[]
          category_slugs: string[]
          city_name: string
          city_slug: string
          description: string
          distance_km: number
          id: string
          is_open: boolean
          latitude: number
          locality_name: string
          longitude: number
          name: string
          name_i18n: Json
          photo_url: string
          price_level: number
          promoted: boolean
          rating: number
          review_count: number
          slug: string
          total_count: number
          verified: boolean
        }[]
      }
      slugify: { Args: { input: string }; Returns: string }
    }
    Enums: {
      business_event_type:
        | "view"
        | "phone_click"
        | "website_click"
        | "direction_click"
        | "save"
        | "share"
      business_status:
        | "draft"
        | "pending"
        | "published"
        | "rejected"
        | "suspended"
      claim_status: "pending" | "approved" | "rejected" | "withdrawn"
      list_visibility: "private" | "unlisted" | "public"
      report_status: "pending" | "dismissed" | "actioned"
      review_status: "published" | "flagged" | "removed"
      subscription_status: "trialing" | "active" | "past_due" | "canceled"
      user_role: "guest" | "user" | "owner" | "admin"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      business_event_type: [
        "view",
        "phone_click",
        "website_click",
        "direction_click",
        "save",
        "share",
      ],
      business_status: [
        "draft",
        "pending",
        "published",
        "rejected",
        "suspended",
      ],
      claim_status: ["pending", "approved", "rejected", "withdrawn"],
      list_visibility: ["private", "unlisted", "public"],
      report_status: ["pending", "dismissed", "actioned"],
      review_status: ["published", "flagged", "removed"],
      subscription_status: ["trialing", "active", "past_due", "canceled"],
      user_role: ["guest", "user", "owner", "admin"],
    },
  },
} as const

