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
    PostgrestVersion: "14.17"
  }
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
      admin_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          permissions: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          permissions?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          permissions?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string | null
          id: string
          last_login: string | null
          role_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_login?: string | null
          role_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_login?: string | null
          role_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisements: {
        Row: {
          advertiser: string | null
          budget: number | null
          clicks: number | null
          created_at: string | null
          id: string
          image_url: string | null
          impressions: number | null
          placement: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          advertiser?: string | null
          budget?: number | null
          clicks?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          impressions?: number | null
          placement?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          advertiser?: string | null
          budget?: number | null
          clicks?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          impressions?: number | null
          placement?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          context: Json
          created_at: string
          deleted_at: string | null
          id: string
          language: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          language?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          language?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          language: string | null
          role: string
          tokens_in: number | null
          tokens_out: number | null
          tool_calls: Json
          tool_data: Json
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          language?: string | null
          role: string
          tokens_in?: number | null
          tokens_out?: number | null
          tool_calls?: Json
          tool_data?: Json
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          language?: string | null
          role?: string
          tokens_in?: number | null
          tokens_out?: number | null
          tool_calls?: Json
          tool_data?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          model: string | null
          prompt: string
          title: string
          updated_at: string | null
          usage_count: number | null
          version: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          model?: string | null
          prompt: string
          title: string
          updated_at?: string | null
          usage_count?: number | null
          version?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          model?: string | null
          prompt?: string
          title?: string
          updated_at?: string | null
          usage_count?: number | null
          version?: string | null
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          created_at: string
          duration_ms: number
          feature: string
          id: number
          images: number
          model: string | null
          provider: string | null
          tokens_in: number
          tokens_out: number
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number
          feature: string
          id?: never
          images?: number
          model?: string | null
          provider?: string | null
          tokens_in?: number
          tokens_out?: number
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number
          feature?: string
          id?: never
          images?: number
          model?: string | null
          provider?: string | null
          tokens_in?: number
          tokens_out?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anonymous_rate_tracking: {
        Row: {
          created_at: string
          id: number
          table_name: string
        }
        Insert: {
          created_at?: string
          id?: number
          table_name: string
        }
        Update: {
          created_at?: string
          id?: number
          table_name?: string
        }
        Relationships: []
      }
      app_analytics: {
        Row: {
          active_users: number | null
          created_at: string | null
          date: string
          id: string
          new_signups: number | null
          orders: number | null
          retention: number | null
          sessions: number | null
        }
        Insert: {
          active_users?: number | null
          created_at?: string | null
          date: string
          id?: string
          new_signups?: number | null
          orders?: number | null
          retention?: number | null
          sessions?: number | null
        }
        Update: {
          active_users?: number | null
          created_at?: string | null
          date?: string
          id?: string
          new_signups?: number | null
          orders?: number | null
          retention?: number | null
          sessions?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cattle_listings: {
        Row: {
          age: string
          breed: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_verified: boolean | null
          location: string
          milk_yield: string | null
          price: number
          seller_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          age: string
          breed: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          location: string
          milk_yield?: string | null
          price: number
          seller_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          age?: string
          breed?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          location?: string
          milk_yield?: string | null
          price?: number
          seller_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string
          name: string
          phone: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message: string
          name: string
          phone: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      crash_reports: {
        Row: {
          count: number | null
          created_at: string | null
          error: string
          id: string
          last_occurred: string | null
          platform: string | null
          stack_trace: string | null
          status: string | null
          users_affected: number | null
          version: string | null
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          error: string
          id?: string
          last_occurred?: string | null
          platform?: string | null
          stack_trace?: string | null
          status?: string | null
          users_affected?: number | null
          version?: string | null
        }
        Update: {
          count?: number | null
          created_at?: string | null
          error?: string
          id?: string
          last_occurred?: string | null
          platform?: string | null
          stack_trace?: string | null
          status?: string | null
          users_affected?: number | null
          version?: string | null
        }
        Relationships: []
      }
      crop_scans: {
        Row: {
          confidence: number | null
          created_at: string
          crop: string | null
          health_status: string | null
          id: string
          image_url: string | null
          language: string | null
          mime_type: string | null
          plant_part: string | null
          possible_issue: string | null
          raw_result: Json | null
          recommendations: Json
          storage_path: string | null
          symptoms: Json
          urgency: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          crop?: string | null
          health_status?: string | null
          id?: string
          image_url?: string | null
          language?: string | null
          mime_type?: string | null
          plant_part?: string | null
          possible_issue?: string | null
          raw_result?: Json | null
          recommendations?: Json
          storage_path?: string | null
          symptoms?: Json
          urgency?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          crop?: string | null
          health_status?: string | null
          id?: string
          image_url?: string | null
          language?: string | null
          mime_type?: string | null
          plant_part?: string | null
          possible_issue?: string | null
          raw_result?: Json | null
          recommendations?: Json
          storage_path?: string | null
          symptoms?: Json
          urgency?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crop_scans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_entries: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          id: string
          question: string
          sort_order: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          id?: string
          question: string
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          id?: string
          question?: string
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      farm_locations: {
        Row: {
          area: number | null
          country: string | null
          created_at: string
          crop: string | null
          district: string | null
          id: number
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          pincode: string | null
          state: string | null
          updated_at: string
          user_id: string
          village: string | null
        }
        Insert: {
          area?: number | null
          country?: string | null
          created_at?: string
          crop?: string | null
          district?: string | null
          id?: number
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          village?: string | null
        }
        Update: {
          area?: number | null
          country?: string | null
          created_at?: string
          crop?: string | null
          district?: string | null
          id?: number
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          village?: string | null
        }
        Relationships: []
      }
      ff_analytics_events: {
        Row: {
          created_at: string | null
          event_name: string
          id: string
          metadata: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_name: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_name?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      founding_farmer_config: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          max_slots: number
          offer_end: string
          offer_start: string
          plus_price: number
          pro_price: number
          slots_taken: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_slots?: number
          offer_end?: string
          offer_start?: string
          plus_price?: number
          pro_price?: number
          slots_taken?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_slots?: number
          offer_end?: string
          offer_start?: string
          plus_price?: number
          pro_price?: number
          slots_taken?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      government_schemes: {
        Row: {
          benefit: string | null
          created_at: string | null
          deadline: string | null
          eligibility: string | null
          id: string
          ministry: string | null
          state: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          benefit?: string | null
          created_at?: string | null
          deadline?: string | null
          eligibility?: string | null
          id?: string
          ministry?: string | null
          state?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          benefit?: string | null
          created_at?: string | null
          deadline?: string | null
          eligibility?: string | null
          id?: string
          ministry?: string | null
          state?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      knowledge_articles: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          created_at: string | null
          id: string
          image_url: string | null
          language: string | null
          status: string | null
          title: string
          updated_at: string | null
          views: number | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          language?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          language?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          views?: number | null
        }
        Relationships: []
      }
      labor_requests: {
        Row: {
          created_at: string
          date: string | null
          id: string
          labor_count: string | null
          location: string | null
          name: string
          phone: string
          work_type: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          id?: string
          labor_count?: string | null
          location?: string | null
          name: string
          phone: string
          work_type: string
        }
        Update: {
          created_at?: string
          date?: string | null
          id?: string
          labor_count?: string | null
          location?: string | null
          name?: string
          phone?: string
          work_type?: string
        }
        Relationships: []
      }
      laborers: {
        Row: {
          count: number | null
          id: number
          location: string | null
          name: string
          rate: number | null
          skill: string | null
          status: string | null
        }
        Insert: {
          count?: number | null
          id?: number
          location?: string | null
          name: string
          rate?: number | null
          skill?: string | null
          status?: string | null
        }
        Update: {
          count?: number | null
          id?: number
          location?: string | null
          name?: string
          rate?: number | null
          skill?: string | null
          status?: string | null
        }
        Relationships: []
      }
      livestock: {
        Row: {
          age: string | null
          breed: string | null
          distance: string | null
          id: number
          image: string | null
          location: string | null
          milk: string | null
          name: string
          price: number | null
          seller: string | null
          status: string | null
          type: string | null
          verified: boolean | null
        }
        Insert: {
          age?: string | null
          breed?: string | null
          distance?: string | null
          id?: number
          image?: string | null
          location?: string | null
          milk?: string | null
          name: string
          price?: number | null
          seller?: string | null
          status?: string | null
          type?: string | null
          verified?: boolean | null
        }
        Update: {
          age?: string | null
          breed?: string | null
          distance?: string | null
          id?: number
          image?: string | null
          location?: string | null
          milk?: string | null
          name?: string
          price?: number | null
          seller?: string | null
          status?: string | null
          type?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          id: string
          image_url: string | null
          published_at: string | null
          source: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          source?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          source?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string | null
          currency: string
          id: string
          order_id: string | null
          payment_method: string | null
          product_id: string | null
          product_type: string | null
          razorpay_order_id: string
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          currency?: string
          id?: string
          order_id?: string | null
          payment_method?: string | null
          product_id?: string | null
          product_type?: string | null
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          currency?: string
          id?: string
          order_id?: string | null
          payment_method?: string | null
          product_id?: string | null
          product_type?: string | null
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          alert_type: string
          commodity: string
          created_at: string
          id: string
          is_active: boolean | null
          target_price: number
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          commodity: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          target_price: number
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          commodity?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          target_price?: number
          triggered_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          additional_crops: string[] | null
          alternate_phone: string | null
          app_language: string
          avatar_url: string | null
          cookies_preferences: Json | null
          created_at: string
          district: string | null
          email: string | null
          extended_profile: string | null
          farm_location: string | null
          farm_size: number | null
          farming_experience: string | null
          founding_farmer: boolean | null
          founding_farmer_number: number | null
          full_name: string | null
          id: string
          irrigation_type: string | null
          location: string | null
          onboarding_completed: boolean
          phone: string | null
          primary_crop: string | null
          privacy_accepted_at: string | null
          role: string | null
          soil_type: string | null
          state: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
          village: string | null
        }
        Insert: {
          additional_crops?: string[] | null
          alternate_phone?: string | null
          app_language?: string
          avatar_url?: string | null
          cookies_preferences?: Json | null
          created_at?: string
          district?: string | null
          email?: string | null
          extended_profile?: string | null
          farm_location?: string | null
          farm_size?: number | null
          farming_experience?: string | null
          founding_farmer?: boolean | null
          founding_farmer_number?: number | null
          full_name?: string | null
          id: string
          irrigation_type?: string | null
          location?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          primary_crop?: string | null
          privacy_accepted_at?: string | null
          role?: string | null
          soil_type?: string | null
          state?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          village?: string | null
        }
        Update: {
          additional_crops?: string[] | null
          alternate_phone?: string | null
          app_language?: string
          avatar_url?: string | null
          cookies_preferences?: Json | null
          created_at?: string
          district?: string | null
          email?: string | null
          extended_profile?: string | null
          farm_location?: string | null
          farm_size?: number | null
          farming_experience?: string | null
          founding_farmer?: boolean | null
          founding_farmer_number?: number | null
          full_name?: string | null
          id?: string
          irrigation_type?: string | null
          location?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          primary_crop?: string | null
          privacy_accepted_at?: string | null
          role?: string | null
          soil_type?: string | null
          state?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          village?: string | null
        }
        Relationships: []
      }
      push_campaigns: {
        Row: {
          audience: string | null
          created_at: string | null
          id: string
          message: string
          opened_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string | null
          title: string
        }
        Insert: {
          audience?: string | null
          created_at?: string | null
          id?: string
          message: string
          opened_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          title: string
        }
        Update: {
          audience?: string | null
          created_at?: string | null
          id?: string
          message?: string
          opened_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          price_alerts: boolean | null
          user_id: string
          weather_alerts: boolean | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          price_alerts?: boolean | null
          user_id: string
          weather_alerts?: boolean | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          price_alerts?: boolean | null
          user_id?: string
          weather_alerts?: boolean | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          priority: string | null
          status: string | null
          subject: string
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      soil_test_labs: {
        Row: {
          created_at: string
          id: number
          image_url: string | null
          name: string
          price: number | null
          status: string | null
          test_type: string | null
          turnaround: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          image_url?: string | null
          name: string
          price?: number | null
          status?: string | null
          test_type?: string | null
          turnaround?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          image_url?: string | null
          name?: string
          price?: number | null
          status?: string | null
          test_type?: string | null
          turnaround?: string | null
        }
        Relationships: []
      }
      soil_test_orders: {
        Row: {
          additional_notes: string | null
          address: string
          assigned_agent_id: string | null
          assigned_agent_name: string | null
          assigned_agent_phone: string | null
          confirmed_pickup_date: string | null
          created_at: string | null
          crop: string | null
          crop_stage: string | null
          district: string
          email: string | null
          farm_name: string | null
          farm_size: number | null
          farm_size_unit: string | null
          farmer_name: string
          id: string
          internal_notes: string | null
          lab_name: string | null
          lab_started_at: string | null
          latitude: number | null
          longitude: number | null
          mobile: string
          order_number: string
          order_status: string
          payment_id: string | null
          payment_method: string | null
          payment_status: string
          pickup_fee: number
          pickup_required: boolean
          pickup_time_slot: string | null
          pincode: string | null
          preferred_pickup_date: string | null
          report_file_path: string | null
          report_generated_at: string | null
          report_url: string | null
          sample_collected_at: string | null
          sample_quantity: string | null
          sample_received_at: string | null
          state: string
          structured_results: Json | null
          test_price: number
          test_type: string
          total_amount: number
          updated_at: string | null
          user_id: string
          village: string | null
        }
        Insert: {
          additional_notes?: string | null
          address: string
          assigned_agent_id?: string | null
          assigned_agent_name?: string | null
          assigned_agent_phone?: string | null
          confirmed_pickup_date?: string | null
          created_at?: string | null
          crop?: string | null
          crop_stage?: string | null
          district: string
          email?: string | null
          farm_name?: string | null
          farm_size?: number | null
          farm_size_unit?: string | null
          farmer_name: string
          id?: string
          internal_notes?: string | null
          lab_name?: string | null
          lab_started_at?: string | null
          latitude?: number | null
          longitude?: number | null
          mobile: string
          order_number: string
          order_status?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string
          pickup_fee?: number
          pickup_required?: boolean
          pickup_time_slot?: string | null
          pincode?: string | null
          preferred_pickup_date?: string | null
          report_file_path?: string | null
          report_generated_at?: string | null
          report_url?: string | null
          sample_collected_at?: string | null
          sample_quantity?: string | null
          sample_received_at?: string | null
          state: string
          structured_results?: Json | null
          test_price?: number
          test_type: string
          total_amount?: number
          updated_at?: string | null
          user_id: string
          village?: string | null
        }
        Update: {
          additional_notes?: string | null
          address?: string
          assigned_agent_id?: string | null
          assigned_agent_name?: string | null
          assigned_agent_phone?: string | null
          confirmed_pickup_date?: string | null
          created_at?: string | null
          crop?: string | null
          crop_stage?: string | null
          district?: string
          email?: string | null
          farm_name?: string | null
          farm_size?: number | null
          farm_size_unit?: string | null
          farmer_name?: string
          id?: string
          internal_notes?: string | null
          lab_name?: string | null
          lab_started_at?: string | null
          latitude?: number | null
          longitude?: number | null
          mobile?: string
          order_number?: string
          order_status?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string
          pickup_fee?: number
          pickup_required?: boolean
          pickup_time_slot?: string | null
          pincode?: string | null
          preferred_pickup_date?: string | null
          report_file_path?: string | null
          report_generated_at?: string | null
          report_url?: string | null
          sample_collected_at?: string | null
          sample_quantity?: string | null
          sample_received_at?: string | null
          state?: string
          structured_results?: Json | null
          test_price?: number
          test_type?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string
          village?: string | null
        }
        Relationships: []
      }
      soil_test_status_history: {
        Row: {
          changed_by: string | null
          changed_by_name: string | null
          created_at: string | null
          id: string
          new_status: string
          note: string | null
          previous_status: string | null
          soil_test_order_id: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string | null
          id?: string
          new_status: string
          note?: string | null
          previous_status?: string | null
          soil_test_order_id: string
        }
        Update: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string | null
          id?: string
          new_status?: string
          note?: string | null
          previous_status?: string | null
          soil_test_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "soil_test_status_history_soil_test_order_id_fkey"
            columns: ["soil_test_order_id"]
            isOneToOne: false
            referencedRelation: "soil_test_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_facilities: {
        Row: {
          capacity: string | null
          id: number
          location: string | null
          name: string
          rate: number | null
          status: string | null
          temperature: string | null
        }
        Insert: {
          capacity?: string | null
          id?: number
          location?: string | null
          name: string
          rate?: number | null
          status?: string | null
          temperature?: string | null
        }
        Update: {
          capacity?: string | null
          id?: number
          location?: string | null
          name?: string
          rate?: number | null
          status?: string | null
          temperature?: string | null
        }
        Relationships: []
      }
      store_inventory: {
        Row: {
          batch_no: string | null
          brand: string | null
          category: string | null
          created_at: string
          description: string | null
          id: number
          image_url: string | null
          mrp: number | null
          name: string
          price: number | null
          seller_id: string | null
          status: string | null
          stock: number | null
          unit: string | null
        }
        Insert: {
          batch_no?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: number
          image_url?: string | null
          mrp?: number | null
          name: string
          price?: number | null
          seller_id?: string | null
          status?: string | null
          stock?: number | null
          unit?: string | null
        }
        Update: {
          batch_no?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: number
          image_url?: string | null
          mrp?: number | null
          name?: string
          price?: number | null
          seller_id?: string | null
          status?: string | null
          stock?: number | null
          unit?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          currency: string | null
          description: string | null
          features: Json | null
          id: string
          interval: string
          is_active: boolean | null
          name: string
          price: number
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          interval?: string
          is_active?: boolean | null
          name: string
          price?: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          interval?: string
          is_active?: boolean | null
          name?: string
          price?: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          priority: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tractor_bookings: {
        Row: {
          acres: number | null
          address: string | null
          base_fare: number | null
          category: string | null
          created_at: string
          deposit: number | null
          driver_charge: number | null
          fuel_surcharge: number | null
          hours: number | null
          id: string
          owner_id: string | null
          owner_name: string | null
          payment_method: string | null
          scheduled_for: string | null
          status: string
          total: number | null
          tractor_id: string
          tractor_name: string
          user_id: string | null
          user_name: string | null
          with_driver: boolean | null
        }
        Insert: {
          acres?: number | null
          address?: string | null
          base_fare?: number | null
          category?: string | null
          created_at?: string
          deposit?: number | null
          driver_charge?: number | null
          fuel_surcharge?: number | null
          hours?: number | null
          id?: string
          owner_id?: string | null
          owner_name?: string | null
          payment_method?: string | null
          scheduled_for?: string | null
          status?: string
          total?: number | null
          tractor_id: string
          tractor_name: string
          user_id?: string | null
          user_name?: string | null
          with_driver?: boolean | null
        }
        Update: {
          acres?: number | null
          address?: string | null
          base_fare?: number | null
          category?: string | null
          created_at?: string
          deposit?: number | null
          driver_charge?: number | null
          fuel_surcharge?: number | null
          hours?: number | null
          id?: string
          owner_id?: string | null
          owner_name?: string | null
          payment_method?: string | null
          scheduled_for?: string | null
          status?: string
          total?: number | null
          tractor_id?: string
          tractor_name?: string
          user_id?: string | null
          user_name?: string | null
          with_driver?: boolean | null
        }
        Relationships: []
      }
      tractor_listings: {
        Row: {
          brand: string
          cabin: boolean | null
          category: string
          city: string
          color: string | null
          created_at: string
          deposit: number
          description: string | null
          engine: string | null
          features: string[]
          fuel: string | null
          hp: number | null
          id: string
          implements: string[]
          lat: number | null
          lifting: string | null
          lng: number | null
          name: string
          next_available: string | null
          owner_avatar: string | null
          owner_city: string | null
          owner_id: string
          owner_jobs: number | null
          owner_joined: string | null
          owner_lat: number | null
          owner_lng: number | null
          owner_name: string
          owner_name_hi: string | null
          owner_phone: string
          owner_rating: number | null
          owner_response: string | null
          owner_state: string | null
          owner_verified: boolean | null
          owner_village: string | null
          popular: boolean | null
          rate_acre: number
          rate_day: number
          rate_hour: number
          rating: number | null
          reviews: number | null
          state: string
          status: string
          year: number | null
        }
        Insert: {
          brand: string
          cabin?: boolean | null
          category: string
          city: string
          color?: string | null
          created_at?: string
          deposit: number
          description?: string | null
          engine?: string | null
          features?: string[]
          fuel?: string | null
          hp?: number | null
          id: string
          implements?: string[]
          lat?: number | null
          lifting?: string | null
          lng?: number | null
          name: string
          next_available?: string | null
          owner_avatar?: string | null
          owner_city?: string | null
          owner_id: string
          owner_jobs?: number | null
          owner_joined?: string | null
          owner_lat?: number | null
          owner_lng?: number | null
          owner_name: string
          owner_name_hi?: string | null
          owner_phone: string
          owner_rating?: number | null
          owner_response?: string | null
          owner_state?: string | null
          owner_verified?: boolean | null
          owner_village?: string | null
          popular?: boolean | null
          rate_acre: number
          rate_day: number
          rate_hour: number
          rating?: number | null
          reviews?: number | null
          state: string
          status?: string
          year?: number | null
        }
        Update: {
          brand?: string
          cabin?: boolean | null
          category?: string
          city?: string
          color?: string | null
          created_at?: string
          deposit?: number
          description?: string | null
          engine?: string | null
          features?: string[]
          fuel?: string | null
          hp?: number | null
          id?: string
          implements?: string[]
          lat?: number | null
          lifting?: string | null
          lng?: number | null
          name?: string
          next_available?: string | null
          owner_avatar?: string | null
          owner_city?: string | null
          owner_id?: string
          owner_jobs?: number | null
          owner_joined?: string | null
          owner_lat?: number | null
          owner_lng?: number | null
          owner_name?: string
          owner_name_hi?: string | null
          owner_phone?: string
          owner_rating?: number | null
          owner_response?: string | null
          owner_state?: string | null
          owner_verified?: boolean | null
          owner_village?: string | null
          popular?: boolean | null
          rate_acre?: number
          rate_day?: number
          rate_hour?: number
          rating?: number | null
          reviews?: number | null
          state?: string
          status?: string
          year?: number | null
        }
        Relationships: []
      }
      tractor_reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string
          id: string
          rating: number
          tractor_id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          tractor_id: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          tractor_id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tractor_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "tractor_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_bookings: {
        Row: {
          created_at: string
          crop_type: string
          date: string | null
          destination: string
          id: string
          name: string
          phone: string
          pickup_location: string
          weight: string | null
        }
        Insert: {
          created_at?: string
          crop_type: string
          date?: string | null
          destination: string
          id?: string
          name: string
          phone: string
          pickup_location: string
          weight?: string | null
        }
        Update: {
          created_at?: string
          crop_type?: string
          date?: string | null
          destination?: string
          id?: string
          name?: string
          phone?: string
          pickup_location?: string
          weight?: string | null
        }
        Relationships: []
      }
      transport_vehicles: {
        Row: {
          capacity: string | null
          id: number
          location: string | null
          name: string
          rate: number | null
          status: string | null
          type: string | null
        }
        Insert: {
          capacity?: string | null
          id?: number
          location?: string | null
          name: string
          rate?: number | null
          status?: string | null
          type?: string | null
        }
        Update: {
          capacity?: string | null
          id?: number
          location?: string | null
          name?: string
          rate?: number | null
          status?: string | null
          type?: string | null
        }
        Relationships: []
      }
      user_locations: {
        Row: {
          accuracy: number | null
          city: string | null
          country: string | null
          created_at: string
          district: string | null
          formatted_address: string | null
          id: number
          is_default: boolean
          latitude: number | null
          location_source: string
          longitude: number | null
          pincode: string | null
          source: string
          state: string | null
          updated_at: string
          user_id: string
          village: string | null
        }
        Insert: {
          accuracy?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          formatted_address?: string | null
          id?: number
          is_default?: boolean
          latitude?: number | null
          location_source?: string
          longitude?: number | null
          pincode?: string | null
          source?: string
          state?: string | null
          updated_at?: string
          user_id: string
          village?: string | null
        }
        Update: {
          accuracy?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          formatted_address?: string | null
          id?: number
          is_default?: boolean
          latitude?: number | null
          location_source?: string
          longitude?: number | null
          pincode?: string | null
          source?: string
          state?: string | null
          updated_at?: string
          user_id?: string
          village?: string | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string | null
          expires_at: string | null
          founding_farmer: boolean | null
          founding_farmer_joined_at: string | null
          founding_farmer_number: number | null
          founding_farmer_price: number | null
          id: string
          normal_price: number | null
          payment_id: string | null
          plan_id: string
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          founding_farmer?: boolean | null
          founding_farmer_joined_at?: string | null
          founding_farmer_number?: number | null
          founding_farmer_price?: number | null
          id?: string
          normal_price?: number | null
          payment_id?: string | null
          plan_id: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          founding_farmer?: boolean | null
          founding_farmer_joined_at?: string | null
          founding_farmer_number?: number | null
          founding_farmer_price?: number | null
          id?: string
          normal_price?: number | null
          payment_id?: string | null
          plan_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_admin_adjustments: {
        Row: {
          admin_user_id: string
          amount: number
          created_at: string
          direction: string
          id: string
          reason: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          admin_user_id: string
          amount: number
          created_at?: string
          direction: string
          id?: string
          reason: string
          user_id: string
          wallet_id: string
        }
        Update: {
          admin_user_id?: string
          amount?: number
          created_at?: string
          direction?: string
          id?: string
          reason?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_admin_adjustments_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_limits: {
        Row: {
          key: string
          unit: string
          updated_at: string
          value: number
        }
        Insert: {
          key: string
          unit?: string
          updated_at?: string
          value: number
        }
        Update: {
          key?: string
          unit?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          credit_type: string | null
          currency: string
          description: string | null
          direction: string
          expiry: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          source: string | null
          status: string
          type: string
          updated_at: string
          usage_restrictions: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          credit_type?: string | null
          currency?: string
          description?: string | null
          direction: string
          expiry?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          source?: string | null
          status?: string
          type: string
          updated_at?: string
          usage_restrictions?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          credit_type?: string | null
          currency?: string
          description?: string | null
          direction?: string
          expiry?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          source?: string | null
          status?: string
          type?: string
          updated_at?: string
          usage_restrictions?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weather_cache: {
        Row: {
          expires_at: string
          fetched_at: string
          id: number
          latitude: number
          longitude: number
          weather_data: Json
        }
        Insert: {
          expires_at?: string
          fetched_at?: string
          id?: number
          latitude: number
          longitude: number
          weather_data: Json
        }
        Update: {
          expires_at?: string
          fetched_at?: string
          id?: number
          latitude?: number
          longitude?: number
          weather_data?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_founding_farmer: {
        Args: {
          p_founding_farmer_number: number
          p_normal_price: number
          p_payment_id: string
          p_plan: string
          p_price: number
          p_user_id: string
        }
        Returns: Json
      }
      admin_adjust_wallet: {
        Args: {
          p_amount: number
          p_direction: string
          p_reason: string
          p_target_user_id: string
        }
        Returns: Json
      }
      admin_get_dashboard_kpis: { Args: never; Returns: Json }
      admin_update_user_status: {
        Args: { p_reason?: string; p_status: string; p_target_user_id: string }
        Returns: Json
      }
      admin_verify_user: {
        Args: {
          p_notes?: string
          p_target_user_id: string
          p_verified: boolean
        }
        Returns: Json
      }
      admin_wallets_list: { Args: never; Returns: Json }
      ai_log_usage: {
        Args: {
          p_duration_ms?: number
          p_feature: string
          p_images?: number
          p_model?: string
          p_provider?: string
          p_tokens_in?: number
          p_tokens_out?: number
          p_user_id: string
        }
        Returns: Json
      }
      claim_founding_farmer_slot: {
        Args: { p_plan: string; p_user_id: string }
        Returns: Json
      }
      cleanup_anonymous_rate_tracking: { Args: never; Returns: undefined }
      generate_soil_test_order_number: { Args: never; Returns: string }
      get_founding_farmer_config: { Args: never; Returns: Json }
      get_seller_display_name: {
        Args: { seller_user_id: string }
        Returns: string
      }
      handle_send_email: { Args: { event: Json }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_soil_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      rate_limit_check: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_requests: number
          p_window_ms: number
        }
        Returns: Json
      }
      request_throttle: {
        Args: {
          p_max?: number
          p_phone: string
          p_table: string
          p_window_minutes?: number
        }
        Returns: undefined
      }
      wallet_add_money_check: { Args: { p_amount: number }; Returns: Json }
      wallet_admin_adjust: {
        Args: {
          p_amount: number
          p_direction: string
          p_reason: string
          p_user_id: string
        }
        Returns: {
          amount: number
          balance_after: number | null
          created_at: string
          credit_type: string | null
          currency: string
          description: string | null
          direction: string
          expiry: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          source: string | null
          status: string
          type: string
          updated_at: string
          usage_restrictions: string | null
          user_id: string
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_apply_ledger: {
        Args: {
          p_amount: number
          p_credit_type?: string
          p_description: string
          p_direction: string
          p_expiry?: string
          p_reference_id: string
          p_reference_type: string
          p_source?: string
          p_status?: string
          p_type: string
          p_usage_restrictions?: string
          p_user_id: string
          p_wallet_id: string
        }
        Returns: {
          amount: number
          balance_after: number | null
          created_at: string
          credit_type: string | null
          currency: string
          description: string | null
          direction: string
          expiry: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          source: string | null
          status: string
          type: string
          updated_at: string
          usage_restrictions: string | null
          user_id: string
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_credit_verified: {
        Args: {
          p_amount: number
          p_credit_type?: string
          p_description?: string
          p_reference_id: string
          p_reference_type: string
          p_source?: string
          p_user_id: string
        }
        Returns: {
          amount: number
          balance_after: number | null
          created_at: string
          credit_type: string | null
          currency: string
          description: string | null
          direction: string
          expiry: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          source: string | null
          status: string
          type: string
          updated_at: string
          usage_restrictions: string | null
          user_id: string
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_get_summary: { Args: never; Returns: Json }
      wallet_transactions_page: {
        Args: { p_page?: number; p_page_size?: number; p_type_filter?: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
