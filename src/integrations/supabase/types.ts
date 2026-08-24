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
    PostgrestVersion: "14.15"
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
          seller_id: string
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
          seller_id: string
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
          seller_id?: string
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
          breed: string | null
          id: number
          location: string | null
          name: string
          price: number | null
          status: string | null
        }
        Insert: {
          breed?: string | null
          id?: number
          location?: string | null
          name: string
          price?: number | null
          status?: string | null
        }
        Update: {
          breed?: string | null
          id?: number
          location?: string | null
          name?: string
          price?: number | null
          status?: string | null
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
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          location: string | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          location?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
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
      ai_conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          language: string
          context: Record<string, unknown>
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          language?: string
          context?: Record<string, unknown>
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          language?: string
          context?: Record<string, unknown>
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_messages: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          role: string
          content: string
          language: string | null
          tool_calls: unknown[] | null
          tool_data: Record<string, unknown>
          tokens_in: number | null
          tokens_out: number | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          role: string
          content: string
          language?: string | null
          tool_calls?: unknown[] | null
          tool_data?: Record<string, unknown>
          tokens_in?: number | null
          tokens_out?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          role?: string
          content?: string
          language?: string | null
          tool_calls?: unknown[] | null
          tool_data?: Record<string, unknown>
          tokens_in?: number | null
          tokens_out?: number | null
          created_at?: string
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
          }
        ]
      }
      crop_scans: {
        Row: {
          id: string
          user_id: string
          image_url: string | null
          storage_path: string | null
          mime_type: string | null
          language: string | null
          crop: string | null
          plant_part: string | null
          health_status: string | null
          possible_issue: string | null
          confidence: number | null
          symptoms: unknown[] | null
          recommendations: unknown[] | null
          urgency: string | null
          raw_result: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          image_url?: string | null
          storage_path?: string | null
          mime_type?: string | null
          language?: string | null
          crop?: string | null
          plant_part?: string | null
          health_status?: string | null
          possible_issue?: string | null
          confidence?: number | null
          symptoms?: unknown[] | null
          recommendations?: unknown[] | null
          urgency?: string | null
          raw_result?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          image_url?: string | null
          storage_path?: string | null
          mime_type?: string | null
          language?: string | null
          crop?: string | null
          plant_part?: string | null
          health_status?: string | null
          possible_issue?: string | null
          confidence?: number | null
          symptoms?: unknown[] | null
          recommendations?: unknown[] | null
          urgency?: string | null
          raw_result?: Record<string, unknown> | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crop_scans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_usage: {
        Row: {
          id: number
          user_id: string
          feature: string
          provider: string | null
          model: string | null
          tokens_in: number
          tokens_out: number
          images: number
          duration_ms: number
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          feature: string
          provider?: string | null
          model?: string | null
          tokens_in?: number
          tokens_out?: number
          images?: number
          duration_ms?: number
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          feature?: string
          provider?: string | null
          model?: string | null
          tokens_in?: number
          tokens_out?: number
          images?: number
          duration_ms?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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
          }
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
        Relationships: []
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
      soil_test_orders: {
        Row: {
          id: string
          order_number: string
          user_id: string
          farmer_name: string
          mobile: string
          email: string | null
          farm_name: string | null
          address: string
          state: string
          district: string
          village: string | null
          pincode: string | null
          latitude: number | null
          longitude: number | null
          farm_size: number | null
          farm_size_unit: string | null
          crop: string | null
          crop_stage: string | null
          test_type: string
          sample_quantity: string | null
          pickup_required: boolean
          pickup_fee: number
          test_price: number
          total_amount: number
          payment_status: string
          payment_method: string | null
          payment_id: string | null
          order_status: string
          assigned_agent_id: string | null
          assigned_agent_name: string | null
          assigned_agent_phone: string | null
          preferred_pickup_date: string | null
          confirmed_pickup_date: string | null
          pickup_time_slot: string | null
          sample_collected_at: string | null
          sample_received_at: string | null
          lab_started_at: string | null
          report_generated_at: string | null
          report_url: string | null
          report_file_path: string | null
          lab_name: string | null
          structured_results: Json | null
          internal_notes: string | null
          additional_notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          order_number?: string
          user_id: string
          farmer_name: string
          mobile: string
          email?: string | null
          farm_name?: string | null
          address: string
          state: string
          district: string
          village?: string | null
          pincode?: string | null
          latitude?: number | null
          longitude?: number | null
          farm_size?: number | null
          farm_size_unit?: string | null
          crop?: string | null
          crop_stage?: string | null
          test_type: string
          sample_quantity?: string | null
          pickup_required?: boolean
          pickup_fee?: number
          test_price?: number
          total_amount?: number
          payment_status?: string
          payment_method?: string | null
          payment_id?: string | null
          order_status?: string
          assigned_agent_id?: string | null
          assigned_agent_name?: string | null
          assigned_agent_phone?: string | null
          preferred_pickup_date?: string | null
          confirmed_pickup_date?: string | null
          pickup_time_slot?: string | null
          sample_collected_at?: string | null
          sample_received_at?: string | null
          lab_started_at?: string | null
          report_generated_at?: string | null
          report_url?: string | null
          report_file_path?: string | null
          lab_name?: string | null
          structured_results?: Json | null
          internal_notes?: string | null
          additional_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          order_number?: string
          user_id?: string
          farmer_name?: string
          mobile?: string
          email?: string | null
          farm_name?: string | null
          address?: string
          state?: string
          district?: string
          village?: string | null
          pincode?: string | null
          latitude?: number | null
          longitude?: number | null
          farm_size?: number | null
          farm_size_unit?: string | null
          crop?: string | null
          crop_stage?: string | null
          test_type?: string
          sample_quantity?: string | null
          pickup_required?: boolean
          pickup_fee?: number
          test_price?: number
          total_amount?: number
          payment_status?: string
          payment_method?: string | null
          payment_id?: string | null
          order_status?: string
          assigned_agent_id?: string | null
          assigned_agent_name?: string | null
          assigned_agent_phone?: string | null
          preferred_pickup_date?: string | null
          confirmed_pickup_date?: string | null
          pickup_time_slot?: string | null
          sample_collected_at?: string | null
          sample_received_at?: string | null
          lab_started_at?: string | null
          report_generated_at?: string | null
          report_url?: string | null
          report_file_path?: string | null
          lab_name?: string | null
          structured_results?: Json | null
          internal_notes?: string | null
          additional_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      soil_test_status_history: {
        Row: {
          id: string
          soil_test_order_id: string
          previous_status: string | null
          new_status: string
          changed_by: string | null
          changed_by_name: string | null
          note: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          soil_test_order_id: string
          previous_status?: string | null
          new_status: string
          changed_by?: string | null
          changed_by_name?: string | null
          note?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          soil_test_order_id?: string
          previous_status?: string | null
          new_status?: string
          changed_by?: string | null
          changed_by_name?: string | null
          note?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "soil_test_status_history_soil_test_order_id_fkey"
            columns: ["soil_test_order_id"]
            isOneToOne: false
            referencedRelation: "soil_test_orders"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ai_log_usage: {
        Args: {
          p_user_id: string
          p_feature: string
          p_provider?: string
          p_model?: string
          p_tokens_in?: number
          p_tokens_out?: number
          p_images?: number
          p_duration_ms?: number
        }
        Returns: Json
      }
      admin_get_dashboard_kpis: { Args: never; Returns: Json }
      admin_wallets_list: { Args: never; Returns: Json }
      get_seller_display_name: {
        Args: { seller_user_id: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      wallet_add_money_check: { Args: { p_amount: number }; Returns: Json }
      wallet_admin_adjust: {
        Args: { p_amount: number; p_direction: string; p_reason: string; p_user_id: string }
        Returns: Json
      }
      wallet_credit_verified: {
        Args: {
          p_credit_type?: string
          p_description?: string
          p_amount: number
          p_reference_id: string
          p_reference_type: string
          p_source?: string
          p_user_id: string
        }
        Returns: Json
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
