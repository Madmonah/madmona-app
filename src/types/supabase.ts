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
      _agent_registry_backup_20260609: {
        Row: {
          agent_name: string | null
          config: Json | null
          created_at: string | null
          description: string | null
          display_name: string | null
          enabled: boolean | null
          error_count: number | null
          last_run_at: string | null
          next_run_at: string | null
          run_count: number | null
          schedule_cron: string | null
          success_count: number | null
          team: string | null
          updated_at: string | null
        }
        Insert: {
          agent_name?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          enabled?: boolean | null
          error_count?: number | null
          last_run_at?: string | null
          next_run_at?: string | null
          run_count?: number | null
          schedule_cron?: string | null
          success_count?: number | null
          team?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_name?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          enabled?: boolean | null
          error_count?: number | null
          last_run_at?: string | null
          next_run_at?: string | null
          run_count?: number | null
          schedule_cron?: string | null
          success_count?: number | null
          team?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _agent_registry_legacy_backup_20260603: {
        Row: {
          agent_name: string | null
          config: Json | null
          created_at: string | null
          description: string | null
          display_name: string | null
          enabled: boolean | null
          error_count: number | null
          last_run_at: string | null
          next_run_at: string | null
          run_count: number | null
          schedule_cron: string | null
          success_count: number | null
          team: string | null
          updated_at: string | null
        }
        Insert: {
          agent_name?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          enabled?: boolean | null
          error_count?: number | null
          last_run_at?: string | null
          next_run_at?: string | null
          run_count?: number | null
          schedule_cron?: string | null
          success_count?: number | null
          team?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_name?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          enabled?: boolean | null
          error_count?: number | null
          last_run_at?: string | null
          next_run_at?: string | null
          run_count?: number | null
          schedule_cron?: string | null
          success_count?: number | null
          team?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_20260609_clinic_leads: {
        Row: {
          address: string | null
          area: string | null
          branches_count: number | null
          city: string | null
          contact_attempts: number | null
          created_at: string | null
          has_website: boolean | null
          has_whatsapp: boolean | null
          id: string | null
          insurance_partners: string[] | null
          last_contacted_at: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          notes: string | null
          onboarded_supplier_id: string | null
          phone: string | null
          place_id: string | null
          rating: number | null
          source: string | null
          specialty: string | null
          specialty_ar: string | null
          status: string | null
          updated_at: string | null
          user_ratings_total: number | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          branches_count?: number | null
          city?: string | null
          contact_attempts?: number | null
          created_at?: string | null
          has_website?: boolean | null
          has_whatsapp?: boolean | null
          id?: string | null
          insurance_partners?: string[] | null
          last_contacted_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          notes?: string | null
          onboarded_supplier_id?: string | null
          phone?: string | null
          place_id?: string | null
          rating?: number | null
          source?: string | null
          specialty?: string | null
          specialty_ar?: string | null
          status?: string | null
          updated_at?: string | null
          user_ratings_total?: number | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          branches_count?: number | null
          city?: string | null
          contact_attempts?: number | null
          created_at?: string | null
          has_website?: boolean | null
          has_whatsapp?: boolean | null
          id?: string | null
          insurance_partners?: string[] | null
          last_contacted_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          notes?: string | null
          onboarded_supplier_id?: string | null
          phone?: string | null
          place_id?: string | null
          rating?: number | null
          source?: string | null
          specialty?: string | null
          specialty_ar?: string | null
          status?: string | null
          updated_at?: string | null
          user_ratings_total?: number | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      _backup_20260609_cold_leads: {
        Row: {
          added_at: string | null
          added_by: string | null
          business_name: string | null
          category: string | null
          city: string | null
          contact_count: number | null
          email: string | null
          id: string | null
          last_contacted: string | null
          location: string | null
          notes: string | null
          phone: string | null
          rating: number | null
          review_count: number | null
          source: string | null
          source_url: string | null
          status: string | null
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          business_name?: string | null
          category?: string | null
          city?: string | null
          contact_count?: number | null
          email?: string | null
          id?: string | null
          last_contacted?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          rating?: number | null
          review_count?: number | null
          source?: string | null
          source_url?: string | null
          status?: string | null
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          business_name?: string | null
          category?: string | null
          city?: string | null
          contact_count?: number | null
          email?: string | null
          id?: string | null
          last_contacted?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          rating?: number | null
          review_count?: number | null
          source?: string | null
          source_url?: string | null
          status?: string | null
        }
        Relationships: []
      }
      _backup_20260609_content_calendar: {
        Row: {
          agent_name: string | null
          body: string | null
          canva_design_id: string | null
          canva_design_url: string | null
          category: string | null
          content_type: string | null
          created_at: string | null
          cta: string | null
          design_brief: string | null
          external_post_id: string | null
          external_url: string | null
          hashtags: string[] | null
          id: string | null
          image_source: string | null
          image_url: string | null
          language: string | null
          metadata: Json | null
          performance: Json | null
          published_at: string | null
          scheduled_for: string | null
          status: string | null
          title: string | null
          visual_status: string | null
        }
        Insert: {
          agent_name?: string | null
          body?: string | null
          canva_design_id?: string | null
          canva_design_url?: string | null
          category?: string | null
          content_type?: string | null
          created_at?: string | null
          cta?: string | null
          design_brief?: string | null
          external_post_id?: string | null
          external_url?: string | null
          hashtags?: string[] | null
          id?: string | null
          image_source?: string | null
          image_url?: string | null
          language?: string | null
          metadata?: Json | null
          performance?: Json | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: string | null
          title?: string | null
          visual_status?: string | null
        }
        Update: {
          agent_name?: string | null
          body?: string | null
          canva_design_id?: string | null
          canva_design_url?: string | null
          category?: string | null
          content_type?: string | null
          created_at?: string | null
          cta?: string | null
          design_brief?: string | null
          external_post_id?: string | null
          external_url?: string | null
          hashtags?: string[] | null
          id?: string | null
          image_source?: string | null
          image_url?: string | null
          language?: string | null
          metadata?: Json | null
          performance?: Json | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: string | null
          title?: string | null
          visual_status?: string | null
        }
        Relationships: []
      }
      _backup_20260609_reel_scripts: {
        Row: {
          agent_name: string | null
          caption: string | null
          category: string | null
          created_at: string | null
          cta: string | null
          hashtags: string[] | null
          hook: string | null
          id: string | null
          listing_id: string | null
          music_suggestion: string | null
          scenes: Json | null
          shot_list: Json | null
          status: string | null
          title: string | null
          total_duration_sec: number | null
          trending_audio_id: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          agent_name?: string | null
          caption?: string | null
          category?: string | null
          created_at?: string | null
          cta?: string | null
          hashtags?: string[] | null
          hook?: string | null
          id?: string | null
          listing_id?: string | null
          music_suggestion?: string | null
          scenes?: Json | null
          shot_list?: Json | null
          status?: string | null
          title?: string | null
          total_duration_sec?: number | null
          trending_audio_id?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          agent_name?: string | null
          caption?: string | null
          category?: string | null
          created_at?: string | null
          cta?: string | null
          hashtags?: string[] | null
          hook?: string | null
          id?: string | null
          listing_id?: string | null
          music_suggestion?: string | null
          scenes?: Json | null
          shot_list?: Json | null
          status?: string | null
          title?: string | null
          total_duration_sec?: number | null
          trending_audio_id?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      _backup_20260609_restaurant_leads: {
        Row: {
          address: string | null
          area: string | null
          category: string | null
          created_at: string | null
          has_menu: boolean | null
          has_whatsapp: boolean | null
          id: string | null
          menu_url: string | null
          name: string | null
          phone: string | null
          place_id: string | null
          rating: number | null
          source: string | null
          status: string | null
          user_ratings_total: number | null
          website: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          category?: string | null
          created_at?: string | null
          has_menu?: boolean | null
          has_whatsapp?: boolean | null
          id?: string | null
          menu_url?: string | null
          name?: string | null
          phone?: string | null
          place_id?: string | null
          rating?: number | null
          source?: string | null
          status?: string | null
          user_ratings_total?: number | null
          website?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          category?: string | null
          created_at?: string | null
          has_menu?: boolean | null
          has_whatsapp?: boolean | null
          id?: string | null
          menu_url?: string | null
          name?: string | null
          phone?: string | null
          place_id?: string | null
          rating?: number | null
          source?: string | null
          status?: string | null
          user_ratings_total?: number | null
          website?: string | null
        }
        Relationships: []
      }
      _backup_20260609_sales_leads: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string | null
          intent: string | null
          interested_category: string | null
          interested_listing_id: string | null
          last_action_at: string | null
          lead_score: number | null
          metadata: Json | null
          notes: string | null
          source: string | null
          source_ref: string | null
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string | null
          intent?: string | null
          interested_category?: string | null
          interested_listing_id?: string | null
          last_action_at?: string | null
          lead_score?: number | null
          metadata?: Json | null
          notes?: string | null
          source?: string | null
          source_ref?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string | null
          intent?: string | null
          interested_category?: string | null
          interested_listing_id?: string | null
          last_action_at?: string | null
          lead_score?: number | null
          metadata?: Json | null
          notes?: string | null
          source?: string | null
          source_ref?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_20260609_social_pack_posts: {
        Row: {
          copied_at: string | null
          created_at: string | null
          external_post_url: string | null
          group_id: string | null
          id: string | null
          notes: string | null
          pack_id: string | null
          post_text: string | null
          posted_at: string | null
          posted_by: string | null
          status: string | null
        }
        Insert: {
          copied_at?: string | null
          created_at?: string | null
          external_post_url?: string | null
          group_id?: string | null
          id?: string | null
          notes?: string | null
          pack_id?: string | null
          post_text?: string | null
          posted_at?: string | null
          posted_by?: string | null
          status?: string | null
        }
        Update: {
          copied_at?: string | null
          created_at?: string | null
          external_post_url?: string | null
          group_id?: string | null
          id?: string | null
          notes?: string | null
          pack_id?: string | null
          post_text?: string | null
          posted_at?: string | null
          posted_by?: string | null
          status?: string | null
        }
        Relationships: []
      }
      _backup_20260611_agent_registry_old: {
        Row: {
          agent_name: string | null
          config: Json | null
          created_at: string | null
          description: string | null
          display_name: string | null
          enabled: boolean | null
          error_count: number | null
          last_run_at: string | null
          next_run_at: string | null
          run_count: number | null
          schedule_cron: string | null
          success_count: number | null
          team: string | null
          updated_at: string | null
        }
        Insert: {
          agent_name?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          enabled?: boolean | null
          error_count?: number | null
          last_run_at?: string | null
          next_run_at?: string | null
          run_count?: number | null
          schedule_cron?: string | null
          success_count?: number | null
          team?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_name?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          enabled?: boolean | null
          error_count?: number | null
          last_run_at?: string | null
          next_run_at?: string | null
          run_count?: number | null
          schedule_cron?: string | null
          success_count?: number | null
          team?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_20260615_tagamoa_login_accounts: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string | null
          last_login_at: string | null
          phone_normalized: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          last_login_at?: string | null
          phone_normalized?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          last_login_at?: string | null
          phone_normalized?: string | null
        }
        Relationships: []
      }
      _backup_20260704_unclaimed_directory_flip: {
        Row: {
          id: string | null
        }
        Insert: {
          id?: string | null
        }
        Update: {
          id?: string | null
        }
        Relationships: []
      }
      _backup_20260705_platform_seeded_flip: {
        Row: {
          id: string | null
        }
        Insert: {
          id?: string | null
        }
        Update: {
          id?: string | null
        }
        Relationships: []
      }
      _backup_20260722_indicative_menu_items: {
        Row: {
          category: string | null
          created_at: string | null
          currency: string | null
          description_ar: string | null
          description_en: string | null
          display_order: number | null
          id: string | null
          is_available: boolean | null
          listing_id: string | null
          name_ar: string | null
          name_en: string | null
          photo_url: string | null
          price: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          id?: string | null
          is_available?: boolean | null
          listing_id?: string | null
          name_ar?: string | null
          name_en?: string | null
          photo_url?: string | null
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          id?: string | null
          is_available?: boolean | null
          listing_id?: string | null
          name_ar?: string | null
          name_en?: string | null
          photo_url?: string | null
          price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_20260722_indicative_menu_sizes: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string | null
          is_available: boolean | null
          menu_item_id: string | null
          name_ar: string | null
          price: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_available?: boolean | null
          menu_item_id?: string | null
          name_ar?: string | null
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_available?: boolean | null
          menu_item_id?: string | null
          name_ar?: string | null
          price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_20260722_indicative_order_items: {
        Row: {
          created_at: string | null
          description_snapshot: string | null
          id: string | null
          item_notes: string | null
          line_total: number | null
          listing_id: string | null
          mart_product_id: string | null
          menu_item_id: string | null
          menu_size_id: string | null
          name_snapshot: string | null
          order_id: string | null
          photo_snapshot: string | null
          quantity: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          description_snapshot?: string | null
          id?: string | null
          item_notes?: string | null
          line_total?: number | null
          listing_id?: string | null
          mart_product_id?: string | null
          menu_item_id?: string | null
          menu_size_id?: string | null
          name_snapshot?: string | null
          order_id?: string | null
          photo_snapshot?: string | null
          quantity?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          description_snapshot?: string | null
          id?: string | null
          item_notes?: string | null
          line_total?: number | null
          listing_id?: string | null
          mart_product_id?: string | null
          menu_item_id?: string | null
          menu_size_id?: string | null
          name_snapshot?: string | null
          order_id?: string | null
          photo_snapshot?: string | null
          quantity?: number | null
          unit_price?: number | null
        }
        Relationships: []
      }
      _backup_agent_registry_20260705: {
        Row: {
          agent_name: string | null
          config: Json | null
          created_at: string | null
          description: string | null
          display_name: string | null
          enabled: boolean | null
          error_count: number | null
          last_run_at: string | null
          next_run_at: string | null
          run_count: number | null
          schedule_cron: string | null
          success_count: number | null
          team: string | null
          updated_at: string | null
        }
        Insert: {
          agent_name?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          enabled?: boolean | null
          error_count?: number | null
          last_run_at?: string | null
          next_run_at?: string | null
          run_count?: number | null
          schedule_cron?: string | null
          success_count?: number | null
          team?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_name?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          enabled?: boolean | null
          error_count?: number | null
          last_run_at?: string | null
          next_run_at?: string | null
          run_count?: number | null
          schedule_cron?: string | null
          success_count?: number | null
          team?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_apex_drafts_20260722: {
        Row: {
          account_type: string | null
          address: string | null
          attributes: Json | null
          business_name: string | null
          category_id: string | null
          category_slug: string | null
          city: string | null
          claim_token: string | null
          claimed_at: string | null
          claimed_by_profile_id: string | null
          cold_lead_id: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          conversation_id: string | null
          converted_listing_id: string | null
          created_at: string | null
          currency: string | null
          current_step: number | null
          description: string | null
          district: string | null
          expires_at: string | null
          id: string | null
          ip_address: string | null
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          photos: Json | null
          price: number | null
          price_period: string | null
          pricing_tiers: Json | null
          source: string | null
          status: string | null
          title: string | null
          total_steps: number | null
          updated_at: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          account_type?: string | null
          address?: string | null
          attributes?: Json | null
          business_name?: string | null
          category_id?: string | null
          category_slug?: string | null
          city?: string | null
          claim_token?: string | null
          claimed_at?: string | null
          claimed_by_profile_id?: string | null
          cold_lead_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          converted_listing_id?: string | null
          created_at?: string | null
          currency?: string | null
          current_step?: number | null
          description?: string | null
          district?: string | null
          expires_at?: string | null
          id?: string | null
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          photos?: Json | null
          price?: number | null
          price_period?: string | null
          pricing_tiers?: Json | null
          source?: string | null
          status?: string | null
          title?: string | null
          total_steps?: number | null
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          account_type?: string | null
          address?: string | null
          attributes?: Json | null
          business_name?: string | null
          category_id?: string | null
          category_slug?: string | null
          city?: string | null
          claim_token?: string | null
          claimed_at?: string | null
          claimed_by_profile_id?: string | null
          cold_lead_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          converted_listing_id?: string | null
          created_at?: string | null
          currency?: string | null
          current_step?: number | null
          description?: string | null
          district?: string | null
          expires_at?: string | null
          id?: string | null
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          photos?: Json | null
          price?: number | null
          price_period?: string | null
          pricing_tiers?: Json | null
          source?: string | null
          status?: string | null
          title?: string | null
          total_steps?: number | null
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      _backup_bourse_cover_logo_20260728: {
        Row: {
          developer: string | null
          id: string | null
          old_cover: string | null
          title: string | null
        }
        Insert: {
          developer?: string | null
          id?: string | null
          old_cover?: string | null
          title?: string | null
        }
        Update: {
          developer?: string | null
          id?: string | null
          old_cover?: string | null
          title?: string | null
        }
        Relationships: []
      }
      _backup_bourse_developer_fill_20260728: {
        Row: {
          backed_at: string | null
          id: string | null
          old_developer: string | null
          title: string | null
        }
        Insert: {
          backed_at?: string | null
          id?: string | null
          old_developer?: string | null
          title?: string | null
        }
        Update: {
          backed_at?: string | null
          id?: string | null
          old_developer?: string | null
          title?: string | null
        }
        Relationships: []
      }
      _backup_bourse_sync_listings_20260728: {
        Row: {
          created_at: string | null
          listing_id: string | null
          project_id: string | null
        }
        Insert: {
          created_at?: string | null
          listing_id?: string | null
          project_id?: string | null
        }
        Update: {
          created_at?: string | null
          listing_id?: string | null
          project_id?: string | null
        }
        Relationships: []
      }
      _backup_category_img_fill_20260728: {
        Row: {
          backed_at: string | null
          id: string | null
          name_ar: string | null
          old_image_url: string | null
          slug: string | null
          track: string | null
        }
        Insert: {
          backed_at?: string | null
          id?: string | null
          name_ar?: string | null
          old_image_url?: string | null
          slug?: string | null
          track?: string | null
        }
        Update: {
          backed_at?: string | null
          id?: string | null
          name_ar?: string | null
          old_image_url?: string | null
          slug?: string | null
          track?: string | null
        }
        Relationships: []
      }
      _backup_dup_listings_20260808: {
        Row: {
          accepts_insurance: boolean | null
          address: string | null
          advance_booking_days: number | null
          auto_accept_bookings: boolean | null
          available_addons: Json | null
          booking_deposit_pct: number | null
          bookings_count: number | null
          branches: Json | null
          brand: string | null
          cancellation_hours: number | null
          category_id: string | null
          city: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          description: string | null
          directory_source: string | null
          district: string | null
          id: string | null
          insurance_deposit_pct: number | null
          insurance_partners: string[] | null
          is_directory: boolean | null
          is_furnished: boolean | null
          latitude: number | null
          longitude: number | null
          max_booking_hours: number | null
          min_booking_hours: number | null
          model_name: string | null
          needs_photo_audit: boolean | null
          phone_verified_at: string | null
          price_egp: number | null
          price_on_request: boolean | null
          product_condition: string | null
          project_id: string | null
          published_at: string | null
          rating: number | null
          rejection_reason: string | null
          requires_id_verification: boolean | null
          requires_security_deposit: boolean | null
          reviews_count: number | null
          security_deposit_amount: number | null
          seller_type: string | null
          shipping_available: boolean | null
          shipping_cost: number | null
          slug: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["listing_status"] | null
          stock_quantity: number | null
          supplier_id: string | null
          title: string | null
          updated_at: string | null
          views_count: number | null
          wholesale_tiers: Json | null
        }
        Insert: {
          accepts_insurance?: boolean | null
          address?: string | null
          advance_booking_days?: number | null
          auto_accept_bookings?: boolean | null
          available_addons?: Json | null
          booking_deposit_pct?: number | null
          bookings_count?: number | null
          branches?: Json | null
          brand?: string | null
          cancellation_hours?: number | null
          category_id?: string | null
          city?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          directory_source?: string | null
          district?: string | null
          id?: string | null
          insurance_deposit_pct?: number | null
          insurance_partners?: string[] | null
          is_directory?: boolean | null
          is_furnished?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_booking_hours?: number | null
          min_booking_hours?: number | null
          model_name?: string | null
          needs_photo_audit?: boolean | null
          phone_verified_at?: string | null
          price_egp?: number | null
          price_on_request?: boolean | null
          product_condition?: string | null
          project_id?: string | null
          published_at?: string | null
          rating?: number | null
          rejection_reason?: string | null
          requires_id_verification?: boolean | null
          requires_security_deposit?: boolean | null
          reviews_count?: number | null
          security_deposit_amount?: number | null
          seller_type?: string | null
          shipping_available?: boolean | null
          shipping_cost?: number | null
          slug?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          stock_quantity?: number | null
          supplier_id?: string | null
          title?: string | null
          updated_at?: string | null
          views_count?: number | null
          wholesale_tiers?: Json | null
        }
        Update: {
          accepts_insurance?: boolean | null
          address?: string | null
          advance_booking_days?: number | null
          auto_accept_bookings?: boolean | null
          available_addons?: Json | null
          booking_deposit_pct?: number | null
          bookings_count?: number | null
          branches?: Json | null
          brand?: string | null
          cancellation_hours?: number | null
          category_id?: string | null
          city?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          directory_source?: string | null
          district?: string | null
          id?: string | null
          insurance_deposit_pct?: number | null
          insurance_partners?: string[] | null
          is_directory?: boolean | null
          is_furnished?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_booking_hours?: number | null
          min_booking_hours?: number | null
          model_name?: string | null
          needs_photo_audit?: boolean | null
          phone_verified_at?: string | null
          price_egp?: number | null
          price_on_request?: boolean | null
          product_condition?: string | null
          project_id?: string | null
          published_at?: string | null
          rating?: number | null
          rejection_reason?: string | null
          requires_id_verification?: boolean | null
          requires_security_deposit?: boolean | null
          reviews_count?: number | null
          security_deposit_amount?: number | null
          seller_type?: string | null
          shipping_available?: boolean | null
          shipping_cost?: number | null
          slug?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          stock_quantity?: number | null
          supplier_id?: string | null
          title?: string | null
          updated_at?: string | null
          views_count?: number | null
          wholesale_tiers?: Json | null
        }
        Relationships: []
      }
      _backup_dup_photos_20260808: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string | null
          is_placeholder: boolean | null
          is_primary: boolean | null
          listing_id: string | null
          quality_flag: string | null
          storage_path: string | null
          url: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_placeholder?: boolean | null
          is_primary?: boolean | null
          listing_id?: string | null
          quality_flag?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_placeholder?: boolean | null
          is_primary?: boolean | null
          listing_id?: string | null
          quality_flag?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Relationships: []
      }
      _backup_dup_pricing_20260808: {
        Row: {
          created_at: string | null
          currency: string | null
          display_order: number | null
          id: string | null
          is_active: boolean | null
          label_ar: string | null
          label_en: string | null
          listing_id: string | null
          max_periods: number | null
          min_periods: number | null
          period_count: number | null
          period_type: Database["public"]["Enums"]["pricing_period"] | null
          price: number | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          display_order?: number | null
          id?: string | null
          is_active?: boolean | null
          label_ar?: string | null
          label_en?: string | null
          listing_id?: string | null
          max_periods?: number | null
          min_periods?: number | null
          period_count?: number | null
          period_type?: Database["public"]["Enums"]["pricing_period"] | null
          price?: number | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          display_order?: number | null
          id?: string | null
          is_active?: boolean | null
          label_ar?: string | null
          label_en?: string | null
          listing_id?: string | null
          max_periods?: number | null
          min_periods?: number | null
          period_count?: number | null
          period_type?: Database["public"]["Enums"]["pricing_period"] | null
          price?: number | null
        }
        Relationships: []
      }
      _backup_green_logos_20260807: {
        Row: {
          business_name: string | null
          id: string | null
          logo_url: string | null
        }
        Insert: {
          business_name?: string | null
          id?: string | null
          logo_url?: string | null
        }
        Update: {
          business_name?: string | null
          id?: string | null
          logo_url?: string | null
        }
        Relationships: []
      }
      _backup_green_photos_20260807: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string | null
          is_placeholder: boolean | null
          is_primary: boolean | null
          listing_id: string | null
          quality_flag: string | null
          storage_path: string | null
          url: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_placeholder?: boolean | null
          is_primary?: boolean | null
          listing_id?: string | null
          quality_flag?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_placeholder?: boolean | null
          is_primary?: boolean | null
          listing_id?: string | null
          quality_flag?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Relationships: []
      }
      _backup_listing_city_20260806: {
        Row: {
          backed_up_at: string | null
          id: string | null
          old_city: string | null
        }
        Insert: {
          backed_up_at?: string | null
          id?: string | null
          old_city?: string | null
        }
        Update: {
          backed_up_at?: string | null
          id?: string | null
          old_city?: string | null
        }
        Relationships: []
      }
      _backup_listing_city_full_20260806: {
        Row: {
          backed_up_at: string | null
          id: string | null
          old_city: string | null
          old_district: string | null
        }
        Insert: {
          backed_up_at?: string | null
          id?: string | null
          old_city?: string | null
          old_district?: string | null
        }
        Update: {
          backed_up_at?: string | null
          id?: string | null
          old_city?: string | null
          old_district?: string | null
        }
        Relationships: []
      }
      _backup_listing_photos_20260804_stagea: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string | null
          is_placeholder: boolean | null
          is_primary: boolean | null
          listing_id: string | null
          quality_flag: string | null
          storage_path: string | null
          url: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_placeholder?: boolean | null
          is_primary?: boolean | null
          listing_id?: string | null
          quality_flag?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_placeholder?: boolean | null
          is_primary?: boolean | null
          listing_id?: string | null
          quality_flag?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Relationships: []
      }
      _backup_noprice_listings_20260705: {
        Row: {
          accepts_insurance: boolean | null
          address: string | null
          advance_booking_days: number | null
          auto_accept_bookings: boolean | null
          available_addons: Json | null
          booking_deposit_pct: number | null
          bookings_count: number | null
          branches: Json | null
          brand: string | null
          cancellation_hours: number | null
          category_id: string | null
          city: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          description: string | null
          directory_source: string | null
          district: string | null
          id: string | null
          insurance_deposit_pct: number | null
          insurance_partners: string[] | null
          is_directory: boolean | null
          latitude: number | null
          longitude: number | null
          max_booking_hours: number | null
          min_booking_hours: number | null
          model_name: string | null
          phone_verified_at: string | null
          price_egp: number | null
          price_on_request: boolean | null
          product_condition: string | null
          published_at: string | null
          rating: number | null
          rejection_reason: string | null
          requires_id_verification: boolean | null
          requires_security_deposit: boolean | null
          reviews_count: number | null
          security_deposit_amount: number | null
          shipping_available: boolean | null
          shipping_cost: number | null
          slug: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["listing_status"] | null
          stock_quantity: number | null
          supplier_id: string | null
          title: string | null
          updated_at: string | null
          views_count: number | null
          wholesale_tiers: Json | null
        }
        Insert: {
          accepts_insurance?: boolean | null
          address?: string | null
          advance_booking_days?: number | null
          auto_accept_bookings?: boolean | null
          available_addons?: Json | null
          booking_deposit_pct?: number | null
          bookings_count?: number | null
          branches?: Json | null
          brand?: string | null
          cancellation_hours?: number | null
          category_id?: string | null
          city?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          directory_source?: string | null
          district?: string | null
          id?: string | null
          insurance_deposit_pct?: number | null
          insurance_partners?: string[] | null
          is_directory?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_booking_hours?: number | null
          min_booking_hours?: number | null
          model_name?: string | null
          phone_verified_at?: string | null
          price_egp?: number | null
          price_on_request?: boolean | null
          product_condition?: string | null
          published_at?: string | null
          rating?: number | null
          rejection_reason?: string | null
          requires_id_verification?: boolean | null
          requires_security_deposit?: boolean | null
          reviews_count?: number | null
          security_deposit_amount?: number | null
          shipping_available?: boolean | null
          shipping_cost?: number | null
          slug?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          stock_quantity?: number | null
          supplier_id?: string | null
          title?: string | null
          updated_at?: string | null
          views_count?: number | null
          wholesale_tiers?: Json | null
        }
        Update: {
          accepts_insurance?: boolean | null
          address?: string | null
          advance_booking_days?: number | null
          auto_accept_bookings?: boolean | null
          available_addons?: Json | null
          booking_deposit_pct?: number | null
          bookings_count?: number | null
          branches?: Json | null
          brand?: string | null
          cancellation_hours?: number | null
          category_id?: string | null
          city?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          directory_source?: string | null
          district?: string | null
          id?: string | null
          insurance_deposit_pct?: number | null
          insurance_partners?: string[] | null
          is_directory?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_booking_hours?: number | null
          min_booking_hours?: number | null
          model_name?: string | null
          phone_verified_at?: string | null
          price_egp?: number | null
          price_on_request?: boolean | null
          product_condition?: string | null
          published_at?: string | null
          rating?: number | null
          rejection_reason?: string | null
          requires_id_verification?: boolean | null
          requires_security_deposit?: boolean | null
          reviews_count?: number | null
          security_deposit_amount?: number | null
          shipping_available?: boolean | null
          shipping_cost?: number | null
          slug?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          stock_quantity?: number | null
          supplier_id?: string | null
          title?: string | null
          updated_at?: string | null
          views_count?: number | null
          wholesale_tiers?: Json | null
        }
        Relationships: []
      }
      _backup_noprice_photos_20260705: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string | null
          is_primary: boolean | null
          listing_id: string | null
          storage_path: string | null
          url: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_primary?: boolean | null
          listing_id?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_primary?: boolean | null
          listing_id?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Relationships: []
      }
      _backup_paused_noprice_20260806: {
        Row: {
          category: string | null
          id: string | null
          old_status: string | null
          paused_at: string | null
          title: string | null
        }
        Insert: {
          category?: string | null
          id?: string | null
          old_status?: string | null
          paused_at?: string | null
          title?: string | null
        }
        Update: {
          category?: string | null
          id?: string | null
          old_status?: string | null
          paused_at?: string | null
          title?: string | null
        }
        Relationships: []
      }
      _backup_primary_swap_20260728: {
        Row: {
          listing_id: string | null
          new_primary: string | null
          old_primary: string | null
          swapped_at: string | null
        }
        Insert: {
          listing_id?: string | null
          new_primary?: string | null
          old_primary?: string | null
          swapped_at?: string | null
        }
        Update: {
          listing_id?: string | null
          new_primary?: string | null
          old_primary?: string | null
          swapped_at?: string | null
        }
        Relationships: []
      }
      _backup_re_photos_20260729: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string | null
          is_placeholder: boolean | null
          is_primary: boolean | null
          listing_id: string | null
          quality_flag: string | null
          storage_path: string | null
          url: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_placeholder?: boolean | null
          is_primary?: boolean | null
          listing_id?: string | null
          quality_flag?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_placeholder?: boolean | null
          is_primary?: boolean | null
          listing_id?: string | null
          quality_flag?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Relationships: []
      }
      _backup_re_pmi_cover_20260729: {
        Row: {
          area: string | null
          area_label: string | null
          booking_enabled: boolean | null
          booking_fee: number | null
          booking_fee_note: string | null
          brochure_url: string | null
          city: string | null
          commission_pct: number | null
          contact_phone: string | null
          cover_checked_at: string | null
          cover_url: string | null
          created_at: string | null
          delivery_label: string | null
          developer: string | null
          district: string | null
          embargo_note: string | null
          embargoed: boolean | null
          id: string | null
          info_missing: string | null
          info_requested_at: string | null
          is_active: boolean | null
          lat: number | null
          lng: number | null
          media: Json | null
          nawy_compound_id: number | null
          nawy_slug: string | null
          note: string | null
          payment_plan: string | null
          price_from: number | null
          price_to: number | null
          price_unit: string | null
          property_type: string | null
          segment: string | null
          slug: string | null
          sort_order: number | null
          source_lead_phone: string | null
          source_name: string | null
          status: string | null
          title: string | null
          unit_label: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          area?: string | null
          area_label?: string | null
          booking_enabled?: boolean | null
          booking_fee?: number | null
          booking_fee_note?: string | null
          brochure_url?: string | null
          city?: string | null
          commission_pct?: number | null
          contact_phone?: string | null
          cover_checked_at?: string | null
          cover_url?: string | null
          created_at?: string | null
          delivery_label?: string | null
          developer?: string | null
          district?: string | null
          embargo_note?: string | null
          embargoed?: boolean | null
          id?: string | null
          info_missing?: string | null
          info_requested_at?: string | null
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          media?: Json | null
          nawy_compound_id?: number | null
          nawy_slug?: string | null
          note?: string | null
          payment_plan?: string | null
          price_from?: number | null
          price_to?: number | null
          price_unit?: string | null
          property_type?: string | null
          segment?: string | null
          slug?: string | null
          sort_order?: number | null
          source_lead_phone?: string | null
          source_name?: string | null
          status?: string | null
          title?: string | null
          unit_label?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          area?: string | null
          area_label?: string | null
          booking_enabled?: boolean | null
          booking_fee?: number | null
          booking_fee_note?: string | null
          brochure_url?: string | null
          city?: string | null
          commission_pct?: number | null
          contact_phone?: string | null
          cover_checked_at?: string | null
          cover_url?: string | null
          created_at?: string | null
          delivery_label?: string | null
          developer?: string | null
          district?: string | null
          embargo_note?: string | null
          embargoed?: boolean | null
          id?: string | null
          info_missing?: string | null
          info_requested_at?: string | null
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          media?: Json | null
          nawy_compound_id?: number | null
          nawy_slug?: string | null
          note?: string | null
          payment_plan?: string | null
          price_from?: number | null
          price_to?: number | null
          price_unit?: string | null
          property_type?: string | null
          segment?: string | null
          slug?: string | null
          sort_order?: number | null
          source_lead_phone?: string | null
          source_name?: string | null
          status?: string | null
          title?: string | null
          unit_label?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      _backup_restaurant_logo_20260728: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string | null
          is_placeholder: boolean | null
          is_primary: boolean | null
          listing_id: string | null
          quality_flag: string | null
          storage_path: string | null
          url: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_placeholder?: boolean | null
          is_primary?: boolean | null
          listing_id?: string | null
          quality_flag?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_placeholder?: boolean | null
          is_primary?: boolean | null
          listing_id?: string | null
          quality_flag?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Relationships: []
      }
      _backup_stuck_listings_20260802: {
        Row: {
          accepts_insurance: boolean | null
          address: string | null
          advance_booking_days: number | null
          auto_accept_bookings: boolean | null
          available_addons: Json | null
          booking_deposit_pct: number | null
          bookings_count: number | null
          branches: Json | null
          brand: string | null
          cancellation_hours: number | null
          category_id: string | null
          city: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          description: string | null
          directory_source: string | null
          district: string | null
          id: string | null
          insurance_deposit_pct: number | null
          insurance_partners: string[] | null
          is_directory: boolean | null
          is_furnished: boolean | null
          latitude: number | null
          longitude: number | null
          max_booking_hours: number | null
          min_booking_hours: number | null
          model_name: string | null
          phone_verified_at: string | null
          price_egp: number | null
          price_on_request: boolean | null
          product_condition: string | null
          project_id: string | null
          published_at: string | null
          rating: number | null
          rejection_reason: string | null
          requires_id_verification: boolean | null
          requires_security_deposit: boolean | null
          reviews_count: number | null
          security_deposit_amount: number | null
          seller_type: string | null
          shipping_available: boolean | null
          shipping_cost: number | null
          slug: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["listing_status"] | null
          stock_quantity: number | null
          supplier_id: string | null
          title: string | null
          updated_at: string | null
          views_count: number | null
          wholesale_tiers: Json | null
        }
        Insert: {
          accepts_insurance?: boolean | null
          address?: string | null
          advance_booking_days?: number | null
          auto_accept_bookings?: boolean | null
          available_addons?: Json | null
          booking_deposit_pct?: number | null
          bookings_count?: number | null
          branches?: Json | null
          brand?: string | null
          cancellation_hours?: number | null
          category_id?: string | null
          city?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          directory_source?: string | null
          district?: string | null
          id?: string | null
          insurance_deposit_pct?: number | null
          insurance_partners?: string[] | null
          is_directory?: boolean | null
          is_furnished?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_booking_hours?: number | null
          min_booking_hours?: number | null
          model_name?: string | null
          phone_verified_at?: string | null
          price_egp?: number | null
          price_on_request?: boolean | null
          product_condition?: string | null
          project_id?: string | null
          published_at?: string | null
          rating?: number | null
          rejection_reason?: string | null
          requires_id_verification?: boolean | null
          requires_security_deposit?: boolean | null
          reviews_count?: number | null
          security_deposit_amount?: number | null
          seller_type?: string | null
          shipping_available?: boolean | null
          shipping_cost?: number | null
          slug?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          stock_quantity?: number | null
          supplier_id?: string | null
          title?: string | null
          updated_at?: string | null
          views_count?: number | null
          wholesale_tiers?: Json | null
        }
        Update: {
          accepts_insurance?: boolean | null
          address?: string | null
          advance_booking_days?: number | null
          auto_accept_bookings?: boolean | null
          available_addons?: Json | null
          booking_deposit_pct?: number | null
          bookings_count?: number | null
          branches?: Json | null
          brand?: string | null
          cancellation_hours?: number | null
          category_id?: string | null
          city?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          directory_source?: string | null
          district?: string | null
          id?: string | null
          insurance_deposit_pct?: number | null
          insurance_partners?: string[] | null
          is_directory?: boolean | null
          is_furnished?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_booking_hours?: number | null
          min_booking_hours?: number | null
          model_name?: string | null
          phone_verified_at?: string | null
          price_egp?: number | null
          price_on_request?: boolean | null
          product_condition?: string | null
          project_id?: string | null
          published_at?: string | null
          rating?: number | null
          rejection_reason?: string | null
          requires_id_verification?: boolean | null
          requires_security_deposit?: boolean | null
          reviews_count?: number | null
          security_deposit_amount?: number | null
          seller_type?: string | null
          shipping_available?: boolean | null
          shipping_cost?: number | null
          slug?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          stock_quantity?: number | null
          supplier_id?: string | null
          title?: string | null
          updated_at?: string | null
          views_count?: number | null
          wholesale_tiers?: Json | null
        }
        Relationships: []
      }
      _backup_talda_photos_20260804: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string | null
          is_placeholder: boolean | null
          is_primary: boolean | null
          listing_id: string | null
          quality_flag: string | null
          storage_path: string | null
          url: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_placeholder?: boolean | null
          is_primary?: boolean | null
          listing_id?: string | null
          quality_flag?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_placeholder?: boolean | null
          is_primary?: boolean | null
          listing_id?: string | null
          quality_flag?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Relationships: []
      }
      _backup_test_listings_20260722: {
        Row: {
          accepts_insurance: boolean | null
          address: string | null
          advance_booking_days: number | null
          auto_accept_bookings: boolean | null
          available_addons: Json | null
          booking_deposit_pct: number | null
          bookings_count: number | null
          branches: Json | null
          brand: string | null
          cancellation_hours: number | null
          category_id: string | null
          city: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          description: string | null
          directory_source: string | null
          district: string | null
          id: string | null
          insurance_deposit_pct: number | null
          insurance_partners: string[] | null
          is_directory: boolean | null
          latitude: number | null
          longitude: number | null
          max_booking_hours: number | null
          min_booking_hours: number | null
          model_name: string | null
          phone_verified_at: string | null
          price_egp: number | null
          price_on_request: boolean | null
          product_condition: string | null
          project_id: string | null
          published_at: string | null
          rating: number | null
          rejection_reason: string | null
          requires_id_verification: boolean | null
          requires_security_deposit: boolean | null
          reviews_count: number | null
          security_deposit_amount: number | null
          shipping_available: boolean | null
          shipping_cost: number | null
          slug: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["listing_status"] | null
          stock_quantity: number | null
          supplier_id: string | null
          title: string | null
          updated_at: string | null
          views_count: number | null
          wholesale_tiers: Json | null
        }
        Insert: {
          accepts_insurance?: boolean | null
          address?: string | null
          advance_booking_days?: number | null
          auto_accept_bookings?: boolean | null
          available_addons?: Json | null
          booking_deposit_pct?: number | null
          bookings_count?: number | null
          branches?: Json | null
          brand?: string | null
          cancellation_hours?: number | null
          category_id?: string | null
          city?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          directory_source?: string | null
          district?: string | null
          id?: string | null
          insurance_deposit_pct?: number | null
          insurance_partners?: string[] | null
          is_directory?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_booking_hours?: number | null
          min_booking_hours?: number | null
          model_name?: string | null
          phone_verified_at?: string | null
          price_egp?: number | null
          price_on_request?: boolean | null
          product_condition?: string | null
          project_id?: string | null
          published_at?: string | null
          rating?: number | null
          rejection_reason?: string | null
          requires_id_verification?: boolean | null
          requires_security_deposit?: boolean | null
          reviews_count?: number | null
          security_deposit_amount?: number | null
          shipping_available?: boolean | null
          shipping_cost?: number | null
          slug?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          stock_quantity?: number | null
          supplier_id?: string | null
          title?: string | null
          updated_at?: string | null
          views_count?: number | null
          wholesale_tiers?: Json | null
        }
        Update: {
          accepts_insurance?: boolean | null
          address?: string | null
          advance_booking_days?: number | null
          auto_accept_bookings?: boolean | null
          available_addons?: Json | null
          booking_deposit_pct?: number | null
          bookings_count?: number | null
          branches?: Json | null
          brand?: string | null
          cancellation_hours?: number | null
          category_id?: string | null
          city?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          directory_source?: string | null
          district?: string | null
          id?: string | null
          insurance_deposit_pct?: number | null
          insurance_partners?: string[] | null
          is_directory?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_booking_hours?: number | null
          min_booking_hours?: number | null
          model_name?: string | null
          phone_verified_at?: string | null
          price_egp?: number | null
          price_on_request?: boolean | null
          product_condition?: string | null
          project_id?: string | null
          published_at?: string | null
          rating?: number | null
          rejection_reason?: string | null
          requires_id_verification?: boolean | null
          requires_security_deposit?: boolean | null
          reviews_count?: number | null
          security_deposit_amount?: number | null
          shipping_available?: boolean | null
          shipping_cost?: number | null
          slug?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          stock_quantity?: number | null
          supplier_id?: string | null
          title?: string | null
          updated_at?: string | null
          views_count?: number | null
          wholesale_tiers?: Json | null
        }
        Relationships: []
      }
      _backup_test_mart_products_20260722: {
        Row: {
          barcode: string | null
          brand: string | null
          category: string | null
          compare_at_price: number | null
          created_at: string | null
          currency: string | null
          description_ar: string | null
          display_order: number | null
          erp_product_id: string | null
          erp_synced_at: string | null
          id: string | null
          in_stock: boolean | null
          is_available: boolean | null
          is_rx: boolean | null
          listing_id: string | null
          name_ar: string | null
          name_en: string | null
          photo_url: string | null
          price: number | null
          subcategory: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          currency?: string | null
          description_ar?: string | null
          display_order?: number | null
          erp_product_id?: string | null
          erp_synced_at?: string | null
          id?: string | null
          in_stock?: boolean | null
          is_available?: boolean | null
          is_rx?: boolean | null
          listing_id?: string | null
          name_ar?: string | null
          name_en?: string | null
          photo_url?: string | null
          price?: number | null
          subcategory?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          currency?: string | null
          description_ar?: string | null
          display_order?: number | null
          erp_product_id?: string | null
          erp_synced_at?: string | null
          id?: string | null
          in_stock?: boolean | null
          is_available?: boolean | null
          is_rx?: boolean | null
          listing_id?: string | null
          name_ar?: string | null
          name_en?: string | null
          photo_url?: string | null
          price?: number | null
          subcategory?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_test_menu_items_20260722: {
        Row: {
          category: string | null
          created_at: string | null
          currency: string | null
          description_ar: string | null
          description_en: string | null
          display_order: number | null
          id: string | null
          is_available: boolean | null
          listing_id: string | null
          name_ar: string | null
          name_en: string | null
          photo_url: string | null
          price: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          id?: string | null
          is_available?: boolean | null
          listing_id?: string | null
          name_ar?: string | null
          name_en?: string | null
          photo_url?: string | null
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          id?: string | null
          is_available?: boolean | null
          listing_id?: string | null
          name_ar?: string | null
          name_en?: string | null
          photo_url?: string | null
          price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_test_order_items_20260722: {
        Row: {
          created_at: string | null
          description_snapshot: string | null
          id: string | null
          item_notes: string | null
          line_total: number | null
          listing_id: string | null
          mart_product_id: string | null
          menu_item_id: string | null
          menu_size_id: string | null
          name_snapshot: string | null
          order_id: string | null
          photo_snapshot: string | null
          quantity: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          description_snapshot?: string | null
          id?: string | null
          item_notes?: string | null
          line_total?: number | null
          listing_id?: string | null
          mart_product_id?: string | null
          menu_item_id?: string | null
          menu_size_id?: string | null
          name_snapshot?: string | null
          order_id?: string | null
          photo_snapshot?: string | null
          quantity?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          description_snapshot?: string | null
          id?: string | null
          item_notes?: string | null
          line_total?: number | null
          listing_id?: string | null
          mart_product_id?: string | null
          menu_item_id?: string | null
          menu_size_id?: string | null
          name_snapshot?: string | null
          order_id?: string | null
          photo_snapshot?: string | null
          quantity?: number | null
          unit_price?: number | null
        }
        Relationships: []
      }
      _backup_test_orders_20260722: {
        Row: {
          accepted_at: string | null
          admin_notes: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          commission_amount: number | null
          commission_rate: number | null
          completed_at: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          customer_notes: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_district: string | null
          delivery_fee: number | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_notes: string | null
          delivery_phone: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string | null
          order_type: string | null
          out_for_delivery_at: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          preparing_at: string | null
          primary_listing_id: string | null
          ready_at: string | null
          reference_code: string | null
          status: Database["public"]["Enums"]["mp_order_status"] | null
          subtotal_amount: number | null
          supplier_id: string | null
          supplier_notes: string | null
          supplier_payout: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
          wallet_discount: number | null
        }
        Insert: {
          accepted_at?: string | null
          admin_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_district?: string | null
          delivery_fee?: number | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_notes?: string | null
          delivery_phone?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string | null
          order_type?: string | null
          out_for_delivery_at?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          preparing_at?: string | null
          primary_listing_id?: string | null
          ready_at?: string | null
          reference_code?: string | null
          status?: Database["public"]["Enums"]["mp_order_status"] | null
          subtotal_amount?: number | null
          supplier_id?: string | null
          supplier_notes?: string | null
          supplier_payout?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          wallet_discount?: number | null
        }
        Update: {
          accepted_at?: string | null
          admin_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_district?: string | null
          delivery_fee?: number | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_notes?: string | null
          delivery_phone?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string | null
          order_type?: string | null
          out_for_delivery_at?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          preparing_at?: string | null
          primary_listing_id?: string | null
          ready_at?: string | null
          reference_code?: string | null
          status?: Database["public"]["Enums"]["mp_order_status"] | null
          subtotal_amount?: number | null
          supplier_id?: string | null
          supplier_notes?: string | null
          supplier_payout?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          wallet_discount?: number | null
        }
        Relationships: []
      }
      _backup_test_photos_20260722: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string | null
          is_placeholder: boolean | null
          is_primary: boolean | null
          listing_id: string | null
          quality_flag: string | null
          storage_path: string | null
          url: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_placeholder?: boolean | null
          is_primary?: boolean | null
          listing_id?: string | null
          quality_flag?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          is_placeholder?: boolean | null
          is_primary?: boolean | null
          listing_id?: string | null
          quality_flag?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Relationships: []
      }
      _backup_test_supplier_integrations_20260722: {
        Row: {
          api_key: string | null
          created_at: string | null
          is_active: boolean | null
          last_delivery_at: string | null
          last_delivery_status: string | null
          supplier_id: string | null
          updated_at: string | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          is_active?: boolean | null
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          is_active?: boolean | null
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      _backup_test_suppliers_20260722: {
        Row: {
          account_type: string | null
          bookings_count: number | null
          business_name: string | null
          business_name_en: string | null
          commercial_registration: string | null
          commission_rate: number | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          has_erp_crm: boolean | null
          id: string | null
          is_partner: boolean | null
          kyc_documents: Json | null
          kyc_rejection_reason: string | null
          kyc_reviewed_at: string | null
          kyc_reviewed_by: string | null
          kyc_status: Database["public"]["Enums"]["supplier_kyc_status"] | null
          listings_count: number | null
          logo_url: string | null
          national_id: string | null
          profile_id: string | null
          rating: number | null
          reviews_count: number | null
          tax_id: string | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          account_type?: string | null
          bookings_count?: number | null
          business_name?: string | null
          business_name_en?: string | null
          commercial_registration?: string | null
          commission_rate?: number | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          has_erp_crm?: boolean | null
          id?: string | null
          is_partner?: boolean | null
          kyc_documents?: Json | null
          kyc_rejection_reason?: string | null
          kyc_reviewed_at?: string | null
          kyc_reviewed_by?: string | null
          kyc_status?: Database["public"]["Enums"]["supplier_kyc_status"] | null
          listings_count?: number | null
          logo_url?: string | null
          national_id?: string | null
          profile_id?: string | null
          rating?: number | null
          reviews_count?: number | null
          tax_id?: string | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          account_type?: string | null
          bookings_count?: number | null
          business_name?: string | null
          business_name_en?: string | null
          commercial_registration?: string | null
          commission_rate?: number | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          has_erp_crm?: boolean | null
          id?: string | null
          is_partner?: boolean | null
          kyc_documents?: Json | null
          kyc_rejection_reason?: string | null
          kyc_reviewed_at?: string | null
          kyc_reviewed_by?: string | null
          kyc_status?: Database["public"]["Enums"]["supplier_kyc_status"] | null
          listings_count?: number | null
          logo_url?: string | null
          national_id?: string | null
          profile_id?: string | null
          rating?: number | null
          reviews_count?: number | null
          tax_id?: string | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _content_manual_publish_backup_20260603: {
        Row: {
          agent_name: string | null
          body: string | null
          canva_design_id: string | null
          canva_design_url: string | null
          category: string | null
          content_type: string | null
          created_at: string | null
          cta: string | null
          design_brief: string | null
          external_post_id: string | null
          external_url: string | null
          hashtags: string[] | null
          id: string | null
          image_source: string | null
          image_url: string | null
          language: string | null
          metadata: Json | null
          performance: Json | null
          published_at: string | null
          scheduled_for: string | null
          status: string | null
          title: string | null
          visual_status: string | null
        }
        Insert: {
          agent_name?: string | null
          body?: string | null
          canva_design_id?: string | null
          canva_design_url?: string | null
          category?: string | null
          content_type?: string | null
          created_at?: string | null
          cta?: string | null
          design_brief?: string | null
          external_post_id?: string | null
          external_url?: string | null
          hashtags?: string[] | null
          id?: string | null
          image_source?: string | null
          image_url?: string | null
          language?: string | null
          metadata?: Json | null
          performance?: Json | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: string | null
          title?: string | null
          visual_status?: string | null
        }
        Update: {
          agent_name?: string | null
          body?: string | null
          canva_design_id?: string | null
          canva_design_url?: string | null
          category?: string | null
          content_type?: string | null
          created_at?: string | null
          cta?: string | null
          design_brief?: string | null
          external_post_id?: string | null
          external_url?: string | null
          hashtags?: string[] | null
          id?: string | null
          image_source?: string | null
          image_url?: string | null
          language?: string | null
          metadata?: Json | null
          performance?: Json | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: string | null
          title?: string | null
          visual_status?: string | null
        }
        Relationships: []
      }
      _cron_final_snapshot_20260802: {
        Row: {
          active: boolean | null
          command: string | null
          database: string | null
          jobid: number | null
          jobname: string | null
          nodename: string | null
          nodeport: number | null
          schedule: string | null
          snapshot_at: string | null
          username: string | null
        }
        Insert: {
          active?: boolean | null
          command?: string | null
          database?: string | null
          jobid?: number | null
          jobname?: string | null
          nodename?: string | null
          nodeport?: number | null
          schedule?: string | null
          snapshot_at?: string | null
          username?: string | null
        }
        Update: {
          active?: boolean | null
          command?: string | null
          database?: string | null
          jobid?: number | null
          jobname?: string | null
          nodename?: string | null
          nodeport?: number | null
          schedule?: string | null
          snapshot_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      _cron_pause_log: {
        Row: {
          id: number
          jobid: number | null
          jobname: string | null
          paused_at: string | null
          reason: string | null
          schedule: string | null
        }
        Insert: {
          id?: number
          jobid?: number | null
          jobname?: string | null
          paused_at?: string | null
          reason?: string | null
          schedule?: string | null
        }
        Update: {
          id?: number
          jobid?: number | null
          jobname?: string | null
          paused_at?: string | null
          reason?: string | null
          schedule?: string | null
        }
        Relationships: []
      }
      _cron_snapshot_20260603: {
        Row: {
          active: boolean | null
          command: string | null
          database: string | null
          jobid: number | null
          jobname: string | null
          nodename: string | null
          nodeport: number | null
          schedule: string | null
          snapshot_at: string | null
          username: string | null
        }
        Insert: {
          active?: boolean | null
          command?: string | null
          database?: string | null
          jobid?: number | null
          jobname?: string | null
          nodename?: string | null
          nodeport?: number | null
          schedule?: string | null
          snapshot_at?: string | null
          username?: string | null
        }
        Update: {
          active?: boolean | null
          command?: string | null
          database?: string | null
          jobid?: number | null
          jobname?: string | null
          nodename?: string | null
          nodeport?: number | null
          schedule?: string | null
          snapshot_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      _del_noprice_ids_20260705: {
        Row: {
          id: string
          kind: string | null
        }
        Insert: {
          id: string
          kind?: string | null
        }
        Update: {
          id?: string
          kind?: string | null
        }
        Relationships: []
      }
      _madmona_humans_backup_20260603: {
        Row: {
          agent_name: string | null
          auth_user_id: string | null
          avatar_initial: string | null
          birth_date: string | null
          branch_id: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          contract_type: string | null
          created_at: string | null
          dependents_count: number | null
          email: string | null
          employee_type: string | null
          full_name: string | null
          gender: string | null
          hired_at: string | null
          id: string | null
          insurance_enrolled_at: string | null
          is_disabled: boolean | null
          metadata: Json | null
          national_id: string | null
          permissions: Json | null
          personal_commission_rate: number | null
          phone: string | null
          pin_code: string | null
          probation_end_date: string | null
          reports_to_employee_id: string | null
          role: string | null
          role_ar: string | null
          salary_egp: number | null
          social_insurance_no: string | null
          status: string | null
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          agent_name?: string | null
          auth_user_id?: string | null
          avatar_initial?: string | null
          birth_date?: string | null
          branch_id?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          contract_type?: string | null
          created_at?: string | null
          dependents_count?: number | null
          email?: string | null
          employee_type?: string | null
          full_name?: string | null
          gender?: string | null
          hired_at?: string | null
          id?: string | null
          insurance_enrolled_at?: string | null
          is_disabled?: boolean | null
          metadata?: Json | null
          national_id?: string | null
          permissions?: Json | null
          personal_commission_rate?: number | null
          phone?: string | null
          pin_code?: string | null
          probation_end_date?: string | null
          reports_to_employee_id?: string | null
          role?: string | null
          role_ar?: string | null
          salary_egp?: number | null
          social_insurance_no?: string | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_name?: string | null
          auth_user_id?: string | null
          avatar_initial?: string | null
          birth_date?: string | null
          branch_id?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          contract_type?: string | null
          created_at?: string | null
          dependents_count?: number | null
          email?: string | null
          employee_type?: string | null
          full_name?: string | null
          gender?: string | null
          hired_at?: string | null
          id?: string | null
          insurance_enrolled_at?: string | null
          is_disabled?: boolean | null
          metadata?: Json | null
          national_id?: string | null
          permissions?: Json | null
          personal_commission_rate?: number | null
          phone?: string | null
          pin_code?: string | null
          probation_end_date?: string | null
          reports_to_employee_id?: string | null
          role?: string | null
          role_ar?: string | null
          salary_egp?: number | null
          social_insurance_no?: string | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _rehost_log: {
        Row: {
          at: string | null
          id: number
          kind: string | null
          new_url: string | null
          orig_url: string | null
          status: string | null
        }
        Insert: {
          at?: string | null
          id?: number
          kind?: string | null
          new_url?: string | null
          orig_url?: string | null
          status?: string | null
        }
        Update: {
          at?: string | null
          id?: number
          kind?: string | null
          new_url?: string | null
          orig_url?: string | null
          status?: string | null
        }
        Relationships: []
      }
      _rls_policy_backup_20260608: {
        Row: {
          backed_up_at: string | null
          cmd: string | null
          permissive: string | null
          policyname: unknown
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown
          tablename: unknown
          with_check: string | null
        }
        Insert: {
          backed_up_at?: string | null
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown
          tablename?: unknown
          with_check?: string | null
        }
        Update: {
          backed_up_at?: string | null
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown
          tablename?: unknown
          with_check?: string | null
        }
        Relationships: []
      }
      _wa_login_v2_staging: {
        Row: {
          content: string
          created_at: string | null
          filename: string
        }
        Insert: {
          content: string
          created_at?: string | null
          filename: string
        }
        Update: {
          content?: string
          created_at?: string | null
          filename?: string
        }
        Relationships: []
      }
      account_deletion_requests: {
        Row: {
          id: string
          note: string | null
          profile_id: string
          reason: string | null
          requested_at: string
          snapshot: Json | null
          status: string
        }
        Insert: {
          id?: string
          note?: string | null
          profile_id: string
          reason?: string | null
          requested_at?: string
          snapshot?: Json | null
          status?: string
        }
        Update: {
          id?: string
          note?: string | null
          profile_id?: string
          reason?: string | null
          requested_at?: string
          snapshot?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_deletion_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_creatives: {
        Row: {
          ad_type: string
          agent_name: string | null
          approved_at: string | null
          approved_by: string | null
          canva_design_id: string | null
          canva_design_url: string | null
          category: string | null
          clicks: number | null
          color_palette: string[] | null
          created_at: string | null
          cta_link: string | null
          cta_text: string | null
          description: string | null
          design_brief: Json | null
          hashtags: string[] | null
          headline: string | null
          id: string
          impressions: number | null
          leads_count: number | null
          listing_id: string | null
          primary_text: string | null
          spend_egp: number | null
          status: string | null
          thumbnail_url: string | null
          updated_at: string | null
          visual_concept: string | null
        }
        Insert: {
          ad_type?: string
          agent_name?: string | null
          approved_at?: string | null
          approved_by?: string | null
          canva_design_id?: string | null
          canva_design_url?: string | null
          category?: string | null
          clicks?: number | null
          color_palette?: string[] | null
          created_at?: string | null
          cta_link?: string | null
          cta_text?: string | null
          description?: string | null
          design_brief?: Json | null
          hashtags?: string[] | null
          headline?: string | null
          id?: string
          impressions?: number | null
          leads_count?: number | null
          listing_id?: string | null
          primary_text?: string | null
          spend_egp?: number | null
          status?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          visual_concept?: string | null
        }
        Update: {
          ad_type?: string
          agent_name?: string | null
          approved_at?: string | null
          approved_by?: string | null
          canva_design_id?: string | null
          canva_design_url?: string | null
          category?: string | null
          clicks?: number | null
          color_palette?: string[] | null
          created_at?: string | null
          cta_link?: string | null
          cta_text?: string | null
          description?: string | null
          design_brief?: Json | null
          hashtags?: string[] | null
          headline?: string | null
          id?: string
          impressions?: number | null
          leads_count?: number | null
          listing_id?: string | null
          primary_text?: string | null
          spend_egp?: number | null
          status?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          visual_concept?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_creatives_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "ad_creatives_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_creatives_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_creatives_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_creatives_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_rate_card: {
        Row: {
          created_at: string | null
          description_ar: string | null
          display_order: number | null
          duration: string
          id: string
          is_active: boolean | null
          name_ar: string
          placement: string
          price_egp: number
          slug: string
        }
        Insert: {
          created_at?: string | null
          description_ar?: string | null
          display_order?: number | null
          duration: string
          id?: string
          is_active?: boolean | null
          name_ar: string
          placement: string
          price_egp: number
          slug: string
        }
        Update: {
          created_at?: string | null
          description_ar?: string | null
          display_order?: number | null
          duration?: string
          id?: string
          is_active?: boolean | null
          name_ar?: string
          placement?: string
          price_egp?: number
          slug?: string
        }
        Relationships: []
      }
      ad_regen_runs: {
        Row: {
          ad_id: string
          completed_at: string | null
          created_at: string | null
          error: string | null
          id: number
          request_id: number
          status: string | null
        }
        Insert: {
          ad_id: string
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: number
          request_id: number
          status?: string | null
        }
        Update: {
          ad_id?: string
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: number
          request_id?: number
          status?: string | null
        }
        Relationships: []
      }
      admin_alerts: {
        Row: {
          action_url: string | null
          agent_name: string | null
          alert_type: string
          auto_action_at: string | null
          auto_action_taken: string | null
          created_at: string | null
          detail: Json | null
          id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source_kind: string | null
          status: string
          summary: string | null
          title: string
        }
        Insert: {
          action_url?: string | null
          agent_name?: string | null
          alert_type: string
          auto_action_at?: string | null
          auto_action_taken?: string | null
          created_at?: string | null
          detail?: Json | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_kind?: string | null
          status?: string
          summary?: string | null
          title: string
        }
        Update: {
          action_url?: string | null
          agent_name?: string | null
          alert_type?: string
          auto_action_at?: string | null
          auto_action_taken?: string | null
          created_at?: string | null
          detail?: Json | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_kind?: string | null
          status?: string
          summary?: string | null
          title?: string
        }
        Relationships: []
      }
      admin_directives: {
        Row: {
          created_at: string
          directive: string
          execution_note: string | null
          id: string
          message_type: string
          source_phone: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          directive: string
          execution_note?: string | null
          id?: string
          message_type?: string
          source_phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          directive?: string
          execution_note?: string | null
          id?: string
          message_type?: string
          source_phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_email_outbox: {
        Row: {
          attempts: number
          body_html: string | null
          body_text: string | null
          cc: string[] | null
          created_at: string
          error: string | null
          from_label: string | null
          id: string
          provider_request_id: number | null
          related_id: string | null
          reply_to: string | null
          scheduled_at: string
          sent_at: string | null
          source: string | null
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          attempts?: number
          body_html?: string | null
          body_text?: string | null
          cc?: string[] | null
          created_at?: string
          error?: string | null
          from_label?: string | null
          id?: string
          provider_request_id?: number | null
          related_id?: string | null
          reply_to?: string | null
          scheduled_at?: string
          sent_at?: string | null
          source?: string | null
          status?: string
          subject: string
          to_email: string
        }
        Update: {
          attempts?: number
          body_html?: string | null
          body_text?: string | null
          cc?: string[] | null
          created_at?: string
          error?: string | null
          from_label?: string | null
          id?: string
          provider_request_id?: number | null
          related_id?: string | null
          reply_to?: string | null
          scheduled_at?: string
          sent_at?: string | null
          source?: string | null
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: []
      }
      admin_news: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          id: string
          image_url: string | null
          is_pinned: boolean | null
          is_published: boolean | null
          link: string | null
          pub_date: string | null
          sort_order: number | null
          source_label: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean | null
          is_published?: boolean | null
          link?: string | null
          pub_date?: string | null
          sort_order?: number | null
          source_label?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean | null
          is_published?: boolean | null
          link?: string | null
          pub_date?: string | null
          sort_order?: number | null
          source_label?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      agency_brands: {
        Row: {
          active: boolean
          authorization_type: string
          brand_name: string
          contract_end: string | null
          contract_start: string | null
          country: string | null
          created_at: string
          id: string
          notes: string | null
          supplier_id: string
        }
        Insert: {
          active?: boolean
          authorization_type?: string
          brand_name: string
          contract_end?: string | null
          contract_start?: string | null
          country?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          supplier_id: string
        }
        Update: {
          active?: boolean
          authorization_type?: string
          brand_name?: string
          contract_end?: string | null
          contract_start?: string | null
          country?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_brands_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_brands_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "agency_brands_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      agent_alerts: {
        Row: {
          agent_name: string
          detail: Json | null
          email_queued: boolean | null
          fired_at: string
          id: string
          metadata: Json | null
          push_sent: boolean | null
          reason: string
          reason_code: string
          resolved_at: string | null
          severity: string
          suggested_action: string | null
          whatsapp_sent: boolean | null
        }
        Insert: {
          agent_name: string
          detail?: Json | null
          email_queued?: boolean | null
          fired_at?: string
          id?: string
          metadata?: Json | null
          push_sent?: boolean | null
          reason: string
          reason_code: string
          resolved_at?: string | null
          severity: string
          suggested_action?: string | null
          whatsapp_sent?: boolean | null
        }
        Update: {
          agent_name?: string
          detail?: Json | null
          email_queued?: boolean | null
          fired_at?: string
          id?: string
          metadata?: Json | null
          push_sent?: boolean | null
          reason?: string
          reason_code?: string
          resolved_at?: string | null
          severity?: string
          suggested_action?: string | null
          whatsapp_sent?: boolean | null
        }
        Relationships: []
      }
      agent_capabilities: {
        Row: {
          agent_name: string
          can_be_called_by_agents: boolean | null
          capability_name: string
          description: string | null
          id: string
          input_schema: Json | null
          output_schema: Json | null
        }
        Insert: {
          agent_name: string
          can_be_called_by_agents?: boolean | null
          capability_name: string
          description?: string | null
          id?: string
          input_schema?: Json | null
          output_schema?: Json | null
        }
        Update: {
          agent_name?: string
          can_be_called_by_agents?: boolean | null
          capability_name?: string
          description?: string | null
          id?: string
          input_schema?: Json | null
          output_schema?: Json | null
        }
        Relationships: []
      }
      agent_collaborations: {
        Row: {
          collaboration_name: string
          completed_at: string | null
          contributions: Json | null
          coordinator_agent: string | null
          created_at: string | null
          final_output: Json | null
          goal: string
          id: string
          participating_agents: string[] | null
          status: string | null
        }
        Insert: {
          collaboration_name: string
          completed_at?: string | null
          contributions?: Json | null
          coordinator_agent?: string | null
          created_at?: string | null
          final_output?: Json | null
          goal: string
          id?: string
          participating_agents?: string[] | null
          status?: string | null
        }
        Update: {
          collaboration_name?: string
          completed_at?: string | null
          contributions?: Json | null
          coordinator_agent?: string | null
          created_at?: string | null
          final_output?: Json | null
          goal?: string
          id?: string
          participating_agents?: string[] | null
          status?: string | null
        }
        Relationships: []
      }
      agent_directives: {
        Row: {
          created_at: string | null
          current_trend: string | null
          excluded_categories: string[] | null
          focus_areas: string[] | null
          id: string
          is_active: boolean | null
          scope: string
          target_audience: string | null
          tips_text: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          current_trend?: string | null
          excluded_categories?: string[] | null
          focus_areas?: string[] | null
          id?: string
          is_active?: boolean | null
          scope?: string
          target_audience?: string | null
          tips_text?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          current_trend?: string | null
          excluded_categories?: string[] | null
          focus_areas?: string[] | null
          id?: string
          is_active?: boolean | null
          scope?: string
          target_audience?: string | null
          tips_text?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      agent_improvements: {
        Row: {
          agent_name: string | null
          applied_to_version: number | null
          confidence: string | null
          created_at: string | null
          current_metric_summary: Json | null
          expected_impact: string | null
          id: string
          proposed_change_summary: string | null
          proposed_change_type: string | null
          proposed_prompt_diff: string | null
          status: string | null
          target_agent: string
          weakness_identified: string | null
        }
        Insert: {
          agent_name?: string | null
          applied_to_version?: number | null
          confidence?: string | null
          created_at?: string | null
          current_metric_summary?: Json | null
          expected_impact?: string | null
          id?: string
          proposed_change_summary?: string | null
          proposed_change_type?: string | null
          proposed_prompt_diff?: string | null
          status?: string | null
          target_agent: string
          weakness_identified?: string | null
        }
        Update: {
          agent_name?: string | null
          applied_to_version?: number | null
          confidence?: string | null
          created_at?: string | null
          current_metric_summary?: Json | null
          expected_impact?: string | null
          id?: string
          proposed_change_summary?: string | null
          proposed_change_type?: string | null
          proposed_prompt_diff?: string | null
          status?: string | null
          target_agent?: string
          weakness_identified?: string | null
        }
        Relationships: []
      }
      agent_insights: {
        Row: {
          actioned_at: string | null
          agent_name: string
          created_at: string
          data_points: Json | null
          description: string
          expires_at: string | null
          id: string
          insight_type: string
          priority: string
          recommended_action: string | null
          reviewed_at: string | null
          status: string
          title: string
        }
        Insert: {
          actioned_at?: string | null
          agent_name: string
          created_at?: string
          data_points?: Json | null
          description: string
          expires_at?: string | null
          id?: string
          insight_type: string
          priority: string
          recommended_action?: string | null
          reviewed_at?: string | null
          status?: string
          title: string
        }
        Update: {
          actioned_at?: string | null
          agent_name?: string
          created_at?: string
          data_points?: Json | null
          description?: string
          expires_at?: string | null
          id?: string
          insight_type?: string
          priority?: string
          recommended_action?: string | null
          reviewed_at?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      agent_messages: {
        Row: {
          context_data: Json | null
          created_at: string | null
          from_agent: string
          id: string
          message_type: string
          parent_message_id: string | null
          payload: Json
          priority: string | null
          processed_at: string | null
          responded_at: string | null
          response_payload: Json | null
          response_received: boolean | null
          response_required: boolean | null
          result: Json | null
          status: string | null
          subject: string | null
          thread_id: string | null
          to_agent: string
          workflow_id: string | null
        }
        Insert: {
          context_data?: Json | null
          created_at?: string | null
          from_agent: string
          id?: string
          message_type: string
          parent_message_id?: string | null
          payload: Json
          priority?: string | null
          processed_at?: string | null
          responded_at?: string | null
          response_payload?: Json | null
          response_received?: boolean | null
          response_required?: boolean | null
          result?: Json | null
          status?: string | null
          subject?: string | null
          thread_id?: string | null
          to_agent: string
          workflow_id?: string | null
        }
        Update: {
          context_data?: Json | null
          created_at?: string | null
          from_agent?: string
          id?: string
          message_type?: string
          parent_message_id?: string | null
          payload?: Json
          priority?: string | null
          processed_at?: string | null
          responded_at?: string | null
          response_payload?: Json | null
          response_received?: boolean | null
          response_required?: boolean | null
          result?: Json | null
          status?: string | null
          subject?: string | null
          thread_id?: string | null
          to_agent?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "agent_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_performance_metrics: {
        Row: {
          agent_name: string
          approval_rate: number | null
          avg_duration_ms: number | null
          computed_at: string | null
          error_count: number | null
          id: string
          metric_date: string | null
          outputs_actioned: number | null
          outputs_approved: number | null
          outputs_dismissed: number | null
          period: string
          runs_count: number | null
          success_count: number | null
          success_rate: number | null
          top_error_count: number | null
          top_error_message: string | null
          total_runs: number | null
        }
        Insert: {
          agent_name: string
          approval_rate?: number | null
          avg_duration_ms?: number | null
          computed_at?: string | null
          error_count?: number | null
          id?: string
          metric_date?: string | null
          outputs_actioned?: number | null
          outputs_approved?: number | null
          outputs_dismissed?: number | null
          period: string
          runs_count?: number | null
          success_count?: number | null
          success_rate?: number | null
          top_error_count?: number | null
          top_error_message?: string | null
          total_runs?: number | null
        }
        Update: {
          agent_name?: string
          approval_rate?: number | null
          avg_duration_ms?: number | null
          computed_at?: string | null
          error_count?: number | null
          id?: string
          metric_date?: string | null
          outputs_actioned?: number | null
          outputs_approved?: number | null
          outputs_dismissed?: number | null
          period?: string
          runs_count?: number | null
          success_count?: number | null
          success_rate?: number | null
          top_error_count?: number | null
          top_error_message?: string | null
          total_runs?: number | null
        }
        Relationships: []
      }
      agent_pipelines: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          name: string
          schedule_cron: string | null
          steps: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          schedule_cron?: string | null
          steps: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          schedule_cron?: string | null
          steps?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_registry: {
        Row: {
          agent_name: string
          config: Json
          created_at: string
          description: string | null
          display_name: string
          enabled: boolean
          error_count: number
          event_source: string | null
          last_run_at: string | null
          next_run_at: string | null
          run_count: number
          schedule_cron: string | null
          success_count: number
          team: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          agent_name: string
          config?: Json
          created_at?: string
          description?: string | null
          display_name: string
          enabled?: boolean
          error_count?: number
          event_source?: string | null
          last_run_at?: string | null
          next_run_at?: string | null
          run_count?: number
          schedule_cron?: string | null
          success_count?: number
          team: string
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          agent_name?: string
          config?: Json
          created_at?: string
          description?: string | null
          display_name?: string
          enabled?: boolean
          error_count?: number
          event_source?: string | null
          last_run_at?: string | null
          next_run_at?: string | null
          run_count?: number
          schedule_cron?: string | null
          success_count?: number
          team?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          agent_name: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          input_payload: Json | null
          output_summary: Json | null
          started_at: string
          status: string
          trigger_type: string
        }
        Insert: {
          agent_name: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_payload?: Json | null
          output_summary?: Json | null
          started_at?: string
          status?: string
          trigger_type: string
        }
        Update: {
          agent_name?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_payload?: Json | null
          output_summary?: Json | null
          started_at?: string
          status?: string
          trigger_type?: string
        }
        Relationships: []
      }
      agent_workflows: {
        Row: {
          created_at: string | null
          current_step: number | null
          final_output: Json | null
          finished_at: string | null
          goal: string
          id: string
          started_at: string | null
          status: string | null
          step_results: Json | null
          steps: Json
          triggered_by: string | null
          triggered_by_event: string | null
          workflow_name: string
        }
        Insert: {
          created_at?: string | null
          current_step?: number | null
          final_output?: Json | null
          finished_at?: string | null
          goal: string
          id?: string
          started_at?: string | null
          status?: string | null
          step_results?: Json | null
          steps: Json
          triggered_by?: string | null
          triggered_by_event?: string | null
          workflow_name: string
        }
        Update: {
          created_at?: string | null
          current_step?: number | null
          final_output?: Json | null
          finished_at?: string | null
          goal?: string
          id?: string
          started_at?: string | null
          status?: string | null
          step_results?: Json | null
          steps?: Json
          triggered_by?: string | null
          triggered_by_event?: string | null
          workflow_name?: string
        }
        Relationships: []
      }
      ai_assistant_chats: {
        Row: {
          agent_runs_created: string[] | null
          content: string
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          parsed_intent: Json | null
          role: string
          status: string | null
          user_id: string | null
          workflow_id: string | null
        }
        Insert: {
          agent_runs_created?: string[] | null
          content: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          parsed_intent?: Json | null
          role: string
          status?: string | null
          user_id?: string | null
          workflow_id?: string | null
        }
        Update: {
          agent_runs_created?: string[] | null
          content?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          parsed_intent?: Json | null
          role?: string
          status?: string | null
          user_id?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistant_chats_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "agent_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_billing_invoices: {
        Row: {
          amount_egp: number | null
          amount_usd: number
          created_at: string | null
          fx_rate: number
          id: string
          invoice_date: string
          note: string | null
          period_month: number | null
          period_year: number | null
          provider: string
        }
        Insert: {
          amount_egp?: number | null
          amount_usd?: number
          created_at?: string | null
          fx_rate?: number
          id?: string
          invoice_date?: string
          note?: string | null
          period_month?: number | null
          period_year?: number | null
          provider?: string
        }
        Update: {
          amount_egp?: number | null
          amount_usd?: number
          created_at?: string | null
          fx_rate?: number
          id?: string
          invoice_date?: string
          note?: string | null
          period_month?: number | null
          period_year?: number | null
          provider?: string
        }
        Relationships: []
      }
      ai_budget_guard: {
        Row: {
          daily_cap_usd: number
          guard_enabled: boolean
          halt_categories: string[]
          id: boolean
          last_halt_at: string | null
          updated_at: string
        }
        Insert: {
          daily_cap_usd?: number
          guard_enabled?: boolean
          halt_categories?: string[]
          id?: boolean
          last_halt_at?: string | null
          updated_at?: string
        }
        Update: {
          daily_cap_usd?: number
          guard_enabled?: boolean
          halt_categories?: string[]
          id?: boolean
          last_halt_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_credit_alerts: {
        Row: {
          alerted_at: string
          conversation_id: string | null
          error_text: string | null
          id: string
        }
        Insert: {
          alerted_at?: string
          conversation_id?: string | null
          error_text?: string | null
          id?: string
        }
        Update: {
          alerted_at?: string
          conversation_id?: string | null
          error_text?: string | null
          id?: string
        }
        Relationships: []
      }
      ai_model_pricing: {
        Row: {
          cache_read_per_mtok: number
          cache_write_1h: number
          cache_write_5m: number
          input_per_mtok: number
          model: string
          output_per_mtok: number
        }
        Insert: {
          cache_read_per_mtok: number
          cache_write_1h: number
          cache_write_5m: number
          input_per_mtok: number
          model: string
          output_per_mtok: number
        }
        Update: {
          cache_read_per_mtok?: number
          cache_write_1h?: number
          cache_write_5m?: number
          input_per_mtok?: number
          model?: string
          output_per_mtok?: number
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          agent_name: string
          cache_creation_input_tokens: number
          cache_read_input_tokens: number
          cache_ttl: string | null
          channel: string | null
          conversation_id: string | null
          created_at: string
          id: string
          input_tokens: number
          is_final: boolean | null
          latency_ms: number | null
          model: string
          output_tokens: number
          turn: number | null
        }
        Insert: {
          agent_name: string
          cache_creation_input_tokens?: number
          cache_read_input_tokens?: number
          cache_ttl?: string | null
          channel?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          input_tokens?: number
          is_final?: boolean | null
          latency_ms?: number | null
          model: string
          output_tokens?: number
          turn?: number | null
        }
        Update: {
          agent_name?: string
          cache_creation_input_tokens?: number
          cache_read_input_tokens?: number
          cache_ttl?: string | null
          channel?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          input_tokens?: number
          is_final?: boolean | null
          latency_ms?: number | null
          model?: string
          output_tokens?: number
          turn?: number | null
        }
        Relationships: []
      }
      anthropic_requests: {
        Row: {
          agent_name: string | null
          callback_function: string | null
          callback_invoked: boolean | null
          error_msg: string | null
          fired_at: string | null
          id: string
          input_payload: Json | null
          output: Json | null
          output_text: string | null
          processed_at: string | null
          purpose: string | null
          request_id: number | null
          status_code: number | null
        }
        Insert: {
          agent_name?: string | null
          callback_function?: string | null
          callback_invoked?: boolean | null
          error_msg?: string | null
          fired_at?: string | null
          id?: string
          input_payload?: Json | null
          output?: Json | null
          output_text?: string | null
          processed_at?: string | null
          purpose?: string | null
          request_id?: number | null
          status_code?: number | null
        }
        Update: {
          agent_name?: string | null
          callback_function?: string | null
          callback_invoked?: boolean | null
          error_msg?: string | null
          fired_at?: string | null
          id?: string
          input_payload?: Json | null
          output?: Json | null
          output_text?: string | null
          processed_at?: string | null
          purpose?: string | null
          request_id?: number | null
          status_code?: number | null
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      app_secrets: {
        Row: {
          created_at: string | null
          key: string
          value: string
        }
        Insert: {
          created_at?: string | null
          key: string
          value: string
        }
        Update: {
          created_at?: string | null
          key?: string
          value?: string
        }
        Relationships: []
      }
      ask_madmona_requests: {
        Row: {
          answer: string | null
          answered_at: string | null
          context_data: Json | null
          created_at: string | null
          id: string
          model: string | null
          question: string
          status: string | null
          tokens_used: number | null
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          context_data?: Json | null
          created_at?: string | null
          id?: string
          model?: string | null
          question: string
          status?: string | null
          tokens_used?: number | null
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          context_data?: Json | null
          created_at?: string | null
          id?: string
          model?: string | null
          question?: string
          status?: string | null
          tokens_used?: number | null
        }
        Relationships: []
      }
      asset_owners: {
        Row: {
          asset_id: string
          asset_type: string
          created_at: string
          id: string
          phone: string
          role: string
          source: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          asset_id: string
          asset_type: string
          created_at?: string
          id?: string
          phone: string
          role?: string
          source?: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          asset_id?: string
          asset_type?: string
          created_at?: string
          id?: string
          phone?: string
          role?: string
          source?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: []
      }
      attendance_devices: {
        Row: {
          active: boolean
          bound_at: string | null
          device_id: string
          employee_id: string
          id: string
          label: string | null
          last_seen_at: string | null
          supplier_id: string
        }
        Insert: {
          active?: boolean
          bound_at?: string | null
          device_id: string
          employee_id: string
          id?: string
          label?: string | null
          last_seen_at?: string | null
          supplier_id: string
        }
        Update: {
          active?: boolean
          bound_at?: string | null
          device_id?: string
          employee_id?: string
          id?: string
          label?: string | null
          last_seen_at?: string | null
          supplier_id?: string
        }
        Relationships: []
      }
      attendance_geofence_attempts: {
        Row: {
          accuracy_m: number | null
          attempted_at: string
          branch_code: string | null
          branch_id: string | null
          distance_m: number | null
          employee_id: string | null
          employee_name: string | null
          id: string
          identifier: string | null
          lat: number | null
          lng: number | null
          max_radius_m: number | null
          supplier_id: string
        }
        Insert: {
          accuracy_m?: number | null
          attempted_at?: string
          branch_code?: string | null
          branch_id?: string | null
          distance_m?: number | null
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          identifier?: string | null
          lat?: number | null
          lng?: number | null
          max_radius_m?: number | null
          supplier_id: string
        }
        Update: {
          accuracy_m?: number | null
          attempted_at?: string
          branch_code?: string | null
          branch_id?: string | null
          distance_m?: number | null
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          identifier?: string | null
          lat?: number | null
          lng?: number | null
          max_radius_m?: number | null
          supplier_id?: string
        }
        Relationships: []
      }
      attendance_logs: {
        Row: {
          branch_id: string | null
          break_minutes: number | null
          clock_in_at: string | null
          clock_in_distance_m: number | null
          clock_in_lat: number | null
          clock_in_lng: number | null
          clock_in_method: string | null
          clock_out_at: string | null
          clock_out_distance_m: number | null
          clock_out_lat: number | null
          clock_out_lng: number | null
          clock_out_method: string | null
          created_at: string | null
          date: string
          employee_id: string
          flagged_reason: string | null
          hours_worked: number | null
          id: string
          last_heartbeat_at: string | null
          notes: string | null
          recorded_by: string | null
          status: string | null
        }
        Insert: {
          branch_id?: string | null
          break_minutes?: number | null
          clock_in_at?: string | null
          clock_in_distance_m?: number | null
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_in_method?: string | null
          clock_out_at?: string | null
          clock_out_distance_m?: number | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          clock_out_method?: string | null
          created_at?: string | null
          date?: string
          employee_id: string
          flagged_reason?: string | null
          hours_worked?: number | null
          id?: string
          last_heartbeat_at?: string | null
          notes?: string | null
          recorded_by?: string | null
          status?: string | null
        }
        Update: {
          branch_id?: string | null
          break_minutes?: number | null
          clock_in_at?: string | null
          clock_in_distance_m?: number | null
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_in_method?: string | null
          clock_out_at?: string | null
          clock_out_distance_m?: number | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          clock_out_method?: string | null
          created_at?: string | null
          date?: string
          employee_id?: string
          flagged_reason?: string | null
          hours_worked?: number | null
          id?: string
          last_heartbeat_at?: string | null
          notes?: string | null
          recorded_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "attendance_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "attendance_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          branch_id: string | null
          clock_in_at: string | null
          clock_in_distance_m: number | null
          clock_in_lat: number | null
          clock_in_lng: number | null
          clock_in_method: string | null
          clock_out_at: string | null
          clock_out_distance_m: number | null
          clock_out_lat: number | null
          clock_out_lng: number | null
          created_at: string | null
          date: string
          employee_id: string
          hours_worked: number | null
          id: string
        }
        Insert: {
          branch_id?: string | null
          clock_in_at?: string | null
          clock_in_distance_m?: number | null
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_in_method?: string | null
          clock_out_at?: string | null
          clock_out_distance_m?: number | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          created_at?: string | null
          date?: string
          employee_id: string
          hours_worked?: number | null
          id?: string
        }
        Update: {
          branch_id?: string | null
          clock_in_at?: string | null
          clock_in_distance_m?: number | null
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_in_method?: string | null
          clock_out_at?: string | null
          clock_out_distance_m?: number | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          created_at?: string | null
          date?: string
          employee_id?: string
          hours_worked?: number | null
          id?: string
        }
        Relationships: []
      }
      attributes: {
        Row: {
          category_id: string
          created_at: string
          display_order: number
          field_key: string
          field_type: Database["public"]["Enums"]["attribute_type"]
          help_text: string | null
          id: string
          is_filterable: boolean
          is_required: boolean
          name_ar: string
          name_en: string | null
          options: Json
          placeholder: string | null
          unit: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          display_order?: number
          field_key: string
          field_type: Database["public"]["Enums"]["attribute_type"]
          help_text?: string | null
          id?: string
          is_filterable?: boolean
          is_required?: boolean
          name_ar: string
          name_en?: string | null
          options?: Json
          placeholder?: string | null
          unit?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          display_order?: number
          field_key?: string
          field_type?: Database["public"]["Enums"]["attribute_type"]
          help_text?: string | null
          id?: string
          is_filterable?: boolean
          is_required?: boolean
          name_ar?: string
          name_en?: string | null
          options?: Json
          placeholder?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attributes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attributes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_demand_view"
            referencedColumns: ["category_id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      availability: {
        Row: {
          booking_id: string | null
          created_at: string
          end_at: string
          id: string
          listing_id: string
          notes: string | null
          start_at: string
          status: Database["public"]["Enums"]["availability_status"]
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          end_at: string
          id?: string
          listing_id: string
          notes?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["availability_status"]
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          end_at?: string
          id?: string
          listing_id?: string
          notes?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["availability_status"]
        }
        Relationships: [
          {
            foreignKeyName: "availability_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "availability_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_availability_booking"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "marketplace_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_payments: {
        Row: {
          amount_paid_egp: number
          branch_id: string | null
          created_at: string | null
          id: string
          linked_transaction_id: string | null
          notes: string | null
          paid_at: string | null
          paid_by_employee_id: string | null
          payment_method: string | null
          period: string
          recorded_by: string | null
          recurring_bill_id: string
          reference_number: string | null
          supplier_id: string
        }
        Insert: {
          amount_paid_egp: number
          branch_id?: string | null
          created_at?: string | null
          id?: string
          linked_transaction_id?: string | null
          notes?: string | null
          paid_at?: string | null
          paid_by_employee_id?: string | null
          payment_method?: string | null
          period: string
          recorded_by?: string | null
          recurring_bill_id: string
          reference_number?: string | null
          supplier_id: string
        }
        Update: {
          amount_paid_egp?: number
          branch_id?: string | null
          created_at?: string | null
          id?: string
          linked_transaction_id?: string | null
          notes?: string | null
          paid_at?: string | null
          paid_by_employee_id?: string | null
          payment_method?: string | null
          period?: string
          recorded_by?: string | null
          recurring_bill_id?: string
          reference_number?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "bill_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "bill_payments_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_live_transactions_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_paid_by_employee_id_fkey"
            columns: ["paid_by_employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_paid_by_employee_id_fkey"
            columns: ["paid_by_employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "bill_payments_recurring_bill_id_fkey"
            columns: ["recurring_bill_id"]
            isOneToOne: false
            referencedRelation: "recurring_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "bill_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          category: string | null
          content_md: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string
          slug: string
          status: string
          title: string
        }
        Insert: {
          category?: string | null
          content_md: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string
          slug: string
          status?: string
          title: string
        }
        Update: {
          category?: string | null
          content_md?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string
          slug?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      booking_decisions: {
        Row: {
          agent_name: string | null
          booking_id: string | null
          confidence_score: number | null
          created_at: string | null
          customer_history_score: number | null
          decision: string
          id: string
          listing_match_score: number | null
          pricing_anomaly_check: boolean | null
          reasoning: string | null
          risk_factors: Json | null
        }
        Insert: {
          agent_name?: string | null
          booking_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          customer_history_score?: number | null
          decision: string
          id?: string
          listing_match_score?: number | null
          pricing_anomaly_check?: boolean | null
          reasoning?: string | null
          risk_factors?: Json | null
        }
        Update: {
          agent_name?: string | null
          booking_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          customer_history_score?: number | null
          decision?: string
          id?: string
          listing_match_score?: number | null
          pricing_anomaly_check?: boolean | null
          reasoning?: string | null
          risk_factors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_decisions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "marketplace_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_notifications: {
        Row: {
          booking_id: string
          created_at: string | null
          customer_name: string | null
          customer_phone: string
          error_message: string | null
          id: string
          message_content: string | null
          notification_type: string
          scheduled_for: string
          sent_at: string | null
          status: string | null
          supplier_id: string
          whatsapp_msg_id: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          customer_name?: string | null
          customer_phone: string
          error_message?: string | null
          id?: string
          message_content?: string | null
          notification_type: string
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          supplier_id: string
          whatsapp_msg_id?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string
          error_message?: string | null
          id?: string
          message_content?: string | null
          notification_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          supplier_id?: string
          whatsapp_msg_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "branch_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_notifications_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_notifications_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "booking_notifications_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      booking_waitlist: {
        Row: {
          branch_id: string
          converted_booking_id: string | null
          created_at: string | null
          customer_name: string
          customer_phone: string
          id: string
          notes: string | null
          notified_at: string | null
          preferred_date: string | null
          preferred_time_text: string | null
          service_id: string | null
          service_name_snapshot: string | null
          status: string
          supplier_id: string
        }
        Insert: {
          branch_id: string
          converted_booking_id?: string | null
          created_at?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          notes?: string | null
          notified_at?: string | null
          preferred_date?: string | null
          preferred_time_text?: string | null
          service_id?: string | null
          service_name_snapshot?: string | null
          status?: string
          supplier_id: string
        }
        Update: {
          branch_id?: string
          converted_booking_id?: string | null
          created_at?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          notes?: string | null
          notified_at?: string | null
          preferred_date?: string | null
          preferred_time_text?: string | null
          service_id?: string | null
          service_name_snapshot?: string | null
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_waitlist_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_waitlist_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "booking_waitlist_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "booking_waitlist_converted_booking_id_fkey"
            columns: ["converted_booking_id"]
            isOneToOne: false
            referencedRelation: "branch_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_waitlist_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_waitlist_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_waitlist_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "booking_waitlist_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      branch_bookings: {
        Row: {
          assigned_employee_id: string | null
          branch_id: string | null
          completed_at: string | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          deposit_egp: number | null
          deposit_pct: number | null
          deposit_status: string | null
          duration_minutes: number | null
          extra_services: Json | null
          id: string
          linked_transaction_id: string | null
          marketplace_booking_id: string | null
          notes: string | null
          payment_method: string | null
          prep_checklist: Json | null
          price_egp: number | null
          products: Json | null
          products_total_egp: number | null
          recorded_by: string | null
          scheduled_at: string | null
          service_id: string | null
          service_name_snapshot: string | null
          source: string
          status: string | null
          supplier_id: string
        }
        Insert: {
          assigned_employee_id?: string | null
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deposit_egp?: number | null
          deposit_pct?: number | null
          deposit_status?: string | null
          duration_minutes?: number | null
          extra_services?: Json | null
          id?: string
          linked_transaction_id?: string | null
          marketplace_booking_id?: string | null
          notes?: string | null
          payment_method?: string | null
          prep_checklist?: Json | null
          price_egp?: number | null
          products?: Json | null
          products_total_egp?: number | null
          recorded_by?: string | null
          scheduled_at?: string | null
          service_id?: string | null
          service_name_snapshot?: string | null
          source: string
          status?: string | null
          supplier_id: string
        }
        Update: {
          assigned_employee_id?: string | null
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deposit_egp?: number | null
          deposit_pct?: number | null
          deposit_status?: string | null
          duration_minutes?: number | null
          extra_services?: Json | null
          id?: string
          linked_transaction_id?: string | null
          marketplace_booking_id?: string | null
          notes?: string | null
          payment_method?: string | null
          prep_checklist?: Json | null
          price_egp?: number | null
          products?: Json | null
          products_total_egp?: number | null
          recorded_by?: string | null
          scheduled_at?: string | null
          service_id?: string | null
          service_name_snapshot?: string | null
          source?: string
          status?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_bookings_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_bookings_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "branch_bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "branch_bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "branch_bookings_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_bookings_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_live_transactions_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "branch_bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      branch_expenses: {
        Row: {
          amount_egp: number
          branch_id: string | null
          category: string
          created_at: string | null
          expense_date: string | null
          id: string
          metadata: Json | null
          notes: string | null
          payment_method: string | null
          receipt_url: string | null
          recorded_by: string | null
          supplier_id: string
          vendor_name: string | null
        }
        Insert: {
          amount_egp: number
          branch_id?: string | null
          category: string
          created_at?: string | null
          expense_date?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          supplier_id: string
          vendor_name?: string | null
        }
        Update: {
          amount_egp?: number
          branch_id?: string | null
          category?: string
          created_at?: string | null
          expense_date?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          supplier_id?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "branch_expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "branch_expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "branch_expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      branch_visit_sessions: {
        Row: {
          branch_id: string
          cart_items: Json | null
          completed_at: string | null
          customer_id: string | null
          id: string
          notes: string | null
          payment_method: string | null
          started_at: string | null
          status: string | null
          submitted_at: string | null
          subtotal_egp: number | null
          supplier_id: string
          total_egp: number | null
        }
        Insert: {
          branch_id: string
          cart_items?: Json | null
          completed_at?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          started_at?: string | null
          status?: string | null
          submitted_at?: string | null
          subtotal_egp?: number | null
          supplier_id: string
          total_egp?: number | null
        }
        Update: {
          branch_id?: string
          cart_items?: Json | null
          completed_at?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          started_at?: string | null
          status?: string | null
          submitted_at?: string | null
          subtotal_egp?: number | null
          supplier_id?: string
          total_egp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_visit_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_visit_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "branch_visit_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "branch_visit_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_visit_sessions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_visit_sessions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "branch_visit_sessions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      business_employees: {
        Row: {
          agent_name: string | null
          auth_user_id: string | null
          avatar_initial: string | null
          birth_date: string | null
          branch_id: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          contract_type: string | null
          created_at: string | null
          dependents_count: number | null
          email: string | null
          employee_type: string
          full_name: string
          gender: string | null
          hired_at: string | null
          id: string
          insurance_enrolled_at: string | null
          is_disabled: boolean | null
          metadata: Json | null
          national_id: string | null
          permissions: Json
          personal_commission_rate: number | null
          phone: string | null
          photo_url: string | null
          pin_code: string | null
          probation_end_date: string | null
          reports_to_employee_id: string | null
          role: string
          role_ar: string | null
          salary_egp: number | null
          social_insurance_no: string | null
          status: string | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          agent_name?: string | null
          auth_user_id?: string | null
          avatar_initial?: string | null
          birth_date?: string | null
          branch_id?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          contract_type?: string | null
          created_at?: string | null
          dependents_count?: number | null
          email?: string | null
          employee_type?: string
          full_name: string
          gender?: string | null
          hired_at?: string | null
          id?: string
          insurance_enrolled_at?: string | null
          is_disabled?: boolean | null
          metadata?: Json | null
          national_id?: string | null
          permissions?: Json
          personal_commission_rate?: number | null
          phone?: string | null
          photo_url?: string | null
          pin_code?: string | null
          probation_end_date?: string | null
          reports_to_employee_id?: string | null
          role: string
          role_ar?: string | null
          salary_egp?: number | null
          social_insurance_no?: string | null
          status?: string | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          agent_name?: string | null
          auth_user_id?: string | null
          avatar_initial?: string | null
          birth_date?: string | null
          branch_id?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          contract_type?: string | null
          created_at?: string | null
          dependents_count?: number | null
          email?: string | null
          employee_type?: string
          full_name?: string
          gender?: string | null
          hired_at?: string | null
          id?: string
          insurance_enrolled_at?: string | null
          is_disabled?: boolean | null
          metadata?: Json | null
          national_id?: string | null
          permissions?: Json
          personal_commission_rate?: number | null
          phone?: string | null
          photo_url?: string | null
          pin_code?: string | null
          probation_end_date?: string | null
          reports_to_employee_id?: string | null
          role?: string
          role_ar?: string | null
          salary_egp?: number | null
          social_insurance_no?: string | null
          status?: string | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "business_employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "business_employees_reports_to_employee_id_fkey"
            columns: ["reports_to_employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_reports_to_employee_id_fkey"
            columns: ["reports_to_employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "business_employees_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "business_employees_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      bz_advances: {
        Row: {
          advance_date: string | null
          amount: number
          created_at: string
          id: string
          notes: string | null
          person_name: string
          project_id: string | null
          reason: string | null
          repaid_amount: number
          status: string
          supplier_id: string
        }
        Insert: {
          advance_date?: string | null
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          person_name: string
          project_id?: string | null
          reason?: string | null
          repaid_amount?: number
          status?: string
          supplier_id: string
        }
        Update: {
          advance_date?: string | null
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          person_name?: string
          project_id?: string | null
          reason?: string | null
          repaid_amount?: number
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bz_advances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bz_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bz_assignments: {
        Row: {
          allowance_amount: number
          created_at: string
          end_date: string | null
          id: string
          location: string | null
          notes: string | null
          person_name: string
          project_id: string | null
          start_date: string | null
          status: string
          supplier_id: string
          task: string | null
        }
        Insert: {
          allowance_amount?: number
          created_at?: string
          end_date?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          person_name: string
          project_id?: string | null
          start_date?: string | null
          status?: string
          supplier_id: string
          task?: string | null
        }
        Update: {
          allowance_amount?: number
          created_at?: string
          end_date?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          person_name?: string
          project_id?: string | null
          start_date?: string | null
          status?: string
          supplier_id?: string
          task?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bz_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bz_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bz_boq_items: {
        Row: {
          amount: number | null
          created_at: string
          description: string
          executed_qty: number
          id: string
          item_no: string | null
          project_id: string
          quantity: number
          section: string | null
          sort_order: number
          supplier_id: string
          unit: string | null
          unit_price: number
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description: string
          executed_qty?: number
          id?: string
          item_no?: string | null
          project_id: string
          quantity?: number
          section?: string | null
          sort_order?: number
          supplier_id: string
          unit?: string | null
          unit_price?: number
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string
          executed_qty?: number
          id?: string
          item_no?: string | null
          project_id?: string
          quantity?: number
          section?: string | null
          sort_order?: number
          supplier_id?: string
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bz_boq_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bz_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bz_collections: {
        Row: {
          amount: number
          certificate_id: string | null
          collection_date: string | null
          created_at: string
          id: string
          method: string | null
          notes: string | null
          project_id: string | null
          reference: string | null
          supplier_id: string
        }
        Insert: {
          amount?: number
          certificate_id?: string | null
          collection_date?: string | null
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          project_id?: string | null
          reference?: string | null
          supplier_id: string
        }
        Update: {
          amount?: number
          certificate_id?: string | null
          collection_date?: string | null
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          project_id?: string | null
          reference?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bz_collections_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "bz_payment_certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bz_collections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bz_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bz_company_docs: {
        Row: {
          created_at: string
          doc_number: string | null
          doc_type: string
          expiry_date: string | null
          id: string
          issue_date: string | null
          name: string
          notes: string | null
          status: string
          supplier_id: string
          url: string | null
        }
        Insert: {
          created_at?: string
          doc_number?: string | null
          doc_type?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          name: string
          notes?: string | null
          status?: string
          supplier_id: string
          url?: string | null
        }
        Update: {
          created_at?: string
          doc_number?: string | null
          doc_type?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          name?: string
          notes?: string | null
          status?: string
          supplier_id?: string
          url?: string | null
        }
        Relationships: []
      }
      bz_custody: {
        Row: {
          amount: number
          created_at: string
          custody_type: string
          description: string | null
          holder_name: string
          id: string
          issue_date: string | null
          notes: string | null
          project_id: string | null
          settled_amount: number
          status: string
          supplier_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          custody_type?: string
          description?: string | null
          holder_name: string
          id?: string
          issue_date?: string | null
          notes?: string | null
          project_id?: string | null
          settled_amount?: number
          status?: string
          supplier_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          custody_type?: string
          description?: string | null
          holder_name?: string
          id?: string
          issue_date?: string | null
          notes?: string | null
          project_id?: string | null
          settled_amount?: number
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bz_custody_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bz_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bz_daily_reports: {
        Row: {
          created_at: string
          equipment_count: number
          id: string
          issues: string | null
          labor_count: number
          notes: string | null
          project_id: string
          report_date: string
          supplier_id: string
          weather: string | null
          work_done: string | null
        }
        Insert: {
          created_at?: string
          equipment_count?: number
          id?: string
          issues?: string | null
          labor_count?: number
          notes?: string | null
          project_id: string
          report_date?: string
          supplier_id: string
          weather?: string | null
          work_done?: string | null
        }
        Update: {
          created_at?: string
          equipment_count?: number
          id?: string
          issues?: string | null
          labor_count?: number
          notes?: string | null
          project_id?: string
          report_date?: string
          supplier_id?: string
          weather?: string | null
          work_done?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bz_daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bz_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bz_equipment: {
        Row: {
          asset_no: string | null
          category: string | null
          created_at: string
          id: string
          location: string | null
          name: string
          notes: string | null
          ownership: string
          project_id: string | null
          rental_cost: number
          status: string
          supplier_id: string
        }
        Insert: {
          asset_no?: string | null
          category?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          ownership?: string
          project_id?: string | null
          rental_cost?: number
          status?: string
          supplier_id: string
        }
        Update: {
          asset_no?: string | null
          category?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          ownership?: string
          project_id?: string | null
          rental_cost?: number
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bz_equipment_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bz_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bz_equipment_logs: {
        Row: {
          cost: number
          created_at: string
          description: string | null
          equipment_id: string
          hours: number
          id: string
          liters: number
          log_date: string | null
          log_type: string
          notes: string | null
          supplier_id: string
        }
        Insert: {
          cost?: number
          created_at?: string
          description?: string | null
          equipment_id: string
          hours?: number
          id?: string
          liters?: number
          log_date?: string | null
          log_type?: string
          notes?: string | null
          supplier_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          description?: string | null
          equipment_id?: string
          hours?: number
          id?: string
          liters?: number
          log_date?: string | null
          log_type?: string
          notes?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bz_equipment_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "bz_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      bz_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string | null
          id: string
          notes: string | null
          payment_method: string | null
          project_id: string | null
          supplier_id: string
          vendor_name: string | null
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          project_id?: string | null
          supplier_id: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          project_id?: string | null
          supplier_id?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bz_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bz_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bz_guarantees: {
        Row: {
          amount: number
          bank_name: string | null
          created_at: string
          expiry_date: string | null
          g_type: string
          id: string
          issue_date: string | null
          lg_number: string | null
          notes: string | null
          project_id: string | null
          status: string
          supplier_id: string
        }
        Insert: {
          amount?: number
          bank_name?: string | null
          created_at?: string
          expiry_date?: string | null
          g_type?: string
          id?: string
          issue_date?: string | null
          lg_number?: string | null
          notes?: string | null
          project_id?: string | null
          status?: string
          supplier_id: string
        }
        Update: {
          amount?: number
          bank_name?: string | null
          created_at?: string
          expiry_date?: string | null
          g_type?: string
          id?: string
          issue_date?: string | null
          lg_number?: string | null
          notes?: string | null
          project_id?: string | null
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bz_guarantees_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bz_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bz_inspections: {
        Row: {
          created_at: string
          id: string
          insp_type: string
          notes: string | null
          project_id: string | null
          request_date: string | null
          result: string | null
          status: string
          supplier_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          insp_type?: string
          notes?: string | null
          project_id?: string | null
          request_date?: string | null
          result?: string | null
          status?: string
          supplier_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          insp_type?: string
          notes?: string | null
          project_id?: string | null
          request_date?: string | null
          result?: string | null
          status?: string
          supplier_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "bz_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bz_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bz_material_requests: {
        Row: {
          created_at: string
          id: string
          item: string
          notes: string | null
          project_id: string | null
          quantity: number
          request_date: string | null
          requested_by: string | null
          status: string
          supplier_id: string
          unit: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item: string
          notes?: string | null
          project_id?: string | null
          quantity?: number
          request_date?: string | null
          requested_by?: string | null
          status?: string
          supplier_id: string
          unit?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item?: string
          notes?: string | null
          project_id?: string | null
          quantity?: number
          request_date?: string | null
          requested_by?: string | null
          status?: string
          supplier_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bz_material_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bz_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bz_milestones: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          planned_end: string | null
          planned_start: string | null
          project_id: string
          sort_order: number
          status: string
          supplier_id: string
          weight_pct: number
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          planned_end?: string | null
          planned_start?: string | null
          project_id: string
          sort_order?: number
          status?: string
          supplier_id: string
          weight_pct?: number
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          planned_end?: string | null
          planned_start?: string | null
          project_id?: string
          sort_order?: number
          status?: string
          supplier_id?: string
          weight_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "bz_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bz_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bz_payment_certificates: {
        Row: {
          advance_pct: number
          advance_recovery: number
          cert_no: string | null
          created_at: string
          gross_cumulative: number
          id: string
          materials_onsite: number
          net_cumulative: number
          net_payable: number
          net_this_cert: number
          notes: string | null
          period_from: string | null
          period_to: string | null
          previous_net: number
          price_adjustment: number
          project_id: string
          retention_amount: number
          retention_pct: number
          seq: number | null
          stamp_rate: number
          stamp_tax: number
          status: string
          supervision_amount: number | null
          supervision_pct: number | null
          supplier_id: string
          vat_amount: number
          vat_pct: number
          vo_amount: number
          withholding_pct: number
          withholding_tax: number
          work_done_amount: number
        }
        Insert: {
          advance_pct?: number
          advance_recovery?: number
          cert_no?: string | null
          created_at?: string
          gross_cumulative?: number
          id?: string
          materials_onsite?: number
          net_cumulative?: number
          net_payable?: number
          net_this_cert?: number
          notes?: string | null
          period_from?: string | null
          period_to?: string | null
          previous_net?: number
          price_adjustment?: number
          project_id: string
          retention_amount?: number
          retention_pct?: number
          seq?: number | null
          stamp_rate?: number
          stamp_tax?: number
          status?: string
          supervision_amount?: number | null
          supervision_pct?: number | null
          supplier_id: string
          vat_amount?: number
          vat_pct?: number
          vo_amount?: number
          withholding_pct?: number
          withholding_tax?: number
          work_done_amount?: number
        }
        Update: {
          advance_pct?: number
          advance_recovery?: number
          cert_no?: string | null
          created_at?: string
          gross_cumulative?: number
          id?: string
          materials_onsite?: number
          net_cumulative?: number
          net_payable?: number
          net_this_cert?: number
          notes?: string | null
          period_from?: string | null
          period_to?: string | null
          previous_net?: number
          price_adjustment?: number
          project_id?: string
          retention_amount?: number
          retention_pct?: number
          seq?: number | null
          stamp_rate?: number
          stamp_tax?: number
          status?: string
          supervision_amount?: number | null
          supervision_pct?: number | null
          supplier_id?: string
          vat_amount?: number
          vat_pct?: number
          vo_amount?: number
          withholding_pct?: number
          withholding_tax?: number
          work_done_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "bz_payment_certificates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bz_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bz_project_documents: {
        Row: {
          created_at: string
          doc_type: string | null
          id: string
          name: string
          notes: string | null
          project_id: string
          supplier_id: string
          url: string | null
        }
        Insert: {
          created_at?: string
          doc_type?: string | null
          id?: string
          name: string
          notes?: string | null
          project_id: string
          supplier_id: string
          url?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string | null
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
          supplier_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bz_project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bz_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bz_projects: {
        Row: {
          advance_pct: number
          client_name: string | null
          code: string | null
          contract_value: number
          created_at: string
          end_date: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          progress_pct: number
          retention_pct: number
          start_date: string | null
          status: string
          supervision_pct: number | null
          supplier_id: string
          updated_at: string
          vat_pct: number
        }
        Insert: {
          advance_pct?: number
          client_name?: string | null
          code?: string | null
          contract_value?: number
          created_at?: string
          end_date?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          progress_pct?: number
          retention_pct?: number
          start_date?: string | null
          status?: string
          supervision_pct?: number | null
          supplier_id: string
          updated_at?: string
          vat_pct?: number
        }
        Update: {
          advance_pct?: number
          client_name?: string | null
          code?: string | null
          contract_value?: number
          created_at?: string
          end_date?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          progress_pct?: number
          retention_pct?: number
          start_date?: string | null
          status?: string
          supervision_pct?: number | null
          supplier_id?: string
          updated_at?: string
          vat_pct?: number
        }
        Relationships: []
      }
      bz_subcontractors: {
        Row: {
          contract_value: number
          created_at: string
          id: string
          name: string
          notes: string | null
          paid_to_date: number
          phone: string | null
          project_id: string
          scope: string | null
          status: string
          supplier_id: string
        }
        Insert: {
          contract_value?: number
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          paid_to_date?: number
          phone?: string | null
          project_id: string
          scope?: string | null
          status?: string
          supplier_id: string
        }
        Update: {
          contract_value?: number
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          paid_to_date?: number
          phone?: string | null
          project_id?: string
          scope?: string | null
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bz_subcontractors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bz_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bz_tenders: {
        Row: {
          bid_bond_amount: number
          client_name: string | null
          created_at: string
          estimated_value: number
          id: string
          notes: string | null
          project_id: string | null
          result_date: string | null
          status: string
          submission_date: string | null
          supplier_id: string
          tender_type: string | null
          title: string
        }
        Insert: {
          bid_bond_amount?: number
          client_name?: string | null
          created_at?: string
          estimated_value?: number
          id?: string
          notes?: string | null
          project_id?: string | null
          result_date?: string | null
          status?: string
          submission_date?: string | null
          supplier_id: string
          tender_type?: string | null
          title: string
        }
        Update: {
          bid_bond_amount?: number
          client_name?: string | null
          created_at?: string
          estimated_value?: number
          id?: string
          notes?: string | null
          project_id?: string | null
          result_date?: string | null
          status?: string
          submission_date?: string | null
          supplier_id?: string
          tender_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "bz_tenders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bz_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bz_variation_orders: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          project_id: string
          status: string
          supplier_id: string
          vo_date: string | null
          vo_no: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          id?: string
          project_id: string
          status?: string
          supplier_id: string
          vo_date?: string | null
          vo_no?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          status?: string
          supplier_id?: string
          vo_date?: string | null
          vo_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bz_variation_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bz_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_reconciliations: {
        Row: {
          actual_cash: number
          branch_id: string | null
          breakdown: Json | null
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          date: string
          expected_cash: number
          id: string
          notes: string | null
          status: string | null
          supplier_id: string
          variance: number | null
        }
        Insert: {
          actual_cash?: number
          branch_id?: string | null
          breakdown?: Json | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          date: string
          expected_cash?: number
          id?: string
          notes?: string | null
          status?: string | null
          supplier_id: string
          variance?: number | null
        }
        Update: {
          actual_cash?: number
          branch_id?: string | null
          breakdown?: Json | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          date?: string
          expected_cash?: number
          id?: string
          notes?: string | null
          status?: string | null
          supplier_id?: string
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_reconciliations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_reconciliations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "cash_reconciliations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "cash_reconciliations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_reconciliations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "cash_reconciliations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      cash_withdrawals: {
        Row: {
          amount_egp: number
          approved_by_employee_id: string | null
          branch_id: string | null
          id: string
          linked_transaction_id: string | null
          notes: string | null
          reason: string
          recorded_by: string | null
          supplier_id: string
          withdrawn_at: string | null
          withdrawn_by_employee_id: string | null
        }
        Insert: {
          amount_egp: number
          approved_by_employee_id?: string | null
          branch_id?: string | null
          id?: string
          linked_transaction_id?: string | null
          notes?: string | null
          reason: string
          recorded_by?: string | null
          supplier_id: string
          withdrawn_at?: string | null
          withdrawn_by_employee_id?: string | null
        }
        Update: {
          amount_egp?: number
          approved_by_employee_id?: string | null
          branch_id?: string | null
          id?: string
          linked_transaction_id?: string | null
          notes?: string | null
          reason?: string
          recorded_by?: string | null
          supplier_id?: string
          withdrawn_at?: string | null
          withdrawn_by_employee_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_withdrawals_approved_by_employee_id_fkey"
            columns: ["approved_by_employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_withdrawals_approved_by_employee_id_fkey"
            columns: ["approved_by_employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "cash_withdrawals_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_withdrawals_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "cash_withdrawals_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "cash_withdrawals_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_withdrawals_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_live_transactions_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_withdrawals_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_withdrawals_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "cash_withdrawals_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "cash_withdrawals_withdrawn_by_employee_id_fkey"
            columns: ["withdrawn_by_employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_withdrawals_withdrawn_by_employee_id_fkey"
            columns: ["withdrawn_by_employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      categories: {
        Row: {
          allowed_pricing_periods: string[] | null
          also_show_in: string[] | null
          attribute_schema: Json | null
          created_at: string
          default_pricing_period: string | null
          description: string | null
          description_placeholder: string | null
          display_order: number
          district_placeholder: string | null
          domain: string | null
          group_display_order: number | null
          group_emoji: string | null
          group_name_ar: string | null
          group_name_i18n: Json
          group_slug: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name_ar: string
          name_en: string | null
          name_i18n: Json
          order_mode: string
          parent_id: string | null
          pricing_unit_label: string | null
          slug: string
          title_placeholder: string | null
          track: string | null
          updated_at: string
        }
        Insert: {
          allowed_pricing_periods?: string[] | null
          also_show_in?: string[] | null
          attribute_schema?: Json | null
          created_at?: string
          default_pricing_period?: string | null
          description?: string | null
          description_placeholder?: string | null
          display_order?: number
          district_placeholder?: string | null
          domain?: string | null
          group_display_order?: number | null
          group_emoji?: string | null
          group_name_ar?: string | null
          group_name_i18n?: Json
          group_slug?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          name_i18n?: Json
          order_mode?: string
          parent_id?: string | null
          pricing_unit_label?: string | null
          slug: string
          title_placeholder?: string | null
          track?: string | null
          updated_at?: string
        }
        Update: {
          allowed_pricing_periods?: string[] | null
          also_show_in?: string[] | null
          attribute_schema?: Json | null
          created_at?: string
          default_pricing_period?: string | null
          description?: string | null
          description_placeholder?: string | null
          display_order?: number
          district_placeholder?: string | null
          domain?: string | null
          group_display_order?: number | null
          group_emoji?: string | null
          group_name_ar?: string | null
          group_name_i18n?: Json
          group_slug?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          name_i18n?: Json
          order_mode?: string
          parent_id?: string | null
          pricing_unit_label?: string | null
          slug?: string
          title_placeholder?: string | null
          track?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "category_demand_view"
            referencedColumns: ["category_id"]
          },
        ]
      }
      category_landings: {
        Row: {
          category_id: string
          created_at: string
          cta_primary_badge: string | null
          cta_primary_label: string | null
          cta_primary_subtitle: string | null
          cta_primary_url_override: string | null
          cta_whatsapp_message: string | null
          hero_badge_emoji: string | null
          hero_badge_label: string | null
          hero_subtitle_html: string | null
          hero_tags: Json | null
          hero_title_html: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          og_image_url: string | null
          pain_points: Json | null
          status: string
          steps: Json | null
          updated_at: string
          updated_by: string | null
          utm_campaign: string | null
          views_count: number
          why_stats: Json | null
        }
        Insert: {
          category_id: string
          created_at?: string
          cta_primary_badge?: string | null
          cta_primary_label?: string | null
          cta_primary_subtitle?: string | null
          cta_primary_url_override?: string | null
          cta_whatsapp_message?: string | null
          hero_badge_emoji?: string | null
          hero_badge_label?: string | null
          hero_subtitle_html?: string | null
          hero_tags?: Json | null
          hero_title_html?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          pain_points?: Json | null
          status?: string
          steps?: Json | null
          updated_at?: string
          updated_by?: string | null
          utm_campaign?: string | null
          views_count?: number
          why_stats?: Json | null
        }
        Update: {
          category_id?: string
          created_at?: string
          cta_primary_badge?: string | null
          cta_primary_label?: string | null
          cta_primary_subtitle?: string | null
          cta_primary_url_override?: string | null
          cta_whatsapp_message?: string | null
          hero_badge_emoji?: string | null
          hero_badge_label?: string | null
          hero_subtitle_html?: string | null
          hero_tags?: Json | null
          hero_title_html?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          pain_points?: Json | null
          status?: string
          steps?: Json | null
          updated_at?: string
          updated_by?: string | null
          utm_campaign?: string | null
          views_count?: number
          why_stats?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "category_landings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_landings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "category_demand_view"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "category_landings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_landings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ceo_briefs: {
        Row: {
          agent_name: string | null
          ai_actions_today: number | null
          bookings_today: number | null
          brief_date: string
          concerns: string[] | null
          created_at: string | null
          decisions_needed: Json | null
          email_sent: boolean | null
          full_brief_html: string | null
          good_news: string[] | null
          growth_opportunities: Json | null
          id: string
          new_listings_today: number | null
          new_users_today: number | null
          one_liner: string | null
          revenue_change_pct: number | null
          revenue_today: number | null
          revenue_yesterday: number | null
          top_3_priorities: Json | null
        }
        Insert: {
          agent_name?: string | null
          ai_actions_today?: number | null
          bookings_today?: number | null
          brief_date?: string
          concerns?: string[] | null
          created_at?: string | null
          decisions_needed?: Json | null
          email_sent?: boolean | null
          full_brief_html?: string | null
          good_news?: string[] | null
          growth_opportunities?: Json | null
          id?: string
          new_listings_today?: number | null
          new_users_today?: number | null
          one_liner?: string | null
          revenue_change_pct?: number | null
          revenue_today?: number | null
          revenue_yesterday?: number | null
          top_3_priorities?: Json | null
        }
        Update: {
          agent_name?: string | null
          ai_actions_today?: number | null
          bookings_today?: number | null
          brief_date?: string
          concerns?: string[] | null
          created_at?: string | null
          decisions_needed?: Json | null
          email_sent?: boolean | null
          full_brief_html?: string | null
          good_news?: string[] | null
          growth_opportunities?: Json | null
          id?: string
          new_listings_today?: number | null
          new_users_today?: number | null
          one_liner?: string | null
          revenue_change_pct?: number | null
          revenue_today?: number | null
          revenue_yesterday?: number | null
          top_3_priorities?: Json | null
        }
        Relationships: []
      }
      chat_blocks: {
        Row: {
          blocked: string
          blocker: string
          created_at: string
        }
        Insert: {
          blocked: string
          blocker: string
          created_at?: string
        }
        Update: {
          blocked?: string
          blocker?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_blocks_blocked_fkey"
            columns: ["blocked"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_blocks_blocked_fkey"
            columns: ["blocked"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_blocks_blocker_fkey"
            columns: ["blocker"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_blocks_blocker_fkey"
            columns: ["blocker"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_call_participants: {
        Row: {
          audio_on: boolean
          call_id: string
          id: string
          joined_at: string | null
          left_at: string | null
          profile_id: string
          state: string
          video_on: boolean
        }
        Insert: {
          audio_on?: boolean
          call_id: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          profile_id: string
          state?: string
          video_on?: boolean
        }
        Update: {
          audio_on?: boolean
          call_id?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          profile_id?: string
          state?: string
          video_on?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "chat_call_participants_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "chat_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_call_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_call_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_calls: {
        Row: {
          connected_at: string | null
          end_reason: string | null
          ended_at: string | null
          id: string
          kind: string
          mode: string
          room_id: string
          started_at: string
          started_by: string
          status: string
        }
        Insert: {
          connected_at?: string | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          kind?: string
          mode?: string
          room_id: string
          started_at?: string
          started_by: string
          status?: string
        }
        Update: {
          connected_at?: string | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          kind?: string
          mode?: string
          room_id?: string
          started_at?: string
          started_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_calls_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_calls_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_calls_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_contact_leak_log: {
        Row: {
          created_at: string
          hit_types: string[]
          id: string
          masked: string
          original: string
          room_id: string | null
          sender_id: string | null
        }
        Insert: {
          created_at?: string
          hit_types?: string[]
          id?: string
          masked: string
          original: string
          room_id?: string | null
          sender_id?: string | null
        }
        Update: {
          created_at?: string
          hit_types?: string[]
          id?: string
          masked?: string
          original?: string
          room_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_contact_leak_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_contact_leak_log_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_contact_leak_log_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_contacts: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          owner_id: string
          phone_e164: string
          source: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          owner_id?: string
          phone_e164: string
          source?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          owner_id?: string
          phone_e164?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_friends: {
        Row: {
          accepted_at: string | null
          addressee: string
          created_at: string
          id: string
          requester: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          addressee: string
          created_at?: string
          id?: string
          requester: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          addressee?: string
          created_at?: string
          id?: string
          requester?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_friends_addressee_fkey"
            columns: ["addressee"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_friends_addressee_fkey"
            columns: ["addressee"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_friends_requester_fkey"
            columns: ["requester"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_friends_requester_fkey"
            columns: ["requester"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_hidden_rooms: {
        Row: {
          hidden_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          hidden_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          hidden_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_invite_tokens: {
        Row: {
          created_at: string
          profile_id: string
          rotated_at: string | null
          token: string
          uses: number
        }
        Insert: {
          created_at?: string
          profile_id: string
          rotated_at?: string | null
          token: string
          uses?: number
        }
        Update: {
          created_at?: string
          profile_id?: string
          rotated_at?: string | null
          token?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "chat_invite_tokens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_invite_tokens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_hides: {
        Row: {
          hidden_at: string
          message_id: string
          profile_id: string
        }
        Insert: {
          hidden_at?: string
          message_id: string
          profile_id: string
        }
        Update: {
          hidden_at?: string
          message_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_hides_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_hides_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_hides_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_stars: {
        Row: {
          message_id: string
          profile_id: string
          starred_at: string
        }
        Insert: {
          message_id: string
          profile_id: string
          starred_at?: string
        }
        Update: {
          message_id?: string
          profile_id?: string
          starred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_stars_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_stars_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_stars_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string | null
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          kind: string
          lat: number | null
          lng: number | null
          media_url: string | null
          mentions: string[]
          payload: Json | null
          pinned_at: string | null
          pinned_by: string | null
          reactions: Json
          reply_to: string | null
          room_id: string
          sender_id: string | null
          sender_kind: string
          sender_name: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          kind?: string
          lat?: number | null
          lng?: number | null
          media_url?: string | null
          mentions?: string[]
          payload?: Json | null
          pinned_at?: string | null
          pinned_by?: string | null
          reactions?: Json
          reply_to?: string | null
          room_id: string
          sender_id?: string | null
          sender_kind?: string
          sender_name?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          kind?: string
          lat?: number | null
          lng?: number | null
          media_url?: string | null
          mentions?: string[]
          payload?: Json | null
          pinned_at?: string | null
          pinned_by?: string | null
          reactions?: Json
          reply_to?: string | null
          room_id?: string
          sender_id?: string | null
          sender_kind?: string
          sender_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_poll_votes: {
        Row: {
          option_idx: number
          poll_id: string
          profile_id: string
          voted_at: string
        }
        Insert: {
          option_idx: number
          poll_id: string
          profile_id: string
          voted_at?: string
        }
        Update: {
          option_idx?: number
          poll_id?: string
          profile_id?: string
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "chat_polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_poll_votes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_poll_votes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_polls: {
        Row: {
          anonymous: boolean
          closed_at: string | null
          closes_at: string | null
          created_at: string
          created_by: string
          id: string
          message_id: string | null
          multi: boolean
          options: string[]
          question: string
          room_id: string
        }
        Insert: {
          anonymous?: boolean
          closed_at?: string | null
          closes_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          message_id?: string | null
          multi?: boolean
          options: string[]
          question: string
          room_id: string
        }
        Update: {
          anonymous?: boolean
          closed_at?: string | null
          closes_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          message_id?: string | null
          multi?: boolean
          options?: string[]
          question?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_polls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_polls_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_clears: {
        Row: {
          cleared_at: string
          profile_id: string
          room_id: string
        }
        Insert: {
          cleared_at?: string
          profile_id: string
          room_id: string
        }
        Update: {
          cleared_at?: string
          profile_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_clears_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_members: {
        Row: {
          archived_at: string | null
          joined_at: string
          last_read_at: string | null
          muted_until: string | null
          pinned_at: string | null
          profile_id: string
          role: string
          room_id: string
        }
        Insert: {
          archived_at?: string | null
          joined_at?: string
          last_read_at?: string | null
          muted_until?: string | null
          pinned_at?: string | null
          profile_id: string
          role?: string
          room_id: string
        }
        Update: {
          archived_at?: string | null
          joined_at?: string
          last_read_at?: string | null
          muted_until?: string | null
          pinned_at?: string | null
          profile_id?: string
          role?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_room_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          marid_enabled: boolean
          name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          marid_enabled?: boolean
          name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          marid_enabled?: boolean
          name?: string | null
        }
        Relationships: []
      }
      claim_outreach_log: {
        Row: {
          created_at: string
          error: string | null
          id: string
          name: string
          phone: string
          sent: boolean
          sent_at: string | null
          token: string
          wa_message_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          name: string
          phone: string
          sent?: boolean
          sent_at?: string | null
          token: string
          wa_message_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          name?: string
          phone?: string
          sent?: boolean
          sent_at?: string | null
          token?: string
          wa_message_id?: string | null
        }
        Relationships: []
      }
      claim_pressure_campaign: {
        Row: {
          business_name: string | null
          category: string | null
          claimed_at: string | null
          created_at: string
          deadline_at: string | null
          id: string
          last_reminder_at: string | null
          listing_id: string
          next_reminder_at: string
          phone: string
          reminders_sent: number
          segment: string | null
          status: string
          token: string
          unpublished_at: string | null
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          category?: string | null
          claimed_at?: string | null
          created_at?: string
          deadline_at?: string | null
          id?: string
          last_reminder_at?: string | null
          listing_id: string
          next_reminder_at?: string
          phone: string
          reminders_sent?: number
          segment?: string | null
          status?: string
          token: string
          unpublished_at?: string | null
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          category?: string | null
          claimed_at?: string | null
          created_at?: string
          deadline_at?: string | null
          id?: string
          last_reminder_at?: string | null
          listing_id?: string
          next_reminder_at?: string
          phone?: string
          reminders_sent?: number
          segment?: string | null
          status?: string
          token?: string
          unpublished_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_pressure_campaign_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "claim_pressure_campaign_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_pressure_campaign_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_pressure_campaign_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_pressure_campaign_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_leads: {
        Row: {
          address: string | null
          area: string | null
          branches_count: number | null
          city: string | null
          contact_attempts: number | null
          created_at: string | null
          has_website: boolean | null
          has_whatsapp: boolean | null
          id: string
          insurance_partners: string[] | null
          last_contacted_at: string | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          onboarded_supplier_id: string | null
          phone: string | null
          place_id: string | null
          rating: number | null
          source: string | null
          specialty: string | null
          specialty_ar: string | null
          status: string
          updated_at: string | null
          user_ratings_total: number | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          branches_count?: number | null
          city?: string | null
          contact_attempts?: number | null
          created_at?: string | null
          has_website?: boolean | null
          has_whatsapp?: boolean | null
          id?: string
          insurance_partners?: string[] | null
          last_contacted_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          onboarded_supplier_id?: string | null
          phone?: string | null
          place_id?: string | null
          rating?: number | null
          source?: string | null
          specialty?: string | null
          specialty_ar?: string | null
          status?: string
          updated_at?: string | null
          user_ratings_total?: number | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          branches_count?: number | null
          city?: string | null
          contact_attempts?: number | null
          created_at?: string | null
          has_website?: boolean | null
          has_whatsapp?: boolean | null
          id?: string
          insurance_partners?: string[] | null
          last_contacted_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          onboarded_supplier_id?: string | null
          phone?: string | null
          place_id?: string | null
          rating?: number | null
          source?: string | null
          specialty?: string | null
          specialty_ar?: string | null
          status?: string
          updated_at?: string | null
          user_ratings_total?: number | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_leads_onboarded_supplier_id_fkey"
            columns: ["onboarded_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_leads_onboarded_supplier_id_fkey"
            columns: ["onboarded_supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "clinic_leads_onboarded_supplier_id_fkey"
            columns: ["onboarded_supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      cold_leads: {
        Row: {
          added_at: string | null
          added_by: string | null
          business_name: string
          category: string
          city: string | null
          contact_count: number | null
          email: string | null
          id: string
          last_contacted: string | null
          location: string | null
          notes: string | null
          phone: string
          rating: number | null
          review_count: number | null
          source: string | null
          source_url: string | null
          status: string | null
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          business_name: string
          category: string
          city?: string | null
          contact_count?: number | null
          email?: string | null
          id?: string
          last_contacted?: string | null
          location?: string | null
          notes?: string | null
          phone: string
          rating?: number | null
          review_count?: number | null
          source?: string | null
          source_url?: string | null
          status?: string | null
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          business_name?: string
          category?: string
          city?: string | null
          contact_count?: number | null
          email?: string | null
          id?: string
          last_contacted?: string | null
          location?: string | null
          notes?: string | null
          phone?: string
          rating?: number | null
          review_count?: number | null
          source?: string | null
          source_url?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cold_leads_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cold_leads_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions_log: {
        Row: {
          base_amount: number
          booking_id: string | null
          commission_amount: number | null
          commission_pct: number
          earned_at: string | null
          employee_id: string
          id: string
          metadata: Json | null
          paid_at: string | null
          payroll_run_id: string | null
          service_id: string | null
          service_name: string | null
          supplier_id: string
        }
        Insert: {
          base_amount: number
          booking_id?: string | null
          commission_amount?: number | null
          commission_pct: number
          earned_at?: string | null
          employee_id: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payroll_run_id?: string | null
          service_id?: string | null
          service_name?: string | null
          supplier_id: string
        }
        Update: {
          base_amount?: number
          booking_id?: string | null
          commission_amount?: number | null
          commission_pct?: number
          earned_at?: string | null
          employee_id?: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payroll_run_id?: string | null
          service_id?: string | null
          service_name?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "branch_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "commissions_log_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_log_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_log_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "commissions_log_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      comms_settings: {
        Row: {
          always_cc: string[] | null
          id: string
          owner_email: string | null
          owner_name: string | null
          updated_at: string | null
        }
        Insert: {
          always_cc?: string[] | null
          id?: string
          owner_email?: string | null
          owner_name?: string | null
          updated_at?: string | null
        }
        Update: {
          always_cc?: string[] | null
          id?: string
          owner_email?: string | null
          owner_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      competitor_prices: {
        Row: {
          category: string
          competitor_name: string
          competitor_url: string | null
          currency: string | null
          features: Json | null
          id: string
          notes: string | null
          observed_at: string | null
          our_equivalent_price: number | null
          price: number | null
          price_diff_pct: number | null
          pricing_unit: string | null
          product_name: string | null
          product_url: string | null
        }
        Insert: {
          category: string
          competitor_name: string
          competitor_url?: string | null
          currency?: string | null
          features?: Json | null
          id?: string
          notes?: string | null
          observed_at?: string | null
          our_equivalent_price?: number | null
          price?: number | null
          price_diff_pct?: number | null
          pricing_unit?: string | null
          product_name?: string | null
          product_url?: string | null
        }
        Update: {
          category?: string
          competitor_name?: string
          competitor_url?: string | null
          currency?: string | null
          features?: Json | null
          id?: string
          notes?: string | null
          observed_at?: string | null
          our_equivalent_price?: number | null
          price?: number | null
          price_diff_pct?: number | null
          pricing_unit?: string | null
          product_name?: string | null
          product_url?: string | null
        }
        Relationships: []
      }
      competitor_pricing_snapshots: {
        Row: {
          agent_name: string | null
          avg_price: number | null
          category: string
          competitor_name: string | null
          competitor_url: string | null
          created_at: string | null
          id: string
          insights: string | null
          max_price: number | null
          min_price: number | null
          our_avg_price: number | null
          our_position: string | null
          recommendations: string[] | null
          sample_listings: Json | null
        }
        Insert: {
          agent_name?: string | null
          avg_price?: number | null
          category: string
          competitor_name?: string | null
          competitor_url?: string | null
          created_at?: string | null
          id?: string
          insights?: string | null
          max_price?: number | null
          min_price?: number | null
          our_avg_price?: number | null
          our_position?: string | null
          recommendations?: string[] | null
          sample_listings?: Json | null
        }
        Update: {
          agent_name?: string | null
          avg_price?: number | null
          category?: string
          competitor_name?: string | null
          competitor_url?: string | null
          created_at?: string | null
          id?: string
          insights?: string | null
          max_price?: number | null
          min_price?: number | null
          our_avg_price?: number | null
          our_position?: string | null
          recommendations?: string[] | null
          sample_listings?: Json | null
        }
        Relationships: []
      }
      complaint_resolutions: {
        Row: {
          agent_name: string | null
          booking_id: string | null
          complaint_category: string | null
          complaint_source: string | null
          complaint_text: string
          created_at: string | null
          customer_id: string | null
          customer_phone: string | null
          human_review_needed: boolean | null
          id: string
          next_steps: string[] | null
          policy_references: string[] | null
          resolution_text: string | null
          sentiment: string | null
          severity: string | null
          status: string | null
          suggested_compensation: string | null
          updated_at: string | null
        }
        Insert: {
          agent_name?: string | null
          booking_id?: string | null
          complaint_category?: string | null
          complaint_source?: string | null
          complaint_text: string
          created_at?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          human_review_needed?: boolean | null
          id?: string
          next_steps?: string[] | null
          policy_references?: string[] | null
          resolution_text?: string | null
          sentiment?: string | null
          severity?: string | null
          status?: string | null
          suggested_compensation?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_name?: string | null
          booking_id?: string | null
          complaint_category?: string | null
          complaint_source?: string | null
          complaint_text?: string
          created_at?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          human_review_needed?: boolean | null
          id?: string
          next_steps?: string[] | null
          policy_references?: string[] | null
          resolution_text?: string | null
          sentiment?: string | null
          severity?: string | null
          status?: string | null
          suggested_compensation?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaint_resolutions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "marketplace_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      content_calendar: {
        Row: {
          agent_name: string
          body: string
          canva_design_id: string | null
          canva_design_url: string | null
          category: string | null
          content_type: string
          created_at: string
          cta: string | null
          design_brief: string | null
          external_post_id: string | null
          external_url: string | null
          hashtags: string[] | null
          id: string
          image_source: string | null
          image_url: string | null
          language: string
          metadata: Json
          performance: Json | null
          published_at: string | null
          scheduled_for: string | null
          status: string
          title: string | null
          visual_status: string | null
        }
        Insert: {
          agent_name: string
          body: string
          canva_design_id?: string | null
          canva_design_url?: string | null
          category?: string | null
          content_type: string
          created_at?: string
          cta?: string | null
          design_brief?: string | null
          external_post_id?: string | null
          external_url?: string | null
          hashtags?: string[] | null
          id?: string
          image_source?: string | null
          image_url?: string | null
          language?: string
          metadata?: Json
          performance?: Json | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: string
          title?: string | null
          visual_status?: string | null
        }
        Update: {
          agent_name?: string
          body?: string
          canva_design_id?: string | null
          canva_design_url?: string | null
          category?: string | null
          content_type?: string
          created_at?: string
          cta?: string | null
          design_brief?: string | null
          external_post_id?: string | null
          external_url?: string | null
          hashtags?: string[] | null
          id?: string
          image_source?: string | null
          image_url?: string | null
          language?: string
          metadata?: Json
          performance?: Json | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: string
          title?: string | null
          visual_status?: string | null
        }
        Relationships: []
      }
      content_drafts: {
        Row: {
          agent_name: string | null
          ai_model: string | null
          ai_reasoning: string | null
          approved_by: string | null
          caption: string | null
          created_at: string | null
          cta: string | null
          duration_seconds: number | null
          format: string
          hashtags: string[] | null
          hook: string | null
          id: string
          intent: string | null
          metrics: Json | null
          music_suggestion: string | null
          prompt_used: string | null
          published_at: string | null
          published_url: string | null
          scheduled_for: string | null
          script: string | null
          status: string
          target_audience: string | null
          thumbnail_text: string | null
          topic: string
          updated_at: string | null
          visual_directions: Json | null
        }
        Insert: {
          agent_name?: string | null
          ai_model?: string | null
          ai_reasoning?: string | null
          approved_by?: string | null
          caption?: string | null
          created_at?: string | null
          cta?: string | null
          duration_seconds?: number | null
          format: string
          hashtags?: string[] | null
          hook?: string | null
          id?: string
          intent?: string | null
          metrics?: Json | null
          music_suggestion?: string | null
          prompt_used?: string | null
          published_at?: string | null
          published_url?: string | null
          scheduled_for?: string | null
          script?: string | null
          status?: string
          target_audience?: string | null
          thumbnail_text?: string | null
          topic: string
          updated_at?: string | null
          visual_directions?: Json | null
        }
        Update: {
          agent_name?: string | null
          ai_model?: string | null
          ai_reasoning?: string | null
          approved_by?: string | null
          caption?: string | null
          created_at?: string | null
          cta?: string | null
          duration_seconds?: number | null
          format?: string
          hashtags?: string[] | null
          hook?: string | null
          id?: string
          intent?: string | null
          metrics?: Json | null
          music_suggestion?: string | null
          prompt_used?: string | null
          published_at?: string | null
          published_url?: string | null
          scheduled_for?: string | null
          script?: string | null
          status?: string
          target_audience?: string | null
          thumbnail_text?: string | null
          topic?: string
          updated_at?: string | null
          visual_directions?: Json | null
        }
        Relationships: []
      }
      cron_allowlist: {
        Row: {
          added_at: string
          jobname: string
          reason: string
        }
        Insert: {
          added_at?: string
          jobname: string
          reason: string
        }
        Update: {
          added_at?: string
          jobname?: string
          reason?: string
        }
        Relationships: []
      }
      custody_events: {
        Row: {
          amount: number | null
          at: string
          by_name: string | null
          custody_id: string
          event: string
          id: string
          note: string | null
        }
        Insert: {
          amount?: number | null
          at?: string
          by_name?: string | null
          custody_id: string
          event: string
          id?: string
          note?: string | null
        }
        Update: {
          amount?: number | null
          at?: string
          by_name?: string | null
          custody_id?: string
          event?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custody_events_custody_id_fkey"
            columns: ["custody_id"]
            isOneToOne: false
            referencedRelation: "custody_items"
            referencedColumns: ["id"]
          },
        ]
      }
      custody_items: {
        Row: {
          assigned_at: string
          branch_id: string | null
          cash_spent: number
          created_at: string
          description: string | null
          due_back_at: string | null
          employee_id: string
          employee_name: string | null
          id: string
          kind: string
          notes: string | null
          photo_url: string | null
          returned_at: string | null
          serial_no: string | null
          status: string
          supplier_id: string
          title: string
          updated_at: string
          value_egp: number
        }
        Insert: {
          assigned_at?: string
          branch_id?: string | null
          cash_spent?: number
          created_at?: string
          description?: string | null
          due_back_at?: string | null
          employee_id: string
          employee_name?: string | null
          id?: string
          kind?: string
          notes?: string | null
          photo_url?: string | null
          returned_at?: string | null
          serial_no?: string | null
          status?: string
          supplier_id?: string
          title: string
          updated_at?: string
          value_egp?: number
        }
        Update: {
          assigned_at?: string
          branch_id?: string | null
          cash_spent?: number
          created_at?: string
          description?: string | null
          due_back_at?: string | null
          employee_id?: string
          employee_name?: string | null
          id?: string
          kind?: string
          notes?: string | null
          photo_url?: string | null
          returned_at?: string | null
          serial_no?: string | null
          status?: string
          supplier_id?: string
          title?: string
          updated_at?: string
          value_egp?: number
        }
        Relationships: []
      }
      customer_birthday_alerts: {
        Row: {
          channel: string | null
          customer_id: string
          id: string
          sent_at: string | null
          sent_for_year: number
          status: string | null
          supplier_id: string
        }
        Insert: {
          channel?: string | null
          customer_id: string
          id?: string
          sent_at?: string | null
          sent_for_year: number
          status?: string | null
          supplier_id: string
        }
        Update: {
          channel?: string | null
          customer_id?: string
          id?: string
          sent_at?: string | null
          sent_for_year?: number
          status?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_birthday_alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_birthday_alerts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_birthday_alerts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "customer_birthday_alerts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      customer_demand_requests: {
        Row: {
          category_guess: string | null
          contact_name: string | null
          contact_phone: string
          conversation_id: string | null
          created_at: string | null
          id: string
          matched_supplier_id: string | null
          notes: string | null
          requested_item: string
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category_guess?: string | null
          contact_name?: string | null
          contact_phone: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          matched_supplier_id?: string | null
          notes?: string | null
          requested_item: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category_guess?: string | null
          contact_name?: string | null
          contact_phone?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          matched_supplier_id?: string | null
          notes?: string | null
          requested_item?: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_demand_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "lifecycle_view"
            referencedColumns: ["conv_id"]
          },
          {
            foreignKeyName: "customer_demand_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "v_outreach_leads_funnel"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "customer_demand_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_email_outbox: {
        Row: {
          attempts: number
          body_html: string | null
          body_text: string | null
          category: string
          created_at: string
          error: string | null
          failed_at: string | null
          from_email: string
          from_name: string
          id: string
          max_attempts: number
          metadata: Json | null
          priority: number
          provider: string | null
          provider_message_id: string | null
          provider_request_id: number | null
          provider_response: Json | null
          related_booking_id: string | null
          related_listing_id: string | null
          related_supplier_id: string | null
          reply_to: string | null
          scheduled_at: string
          sent_at: string | null
          status: string
          subject: string
          template_key: string | null
          template_vars: Json | null
          to_email: string
          to_name: string | null
          to_profile_id: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          body_html?: string | null
          body_text?: string | null
          category?: string
          created_at?: string
          error?: string | null
          failed_at?: string | null
          from_email?: string
          from_name?: string
          id?: string
          max_attempts?: number
          metadata?: Json | null
          priority?: number
          provider?: string | null
          provider_message_id?: string | null
          provider_request_id?: number | null
          provider_response?: Json | null
          related_booking_id?: string | null
          related_listing_id?: string | null
          related_supplier_id?: string | null
          reply_to?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          subject: string
          template_key?: string | null
          template_vars?: Json | null
          to_email: string
          to_name?: string | null
          to_profile_id?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          body_html?: string | null
          body_text?: string | null
          category?: string
          created_at?: string
          error?: string | null
          failed_at?: string | null
          from_email?: string
          from_name?: string
          id?: string
          max_attempts?: number
          metadata?: Json | null
          priority?: number
          provider?: string | null
          provider_message_id?: string | null
          provider_request_id?: number | null
          provider_response?: Json | null
          related_booking_id?: string | null
          related_listing_id?: string | null
          related_supplier_id?: string | null
          reply_to?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          subject?: string
          template_key?: string | null
          template_vars?: Json | null
          to_email?: string
          to_name?: string | null
          to_profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_email_outbox_to_profile_id_fkey"
            columns: ["to_profile_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_email_outbox_to_profile_id_fkey"
            columns: ["to_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_success_actions: {
        Row: {
          agent_name: string | null
          channel: string | null
          created_at: string | null
          customer_phone: string | null
          customer_profile_id: string | null
          customer_stage: string | null
          days_since_signup: number | null
          id: string
          last_booking_days_ago: number | null
          message_to_send: string | null
          recommended_action: string | null
          sent_at: string | null
          status: string | null
          total_bookings: number | null
        }
        Insert: {
          agent_name?: string | null
          channel?: string | null
          created_at?: string | null
          customer_phone?: string | null
          customer_profile_id?: string | null
          customer_stage?: string | null
          days_since_signup?: number | null
          id?: string
          last_booking_days_ago?: number | null
          message_to_send?: string | null
          recommended_action?: string | null
          sent_at?: string | null
          status?: string | null
          total_bookings?: number | null
        }
        Update: {
          agent_name?: string | null
          channel?: string | null
          created_at?: string | null
          customer_phone?: string | null
          customer_profile_id?: string | null
          customer_stage?: string | null
          days_since_signup?: number | null
          id?: string
          last_booking_days_ago?: number | null
          message_to_send?: string | null
          recommended_action?: string | null
          sent_at?: string | null
          status?: string | null
          total_bookings?: number | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          allergies: string | null
          auth_user_id: string | null
          avatar_initial: string | null
          created_at: string | null
          customer_tier: string | null
          date_of_birth: string | null
          email: string | null
          full_name: string | null
          hair_color_formula: string | null
          id: string
          last_visit_at: string | null
          loyalty_points: number | null
          metadata: Json | null
          notes: string | null
          phone: string | null
          preferred_branch_id: string | null
          preferred_stylist_id: string | null
          skin_type: string | null
          supplier_id: string | null
          total_spent_egp: number | null
          total_visits: number | null
          updated_at: string | null
        }
        Insert: {
          allergies?: string | null
          auth_user_id?: string | null
          avatar_initial?: string | null
          created_at?: string | null
          customer_tier?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          hair_color_formula?: string | null
          id?: string
          last_visit_at?: string | null
          loyalty_points?: number | null
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          preferred_branch_id?: string | null
          preferred_stylist_id?: string | null
          skin_type?: string | null
          supplier_id?: string | null
          total_spent_egp?: number | null
          total_visits?: number | null
          updated_at?: string | null
        }
        Update: {
          allergies?: string | null
          auth_user_id?: string | null
          avatar_initial?: string | null
          created_at?: string | null
          customer_tier?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          hair_color_formula?: string | null
          id?: string
          last_visit_at?: string | null
          loyalty_points?: number | null
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          preferred_branch_id?: string | null
          preferred_stylist_id?: string | null
          skin_type?: string | null
          supplier_id?: string | null
          total_spent_egp?: number | null
          total_visits?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_preferred_branch_id_fkey"
            columns: ["preferred_branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_preferred_branch_id_fkey"
            columns: ["preferred_branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "customers_preferred_branch_id_fkey"
            columns: ["preferred_branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "customers_preferred_stylist_id_fkey"
            columns: ["preferred_stylist_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_preferred_stylist_id_fkey"
            columns: ["preferred_stylist_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "customers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "customers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      daily_closes: {
        Row: {
          branch_id: string
          business_date: string
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          id: string
          net: number | null
          notes: string | null
          status: string | null
          total_in: number | null
          total_out: number | null
          transaction_count: number | null
        }
        Insert: {
          branch_id: string
          business_date: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          id?: string
          net?: number | null
          notes?: string | null
          status?: string | null
          total_in?: number | null
          total_out?: number | null
          transaction_count?: number | null
        }
        Update: {
          branch_id?: string
          business_date?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          id?: string
          net?: number | null
          notes?: string | null
          status?: string | null
          total_in?: number | null
          total_out?: number | null
          transaction_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_closes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_closes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "daily_closes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      daily_drops: {
        Row: {
          badge_color: string | null
          clicks_count: number
          created_at: string
          cta_label_ar: string
          cta_url: string
          daily_fee_egp: number | null
          discount_label_ar: string | null
          drop_date: string
          drop_price: number | null
          featured_deal_id: string | null
          hero_image_url: string | null
          hero_subtitle_ar: string | null
          hero_title_ar: string
          id: string
          is_active: boolean
          listing_id: string | null
          original_price: number | null
          payer_brand_name: string | null
          sponsorship_type: string
          views_count: number
        }
        Insert: {
          badge_color?: string | null
          clicks_count?: number
          created_at?: string
          cta_label_ar?: string
          cta_url: string
          daily_fee_egp?: number | null
          discount_label_ar?: string | null
          drop_date: string
          drop_price?: number | null
          featured_deal_id?: string | null
          hero_image_url?: string | null
          hero_subtitle_ar?: string | null
          hero_title_ar: string
          id?: string
          is_active?: boolean
          listing_id?: string | null
          original_price?: number | null
          payer_brand_name?: string | null
          sponsorship_type?: string
          views_count?: number
        }
        Update: {
          badge_color?: string | null
          clicks_count?: number
          created_at?: string
          cta_label_ar?: string
          cta_url?: string
          daily_fee_egp?: number | null
          discount_label_ar?: string | null
          drop_date?: string
          drop_price?: number | null
          featured_deal_id?: string | null
          hero_image_url?: string | null
          hero_subtitle_ar?: string | null
          hero_title_ar?: string
          id?: string
          is_active?: boolean
          listing_id?: string | null
          original_price?: number | null
          payer_brand_name?: string | null
          sponsorship_type?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_drops_featured_deal_id_fkey"
            columns: ["featured_deal_id"]
            isOneToOne: false
            referencedRelation: "featured_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_drops_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "daily_drops_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_drops_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_drops_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_drops_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_kpis: {
        Row: {
          agent_costs_estimated_egp: number
          agents_runs: number
          bookings_value: number
          created_at: string
          date: string
          emails_sent: number
          metadata: Json
          new_bookings: number
          new_listings: number
          new_suppliers: number
          page_views: number
          total_active_listings: number
          total_revenue: number
          total_signups: number
          unique_visitors: number
          updated_at: string
          whatsapp_messages_sent: number
          whatsapp_replies_received: number
        }
        Insert: {
          agent_costs_estimated_egp?: number
          agents_runs?: number
          bookings_value?: number
          created_at?: string
          date: string
          emails_sent?: number
          metadata?: Json
          new_bookings?: number
          new_listings?: number
          new_suppliers?: number
          page_views?: number
          total_active_listings?: number
          total_revenue?: number
          total_signups?: number
          unique_visitors?: number
          updated_at?: string
          whatsapp_messages_sent?: number
          whatsapp_replies_received?: number
        }
        Update: {
          agent_costs_estimated_egp?: number
          agents_runs?: number
          bookings_value?: number
          created_at?: string
          date?: string
          emails_sent?: number
          metadata?: Json
          new_bookings?: number
          new_listings?: number
          new_suppliers?: number
          page_views?: number
          total_active_listings?: number
          total_revenue?: number
          total_signups?: number
          unique_visitors?: number
          updated_at?: string
          whatsapp_messages_sent?: number
          whatsapp_replies_received?: number
        }
        Relationships: []
      }
      daily_messages: {
        Row: {
          body: string
          category: string
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          deal_code: string | null
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          last_push_sent_at: string | null
          priority: number
          push_hour: number
          send_as_push: boolean
          show_once_per_user: boolean
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          deal_code?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          last_push_sent_at?: string | null
          priority?: number
          push_hour?: number
          send_as_push?: boolean
          show_once_per_user?: boolean
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          deal_code?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          last_push_sent_at?: string | null
          priority?: number
          push_hour?: number
          send_as_push?: boolean
          show_once_per_user?: boolean
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_tasks: {
        Row: {
          assigned_by: string | null
          branch_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          description: string | null
          due_time: string | null
          employee_id: string
          id: string
          is_auto_generated: boolean | null
          notes: string | null
          priority: string | null
          source_booking_id: string | null
          status: string | null
          task_date: string
          task_kind: string
          title_ar: string
        }
        Insert: {
          assigned_by?: string | null
          branch_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          due_time?: string | null
          employee_id: string
          id?: string
          is_auto_generated?: boolean | null
          notes?: string | null
          priority?: string | null
          source_booking_id?: string | null
          status?: string | null
          task_date?: string
          task_kind?: string
          title_ar: string
        }
        Update: {
          assigned_by?: string | null
          branch_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          due_time?: string | null
          employee_id?: string
          id?: string
          is_auto_generated?: boolean | null
          notes?: string | null
          priority?: string | null
          source_booking_id?: string | null
          status?: string | null
          task_date?: string
          task_kind?: string
          title_ar?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_tasks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_tasks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "daily_tasks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "daily_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      demand_forecasts: {
        Row: {
          agent_name: string | null
          category: string
          confidence: string | null
          contributing_factors: Json | null
          created_at: string | null
          current_supply: number | null
          forecast_date: string
          forecast_period: string | null
          id: string
          predicted_bookings: number | null
          predicted_searches: number | null
          recommended_action: string | null
          supply_gap: number | null
        }
        Insert: {
          agent_name?: string | null
          category: string
          confidence?: string | null
          contributing_factors?: Json | null
          created_at?: string | null
          current_supply?: number | null
          forecast_date: string
          forecast_period?: string | null
          id?: string
          predicted_bookings?: number | null
          predicted_searches?: number | null
          recommended_action?: string | null
          supply_gap?: number | null
        }
        Update: {
          agent_name?: string | null
          category?: string
          confidence?: string | null
          contributing_factors?: Json | null
          created_at?: string | null
          current_supply?: number | null
          forecast_date?: string
          forecast_period?: string | null
          id?: string
          predicted_bookings?: number | null
          predicted_searches?: number | null
          recommended_action?: string | null
          supply_gap?: number | null
        }
        Relationships: []
      }
      design_clip_posts: {
        Row: {
          clip_id: string | null
          id: string
          platform: string
          posted_at: string | null
          target_url: string | null
        }
        Insert: {
          clip_id?: string | null
          id?: string
          platform: string
          posted_at?: string | null
          target_url?: string | null
        }
        Update: {
          clip_id?: string | null
          id?: string
          platform?: string
          posted_at?: string | null
          target_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_clip_posts_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "design_clips"
            referencedColumns: ["id"]
          },
        ]
      }
      design_clips: {
        Row: {
          active: boolean | null
          caption_text: string | null
          categories: string[] | null
          created_at: string | null
          design_file: string | null
          duration_sec: number | null
          id: string
          last_used_at: string | null
          size_bytes: number | null
          slug: string
          storage_path: string
          times_used: number | null
          title: string
          video_url: string
        }
        Insert: {
          active?: boolean | null
          caption_text?: string | null
          categories?: string[] | null
          created_at?: string | null
          design_file?: string | null
          duration_sec?: number | null
          id?: string
          last_used_at?: string | null
          size_bytes?: number | null
          slug: string
          storage_path: string
          times_used?: number | null
          title: string
          video_url: string
        }
        Update: {
          active?: boolean | null
          caption_text?: string | null
          categories?: string[] | null
          created_at?: string | null
          design_file?: string | null
          duration_sec?: number | null
          id?: string
          last_used_at?: string | null
          size_bytes?: number | null
          slug?: string
          storage_path?: string
          times_used?: number | null
          title?: string
          video_url?: string
        }
        Relationships: []
      }
      directory_import_staging: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          created_at: string
          dedupe_key: string | null
          governorate: string | null
          id: string
          imported_at: string | null
          lat: number | null
          lon: number | null
          name: string
          phone: string | null
          promoted_listing_id: string | null
          raw: Json | null
          source: string
          source_ref: string
          status: string
          subtype: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          dedupe_key?: string | null
          governorate?: string | null
          id?: string
          imported_at?: string | null
          lat?: number | null
          lon?: number | null
          name: string
          phone?: string | null
          promoted_listing_id?: string | null
          raw?: Json | null
          source?: string
          source_ref: string
          status?: string
          subtype?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          dedupe_key?: string | null
          governorate?: string | null
          id?: string
          imported_at?: string | null
          lat?: number | null
          lon?: number | null
          name?: string
          phone?: string | null
          promoted_listing_id?: string | null
          raw?: Json | null
          source?: string
          source_ref?: string
          status?: string
          subtype?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      dispute_resolutions: {
        Row: {
          agent_name: string | null
          booking_id: string | null
          confidence_score: number | null
          created_at: string | null
          customer_side: string | null
          evidence_summary: Json | null
          human_decision: string | null
          id: string
          payout_to_supplier: number | null
          reasoning: string | null
          recommended_action: string | null
          refund_amount: number | null
          status: string | null
          supplier_side: string | null
          verdict: string | null
        }
        Insert: {
          agent_name?: string | null
          booking_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          customer_side?: string | null
          evidence_summary?: Json | null
          human_decision?: string | null
          id?: string
          payout_to_supplier?: number | null
          reasoning?: string | null
          recommended_action?: string | null
          refund_amount?: number | null
          status?: string | null
          supplier_side?: string | null
          verdict?: string | null
        }
        Update: {
          agent_name?: string | null
          booking_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          customer_side?: string | null
          evidence_summary?: Json | null
          human_decision?: string | null
          id?: string
          payout_to_supplier?: number | null
          reasoning?: string | null
          recommended_action?: string | null
          refund_amount?: number | null
          status?: string | null
          supplier_side?: string | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_resolutions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "marketplace_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          created_at: string | null
          governorate: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          governorate: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          governorate?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      draft_ttl_config: {
        Row: {
          enabled: boolean
          id: boolean
          last_deleted: number | null
          last_run_at: string | null
          total_deleted: number
          ttl_hours: number
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id?: boolean
          last_deleted?: number | null
          last_run_at?: string | null
          total_deleted?: number
          ttl_hours?: number
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: boolean
          last_deleted?: number | null
          last_run_at?: string | null
          total_deleted?: number
          ttl_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      elite_inbox_map: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_phone: string
          supplier_id: string | null
          tg_message_id: number
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_phone: string
          supplier_id?: string | null
          tg_message_id: number
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string
          supplier_id?: string | null
          tg_message_id?: number
        }
        Relationships: []
      }
      email_change_requests: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          new_email: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          expires_at: string
          new_email: string
          user_id: string
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          expires_at?: string
          new_email?: string
          user_id?: string
        }
        Relationships: []
      }
      email_responses: {
        Row: {
          agent_name: string | null
          classified_intent: string | null
          created_at: string | null
          human_review_needed: boolean | null
          id: string
          inbound_email_body: string | null
          inbound_email_from: string | null
          inbound_email_subject: string | null
          response_body: string | null
          response_sent_at: string | null
          response_subject: string | null
          sentiment: string | null
          status: string | null
          urgency: string | null
        }
        Insert: {
          agent_name?: string | null
          classified_intent?: string | null
          created_at?: string | null
          human_review_needed?: boolean | null
          id?: string
          inbound_email_body?: string | null
          inbound_email_from?: string | null
          inbound_email_subject?: string | null
          response_body?: string | null
          response_sent_at?: string | null
          response_subject?: string | null
          sentiment?: string | null
          status?: string | null
          urgency?: string | null
        }
        Update: {
          agent_name?: string | null
          classified_intent?: string | null
          created_at?: string | null
          human_review_needed?: boolean | null
          id?: string
          inbound_email_body?: string | null
          inbound_email_from?: string | null
          inbound_email_subject?: string | null
          response_body?: string | null
          response_sent_at?: string | null
          response_subject?: string | null
          sentiment?: string | null
          status?: string | null
          urgency?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html_template: string
          body_text_template: string | null
          category: string
          created_at: string
          description: string | null
          is_active: boolean
          language: string
          name_ar: string
          required_vars: string[]
          subject_template: string
          template_key: string
          updated_at: string
          version: number
        }
        Insert: {
          body_html_template: string
          body_text_template?: string | null
          category: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          language?: string
          name_ar: string
          required_vars?: string[]
          subject_template: string
          template_key: string
          updated_at?: string
          version?: number
        }
        Update: {
          body_html_template?: string
          body_text_template?: string | null
          category?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          language?: string
          name_ar?: string
          required_vars?: string[]
          subject_template?: string
          template_key?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      employee_advances: {
        Row: {
          amount_egp: number
          employee_id: string
          granted_at: string | null
          id: string
          linked_transaction_id: string | null
          notes: string | null
          reason: string | null
          recorded_by: string | null
          repaid_amount_egp: number | null
          status: string | null
          supplier_id: string
        }
        Insert: {
          amount_egp: number
          employee_id: string
          granted_at?: string | null
          id?: string
          linked_transaction_id?: string | null
          notes?: string | null
          reason?: string | null
          recorded_by?: string | null
          repaid_amount_egp?: number | null
          status?: string | null
          supplier_id: string
        }
        Update: {
          amount_egp?: number
          employee_id?: string
          granted_at?: string | null
          id?: string
          linked_transaction_id?: string | null
          notes?: string | null
          reason?: string | null
          recorded_by?: string | null
          repaid_amount_egp?: number | null
          status?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_advances_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_advances_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_live_transactions_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_advances_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_advances_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "employee_advances_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      employee_fixed_tasks: {
        Row: {
          active: boolean
          created_at: string | null
          description: string | null
          employee_id: string
          id: string
          last_materialized_date: string | null
          priority: string | null
          recurrence: string | null
          supplier_id: string
          title_ar: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          description?: string | null
          employee_id: string
          id?: string
          last_materialized_date?: string | null
          priority?: string | null
          recurrence?: string | null
          supplier_id: string
          title_ar: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          description?: string | null
          employee_id?: string
          id?: string
          last_materialized_date?: string | null
          priority?: string | null
          recurrence?: string | null
          supplier_id?: string
          title_ar?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_fixed_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_fixed_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_join_requests: {
        Row: {
          branch_id: string | null
          city: string | null
          created_at: string | null
          email: string | null
          expected_salary_egp: number | null
          full_name: string
          id: string
          job_title: string | null
          last_salary_egp: number | null
          matched_employee_id: string | null
          metadata: Json | null
          phone_normalized: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          supplier_id: string
        }
        Insert: {
          branch_id?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          expected_salary_egp?: number | null
          full_name: string
          id?: string
          job_title?: string | null
          last_salary_egp?: number | null
          matched_employee_id?: string | null
          metadata?: Json | null
          phone_normalized: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          supplier_id: string
        }
        Update: {
          branch_id?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          expected_salary_egp?: number | null
          full_name?: string
          id?: string
          job_title?: string | null
          last_salary_egp?: number | null
          matched_employee_id?: string | null
          metadata?: Json | null
          phone_normalized?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_join_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_join_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "employee_join_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "employee_join_requests_matched_employee_id_fkey"
            columns: ["matched_employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_join_requests_matched_employee_id_fkey"
            columns: ["matched_employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_join_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_join_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "employee_join_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      employee_leave_balances: {
        Row: {
          annual_total: number
          annual_used: number
          casual_total: number
          casual_used: number
          created_at: string | null
          employee_id: string
          id: string
          sick_used: number
          supplier_id: string
          updated_at: string | null
          year: number
        }
        Insert: {
          annual_total?: number
          annual_used?: number
          casual_total?: number
          casual_used?: number
          created_at?: string | null
          employee_id: string
          id?: string
          sick_used?: number
          supplier_id: string
          updated_at?: string | null
          year: number
        }
        Update: {
          annual_total?: number
          annual_used?: number
          casual_total?: number
          casual_used?: number
          created_at?: string | null
          employee_id?: string
          id?: string
          sick_used?: number
          supplier_id?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_leave_requests: {
        Row: {
          created_at: string | null
          days: number
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          supplier_id: string
        }
        Insert: {
          created_at?: string | null
          days: number
          employee_id: string
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          supplier_id: string
        }
        Update: {
          created_at?: string | null
          days?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          employee_id: string
          id: string
          read_at: string | null
          supplier_id: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          employee_id: string
          id?: string
          read_at?: string | null
          supplier_id?: string | null
          title: string
          type?: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          employee_id?: string
          id?: string
          read_at?: string | null
          supplier_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_notifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_notifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_role_templates: {
        Row: {
          default_tasks: Json | null
          id: string
          industry: string
          role: string
          role_ar: string
        }
        Insert: {
          default_tasks?: Json | null
          id?: string
          industry: string
          role: string
          role_ar: string
        }
        Update: {
          default_tasks?: Json | null
          id?: string
          industry?: string
          role?: string
          role_ar?: string
        }
        Relationships: []
      }
      employee_salary_history: {
        Row: {
          changed_at: string
          changed_by_name: string | null
          changed_by_phone: string | null
          changed_by_role: string | null
          employee_id: string
          id: string
          new_salary: number
          old_salary: number | null
          supplier_id: string
        }
        Insert: {
          changed_at?: string
          changed_by_name?: string | null
          changed_by_phone?: string | null
          changed_by_role?: string | null
          employee_id: string
          id?: string
          new_salary: number
          old_salary?: number | null
          supplier_id: string
        }
        Update: {
          changed_at?: string
          changed_by_name?: string | null
          changed_by_phone?: string | null
          changed_by_role?: string | null
          employee_id?: string
          id?: string
          new_salary?: number
          old_salary?: number | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_salary_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salary_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_shifts: {
        Row: {
          created_at: string | null
          day_of_week: number
          employee_id: string
          end_time: string
          id: string
          is_day_off: boolean | null
          start_time: string
          supplier_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          employee_id: string
          end_time: string
          id?: string
          is_day_off?: boolean | null
          start_time: string
          supplier_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          employee_id?: string
          end_time?: string
          id?: string
          is_day_off?: boolean | null
          start_time?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_shifts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shifts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "employee_shifts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      erp_accounts: {
        Row: {
          account_type: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_postable: boolean
          name_ar: string
          name_en: string | null
          parent_id: string | null
          supplier_id: string
          system_key: string | null
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_postable?: boolean
          name_ar: string
          name_en?: string | null
          parent_id?: string | null
          supplier_id: string
          system_key?: string | null
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_postable?: boolean
          name_ar?: string
          name_en?: string | null
          parent_id?: string | null
          supplier_id?: string
          system_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "erp_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_accounts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_accounts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "erp_accounts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      erp_import_batches: {
        Row: {
          column_mapping: Json | null
          created_at: string
          created_by: string | null
          entity_type: string
          failed_rows: number
          file_name: string | null
          finished_at: string | null
          id: string
          ok_rows: number
          status: string
          supplier_id: string
          target: Json | null
          total_rows: number
        }
        Insert: {
          column_mapping?: Json | null
          created_at?: string
          created_by?: string | null
          entity_type: string
          failed_rows?: number
          file_name?: string | null
          finished_at?: string | null
          id?: string
          ok_rows?: number
          status?: string
          supplier_id: string
          target?: Json | null
          total_rows?: number
        }
        Update: {
          column_mapping?: Json | null
          created_at?: string
          created_by?: string | null
          entity_type?: string
          failed_rows?: number
          file_name?: string | null
          finished_at?: string | null
          id?: string
          ok_rows?: number
          status?: string
          supplier_id?: string
          target?: Json | null
          total_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "erp_import_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_import_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "erp_import_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      erp_import_rows: {
        Row: {
          batch_id: string
          error: string | null
          id: string
          payload: Json
          result_id: string | null
          row_no: number
          status: string
        }
        Insert: {
          batch_id: string
          error?: string | null
          id?: string
          payload: Json
          result_id?: string | null
          row_no: number
          status?: string
        }
        Update: {
          batch_id?: string
          error?: string | null
          id?: string
          payload?: Json
          result_id?: string | null
          row_no?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_import_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "erp_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_journal_entries: {
        Row: {
          created_at: string
          created_by: string | null
          entry_date: string
          entry_no: number | null
          id: string
          memo: string | null
          posted_at: string | null
          posted_by: string | null
          reversal_of: string | null
          source_id: string | null
          source_type: string | null
          status: string
          supplier_id: string
          total_credit: number
          total_debit: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_no?: number | null
          id?: string
          memo?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reversal_of?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          supplier_id: string
          total_credit?: number
          total_debit?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_no?: number | null
          id?: string
          memo?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reversal_of?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          supplier_id?: string
          total_credit?: number
          total_debit?: number
        }
        Relationships: [
          {
            foreignKeyName: "erp_journal_entries_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "erp_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_journal_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_journal_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "erp_journal_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      erp_journal_lines: {
        Row: {
          account_id: string
          cost_center: string | null
          created_at: string
          credit: number
          debit: number
          entry_id: string
          id: string
          line_memo: string | null
          supplier_id: string
        }
        Insert: {
          account_id: string
          cost_center?: string | null
          created_at?: string
          credit?: number
          debit?: number
          entry_id: string
          id?: string
          line_memo?: string | null
          supplier_id: string
        }
        Update: {
          account_id?: string
          cost_center?: string | null
          created_at?: string
          credit?: number
          debit?: number
          entry_id?: string
          id?: string
          line_memo?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "erp_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "erp_journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_settings: {
        Row: {
          auto_post_from_transactions: boolean
          created_at: string
          fiscal_year_start_month: number
          paid_until: string | null
          subscription_status: string
          supplier_id: string
          suspended_at: string | null
          suspended_by: string | null
          suspended_reason: string | null
          updated_at: string
        }
        Insert: {
          auto_post_from_transactions?: boolean
          created_at?: string
          fiscal_year_start_month?: number
          paid_until?: string | null
          subscription_status?: string
          supplier_id: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          updated_at?: string
        }
        Update: {
          auto_post_from_transactions?: boolean
          created_at?: string
          fiscal_year_start_month?: number
          paid_until?: string | null
          subscription_status?: string
          supplier_id?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_settings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_settings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "erp_settings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          customer_id: string
          listing_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          listing_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_brands: {
        Row: {
          brand_tier: string
          created_at: string
          description_ar: string | null
          display_order: number
          id: string
          industry: string | null
          instagram_handle: string | null
          is_active: boolean
          logo_url: string | null
          name_ar: string
          name_en: string | null
          slug: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          brand_tier?: string
          created_at?: string
          description_ar?: string | null
          display_order?: number
          id?: string
          industry?: string | null
          instagram_handle?: string | null
          is_active?: boolean
          logo_url?: string | null
          name_ar: string
          name_en?: string | null
          slug: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          brand_tier?: string
          created_at?: string
          description_ar?: string | null
          display_order?: number
          id?: string
          industry?: string | null
          instagram_handle?: string | null
          is_active?: boolean
          logo_url?: string | null
          name_ar?: string
          name_en?: string | null
          slug?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      featured_deals: {
        Row: {
          badge_color: string | null
          brand_id: string | null
          category_track: string | null
          clicks_count: number
          created_at: string
          cta_label_ar: string
          cta_url: string
          description_ar: string | null
          discount_label: string | null
          display_order: number
          ends_at: string | null
          hero_image_url: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          monthly_fee_egp: number | null
          paid_until: string | null
          payment_status: string | null
          placement_tier: string | null
          related_category_slugs: string[] | null
          sponsorship_type: string
          starts_at: string | null
          subtitle_ar: string | null
          title_ar: string
          updated_at: string
          views_count: number
        }
        Insert: {
          badge_color?: string | null
          brand_id?: string | null
          category_track?: string | null
          clicks_count?: number
          created_at?: string
          cta_label_ar?: string
          cta_url: string
          description_ar?: string | null
          discount_label?: string | null
          display_order?: number
          ends_at?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          monthly_fee_egp?: number | null
          paid_until?: string | null
          payment_status?: string | null
          placement_tier?: string | null
          related_category_slugs?: string[] | null
          sponsorship_type?: string
          starts_at?: string | null
          subtitle_ar?: string | null
          title_ar: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          badge_color?: string | null
          brand_id?: string | null
          category_track?: string | null
          clicks_count?: number
          created_at?: string
          cta_label_ar?: string
          cta_url?: string
          description_ar?: string | null
          discount_label?: string | null
          display_order?: number
          ends_at?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          monthly_fee_egp?: number | null
          paid_until?: string | null
          payment_status?: string | null
          placement_tier?: string | null
          related_category_slugs?: string[] | null
          sponsorship_type?: string
          starts_at?: string | null
          subtitle_ar?: string | null
          title_ar?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "featured_deals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "featured_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_signals: {
        Row: {
          agent_name: string
          created_at: string | null
          id: string
          output_id: string
          output_table: string
          signal_type: string
          signal_value: string | null
          user_role: string | null
        }
        Insert: {
          agent_name: string
          created_at?: string | null
          id?: string
          output_id: string
          output_table: string
          signal_type: string
          signal_value?: string | null
          user_role?: string | null
        }
        Update: {
          agent_name?: string
          created_at?: string | null
          id?: string
          output_id?: string
          output_table?: string
          signal_type?: string
          signal_value?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount_egp: number
          branch_id: string | null
          category_id: string | null
          category_snapshot: string | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          description: string | null
          direction: string
          id: string
          is_void: boolean | null
          madmona_aware: boolean | null
          madmona_commission_amount: number | null
          madmona_commission_rate: number | null
          occurred_at: string | null
          payment_method: string | null
          receipt_url: string | null
          recorded_by: string | null
          reference_id: string | null
          reference_type: string | null
          staff_id: string | null
          supplier_id: string
          updated_at: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount_egp: number
          branch_id?: string | null
          category_id?: string | null
          category_snapshot?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          direction: string
          id?: string
          is_void?: boolean | null
          madmona_aware?: boolean | null
          madmona_commission_amount?: number | null
          madmona_commission_rate?: number | null
          occurred_at?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          staff_id?: string | null
          supplier_id: string
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount_egp?: number
          branch_id?: string | null
          category_id?: string | null
          category_snapshot?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          direction?: string
          id?: string
          is_void?: boolean | null
          madmona_aware?: boolean | null
          madmona_commission_amount?: number | null
          madmona_commission_rate?: number | null
          occurred_at?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          staff_id?: string | null
          supplier_id?: string
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "financial_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "financial_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      flow_artifacts: {
        Row: {
          body: string | null
          context: Json | null
          created_at: string | null
          drive_error: string | null
          drive_file_id: string | null
          drive_status: string | null
          drive_synced_at: string | null
          id: string
          pipeline_name: string | null
          pipeline_run_id: string | null
          schedule: Json | null
          title: string | null
        }
        Insert: {
          body?: string | null
          context?: Json | null
          created_at?: string | null
          drive_error?: string | null
          drive_file_id?: string | null
          drive_status?: string | null
          drive_synced_at?: string | null
          id?: string
          pipeline_name?: string | null
          pipeline_run_id?: string | null
          schedule?: Json | null
          title?: string | null
        }
        Update: {
          body?: string | null
          context?: Json | null
          created_at?: string | null
          drive_error?: string | null
          drive_file_id?: string | null
          drive_status?: string | null
          drive_synced_at?: string | null
          id?: string
          pipeline_name?: string | null
          pipeline_run_id?: string | null
          schedule?: Json | null
          title?: string | null
        }
        Relationships: []
      }
      flow_sentinel_runs: {
        Row: {
          alerted_admin: boolean | null
          failed_at_step: string | null
          failure_reason: string | null
          finished_at: string | null
          id: string
          started_at: string
          status: string
          steps_passed: number | null
          steps_total: number | null
          test_category: string | null
          test_draft_id: string | null
          test_token: string | null
        }
        Insert: {
          alerted_admin?: boolean | null
          failed_at_step?: string | null
          failure_reason?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          steps_passed?: number | null
          steps_total?: number | null
          test_category?: string | null
          test_draft_id?: string | null
          test_token?: string | null
        }
        Update: {
          alerted_admin?: boolean | null
          failed_at_step?: string | null
          failure_reason?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          steps_passed?: number | null
          steps_total?: number | null
          test_category?: string | null
          test_draft_id?: string | null
          test_token?: string | null
        }
        Relationships: []
      }
      flow_tasks: {
        Row: {
          assignee_email: string | null
          assignee_name: string | null
          completed_at: string | null
          created_at: string
          detail: string | null
          flow_name: string | null
          id: string
          pipeline_run_id: string | null
          priority: string
          source: string
          status: string
          steps: Json
          title: string
          updated_at: string
        }
        Insert: {
          assignee_email?: string | null
          assignee_name?: string | null
          completed_at?: string | null
          created_at?: string
          detail?: string | null
          flow_name?: string | null
          id?: string
          pipeline_run_id?: string | null
          priority?: string
          source?: string
          status?: string
          steps?: Json
          title: string
          updated_at?: string
        }
        Update: {
          assignee_email?: string | null
          assignee_name?: string | null
          completed_at?: string | null
          created_at?: string
          detail?: string | null
          flow_name?: string | null
          id?: string
          pipeline_run_id?: string | null
          priority?: string
          source?: string
          status?: string
          steps?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      fnb_marketing_leads: {
        Row: {
          company: string | null
          connect_sent_at: string | null
          connect_status: string
          created_at: string
          full_name: string
          headline: string | null
          id: string
          linkedin_url: string
          location: string | null
          message_sent_at: string | null
          notes: string | null
          source: string | null
        }
        Insert: {
          company?: string | null
          connect_sent_at?: string | null
          connect_status?: string
          created_at?: string
          full_name: string
          headline?: string | null
          id?: string
          linkedin_url: string
          location?: string | null
          message_sent_at?: string | null
          notes?: string | null
          source?: string | null
        }
        Update: {
          company?: string | null
          connect_sent_at?: string | null
          connect_status?: string
          created_at?: string
          full_name?: string
          headline?: string | null
          id?: string
          linkedin_url?: string
          location?: string | null
          message_sent_at?: string | null
          notes?: string | null
          source?: string | null
        }
        Relationships: []
      }
      fraud_alerts: {
        Row: {
          agent_name: string | null
          alert_type: string | null
          confidence_score: number | null
          created_at: string | null
          description: string | null
          evidence: Json | null
          id: string
          recommended_action: string | null
          severity: string | null
          status: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          agent_name?: string | null
          alert_type?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          evidence?: Json | null
          id?: string
          recommended_action?: string | null
          severity?: string | null
          status?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          agent_name?: string | null
          alert_type?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          evidence?: Json | null
          id?: string
          recommended_action?: string | null
          severity?: string | null
          status?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      generated_reels: {
        Row: {
          campaign_tag: string | null
          duration_sec: number
          error_message: string | null
          generated_at: string
          id: string
          listing_ids: string[]
          listing_titles: string[]
          music_file: string | null
          published_to: Json | null
          size_bytes: number | null
          status: string
          theme: string | null
          utm_tag: string | null
          video_storage_path: string
          video_url: string
        }
        Insert: {
          campaign_tag?: string | null
          duration_sec: number
          error_message?: string | null
          generated_at?: string
          id?: string
          listing_ids: string[]
          listing_titles: string[]
          music_file?: string | null
          published_to?: Json | null
          size_bytes?: number | null
          status?: string
          theme?: string | null
          utm_tag?: string | null
          video_storage_path: string
          video_url: string
        }
        Update: {
          campaign_tag?: string | null
          duration_sec?: number
          error_message?: string | null
          generated_at?: string
          id?: string
          listing_ids?: string[]
          listing_titles?: string[]
          music_file?: string | null
          published_to?: Json | null
          size_bytes?: number | null
          status?: string
          theme?: string | null
          utm_tag?: string | null
          video_storage_path?: string
          video_url?: string
        }
        Relationships: []
      }
      genie_listing_leads: {
        Row: {
          channel: string
          created_at: string
          customer_name: string | null
          customer_phone: string
          id: string
          listing_id: string
          owner_phone: string | null
          request_text: string
          supplier_id: string | null
          wa_queued: boolean
        }
        Insert: {
          channel?: string
          created_at?: string
          customer_name?: string | null
          customer_phone: string
          id?: string
          listing_id: string
          owner_phone?: string | null
          request_text: string
          supplier_id?: string | null
          wa_queued?: boolean
        }
        Update: {
          channel?: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string
          id?: string
          listing_id?: string
          owner_phone?: string | null
          request_text?: string
          supplier_id?: string | null
          wa_queued?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "genie_listing_leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "genie_listing_leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "genie_listing_leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "genie_listing_leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "genie_listing_leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_aliases: {
        Row: {
          alias_norm: string
          canonical_norm: string
        }
        Insert: {
          alias_norm: string
          canonical_norm: string
        }
        Update: {
          alias_norm?: string
          canonical_norm?: string
        }
        Relationships: []
      }
      hr_infractions: {
        Row: {
          acknowledged_at: string | null
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          deduction_amount_egp: number | null
          details: Json | null
          employee_id: string
          grievance_window_until: string | null
          id: string
          infraction_date: string
          infraction_type: string
          note: string | null
          notified_at: string | null
          occurrence_no: number | null
          payroll_item_id: string | null
          proposed_penalty_type: string
          proposed_penalty_value: number
          rule_id: string | null
          source: string
          status: string
          supplier_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          deduction_amount_egp?: number | null
          details?: Json | null
          employee_id: string
          grievance_window_until?: string | null
          id?: string
          infraction_date: string
          infraction_type: string
          note?: string | null
          notified_at?: string | null
          occurrence_no?: number | null
          payroll_item_id?: string | null
          proposed_penalty_type?: string
          proposed_penalty_value?: number
          rule_id?: string | null
          source?: string
          status?: string
          supplier_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          deduction_amount_egp?: number | null
          details?: Json | null
          employee_id?: string
          grievance_window_until?: string | null
          id?: string
          infraction_date?: string
          infraction_type?: string
          note?: string | null
          notified_at?: string | null
          occurrence_no?: number | null
          payroll_item_id?: string | null
          proposed_penalty_type?: string
          proposed_penalty_value?: number
          rule_id?: string | null
          source?: string
          status?: string
          supplier_id?: string
        }
        Relationships: []
      }
      hr_legal_config: {
        Row: {
          annual_leave_days: number
          annual_leave_days_senior: number
          casual_leave_days: number
          casual_leave_max_consecutive: number
          eos_months_per_year_after5: number
          eos_months_per_year_first5: number
          id: string
          income_tax_brackets: Json | null
          insurable_wage_max: number | null
          insurable_wage_min: number | null
          law_reference: string
          max_daily_hours: number
          max_weekly_hours: number
          notes: string | null
          overtime_day_pct: number
          overtime_night_pct: number
          pay_after_termination_days: number
          sick_leave_days: number
          social_insurance_employee_pct: number | null
          social_insurance_employer_pct: number | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          annual_leave_days?: number
          annual_leave_days_senior?: number
          casual_leave_days?: number
          casual_leave_max_consecutive?: number
          eos_months_per_year_after5?: number
          eos_months_per_year_first5?: number
          id?: string
          income_tax_brackets?: Json | null
          insurable_wage_max?: number | null
          insurable_wage_min?: number | null
          law_reference?: string
          max_daily_hours?: number
          max_weekly_hours?: number
          notes?: string | null
          overtime_day_pct?: number
          overtime_night_pct?: number
          pay_after_termination_days?: number
          sick_leave_days?: number
          social_insurance_employee_pct?: number | null
          social_insurance_employer_pct?: number | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          annual_leave_days?: number
          annual_leave_days_senior?: number
          casual_leave_days?: number
          casual_leave_max_consecutive?: number
          eos_months_per_year_after5?: number
          eos_months_per_year_first5?: number
          id?: string
          income_tax_brackets?: Json | null
          insurable_wage_max?: number | null
          insurable_wage_min?: number | null
          law_reference?: string
          max_daily_hours?: number
          max_weekly_hours?: number
          notes?: string | null
          overtime_day_pct?: number
          overtime_night_pct?: number
          pay_after_termination_days?: number
          sick_leave_days?: number
          social_insurance_employee_pct?: number | null
          social_insurance_employer_pct?: number | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hr_penalty_rules: {
        Row: {
          code: string
          created_at: string | null
          grievance_window_hours: number
          id: string
          infraction_type: string
          is_active: boolean
          law_reference: string | null
          name_ar: string
          occurrence_from: number
          occurrence_to: number | null
          penalty_type: string
          penalty_value: number
          requires_approval: boolean
          supplier_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          grievance_window_hours?: number
          id?: string
          infraction_type: string
          is_active?: boolean
          law_reference?: string | null
          name_ar: string
          occurrence_from?: number
          occurrence_to?: number | null
          penalty_type?: string
          penalty_value?: number
          requires_approval?: boolean
          supplier_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          grievance_window_hours?: number
          id?: string
          infraction_type?: string
          is_active?: boolean
          law_reference?: string | null
          name_ar?: string
          occurrence_from?: number
          occurrence_to?: number | null
          penalty_type?: string
          penalty_value?: number
          requires_approval?: boolean
          supplier_id?: string
        }
        Relationships: []
      }
      import_consignment_units: {
        Row: {
          brand: string | null
          chassis_no: string | null
          color: string | null
          consignment_id: string
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          engine_no: string | null
          id: string
          landed_cost_egp: number | null
          listing_id: string | null
          model: string | null
          model_year: number | null
          qty: number
          sale_price_egp: number | null
          sold_at: string | null
          status: string
          supplier_id: string
          unit_fob: number | null
        }
        Insert: {
          brand?: string | null
          chassis_no?: string | null
          color?: string | null
          consignment_id: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          engine_no?: string | null
          id?: string
          landed_cost_egp?: number | null
          listing_id?: string | null
          model?: string | null
          model_year?: number | null
          qty?: number
          sale_price_egp?: number | null
          sold_at?: string | null
          status?: string
          supplier_id: string
          unit_fob?: number | null
        }
        Update: {
          brand?: string | null
          chassis_no?: string | null
          color?: string | null
          consignment_id?: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          engine_no?: string | null
          id?: string
          landed_cost_egp?: number | null
          listing_id?: string | null
          model?: string | null
          model_year?: number | null
          qty?: number
          sale_price_egp?: number | null
          sold_at?: string | null
          status?: string
          supplier_id?: string
          unit_fob?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_consignment_units_consignment_id_fkey"
            columns: ["consignment_id"]
            isOneToOne: false
            referencedRelation: "import_consignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_consignment_units_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "import_consignment_units_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_consignment_units_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_consignment_units_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_consignment_units_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_consignment_units_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_consignment_units_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "import_consignment_units_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      import_consignments: {
        Row: {
          beneficiary_bank: string | null
          bl_no: string | null
          branch_id: string | null
          created_at: string
          currency: string
          customs_decl_no: string | null
          customs_fees_egp: number | null
          eta: string | null
          etd: string | null
          foreign_supplier: string | null
          form4_date: string | null
          form4_no: string | null
          id: string
          incoterm: string | null
          lc_amount: number | null
          lc_bank: string | null
          lc_date: string | null
          lc_no: string | null
          metadata: Json
          nafeza_acid: string | null
          nafeza_date: string | null
          notes: string | null
          origin_country: string | null
          payment_terms: string | null
          port_discharge: string | null
          port_loading: string | null
          proforma_amount: number | null
          proforma_date: string | null
          proforma_no: string | null
          ref: string | null
          release_date: string | null
          stage: string
          status: string
          supplier_id: string
          total_fob: number | null
          total_landed_cost_egp: number | null
          updated_at: string
          vehicle_type: string
          vessel: string | null
        }
        Insert: {
          beneficiary_bank?: string | null
          bl_no?: string | null
          branch_id?: string | null
          created_at?: string
          currency?: string
          customs_decl_no?: string | null
          customs_fees_egp?: number | null
          eta?: string | null
          etd?: string | null
          foreign_supplier?: string | null
          form4_date?: string | null
          form4_no?: string | null
          id?: string
          incoterm?: string | null
          lc_amount?: number | null
          lc_bank?: string | null
          lc_date?: string | null
          lc_no?: string | null
          metadata?: Json
          nafeza_acid?: string | null
          nafeza_date?: string | null
          notes?: string | null
          origin_country?: string | null
          payment_terms?: string | null
          port_discharge?: string | null
          port_loading?: string | null
          proforma_amount?: number | null
          proforma_date?: string | null
          proforma_no?: string | null
          ref?: string | null
          release_date?: string | null
          stage?: string
          status?: string
          supplier_id: string
          total_fob?: number | null
          total_landed_cost_egp?: number | null
          updated_at?: string
          vehicle_type?: string
          vessel?: string | null
        }
        Update: {
          beneficiary_bank?: string | null
          bl_no?: string | null
          branch_id?: string | null
          created_at?: string
          currency?: string
          customs_decl_no?: string | null
          customs_fees_egp?: number | null
          eta?: string | null
          etd?: string | null
          foreign_supplier?: string | null
          form4_date?: string | null
          form4_no?: string | null
          id?: string
          incoterm?: string | null
          lc_amount?: number | null
          lc_bank?: string | null
          lc_date?: string | null
          lc_no?: string | null
          metadata?: Json
          nafeza_acid?: string | null
          nafeza_date?: string | null
          notes?: string | null
          origin_country?: string | null
          payment_terms?: string | null
          port_discharge?: string | null
          port_loading?: string | null
          proforma_amount?: number | null
          proforma_date?: string | null
          proforma_no?: string | null
          ref?: string | null
          release_date?: string | null
          stage?: string
          status?: string
          supplier_id?: string
          total_fob?: number | null
          total_landed_cost_egp?: number | null
          updated_at?: string
          vehicle_type?: string
          vessel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_consignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_consignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "import_consignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "import_consignments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_consignments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "import_consignments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      instant_listing_drafts: {
        Row: {
          category_slug: string | null
          contact_name: string | null
          contact_phone: string
          conversation_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_urls: Json | null
          is_furnished: boolean | null
          period: string | null
          price_egp: number | null
          published_listing_id: string | null
          source_text: string | null
          status: string | null
          title: string
        }
        Insert: {
          category_slug?: string | null
          contact_name?: string | null
          contact_phone: string
          conversation_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_urls?: Json | null
          is_furnished?: boolean | null
          period?: string | null
          price_egp?: number | null
          published_listing_id?: string | null
          source_text?: string | null
          status?: string | null
          title: string
        }
        Update: {
          category_slug?: string | null
          contact_name?: string | null
          contact_phone?: string
          conversation_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_urls?: Json | null
          is_furnished?: boolean | null
          period?: string | null
          price_egp?: number | null
          published_listing_id?: string | null
          source_text?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      integration_outbox: {
        Row: {
          attempts: number
          created_at: string
          delivered_at: string | null
          event_type: string
          id: number
          last_error: string | null
          order_id: string
          payload: Json
          supplier_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          event_type: string
          id?: number
          last_error?: string | null
          order_id: string
          payload: Json
          supplier_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          event_type?: string
          id?: number
          last_error?: string | null
          order_id?: string
          payload?: Json
          supplier_id?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category: string | null
          created_at: string | null
          default_cost_per_unit_egp: number | null
          id: string
          is_for_resale: boolean | null
          metadata: Json | null
          min_stock_alert: number | null
          name_ar: string
          primary_vendor_id: string | null
          selling_price_egp: number | null
          sku: string | null
          status: string | null
          supplier_id: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          default_cost_per_unit_egp?: number | null
          id?: string
          is_for_resale?: boolean | null
          metadata?: Json | null
          min_stock_alert?: number | null
          name_ar: string
          primary_vendor_id?: string | null
          selling_price_egp?: number | null
          sku?: string | null
          status?: string | null
          supplier_id: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          default_cost_per_unit_egp?: number | null
          id?: string
          is_for_resale?: boolean | null
          metadata?: Json | null
          min_stock_alert?: number | null
          name_ar?: string
          primary_vendor_id?: string | null
          selling_price_egp?: number | null
          sku?: string | null
          status?: string | null
          supplier_id?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      inventory_locations: {
        Row: {
          branch_id: string | null
          created_at: string | null
          id: string
          location_type: string
          name: string
          status: string | null
          supplier_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          location_type: string
          name: string
          status?: string | null
          supplier_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          location_type?: string
          name?: string
          status?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_locations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_locations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "inventory_locations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "inventory_locations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_locations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "inventory_locations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          from_location_id: string | null
          id: string
          item_id: string
          linked_transaction_id: string | null
          movement_type: string
          occurred_at: string | null
          quantity: number
          reason: string | null
          recorded_by: string | null
          recorded_by_employee_id: string | null
          supplier_id: string
          to_location_id: string | null
          total_cost_egp: number | null
          unit_cost_egp: number | null
          vendor_id: string | null
        }
        Insert: {
          from_location_id?: string | null
          id?: string
          item_id: string
          linked_transaction_id?: string | null
          movement_type: string
          occurred_at?: string | null
          quantity: number
          reason?: string | null
          recorded_by?: string | null
          recorded_by_employee_id?: string | null
          supplier_id: string
          to_location_id?: string | null
          total_cost_egp?: number | null
          unit_cost_egp?: number | null
          vendor_id?: string | null
        }
        Update: {
          from_location_id?: string | null
          id?: string
          item_id?: string
          linked_transaction_id?: string | null
          movement_type?: string
          occurred_at?: string | null
          quantity?: number
          reason?: string | null
          recorded_by?: string | null
          recorded_by_employee_id?: string | null
          supplier_id?: string
          to_location_id?: string | null
          total_cost_egp?: number | null
          unit_cost_egp?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_status"
            referencedColumns: ["location_id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_status"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_movements_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_live_transactions_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_recorded_by_employee_id_fkey"
            columns: ["recorded_by_employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_recorded_by_employee_id_fkey"
            columns: ["recorded_by_employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "inventory_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "inventory_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "inventory_movements_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_status"
            referencedColumns: ["location_id"]
          },
        ]
      }
      inventory_products: {
        Row: {
          active: boolean | null
          branch_id: string | null
          category: string
          cost_price_egp: number | null
          created_at: string | null
          current_stock: number | null
          id: string
          metadata: Json | null
          name_ar: string
          name_en: string | null
          notes: string | null
          product_type: string | null
          recent_usage: number | null
          reorder_threshold: number | null
          selling_price_egp: number | null
          sku: string | null
          stock_unknown: boolean | null
          supplier_id: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          branch_id?: string | null
          category?: string
          cost_price_egp?: number | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          metadata?: Json | null
          name_ar: string
          name_en?: string | null
          notes?: string | null
          product_type?: string | null
          recent_usage?: number | null
          reorder_threshold?: number | null
          selling_price_egp?: number | null
          sku?: string | null
          stock_unknown?: boolean | null
          supplier_id: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          branch_id?: string | null
          category?: string
          cost_price_egp?: number | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          metadata?: Json | null
          name_ar?: string
          name_en?: string | null
          notes?: string | null
          product_type?: string | null
          recent_usage?: number | null
          reorder_threshold?: number | null
          selling_price_egp?: number | null
          sku?: string | null
          stock_unknown?: boolean | null
          supplier_id?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "inventory_products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "inventory_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "inventory_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      inventory_purchase_items: {
        Row: {
          id: string
          product_id: string
          purchase_order_id: string
          quantity: number
          total_egp: number | null
          unit_cost_egp: number
        }
        Insert: {
          id?: string
          product_id: string
          purchase_order_id: string
          quantity: number
          total_egp?: number | null
          unit_cost_egp: number
        }
        Update: {
          id?: string
          product_id?: string
          purchase_order_id?: string
          quantity?: number
          total_egp?: number | null
          unit_cost_egp?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchase_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "inventory_purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_purchase_orders: {
        Row: {
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          metadata: Json | null
          notes: string | null
          ordered_at: string | null
          paid_egp: number | null
          po_number: string | null
          received_at: string | null
          status: string | null
          supplier_id: string
          total_egp: number | null
          vendor_name: string
          vendor_phone: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          ordered_at?: string | null
          paid_egp?: number | null
          po_number?: string | null
          received_at?: string | null
          status?: string | null
          supplier_id: string
          total_egp?: number | null
          vendor_name: string
          vendor_phone?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          ordered_at?: string | null
          paid_egp?: number | null
          po_number?: string | null
          received_at?: string | null
          status?: string | null
          supplier_id?: string
          total_egp?: number | null
          vendor_name?: string
          vendor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "inventory_purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "inventory_purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "inventory_purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      inventory_stock: {
        Row: {
          item_id: string
          last_movement_at: string | null
          location_id: string
          quantity: number
        }
        Insert: {
          item_id: string
          last_movement_at?: string | null
          location_id: string
          quantity?: number
        }
        Update: {
          item_id?: string
          last_movement_at?: string | null
          location_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_status"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_stock_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_status"
            referencedColumns: ["location_id"]
          },
        ]
      }
      inventory_stock_movements: {
        Row: {
          branch_id: string | null
          created_at: string | null
          id: string
          movement_type: string
          notes: string | null
          performed_by: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          supplier_id: string
          total_egp: number | null
          unit_cost_egp: number | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          performed_by?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          supplier_id: string
          total_egp?: number | null
          unit_cost_egp?: number | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          performed_by?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          supplier_id?: string
          total_egp?: number | null
          unit_cost_egp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "inventory_stock_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "inventory_stock_movements_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_movements_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "inventory_stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "inventory_stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      job_applications: {
        Row: {
          created_at: string | null
          cv_url: string | null
          education: string | null
          email: string | null
          expected_salary: string | null
          full_name: string
          id: string
          message: string | null
          phone: string
          position: string | null
          source: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          cv_url?: string | null
          education?: string | null
          email?: string | null
          expected_salary?: string | null
          full_name: string
          id?: string
          message?: string | null
          phone: string
          position?: string | null
          source?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          cv_url?: string | null
          education?: string | null
          email?: string | null
          expected_salary?: string | null
          full_name?: string
          id?: string
          message?: string | null
          phone?: string
          position?: string | null
          source?: string | null
          status?: string | null
        }
        Relationships: []
      }
      job_item_attempts: {
        Row: {
          attempts: number
          first_at: string
          item_key: string
          job_key: string
          last_at: string
        }
        Insert: {
          attempts?: number
          first_at?: string
          item_key: string
          job_key: string
          last_at?: string
        }
        Update: {
          attempts?: number
          first_at?: string
          item_key?: string
          job_key?: string
          last_at?: string
        }
        Relationships: []
      }
      listing_claims: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          id: string
          listing_id: string
          logo_storage_path: string | null
          logo_url: string | null
          status: string
          token: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          listing_id: string
          logo_storage_path?: string | null
          logo_url?: string | null
          status?: string
          token: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          logo_storage_path?: string | null
          logo_url?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_claims_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_claims_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_claims_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_claims_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_claims_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_content_gaps: {
        Row: {
          business_name: string | null
          category_ar: string | null
          created_at: string
          gap_detail: string | null
          gap_kind: string
          id: string
          is_house_account: boolean
          last_request_at: string | null
          listing_id: string
          listing_title: string | null
          notes: string | null
          reach_phone: string | null
          request_count: number
          requested_at: string | null
          resolved_at: string | null
          status: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          category_ar?: string | null
          created_at?: string
          gap_detail?: string | null
          gap_kind: string
          id?: string
          is_house_account?: boolean
          last_request_at?: string | null
          listing_id: string
          listing_title?: string | null
          notes?: string | null
          reach_phone?: string | null
          request_count?: number
          requested_at?: string | null
          resolved_at?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          category_ar?: string | null
          created_at?: string
          gap_detail?: string | null
          gap_kind?: string
          id?: string
          is_house_account?: boolean
          last_request_at?: string | null
          listing_id?: string
          listing_title?: string | null
          notes?: string | null
          reach_phone?: string | null
          request_count?: number
          requested_at?: string | null
          resolved_at?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_content_gaps_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_content_gaps_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_content_gaps_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_content_gaps_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_content_gaps_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_drafts: {
        Row: {
          account_type: string | null
          address: string | null
          attributes: Json | null
          business_name: string | null
          category_id: string | null
          category_slug: string | null
          city: string | null
          claim_token: string
          claimed_at: string | null
          claimed_by_profile_id: string | null
          cold_lead_id: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          conversation_id: string | null
          converted_listing_id: string | null
          created_at: string | null
          currency: string | null
          country: string | null
          current_step: number | null
          description: string | null
          district: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          photos: Json | null
          price: number | null
          price_period: string | null
          pricing_tiers: Json | null
          source: string | null
          status: string | null
          title: string
          total_steps: number | null
          updated_at: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          account_type?: string | null
          address?: string | null
          attributes?: Json | null
          business_name?: string | null
          category_id?: string | null
          category_slug?: string | null
          city?: string | null
          claim_token?: string
          claimed_at?: string | null
          claimed_by_profile_id?: string | null
          cold_lead_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          converted_listing_id?: string | null
          created_at?: string | null
          currency?: string | null
          country?: string | null
          current_step?: number | null
          description?: string | null
          district?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          photos?: Json | null
          price?: number | null
          price_period?: string | null
          pricing_tiers?: Json | null
          source?: string | null
          status?: string | null
          title: string
          total_steps?: number | null
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          account_type?: string | null
          address?: string | null
          attributes?: Json | null
          business_name?: string | null
          category_id?: string | null
          category_slug?: string | null
          city?: string | null
          claim_token?: string
          claimed_at?: string | null
          claimed_by_profile_id?: string | null
          cold_lead_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          converted_listing_id?: string | null
          created_at?: string | null
          currency?: string | null
          country?: string | null
          current_step?: number | null
          description?: string | null
          district?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          photos?: Json | null
          price?: number | null
          price_period?: string | null
          pricing_tiers?: Json | null
          source?: string | null
          status?: string | null
          title?: string
          total_steps?: number | null
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_drafts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_drafts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_demand_view"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "listing_drafts_claimed_by_profile_id_fkey"
            columns: ["claimed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_drafts_claimed_by_profile_id_fkey"
            columns: ["claimed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_drafts_converted_listing_id_fkey"
            columns: ["converted_listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_drafts_converted_listing_id_fkey"
            columns: ["converted_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_drafts_converted_listing_id_fkey"
            columns: ["converted_listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_drafts_converted_listing_id_fkey"
            columns: ["converted_listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_drafts_converted_listing_id_fkey"
            columns: ["converted_listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_drafts_audit: {
        Row: {
          changed_cols: string[] | null
          city_after: string | null
          city_before: string | null
          draft_id: string | null
          id: number
          op: string | null
          price_after: number | null
          price_before: number | null
          step_after: number | null
          step_before: number | null
          title_after: string | null
          title_before: string | null
          token: string | null
          ts: string | null
        }
        Insert: {
          changed_cols?: string[] | null
          city_after?: string | null
          city_before?: string | null
          draft_id?: string | null
          id?: number
          op?: string | null
          price_after?: number | null
          price_before?: number | null
          step_after?: number | null
          step_before?: number | null
          title_after?: string | null
          title_before?: string | null
          token?: string | null
          ts?: string | null
        }
        Update: {
          changed_cols?: string[] | null
          city_after?: string | null
          city_before?: string | null
          draft_id?: string | null
          id?: number
          op?: string | null
          price_after?: number | null
          price_before?: number | null
          step_after?: number | null
          step_before?: number | null
          title_after?: string | null
          title_before?: string | null
          token?: string | null
          ts?: string | null
        }
        Relationships: []
      }
      listing_drafts_failures: {
        Row: {
          body_keys: string[] | null
          body_snapshot: Json | null
          created_at: string | null
          error_code: string | null
          error_message: string | null
          id: string
          step: number | null
          token: string | null
        }
        Insert: {
          body_keys?: string[] | null
          body_snapshot?: Json | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          step?: number | null
          token?: string | null
        }
        Update: {
          body_keys?: string[] | null
          body_snapshot?: Json | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          step?: number | null
          token?: string | null
        }
        Relationships: []
      }
      listing_inquiries: {
        Row: {
          channel: string | null
          created_at: string
          id: string
          inquirer_id: string | null
          inquirer_name: string | null
          listing_id: string
          listing_title: string | null
          notified_via: string[]
          owner_phone: string | null
          owner_profile_id: string | null
          room_id: string | null
          status: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          id?: string
          inquirer_id?: string | null
          inquirer_name?: string | null
          listing_id: string
          listing_title?: string | null
          notified_via?: string[]
          owner_phone?: string | null
          owner_profile_id?: string | null
          room_id?: string | null
          status?: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          id?: string
          inquirer_id?: string | null
          inquirer_name?: string | null
          listing_id?: string
          listing_title?: string | null
          notified_via?: string[]
          owner_phone?: string | null
          owner_profile_id?: string | null
          room_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_inquiries_inquirer_id_fkey"
            columns: ["inquirer_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_inquiries_inquirer_id_fkey"
            columns: ["inquirer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_inquiries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_inquiries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_inquiries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_inquiries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_inquiries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_inquiries_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_inquiries_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_inquiries_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_photo_candidates: {
        Row: {
          business_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          image_url: string
          received_at: string | null
          source: string
          status: string
          suggested_for_listing_id: string | null
          supplier_id: string | null
        }
        Insert: {
          business_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          image_url: string
          received_at?: string | null
          source?: string
          status?: string
          suggested_for_listing_id?: string | null
          supplier_id?: string | null
        }
        Update: {
          business_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          image_url?: string
          received_at?: string | null
          source?: string
          status?: string
          suggested_for_listing_id?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_photo_candidates_suggested_for_listing_id_fkey"
            columns: ["suggested_for_listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_photo_candidates_suggested_for_listing_id_fkey"
            columns: ["suggested_for_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_photo_candidates_suggested_for_listing_id_fkey"
            columns: ["suggested_for_listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_photo_candidates_suggested_for_listing_id_fkey"
            columns: ["suggested_for_listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_photo_candidates_suggested_for_listing_id_fkey"
            columns: ["suggested_for_listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_photos: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          id: string
          is_placeholder: boolean
          is_primary: boolean
          listing_id: string
          quality_flag: string | null
          storage_path: string | null
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_placeholder?: boolean
          is_primary?: boolean
          listing_id: string
          quality_flag?: string | null
          storage_path?: string | null
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_placeholder?: boolean
          is_primary?: boolean
          listing_id?: string
          quality_flag?: string | null
          storage_path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_publish_outreach: {
        Row: {
          awaiting_photo: boolean
          created_at: string
          last_missing: string[] | null
          last_request_at: string | null
          listing_id: string
          notes: string | null
          owner_phone: string
          photo_attached_at: string | null
          published_at: string | null
          request_count: number
          status: string
          updated_at: string
        }
        Insert: {
          awaiting_photo?: boolean
          created_at?: string
          last_missing?: string[] | null
          last_request_at?: string | null
          listing_id: string
          notes?: string | null
          owner_phone: string
          photo_attached_at?: string | null
          published_at?: string | null
          request_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          awaiting_photo?: boolean
          created_at?: string
          last_missing?: string[] | null
          last_request_at?: string | null
          listing_id?: string
          notes?: string | null
          owner_phone?: string
          photo_attached_at?: string | null
          published_at?: string | null
          request_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_publish_outreach_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_publish_outreach_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_publish_outreach_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_publish_outreach_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_publish_outreach_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_reap_tombstones: {
        Row: {
          listing_id: string | null
          project_id: string
          reaped_at: string
          reason: string | null
          title: string | null
        }
        Insert: {
          listing_id?: string | null
          project_id: string
          reaped_at?: string
          reason?: string | null
          title?: string | null
        }
        Update: {
          listing_id?: string | null
          project_id?: string
          reaped_at?: string
          reason?: string | null
          title?: string | null
        }
        Relationships: []
      }
      listing_values: {
        Row: {
          attribute_id: string
          listing_id: string
          value: Json
        }
        Insert: {
          attribute_id: string
          listing_id: string
          value: Json
        }
        Update: {
          attribute_id?: string
          listing_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "listing_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_values_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_values_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_values_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_values_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_values_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      // 🌍 (٦/٩/٢٠٢٦) دول ومدن الخليج — اتضافوا يدوي مع فتح دول مجلس التعاون
      cities: {
        Row: { id: number; country: string; name_ar: string; name_en: string; display_order: number }
        Insert: { id?: number; country: string; name_ar: string; name_en: string; display_order?: number }
        Update: { id?: number; country?: string; name_ar?: string; name_en?: string; display_order?: number }
        Relationships: []
      }
      countries: {
        Row: { code: string; name_ar: string; name_en: string; currency: string; dial_code: string; flag: string; is_active: boolean; display_order: number }
        Insert: { code: string; name_ar: string; name_en: string; currency: string; dial_code: string; flag?: string; is_active?: boolean; display_order?: number }
        Update: { code?: string; name_ar?: string; name_en?: string; currency?: string; dial_code?: string; flag?: string; is_active?: boolean; display_order?: number }
        Relationships: []
      }
      listings: {
        Row: {
          accepts_insurance: boolean | null
          address: string | null
          advance_booking_days: number
          auto_accept_bookings: boolean
          available_addons: Json | null
          booking_deposit_pct: number | null
          bookings_count: number
          branches: Json
          brand: string | null
          cancellation_hours: number
          category_id: string
          city: string | null
          contact_phone: string | null
          country: string
          currency: string
          created_at: string
          description: string | null
          directory_source: string | null
          district: string | null
          id: string
          i18n: Json | null
          insurance_deposit_pct: number | null
          insurance_partners: string[] | null
          is_directory: boolean
          is_furnished: boolean | null
          latitude: number | null
          longitude: number | null
          max_booking_hours: number | null
          min_booking_hours: number | null
          model_name: string | null
          needs_photo_audit: boolean | null
          phone_verified_at: string | null
          price_egp: number | null
          price_on_request: boolean
          product_condition: string | null
          project_id: string | null
          published_at: string | null
          rating: number | null
          rejection_reason: string | null
          requires_id_verification: boolean
          requires_security_deposit: boolean
          reviews_count: number
          security_deposit_amount: number | null
          seller_type: string | null
          shipping_available: boolean | null
          shipping_cost: number | null
          slug: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["listing_status"]
          stock_quantity: number | null
          supplier_id: string
          title: string
          updated_at: string
          views_count: number
          wholesale_tiers: Json | null
        }
        Insert: {
          accepts_insurance?: boolean | null
          address?: string | null
          advance_booking_days?: number
          auto_accept_bookings?: boolean
          available_addons?: Json | null
          booking_deposit_pct?: number | null
          bookings_count?: number
          branches?: Json
          brand?: string | null
          cancellation_hours?: number
          category_id: string
          city?: string | null
          contact_phone?: string | null
          country?: string
          currency?: string
          created_at?: string
          description?: string | null
          directory_source?: string | null
          district?: string | null
          id?: string
          i18n?: Json | null
          insurance_deposit_pct?: number | null
          insurance_partners?: string[] | null
          is_directory?: boolean
          is_furnished?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_booking_hours?: number | null
          min_booking_hours?: number | null
          model_name?: string | null
          needs_photo_audit?: boolean | null
          phone_verified_at?: string | null
          price_egp?: number | null
          price_on_request?: boolean
          product_condition?: string | null
          project_id?: string | null
          published_at?: string | null
          rating?: number | null
          rejection_reason?: string | null
          requires_id_verification?: boolean
          requires_security_deposit?: boolean
          reviews_count?: number
          security_deposit_amount?: number | null
          seller_type?: string | null
          shipping_available?: boolean | null
          shipping_cost?: number | null
          slug?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          stock_quantity?: number | null
          supplier_id: string
          title: string
          updated_at?: string
          views_count?: number
          wholesale_tiers?: Json | null
        }
        Update: {
          accepts_insurance?: boolean | null
          address?: string | null
          advance_booking_days?: number
          auto_accept_bookings?: boolean
          available_addons?: Json | null
          booking_deposit_pct?: number | null
          bookings_count?: number
          branches?: Json
          brand?: string | null
          cancellation_hours?: number
          category_id?: string
          city?: string | null
          contact_phone?: string | null
          country?: string
          currency?: string
          created_at?: string
          description?: string | null
          directory_source?: string | null
          district?: string | null
          id?: string
          i18n?: Json | null
          insurance_deposit_pct?: number | null
          insurance_partners?: string[] | null
          is_directory?: boolean
          is_furnished?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_booking_hours?: number | null
          min_booking_hours?: number | null
          model_name?: string | null
          needs_photo_audit?: boolean | null
          phone_verified_at?: string | null
          price_egp?: number | null
          price_on_request?: boolean
          product_condition?: string | null
          project_id?: string | null
          published_at?: string | null
          rating?: number | null
          rejection_reason?: string | null
          requires_id_verification?: boolean
          requires_security_deposit?: boolean
          reviews_count?: number
          security_deposit_amount?: number | null
          seller_type?: string | null
          shipping_available?: boolean | null
          shipping_cost?: number | null
          slug?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          stock_quantity?: number | null
          supplier_id?: string
          title?: string
          updated_at?: string
          views_count?: number
          wholesale_tiers?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_demand_view"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "listings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "property_market_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "marketplace_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_weekly_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "listings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_outreach_leads_funnel"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      live_activity_events: {
        Row: {
          category_slug: string | null
          city: string | null
          created_at: string
          display_message_ar: string
          emoji: string | null
          event_type: string
          id: string
          listing_id: string | null
          metadata: Json
        }
        Insert: {
          category_slug?: string | null
          city?: string | null
          created_at?: string
          display_message_ar: string
          emoji?: string | null
          event_type: string
          id?: string
          listing_id?: string | null
          metadata?: Json
        }
        Update: {
          category_slug?: string | null
          city?: string | null
          created_at?: string
          display_message_ar?: string
          emoji?: string | null
          event_type?: string
          id?: string
          listing_id?: string | null
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "live_activity_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "live_activity_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_activity_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_activity_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_activity_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      madmona_accounts: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          last_login_at: string | null
          phone_normalized: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          phone_normalized: string
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          phone_normalized?: string
        }
        Relationships: []
      }
      madmona_otp_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string | null
          expires_at: string
          id: string
          magic_token: string
          magic_verified_at: string | null
          phone_normalized: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          magic_token?: string
          magic_verified_at?: string | null
          phone_normalized: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          magic_token?: string
          magic_verified_at?: string | null
          phone_normalized?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      madmona_sessions: {
        Row: {
          account_id: string
          created_at: string | null
          expires_at: string
          last_seen_at: string | null
          token: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          expires_at?: string
          last_seen_at?: string | null
          token?: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          expires_at?: string
          last_seen_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "madmona_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "madmona_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      madmona_wa_login: {
        Row: {
          account_id: string | null
          auth_user_id: string | null
          code: string
          confirmed_at: string | null
          created_at: string
          expires_at: string
          full_name: string | null
          id: string
          phone_normalized: string | null
          session_token: string | null
          status: string
        }
        Insert: {
          account_id?: string | null
          auth_user_id?: string | null
          code: string
          confirmed_at?: string | null
          created_at?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          phone_normalized?: string | null
          session_token?: string | null
          status?: string
        }
        Update: {
          account_id?: string | null
          auth_user_id?: string | null
          code?: string
          confirmed_at?: string | null
          created_at?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          phone_normalized?: string | null
          session_token?: string | null
          status?: string
        }
        Relationships: []
      }
      marid_contact_card: {
        Row: {
          account_type: string | null
          assets_count: number
          bookings_count: number | null
          business_name: string | null
          customer_since: string | null
          display_name: string | null
          has_erp_crm: boolean | null
          is_partner: boolean | null
          is_supplier: boolean
          kyc_status: string | null
          listings_count: number | null
          phone: string
          profile_id: string | null
          rating: number | null
          role: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          assets_count?: number
          bookings_count?: number | null
          business_name?: string | null
          customer_since?: string | null
          display_name?: string | null
          has_erp_crm?: boolean | null
          is_partner?: boolean | null
          is_supplier?: boolean
          kyc_status?: string | null
          listings_count?: number | null
          phone: string
          profile_id?: string | null
          rating?: number | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          assets_count?: number
          bookings_count?: number | null
          business_name?: string | null
          customer_since?: string | null
          display_name?: string | null
          has_erp_crm?: boolean | null
          is_partner?: boolean | null
          is_supplier?: boolean
          kyc_status?: string | null
          listings_count?: number | null
          phone?: string
          profile_id?: string | null
          rating?: number | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marid_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          phone: string | null
          ref_id: string | null
          ref_table: string | null
          seen: boolean
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          phone?: string | null
          ref_id?: string | null
          ref_table?: string | null
          seen?: boolean
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          phone?: string | null
          ref_id?: string | null
          ref_table?: string | null
          seen?: boolean
          title?: string
        }
        Relationships: []
      }
      marid_pulse: {
        Row: {
          beat_at: string
          id: number
          jobs_error: number
          jobs_ok: number
          jobs_ran: number
          last_trigger: string | null
        }
        Insert: {
          beat_at?: string
          id?: number
          jobs_error?: number
          jobs_ok?: number
          jobs_ran?: number
          last_trigger?: string | null
        }
        Update: {
          beat_at?: string
          id?: number
          jobs_error?: number
          jobs_ok?: number
          jobs_ran?: number
          last_trigger?: string | null
        }
        Relationships: []
      }
      market_products: {
        Row: {
          available: boolean | null
          category: string | null
          compare_at_price: number | null
          currency: string
          description: string | null
          first_seen_at: string
          id: string
          image_url: string | null
          images: string[] | null
          price: number | null
          raw: Json | null
          scraped_at: string
          segment: string | null
          sku: string | null
          source: string
          source_id: string
          subcategory: string | null
          suggested_price: number | null
          tags: string[] | null
          title: string | null
          title_en: string | null
          url: string | null
          vendor: string | null
        }
        Insert: {
          available?: boolean | null
          category?: string | null
          compare_at_price?: number | null
          currency?: string
          description?: string | null
          first_seen_at?: string
          id?: string
          image_url?: string | null
          images?: string[] | null
          price?: number | null
          raw?: Json | null
          scraped_at?: string
          segment?: string | null
          sku?: string | null
          source: string
          source_id: string
          subcategory?: string | null
          suggested_price?: number | null
          tags?: string[] | null
          title?: string | null
          title_en?: string | null
          url?: string | null
          vendor?: string | null
        }
        Update: {
          available?: boolean | null
          category?: string | null
          compare_at_price?: number | null
          currency?: string
          description?: string | null
          first_seen_at?: string
          id?: string
          image_url?: string | null
          images?: string[] | null
          price?: number | null
          raw?: Json | null
          scraped_at?: string
          segment?: string | null
          sku?: string | null
          source?: string
          source_id?: string
          subcategory?: string | null
          suggested_price?: number | null
          tags?: string[] | null
          title?: string | null
          title_en?: string | null
          url?: string | null
          vendor?: string | null
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          agent_name: string | null
          ai_generated: boolean
          audience_segment: string | null
          audience_size: number | null
          campaign_name: string
          campaign_type: string
          channel_meta: Json
          completed_at: string | null
          converted_count: number
          created_at: string
          delivered_count: number
          id: string
          message_template: string | null
          responded_count: number
          scheduled_for: string | null
          sent_count: number
          started_at: string | null
          status: string
          total_revenue: number
        }
        Insert: {
          agent_name?: string | null
          ai_generated?: boolean
          audience_segment?: string | null
          audience_size?: number | null
          campaign_name: string
          campaign_type: string
          channel_meta?: Json
          completed_at?: string | null
          converted_count?: number
          created_at?: string
          delivered_count?: number
          id?: string
          message_template?: string | null
          responded_count?: number
          scheduled_for?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          total_revenue?: number
        }
        Update: {
          agent_name?: string | null
          ai_generated?: boolean
          audience_segment?: string | null
          audience_size?: number | null
          campaign_name?: string
          campaign_type?: string
          channel_meta?: Json
          completed_at?: string | null
          converted_count?: number
          created_at?: string
          delivered_count?: number
          id?: string
          message_template?: string | null
          responded_count?: number
          scheduled_for?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          total_revenue?: number
        }
        Relationships: []
      }
      marketplace_bookings: {
        Row: {
          addons_amount: number | null
          admin_notes: string | null
          base_amount: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          commission_amount: number
          commission_rate: number
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          currency: string
          customer_id: string | null
          customer_national_id: string | null
          customer_notes: string | null
          deposit_amount: number
          deposit_method: string | null
          deposit_paid_at: string | null
          deposit_reference: string | null
          deposit_status: string
          end_at: string
          guest_name: string | null
          guest_national_id: string | null
          guest_phone: string | null
          id: string
          id_verification_status: string | null
          listing_id: string
          pricing_rule_id: string | null
          reference_code: string | null
          selected_addons: Json | null
          start_at: string
          started_at: string | null
          status: Database["public"]["Enums"]["mp_booking_status"]
          supplier_id: string
          supplier_notes: string | null
          supplier_payout: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          addons_amount?: number | null
          admin_notes?: string | null
          base_amount: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          commission_amount: number
          commission_rate: number
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          customer_national_id?: string | null
          customer_notes?: string | null
          deposit_amount?: number
          deposit_method?: string | null
          deposit_paid_at?: string | null
          deposit_reference?: string | null
          deposit_status?: string
          end_at: string
          guest_name?: string | null
          guest_national_id?: string | null
          guest_phone?: string | null
          id?: string
          id_verification_status?: string | null
          listing_id: string
          pricing_rule_id?: string | null
          reference_code?: string | null
          selected_addons?: Json | null
          start_at: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["mp_booking_status"]
          supplier_id: string
          supplier_notes?: string | null
          supplier_payout: number
          tax_amount?: number
          total_amount: number
          updated_at?: string
        }
        Update: {
          addons_amount?: number | null
          admin_notes?: string | null
          base_amount?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          commission_amount?: number
          commission_rate?: number
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          customer_national_id?: string | null
          customer_notes?: string | null
          deposit_amount?: number
          deposit_method?: string | null
          deposit_paid_at?: string | null
          deposit_reference?: string | null
          deposit_status?: string
          end_at?: string
          guest_name?: string | null
          guest_national_id?: string | null
          guest_phone?: string | null
          id?: string
          id_verification_status?: string | null
          listing_id?: string
          pricing_rule_id?: string | null
          reference_code?: string | null
          selected_addons?: Json | null
          start_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["mp_booking_status"]
          supplier_id?: string
          supplier_notes?: string | null
          supplier_payout?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "marketplace_bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_bookings_pricing_rule_id_fkey"
            columns: ["pricing_rule_id"]
            isOneToOne: false
            referencedRelation: "pricing_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "marketplace_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_weekly_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "marketplace_bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_outreach_leads_funnel"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      marketplace_order_items: {
        Row: {
          created_at: string
          description_snapshot: string | null
          id: string
          item_notes: string | null
          line_total: number
          listing_id: string
          mart_product_id: string | null
          menu_item_id: string | null
          menu_size_id: string | null
          name_snapshot: string
          order_id: string
          photo_snapshot: string | null
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description_snapshot?: string | null
          id?: string
          item_notes?: string | null
          line_total: number
          listing_id: string
          mart_product_id?: string | null
          menu_item_id?: string | null
          menu_size_id?: string | null
          name_snapshot: string
          order_id: string
          photo_snapshot?: string | null
          quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description_snapshot?: string | null
          id?: string
          item_notes?: string | null
          line_total?: number
          listing_id?: string
          mart_product_id?: string | null
          menu_item_id?: string | null
          menu_size_id?: string | null
          name_snapshot?: string
          order_id?: string
          photo_snapshot?: string | null
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_order_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "marketplace_order_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_items_mart_product_id_fkey"
            columns: ["mart_product_id"]
            isOneToOne: false
            referencedRelation: "mart_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "restaurant_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_items_menu_size_id_fkey"
            columns: ["menu_size_id"]
            isOneToOne: false
            referencedRelation: "restaurant_menu_item_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          accepted_at: string | null
          admin_notes: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          commission_amount: number
          commission_rate: number
          completed_at: string | null
          created_at: string
          currency: string
          customer_id: string | null
          customer_notes: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_district: string | null
          delivery_fee: number
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_notes: string | null
          delivery_phone: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          order_type: string
          out_for_delivery_at: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          preparing_at: string | null
          primary_listing_id: string | null
          ready_at: string | null
          reference_code: string | null
          status: Database["public"]["Enums"]["mp_order_status"]
          subtotal_amount: number
          supplier_id: string
          supplier_notes: string | null
          supplier_payout: number
          tax_amount: number
          total_amount: number
          updated_at: string
          wallet_discount: number
        }
        Insert: {
          accepted_at?: string | null
          admin_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          commission_amount: number
          commission_rate: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_district?: string | null
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_notes?: string | null
          delivery_phone?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          order_type: string
          out_for_delivery_at?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          preparing_at?: string | null
          primary_listing_id?: string | null
          ready_at?: string | null
          reference_code?: string | null
          status?: Database["public"]["Enums"]["mp_order_status"]
          subtotal_amount: number
          supplier_id: string
          supplier_notes?: string | null
          supplier_payout: number
          tax_amount?: number
          total_amount: number
          updated_at?: string
          wallet_discount?: number
        }
        Update: {
          accepted_at?: string | null
          admin_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          commission_amount?: number
          commission_rate?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_district?: string | null
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_notes?: string | null
          delivery_phone?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          order_type?: string
          out_for_delivery_at?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          preparing_at?: string | null
          primary_listing_id?: string | null
          ready_at?: string | null
          reference_code?: string | null
          status?: Database["public"]["Enums"]["mp_order_status"]
          subtotal_amount?: number
          supplier_id?: string
          supplier_notes?: string | null
          supplier_payout?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          wallet_discount?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_primary_listing_id_fkey"
            columns: ["primary_listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "marketplace_orders_primary_listing_id_fkey"
            columns: ["primary_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_primary_listing_id_fkey"
            columns: ["primary_listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_primary_listing_id_fkey"
            columns: ["primary_listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_primary_listing_id_fkey"
            columns: ["primary_listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "marketplace_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_weekly_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "marketplace_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_outreach_leads_funnel"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      marketplace_payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          currency: string
          id: string
          metadata: Json
          paid_at: string | null
          payment_method: string | null
          provider: string | null
          provider_reference: string | null
          refund_amount: number | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["mp_payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          paid_at?: string | null
          payment_method?: string | null
          provider?: string | null
          provider_reference?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["mp_payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          paid_at?: string | null
          payment_method?: string | null
          provider?: string | null
          provider_reference?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["mp_payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "marketplace_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_suppliers: {
        Row: {
          account_type: string
          bookings_count: number
          business_name: string
          business_name_en: string | null
          commercial_registration: string | null
          commission_rate: number
          cover_url: string | null
          created_at: string
          description: string | null
          has_erp_crm: boolean
          id: string
          country: string | null
          currency: string | null
          is_partner: boolean
          kyc_documents: Json
          kyc_rejection_reason: string | null
          kyc_reviewed_at: string | null
          kyc_reviewed_by: string | null
          kyc_status: Database["public"]["Enums"]["supplier_kyc_status"]
          listings_count: number
          logo_url: string | null
          national_id: string | null
          profile_id: string
          rating: number | null
          reviews_count: number
          tax_id: string | null
          total_revenue: number
          updated_at: string
        }
        Insert: {
          account_type?: string
          bookings_count?: number
          business_name: string
          business_name_en?: string | null
          commercial_registration?: string | null
          commission_rate?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          has_erp_crm?: boolean
          id?: string
          country?: string | null
          currency?: string | null
          is_partner?: boolean
          kyc_documents?: Json
          kyc_rejection_reason?: string | null
          kyc_reviewed_at?: string | null
          kyc_reviewed_by?: string | null
          kyc_status?: Database["public"]["Enums"]["supplier_kyc_status"]
          listings_count?: number
          logo_url?: string | null
          national_id?: string | null
          profile_id: string
          rating?: number | null
          reviews_count?: number
          tax_id?: string | null
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          account_type?: string
          bookings_count?: number
          business_name?: string
          business_name_en?: string | null
          commercial_registration?: string | null
          commission_rate?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          has_erp_crm?: boolean
          id?: string
          country?: string | null
          currency?: string | null
          is_partner?: boolean
          kyc_documents?: Json
          kyc_rejection_reason?: string | null
          kyc_reviewed_at?: string | null
          kyc_reviewed_by?: string | null
          kyc_status?: Database["public"]["Enums"]["supplier_kyc_status"]
          listings_count?: number
          logo_url?: string | null
          national_id?: string | null
          profile_id?: string
          rating?: number | null
          reviews_count?: number
          tax_id?: string | null
          total_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_suppliers_kyc_reviewed_by_fkey"
            columns: ["kyc_reviewed_by"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_suppliers_kyc_reviewed_by_fkey"
            columns: ["kyc_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_suppliers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_suppliers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mart_erp_link: {
        Row: {
          book_accounting: boolean
          control_price: boolean
          control_stock: boolean
          created_at: string
          enabled: boolean
          linked_at: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          book_accounting?: boolean
          control_price?: boolean
          control_stock?: boolean
          created_at?: string
          enabled?: boolean
          linked_at?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          book_accounting?: boolean
          control_price?: boolean
          control_stock?: boolean
          created_at?: string
          enabled?: boolean
          linked_at?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mart_erp_link_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mart_erp_link_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "mart_erp_link_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      mart_products: {
        Row: {
          barcode: string | null
          brand: string | null
          category: string | null
          compare_at_price: number | null
          created_at: string
          currency: string
          description_ar: string | null
          display_order: number
          erp_product_id: string | null
          erp_synced_at: string | null
          id: string
          in_stock: boolean
          is_available: boolean
          is_rx: boolean
          listing_id: string
          name_ar: string
          name_en: string | null
          photo_url: string | null
          price: number
          subcategory: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          description_ar?: string | null
          display_order?: number
          erp_product_id?: string | null
          erp_synced_at?: string | null
          id?: string
          in_stock?: boolean
          is_available?: boolean
          is_rx?: boolean
          listing_id: string
          name_ar: string
          name_en?: string | null
          photo_url?: string | null
          price: number
          subcategory?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          description_ar?: string | null
          display_order?: number
          erp_product_id?: string | null
          erp_synced_at?: string | null
          id?: string
          in_stock?: boolean
          is_available?: boolean
          is_rx?: boolean
          listing_id?: string
          name_ar?: string
          name_en?: string | null
          photo_url?: string | null
          price?: number
          subcategory?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mart_products_erp_product_id_fkey"
            columns: ["erp_product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mart_products_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "mart_products_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mart_products_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mart_products_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mart_products_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      media_library: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          file_size_bytes: number | null
          height: number | null
          id: string
          is_active: boolean | null
          is_branded: boolean | null
          last_used_at: string | null
          mime_type: string | null
          public_url: string
          source: string
          source_id: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          use_count: number | null
          width: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          is_branded?: boolean | null
          last_used_at?: string | null
          mime_type?: string | null
          public_url: string
          source: string
          source_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          use_count?: number | null
          width?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          is_branded?: boolean | null
          last_used_at?: string | null
          mime_type?: string | null
          public_url?: string
          source?: string
          source_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          use_count?: number | null
          width?: number | null
        }
        Relationships: []
      }
      meetings: {
        Row: {
          contact_name: string | null
          conversation_id: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          location: string | null
          notes: string | null
          phone: string
          reminded_at: string | null
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          location?: string | null
          notes?: string | null
          phone: string
          reminded_at?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          location?: string | null
          notes?: string | null
          phone?: string
          reminded_at?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "lifecycle_view"
            referencedColumns: ["conv_id"]
          },
          {
            foreignKeyName: "meetings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "v_outreach_leads_funnel"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "meetings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      metricool_config: {
        Row: {
          autopublish: boolean
          batch: number
          blog_id: string
          enabled: boolean
          google_network: string | null
          id: number
          timezone: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          autopublish?: boolean
          batch?: number
          blog_id: string
          enabled?: boolean
          google_network?: string | null
          id?: number
          timezone?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          autopublish?: boolean
          batch?: number
          blog_id?: string
          enabled?: boolean
          google_network?: string | null
          id?: number
          timezone?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      music_library: {
        Row: {
          cloudinary_public_id: string | null
          created_at: string | null
          duration_seconds: number | null
          id: string
          mime: string | null
          name: string
          public_url: string
          source: string | null
          storage_path: string
          times_used: number | null
        }
        Insert: {
          cloudinary_public_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          mime?: string | null
          name: string
          public_url: string
          source?: string | null
          storage_path: string
          times_used?: number | null
        }
        Update: {
          cloudinary_public_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          mime?: string | null
          name?: string
          public_url?: string
          source?: string | null
          storage_path?: string
          times_used?: number | null
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          body: string
          created_at: string | null
          data: Json | null
          failed_count: number | null
          id: string
          recipient_id: string
          sent_at: string | null
          title: string
          type: string
          url: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          data?: Json | null
          failed_count?: number | null
          id?: string
          recipient_id: string
          sent_at?: string | null
          title: string
          type: string
          url?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          data?: Json | null
          failed_count?: number | null
          id?: string
          recipient_id?: string
          sent_at?: string | null
          title?: string
          type?: string
          url?: string | null
        }
        Relationships: []
      }
      orchestrator_dispatches: {
        Row: {
          actions_count: number | null
          agents_notified: string[] | null
          dispatched_at: string | null
          orchestrator_run_id: number
        }
        Insert: {
          actions_count?: number | null
          agents_notified?: string[] | null
          dispatched_at?: string | null
          orchestrator_run_id: number
        }
        Update: {
          actions_count?: number | null
          agents_notified?: string[] | null
          dispatched_at?: string | null
          orchestrator_run_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "orchestrator_dispatches_orchestrator_run_id_fkey"
            columns: ["orchestrator_run_id"]
            isOneToOne: true
            referencedRelation: "orchestrator_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      orchestrator_job_locks: {
        Row: {
          job_key: string
          locked_at: string
          locked_by: string
          reason: string | null
        }
        Insert: {
          job_key: string
          locked_at?: string
          locked_by?: string
          reason?: string | null
        }
        Update: {
          job_key?: string
          locked_at?: string
          locked_by?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orchestrator_job_locks_job_key_fkey"
            columns: ["job_key"]
            isOneToOne: true
            referencedRelation: "orchestrator_jobs"
            referencedColumns: ["job_key"]
          },
        ]
      }
      orchestrator_job_runs: {
        Row: {
          detail: string | null
          finished_at: string | null
          id: number
          job_key: string | null
          started_at: string
          status: string | null
          triggered_by: string | null
        }
        Insert: {
          detail?: string | null
          finished_at?: string | null
          id?: number
          job_key?: string | null
          started_at?: string
          status?: string | null
          triggered_by?: string | null
        }
        Update: {
          detail?: string | null
          finished_at?: string | null
          id?: number
          job_key?: string | null
          started_at?: string
          status?: string | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      orchestrator_jobs: {
        Row: {
          category: string | null
          command: string
          config: Json
          consecutive_runs: number
          enabled: boolean
          error_count: number
          item_query: string | null
          job_key: string
          last_run_at: string | null
          last_status: string | null
          managed: boolean
          max_consecutive_runs: number | null
          max_item_attempts: number
          max_runs_per_hour: number | null
          policy_cron: string | null
          run_count: number
          source_jobid: number | null
          title: string | null
          tripped_at: string | null
          tripped_reason: string | null
          updated_at: string
          work_check: string | null
        }
        Insert: {
          category?: string | null
          command: string
          config?: Json
          consecutive_runs?: number
          enabled?: boolean
          error_count?: number
          item_query?: string | null
          job_key: string
          last_run_at?: string | null
          last_status?: string | null
          managed?: boolean
          max_consecutive_runs?: number | null
          max_item_attempts?: number
          max_runs_per_hour?: number | null
          policy_cron?: string | null
          run_count?: number
          source_jobid?: number | null
          title?: string | null
          tripped_at?: string | null
          tripped_reason?: string | null
          updated_at?: string
          work_check?: string | null
        }
        Update: {
          category?: string | null
          command?: string
          config?: Json
          consecutive_runs?: number
          enabled?: boolean
          error_count?: number
          item_query?: string | null
          job_key?: string
          last_run_at?: string | null
          last_status?: string | null
          managed?: boolean
          max_consecutive_runs?: number | null
          max_item_attempts?: number
          max_runs_per_hour?: number | null
          policy_cron?: string | null
          run_count?: number
          source_jobid?: number | null
          title?: string | null
          tripped_at?: string | null
          tripped_reason?: string | null
          updated_at?: string
          work_check?: string | null
        }
        Relationships: []
      }
      orchestrator_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          dispatched_msgs: number | null
          error: string | null
          id: number
          pending_msgs_in: number | null
          request_id: number
          status: string | null
          team_report: Json | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          dispatched_msgs?: number | null
          error?: string | null
          id?: number
          pending_msgs_in?: number | null
          request_id: number
          status?: string | null
          team_report?: Json | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          dispatched_msgs?: number | null
          error?: string | null
          id?: number
          pending_msgs_in?: number | null
          request_id?: number
          status?: string | null
          team_report?: Json | null
        }
        Relationships: []
      }
      outreach_log: {
        Row: {
          agent_name: string | null
          body: string | null
          channel: string
          created_at: string
          dashboard_url: string | null
          external_id: string | null
          generated_at: string
          id: string
          message_text: string | null
          metadata: Json
          model_used: string | null
          notes: string | null
          phone: string | null
          reply_at: string | null
          sent_at: string | null
          status: string
          subject: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          agent_name?: string | null
          body?: string | null
          channel?: string
          created_at?: string
          dashboard_url?: string | null
          external_id?: string | null
          generated_at?: string
          id?: string
          message_text?: string | null
          metadata?: Json
          model_used?: string | null
          notes?: string | null
          phone?: string | null
          reply_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          agent_name?: string | null
          body?: string | null
          channel?: string
          created_at?: string
          dashboard_url?: string | null
          external_id?: string | null
          generated_at?: string
          id?: string
          message_text?: string | null
          metadata?: Json
          model_used?: string | null
          notes?: string | null
          phone?: string | null
          reply_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      owner_directives: {
        Row: {
          assignee_agent: string | null
          assignee_label: string | null
          assignee_type: string
          body: string
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          priority: string
          result: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assignee_agent?: string | null
          assignee_label?: string | null
          assignee_type?: string
          body: string
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          result?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assignee_agent?: string | null
          assignee_label?: string | null
          assignee_type?: string
          body?: string
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          result?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      owner_otp_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string | null
          expires_at: string
          id: string
          phone_normalized: string
          supplier_admin_id: string | null
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          phone_normalized: string
          supplier_admin_id?: string | null
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone_normalized?: string
          supplier_admin_id?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_otp_codes_supplier_admin_id_fkey"
            columns: ["supplier_admin_id"]
            isOneToOne: false
            referencedRelation: "supplier_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          last_seen_at: string | null
          supplier_admin_id: string
          token: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string
          last_seen_at?: string | null
          supplier_admin_id: string
          token?: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          last_seen_at?: string | null
          supplier_admin_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_sessions_supplier_admin_id_fkey"
            columns: ["supplier_admin_id"]
            isOneToOne: false
            referencedRelation: "supplier_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_opportunities: {
        Row: {
          agent_name: string | null
          created_at: string | null
          effort_level: string | null
          id: string
          opportunity_summary: string | null
          outreach_message: string | null
          partner_handle: string | null
          partner_name: string
          partner_size: string | null
          partner_type: string | null
          pitch_angle: string | null
          potential_value: string | null
          priority: string | null
          status: string | null
        }
        Insert: {
          agent_name?: string | null
          created_at?: string | null
          effort_level?: string | null
          id?: string
          opportunity_summary?: string | null
          outreach_message?: string | null
          partner_handle?: string | null
          partner_name: string
          partner_size?: string | null
          partner_type?: string | null
          pitch_angle?: string | null
          potential_value?: string | null
          priority?: string | null
          status?: string | null
        }
        Update: {
          agent_name?: string | null
          created_at?: string | null
          effort_level?: string | null
          id?: string
          opportunity_summary?: string | null
          outreach_message?: string | null
          partner_handle?: string | null
          partner_name?: string
          partner_size?: string | null
          partner_type?: string | null
          pitch_angle?: string | null
          potential_value?: string | null
          priority?: string | null
          status?: string | null
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          email: string | null
          expires_at: string
          phone: string | null
          token: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          expires_at: string
          phone?: string | null
          token: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          expires_at?: string
          phone?: string | null
          token?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      payroll_items: {
        Row: {
          advances: number | null
          base_salary: number
          bonuses: number | null
          commissions: number | null
          deductions: number | null
          employee_id: string
          id: string
          metadata: Json | null
          net_amount: number | null
          notes: string | null
          paid_at: string | null
          payroll_run_id: string
        }
        Insert: {
          advances?: number | null
          base_salary?: number
          bonuses?: number | null
          commissions?: number | null
          deductions?: number | null
          employee_id: string
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          notes?: string | null
          paid_at?: string | null
          payroll_run_id: string
        }
        Update: {
          advances?: number | null
          base_salary?: number
          bonuses?: number | null
          commissions?: number | null
          deductions?: number | null
          employee_id?: string
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          notes?: string | null
          paid_at?: string | null
          payroll_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payroll_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          month: number
          notes: string | null
          status: string | null
          supplier_id: string
          total_advances: number | null
          total_base: number | null
          total_bonuses: number | null
          total_commissions: number | null
          total_deductions: number | null
          total_net: number | null
          year: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          month: number
          notes?: string | null
          status?: string | null
          supplier_id: string
          total_advances?: number | null
          total_base?: number | null
          total_bonuses?: number | null
          total_commissions?: number | null
          total_deductions?: number | null
          total_net?: number | null
          year: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          month?: number
          notes?: string | null
          status?: string | null
          supplier_id?: string
          total_advances?: number | null
          total_base?: number | null
          total_bonuses?: number | null
          total_commissions?: number | null
          total_deductions?: number | null
          total_net?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "payroll_runs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      permission_catalog: {
        Row: {
          active: boolean
          created_at: string
          id: string
          key: string
          label_ar: string
          label_en: string | null
          sort: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          key: string
          label_ar: string
          label_en?: string | null
          sort?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          key?: string
          label_ar?: string
          label_en?: string | null
          sort?: number
        }
        Relationships: []
      }
      personalized_recommendations: {
        Row: {
          agent_name: string | null
          clicked_at: string | null
          converted_at: string | null
          created_at: string | null
          customer_phone: string | null
          customer_profile_id: string | null
          delivered_at: string | null
          delivery_channel: string | null
          id: string
          reasoning: string | null
          recommendation_type: string | null
          recommendations: Json | null
        }
        Insert: {
          agent_name?: string | null
          clicked_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          customer_phone?: string | null
          customer_profile_id?: string | null
          delivered_at?: string | null
          delivery_channel?: string | null
          id?: string
          reasoning?: string | null
          recommendation_type?: string | null
          recommendations?: Json | null
        }
        Update: {
          agent_name?: string | null
          clicked_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          customer_phone?: string | null
          customer_profile_id?: string | null
          delivered_at?: string | null
          delivery_channel?: string | null
          id?: string
          reasoning?: string | null
          recommendation_type?: string | null
          recommendations?: Json | null
        }
        Relationships: []
      }
      phone_call_events: {
        Row: {
          caller_k: string | null
          caller_raw: string | null
          created_at: string
          id: string
          matched: string | null
          source: string | null
        }
        Insert: {
          caller_k?: string | null
          caller_raw?: string | null
          created_at?: string
          id?: string
          matched?: string | null
          source?: string | null
        }
        Update: {
          caller_k?: string | null
          caller_raw?: string | null
          created_at?: string
          id?: string
          matched?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_call_events_matched_fkey"
            columns: ["matched"]
            isOneToOne: false
            referencedRelation: "phone_call_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_call_verifications: {
        Row: {
          caller_raw: string | null
          created_at: string
          expires_at: string
          id: string
          issued_number_id: string | null
          phone: string
          phone_k: string
          profile_id: string
          status: string
          verified_at: string | null
        }
        Insert: {
          caller_raw?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          issued_number_id?: string | null
          phone: string
          phone_k: string
          profile_id: string
          status?: string
          verified_at?: string | null
        }
        Update: {
          caller_raw?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          issued_number_id?: string | null
          phone?: string
          phone_k?: string
          profile_id?: string
          status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_call_verifications_issued_number_id_fkey"
            columns: ["issued_number_id"]
            isOneToOne: false
            referencedRelation: "verify_call_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_call_verifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_call_verifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_captures: {
        Row: {
          capture_context: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          listing_id: string | null
          metadata: Json | null
          notes: string | null
          page_url: string | null
          phone: string
          session_id: string | null
          user_agent: string | null
          user_name: string | null
          visitor_id: string | null
          whatsapp_sent: boolean | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          capture_context?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          listing_id?: string | null
          metadata?: Json | null
          notes?: string | null
          page_url?: string | null
          phone: string
          session_id?: string | null
          user_agent?: string | null
          user_name?: string | null
          visitor_id?: string | null
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          capture_context?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          listing_id?: string | null
          metadata?: Json | null
          notes?: string | null
          page_url?: string | null
          phone?: string
          session_id?: string | null
          user_agent?: string | null
          user_name?: string | null
          visitor_id?: string | null
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_captures_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "phone_captures_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_captures_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_captures_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_captures_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verifications: {
        Row: {
          attempts: number | null
          code: string
          created_at: string | null
          created_ip: string | null
          expires_at: string
          id: string
          listing_id: string | null
          max_attempts: number | null
          phone: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string | null
          created_ip?: string | null
          expires_at: string
          id?: string
          listing_id?: string | null
          max_attempts?: number | null
          phone: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string | null
          created_ip?: string | null
          expires_at?: string
          id?: string
          listing_id?: string | null
          max_attempts?: number | null
          phone?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_verifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "phone_verifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_verifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_verifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_verifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_briefs: {
        Row: {
          agent_name: string | null
          created_at: string | null
          current_photo_quality_score: number | null
          estimated_uplift: string | null
          id: string
          issues_with_current: string[] | null
          listing_id: string | null
          reference_examples: string[] | null
          shot_list: Json | null
          status: string | null
          styling_tips: string[] | null
        }
        Insert: {
          agent_name?: string | null
          created_at?: string | null
          current_photo_quality_score?: number | null
          estimated_uplift?: string | null
          id?: string
          issues_with_current?: string[] | null
          listing_id?: string | null
          reference_examples?: string[] | null
          shot_list?: Json | null
          status?: string | null
          styling_tips?: string[] | null
        }
        Update: {
          agent_name?: string | null
          created_at?: string | null
          current_photo_quality_score?: number | null
          estimated_uplift?: string | null
          id?: string
          issues_with_current?: string[] | null
          listing_id?: string | null
          reference_examples?: string[] | null
          shot_list?: Json | null
          status?: string | null
          styling_tips?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_briefs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "photo_briefs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_briefs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_briefs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_briefs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      photoshoot_briefs: {
        Row: {
          agent_name: string | null
          created_at: string | null
          current_photos_score: number | null
          equipment_needed: string[] | null
          estimated_cost_egp: number | null
          estimated_time_minutes: number | null
          example_inspirations: string[] | null
          id: string
          issues_with_current: string[] | null
          listing_id: string | null
          shot_list: Json | null
          status: string | null
          styling_notes: string | null
        }
        Insert: {
          agent_name?: string | null
          created_at?: string | null
          current_photos_score?: number | null
          equipment_needed?: string[] | null
          estimated_cost_egp?: number | null
          estimated_time_minutes?: number | null
          example_inspirations?: string[] | null
          id?: string
          issues_with_current?: string[] | null
          listing_id?: string | null
          shot_list?: Json | null
          status?: string | null
          styling_notes?: string | null
        }
        Update: {
          agent_name?: string | null
          created_at?: string | null
          current_photos_score?: number | null
          equipment_needed?: string[] | null
          estimated_cost_egp?: number | null
          estimated_time_minutes?: number | null
          example_inspirations?: string[] | null
          id?: string
          issues_with_current?: string[] | null
          listing_id?: string | null
          shot_list?: Json | null
          status?: string | null
          styling_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photoshoot_briefs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "photoshoot_briefs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photoshoot_briefs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photoshoot_briefs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photoshoot_briefs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_runs: {
        Row: {
          completed_at: string | null
          current_step: number | null
          error: string | null
          id: string
          pipeline_id: string
          pipeline_name: string
          shared_context: Json
          started_at: string | null
          status: string
          total_steps: number
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          current_step?: number | null
          error?: string | null
          id?: string
          pipeline_id: string
          pipeline_name: string
          shared_context?: Json
          started_at?: string | null
          status?: string
          total_steps: number
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          current_step?: number | null
          error?: string | null
          id?: string
          pipeline_id?: string
          pipeline_name?: string
          shared_context?: Json
          started_at?: string | null
          status?: string
          total_steps?: number
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_runs_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "agent_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_step_runs: {
        Row: {
          agent_name: string
          completed_at: string | null
          duration_ms: number | null
          error: string | null
          id: string
          input: Json | null
          output: Json | null
          output_key: string | null
          pipeline_run_id: string
          started_at: string | null
          status: string
          step_index: number
        }
        Insert: {
          agent_name: string
          completed_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          output_key?: string | null
          pipeline_run_id: string
          started_at?: string | null
          status?: string
          step_index: number
        }
        Update: {
          agent_name?: string
          completed_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          output_key?: string | null
          pipeline_run_id?: string
          started_at?: string | null
          status?: string
          step_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_step_runs_pipeline_run_id_fkey"
            columns: ["pipeline_run_id"]
            isOneToOne: false
            referencedRelation: "pipeline_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_rules: {
        Row: {
          added_at: string
          enabled: boolean
          enforcement_level: string
          id: string
          rationale: string | null
          rule_arabic: string
          rule_english: string | null
          rule_key: string
          scope: string
          source: string | null
          updated_at: string
        }
        Insert: {
          added_at?: string
          enabled?: boolean
          enforcement_level: string
          id?: string
          rationale?: string | null
          rule_arabic: string
          rule_english?: string | null
          rule_key: string
          scope: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          added_at?: string
          enabled?: boolean
          enforcement_level?: string
          id?: string
          rationale?: string | null
          rule_arabic?: string
          rule_english?: string | null
          rule_key?: string
          scope?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      practitioner_profiles: {
        Row: {
          accepted_insurance: string[] | null
          bio: string | null
          consultation_fee_egp: number
          created_at: string
          employee_id: string
          id: string
          languages: string[] | null
          specialty_category_id: string | null
          specialty_label_ar: string | null
          status: string
          supplier_id: string
          title_ar: string
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          accepted_insurance?: string[] | null
          bio?: string | null
          consultation_fee_egp?: number
          created_at?: string
          employee_id: string
          id?: string
          languages?: string[] | null
          specialty_category_id?: string | null
          specialty_label_ar?: string | null
          status?: string
          supplier_id: string
          title_ar: string
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          accepted_insurance?: string[] | null
          bio?: string | null
          consultation_fee_egp?: number
          created_at?: string
          employee_id?: string
          id?: string
          languages?: string[] | null
          specialty_category_id?: string | null
          specialty_label_ar?: string | null
          status?: string
          supplier_id?: string
          title_ar?: string
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "practitioner_profiles_specialty_category_id_fkey"
            columns: ["specialty_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_profiles_specialty_category_id_fkey"
            columns: ["specialty_category_id"]
            isOneToOne: false
            referencedRelation: "category_demand_view"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "practitioner_profiles_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_profiles_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "practitioner_profiles_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          created_at: string
          currency: string
          display_order: number
          id: string
          is_active: boolean
          label_ar: string | null
          label_en: string | null
          listing_id: string
          max_periods: number | null
          min_periods: number | null
          period_count: number
          period_type: Database["public"]["Enums"]["pricing_period"]
          price: number
        }
        Insert: {
          created_at?: string
          currency?: string
          display_order?: number
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string | null
          listing_id: string
          max_periods?: number | null
          min_periods?: number | null
          period_count?: number
          period_type: Database["public"]["Enums"]["pricing_period"]
          price: number
        }
        Update: {
          created_at?: string
          currency?: string
          display_order?: number
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string | null
          listing_id?: string
          max_periods?: number | null
          min_periods?: number | null
          period_count?: number
          period_type?: Database["public"]["Enums"]["pricing_period"]
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "pricing_rules_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_suggestions: {
        Row: {
          agent_name: string | null
          confidence: string | null
          created_at: string | null
          current_price: number | null
          expected_impact: string | null
          id: string
          listing_id: string | null
          market_signals: Json | null
          price_change_pct: number | null
          reasoning: string | null
          rule_details: Json | null
          rule_type: string | null
          status: string | null
          suggested_price: number | null
        }
        Insert: {
          agent_name?: string | null
          confidence?: string | null
          created_at?: string | null
          current_price?: number | null
          expected_impact?: string | null
          id?: string
          listing_id?: string | null
          market_signals?: Json | null
          price_change_pct?: number | null
          reasoning?: string | null
          rule_details?: Json | null
          rule_type?: string | null
          status?: string | null
          suggested_price?: number | null
        }
        Update: {
          agent_name?: string | null
          confidence?: string | null
          created_at?: string | null
          current_price?: number | null
          expected_impact?: string | null
          id?: string
          listing_id?: string | null
          market_signals?: Json | null
          price_change_pct?: number | null
          reasoning?: string | null
          rule_details?: Json | null
          rule_type?: string | null
          status?: string | null
          suggested_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_suggestions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "pricing_suggestions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_suggestions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_suggestions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_suggestions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      product_orders: {
        Row: {
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          items: Json
          notes: string | null
          payment_method: string | null
          status: string
          supplier_id: string
          total_egp: number
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items: Json
          notes?: string | null
          payment_method?: string | null
          status?: string
          supplier_id: string
          total_egp: number
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          payment_method?: string | null
          status?: string
          supplier_id?: string
          total_egp?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "product_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          last_seen_at: string | null
          national_id: string | null
          phone: string
          preferred_language: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          last_seen_at?: string | null
          national_id?: string | null
          phone: string
          preferred_language?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          national_id?: string | null
          phone?: string
          preferred_language?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      project_change_log: {
        Row: {
          action: string
          actor: string
          area: string
          at: string
          detail: string | null
          id: number
          notified_at: string | null
          object_name: string | null
          severity: string
        }
        Insert: {
          action: string
          actor?: string
          area: string
          at?: string
          detail?: string | null
          id?: number
          notified_at?: string | null
          object_name?: string | null
          severity?: string
        }
        Update: {
          action?: string
          actor?: string
          area?: string
          at?: string
          detail?: string | null
          id?: number
          notified_at?: string | null
          object_name?: string | null
          severity?: string
        }
        Relationships: []
      }
      project_inquiries: {
        Row: {
          channel: string
          contact_name: string | null
          contact_phone: string | null
          conversation_id: string | null
          created_at: string
          developer: string | null
          id: string
          message: string | null
          notes: string | null
          project_id: string | null
          project_slug: string | null
          project_title: string | null
          referrer: string | null
          replied_at: string | null
          source: string
          status: string
          user_agent: string | null
        }
        Insert: {
          channel?: string
          contact_name?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          created_at?: string
          developer?: string | null
          id?: string
          message?: string | null
          notes?: string | null
          project_id?: string | null
          project_slug?: string | null
          project_title?: string | null
          referrer?: string | null
          replied_at?: string | null
          source?: string
          status?: string
          user_agent?: string | null
        }
        Update: {
          channel?: string
          contact_name?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          created_at?: string
          developer?: string | null
          id?: string
          message?: string | null
          notes?: string | null
          project_id?: string | null
          project_slug?: string | null
          project_title?: string | null
          referrer?: string | null
          replied_at?: string | null
          source?: string
          status?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_inquiries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "lifecycle_view"
            referencedColumns: ["conv_id"]
          },
          {
            foreignKeyName: "project_inquiries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "v_outreach_leads_funnel"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "project_inquiries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_inquiries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "property_market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      project_units: {
        Row: {
          area_m2: number | null
          bedrooms: number | null
          created_at: string
          currency: string
          floor_label: string | null
          held_by_name: string | null
          held_by_phone: string | null
          held_until: string | null
          id: string
          master_plan_ref: string | null
          notes: string | null
          price: number | null
          project_id: string
          status: string
          unit_code: string
          unit_type: string | null
          updated_at: string
        }
        Insert: {
          area_m2?: number | null
          bedrooms?: number | null
          created_at?: string
          currency?: string
          floor_label?: string | null
          held_by_name?: string | null
          held_by_phone?: string | null
          held_until?: string | null
          id?: string
          master_plan_ref?: string | null
          notes?: string | null
          price?: number | null
          project_id: string
          status?: string
          unit_code: string
          unit_type?: string | null
          updated_at?: string
        }
        Update: {
          area_m2?: number | null
          bedrooms?: number | null
          created_at?: string
          currency?: string
          floor_label?: string | null
          held_by_name?: string | null
          held_by_phone?: string | null
          held_until?: string | null
          id?: string
          master_plan_ref?: string | null
          notes?: string | null
          price?: number | null
          project_id?: string
          status?: string
          unit_code?: string
          unit_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_units_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "property_market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_uses: {
        Row: {
          booking_id: string | null
          customer_id: string | null
          discount_amount: number
          id: string
          promotion_id: string
          used_at: string | null
        }
        Insert: {
          booking_id?: string | null
          customer_id?: string | null
          discount_amount: number
          id?: string
          promotion_id: string
          used_at?: string | null
        }
        Update: {
          booking_id?: string | null
          customer_id?: string | null
          discount_amount?: number
          id?: string
          promotion_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_uses_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "branch_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_uses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_uses_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          applies_to_services: string[] | null
          applies_to_tiers: string[] | null
          code: string
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          min_amount: number | null
          name_ar: string
          per_customer_limit: number | null
          supplier_id: string
          type: string
          usage_limit: number | null
          used_count: number | null
          value: number
        }
        Insert: {
          applies_to_services?: string[] | null
          applies_to_tiers?: string[] | null
          code: string
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          min_amount?: number | null
          name_ar: string
          per_customer_limit?: number | null
          supplier_id: string
          type: string
          usage_limit?: number | null
          used_count?: number | null
          value: number
        }
        Update: {
          applies_to_services?: string[] | null
          applies_to_tiers?: string[] | null
          code?: string
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          min_amount?: number | null
          name_ar?: string
          per_customer_limit?: number | null
          supplier_id?: string
          type?: string
          usage_limit?: number | null
          used_count?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "promotions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      prompt_optimizer_runs: {
        Row: {
          agent_name: string
          completed_at: string | null
          error: string | null
          id: string
          new_version_id: string | null
          request_id: number | null
          started_at: string | null
          status: string
        }
        Insert: {
          agent_name: string
          completed_at?: string | null
          error?: string | null
          id?: string
          new_version_id?: string | null
          request_id?: number | null
          started_at?: string | null
          status?: string
        }
        Update: {
          agent_name?: string
          completed_at?: string | null
          error?: string | null
          id?: string
          new_version_id?: string | null
          request_id?: number | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      prompt_versions: {
        Row: {
          active: boolean | null
          agent_name: string
          approval_rate: number | null
          changes_summary: string | null
          created_at: string | null
          hypothesis: string | null
          id: string
          improvement_notes: string | null
          improvement_source: string | null
          is_active: boolean | null
          prev_version: number | null
          prompt_text: string
          success_rate: number | null
          total_runs: number | null
          version: number
        }
        Insert: {
          active?: boolean | null
          agent_name: string
          approval_rate?: number | null
          changes_summary?: string | null
          created_at?: string | null
          hypothesis?: string | null
          id?: string
          improvement_notes?: string | null
          improvement_source?: string | null
          is_active?: boolean | null
          prev_version?: number | null
          prompt_text: string
          success_rate?: number | null
          total_runs?: number | null
          version: number
        }
        Update: {
          active?: boolean | null
          agent_name?: string
          approval_rate?: number | null
          changes_summary?: string | null
          created_at?: string | null
          hypothesis?: string | null
          id?: string
          improvement_notes?: string | null
          improvement_source?: string | null
          is_active?: boolean | null
          prev_version?: number | null
          prompt_text?: string
          success_rate?: number | null
          total_runs?: number | null
          version?: number
        }
        Relationships: []
      }
      property_market_items: {
        Row: {
          area: string
          area_label: string
          booking_enabled: boolean
          booking_fee: number | null
          booking_fee_note: string | null
          brochure_url: string | null
          city: string | null
          commission_pct: number | null
          contact_phone: string | null
          cover_checked_at: string | null
          cover_url: string | null
          created_at: string
          delivery_label: string | null
          developer: string | null
          district: string | null
          embargo_note: string | null
          embargoed: boolean
          id: string
          country: string | null
          currency: string | null
          info_missing: string | null
          info_requested_at: string | null
          is_active: boolean
          lat: number | null
          lng: number | null
          media: Json
          nawy_compound_id: number | null
          nawy_slug: string | null
          note: string | null
          payment_plan: string | null
          price_from: number | null
          price_to: number | null
          price_unit: string
          property_type: string | null
          segment: string
          slug: string
          sort_order: number
          source_lead_phone: string | null
          source_name: string | null
          status: string
          title: string
          unit_label: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          area?: string
          area_label: string
          booking_enabled?: boolean
          booking_fee?: number | null
          booking_fee_note?: string | null
          brochure_url?: string | null
          city?: string | null
          commission_pct?: number | null
          contact_phone?: string | null
          cover_checked_at?: string | null
          cover_url?: string | null
          created_at?: string
          delivery_label?: string | null
          developer?: string | null
          district?: string | null
          embargo_note?: string | null
          embargoed?: boolean
          id?: string
          country?: string | null
          currency?: string | null
          info_missing?: string | null
          info_requested_at?: string | null
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          media?: Json
          nawy_compound_id?: number | null
          nawy_slug?: string | null
          note?: string | null
          payment_plan?: string | null
          price_from?: number | null
          price_to?: number | null
          price_unit?: string
          property_type?: string | null
          segment: string
          slug: string
          sort_order?: number
          source_lead_phone?: string | null
          source_name?: string | null
          status?: string
          title: string
          unit_label?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          area?: string
          area_label?: string
          booking_enabled?: boolean
          booking_fee?: number | null
          booking_fee_note?: string | null
          brochure_url?: string | null
          city?: string | null
          commission_pct?: number | null
          contact_phone?: string | null
          cover_checked_at?: string | null
          cover_url?: string | null
          created_at?: string
          delivery_label?: string | null
          developer?: string | null
          district?: string | null
          embargo_note?: string | null
          embargoed?: boolean
          id?: string
          country?: string | null
          currency?: string | null
          info_missing?: string | null
          info_requested_at?: string | null
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          media?: Json
          nawy_compound_id?: number | null
          nawy_slug?: string | null
          note?: string | null
          payment_plan?: string | null
          price_from?: number | null
          price_to?: number | null
          price_unit?: string
          property_type?: string | null
          segment?: string
          slug?: string
          sort_order?: number
          source_lead_phone?: string | null
          source_name?: string | null
          status?: string
          title?: string
          unit_label?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      property_opportunities: {
        Row: {
          area_label: string | null
          city: string | null
          developer: string | null
          id: string
          kind: string
          listing_id: string | null
          offer_type: string
          posted_at: string | null
          price_label: string | null
          refreshed_at: string
          snippet: string | null
          title: string
        }
        Insert: {
          area_label?: string | null
          city?: string | null
          developer?: string | null
          id?: string
          kind: string
          listing_id?: string | null
          offer_type?: string
          posted_at?: string | null
          price_label?: string | null
          refreshed_at?: string
          snippet?: string | null
          title: string
        }
        Update: {
          area_label?: string | null
          city?: string | null
          developer?: string | null
          id?: string
          kind?: string
          listing_id?: string | null
          offer_type?: string
          posted_at?: string | null
          price_label?: string | null
          refreshed_at?: string
          snippet?: string | null
          title?: string
        }
        Relationships: []
      }
      push_rotation: {
        Row: {
          body: string
          id: number
          is_active: boolean
          last_sent_at: string | null
          sent_count: number
          title: string
          url: string
        }
        Insert: {
          body: string
          id?: number
          is_active?: boolean
          last_sent_at?: string | null
          sent_count?: number
          title: string
          url: string
        }
        Update: {
          body?: string
          id?: number
          is_active?: boolean
          last_sent_at?: string | null
          sent_count?: number
          title?: string
          url?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          deactivated_at: string | null
          deactivated_reason: string | null
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          profile_id: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_reason?: string | null
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          profile_id: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_reason?: string | null
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          profile_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      qc_reports: {
        Row: {
          agent_name: string | null
          category_correct: boolean | null
          created_at: string | null
          description_quality_score: number | null
          human_review_needed: boolean | null
          id: string
          improvements: Json | null
          issues: Json | null
          listing_id: string | null
          overall_score: number | null
          pass_status: string | null
          photos_quality_score: number | null
          pricing_reasonable: boolean | null
          recommended_action: string | null
          title_quality_score: number | null
        }
        Insert: {
          agent_name?: string | null
          category_correct?: boolean | null
          created_at?: string | null
          description_quality_score?: number | null
          human_review_needed?: boolean | null
          id?: string
          improvements?: Json | null
          issues?: Json | null
          listing_id?: string | null
          overall_score?: number | null
          pass_status?: string | null
          photos_quality_score?: number | null
          pricing_reasonable?: boolean | null
          recommended_action?: string | null
          title_quality_score?: number | null
        }
        Update: {
          agent_name?: string | null
          category_correct?: boolean | null
          created_at?: string | null
          description_quality_score?: number | null
          human_review_needed?: boolean | null
          id?: string
          improvements?: Json | null
          issues?: Json | null
          listing_id?: string | null
          overall_score?: number | null
          pass_status?: string | null
          photos_quality_score?: number | null
          pricing_reasonable?: boolean | null
          recommended_action?: string | null
          title_quality_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "qc_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "qc_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_bills: {
        Row: {
          account_number: string | null
          bill_type: string
          bill_type_ar: string | null
          billing_cycle: string | null
          branch_id: string | null
          created_at: string | null
          due_day_of_month: number | null
          estimated_monthly_amount_egp: number | null
          id: string
          notes: string | null
          provider_name: string | null
          status: string | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          account_number?: string | null
          bill_type: string
          bill_type_ar?: string | null
          billing_cycle?: string | null
          branch_id?: string | null
          created_at?: string | null
          due_day_of_month?: number | null
          estimated_monthly_amount_egp?: number | null
          id?: string
          notes?: string | null
          provider_name?: string | null
          status?: string | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          account_number?: string | null
          bill_type?: string
          bill_type_ar?: string | null
          billing_cycle?: string | null
          branch_id?: string | null
          created_at?: string | null
          due_day_of_month?: number | null
          estimated_monthly_amount_egp?: number | null
          id?: string
          notes?: string | null
          provider_name?: string | null
          status?: string | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_bills_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_bills_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "recurring_bills_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "recurring_bills_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_bills_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "recurring_bills_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      recurring_task_templates: {
        Row: {
          branch_id: string | null
          created_at: string
          day_of_month: number | null
          description: string | null
          due_time: string | null
          employee_id: string
          frequency: string
          id: string
          is_active: boolean
          last_generated_date: string | null
          priority: string
          supplier_id: string
          task_kind: string
          title_ar: string
          weekdays: number[]
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          day_of_month?: number | null
          description?: string | null
          due_time?: string | null
          employee_id: string
          frequency: string
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          priority?: string
          supplier_id: string
          task_kind?: string
          title_ar: string
          weekdays?: number[]
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          day_of_month?: number | null
          description?: string | null
          due_time?: string | null
          employee_id?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          priority?: string
          supplier_id?: string
          task_kind?: string
          title_ar?: string
          weekdays?: number[]
        }
        Relationships: []
      }
      reel_render_log: {
        Row: {
          content_id: string
          created_at: string
          error: string | null
          id: string
          networks: string[] | null
          post_ids: Json | null
          status: string
          video_url: string | null
        }
        Insert: {
          content_id: string
          created_at?: string
          error?: string | null
          id?: string
          networks?: string[] | null
          post_ids?: Json | null
          status?: string
          video_url?: string | null
        }
        Update: {
          content_id?: string
          created_at?: string
          error?: string | null
          id?: string
          networks?: string[] | null
          post_ids?: Json | null
          status?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reel_render_log_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_calendar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_render_log_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_hero_films_publish_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_scripts: {
        Row: {
          agent_name: string | null
          caption: string | null
          category: string | null
          created_at: string | null
          cta: string | null
          hashtags: string[] | null
          hook: string
          id: string
          image_url: string | null
          listing_id: string | null
          metadata: Json
          music_suggestion: string | null
          render_error: string | null
          render_kind: string | null
          rendered_at: string | null
          scenes: Json
          shot_list: Json | null
          status: string | null
          title: string
          total_duration_sec: number | null
          trending_audio_id: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          agent_name?: string | null
          caption?: string | null
          category?: string | null
          created_at?: string | null
          cta?: string | null
          hashtags?: string[] | null
          hook?: string
          id?: string
          image_url?: string | null
          listing_id?: string | null
          metadata?: Json
          music_suggestion?: string | null
          render_error?: string | null
          render_kind?: string | null
          rendered_at?: string | null
          scenes?: Json
          shot_list?: Json | null
          status?: string | null
          title: string
          total_duration_sec?: number | null
          trending_audio_id?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          agent_name?: string | null
          caption?: string | null
          category?: string | null
          created_at?: string | null
          cta?: string | null
          hashtags?: string[] | null
          hook?: string
          id?: string
          image_url?: string | null
          listing_id?: string | null
          metadata?: Json
          music_suggestion?: string | null
          render_error?: string | null
          render_kind?: string | null
          rendered_at?: string | null
          scenes?: Json
          shot_list?: Json | null
          status?: string | null
          title?: string
          total_duration_sec?: number | null
          trending_audio_id?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reel_scripts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "reel_scripts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_scripts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_scripts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_scripts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          owner_phone: string | null
          owner_profile_id: string | null
          owner_type: string
          total_referrals: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          owner_phone?: string | null
          owner_profile_id?: string | null
          owner_type?: string
          total_referrals?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          owner_phone?: string | null
          owner_profile_id?: string | null
          owner_type?: string
          total_referrals?: number
        }
        Relationships: []
      }
      referral_config: {
        Row: {
          customer_referral_reward_egp: number
          id: string
          is_enabled: boolean
          min_booking_amount_egp: number
          referred_bonus_egp: number
          reward_to: string
          supplier_referral_reward_egp: number
          terms_ar: string | null
          updated_at: string
        }
        Insert: {
          customer_referral_reward_egp?: number
          id?: string
          is_enabled?: boolean
          min_booking_amount_egp?: number
          referred_bonus_egp?: number
          reward_to?: string
          supplier_referral_reward_egp?: number
          terms_ar?: string | null
          updated_at?: string
        }
        Update: {
          customer_referral_reward_egp?: number
          id?: string
          is_enabled?: boolean
          min_booking_amount_egp?: number
          referred_bonus_egp?: number
          reward_to?: string
          supplier_referral_reward_egp?: number
          terms_ar?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          metadata: Json
          notes: string | null
          qualified_at: string | null
          qualifying_event: string | null
          qualifying_ref_id: string | null
          referral_kind: string
          referred_name: string | null
          referred_phone: string
          referred_profile_id: string | null
          referrer_phone: string | null
          referrer_profile_id: string | null
          reward_egp: number
          reward_to: string
          rewarded_at: string | null
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          qualified_at?: string | null
          qualifying_event?: string | null
          qualifying_ref_id?: string | null
          referral_kind?: string
          referred_name?: string | null
          referred_phone: string
          referred_profile_id?: string | null
          referrer_phone?: string | null
          referrer_profile_id?: string | null
          reward_egp?: number
          reward_to?: string
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          qualified_at?: string | null
          qualifying_event?: string | null
          qualifying_ref_id?: string | null
          referral_kind?: string
          referred_name?: string | null
          referred_phone?: string
          referred_profile_id?: string | null
          referrer_phone?: string | null
          referrer_profile_id?: string | null
          reward_egp?: number
          reward_to?: string
          rewarded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      restaurant_leads: {
        Row: {
          address: string | null
          area: string | null
          category: string | null
          created_at: string | null
          has_menu: boolean | null
          has_whatsapp: boolean | null
          id: string
          menu_url: string | null
          name: string
          phone: string | null
          place_id: string | null
          rating: number | null
          sector: string
          source: string | null
          status: string | null
          user_ratings_total: number | null
          website: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          category?: string | null
          created_at?: string | null
          has_menu?: boolean | null
          has_whatsapp?: boolean | null
          id?: string
          menu_url?: string | null
          name: string
          phone?: string | null
          place_id?: string | null
          rating?: number | null
          sector?: string
          source?: string | null
          status?: string | null
          user_ratings_total?: number | null
          website?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          category?: string | null
          created_at?: string | null
          has_menu?: boolean | null
          has_whatsapp?: boolean | null
          id?: string
          menu_url?: string | null
          name?: string
          phone?: string | null
          place_id?: string | null
          rating?: number | null
          sector?: string
          source?: string | null
          status?: string | null
          user_ratings_total?: number | null
          website?: string | null
        }
        Relationships: []
      }
      restaurant_menu_item_sizes: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_available: boolean
          menu_item_id: string
          name_ar: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_available?: boolean
          menu_item_id: string
          name_ar: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_available?: boolean
          menu_item_id?: string
          name_ar?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_menu_item_sizes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "restaurant_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_menu_items: {
        Row: {
          category: string | null
          created_at: string
          currency: string
          description_ar: string | null
          description_en: string | null
          display_order: number
          id: string
          is_available: boolean
          listing_id: string
          name_ar: string
          name_en: string | null
          photo_url: string | null
          price: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string
          description_ar?: string | null
          description_en?: string | null
          display_order?: number
          id?: string
          is_available?: boolean
          listing_id: string
          name_ar: string
          name_en?: string | null
          photo_url?: string | null
          price: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string
          description_ar?: string | null
          description_en?: string | null
          display_order?: number
          id?: string
          is_available?: boolean
          listing_id?: string
          name_ar?: string
          name_en?: string | null
          photo_url?: string | null
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_menu_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "restaurant_menu_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_menu_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_menu_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_menu_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_attribution: {
        Row: {
          agent_name: string | null
          amount: number
          attributed_agents: Json | null
          attribution_method: string | null
          booking_id: string | null
          confidence: string | null
          created_at: string | null
          first_touch_agent: string | null
          id: string
          last_touch_agent: string | null
          utm_campaign: string | null
          utm_source: string | null
        }
        Insert: {
          agent_name?: string | null
          amount: number
          attributed_agents?: Json | null
          attribution_method?: string | null
          booking_id?: string | null
          confidence?: string | null
          created_at?: string | null
          first_touch_agent?: string | null
          id?: string
          last_touch_agent?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Update: {
          agent_name?: string | null
          amount?: number
          attributed_agents?: Json | null
          attribution_method?: string | null
          booking_id?: string | null
          confidence?: string | null
          created_at?: string | null
          first_touch_agent?: string | null
          id?: string
          last_touch_agent?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_attribution_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "marketplace_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_attribution_reports: {
        Row: {
          agent_name: string | null
          best_performing_channel: string | null
          campaigns: Json | null
          channels: Json | null
          created_at: string | null
          id: string
          recommendations: string[] | null
          report_period_end: string
          report_period_start: string
          total_bookings: number | null
          total_revenue: number | null
          worst_performing_channel: string | null
        }
        Insert: {
          agent_name?: string | null
          best_performing_channel?: string | null
          campaigns?: Json | null
          channels?: Json | null
          created_at?: string | null
          id?: string
          recommendations?: string[] | null
          report_period_end: string
          report_period_start: string
          total_bookings?: number | null
          total_revenue?: number | null
          worst_performing_channel?: string | null
        }
        Update: {
          agent_name?: string | null
          best_performing_channel?: string | null
          campaigns?: Json | null
          channels?: Json | null
          created_at?: string | null
          id?: string
          recommendations?: string[] | null
          report_period_end?: string
          report_period_start?: string
          total_bookings?: number | null
          total_revenue?: number | null
          worst_performing_channel?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          is_published: boolean
          listing_id: string
          rating: number
          supplier_id: string
          supplier_responded_at: string | null
          supplier_response: string | null
          updated_at: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_published?: boolean
          listing_id: string
          rating: number
          supplier_id: string
          supplier_responded_at?: string | null
          supplier_response?: string | null
          updated_at?: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_published?: boolean
          listing_id?: string
          rating?: number
          supplier_id?: string
          supplier_responded_at?: string | null
          supplier_response?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "marketplace_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "marketplace_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_weekly_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "reviews_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_outreach_leads_funnel"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          advances_deducted_egp: number | null
          base_salary_egp: number | null
          bonuses_egp: number | null
          commission_earned_egp: number | null
          created_at: string | null
          deductions_egp: number | null
          employee_id: string
          id: string
          linked_transaction_id: string | null
          net_paid_egp: number
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          period: string
          recorded_by: string | null
          supplier_id: string
          tips_share_egp: number | null
        }
        Insert: {
          advances_deducted_egp?: number | null
          base_salary_egp?: number | null
          bonuses_egp?: number | null
          commission_earned_egp?: number | null
          created_at?: string | null
          deductions_egp?: number | null
          employee_id: string
          id?: string
          linked_transaction_id?: string | null
          net_paid_egp: number
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          period: string
          recorded_by?: string | null
          supplier_id: string
          tips_share_egp?: number | null
        }
        Update: {
          advances_deducted_egp?: number | null
          base_salary_egp?: number | null
          bonuses_egp?: number | null
          commission_earned_egp?: number | null
          created_at?: string | null
          deductions_egp?: number | null
          employee_id?: string
          id?: string
          linked_transaction_id?: string | null
          net_paid_egp?: number
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          period?: string
          recorded_by?: string | null
          supplier_id?: string
          tips_share_egp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "salary_payments_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_live_transactions_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "salary_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      sales_leads: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          intent: string | null
          interested_category: string | null
          interested_listing_id: string | null
          last_action_at: string
          lead_score: number
          metadata: Json
          notes: string | null
          source: string
          source_ref: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          intent?: string | null
          interested_category?: string | null
          interested_listing_id?: string | null
          last_action_at?: string
          lead_score?: number
          metadata?: Json
          notes?: string | null
          source: string
          source_ref?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          intent?: string | null
          interested_category?: string | null
          interested_listing_id?: string | null
          last_action_at?: string
          lead_score?: number
          metadata?: Json
          notes?: string | null
          source?: string
          source_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_leads_interested_listing_id_fkey"
            columns: ["interested_listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "sales_leads_interested_listing_id_fkey"
            columns: ["interested_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_leads_interested_listing_id_fkey"
            columns: ["interested_listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_leads_interested_listing_id_fkey"
            columns: ["interested_listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_leads_interested_listing_id_fkey"
            columns: ["interested_listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      service_product_consumption: {
        Row: {
          created_at: string | null
          id: string
          is_optional: boolean | null
          notes: string | null
          product_id: string
          quantity_consumed: number
          service_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_optional?: boolean | null
          notes?: string | null
          product_id: string
          quantity_consumed?: number
          service_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_optional?: boolean | null
          notes?: string | null
          product_id?: string
          quantity_consumed?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_product_consumption_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_product_consumption_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      service_ratings: {
        Row: {
          booking_id: string | null
          branch_id: string | null
          comment: string | null
          created_at: string | null
          customer_id: string | null
          customer_name_snapshot: string | null
          employee_id: string | null
          employee_name_snapshot: string | null
          id: string
          rating: number
          service_id: string | null
          service_name_snapshot: string | null
          supplier_id: string
          visit_session_id: string | null
        }
        Insert: {
          booking_id?: string | null
          branch_id?: string | null
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name_snapshot?: string | null
          employee_id?: string | null
          employee_name_snapshot?: string | null
          id?: string
          rating: number
          service_id?: string | null
          service_name_snapshot?: string | null
          supplier_id: string
          visit_session_id?: string | null
        }
        Update: {
          booking_id?: string | null
          branch_id?: string | null
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name_snapshot?: string | null
          employee_id?: string | null
          employee_name_snapshot?: string | null
          id?: string
          rating?: number
          service_id?: string | null
          service_name_snapshot?: string | null
          supplier_id?: string
          visit_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_ratings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "branch_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_ratings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_ratings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "service_ratings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "service_ratings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_ratings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_ratings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "service_ratings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_ratings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_ratings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "service_ratings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "service_ratings_visit_session_id_fkey"
            columns: ["visit_session_id"]
            isOneToOne: false
            referencedRelation: "branch_visit_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      services_catalog: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          name_ar: string
          name_en: string | null
          performer_commission_pct: number | null
          price_egp: number
          provider_employee_id: string | null
          status: string | null
          supplier_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name_ar: string
          name_en?: string | null
          performer_commission_pct?: number | null
          price_egp: number
          provider_employee_id?: string | null
          status?: string | null
          supplier_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name_ar?: string
          name_en?: string | null
          performer_commission_pct?: number | null
          price_egp?: number
          provider_employee_id?: string | null
          status?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_catalog_provider_employee_id_fkey"
            columns: ["provider_employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_catalog_provider_employee_id_fkey"
            columns: ["provider_employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "services_catalog_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_catalog_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "services_catalog_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      site_events: {
        Row: {
          category: string | null
          created_at: string
          device_type: string | null
          event_type: string
          id: string
          listing_id: string | null
          metadata: Json
          page_referrer: string | null
          page_url: string | null
          profile_id: string | null
          search_query: string | null
          session_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          device_type?: string | null
          event_type: string
          id?: string
          listing_id?: string | null
          metadata?: Json
          page_referrer?: string | null
          page_url?: string | null
          profile_id?: string | null
          search_query?: string | null
          session_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          listing_id?: string | null
          metadata?: Json
          page_referrer?: string | null
          page_url?: string | null
          profile_id?: string | null
          search_query?: string | null
          session_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "site_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_groups_catalog: {
        Row: {
          added_by: string | null
          category_slug: string
          created_at: string | null
          group_name: string
          group_url: string
          id: string
          is_active: boolean | null
          members_count: number | null
          notes: string | null
          platform: string
          posting_rules: string | null
        }
        Insert: {
          added_by?: string | null
          category_slug: string
          created_at?: string | null
          group_name: string
          group_url: string
          id?: string
          is_active?: boolean | null
          members_count?: number | null
          notes?: string | null
          platform?: string
          posting_rules?: string | null
        }
        Update: {
          added_by?: string | null
          category_slug?: string
          created_at?: string | null
          group_name?: string
          group_url?: string
          id?: string
          is_active?: boolean | null
          members_count?: number | null
          notes?: string | null
          platform?: string
          posting_rules?: string | null
        }
        Relationships: []
      }
      social_inbox_log: {
        Row: {
          conversation_id: string | null
          created_at: string
          error: string | null
          id: string
          inbound_at: string | null
          inbound_text: string | null
          kind: string | null
          message_id: string | null
          provider: string | null
          replied_at: string | null
          reply_text: string | null
          status: string
          updated_at: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          inbound_at?: string | null
          inbound_text?: string | null
          kind?: string | null
          message_id?: string | null
          provider?: string | null
          replied_at?: string | null
          reply_text?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          inbound_at?: string | null
          inbound_text?: string | null
          kind?: string | null
          message_id?: string | null
          provider?: string | null
          replied_at?: string | null
          reply_text?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_inbox_settings: {
        Row: {
          brand_system_prompt: string | null
          comment_mode: string
          comment_reply_path: string
          conv_reply_path: string
          dm_mode: string
          enabled: boolean
          id: number
          list_array_path: string | null
          list_query: Json
          list_url: string | null
          map_conv_id: string | null
          map_kind: string | null
          map_msg_id: string | null
          map_network: string | null
          map_text: string | null
          map_time: string | null
          model: string
          poll_minutes: number
          providers: Json
          reply_body: string | null
          reply_method: string
          reply_text_key: string
          reply_url: string | null
          review_mode: string
          review_reply_path: string
          single_row: boolean | null
          updated_at: string
        }
        Insert: {
          brand_system_prompt?: string | null
          comment_mode?: string
          comment_reply_path?: string
          conv_reply_path?: string
          dm_mode?: string
          enabled?: boolean
          id?: number
          list_array_path?: string | null
          list_query?: Json
          list_url?: string | null
          map_conv_id?: string | null
          map_kind?: string | null
          map_msg_id?: string | null
          map_network?: string | null
          map_text?: string | null
          map_time?: string | null
          model?: string
          poll_minutes?: number
          providers?: Json
          reply_body?: string | null
          reply_method?: string
          reply_text_key?: string
          reply_url?: string | null
          review_mode?: string
          review_reply_path?: string
          single_row?: boolean | null
          updated_at?: string
        }
        Update: {
          brand_system_prompt?: string | null
          comment_mode?: string
          comment_reply_path?: string
          conv_reply_path?: string
          dm_mode?: string
          enabled?: boolean
          id?: number
          list_array_path?: string | null
          list_query?: Json
          list_url?: string | null
          map_conv_id?: string | null
          map_kind?: string | null
          map_msg_id?: string | null
          map_network?: string | null
          map_text?: string | null
          map_time?: string | null
          model?: string
          poll_minutes?: number
          providers?: Json
          reply_body?: string | null
          reply_method?: string
          reply_text_key?: string
          reply_url?: string | null
          review_mode?: string
          review_reply_path?: string
          single_row?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      social_pack_group_posts: {
        Row: {
          copied_at: string | null
          created_at: string | null
          external_post_url: string | null
          group_id: string
          id: string
          notes: string | null
          pack_id: string
          post_text: string
          posted_at: string | null
          posted_by: string | null
          status: string
        }
        Insert: {
          copied_at?: string | null
          created_at?: string | null
          external_post_url?: string | null
          group_id: string
          id?: string
          notes?: string | null
          pack_id: string
          post_text: string
          posted_at?: string | null
          posted_by?: string | null
          status?: string
        }
        Update: {
          copied_at?: string | null
          created_at?: string | null
          external_post_url?: string | null
          group_id?: string
          id?: string
          notes?: string | null
          pack_id?: string
          post_text?: string
          posted_at?: string | null
          posted_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_pack_group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "social_groups_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_pack_group_posts_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "social_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_packs: {
        Row: {
          carousel_canva_id: string | null
          carousel_canva_url: string | null
          completed_at: string | null
          created_at: string
          design_brief: string | null
          error_message: string | null
          generated_by_run_id: string | null
          hashtags: string[] | null
          id: string
          listing_id: string
          post_copies: Json | null
          published_to_fb_page_at: string | null
          published_to_ig_at: string | null
          reel_script: Json | null
          retry_count: number | null
          scheduled_at: string | null
          square_canva_id: string | null
          square_canva_url: string | null
          status: string
          story_canva_id: string | null
          story_canva_url: string | null
          updated_at: string
        }
        Insert: {
          carousel_canva_id?: string | null
          carousel_canva_url?: string | null
          completed_at?: string | null
          created_at?: string
          design_brief?: string | null
          error_message?: string | null
          generated_by_run_id?: string | null
          hashtags?: string[] | null
          id?: string
          listing_id: string
          post_copies?: Json | null
          published_to_fb_page_at?: string | null
          published_to_ig_at?: string | null
          reel_script?: Json | null
          retry_count?: number | null
          scheduled_at?: string | null
          square_canva_id?: string | null
          square_canva_url?: string | null
          status?: string
          story_canva_id?: string | null
          story_canva_url?: string | null
          updated_at?: string
        }
        Update: {
          carousel_canva_id?: string | null
          carousel_canva_url?: string | null
          completed_at?: string | null
          created_at?: string
          design_brief?: string | null
          error_message?: string | null
          generated_by_run_id?: string | null
          hashtags?: string[] | null
          id?: string
          listing_id?: string
          post_copies?: Json | null
          published_to_fb_page_at?: string | null
          published_to_ig_at?: string | null
          reel_script?: Json | null
          retry_count?: number | null
          scheduled_at?: string | null
          square_canva_id?: string | null
          square_canva_url?: string | null
          status?: string
          story_canva_id?: string | null
          story_canva_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_packs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "social_packs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_packs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_packs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_packs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      social_photo_posts: {
        Row: {
          id: number
          listing_id: string
          platform: string
          posted_at: string
          target_url: string | null
        }
        Insert: {
          id?: never
          listing_id: string
          platform: string
          posted_at?: string
          target_url?: string | null
        }
        Update: {
          id?: never
          listing_id?: string
          platform?: string
          posted_at?: string
          target_url?: string | null
        }
        Relationships: []
      }
      space_blocks: {
        Row: {
          block_date: string
          created_at: string
          created_by: string | null
          end_hour: number
          id: string
          reason: string | null
          space_slug: string
          start_hour: number
        }
        Insert: {
          block_date: string
          created_at?: string
          created_by?: string | null
          end_hour: number
          id?: string
          reason?: string | null
          space_slug: string
          start_hour: number
        }
        Update: {
          block_date?: string
          created_at?: string
          created_by?: string | null
          end_hour?: number
          id?: string
          reason?: string | null
          space_slug?: string
          start_hour?: number
        }
        Relationships: []
      }
      space_units: {
        Row: {
          capacity: number
          category_slug: string
          created_at: string
          description_ar: string | null
          id: string
          is_active: boolean
          name_ar: string
          operating_end_hour: number
          operating_start_hour: number
          photo_urls: string[]
          price_daily: number | null
          price_hourly: number | null
          price_monthly: number | null
          price_package_10: number | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          category_slug: string
          created_at?: string
          description_ar?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          operating_end_hour?: number
          operating_start_hour?: number
          photo_urls?: string[]
          price_daily?: number | null
          price_hourly?: number | null
          price_monthly?: number | null
          price_package_10?: number | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          category_slug?: string
          created_at?: string
          description_ar?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          operating_end_hour?: number
          operating_start_hour?: number
          photo_urls?: string[]
          price_daily?: number | null
          price_hourly?: number | null
          price_monthly?: number | null
          price_package_10?: number | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_units_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "unit_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "space_units_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_units_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "space_units_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      static_pages: {
        Row: {
          description: string | null
          html_content: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          description?: string | null
          html_content: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          description?: string | null
          html_content?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      storage_upload_audit: {
        Row: {
          bucket: string
          caller_role: string | null
          caller_user_id: string | null
          created_at: string
          id: string
          is_admin_secret: boolean
          mime: string | null
          path: string
          public_url: string | null
          size_bytes: number | null
        }
        Insert: {
          bucket: string
          caller_role?: string | null
          caller_user_id?: string | null
          created_at?: string
          id?: string
          is_admin_secret?: boolean
          mime?: string | null
          path: string
          public_url?: string | null
          size_bytes?: number | null
        }
        Update: {
          bucket?: string
          caller_role?: string | null
          caller_user_id?: string | null
          created_at?: string
          id?: string
          is_admin_secret?: boolean
          mime?: string | null
          path?: string
          public_url?: string | null
          size_bytes?: number | null
        }
        Relationships: []
      }
      strategy_plays: {
        Row: {
          actual_impact: string | null
          agent_name: string | null
          created_at: string | null
          effort_level: string | null
          expected_impact: string | null
          hypothesis: string | null
          id: string
          lessons_learned: string | null
          play_type: string | null
          priority: string | null
          required_resources: Json | null
          status: string | null
          steps: Json | null
          success_metrics: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_impact?: string | null
          agent_name?: string | null
          created_at?: string | null
          effort_level?: string | null
          expected_impact?: string | null
          hypothesis?: string | null
          id?: string
          lessons_learned?: string | null
          play_type?: string | null
          priority?: string | null
          required_resources?: Json | null
          status?: string | null
          steps?: Json | null
          success_metrics?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_impact?: string | null
          agent_name?: string | null
          created_at?: string | null
          effort_level?: string | null
          expected_impact?: string | null
          hypothesis?: string | null
          id?: string
          lessons_learned?: string | null
          play_type?: string | null
          priority?: string | null
          required_resources?: Json | null
          status?: string | null
          steps?: Json | null
          success_metrics?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      supplier_admins: {
        Row: {
          active: boolean | null
          auth_user_id: string | null
          branch_id: string | null
          can_edit: boolean
          email: string | null
          full_name: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          last_login_at: string | null
          notify_attendance: boolean
          phone: string | null
          role: string
          supplier_id: string
        }
        Insert: {
          active?: boolean | null
          auth_user_id?: string | null
          branch_id?: string | null
          can_edit?: boolean
          email?: string | null
          full_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_login_at?: string | null
          notify_attendance?: boolean
          phone?: string | null
          role?: string
          supplier_id: string
        }
        Update: {
          active?: boolean | null
          auth_user_id?: string | null
          branch_id?: string | null
          can_edit?: boolean
          email?: string | null
          full_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_login_at?: string | null
          notify_attendance?: boolean
          phone?: string | null
          role?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_admins_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_admins_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "supplier_admins_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "supplier_admins_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_admins_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_admins_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      supplier_branches: {
        Row: {
          address: string | null
          attendance_mode: string
          booking_enabled: boolean | null
          city: string | null
          closes_at: string | null
          code: string | null
          created_at: string | null
          district: string | null
          geofence_enabled: boolean | null
          geofence_radius_meters: number | null
          id: string
          country: string | null
          currency: string | null
          image_url: string | null
          latitude: number | null
          longitude: number | null
          manager_auth_user_id: string | null
          manager_email: string | null
          manager_name: string | null
          manager_phone: string | null
          max_concurrent_bookings: number | null
          metadata: Json | null
          name: string
          opens_at: string | null
          phone: string | null
          slot_interval_minutes: number | null
          status: string | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          attendance_mode?: string
          booking_enabled?: boolean | null
          city?: string | null
          closes_at?: string | null
          code?: string | null
          created_at?: string | null
          district?: string | null
          geofence_enabled?: boolean | null
          geofence_radius_meters?: number | null
          id?: string
          country?: string | null
          currency?: string | null
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          manager_auth_user_id?: string | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          max_concurrent_bookings?: number | null
          metadata?: Json | null
          name: string
          opens_at?: string | null
          phone?: string | null
          slot_interval_minutes?: number | null
          status?: string | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          attendance_mode?: string
          booking_enabled?: boolean | null
          city?: string | null
          closes_at?: string | null
          code?: string | null
          created_at?: string | null
          district?: string | null
          geofence_enabled?: boolean | null
          geofence_radius_meters?: number | null
          id?: string
          country?: string | null
          currency?: string | null
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          manager_auth_user_id?: string | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          max_concurrent_bookings?: number | null
          metadata?: Json | null
          name?: string
          opens_at?: string | null
          phone?: string | null
          slot_interval_minutes?: number | null
          status?: string | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_branches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_branches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_branches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      supplier_digests: {
        Row: {
          ai_reasoning: string | null
          created_at: string | null
          email_html: string | null
          email_subject: string | null
          headline: string | null
          id: string
          metrics: Json | null
          notes: string | null
          recommendation: string | null
          status: string | null
          supplier_id: string
          tone: string | null
          updated_at: string | null
          week_end: string
          week_start: string
          whatsapp_message: string | null
          whatsapp_sent_at: string | null
          whatsapp_sent_by: string | null
          whatsapp_template_used: string | null
        }
        Insert: {
          ai_reasoning?: string | null
          created_at?: string | null
          email_html?: string | null
          email_subject?: string | null
          headline?: string | null
          id?: string
          metrics?: Json | null
          notes?: string | null
          recommendation?: string | null
          status?: string | null
          supplier_id: string
          tone?: string | null
          updated_at?: string | null
          week_end: string
          week_start: string
          whatsapp_message?: string | null
          whatsapp_sent_at?: string | null
          whatsapp_sent_by?: string | null
          whatsapp_template_used?: string | null
        }
        Update: {
          ai_reasoning?: string | null
          created_at?: string | null
          email_html?: string | null
          email_subject?: string | null
          headline?: string | null
          id?: string
          metrics?: Json | null
          notes?: string | null
          recommendation?: string | null
          status?: string | null
          supplier_id?: string
          tone?: string | null
          updated_at?: string | null
          week_end?: string
          week_start?: string
          whatsapp_message?: string | null
          whatsapp_sent_at?: string | null
          whatsapp_sent_by?: string | null
          whatsapp_template_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_digests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "marketplace_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_digests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_weekly_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_digests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_outreach_leads_funnel"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      supplier_documents: {
        Row: {
          created_at: string | null
          document_name: string
          document_type: string
          expires_at: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          supplier_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_name: string
          document_type: string
          expires_at?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          supplier_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_name?: string
          document_type?: string
          expires_at?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          supplier_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      supplier_integrations: {
        Row: {
          api_key: string
          created_at: string
          is_active: boolean
          last_delivery_at: string | null
          last_delivery_status: string | null
          supplier_id: string
          updated_at: string
          webhook_secret: string
          webhook_url: string | null
        }
        Insert: {
          api_key?: string
          created_at?: string
          is_active?: boolean
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          supplier_id: string
          updated_at?: string
          webhook_secret?: string
          webhook_url?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string
          is_active?: boolean
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          supplier_id?: string
          updated_at?: string
          webhook_secret?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_integrations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "marketplace_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_integrations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "supplier_weekly_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_integrations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "v_outreach_leads_funnel"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      supplier_modules: {
        Row: {
          created_at: string
          display_order: number | null
          enabled: boolean
          id: string
          is_primary: boolean | null
          label_override: string | null
          module_href: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          enabled?: boolean
          id?: string
          is_primary?: boolean | null
          label_override?: string | null
          module_href: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          enabled?: boolean
          id?: string
          is_primary?: boolean | null
          label_override?: string | null
          module_href?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_modules_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_modules_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_modules_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      supplier_payouts: {
        Row: {
          amount_egp: number
          created_at: string
          id: string
          instapay_ref: string | null
          method: string
          notes: string | null
          paid_at: string | null
          reference: string | null
          requested_at: string
          status: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          amount_egp: number
          created_at?: string
          id?: string
          instapay_ref?: string | null
          method?: string
          notes?: string | null
          paid_at?: string | null
          reference?: string | null
          requested_at?: string
          status?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          amount_egp?: number
          created_at?: string
          id?: string
          instapay_ref?: string | null
          method?: string
          notes?: string | null
          paid_at?: string | null
          reference?: string | null
          requested_at?: string
          status?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_post_shares: {
        Row: {
          content_id: string
          group_name: string
          group_url: string | null
          id: string
          notes: string | null
          shared_at: string
        }
        Insert: {
          content_id: string
          group_name: string
          group_url?: string | null
          id?: string
          notes?: string | null
          shared_at?: string
        }
        Update: {
          content_id?: string
          group_name?: string
          group_url?: string | null
          id?: string
          notes?: string | null
          shared_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_post_shares_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_calendar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_post_shares_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_hero_films_publish_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_prospects: {
        Row: {
          agent_name: string | null
          business_name: string | null
          category: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contacted_at: string | null
          converted_supplier_id: string | null
          created_at: string
          estimated_inventory_value: number | null
          id: string
          metadata: Json
          niche_score: number | null
          notes: string | null
          outreach_status: string
          responded_at: string | null
          source: string
          source_url: string | null
        }
        Insert: {
          agent_name?: string | null
          business_name?: string | null
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contacted_at?: string | null
          converted_supplier_id?: string | null
          created_at?: string
          estimated_inventory_value?: number | null
          id?: string
          metadata?: Json
          niche_score?: number | null
          notes?: string | null
          outreach_status?: string
          responded_at?: string | null
          source: string
          source_url?: string | null
        }
        Update: {
          agent_name?: string | null
          business_name?: string | null
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contacted_at?: string | null
          converted_supplier_id?: string | null
          created_at?: string
          estimated_inventory_value?: number | null
          id?: string
          metadata?: Json
          niche_score?: number | null
          notes?: string | null
          outreach_status?: string
          responded_at?: string | null
          source?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_prospects_converted_supplier_id_fkey"
            columns: ["converted_supplier_id"]
            isOneToOne: false
            referencedRelation: "marketplace_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_prospects_converted_supplier_id_fkey"
            columns: ["converted_supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_weekly_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_prospects_converted_supplier_id_fkey"
            columns: ["converted_supplier_id"]
            isOneToOne: false
            referencedRelation: "v_outreach_leads_funnel"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      supplier_staff: {
        Row: {
          accepted_at: string | null
          can_complete_bookings: boolean
          can_delete_listings: boolean
          can_manage_bookings: boolean
          can_manage_listings: boolean
          can_manage_pricing: boolean
          can_manage_team: boolean
          can_publish_listings: boolean
          can_respond_reviews: boolean
          can_view: boolean
          can_view_analytics: boolean
          created_at: string
          display_name: string | null
          id: string
          invited_at: string
          invited_by: string | null
          is_active: boolean
          profile_id: string
          role_label: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          can_complete_bookings?: boolean
          can_delete_listings?: boolean
          can_manage_bookings?: boolean
          can_manage_listings?: boolean
          can_manage_pricing?: boolean
          can_manage_team?: boolean
          can_publish_listings?: boolean
          can_respond_reviews?: boolean
          can_view?: boolean
          can_view_analytics?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          is_active?: boolean
          profile_id: string
          role_label?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          can_complete_bookings?: boolean
          can_delete_listings?: boolean
          can_manage_bookings?: boolean
          can_manage_listings?: boolean
          can_manage_pricing?: boolean
          can_manage_team?: boolean
          can_publish_listings?: boolean
          can_respond_reviews?: boolean
          can_view?: boolean
          can_view_analytics?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          is_active?: boolean
          profile_id?: string
          role_label?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_staff_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_staff_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_staff_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_staff_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_staff_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "marketplace_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_staff_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_weekly_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_staff_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_outreach_leads_funnel"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      supplier_wa_groups: {
        Row: {
          created_at: string
          created_by: string | null
          group_jid: string
          id: string
          intro_message: string | null
          invite_url: string | null
          is_active: boolean
          logo_applied_at: string | null
          participants: Json
          purpose: string
          subject: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          group_jid: string
          id?: string
          intro_message?: string | null
          invite_url?: string | null
          is_active?: boolean
          logo_applied_at?: string | null
          participants?: Json
          purpose?: string
          subject: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          group_jid?: string
          id?: string
          intro_message?: string | null
          invite_url?: string | null
          is_active?: boolean
          logo_applied_at?: string | null
          participants?: Json
          purpose?: string
          subject?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_wa_groups_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "marketplace_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_wa_groups_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_weekly_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_wa_groups_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_outreach_leads_funnel"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          approved_at: string | null
          auth_user_id: string | null
          business_name: string
          business_type: string | null
          city: string | null
          commission_extra_rate: number | null
          commission_rate: number
          contact_email: string
          contact_name: string
          contact_phone: string
          contract_signed_at: string | null
          contract_status: string | null
          cover_url: string | null
          created_at: string
          description_ar: string | null
          district: string | null
          gallery: Json | null
          has_erp_crm: boolean
          id: string
          country: string | null
          currency: string | null
          industry: string | null
          join_slug: string | null
          logo_url: string | null
          password_hash: string | null
          payout_details: string | null
          payout_method: string | null
          rejection_reason: string | null
          social_links: Json | null
          status: string
          subscription_tier: string | null
          theme: Json | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          auth_user_id?: string | null
          business_name: string
          business_type?: string | null
          city?: string | null
          commission_extra_rate?: number | null
          commission_rate?: number
          contact_email: string
          contact_name: string
          contact_phone: string
          contract_signed_at?: string | null
          contract_status?: string | null
          cover_url?: string | null
          created_at?: string
          description_ar?: string | null
          district?: string | null
          gallery?: Json | null
          has_erp_crm?: boolean
          id?: string
          country?: string | null
          currency?: string | null
          industry?: string | null
          join_slug?: string | null
          logo_url?: string | null
          password_hash?: string | null
          payout_details?: string | null
          payout_method?: string | null
          rejection_reason?: string | null
          social_links?: Json | null
          status?: string
          subscription_tier?: string | null
          theme?: Json | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          auth_user_id?: string | null
          business_name?: string
          business_type?: string | null
          city?: string | null
          commission_extra_rate?: number | null
          commission_rate?: number
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          contract_signed_at?: string | null
          contract_status?: string | null
          cover_url?: string | null
          created_at?: string
          description_ar?: string | null
          district?: string | null
          gallery?: Json | null
          has_erp_crm?: boolean
          id?: string
          country?: string | null
          currency?: string | null
          industry?: string | null
          join_slug?: string | null
          logo_url?: string | null
          password_hash?: string | null
          payout_details?: string | null
          payout_method?: string | null
          rejection_reason?: string | null
          social_links?: Json | null
          status?: string
          subscription_tier?: string | null
          theme?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      system_context: {
        Row: {
          changelog: string | null
          context: Json
          created_at: string
          id: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          changelog?: string | null
          context: Json
          created_at?: string
          id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          changelog?: string | null
          context?: Json
          created_at?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "system_context_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_context_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_runbook: {
        Row: {
          blocker: string | null
          category: string
          content: string
          created_at: string | null
          id: string
          last_verified_at: string | null
          next_steps: string | null
          related_cron_jobs: string[] | null
          related_functions: string[] | null
          status: string | null
          title: string
          topic: string
          updated_at: string | null
        }
        Insert: {
          blocker?: string | null
          category: string
          content: string
          created_at?: string | null
          id?: string
          last_verified_at?: string | null
          next_steps?: string | null
          related_cron_jobs?: string[] | null
          related_functions?: string[] | null
          status?: string | null
          title: string
          topic: string
          updated_at?: string | null
        }
        Update: {
          blocker?: string | null
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          last_verified_at?: string | null
          next_steps?: string | null
          related_cron_jobs?: string[] | null
          related_functions?: string[] | null
          status?: string | null
          title?: string
          topic?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      techwood_catalog: {
        Row: {
          created_at: string
          dims: string | null
          finish: string | null
          id: string
          image_url: string | null
          line: string
          market_median: number | null
          material: string
          price: number | null
          render_key: string
          segment: string
          sku: string
          status: string
          title_ar: string
        }
        Insert: {
          created_at?: string
          dims?: string | null
          finish?: string | null
          id?: string
          image_url?: string | null
          line: string
          market_median?: number | null
          material: string
          price?: number | null
          render_key: string
          segment: string
          sku: string
          status?: string
          title_ar: string
        }
        Update: {
          created_at?: string
          dims?: string | null
          finish?: string | null
          id?: string
          image_url?: string | null
          line?: string
          market_median?: number | null
          material?: string
          price?: number | null
          render_key?: string
          segment?: string
          sku?: string
          status?: string
          title_ar?: string
        }
        Relationships: []
      }
      telegram_channel_posts: {
        Row: {
          listing_id: string
          message_id: number | null
          posted_at: string
        }
        Insert: {
          listing_id: string
          message_id?: number | null
          posted_at?: string
        }
        Update: {
          listing_id?: string
          message_id?: number | null
          posted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_channel_posts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "telegram_channel_posts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_channel_posts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_channel_posts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_channel_posts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_conversations: {
        Row: {
          chat_id: number
          contact_phone: string | null
          contact_type: string | null
          created_at: string
          first_category: string | null
          first_intent: string | null
          first_name: string | null
          id: string
          last_inbound_at: string | null
          last_message_at: string | null
          last_outbound_at: string | null
          message_count: number | null
          metadata: Json | null
          status: string | null
          tg_user_id: number | null
          username: string | null
        }
        Insert: {
          chat_id: number
          contact_phone?: string | null
          contact_type?: string | null
          created_at?: string
          first_category?: string | null
          first_intent?: string | null
          first_name?: string | null
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string | null
          last_outbound_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          status?: string | null
          tg_user_id?: number | null
          username?: string | null
        }
        Update: {
          chat_id?: number
          contact_phone?: string | null
          contact_type?: string | null
          created_at?: string
          first_category?: string | null
          first_intent?: string | null
          first_name?: string | null
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string | null
          last_outbound_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          status?: string | null
          tg_user_id?: number | null
          username?: string | null
        }
        Relationships: []
      }
      telegram_messages: {
        Row: {
          agent_name: string | null
          ai_generated: boolean | null
          body: string | null
          conversation_id: string | null
          created_at: string
          direction: string
          error_message: string | null
          id: string
          message_type: string | null
          metadata: Json | null
          tg_message_id: number | null
        }
        Insert: {
          agent_name?: string | null
          ai_generated?: boolean | null
          body?: string | null
          conversation_id?: string | null
          created_at?: string
          direction: string
          error_message?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          tg_message_id?: number | null
        }
        Update: {
          agent_name?: string | null
          ai_generated?: boolean | null
          body?: string | null
          conversation_id?: string | null
          created_at?: string
          direction?: string
          error_message?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          tg_message_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "telegram_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      template_audience_rules: {
        Row: {
          audience: string
          notes: string | null
          template_name: string
          updated_at: string
        }
        Insert: {
          audience?: string
          notes?: string | null
          template_name: string
          updated_at?: string
        }
        Update: {
          audience?: string
          notes?: string | null
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tips: {
        Row: {
          amount_egp: number
          branch_id: string | null
          customer_name: string | null
          customer_phone: string | null
          distribution_type: string
          id: string
          linked_transaction_id: string | null
          notes: string | null
          payment_method: string | null
          received_at: string | null
          recipient_employee_id: string | null
          recorded_by: string | null
          recorded_by_employee_id: string | null
          service_description: string | null
          status: string | null
          supplier_id: string
        }
        Insert: {
          amount_egp: number
          branch_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          distribution_type: string
          id?: string
          linked_transaction_id?: string | null
          notes?: string | null
          payment_method?: string | null
          received_at?: string | null
          recipient_employee_id?: string | null
          recorded_by?: string | null
          recorded_by_employee_id?: string | null
          service_description?: string | null
          status?: string | null
          supplier_id: string
        }
        Update: {
          amount_egp?: number
          branch_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          distribution_type?: string
          id?: string
          linked_transaction_id?: string | null
          notes?: string | null
          payment_method?: string | null
          received_at?: string | null
          recipient_employee_id?: string | null
          recorded_by?: string | null
          recorded_by_employee_id?: string | null
          service_description?: string | null
          status?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tips_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "tips_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "tips_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_live_transactions_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_recipient_employee_id_fkey"
            columns: ["recipient_employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_recipient_employee_id_fkey"
            columns: ["recipient_employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "tips_recorded_by_employee_id_fkey"
            columns: ["recorded_by_employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_recorded_by_employee_id_fkey"
            columns: ["recorded_by_employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "tips_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "tips_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      transaction_categories: {
        Row: {
          direction: string
          icon: string | null
          id: string
          industry: string
          is_default: boolean | null
          metadata: Json | null
          name: string
          name_ar: string
          sort_order: number | null
        }
        Insert: {
          direction: string
          icon?: string | null
          id?: string
          industry: string
          is_default?: boolean | null
          metadata?: Json | null
          name: string
          name_ar: string
          sort_order?: number | null
        }
        Update: {
          direction?: string
          icon?: string | null
          id?: string
          industry?: string
          is_default?: boolean | null
          metadata?: Json | null
          name?: string
          name_ar?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      trending_sounds: {
        Row: {
          artist: string | null
          created_at: string
          fetched_at: string
          id: string
          is_active: boolean
          momentum: string | null
          platform: string
          prev_change: string | null
          rank: number | null
          region: string
          source: string | null
          track: string
        }
        Insert: {
          artist?: string | null
          created_at?: string
          fetched_at?: string
          id?: string
          is_active?: boolean
          momentum?: string | null
          platform?: string
          prev_change?: string | null
          rank?: number | null
          region?: string
          source?: string | null
          track: string
        }
        Update: {
          artist?: string | null
          created_at?: string
          fetched_at?: string
          id?: string
          is_active?: boolean
          momentum?: string | null
          platform?: string
          prev_change?: string | null
          rank?: number | null
          region?: string
          source?: string | null
          track?: string
        }
        Relationships: []
      }
      unit_bookings: {
        Row: {
          booking_date: string
          commission_amount: number
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          end_hour: number
          id: string
          notes: string | null
          payment_status: string
          payout_paid_at: string | null
          payout_status: string
          start_hour: number
          status: string
          supplier_payout: number
          total_price_egp: number
          unit_id: string
          updated_at: string
        }
        Insert: {
          booking_date: string
          commission_amount?: number
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          end_hour: number
          id?: string
          notes?: string | null
          payment_status?: string
          payout_paid_at?: string | null
          payout_status?: string
          start_hour: number
          status?: string
          supplier_payout?: number
          total_price_egp?: number
          unit_id: string
          updated_at?: string
        }
        Update: {
          booking_date?: string
          commission_amount?: number
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          end_hour?: number
          id?: string
          notes?: string | null
          payment_status?: string
          payout_paid_at?: string | null
          payout_status?: string
          start_hour?: number
          status?: string
          supplier_payout?: number
          total_price_egp?: number
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_bookings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "space_units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_categories: {
        Row: {
          created_at: string
          display_order: number
          icon: string | null
          is_active: boolean
          name_ar: string
          name_en: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon?: string | null
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon?: string | null
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          slug?: string
        }
        Relationships: []
      }
      user_daily_picks: {
        Row: {
          listing_id: string
          pick_date: string
          rank: number
          reason_ar: string | null
          user_id: string
        }
        Insert: {
          listing_id: string
          pick_date: string
          rank: number
          reason_ar?: string | null
          user_id: string
        }
        Update: {
          listing_id?: string
          pick_date?: string
          rank?: number
          reason_ar?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_picks_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_pricing_outliers"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "user_daily_picks_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_daily_picks_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_publish_blockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_daily_picks_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_reap_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_daily_picks_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_postiz_safe_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_daily_picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_daily_picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_message_views: {
        Row: {
          cta_clicked_at: string | null
          dismissed_at: string | null
          message_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          cta_clicked_at?: string | null
          dismissed_at?: string | null
          message_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          cta_clicked_at?: string | null
          dismissed_at?: string | null
          message_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_message_views_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "daily_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          current_streak: number
          first_visit_date: string | null
          last_visit_date: string | null
          longest_streak: number
          rewards_claimed: string[]
          total_visits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          first_visit_date?: string | null
          last_visit_date?: string | null
          longest_streak?: number
          rewards_claimed?: string[]
          total_visits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          first_visit_date?: string | null
          last_visit_date?: string | null
          longest_streak?: number
          rewards_claimed?: string[]
          total_visits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_visits: {
        Row: {
          user_id: string
          visit_date: string
        }
        Insert: {
          user_id: string
          visit_date: string
        }
        Update: {
          user_id?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          category: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          last_order_at: string | null
          metadata: Json | null
          name: string
          notes: string | null
          phone: string | null
          supplier_id: string
          total_purchased_egp: number | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_order_at?: string | null
          metadata?: Json | null
          name: string
          notes?: string | null
          phone?: string | null
          supplier_id: string
          total_purchased_egp?: number | null
        }
        Update: {
          address?: string | null
          category?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_order_at?: string | null
          metadata?: Json | null
          name?: string
          notes?: string | null
          phone?: string | null
          supplier_id?: string
          total_purchased_egp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "vendors_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      verify_call_numbers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          last_call_at: string | null
          last_heartbeat_at: string | null
          phone: string
          priority: number
          source_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          last_call_at?: string | null
          last_heartbeat_at?: string | null
          phone: string
          priority?: number
          source_key: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          last_call_at?: string | null
          last_heartbeat_at?: string | null
          phone?: string
          priority?: number
          source_key?: string
        }
        Relationships: []
      }
      wa_delivery_alert_log: {
        Row: {
          acked: number | null
          alerted_at: string
          id: number
          outbound: number | null
          session_id: string
        }
        Insert: {
          acked?: number | null
          alerted_at?: string
          id?: number
          outbound?: number | null
          session_id: string
        }
        Update: {
          acked?: number | null
          alerted_at?: string
          id?: number
          outbound?: number | null
          session_id?: string
        }
        Relationships: []
      }
      wa_inbound_verifications: {
        Row: {
          code: string
          created_at: string
          expected_phone: string | null
          expires_at: string
          id: string
          listing_id: string | null
          purpose: string
          session_minted_at: string | null
          verified: boolean
          verified_at: string | null
          verified_phone: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expected_phone?: string | null
          expires_at?: string
          id?: string
          listing_id?: string | null
          purpose?: string
          session_minted_at?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_phone?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expected_phone?: string | null
          expires_at?: string
          id?: string
          listing_id?: string | null
          purpose?: string
          session_minted_at?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_phone?: string | null
        }
        Relationships: []
      }
      wa_lid_map: {
        Row: {
          created_at: string
          lid: string
          phone: string
          session_id: string | null
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          lid: string
          phone: string
          session_id?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          lid?: string
          phone?: string
          session_id?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      wa_login_tokens: {
        Row: {
          created_at: string
          expires_at: string
          max_uses: number
          next_path: string
          phone: string
          token: string
          use_count: number
        }
        Insert: {
          created_at?: string
          expires_at?: string
          max_uses?: number
          next_path?: string
          phone: string
          token?: string
          use_count?: number
        }
        Update: {
          created_at?: string
          expires_at?: string
          max_uses?: number
          next_path?: string
          phone?: string
          token?: string
          use_count?: number
        }
        Relationships: []
      }
      wa_number_configs: {
        Row: {
          enabled: boolean
          label: string | null
          persona: string | null
          prefer_phone_jid: boolean
          session_id: string
          transport: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          label?: string | null
          persona?: string | null
          prefer_phone_jid?: boolean
          session_id: string
          transport?: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          label?: string | null
          persona?: string | null
          prefer_phone_jid?: boolean
          session_id?: string
          transport?: string
          updated_at?: string
        }
        Relationships: []
      }
      wa_opt_outs: {
        Row: {
          created_at: string
          phone: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          phone: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          phone?: string
          reason?: string | null
        }
        Relationships: []
      }
      wa_reply_claims: {
        Row: {
          claimed_at: string
          claimed_by: string | null
          conversation_id: string
          last_inbound_id: string
        }
        Insert: {
          claimed_at?: string
          claimed_by?: string | null
          conversation_id: string
          last_inbound_id: string
        }
        Update: {
          claimed_at?: string
          claimed_by?: string | null
          conversation_id?: string
          last_inbound_id?: string
        }
        Relationships: []
      }
      wallet_topups: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          id: string
          kind: Database["public"]["Enums"]["wallet_balance_kind"]
          metadata: Json
          profile_id: string
          provider: string | null
          provider_reference: string | null
          status: Database["public"]["Enums"]["wallet_topup_status"]
          transaction_id: string | null
          wallet_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          kind?: Database["public"]["Enums"]["wallet_balance_kind"]
          metadata?: Json
          profile_id: string
          provider?: string | null
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["wallet_topup_status"]
          transaction_id?: string | null
          wallet_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          kind?: Database["public"]["Enums"]["wallet_balance_kind"]
          metadata?: Json
          profile_id?: string
          provider?: string | null
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["wallet_topup_status"]
          transaction_id?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_topups_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_topups_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_topups_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_topups_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_cash_after: number | null
          balance_credit_after: number | null
          counterparty_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          direction: string
          id: string
          kind: Database["public"]["Enums"]["wallet_balance_kind"]
          metadata: Json
          profile_id: string
          reference_id: string | null
          reference_type: string | null
          status: Database["public"]["Enums"]["wallet_txn_status"]
          type: Database["public"]["Enums"]["wallet_txn_type"]
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_cash_after?: number | null
          balance_credit_after?: number | null
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          direction: string
          id?: string
          kind: Database["public"]["Enums"]["wallet_balance_kind"]
          metadata?: Json
          profile_id: string
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["wallet_txn_status"]
          type: Database["public"]["Enums"]["wallet_txn_type"]
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_cash_after?: number | null
          balance_credit_after?: number | null
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          direction?: string
          id?: string
          kind?: Database["public"]["Enums"]["wallet_balance_kind"]
          metadata?: Json
          profile_id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["wallet_txn_status"]
          type?: Database["public"]["Enums"]["wallet_txn_type"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_withdrawals: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          currency: string
          details: string
          hold_txn_id: string | null
          id: string
          method: string
          processed_at: string | null
          processed_by: string | null
          profile_id: string
          status: Database["public"]["Enums"]["wallet_withdrawal_status"]
          wallet_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          currency?: string
          details: string
          hold_txn_id?: string | null
          id?: string
          method: string
          processed_at?: string | null
          processed_by?: string | null
          profile_id: string
          status?: Database["public"]["Enums"]["wallet_withdrawal_status"]
          wallet_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          currency?: string
          details?: string
          hold_txn_id?: string | null
          id?: string
          method?: string
          processed_at?: string | null
          processed_by?: string | null
          profile_id?: string
          status?: Database["public"]["Enums"]["wallet_withdrawal_status"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_withdrawals_hold_txn_id_fkey"
            columns: ["hold_txn_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_withdrawals_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_withdrawals_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_withdrawals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_withdrawals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_withdrawals_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance_cash: number
          balance_credit: number
          created_at: string
          currency: string
          id: string
          pin_hash: string | null
          profile_id: string
          status: Database["public"]["Enums"]["wallet_status"]
          updated_at: string
        }
        Insert: {
          balance_cash?: number
          balance_credit?: number
          created_at?: string
          currency?: string
          id?: string
          pin_hash?: string | null
          profile_id: string
          status?: Database["public"]["Enums"]["wallet_status"]
          updated_at?: string
        }
        Update: {
          balance_cash?: number
          balance_credit?: number
          created_at?: string
          currency?: string
          id?: string
          pin_hash?: string | null
          profile_id?: string
          status?: Database["public"]["Enums"]["wallet_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_campaign_messages: {
        Row: {
          attempts: number | null
          campaign_id: string | null
          channel: string | null
          created_at: string | null
          customer_id: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          locked_at: string | null
          message_content: string | null
          read_at: string | null
          recipient_name: string | null
          recipient_phone: string
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          supplier_id: string | null
          template_vars: Json | null
          whatsapp_msg_id: string | null
        }
        Insert: {
          attempts?: number | null
          campaign_id?: string | null
          channel?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          locked_at?: string | null
          message_content?: string | null
          read_at?: string | null
          recipient_name?: string | null
          recipient_phone: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          supplier_id?: string | null
          template_vars?: Json | null
          whatsapp_msg_id?: string | null
        }
        Update: {
          attempts?: number | null
          campaign_id?: string | null
          channel?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          locked_at?: string | null
          message_content?: string | null
          read_at?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          supplier_id?: string | null
          template_vars?: Json | null
          whatsapp_msg_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaign_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaign_messages_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaign_messages_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "whatsapp_campaign_messages_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      whatsapp_campaigns: {
        Row: {
          campaign_name: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          delivered_count: number | null
          failed_count: number | null
          id: string
          read_count: number | null
          replied_count: number | null
          scheduled_at: string | null
          sent_count: number | null
          started_at: string | null
          status: string | null
          supplier_id: string | null
          target_audience: string | null
          template_name: string
          total_recipients: number | null
        }
        Insert: {
          campaign_name: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          read_count?: number | null
          replied_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          supplier_id?: string | null
          target_audience?: string | null
          template_name: string
          total_recipients?: number | null
        }
        Update: {
          campaign_name?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          read_count?: number | null
          replied_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          supplier_id?: string | null
          target_audience?: string | null
          template_name?: string
          total_recipients?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campaigns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaigns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "whatsapp_campaigns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      whatsapp_config: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          ad_body: string | null
          ad_headline: string | null
          ad_id: string | null
          ad_source_url: string | null
          agent_name: string | null
          contact_name: string | null
          contact_phone: string
          contact_type: string | null
          created_at: string
          ctwa_clid: string | null
          first_category: string | null
          first_intent: string | null
          id: string
          last_inbound_at: string | null
          last_message_at: string | null
          last_message_direction: string | null
          last_outbound_at: string | null
          message_count: number
          metadata: Json
          related_profile_id: string | null
          related_supplier_id: string | null
          session_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ad_body?: string | null
          ad_headline?: string | null
          ad_id?: string | null
          ad_source_url?: string | null
          agent_name?: string | null
          contact_name?: string | null
          contact_phone: string
          contact_type?: string | null
          created_at?: string
          ctwa_clid?: string | null
          first_category?: string | null
          first_intent?: string | null
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string | null
          last_message_direction?: string | null
          last_outbound_at?: string | null
          message_count?: number
          metadata?: Json
          related_profile_id?: string | null
          related_supplier_id?: string | null
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ad_body?: string | null
          ad_headline?: string | null
          ad_id?: string | null
          ad_source_url?: string | null
          agent_name?: string | null
          contact_name?: string | null
          contact_phone?: string
          contact_type?: string | null
          created_at?: string
          ctwa_clid?: string | null
          first_category?: string | null
          first_intent?: string | null
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string | null
          last_message_direction?: string | null
          last_outbound_at?: string | null
          message_count?: number
          metadata?: Json
          related_profile_id?: string | null
          related_supplier_id?: string | null
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_related_profile_id_fkey"
            columns: ["related_profile_id"]
            isOneToOne: false
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_related_profile_id_fkey"
            columns: ["related_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_related_supplier_id_fkey"
            columns: ["related_supplier_id"]
            isOneToOne: false
            referencedRelation: "marketplace_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_related_supplier_id_fkey"
            columns: ["related_supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_weekly_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_related_supplier_id_fkey"
            columns: ["related_supplier_id"]
            isOneToOne: false
            referencedRelation: "v_outreach_leads_funnel"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          agent_name: string | null
          ai_generated: boolean
          body: string
          conversation_id: string
          created_at: string
          direction: string
          error_code: string | null
          error_message: string | null
          id: string
          message_type: string
          metadata: Json
          referral: Json | null
          session_id: string | null
          status: string
          status_updated_at: string | null
          template_name: string | null
          template_params: Json | null
          wa_message_id: string | null
        }
        Insert: {
          agent_name?: string | null
          ai_generated?: boolean
          body: string
          conversation_id: string
          created_at?: string
          direction: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          message_type?: string
          metadata?: Json
          referral?: Json | null
          session_id?: string | null
          status?: string
          status_updated_at?: string | null
          template_name?: string | null
          template_params?: Json | null
          wa_message_id?: string | null
        }
        Update: {
          agent_name?: string | null
          ai_generated?: boolean
          body?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          message_type?: string
          metadata?: Json
          referral?: Json | null
          session_id?: string | null
          status?: string
          status_updated_at?: string | null
          template_name?: string | null
          template_params?: Json | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "lifecycle_view"
            referencedColumns: ["conv_id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "v_outreach_leads_funnel"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_outbound_queue: {
        Row: {
          agent_name: string | null
          attempts: number | null
          campaign: string | null
          created_at: string | null
          error: string | null
          id: string
          message: string
          metadata: Json | null
          recipient_name: string | null
          recipient_phone: string
          request_id: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          template_name: string | null
          template_params: Json | null
          wa_message_id: string | null
        }
        Insert: {
          agent_name?: string | null
          attempts?: number | null
          campaign?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          message: string
          metadata?: Json | null
          recipient_name?: string | null
          recipient_phone: string
          request_id?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          template_name?: string | null
          template_params?: Json | null
          wa_message_id?: string | null
        }
        Update: {
          agent_name?: string | null
          attempts?: number | null
          campaign?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          recipient_name?: string | null
          recipient_phone?: string
          request_id?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          template_name?: string | null
          template_params?: Json | null
          wa_message_id?: string | null
        }
        Relationships: []
      }
      whatsapp_policy_violations: {
        Row: {
          agent_name: string | null
          attempted_message: string
          attempted_recipient: string
          blocked_at: string
          campaign: string | null
          id: string
          matched_pattern: string | null
          violation_type: string
        }
        Insert: {
          agent_name?: string | null
          attempted_message: string
          attempted_recipient: string
          blocked_at?: string
          campaign?: string | null
          id?: string
          matched_pattern?: string | null
          violation_type: string
        }
        Update: {
          agent_name?: string | null
          attempted_message?: string
          attempted_recipient?: string
          blocked_at?: string
          campaign?: string | null
          id?: string
          matched_pattern?: string | null
          violation_type?: string
        }
        Relationships: []
      }
      whatsapp_poll_requests: {
        Row: {
          fired_at: string
          processed_at: string | null
          request_id: number
          status_code: number | null
          templates_changed: Json | null
        }
        Insert: {
          fired_at?: string
          processed_at?: string | null
          request_id: number
          status_code?: number | null
          templates_changed?: Json | null
        }
        Update: {
          fired_at?: string
          processed_at?: string | null
          request_id?: number
          status_code?: number | null
          templates_changed?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      // 🌍 (٦/٩/٢٠٢٦) v_business — الويو اللي resolveBusiness وصفحة المورد بيقروا منه (ماكانش في الملف)
      v_business: {
        Row: {
          id: string; business_name: string; logo_url: string | null; cover_url: string | null
          commission_rate: number | null; owner_id: string | null; contact_phone: string | null; contact_name: string | null
          contact_email: string | null; city: string | null; district: string | null; address: string | null
          business_type: string | null; industry: string | null; origin: string | null; business_model: string | null
          max_employees: number | null; status: string | null; kyc_status: string | null; account_type: string | null
          is_partner: boolean | null; has_erp: boolean | null; is_platform_owner: boolean | null; rating: number | null
          reviews_count: number | null; listings_count: number | null; bookings_count: number | null; total_revenue: number | null
          tracks: Json | null; created_at: string | null; missing_marketplace_row: boolean | null; missing_supplier_row: boolean | null
          country: string | null; currency: string | null
        }
        Relationships: []
      }
      ai_os_dashboard: {
        Row: {
          draft_ads: number | null
          draft_campaigns: number | null
          enabled_agents: number | null
          high_priority_insights: number | null
          new_insights: number | null
          pending_plays: number | null
          pending_runs: number | null
          runs_24h: number | null
          success_24h: number | null
          total_ad_creatives: number | null
          total_agents: number | null
          total_briefs: number | null
          total_reel_scripts: number | null
        }
        Relationships: []
      }
      category_demand_view: {
        Row: {
          booking_attempts_30d: number | null
          booking_records_30d: number | null
          category_id: string | null
          confirmed_bookings_30d: number | null
          demand_score: number | null
          listings_paused: number | null
          listings_published: number | null
          listings_total: number | null
          name_ar: string | null
          name_en: string | null
          opportunity_tier: string | null
          page_views_30d: number | null
          slug: string | null
          unique_visitors_30d: number | null
          views_lifetime: number | null
          visitors_per_listing: number | null
        }
        Relationships: []
      }
      chat_directory: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          i_blocked_them: boolean | null
          id: string | null
          is_friend: boolean | null
          last_seen_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          avatar_url?: never
          full_name?: never
          i_blocked_them?: never
          id?: string | null
          is_friend?: never
          last_seen_at?: string | null
          phone?: never
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          avatar_url?: never
          full_name?: never
          i_blocked_them?: never
          id?: string | null
          is_friend?: never
          last_seen_at?: string | null
          phone?: never
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
      funnel_7d: {
        Row: {
          clicked_add_listing: number | null
          completed_booking: number | null
          contact_clicked: number | null
          favorited: number | null
          searched: number | null
          started_booking: number | null
          total_visitors: number | null
          viewed_listing: number | null
        }
        Relationships: []
      }
      lead_intelligence_view: {
        Row: {
          added_at: string | null
          business_name: string | null
          category: string | null
          computed_at: string | null
          has_ad_referral: boolean | null
          id: string | null
          last_contacted: string | null
          last_inbound_at: string | null
          lead_type: string | null
          location: string | null
          outreach_count: number | null
          phone: string | null
          priority_tier: string | null
          score: number | null
          source: string | null
          status: string | null
          suggested_action: string | null
        }
        Relationships: []
      }
      lifecycle_view: {
        Row: {
          ad_headline: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_type: string | null
          conv_id: string | null
          first_category: string | null
          first_contact_at: string | null
          first_intent: string | null
          inbound_count: number | null
          last_inbound_at: string | null
          last_inbound_msg: string | null
          last_message_at: string | null
          last_outbound_at: string | null
          message_count: number | null
          outbound_count: number | null
          stage: string | null
        }
        Relationships: []
      }
      listing_friction: {
        Row: {
          active_pricing_rules: number | null
          bookings_created: number | null
          business_name: string | null
          earliest: string | null
          friction_reason: string | null
          friction_score: number | null
          kyc_status: Database["public"]["Enums"]["supplier_kyc_status"] | null
          latest: string | null
          requires_id_verification: boolean | null
          slug: string | null
          status: Database["public"]["Enums"]["listing_status"] | null
          title: string | null
          total_attempts: number | null
          unique_attempted: number | null
        }
        Relationships: []
      }
      listing_pricing_outliers: {
        Row: {
          category_avg: number | null
          category_median: number | null
          category_name: string | null
          city: string | null
          listing_id: string | null
          listing_price: number | null
          max_price: number | null
          min_price: number | null
          p25_price: number | null
          p75_price: number | null
          peer_count: number | null
          period_count: number | null
          period_type: string | null
          price_z_score: number | null
          pricing_flag: string | null
          slug: string | null
          title: string | null
        }
        Relationships: []
      }
      outreach_stats: {
        Row: {
          cold_pipeline_fresh: number | null
          cold_pipeline_recyclable: number | null
          converted_total: number | null
          dormant_pipeline: number | null
          sent_this_week: number | null
          sent_today: number | null
          stuck_pipeline: number | null
        }
        Relationships: []
      }
      supplier_weekly_performance: {
        Row: {
          account_type: string | null
          booking_attempts_7d: number | null
          booking_views_7d: number | null
          business_name: string | null
          cancelled_bookings_7d: number | null
          confirmed_bookings_7d: number | null
          engagement_tier: string | null
          lifetime_bookings: number | null
          lifetime_views: number | null
          listings_draft: number | null
          listings_paused: number | null
          listings_published: number | null
          profile_id: string | null
          supplier_id: string | null
          unique_visitors_7d: number | null
          views_7d: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_suppliers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "chat_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_suppliers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_agent_health: {
        Row: {
          agent_name: string | null
          description: string | null
          display_name: string | null
          enabled: boolean | null
          error_count: number | null
          event_source: string | null
          health_status: string | null
          hours_since_last_run: number | null
          last_run_at: string | null
          reason_code: string | null
          run_count: number | null
          schedule_cron: string | null
          success_count: number | null
          success_pct: number | null
          suggested_action: string | null
          team: string | null
          trigger_type: string | null
        }
        Relationships: []
      }
      v_ai_cost_per_message: {
        Row: {
          agent_name: string | null
          api_calls: number | null
          cache_reads_tok: number | null
          cache_writes_tok: number | null
          calls_per_message: number | null
          channel: string | null
          conversations: number | null
          cost_usd: number | null
          customer_messages: number | null
          day: string | null
          output_tok: number | null
          uncached_tok: number | null
          usd_per_message: number | null
        }
        Relationships: []
      }
      v_ai_usage_cost: {
        Row: {
          agent_name: string | null
          cache_creation_input_tokens: number | null
          cache_read_input_tokens: number | null
          cache_ttl: string | null
          channel: string | null
          conversation_id: string | null
          cost_usd: number | null
          created_at: string | null
          id: string | null
          input_tokens: number | null
          is_final: boolean | null
          latency_ms: number | null
          model: string | null
          output_tokens: number | null
          turn: number | null
        }
        Relationships: []
      }
      v_attendance_audit: {
        Row: {
          branch_code: string | null
          branch_id: string | null
          branch_name: string | null
          clock_in_at: string | null
          clock_in_distance_m: number | null
          clock_in_flag: string | null
          clock_in_method: string | null
          clock_out_at: string | null
          clock_out_distance_m: number | null
          date: string | null
          employee_id: string | null
          flagged_reason: string | null
          full_name: string | null
          hours_worked: number | null
          id: string | null
          role_ar: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "attendance_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "attendance_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "business_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_business_team_oversight"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      v_attendance_report: {
        Row: {
          branch_code: string | null
          branch_id: string | null
          branch_name: string | null
          distance_m: number | null
          employee_name: string | null
          event_at: string | null
          event_date: string | null
          event_time: string | null
          event_type: string | null
          location_status: string | null
          supplier_id: string | null
          within_work_hours: boolean | null
        }
        Relationships: []
      }
      v_branch_pnl: {
        Row: {
          branch_code: string | null
          branch_id: string | null
          branch_name: string | null
          business_name: string | null
          expenses_mtd: number | null
          expenses_today: number | null
          madmona_commission_mtd: number | null
          revenue_mtd: number | null
          revenue_today: number | null
          supplier_id: string | null
          tips_today: number | null
        }
        Relationships: []
      }
      v_business_daily_summary: {
        Row: {
          branch_id: string | null
          branch_name: string | null
          business_date: string | null
          business_name: string | null
          close_status: string | null
          contract_status: string | null
          industry: string | null
          madmona_commission_earned: number | null
          net: number | null
          supplier_id: string | null
          total_in: number | null
          total_out: number | null
          transaction_count: number | null
        }
        Relationships: []
      }
      v_business_team_oversight: {
        Row: {
          avatar_initial: string | null
          branch_code: string | null
          branch_id: string | null
          branch_name: string | null
          employee_id: string | null
          full_name: string | null
          phone: string | null
          role: string | null
          role_ar: string | null
          status: string | null
          supplier_id: string | null
          supplier_name: string | null
          today_completed: number | null
          today_pending: number | null
          today_total_tasks: number | null
          week_completion_pct: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "business_employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "business_employees_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "business_employees_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      v_claim_outreach_funnel: {
        Row: {
          business: string | null
          claimed_at: string | null
          error: string | null
          listing_id: string | null
          listing_title: string | null
          phone: string | null
          sent: boolean | null
          sent_at: string | null
          status: string | null
        }
        Relationships: []
      }
      v_creative_quality_audit: {
        Row: {
          created_at: string | null
          has_correct_brand_colors: boolean | null
          has_wrong_brand_colors: boolean | null
          issues: string[] | null
          item_id: string | null
          listing_id: string | null
          source_type: string | null
          status: string | null
        }
        Relationships: []
      }
      v_customer_activity: {
        Row: {
          created_at: string | null
          customer_id: string | null
          guest_phone: string | null
          id: string | null
          kind: string | null
          listing_id: string | null
          reference_code: string | null
          status: string | null
          supplier_id: string | null
          total_amount: number | null
        }
        Relationships: []
      }
      v_email_status: {
        Row: {
          count: number | null
          most_recent: string | null
          queue: string | null
          status: string | null
        }
        Relationships: []
      }
      v_furniture_catalog: {
        Row: {
          available: boolean | null
          category: string | null
          compare_at_price: number | null
          currency: string | null
          id: string | null
          image_url: string | null
          images: string[] | null
          market_price: number | null
          saving_egp: number | null
          scraped_at: string | null
          segment: string | null
          sku: string | null
          source: string | null
          suggested_price: number | null
          title: string | null
          url: string | null
        }
        Insert: {
          available?: boolean | null
          category?: string | null
          compare_at_price?: number | null
          currency?: string | null
          id?: string | null
          image_url?: string | null
          images?: string[] | null
          market_price?: number | null
          saving_egp?: never
          scraped_at?: string | null
          segment?: string | null
          sku?: string | null
          source?: string | null
          suggested_price?: number | null
          title?: string | null
          url?: string | null
        }
        Update: {
          available?: boolean | null
          category?: string | null
          compare_at_price?: number | null
          currency?: string | null
          id?: string | null
          image_url?: string | null
          images?: string[] | null
          market_price?: number | null
          saving_egp?: never
          scraped_at?: string | null
          segment?: string | null
          sku?: string | null
          source?: string | null
          suggested_price?: number | null
          title?: string | null
          url?: string | null
        }
        Relationships: []
      }
      v_hero_films_publish_queue: {
        Row: {
          creative: string | null
          cta: string | null
          hashtag_count: number | null
          id: string | null
          needed_mp4: string | null
          platform: string | null
          publish_status: string | null
          published_post_id: string | null
          scheduled_date: string | null
          source_html: string | null
          status: string | null
          target_platform: string | null
        }
        Insert: {
          creative?: never
          cta?: string | null
          hashtag_count?: never
          id?: string | null
          needed_mp4?: never
          platform?: string | null
          publish_status?: never
          published_post_id?: string | null
          scheduled_date?: never
          source_html?: string | null
          status?: string | null
          target_platform?: never
        }
        Update: {
          creative?: never
          cta?: string | null
          hashtag_count?: never
          id?: string | null
          needed_mp4?: never
          platform?: string | null
          publish_status?: never
          published_post_id?: string | null
          scheduled_date?: never
          source_html?: string | null
          status?: string | null
          target_platform?: never
        }
        Relationships: []
      }
      v_hr_infractions: {
        Row: {
          acknowledged_at: string | null
          created_at: string | null
          deduction_amount_egp: number | null
          details: Json | null
          full_name: string | null
          grievance_window_until: string | null
          id: string | null
          infraction_date: string | null
          infraction_type: string | null
          notified_at: string | null
          occurrence_no: number | null
          penalty_label: string | null
          proposed_penalty_type: string | null
          proposed_penalty_value: number | null
          role_ar: string | null
          status: string | null
          supplier_id: string | null
        }
        Relationships: []
      }
      v_hr_pending_penalties: {
        Row: {
          acknowledged_at: string | null
          details: Json | null
          full_name: string | null
          grievance_window_until: string | null
          id: string | null
          infraction_date: string | null
          infraction_type: string | null
          note: string | null
          notified_at: string | null
          occurrence_no: number | null
          penalty_label: string | null
          role_ar: string | null
          status: string | null
          supplier_id: string | null
        }
        Relationships: []
      }
      v_inbox_pending_replies: {
        Row: {
          created_at: string | null
          id: string | null
          inbound_at: string | null
          inbound_text: string | null
          kind: string | null
          provider: string | null
          reply_text: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          inbound_at?: string | null
          inbound_text?: string | null
          kind?: string | null
          provider?: string | null
          reply_text?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          inbound_at?: string | null
          inbound_text?: string | null
          kind?: string | null
          provider?: string | null
          reply_text?: string | null
        }
        Relationships: []
      }
      v_inventory_status: {
        Row: {
          branch_id: string | null
          category: string | null
          current_quantity: number | null
          default_cost_per_unit_egp: number | null
          item_id: string | null
          item_name: string | null
          last_movement_at: string | null
          location_id: string | null
          location_name: string | null
          location_type: string | null
          min_stock_alert: number | null
          needs_reorder: boolean | null
          supplier_id: string | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "inventory_locations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_locations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "inventory_locations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      v_listing_drafts_funnel: {
        Row: {
          claimed: number | null
          conversion_pct: number | null
          day: string | null
          expired: number | null
          started: number | null
          submitted: number | null
        }
        Relationships: []
      }
      v_listing_publish_blockers: {
        Row: {
          attrs_missing: boolean | null
          category_id: string | null
          city: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_directory: boolean | null
          m_attrs: boolean | null
          m_category: boolean | null
          m_city: boolean | null
          m_desc: boolean | null
          m_phone: boolean | null
          m_photo: boolean | null
          m_price: boolean | null
          m_slug: boolean | null
          m_title: boolean | null
          m_verify: boolean | null
          missing_ar: string[] | null
          missing_internal_ar: string[] | null
          missing_owner_ar: string[] | null
          owner_phone: string | null
          phone_verified_at: string | null
          photo_count: number | null
          price_count: number | null
          reachable_owner: boolean | null
          ready_to_publish: boolean | null
          real_photo_count: number | null
          slug: string | null
          status: Database["public"]["Enums"]["listing_status"] | null
          supplier_id: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_demand_view"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "listings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "marketplace_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_weekly_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "listings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_outreach_leads_funnel"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      v_listing_reap_candidates: {
        Row: {
          created_at: string | null
          directory_source: string | null
          id: string | null
          last_request_at: string | null
          last_touch: string | null
          missing_ar: string[] | null
          outreach_status: string | null
          owner_phone: string | null
          project_id: string | null
          reachable_owner: boolean | null
          reap_clock_from: string | null
          reap_reason: string | null
          request_count: number | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "property_market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      v_live_transactions_feed: {
        Row: {
          amount_egp: number | null
          branch: string | null
          category_snapshot: string | null
          customer_name: string | null
          description: string | null
          direction: string | null
          id: string | null
          is_void: boolean | null
          madmona_commission_amount: number | null
          occurred_at: string | null
          payment_method: string | null
          supplier: string | null
        }
        Relationships: []
      }
      v_madmona_customers: {
        Row: {
          created_at: string | null
          customer_type: string | null
          entity_id: string | null
          name: string | null
          phone: string | null
          provenance: string | null
          source_table: string | null
          status: string | null
        }
        Relationships: []
      }
      v_madmona_employees: {
        Row: {
          employee_type: string | null
          name: string | null
          salary_egp: number | null
          source_table: string | null
          status: string | null
          team_or_role: string | null
          total_runs: number | null
          total_success: number | null
        }
        Relationships: []
      }
      v_madmona_expenses: {
        Row: {
          amount_egp: number | null
          category: string | null
          category_ar: string | null
          created_at: string | null
          expense_date: string | null
          id: string | null
          notes: string | null
          payment_method: string | null
          supplier_id: string | null
          vendor_name: string | null
        }
        Insert: {
          amount_egp?: number | null
          category?: string | null
          category_ar?: never
          created_at?: string | null
          expense_date?: string | null
          id?: string | null
          notes?: string | null
          payment_method?: string | null
          supplier_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount_egp?: number | null
          category?: string | null
          category_ar?: never
          created_at?: string | null
          expense_date?: string | null
          id?: string | null
          notes?: string | null
          payment_method?: string | null
          supplier_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "branch_expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      v_madmona_overview: {
        Row: {
          ai_agents: number | null
          ai_agents_active: number | null
          ai_success_pct: number | null
          expenses_egp: number | null
          human_employees: number | null
          lead_listers: number | null
          net_profit_egp: number | null
          registered_listers: number | null
          renters: number | null
          revenue_egp: number | null
          vendors: number | null
        }
        Relationships: []
      }
      v_madmona_pnl: {
        Row: {
          expenses_egp: number | null
          net_profit_egp: number | null
          revenue_egp: number | null
        }
        Relationships: []
      }
      v_madmona_revenue: {
        Row: {
          booking_origin: string | null
          business_name: string | null
          gross_amount_egp: number | null
          madmona_revenue_egp: number | null
          occurred_at: string | null
          ref_status: string | null
          reference_id: string | null
          revenue_source: string | null
          source_table: string | null
          supplier_id: string | null
        }
        Relationships: []
      }
      v_madmona_vendors: {
        Row: {
          category: string | null
          is_active: boolean | null
          source_table: string | null
          total_paid_egp: number | null
          vendor_name: string | null
          vendor_source: string | null
        }
        Relationships: []
      }
      v_marid_health: {
        Row: {
          name: string | null
          note: string | null
          status: string | null
          value: number | null
        }
        Relationships: []
      }
      v_outreach_funnel_summary: {
        Row: {
          business_count: number | null
          count: number | null
          funnel_stage: string | null
          individual_count: number | null
        }
        Relationships: []
      }
      v_outreach_leads_funnel: {
        Row: {
          area: string | null
          category: string | null
          contact_count: number | null
          conv_contact_type: string | null
          conv_message_count: number | null
          conv_status: string | null
          conversation_id: string | null
          created_at: string | null
          expected_type: string | null
          first_intent: string | null
          funnel_stage: string | null
          inbound_count: number | null
          last_contacted: string | null
          last_inbound_at: string | null
          last_message_at: string | null
          last_outbound_at: string | null
          name: string | null
          origin: string | null
          outbound_count: number | null
          phone: string | null
          priority_score: number | null
          sources: string | null
          supplier_business_name: string | null
          supplier_commission_rate: number | null
          supplier_has_erp_crm: boolean | null
          supplier_id: string | null
          supplier_registered_at: string | null
        }
        Relationships: []
      }
      v_pending_approvals: {
        Row: {
          agent_name: string | null
          created_at: string | null
          id: string | null
          kind: string | null
          preview: string | null
          qc: Json | null
          sub: string | null
        }
        Relationships: []
      }
      v_postiz_safe_listings: {
        Row: {
          category: string | null
          city: string | null
          district: string | null
          id: string | null
          price_egp: number | null
          primary_photo_url: string | null
          slug: string | null
          status: Database["public"]["Enums"]["listing_status"] | null
          supplier_id: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "marketplace_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_weekly_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "listings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_outreach_leads_funnel"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      v_ratings_summary: {
        Row: {
          avg_rating: number | null
          branch_code: string | null
          branch_id: string | null
          branch_name: string | null
          business_name: string | null
          five_stars: number | null
          four_stars: number | null
          low_ratings: number | null
          supplier_id: string | null
          total_ratings: number | null
          unique_customers: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_ratings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_ratings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "service_ratings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "service_ratings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_ratings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_branch_pnl"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "service_ratings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_business_daily_summary"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      v_storage_objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          mimetype: string | null
          name: string | null
          size_bytes: number | null
          updated_at: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          mimetype?: never
          name?: string | null
          size_bytes?: never
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          mimetype?: never
          name?: string | null
          size_bytes?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      v_stuck_items: {
        Row: {
          attempts: number | null
          category: string | null
          first_at: string | null
          item_key: string | null
          job_key: string | null
          last_at: string | null
          max_item_attempts: number | null
          title: string | null
        }
        Relationships: []
      }
      v_stuck_work: {
        Row: {
          آخر_حركة: string | null
          المعرف: string | null
          النوع: string | null
        }
        Relationships: []
      }
      v_wa_duplicate_sends: {
        Row: {
          ai_generated: boolean | null
          body_snippet: string | null
          conversation_id: string | null
          copies: number | null
          first_sent: string | null
          gap: string | null
          last_sent: string | null
          wa_message_ids: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "lifecycle_view"
            referencedColumns: ["conv_id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "v_outreach_leads_funnel"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_intelligence: {
        Row: {
          auth_visits: number | null
          behavior_pattern: string | null
          booking_attempts: number | null
          bookings_page_visits: number | null
          browse_count: number | null
          favorite_events: number | null
          favorites_visits: number | null
          first_seen: string | null
          from_facebook: boolean | null
          from_instagram: boolean | null
          from_paid_ad: boolean | null
          intent_score: number | null
          last_seen: string | null
          listing_views: number | null
          sessions: number | null
          tracked_listing_views: number | null
          unique_listings_viewed: number | null
          visitor_id: string | null
        }
        Relationships: []
      }
      whatsapp_campaign_analytics: {
        Row: {
          ad_headline: string | null
          ad_id: string | null
          became_suppliers: number | null
          became_users: number | null
          conversion_rate_pct: number | null
          customer_leads: number | null
          first_seen: string | null
          last_activity: string | null
          supplier_leads: number | null
          total_conversations: number | null
          unknown_leads: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _finance_can: {
        Args: { p_phone: string; p_supplier: string }
        Returns: boolean
      }
      _finance_phone: { Args: { p_token: string }; Returns: string }
      _gen_referral_code: { Args: never; Returns: string }
      _hotels_norm_city: { Args: { t: string }; Returns: string }
      _norm_ar: { Args: { x: string }; Returns: string }
      _norm_eg_phone: { Args: { _raw: string }; Returns: string }
      _probe_elite_managers: { Args: never; Returns: Json }
      _probe_emp_types: { Args: never; Returns: Json }
      _profile_ids_for_phones: {
        Args: { p_phones: string[] }
        Returns: string[]
      }
      _sf_hex: { Args: { b: number; g: number; r: number }; Returns: string }
      _sf_rgb: { Args: { hex: string }; Returns: number[] }
      _sf_rgba: { Args: { a: number; hex: string }; Returns: string }
      _sf_scale: { Args: { f: number; hex: string }; Returns: string }
      _sf_tint: { Args: { hex: string; t: number }; Returns: string }
      _supplier_can_manage_listing: {
        Args: { p_listing_id: string; p_uid: string }
        Returns: {
          is_directory: boolean
          supplier_id: string
          track: string
        }[]
      }
      _telegram_chat_ids_for_phones: {
        Args: { p_phones: string[] }
        Returns: number[]
      }
      _verify_supplier_ownership: {
        Args: { p_supplier_id: string }
        Returns: boolean
      }
      accept_quote: {
        Args: {
          p_order_id: string
          p_payment_reference?: string
          p_reference_code?: string
        }
        Returns: Json
      }
      active_cron_count: { Args: never; Returns: number }
      add_chat_task: {
        Args: {
          p_assigned_by?: string
          p_description?: string
          p_due_time?: string
          p_employee_id: string
          p_priority?: string
          p_task_date?: string
          p_title_ar: string
        }
        Returns: Json
      }
      add_cold_lead: {
        Args: {
          p_business_name: string
          p_category: string
          p_location?: string
          p_phone: string
          p_rating?: number
          p_review_count?: number
          p_source?: string
        }
        Returns: string
      }
      add_permission_to_catalog: {
        Args: { p_key: string; p_label_ar: string; p_label_en?: string }
        Returns: Json
      }
      admin_add_import_unit: {
        Args: {
          p_brand?: string
          p_chassis_no?: string
          p_color?: string
          p_consignment_id: string
          p_engine_no?: string
          p_model?: string
          p_model_year?: number
          p_sale_price_egp?: number
          p_unit_fob?: number
        }
        Returns: string
      }
      admin_add_inventory_item: {
        Args: {
          p_category?: string
          p_default_cost?: number
          p_for_resale?: boolean
          p_min_alert?: number
          p_name_ar: string
          p_selling_price?: number
          p_supplier_id: string
          p_unit?: string
        }
        Returns: Json
      }
      admin_add_service: {
        Args: {
          p_category?: string
          p_duration_minutes?: number
          p_name_ar: string
          p_performer_commission_pct?: number
          p_price_egp: number
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_add_supplier_admin: {
        Args: {
          p_branch_id?: string
          p_email: string
          p_full_name: string
          p_phone?: string
          p_role?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_add_task: {
        Args: {
          p_employee_id: string
          p_priority?: string
          p_task_date?: string
          p_title_ar: string
        }
        Returns: Json
      }
      admin_add_vehicle_unit: {
        Args: {
          p_brand?: string
          p_chassis_no?: string
          p_color?: string
          p_contact_phone?: string
          p_district?: string
          p_engine_no?: string
          p_image_url?: string
          p_landed_cost_egp?: number
          p_model?: string
          p_model_year?: number
          p_publish?: boolean
          p_qty?: number
          p_sale_price_egp?: number
          p_status?: string
          p_supplier_id: string
          p_vehicle_type: string
        }
        Returns: string
      }
      admin_add_vendor: {
        Args: {
          p_category?: string
          p_name: string
          p_notes?: string
          p_phone?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_approve_advance_request: {
        Args: {
          p_approve?: boolean
          p_recorded_by?: string
          p_request_id: string
        }
        Returns: Json
      }
      admin_approve_leave_request: {
        Args: {
          p_approve?: boolean
          p_request_id: string
          p_reviewed_by?: string
        }
        Returns: Json
      }
      admin_assign_booking_stylist: {
        Args: { p_booking_id: string; p_employee_id: string }
        Returns: Json
      }
      admin_bulk_add_employees: {
        Args: { p_branch_id: string; p_employees: Json; p_supplier_id: string }
        Returns: Json
      }
      admin_bulk_set_status: {
        Args: { p_ids: string[]; p_status: string }
        Returns: Json
      }
      admin_check_finance_access: {
        Args: { p_supplier_id: string; p_token: string }
        Returns: Json
      }
      admin_clock_in: { Args: { p_employee_id: string }; Returns: Json }
      admin_clock_out: { Args: { p_employee_id: string }; Returns: Json }
      admin_close_payroll_run: { Args: { p_run_id: string }; Returns: Json }
      admin_company_add_product: {
        Args: {
          p_category?: string
          p_cost?: number
          p_initial_stock?: number
          p_name_ar: string
          p_reorder?: number
          p_selling?: number
          p_supplier_id: string
          p_unit?: string
        }
        Returns: Json
      }
      admin_company_set_stock: {
        Args: {
          p_new_stock: number
          p_product_id: string
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_confirm_booking_deposit: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      admin_confirm_order: {
        Args: { p_approve?: boolean; p_order_id: string; p_token: string }
        Returns: Json
      }
      admin_confirm_tip: {
        Args: { p_approve?: boolean; p_tip_id: string; p_token: string }
        Returns: Json
      }
      admin_convert_lead_to_b2b_partner: {
        Args: {
          p_industry?: string
          p_lead_id: string
          p_num_branches?: number
        }
        Returns: Json
      }
      admin_convert_waitlist: {
        Args: {
          p_employee_id?: string
          p_scheduled_at: string
          p_waitlist_id: string
        }
        Returns: Json
      }
      admin_create_agency_brand: {
        Args: {
          p_authorization_type?: string
          p_brand_name: string
          p_country?: string
          p_notes?: string
          p_supplier_id: string
        }
        Returns: string
      }
      admin_create_appointment: {
        Args: {
          p_assigned_employee_id?: string
          p_branch_id: string
          p_customer_name: string
          p_customer_phone: string
          p_scheduled_at: string
          p_service_id: string
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_create_b2b_partner: { Args: { payload: Json }; Returns: Json }
      admin_create_import_consignment: {
        Args: {
          p_currency?: string
          p_foreign_supplier?: string
          p_origin_country?: string
          p_proforma_amount?: number
          p_proforma_no?: string
          p_ref: string
          p_supplier_id: string
          p_vehicle_type?: string
        }
        Returns: string
      }
      admin_create_promotion: {
        Args: {
          p_code: string
          p_expires_at?: string
          p_min_amount?: number
          p_name_ar: string
          p_supplier_id: string
          p_type: string
          p_usage_limit?: number
          p_value: number
        }
        Returns: Json
      }
      admin_create_purchase_order: {
        Args: {
          p_branch_id: string
          p_items?: Json
          p_notes?: string
          p_supplier_id: string
          p_vendor_name: string
          p_vendor_phone?: string
        }
        Returns: Json
      }
      admin_create_service: {
        Args: {
          p_category?: string
          p_description?: string
          p_duration_minutes?: number
          p_name_ar: string
          p_performer_commission_pct?: number
          p_price_egp?: number
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_create_vendor: {
        Args: {
          p_category?: string
          p_email?: string
          p_name: string
          p_notes?: string
          p_phone?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_create_walkin_booking: {
        Args: {
          p_branch_id: string
          p_customer_name: string
          p_customer_phone?: string
          p_employee_id?: string
          p_scheduled_at?: string
          p_service_id: string
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_dashboard_kpis: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_delete_service: { Args: { p_service_id: string }; Returns: Json }
      admin_drafts_summary: { Args: { p_days?: number }; Returns: Json }
      admin_get_appointments: {
        Args: { p_branch_id?: string; p_date?: string; p_supplier_id: string }
        Returns: Json
      }
      admin_get_at_risk_customers: {
        Args: { p_days_threshold?: number; p_supplier_id: string }
        Returns: Json
      }
      admin_get_attendance: {
        Args: {
          p_branch_id?: string
          p_date_from?: string
          p_date_to?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_get_attendance_audit: {
        Args: { p_days?: number; p_supplier_id: string }
        Returns: {
          branch_code: string
          branch_id: string
          branch_name: string
          clock_in_at: string
          clock_in_distance_m: number
          clock_in_flag: string
          clock_in_method: string
          clock_out_at: string
          clock_out_distance_m: number
          date: string
          employee_id: string
          full_name: string
          hours_worked: number
          log_id: string
          role_ar: string
        }[]
      }
      admin_get_audit_log: {
        Args: {
          p_date_from?: string
          p_table_name?: string
          p_user_id?: string
        }
        Returns: Json
      }
      admin_get_birthdays_this_month: {
        Args: { p_supplier_id: string }
        Returns: Json
      }
      admin_get_bookings: {
        Args: {
          p_branch_id?: string
          p_date?: string
          p_status?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_get_cash_recon_history: {
        Args: {
          p_branch_id?: string
          p_date_from?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_get_customer_detail: {
        Args: { p_customer_id: string }
        Returns: Json
      }
      admin_get_customer_ltv: { Args: { p_customer_id: string }; Returns: Json }
      admin_get_employee_pins: {
        Args: { p_supplier_id: string }
        Returns: {
          branch_code: string
          branch_name: string
          employee_id: string
          full_name: string
          pin_code: string
          role_ar: string
        }[]
      }
      admin_get_employee_shifts: {
        Args: { p_employee_id: string }
        Returns: Json
      }
      admin_get_operations_summary: {
        Args: { p_supplier_id: string }
        Returns: Json
      }
      admin_get_payroll_run: { Args: { p_run_id: string }; Returns: Json }
      admin_get_vat_report: {
        Args: { p_month: number; p_supplier_id: string; p_year: number }
        Returns: Json
      }
      admin_get_waitlist: {
        Args: { p_branch_id?: string; p_status?: string; p_supplier_id: string }
        Returns: Json
      }
      admin_import_inventory: {
        Args: { p_rows: Json; p_supplier_id: string }
        Returns: Json
      }
      admin_link_owner_account: {
        Args: {
          p_auth_user_id: string
          p_branch_id?: string
          p_email?: string
          p_full_name: string
          p_role?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_link_supplier_admin: {
        Args: {
          p_auth_user_id: string
          p_branch_id?: string
          p_full_name?: string
          p_phone?: string
          p_role?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_list_agency_brands: {
        Args: { p_supplier_id: string }
        Returns: Json
      }
      admin_list_b2b_candidates: {
        Args: never
        Returns: {
          business_name: string
          category: string
          detected_industry: string
          lead_id: string
          location: string
          notes: string
          phone: string
          rating: number
          review_count: number
          status: string
        }[]
      }
      admin_list_customers: {
        Args: {
          p_filter?: string
          p_limit?: number
          p_offset?: number
          p_supplier_id: string
          p_tier?: string
        }
        Returns: Json
      }
      admin_list_employee_devices: {
        Args: { p_supplier_id: string }
        Returns: Json
      }
      admin_list_employee_join_requests: {
        Args: { p_supplier_id: string; p_token: string }
        Returns: Json
      }
      admin_list_employees_for_manage: {
        Args: { p_supplier_id: string }
        Returns: {
          branch_code: string
          branch_id: string
          branch_name: string
          employee_id: string
          full_name: string
          phone: string
          pin_code: string
          role: string
          role_ar: string
          status: string
        }[]
      }
      admin_list_expenses: {
        Args: {
          p_branch_id?: string
          p_category?: string
          p_date_from?: string
          p_date_to?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_list_import_consignments: {
        Args: { p_supplier_id: string }
        Returns: Json
      }
      admin_list_inventory: {
        Args: {
          p_category?: string
          p_filter?: string
          p_low_stock_only?: boolean
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_list_payroll_runs: {
        Args: { p_supplier_id: string }
        Returns: Json
      }
      admin_list_pending_orders: {
        Args: { p_supplier_id: string; p_token: string }
        Returns: Json
      }
      admin_list_pending_requests: {
        Args: { p_supplier_id: string }
        Returns: Json
      }
      admin_list_pending_tips: {
        Args: { p_supplier_id: string; p_token: string }
        Returns: Json
      }
      admin_list_promotions: { Args: { p_supplier_id: string }; Returns: Json }
      admin_list_purchase_orders: {
        Args: { p_status?: string; p_supplier_id: string }
        Returns: Json
      }
      admin_list_salary_history: {
        Args: { p_supplier_id: string; p_token: string }
        Returns: Json
      }
      admin_list_service_products: {
        Args: { p_service_id: string }
        Returns: Json
      }
      admin_list_subscriptions: {
        Args: never
        Returns: {
          business_name: string
          business_type: string
          contract_status: string
          paid_until: string
          subscription_status: string
          supplier_id: string
          suspended_at: string
          suspended_reason: string
        }[]
      }
      admin_list_supplier_admins: {
        Args: { p_supplier_id: string }
        Returns: Json
      }
      admin_list_vehicle_units: {
        Args: { p_supplier_id: string }
        Returns: Json
      }
      admin_list_vendors: { Args: { p_supplier_id: string }; Returns: Json }
      admin_list_whatsapp_campaigns: {
        Args: { p_supplier_id: string }
        Returns: Json
      }
      admin_list_workshop: { Args: { p_supplier_id: string }; Returns: Json }
      admin_listings_facets: { Args: never; Returns: Json }
      admin_listings_search: {
        Args: {
          p_category?: string
          p_city?: string
          p_claimed?: string
          p_has_phone?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status?: string
          p_tier?: string
        }
        Returns: Json
      }
      admin_log_advance: {
        Args: { p_amount: number; p_employee_id: string; p_reason?: string }
        Returns: Json
      }
      admin_log_tip: {
        Args: {
          p_amount: number
          p_branch_id: string
          p_customer_name?: string
          p_notes?: string
          p_recipient_employee_id?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_log_walk_in_booking: {
        Args: {
          p_assigned_employee_id?: string
          p_branch_id: string
          p_customer_name?: string
          p_customer_phone?: string
          p_payment_method?: string
          p_price_egp: number
          p_service_id: string
          p_source?: string
          p_status?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_log_withdrawal: {
        Args: {
          p_amount: number
          p_approved_by?: string
          p_branch_id: string
          p_reason: string
          p_supplier_id: string
          p_withdrawn_by?: string
        }
        Returns: Json
      }
      admin_mart_link_product: {
        Args: { p_erp_product_id: string; p_mart_product_id: string }
        Returns: Json
      }
      admin_move_employee_branch: {
        Args: { p_branch_id: string; p_employee_id: string }
        Returns: Json
      }
      admin_pay_bill: {
        Args: {
          p_amount_egp: number
          p_payment_method?: string
          p_period: string
          p_recurring_bill_id: string
          p_reference_number?: string
        }
        Returns: Json
      }
      admin_pay_salary: {
        Args: {
          p_advances_deducted?: number
          p_base_salary: number
          p_bonus?: number
          p_deductions?: number
          p_employee_id: string
          p_payment_method?: string
          p_period: string
        }
        Returns: Json
      }
      admin_preprovision_admin: {
        Args: {
          p_branch_id?: string
          p_email: string
          p_full_name: string
          p_phone?: string
          p_role?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_present_now: {
        Args: { p_supplier_id: string }
        Returns: {
          branch_code: string
          branch_id: string
          branch_name: string
          clock_in_at: string
          clock_in_method: string
          employee_id: string
          full_name: string
          last_heartbeat_at: string
          live: boolean
          minutes_in: number
          photo_url: string
          role_ar: string
        }[]
      }
      admin_provision_business: {
        Args: {
          p_accent?: string
          p_accent2?: string
          p_business_name: string
          p_business_type?: string
          p_city?: string
          p_contact_name?: string
          p_contact_phone?: string
          p_cover_url?: string
          p_description?: string
          p_district?: string
          p_logo_url?: string
          p_mode?: string
          p_slug: string
          p_vertical: string
        }
        Returns: Json
      }
      admin_provision_storefront: {
        Args: {
          p_accent?: string
          p_accent2?: string
          p_business_name: string
          p_city?: string
          p_contact_name?: string
          p_contact_phone?: string
          p_cover_url?: string
          p_description?: string
          p_district?: string
          p_industry?: string
          p_logo_url?: string
          p_mode?: string
          p_slug: string
        }
        Returns: Json
      }
      admin_reactivate_supplier: {
        Args: { p_paid_until?: string; p_supplier_id: string }
        Returns: undefined
      }
      admin_receive_purchase_order: { Args: { p_po_id: string }; Returns: Json }
      admin_record_advance: {
        Args: {
          p_amount: number
          p_employee_id: string
          p_notes?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_record_cash_recon: {
        Args: {
          p_actual_cash: number
          p_branch_id: string
          p_breakdown?: Json
          p_date: string
          p_expected_cash: number
          p_notes?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_record_consumption: {
        Args: {
          p_branch_id: string
          p_item_id: string
          p_quantity: number
          p_reason?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_record_expense: {
        Args: {
          p_amount: number
          p_branch_id: string
          p_category: string
          p_expense_date?: string
          p_notes?: string
          p_payment_method?: string
          p_receipt_url?: string
          p_supplier_id: string
          p_vendor_name?: string
        }
        Returns: Json
      }
      admin_record_inventory_purchase: {
        Args: {
          p_item_id: string
          p_notes?: string
          p_quantity: number
          p_supplier_id: string
          p_unit_cost_egp: number
          p_vendor_id?: string
        }
        Returns: Json
      }
      admin_reset_employee_device: {
        Args: { p_employee_id: string; p_reviewed_by?: string }
        Returns: Json
      }
      admin_review_employee_join: {
        Args: { p_action: string; p_request_id: string; p_token: string }
        Returns: Json
      }
      admin_send_test_welcome: {
        Args: {
          p_recipient_name?: string
          p_template_key: string
          p_to_email?: string
          p_to_phone?: string
        }
        Returns: Json
      }
      admin_set_branch_gps: {
        Args: {
          p_branch_id: string
          p_enabled?: boolean
          p_lat: number
          p_lng: number
          p_radius_m?: number
        }
        Returns: Json
      }
      admin_set_employee_salary: {
        Args: { p_employee_id: string; p_new_salary: number; p_token: string }
        Returns: Json
      }
      admin_set_employee_shifts: {
        Args: { p_employee_id: string; p_shifts: Json; p_supplier_id: string }
        Returns: Json
      }
      admin_set_service_products: {
        Args: { p_mappings: Json; p_service_id: string }
        Returns: Json
      }
      admin_set_supplier_module: {
        Args: {
          p_display_order?: number
          p_enabled?: boolean
          p_is_primary?: boolean
          p_label?: string
          p_module_href: string
          p_supplier_id: string
        }
        Returns: string
      }
      admin_start_payroll_run: {
        Args: { p_month: number; p_supplier_id: string; p_year: number }
        Returns: Json
      }
      admin_supplier_add_listing: {
        Args: {
          p_category_id: string
          p_contact_phone?: string
          p_description?: string
          p_district?: string
          p_image_url?: string
          p_price_egp?: number
          p_price_on_request?: boolean
          p_supplier_id: string
          p_title: string
        }
        Returns: string
      }
      admin_supplier_catalog_categories: {
        Args: { p_supplier_id: string }
        Returns: {
          group_name_ar: string
          id: string
          name_ar: string
        }[]
      }
      admin_supplier_delete_listing: {
        Args: { p_listing_id: string }
        Returns: boolean
      }
      admin_supplier_list_listings: {
        Args: { p_supplier_id: string }
        Returns: {
          category_ar: string
          id: string
          photo_url: string
          price_egp: number
          price_on_request: boolean
          status: string
          title: string
        }[]
      }
      admin_supplier_modules: {
        Args: { p_supplier_id: string }
        Returns: {
          display_order: number
          enabled: boolean
          is_primary: boolean
          label_override: string
          module_href: string
        }[]
      }
      admin_suspend_supplier: {
        Args: { p_reason?: string; p_supplier_id: string }
        Returns: undefined
      }
      admin_toggle_email_template: {
        Args: { p_is_active: boolean; p_template_key: string }
        Returns: Json
      }
      admin_traffic_report: { Args: never; Returns: Json }
      admin_transfer_to_branch: {
        Args: {
          p_branch_id: string
          p_item_id: string
          p_notes?: string
          p_quantity: number
          p_supplier_id: string
        }
        Returns: Json
      }
      admin_update_booking_status: {
        Args: {
          p_booking_id: string
          p_employee_id?: string
          p_new_status: string
          p_payment_method?: string
        }
        Returns: Json
      }
      admin_update_branch_settings: {
        Args: {
          p_booking_enabled?: boolean
          p_branch_id: string
          p_closes_at?: string
          p_manager_name?: string
          p_manager_phone?: string
          p_max_concurrent_bookings?: number
          p_opens_at?: string
          p_phone?: string
          p_slot_interval_minutes?: number
        }
        Returns: Json
      }
      admin_update_consignment_details: {
        Args: { p_consignment_id: string; p_patch: Json }
        Returns: Json
      }
      admin_update_consignment_stage: {
        Args: { p_consignment_id: string; p_stage: string }
        Returns: boolean
      }
      admin_update_employee_contact: {
        Args: { p_employee_id: string; p_phone?: string; p_pin?: string }
        Returns: Json
      }
      admin_update_service: {
        Args: {
          p_category?: string
          p_description?: string
          p_duration_minutes?: number
          p_name_ar?: string
          p_performer_commission_pct?: number
          p_price_egp?: number
          p_service_id: string
          p_status?: string
        }
        Returns: Json
      }
      admin_update_task_status: {
        Args: { p_notes?: string; p_status: string; p_task_id: string }
        Returns: Json
      }
      admin_update_unit_status: {
        Args: {
          p_customer_name?: string
          p_customer_phone?: string
          p_sale_price_egp?: number
          p_status: string
          p_unit_id: string
        }
        Returns: boolean
      }
      admin_update_waitlist_status: {
        Args: { p_status: string; p_waitlist_id: string }
        Returns: Json
      }
      ai_spend_today_usd: { Args: never; Returns: number }
      anthropic_credit_watchdog_check: { Args: never; Returns: Json }
      apply_referral: {
        Args: {
          p_code: string
          p_kind?: string
          p_referred_name?: string
          p_referred_phone: string
          p_referred_profile_id?: string
        }
        Returns: Json
      }
      approve_ad_creative: { Args: { p_ad_id: string }; Returns: undefined }
      approve_strategy_play: { Args: { p_play_id: string }; Returns: undefined }
      are_friends: { Args: { a: string; b: string }; Returns: boolean }
      ask_madmona: {
        Args: { p_context?: Json; p_question: string }
        Returns: string
      }
      auto_attach_listings_by_phone: {
        Args: { p_phone: string; p_profile_id: string }
        Returns: number
      }
      auto_clockout_offline_sessions: { Args: never; Returns: number }
      auto_publish_complete_listings: {
        Args: { p_dry_run?: boolean }
        Returns: {
          out_action: string
          out_detail: string
          out_listing_id: string
        }[]
      }
      auto_publish_scheduled_to_facebook: { Args: never; Returns: Json }
      auto_wake_overdue_agents: { Args: never; Returns: Json }
      autoclaim_inbound_supply: { Args: never; Returns: Json }
      autoresolve_admin_alert: { Args: { p_alert_id: string }; Returns: Json }
      backfill_post_visuals: { Args: { p_limit?: number }; Returns: Json }
      book_meeting: {
        Args: {
          p_at: string
          p_conv?: string
          p_kind?: string
          p_location?: string
          p_name?: string
          p_notes?: string
          p_phone: string
        }
        Returns: Json
      }
      booking_set_deposit: {
        Args: {
          p_amount: number
          p_booking_id: string
          p_method?: string
          p_reference?: string
        }
        Returns: Json
      }
      booking_slot_taken: {
        Args: {
          p_end_at: string
          p_exclude_booking_id?: string
          p_listing_id: string
          p_start_at: string
        }
        Returns: boolean
      }
      bookings_watchdog_check: { Args: never; Returns: Json }
      brand_sanitize_text: { Args: { p_text: string }; Returns: string }
      broadcast_daily_message_push: { Args: never; Returns: Json }
      build_booking_email_vars: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      build_owner_daily_digest: { Args: never; Returns: Json }
      build_storefront_theme: {
        Args: { p_accent: string; p_accent2?: string; p_mode: string }
        Returns: Json
      }
      calc_end_of_service: { Args: { p_employee_id: string }; Returns: number }
      calc_payroll: { Args: { p_employee_id: string }; Returns: Json }
      can_access_supplier: { Args: { p_supplier_id: string }; Returns: boolean }
      cancel_meeting: { Args: { p_phone: string }; Returns: Json }
      capture_lead: {
        Args: {
          p_category?: string
          p_email?: string
          p_listing_id?: string
          p_message?: string
          p_name: string
          p_phone: string
          p_source?: string
          p_utm_campaign?: string
          p_utm_source?: string
        }
        Returns: string
      }
      capture_phone: {
        Args: {
          p_capture_context?: string
          p_listing_id?: string
          p_metadata?: Json
          p_notes?: string
          p_page_url?: string
          p_phone: string
          p_session_id?: string
          p_user_name?: string
          p_visitor_id?: string
        }
        Returns: string
      }
      category_root: { Args: { cid: string }; Returns: string }
      category_to_image_keywords: {
        Args: { p_category: string }
        Returns: string
      }
      chat_block: { Args: { _other: string }; Returns: boolean }
      chat_call_answer: { Args: { p_call: string }; Returns: undefined }
      chat_call_decline: { Args: { p_call: string }; Returns: undefined }
      chat_call_leave: { Args: { p_call: string }; Returns: undefined }
      chat_call_start: {
        Args: { p_kind?: string; p_room: string }
        Returns: {
          connected_at: string | null
          end_reason: string | null
          ended_at: string | null
          id: string
          kind: string
          mode: string
          room_id: string
          started_at: string
          started_by: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "chat_calls"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      chat_calls_expire_ringing: {
        Args: { p_seconds?: number }
        Returns: number
      }
      chat_contacts_bulk_add: { Args: { p_items: Json }; Returns: Json }
      chat_contacts_prune: { Args: { p_days?: number }; Returns: number }
      chat_contacts_with_status: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          id: string
          other_id: string
          phone_e164: string
          source: string
          status: string
        }[]
      }
      chat_create_group: {
        Args: { _members: string[]; _name: string }
        Returns: string
      }
      chat_invite_accept: { Args: { p_token: string }; Returns: Json }
      chat_invite_accept_as: {
        Args: { p_profile: string; p_token: string }
        Returns: Json
      }
      chat_invite_gen_token: { Args: never; Returns: string }
      chat_invite_link: { Args: never; Returns: string }
      chat_invite_rotate: { Args: never; Returns: string }
      chat_link_mutual_friends: { Args: { p_profile: string }; Returns: number }
      chat_msg_delete: {
        Args: { p_for_all?: boolean; p_msg: string }
        Returns: undefined
      }
      chat_msg_edit: {
        Args: { p_body: string; p_msg: string }
        Returns: undefined
      }
      chat_msg_pin: {
        Args: { p_msg: string; p_on?: boolean }
        Returns: undefined
      }
      chat_msg_react: {
        Args: { p_emoji: string; p_msg: string }
        Returns: Json
      }
      chat_msg_readers: {
        Args: { p_msg: string }
        Returns: {
          full_name: string
          profile_id: string
          read_at: string
        }[]
      }
      chat_msg_star: {
        Args: { p_msg: string; p_on?: boolean }
        Returns: undefined
      }
      chat_norm_phone: { Args: { p: string }; Returns: string }
      chat_poll_create: {
        Args: {
          p_anonymous?: boolean
          p_closes_at?: string
          p_multi?: boolean
          p_options: string[]
          p_question: string
          p_room: string
        }
        Returns: string
      }
      chat_poll_results: { Args: { p_poll: string }; Returns: Json }
      chat_poll_vote: {
        Args: { p_option: number; p_poll: string }
        Returns: undefined
      }
      chat_profile_for_phone: { Args: { p_phone: string }; Returns: string }
      chat_room_archive: {
        Args: { p_on?: boolean; p_room: string }
        Returns: undefined
      }
      chat_room_mark_read: { Args: { p_room: string }; Returns: undefined }
      chat_room_mute: {
        Args: { p_hours?: number; p_room: string }
        Returns: undefined
      }
      chat_room_pin: {
        Args: { p_on?: boolean; p_room: string }
        Returns: undefined
      }
      chat_rooms_for_me:
        | {
            Args: never
            Returns: {
              archived_at: string
              id: string
              kind: string
              marid_enabled: boolean
              member_role: string
              muted_until: string
              name: string
              other_name: string
              pinned_at: string
            }[]
          }
        | {
            Args: { p_kind?: string }
            Returns: {
              archived_at: string
              id: string
              kind: string
              last_at: string
              last_body: string
              marid_enabled: boolean
              member_role: string
              muted_until: string
              name: string
              other_name: string
              pinned_at: string
            }[]
          }
      chat_search: {
        Args: { p_limit?: number; p_q: string; p_room: string }
        Returns: {
          body: string
          created_at: string
          id: string
          kind: string
          sender_name: string
        }[]
      }
      chat_unblock: { Args: { _other: string }; Returns: boolean }
      check_all_agents_health: { Args: never; Returns: Json }
      check_and_send_study_sprint: { Args: never; Returns: Json }
      check_storage_orphan_health: { Args: never; Returns: Json }
      check_template_audience: {
        Args: { p_phone: string; p_template: string }
        Returns: Json
      }
      check_template_v3_status: { Args: never; Returns: Json }
      check_wa_delivery_health: { Args: never; Returns: Json }
      claim_all_drafts_for_phone: {
        Args: { p_phone: string; p_profile_id: string }
        Returns: Json
      }
      claim_autosend_cleanup: { Args: never; Returns: undefined }
      claim_get_by_token: { Args: { p_token: string }; Returns: Json }
      claim_listing_draft: {
        Args: { p_claim_token: string; p_profile_id: string }
        Returns: Json
      }
      claim_mark_by_token: { Args: { p_token: string }; Returns: Json }
      claim_outreach_seed_new: { Args: never; Returns: Json }
      claim_pressure_tick: { Args: never; Returns: Json }
      classify_alert_source: { Args: { p_alert_type: string }; Returns: string }
      classify_inbound_intent: {
        Args: { message_text: string }
        Returns: string
      }
      clean_claude_json: { Args: { p_text: string }; Returns: Json }
      cleanup_expired_reset_tokens: { Args: never; Returns: undefined }
      cleanup_orphan_drafts: { Args: never; Returns: Json }
      cleanup_resolved_alerts: { Args: never; Returns: Json }
      cleanup_stale_push_subscriptions: {
        Args: { p_days?: number }
        Returns: Json
      }
      cleanup_stuck_agent_runs: {
        Args: { p_threshold_minutes?: number }
        Returns: Json
      }
      clear_room_for_me: { Args: { _room: string }; Returns: string }
      clear_room_messages_for_all: { Args: { _room: string }; Returns: number }
      close_past_meetings: { Args: never; Returns: number }
      cold_lead_outreach: { Args: { p_max?: number }; Returns: Json }
      compute_agent_performance: {
        Args: { p_agent_name: string; p_period?: string }
        Returns: Json
      }
      compute_all_agent_performance: { Args: never; Returns: number }
      compute_daily_kpis: {
        Args: { p_date?: string }
        Returns: {
          agent_costs_estimated_egp: number
          agents_runs: number
          bookings_value: number
          created_at: string
          date: string
          emails_sent: number
          metadata: Json
          new_bookings: number
          new_listings: number
          new_suppliers: number
          page_views: number
          total_active_listings: number
          total_revenue: number
          total_signups: number
          unique_visitors: number
          updated_at: string
          whatsapp_messages_sent: number
          whatsapp_replies_received: number
        }
        SetofOptions: {
          from: "*"
          to: "daily_kpis"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      compute_lead_score: { Args: { p_phone: string }; Returns: number }
      create_guest_booking: {
        Args: {
          p_addon_slugs?: string[]
          p_customer_notes?: string
          p_end_at: string
          p_guest_name: string
          p_guest_national_id?: string
          p_guest_phone: string
          p_listing_id: string
          p_pricing_rule_id: string
          p_start_at: string
        }
        Returns: Json
      }
      create_guest_order: {
        Args: {
          p_customer_notes?: string
          p_delivery_address: string
          p_delivery_city?: string
          p_delivery_district?: string
          p_delivery_fee?: number
          p_delivery_notes?: string
          p_delivery_phone: string
          p_guest_name: string
          p_guest_phone: string
          p_items: Json
          p_order_type: string
          p_payment_method?: string
          p_primary_listing_id: string
          p_supplier_id: string
        }
        Returns: Json
      }
      create_list_order: {
        Args: {
          p_customer_notes?: string
          p_delivery_address: string
          p_delivery_city?: string
          p_delivery_district?: string
          p_delivery_notes?: string
          p_delivery_phone?: string
          p_guest_name: string
          p_guest_phone: string
          p_lines: Json
          p_listing_id: string
          p_supplier_id: string
        }
        Returns: Json
      }
      create_mart_order: {
        Args: {
          p_customer_notes?: string
          p_delivery_address: string
          p_delivery_city?: string
          p_delivery_district?: string
          p_delivery_fee?: number
          p_delivery_lat?: number
          p_delivery_lng?: number
          p_delivery_notes?: string
          p_delivery_phone?: string
          p_guest_name?: string
          p_guest_phone?: string
          p_items: Json
          p_payment_method?: string
          p_primary_listing_id: string
          p_supplier_id: string
        }
        Returns: Json
      }
      create_member_booking: {
        Args: {
          p_addon_slugs?: string[]
          p_customer_notes?: string
          p_end_at: string
          p_listing_id: string
          p_national_id?: string
          p_pricing_rule_id: string
          p_start_at: string
        }
        Returns: Json
      }
      create_order: {
        Args: {
          p_customer_notes?: string
          p_delivery_address: string
          p_delivery_city?: string
          p_delivery_district?: string
          p_delivery_fee?: number
          p_delivery_notes?: string
          p_delivery_phone?: string
          p_items: Json
          p_order_type: string
          p_payment_method?: string
          p_primary_listing_id: string
          p_supplier_id: string
        }
        Returns: Json
      }
      cron_field_matches: {
        Args: { spec: string; val: number }
        Returns: boolean
      }
      cron_matches: { Args: { expr: string; ts: string }; Returns: boolean }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      custody_add: {
        Args: {
          p_by_name?: string
          p_description?: string
          p_due_back_at?: string
          p_employee_id: string
          p_kind: string
          p_notes?: string
          p_photo_url?: string
          p_serial_no?: string
          p_title: string
          p_value_egp?: number
        }
        Returns: string
      }
      custody_cash_event: {
        Args: {
          p_amount: number
          p_by_name?: string
          p_event: string
          p_id: string
          p_note?: string
        }
        Returns: number
      }
      custody_delete: { Args: { p_id: string }; Returns: undefined }
      custody_set_status: {
        Args: {
          p_by_name?: string
          p_id: string
          p_note?: string
          p_status: string
        }
        Returns: undefined
      }
      customer_rate_service: {
        Args: { p_booking_id: string; p_comment?: string; p_rating: number }
        Returns: Json
      }
      customer_start_visit: {
        Args: { p_branch_id: string; p_customer_id: string }
        Returns: Json
      }
      customer_submit_order: {
        Args: { p_cart: Json; p_payment_method?: string; p_session_id: string }
        Returns: Json
      }
      customer_upsert: {
        Args: { p_email?: string; p_name?: string; p_phone: string }
        Returns: Json
      }
      daily_tasks_autoclose: { Args: { p_grace_days?: number }; Returns: Json }
      dedupe_market_products: { Args: never; Returns: number }
      delete_my_account: { Args: { p_reason?: string }; Returns: Json }
      delete_room: { Args: { _room: string }; Returns: boolean }
      dispatch_orchestrator_next_actions: { Args: never; Returns: Json }
      dispatch_reel_cloud_render: { Args: never; Returns: undefined }
      dispatch_reels_autopublish: { Args: never; Returns: undefined }
      dispatch_story_render: { Args: never; Returns: undefined }
      distance_meters: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      drain_ad_regen_queue: { Args: never; Returns: Json }
      drive_mark_error: {
        Args: { p_error: string; p_id: string; p_secret: string }
        Returns: undefined
      }
      drive_mark_synced: {
        Args: { p_file_id: string; p_id: string; p_secret: string }
        Returns: undefined
      }
      drive_pull_pending: {
        Args: { p_secret: string }
        Returns: {
          body: string
          created_at: string
          id: string
          pipeline_name: string
          schedule: Json
          title: string
        }[]
      }
      edge_fn_headers: { Args: { p_extra?: Json }; Returns: Json }
      edge_fn_secret_header: {
        Args: { p_header: string; p_name: string }
        Returns: Json
      }
      email_in_use: {
        Args: { p_email: string; p_exclude: string }
        Returns: boolean
      }
      email_watchdog_check: { Args: never; Returns: Json }
      employee_clock_via_qr: {
        Args: {
          p_accuracy_m?: number
          p_branch_code: string
          p_device_id?: string
          p_device_label?: string
          p_lat?: number
          p_lng?: number
          p_phone_or_pin: string
        }
        Returns: Json
      }
      employee_complete_task_by_pin: {
        Args: {
          p_branch_code: string
          p_phone_or_pin: string
          p_status?: string
          p_task_id: string
        }
        Returns: Json
      }
      employee_geo_heartbeat: {
        Args: {
          p_accuracy_m?: number
          p_branch_code: string
          p_lat?: number
          p_lng?: number
          p_phone_or_pin: string
        }
        Returns: Json
      }
      employee_login_phone_pin: {
        Args: { p_phone: string; p_pin: string }
        Returns: Json
      }
      employee_mark_notifications_read_by_pin: {
        Args: {
          p_branch_code: string
          p_notification_id?: string
          p_pin: string
        }
        Returns: Json
      }
      employee_notifications_by_pin: {
        Args: { p_branch_code: string; p_limit?: number; p_pin: string }
        Returns: Json
      }
      employee_panel_by_pin: {
        Args: { p_branch_code: string; p_pin: string }
        Returns: Json
      }
      employee_request_advance_by_pin: {
        Args: {
          p_amount: number
          p_branch_code: string
          p_phone_or_pin: string
          p_reason?: string
        }
        Returns: Json
      }
      employee_request_leave_by_pin: {
        Args: {
          p_branch_code: string
          p_end_date: string
          p_leave_type: string
          p_phone_or_pin: string
          p_reason?: string
          p_start_date: string
        }
        Returns: Json
      }
      employee_self_view_by_pin: {
        Args: { p_branch_code: string; p_phone_or_pin: string }
        Returns: Json
      }
      employee_toggle_task_by_pin: {
        Args: {
          p_branch_code: string
          p_pin: string
          p_status: string
          p_task_id: string
        }
        Returns: Json
      }
      enqueue_clinic_outreach_batch: {
        Args: { p_limit?: number }
        Returns: Json
      }
      enqueue_elite_offer: { Args: never; Returns: Json }
      ensure_auth_user_for_phone: {
        Args: { p_name?: string; p_phone: string }
        Returns: string
      }
      ensure_marketplace_supplier: {
        Args: { p_profile_id: string }
        Returns: string
      }
      erp_admin_subscription_list: {
        Args: never
        Returns: {
          accounts_count: number
          auto_post: boolean
          business_name: string
          paid_until: string
          posted_entries: number
          subscription_status: string
          supplier_id: string
          suspended_at: string
          suspended_reason: string
        }[]
      }
      erp_apply_mapping: {
        Args: { p_mapping: Json; p_payload: Json }
        Returns: Json
      }
      erp_balance_sheet: {
        Args: { p_as_of?: string; p_supplier_id: string }
        Returns: Json
      }
      erp_create_entry: {
        Args: {
          p_auto_post?: boolean
          p_entry_date: string
          p_lines: Json
          p_memo: string
          p_source_id?: string
          p_source_type?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      erp_general_ledger: {
        Args: {
          p_account_id: string
          p_from?: string
          p_supplier_id: string
          p_to?: string
        }
        Returns: {
          credit: number
          debit: number
          entry_date: string
          entry_no: number
          line_memo: string
          memo: string
          running_balance: number
        }[]
      }
      erp_import_process: { Args: { p_batch_id: string }; Returns: Json }
      erp_import_submit: {
        Args: {
          p_entity_type: string
          p_file_name: string
          p_mapping: Json
          p_rows: Json
          p_supplier_id: string
          p_target?: Json
        }
        Returns: Json
      }
      erp_income_statement: {
        Args: { p_from: string; p_supplier_id: string; p_to: string }
        Returns: Json
      }
      erp_is_privileged: { Args: { p_supplier_id: string }; Returns: boolean }
      erp_post_entry: { Args: { p_entry_id: string }; Returns: Json }
      erp_provision_supplier: { Args: { p_supplier_id: string }; Returns: Json }
      erp_seed_default_coa: { Args: { p_supplier_id: string }; Returns: Json }
      erp_set_subscription: {
        Args: {
          p_paid_until?: string
          p_reason?: string
          p_status: string
          p_supplier_id: string
        }
        Returns: Json
      }
      erp_subscription_active: {
        Args: { p_supplier_id: string }
        Returns: boolean
      }
      erp_suspend_overdue: { Args: never; Returns: Json }
      erp_trial_balance: {
        Args: { p_from?: string; p_supplier_id: string; p_to?: string }
        Returns: {
          account_id: string
          account_type: string
          balance_credit: number
          balance_debit: number
          code: string
          name_ar: string
          total_credit: number
          total_debit: number
        }[]
      }
      erp_void_entry: {
        Args: { p_entry_id: string; p_reason?: string }
        Returns: Json
      }
      escalate_chronic_failures: { Args: never; Returns: Json }
      exec_admin_readonly_sql: { Args: { p_sql: string }; Returns: Json }
      expire_ghost_drafts: { Args: never; Returns: Json }
      expire_stale_call_verifications: { Args: never; Returns: number }
      expire_stale_project_drafts: { Args: { p_days?: number }; Returns: Json }
      fanout_partnership_intro_v2: { Args: never; Returns: Json }
      fanout_supplier_approved_v2: { Args: never; Returns: Json }
      finalize_listing_claim: {
        Args: {
          p_logo_path: string
          p_logo_url: string
          p_token: string
          p_uid: string
        }
        Returns: Json
      }
      find_auth_user_by_phone: {
        Args: { p_phone: string }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      find_list_quote_shop: {
        Args: { p_city?: string; p_query: string }
        Returns: Json
      }
      fire_admin_alert: {
        Args: {
          p_body: string
          p_metadata?: Json
          p_severity?: string
          p_source?: string
          p_title: string
          p_url?: string
        }
        Returns: Json
      }
      fire_anthropic_call: {
        Args: {
          p_agent_name: string
          p_max_tokens?: number
          p_model?: string
          p_purpose: string
          p_system: string
          p_user_message: string
        }
        Returns: string
      }
      fire_listing_draft_nudges: { Args: never; Returns: Json }
      fire_whatsapp_outbound_send: { Args: never; Returns: Json }
      fire_whatsapp_template_poll: { Args: never; Returns: number }
      flow_task_add: {
        Args: {
          p_assignee_email?: string
          p_assignee_name?: string
          p_detail?: string
          p_flow_name?: string
          p_priority?: string
          p_run_id?: string
          p_source?: string
          p_steps?: Json
          p_title: string
        }
        Returns: string
      }
      flow_task_delete: { Args: { p_id: string }; Returns: undefined }
      flow_task_set_status: {
        Args: { p_id: string; p_status: string }
        Returns: undefined
      }
      flow_task_toggle_step: {
        Args: { p_done: boolean; p_id: string; p_step_id: string }
        Returns: Json
      }
      friend_accept: {
        Args: { _phone: string; _request: string }
        Returns: Json
      }
      friend_decline: { Args: { _request: string }; Returns: boolean }
      friend_remove: { Args: { _friend: string }; Returns: boolean }
      friend_request: { Args: { _phone: string }; Returns: Json }
      friends_list: {
        Args: never
        Returns: {
          friend_avatar: string
          friend_id: string
          friend_name: string
          friend_phone: string
          status: string
        }[]
      }
      generate_all_b2b_tasks_today: { Args: never; Returns: Json }
      generate_daily_tasks_for_employee: {
        Args: { p_date?: string; p_employee_id: string }
        Returns: number
      }
      generate_daily_tasks_pulse: { Args: never; Returns: Json }
      generate_post_visual: { Args: { p_post_id: string }; Returns: Json }
      generate_recurring_tasks: { Args: { p_date?: string }; Returns: Json }
      generate_tasks_for_supplier_today: {
        Args: { p_supplier_id: string }
        Returns: Json
      }
      generate_user_daily_picks: {
        Args: { p_user_id?: string }
        Returns: {
          listing_id: string
          pick_rank: number
          reason: string
        }[]
      }
      generic_insight_callback: { Args: { p_id: string }; Returns: undefined }
      genie_forward_lead: {
        Args: {
          p_channel?: string
          p_customer_name: string
          p_customer_phone: string
          p_listing_id?: string
          p_listing_slug?: string
          p_request: string
        }
        Returns: Json
      }
      get_active_policy_rules: {
        Args: { p_scope?: string }
        Returns: {
          enforcement_level: string
          rule_arabic: string
          rule_english: string
          rule_key: string
          scope: string
        }[]
      }
      get_admin_action_hub: { Args: never; Returns: Json }
      get_admin_dashboard_charts: { Args: never; Returns: Json }
      get_admin_dashboard_stats: { Args: never; Returns: Json }
      get_admin_dashboard_v2: { Args: never; Returns: Json }
      get_admin_messages_summary: { Args: never; Returns: Json }
      get_admin_quickhub_counts: { Args: never; Returns: Json }
      get_admin_welcome_messages: { Args: never; Returns: Json }
      get_agent_detail: { Args: { p_agent_name: string }; Returns: Json }
      get_agent_directives: { Args: { p_scope?: string }; Returns: Json }
      get_agents_structure: { Args: never; Returns: Json }
      get_ai_os_snapshot: { Args: never; Returns: Json }
      get_anthropic_api_key: { Args: never; Returns: string }
      get_anthropic_key: { Args: never; Returns: string }
      get_booking_public: {
        Args: { p_booking_id: string; p_reference_code: string }
        Returns: Json
      }
      get_cold_leads_for_outreach: {
        Args: { target_count?: number }
        Returns: {
          business_name: string
          category: string
          id: string
          location: string
          phone: string
          rating: number
          review_count: number
          source_hook: string
          type: string
        }[]
      }
      get_comms_roster: { Args: never; Returns: Json }
      get_custody: { Args: never; Returns: Json }
      get_custody_employees: { Args: never; Returns: Json }
      get_daily_message_for_user: {
        Args: { p_user_id: string }
        Returns: {
          already_viewed: boolean
          body: string
          category: string
          cta_label: string
          cta_url: string
          deal_code: string
          id: string
          image_url: string
          title: string
        }[]
      }
      get_daily_outreach_batch: {
        Args: { total_target?: number }
        Returns: Json
      }
      get_districts_by_governorate: {
        Args: { p_governorate: string }
        Returns: {
          id: string
          name_ar: string
          name_en: string
          slug: string
          sort_order: number
        }[]
      }
      get_dormant_customers_for_outreach: {
        Args: { target_count?: number }
        Returns: {
          days_since_signup: number
          full_name: string
          id: string
          phone: string
          type: string
        }[]
      }
      get_employee_permissions_overview: { Args: never; Returns: Json }
      get_flow_tasks: { Args: never; Returns: Json }
      get_flows: { Args: never; Returns: Json }
      get_google_sheets_creds: { Args: never; Returns: string }
      get_listing_draft: { Args: { p_claim_token: string }; Returns: Json }
      get_madmona_agents_team: { Args: never; Returns: Json }
      get_madmona_company_overview: { Args: never; Returns: Json }
      get_marketplace_category_counts: {
        Args: { p_country?: string | null }
        Returns: {
          category_id: string
          listing_count: number
        }[]
      }
      get_marketplace_suppliers_admin: { Args: never; Returns: Json }
      get_meta_page_token: { Args: never; Returns: string }
      get_meta_token: { Args: never; Returns: string }
      get_meta_user_token: { Args: never; Returns: string }
      get_metricool_token: { Args: never; Returns: string }
      get_module_token: { Args: never; Returns: string }
      get_or_create_referral_code: {
        Args: {
          p_label?: string
          p_owner_phone?: string
          p_owner_profile_id?: string
          p_owner_type?: string
        }
        Returns: Json
      }
      get_order_public: {
        Args: { p_order_id: string; p_reference_code: string }
        Returns: Json
      }
      get_owner_overview_charts: { Args: never; Returns: Json }
      get_pending_messages: {
        Args: { p_agent_name: string; p_limit?: number }
        Returns: {
          created_at: string
          from_agent: string
          id: string
          message_type: string
          payload: Json
          priority: string
          response_required: boolean
          subject: string
          thread_id: string
        }[]
      }
      get_policy_rules_as_prompt: { Args: { p_scope: string }; Returns: string }
      get_pulse_feed: { Args: { p_user_id?: string }; Returns: Json }
      get_recurring_tasks: { Args: { p_supplier_id: string }; Returns: Json }
      get_referrals: {
        Args: { p_owner_phone?: string; p_owner_profile_id?: string }
        Returns: Json
      }
      get_resend_api_key: { Args: never; Returns: string }
      get_resend_key: { Args: never; Returns: string }
      get_streaks_at_risk: {
        Args: never
        Returns: {
          current_streak: number
          hours_remaining: number
          last_visit_date: string
          longest_streak: number
          push_message: string
          user_id: string
        }[]
      }
      get_stuck_suppliers_for_outreach: {
        Args: never
        Returns: {
          business_intent: string
          days_since_signup: number
          full_name: string
          id: string
          phone: string
          type: string
        }[]
      }
      get_supplier_payouts: { Args: { p_supplier_id: string }; Returns: Json }
      get_supplier_wallet: { Args: { p_supplier_id: string }; Returns: Json }
      get_system_context: { Args: never; Returns: Json }
      get_system_pulse_status: { Args: never; Returns: Json }
      get_system_state: {
        Args: { p_category?: string }
        Returns: {
          blocker: string
          content: string
          next_steps: string
          status: string
          title: string
          topic: string
        }[]
      }
      get_todays_daily_message: { Args: never; Returns: Json }
      get_trending_sounds: {
        Args: { n?: number; p_region?: string }
        Returns: Json
      }
      get_vault_secret: { Args: { p_name: string }; Returns: string }
      get_wa_bridge_secret: { Args: never; Returns: string }
      get_weekly_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          avatar_initial: string
          current_streak: number
          display_name: string
          is_current_user: boolean
          longest_streak: number
          rank: number
          total_visits: number
        }[]
      }
      get_whatsapp_funnel_stats: {
        Args: { days_back?: number }
        Returns: {
          metric: string
          pct: number
          value: number
        }[]
      }
      handle_template_approved: {
        Args: { p_template_name: string }
        Returns: Json
      }
      hold_unit_48h: {
        Args: { p_name?: string; p_phone: string; p_unit_id: string }
        Returns: Json
      }
      home_group_live_counts: {
        Args: never
        Returns: {
          gkey: string
          live: number
        }[]
      }
      home_stats: { Args: never; Returns: Json }
      hourly_flow_sentinel: { Args: never; Returns: Json }
      hr_acknowledge_infraction: {
        Args: { p_infraction_id: string }
        Returns: undefined
      }
      hr_apply_pending_deductions: {
        Args: {
          p_month: number
          p_payroll_run_id: string
          p_supplier: string
          p_year: number
        }
        Returns: {
          applied_amount: number
          employee_id: string
        }[]
      }
      hr_approve_penalty: {
        Args: { p_admin?: string; p_infraction_id: string }
        Returns: {
          acknowledged_at: string | null
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          deduction_amount_egp: number | null
          details: Json | null
          employee_id: string
          grievance_window_until: string | null
          id: string
          infraction_date: string
          infraction_type: string
          note: string | null
          notified_at: string | null
          occurrence_no: number | null
          payroll_item_id: string | null
          proposed_penalty_type: string
          proposed_penalty_value: number
          rule_id: string | null
          source: string
          status: string
          supplier_id: string
        }
        SetofOptions: {
          from: "*"
          to: "hr_infractions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      hr_detect_attendance_infractions: {
        Args: { p_date: string; p_employee_id?: string; p_supplier: string }
        Returns: number
      }
      hr_file_grievance: {
        Args: { p_infraction_id: string; p_reason: string }
        Returns: {
          acknowledged_at: string | null
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          deduction_amount_egp: number | null
          details: Json | null
          employee_id: string
          grievance_window_until: string | null
          id: string
          infraction_date: string
          infraction_type: string
          note: string | null
          notified_at: string | null
          occurrence_no: number | null
          payroll_item_id: string | null
          proposed_penalty_type: string
          proposed_penalty_value: number
          rule_id: string | null
          source: string
          status: string
          supplier_id: string
        }
        SetofOptions: {
          from: "*"
          to: "hr_infractions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      hr_penalty_label: {
        Args: { p_type: string; p_value: number }
        Returns: string
      }
      hr_pending_deductions: {
        Args: { p_month: number; p_supplier: string; p_year: number }
        Returns: {
          employee_id: string
          full_name: string
          infraction_ids: string[]
          total_deduction: number
        }[]
      }
      hr_waive_penalty: {
        Args: { p_admin?: string; p_infraction_id: string; p_reason?: string }
        Returns: {
          acknowledged_at: string | null
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          deduction_amount_egp: number | null
          details: Json | null
          employee_id: string
          grievance_window_until: string | null
          id: string
          infraction_date: string
          infraction_type: string
          note: string | null
          notified_at: string | null
          occurrence_no: number | null
          payroll_item_id: string | null
          proposed_penalty_type: string
          proposed_penalty_value: number
          rule_id: string | null
          source: string
          status: string
          supplier_id: string
        }
        SetofOptions: {
          from: "*"
          to: "hr_infractions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      inbox_approve_reply: {
        Args: { p_edited_text?: string; p_id: string }
        Returns: undefined
      }
      inbox_reject_reply: { Args: { p_id: string }; Returns: undefined }
      increment_deal_clicks: { Args: { deal_id: string }; Returns: undefined }
      increment_view_count: { Args: { listing_id: string }; Returns: undefined }
      invoke_agent: { Args: { p_agent: string }; Returns: number }
      invoke_idle_agent: {
        Args: {
          p_agent: string
          p_max_tokens?: number
          p_system: string
          p_user: string
        }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_service: { Args: never; Returns: boolean }
      is_listing_claimed: { Args: { p_supplier_id: string }; Returns: boolean }
      is_madmona_self_phone: { Args: { p: string }; Returns: boolean }
      is_phone_verified: { Args: { p_phone: string }; Returns: boolean }
      is_room_member: {
        Args: { _room: string; _uid: string }
        Returns: boolean
      }
      is_room_owner: { Args: { _room: string; _uid: string }; Returns: boolean }
      is_supplier_suspended: {
        Args: { p_supplier_id: string }
        Returns: boolean
      }
      is_trial_open_supplier: {
        Args: { p_supplier_id: string }
        Returns: boolean
      }
      is_unclaimed_trustee_business: {
        Args: { p_listing_id: string }
        Returns: boolean
      }
      latest_pipeline_run: {
        Args: { p_pipeline_name: string }
        Returns: {
          completed_at: string
          current_step: number
          error: string
          id: string
          shared_context: Json
          started_at: string
          status: string
          total_steps: number
        }[]
      }
      leads_watchdog_check: { Args: never; Returns: Json }
      leave_room: { Args: { _room: string }; Returns: boolean }
      link_guest_bookings_to_profile: {
        Args: { p_profile_id: string }
        Returns: number
      }
      link_guest_orders_to_profile: {
        Args: { p_profile_id: string }
        Returns: number
      }
      listing_has_clear_price: {
        Args: { p_listing_id: string; p_supplier_id: string }
        Returns: boolean
      }
      listing_madmona_managed_price: {
        Args: { p_listing_id: string }
        Returns: boolean
      }
      listings_watchdog_check: { Args: never; Returns: Json }
      log_activity_event: {
        Args: {
          p_category?: string
          p_city?: string
          p_emoji?: string
          p_event_type: string
          p_listing_id?: string
          p_message_ar: string
          p_metadata?: Json
        }
        Returns: string
      }
      log_app_update: {
        Args: { p_area?: string; p_detail: string; p_title: string }
        Returns: Json
      }
      madmona_book_service: {
        Args: {
          p_branch_code: string
          p_notes?: string
          p_scheduled_at: string
          p_service_id: string
          p_token: string
        }
        Returns: Json
      }
      madmona_booking_info: { Args: { p_token: string }; Returns: Json }
      madmona_brand_prompt_block: { Args: never; Returns: string }
      madmona_company_add_document: {
        Args: {
          p_document_name: string
          p_document_type: string
          p_file_url: string
          p_notes?: string
        }
        Returns: Json
      }
      madmona_company_add_expense: {
        Args: {
          p_amount: number
          p_category: string
          p_expense_date?: string
          p_notes?: string
          p_payment_method?: string
          p_receipt_url?: string
          p_vendor_name?: string
        }
        Returns: Json
      }
      madmona_company_add_inventory_product: {
        Args: {
          p_category?: string
          p_cost?: number
          p_current_stock?: number
          p_name_ar: string
          p_product_type?: string
          p_reorder?: number
          p_selling?: number
          p_unit?: string
        }
        Returns: Json
      }
      madmona_company_add_purchase_order: {
        Args: {
          p_notes?: string
          p_paid?: number
          p_status?: string
          p_total: number
          p_vendor_name: string
          p_vendor_phone?: string
        }
        Returns: Json
      }
      madmona_company_add_vendor: {
        Args: {
          p_category?: string
          p_name: string
          p_notes?: string
          p_phone?: string
        }
        Returns: Json
      }
      madmona_company_adjust_stock: {
        Args: { p_new_stock: number; p_product_id: string }
        Returns: Json
      }
      madmona_company_dashboard: {
        Args: { p_supplier_id: string }
        Returns: Json
      }
      madmona_create_product_order: {
        Args: { p_items: Json; p_method: string; p_token: string }
        Returns: Json
      }
      madmona_create_tip: {
        Args: {
          p_amount: number
          p_employee_id: string
          p_method: string
          p_token: string
        }
        Returns: Json
      }
      madmona_customer_bookings: { Args: { p_token: string }; Returns: Json }
      madmona_customer_pending_reviews: {
        Args: { p_token: string }
        Returns: Json
      }
      madmona_employee_clock: {
        Args: {
          p_accuracy_m?: number
          p_lat?: number
          p_lng?: number
          p_token: string
        }
        Returns: Json
      }
      madmona_employee_heartbeat: {
        Args: {
          p_accuracy_m?: number
          p_lat?: number
          p_lng?: number
          p_token: string
        }
        Returns: Json
      }
      madmona_employee_mark_notifications_read: {
        Args: { p_notification_id?: string; p_token: string }
        Returns: Json
      }
      madmona_employee_notifications: {
        Args: { p_limit?: number; p_token: string }
        Returns: Json
      }
      madmona_employee_save_push: {
        Args: {
          p_auth: string
          p_endpoint: string
          p_p256dh: string
          p_token: string
          p_user_agent?: string
        }
        Returns: Json
      }
      madmona_employee_summary: { Args: { p_token: string }; Returns: Json }
      madmona_employee_toggle_prep: {
        Args: {
          p_booking_id: string
          p_done: boolean
          p_key: string
          p_token: string
        }
        Returns: Json
      }
      madmona_employee_toggle_task: {
        Args: { p_status: string; p_task_id: string; p_token: string }
        Returns: Json
      }
      madmona_employee_update_booking: {
        Args: { p_action: string; p_booking_id: string; p_token: string }
        Returns: Json
      }
      madmona_join_info: { Args: { p_slug: string }; Returns: Json }
      madmona_list_products: { Args: { p_token: string }; Returns: Json }
      madmona_list_quote_orders: {
        Args: { p_supplier_id: string; p_token: string }
        Returns: Json
      }
      madmona_locked_palette_5: { Args: never; Returns: string }
      madmona_logout: { Args: { p_token: string }; Returns: Json }
      madmona_marketing_dashboard: { Args: never; Returns: Json }
      madmona_mgr_add_inventory_product: {
        Args: {
          p_category?: string
          p_cost?: number
          p_current_stock?: number
          p_name_ar: string
          p_product_type?: string
          p_reorder?: number
          p_selling?: number
          p_token: string
          p_unit?: string
        }
        Returns: Json
      }
      madmona_mgr_attendance: {
        Args: { p_date?: string; p_token: string }
        Returns: Json
      }
      madmona_mgr_bom: { Args: { p_token: string }; Returns: Json }
      madmona_mgr_employees: { Args: { p_token: string }; Returns: Json }
      madmona_mgr_get_shifts: {
        Args: { p_employee_id: string; p_token: string }
        Returns: Json
      }
      madmona_mgr_link_product: {
        Args: {
          p_is_optional?: boolean
          p_product_id: string
          p_quantity?: number
          p_service_id: string
          p_token: string
        }
        Returns: Json
      }
      madmona_mgr_resolve: {
        Args: { p_token: string }
        Returns: {
          agent_name: string | null
          auth_user_id: string | null
          avatar_initial: string | null
          birth_date: string | null
          branch_id: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          contract_type: string | null
          created_at: string | null
          dependents_count: number | null
          email: string | null
          employee_type: string
          full_name: string
          gender: string | null
          hired_at: string | null
          id: string
          insurance_enrolled_at: string | null
          is_disabled: boolean | null
          metadata: Json | null
          national_id: string | null
          permissions: Json
          personal_commission_rate: number | null
          phone: string | null
          photo_url: string | null
          pin_code: string | null
          probation_end_date: string | null
          reports_to_employee_id: string | null
          role: string
          role_ar: string | null
          salary_egp: number | null
          social_insurance_no: string | null
          status: string | null
          supplier_id: string
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "business_employees"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      madmona_mgr_save_employee: {
        Args: {
          p_branch_id?: string
          p_employee_id?: string
          p_full_name?: string
          p_phone?: string
          p_role_ar?: string
          p_salary_egp?: number
          p_token: string
        }
        Returns: Json
      }
      madmona_mgr_set_attendance: {
        Args: {
          p_clock_in?: string
          p_clock_out?: string
          p_date: string
          p_employee_id: string
          p_token: string
        }
        Returns: Json
      }
      madmona_mgr_set_shifts: {
        Args: { p_employee_id: string; p_shifts: Json; p_token: string }
        Returns: Json
      }
      madmona_mgr_unlink_product: {
        Args: { p_product_id: string; p_service_id: string; p_token: string }
        Returns: Json
      }
      madmona_norm_phone: { Args: { p: string }; Returns: string }
      madmona_notify_attendance_status: {
        Args: { p_dry_run?: boolean; p_mode?: string; p_supplier_id?: string }
        Returns: Json
      }
      madmona_push_employee_self_status: {
        Args: { p_force?: boolean; p_supplier_id?: string }
        Returns: Json
      }
      madmona_push_manager_roster: {
        Args: { p_force?: boolean; p_supplier_id?: string }
        Returns: Json
      }
      madmona_quote_order: {
        Args: {
          p_delivery_fee?: number
          p_lines: Json
          p_order_id: string
          p_supplier_notes?: string
          p_token: string
        }
        Returns: Json
      }
      madmona_request_otp: {
        Args: { p_full_name?: string; p_phone: string }
        Returns: Json
      }
      madmona_resolve: { Args: { p_token: string }; Returns: Json }
      madmona_submit_employee_join: {
        Args: {
          p_branch_id: string
          p_job_title: string
          p_supplier_id: string
          p_token: string
        }
        Returns: Json
      }
      madmona_tip_targets: { Args: { p_token: string }; Returns: Json }
      madmona_verify_magic_link: { Args: { p_token: string }; Returns: Json }
      madmona_verify_otp: {
        Args: { p_code: string; p_full_name?: string; p_phone: string }
        Returns: Json
      }
      madmona_wa_login_confirm: {
        Args: { p_code: string; p_from_phone: string; p_name?: string }
        Returns: Json
      }
      madmona_wa_login_start: { Args: never; Returns: Json }
      madmona_wa_login_status: { Args: { p_code: string }; Returns: Json }
      madmona_wa_login_try: {
        Args: { p_from: string; p_name?: string; p_text: string }
        Returns: Json
      }
      madmona_webapp_aesthetic_brief: { Args: never; Returns: string }
      make_self_heal: { Args: never; Returns: Json }
      marid_alerts_janitor: { Args: never; Returns: Json }
      marid_attach_inbound_photos: { Args: { p_limit?: number }; Returns: Json }
      marid_contact_block: {
        Args: { p_name?: string; p_phone: string }
        Returns: string
      }
      marid_cron_guard: { Args: never; Returns: Json }
      marid_health_check: { Args: { p_alert?: boolean }; Returns: Json }
      marid_heartbeat_watchdog: { Args: never; Returns: Json }
      marid_never_ran_count: { Args: never; Returns: number }
      marid_orchestrate: {
        Args: { p_max?: number; p_trigger?: string }
        Returns: Json
      }
      marid_phone_canon: { Args: { p_raw: string }; Returns: string }
      marid_phone_variants: { Args: { p_raw: string }; Returns: string[] }
      marid_project_change_digest: { Args: never; Returns: Json }
      marid_publish_ready_listings: {
        Args: { p_limit?: number }
        Returns: Json
      }
      marid_pulse_age_seconds: { Args: never; Returns: number }
      marid_reap_dead_listings: {
        Args: {
          p_days?: number
          p_dry_run?: boolean
          p_limit?: number
          p_never_reached_days?: number
        }
        Returns: Json
      }
      marid_record_attempts: {
        Args: { p_item_query: string; p_job_key: string }
        Returns: number
      }
      marid_refresh_contact_card: {
        Args: { p_phone: string }
        Returns: undefined
      }
      marid_request_listing_completion: {
        Args: { p_limit?: number; p_send?: boolean }
        Returns: Json
      }
      marid_retry_item: {
        Args: { p_item_key?: string; p_job_key: string }
        Returns: string
      }
      marid_run_job: {
        Args: { p_job_key: string; p_trigger?: string }
        Returns: Json
      }
      mark_agent_ran: {
        Args: { p_agent_name: string; p_success: boolean }
        Returns: undefined
      }
      mark_cold_lead_contacted: {
        Args: { lead_id: string }
        Returns: undefined
      }
      mark_daily_message_action: {
        Args: { p_action: string; p_message_id: string }
        Returns: Json
      }
      mark_hero_post_published: {
        Args: {
          p_content_calendar_id: string
          p_external_post_id?: string
          p_external_post_url: string
        }
        Returns: {
          external_url: string
          id: string
          platform: string
          published_at: string
          status: string
        }[]
      }
      mark_insight_actioned: {
        Args: { p_action_taken?: string; p_insight_id: string }
        Returns: undefined
      }
      mark_media_used: { Args: { p_media_id: string }; Returns: undefined }
      mark_message_processed: {
        Args: { p_message_id: string; p_response_payload?: Json }
        Returns: undefined
      }
      mask_contact_info: {
        Args: { t: string }
        Returns: {
          hits: string[]
          masked: string
        }[]
      }
      match_incoming_call: {
        Args: { p_caller: string; p_source?: string }
        Returns: string
      }
      materialize_fixed_tasks: {
        Args: { p_date?: string; p_supplier_id: string }
        Returns: number
      }
      mdm_slugify: { Args: { txt: string }; Returns: string }
      merge_lid_conversation: {
        Args: { p_lid: string; p_phone: string }
        Returns: Json
      }
      merge_oauth_into_existing: {
        Args: { p_orphan_user_id: string; p_phone: string }
        Returns: Json
      }
      metricool_mark_failed: {
        Args: { p_error: string; p_id: string }
        Returns: undefined
      }
      metricool_mark_scheduled: {
        Args: { p_autopublish: boolean; p_external_id: string; p_id: string }
        Returns: undefined
      }
      my_assets: { Args: { p_wa_token?: string }; Returns: Json }
      my_meeting: { Args: { p_phone: string }; Returns: Json }
      my_sessions: { Args: never; Returns: Json }
      my_supplier_links: { Args: never; Returns: Json }
      norm_listing_title: { Args: { t: string }; Returns: string }
      normalize_digits: { Args: { t: string }; Returns: string }
      normalize_eg_phone: { Args: { p: string }; Returns: string }
      normalize_phone: { Args: { p: string }; Returns: string }
      notification_queue_bump_failed: {
        Args: { p_ids: string[] }
        Returns: number
      }
      notify_employee_push: {
        Args: {
          p_body: string
          p_data?: Json
          p_employee_ids: string[]
          p_title: string
          p_type: string
          p_url?: string
        }
        Returns: number
      }
      notify_phones: {
        Args: {
          p_body: string
          p_data?: Json
          p_phones: string[]
          p_title: string
          p_type: string
          p_url?: string
        }
        Returns: number
      }
      notify_push: {
        Args: {
          p_body: string
          p_data?: Json
          p_profile_ids: string[]
          p_title: string
          p_type: string
          p_url?: string
        }
        Returns: number
      }
      notify_telegram: {
        Args: { p_chat_ids: number[]; p_text: string }
        Returns: number
      }
      notify_telegram_phones: {
        Args: { p_phones: string[]; p_text: string }
        Returns: number
      }
      notify_yasser_elite_activity: { Args: never; Returns: Json }
      owner_2h_activity_digest: { Args: never; Returns: Json }
      owner_auto_session: { Args: { p_supplier_id: string }; Returns: Json }
      owner_check_access: { Args: { p_supplier_id: string }; Returns: Json }
      owner_check_by_token: {
        Args: { p_supplier_id: string; p_token: string }
        Returns: Json
      }
      owner_claim_access_by_email: { Args: { p_email: string }; Returns: Json }
      owner_get_my_access: { Args: never; Returns: Json }
      owner_logout: { Args: { p_token: string }; Returns: Json }
      owner_mint_session_from_auth: { Args: never; Returns: Json }
      owner_request_otp: { Args: { p_phone: string }; Returns: Json }
      owner_resolve_access: { Args: never; Returns: Json }
      owner_resolve_by_token: { Args: { p_token: string }; Returns: Json }
      owner_verify_otp: {
        Args: { p_code: string; p_phone: string }
        Returns: Json
      }
      owns_listing: { Args: { listing_uuid: string }; Returns: boolean }
      owns_supplier: { Args: { supplier_uuid: string }; Returns: boolean }
      pg_buf_caption: { Args: { p_id: string }; Returns: string }
      phone_key: { Args: { p: string }; Returns: string }
      pick_due_agents: {
        Args: { p_max?: number }
        Returns: {
          agent_name: string
          config: Json
          team: string
        }[]
      }
      pick_media_for_category: {
        Args: { p_category: string; p_prefer_branded?: boolean }
        Returns: {
          id: string
          public_url: string
          title: string
        }[]
      }
      pick_verify_number: {
        Args: { p_exclude?: string }
        Returns: {
          healthy: boolean
          id: string
          label: string
          phone: string
        }[]
      }
      poll_ad_regen_responses: { Args: never; Returns: number }
      process_anthropic_responses: { Args: never; Returns: Json }
      process_email_outbox: { Args: { p_limit?: number }; Returns: Json }
      process_facebook_publish_responses: { Args: never; Returns: Json }
      process_whatsapp_outbound_queue: { Args: never; Returns: Json }
      process_whatsapp_template_polls: { Args: never; Returns: Json }
      profile_completion_status: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      promote_directory_batch: { Args: { p_limit?: number }; Returns: Json }
      public_category_visible_counts: {
        Args: never
        Returns: {
          category_id: string
          name_ar: string
          slug: string
          visible_count: number
        }[]
      }
      public_clinic_demo_snapshot: { Args: { p_slug: string }; Returns: Json }
      public_clinic_landing: { Args: { p_slug: string }; Returns: Json }
      public_create_booking: {
        Args: {
          p_addon_service_ids?: string[]
          p_branch_code: string
          p_customer_name: string
          p_customer_phone: string
          p_notes?: string
          p_products?: Json
          p_scheduled_at: string
          p_service_id: string
          p_stylist_id?: string
        }
        Returns: Json
      }
      public_create_tip: {
        Args: {
          p_amount: number
          p_branch_code: string
          p_customer_name?: string
          p_customer_phone?: string
          p_employee_id: string
          p_method?: string
        }
        Returns: Json
      }
      public_get_available_slots: {
        Args: { p_branch_code: string; p_date: string; p_stylist_id?: string }
        Returns: Json
      }
      public_get_booking_for_review: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      public_get_branch_by_code: {
        Args: { p_branch_code: string }
        Returns: Json
      }
      public_get_branch_info: { Args: { p_branch_code: string }; Returns: Json }
      public_get_branch_menu: { Args: { p_supplier_id: string }; Returns: Json }
      public_get_mart_catalog: { Args: { p_slug: string }; Returns: Json }
      public_get_supplier_branding: {
        Args: { p_supplier_id: string }
        Returns: Json
      }
      public_is_supplier_suspended: {
        Args: { p_supplier_id: string }
        Returns: boolean
      }
      public_join_waitlist: {
        Args: {
          p_branch_code: string
          p_customer_name: string
          p_customer_phone: string
          p_preferred_date?: string
          p_preferred_time_text?: string
          p_service_id: string
        }
        Returns: Json
      }
      public_list_branches: { Args: { p_supplier_id?: string }; Returns: Json }
      public_list_hotels: { Args: { p_search?: string }; Returns: Json }
      public_list_mart_stores: { Args: { p_industry?: string }; Returns: Json }
      public_nearest_branch: {
        Args: { p_lat: number; p_lng: number; p_supplier_id?: string }
        Returns: Json
      }
      public_rate_visit: {
        Args: {
          p_branch_code: string
          p_comment?: string
          p_customer_name?: string
          p_employee_id?: string
          p_rating: number
        }
        Returns: Json
      }
      public_resolve_booking_target: {
        Args: { p_branch_code: string }
        Returns: Json
      }
      public_salon_landing: { Args: { p_slug: string }; Returns: Json }
      public_submit_review: {
        Args: {
          p_booking_id: string
          p_comment?: string
          p_rating: number
          p_stylist_rating?: number
        }
        Returns: Json
      }
      public_supplier_landing: { Args: { p_slug: string }; Returns: Json }
      publish_post_to_facebook: { Args: { p_post_id: string }; Returns: number }
      publish_unclaimed_draft: { Args: { p_draft_id: string }; Returns: Json }
      publishing_watchdog_check: { Args: never; Returns: Json }
      purge_stale_drafts: { Args: never; Returns: Json }
      push_all_scheduled_to_now: { Args: never; Returns: number }
      qc_approve:
        | { Args: { p_id: string }; Returns: Json }
        | { Args: { p_id: string; p_kind: string }; Returns: Json }
      qc_approve_all_posts: { Args: never; Returns: Json }
      qc_owner_digest: { Args: never; Returns: Json }
      qc_reject:
        | { Args: { p_id: string; p_reason?: string }; Returns: Json }
        | {
            Args: { p_id: string; p_kind: string; p_reason?: string }
            Returns: Json
          }
      queue_borsa_proof_blast: {
        Args: never
        Returns: {
          queued: number
        }[]
      }
      rate_limit_hit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      record_call_source_heartbeat: {
        Args: { p_source: string }
        Returns: boolean
      }
      record_user_visit: { Args: { p_user_id: string }; Returns: Json }
      recurring_task_add: {
        Args: {
          p_branch_id?: string
          p_day_of_month?: number
          p_description?: string
          p_due_time?: string
          p_employee_id: string
          p_frequency: string
          p_priority?: string
          p_supplier_id: string
          p_task_kind?: string
          p_title_ar: string
          p_weekdays?: number[]
        }
        Returns: Json
      }
      recurring_task_delete: { Args: { p_id: string }; Returns: Json }
      recurring_task_toggle: {
        Args: { p_active: boolean; p_id: string }
        Returns: Json
      }
      referral_leaderboard: { Args: { p_limit?: number }; Returns: Json }
      referral_qualify: {
        Args: {
          p_booking_amount?: number
          p_event?: string
          p_kind: string
          p_ref_id?: string
          p_referred_phone: string
        }
        Returns: Json
      }
      referral_reward: { Args: { p_referral_id: string }; Returns: Json }
      referral_set_status: {
        Args: { p_notes?: string; p_referral_id: string; p_status: string }
        Returns: Json
      }
      refresh_lead_intelligence: { Args: never; Returns: Json }
      refresh_listing_content_gaps: {
        Args: never
        Returns: {
          closed: number
          inserted: number
        }[]
      }
      refresh_property_opportunities: { Args: never; Returns: number }
      refresh_whatsapp_token_tick: { Args: never; Returns: Json }
      regenerate_one_ad_creative: {
        Args: never
        Returns: {
          ad_id: string
          headline: string
          request_id: number
        }[]
      }
      remove_room_member: {
        Args: { _member: string; _room: string }
        Returns: boolean
      }
      request_missing_project_info: {
        Args: { p_max_brokers?: number; p_send?: boolean }
        Returns: Json
      }
      resolve_all_pending_alerts: { Args: never; Returns: Json }
      revoke_session: { Args: { p_session_id: string }; Returns: boolean }
      room_members: {
        Args: { _room: string }
        Returns: {
          is_me: boolean
          member_id: string
          member_name: string
          member_role: string
        }[]
      }
      room_needs_masking: {
        Args: { p_room: string; p_sender: string }
        Returns: boolean
      }
      run_all_watchdogs: { Args: never; Returns: Json }
      run_daily_health_check_with_alert: { Args: never; Returns: Json }
      run_orchestrator_step: { Args: never; Returns: Json }
      run_prompt_optimizer_step: { Args: never; Returns: Json }
      run_supplier_hunter: {
        Args: { p_category?: string; p_city?: string; p_count?: number }
        Returns: string
      }
      run_team_lead_cycle: { Args: never; Returns: Json }
      sanitize_madmona_domain_text: { Args: { txt: string }; Returns: string }
      search_listings_catalog: {
        Args: {
          p_category_slug?: string
          p_city?: string
          p_limit?: number
          p_query?: string
        }
        Returns: Json
      }
      send_admin_email: {
        Args: {
          p_body_html?: string
          p_body_text: string
          p_related_id?: string
          p_source?: string
          p_subject: string
          p_to_email: string
        }
        Returns: string
      }
      send_agent_message:
        | {
            Args: {
              p_from: string
              p_payload: Json
              p_subject: string
              p_thread_id?: string
              p_to: string
              p_type: string
            }
            Returns: string
          }
        | {
            Args: {
              p_from_agent: string
              p_message_type: string
              p_parent_message_id?: string
              p_payload: Json
              p_priority?: string
              p_response_required?: boolean
              p_subject: string
              p_thread_id?: string
              p_to_agent: string
            }
            Returns: string
          }
      send_customer_email: {
        Args: {
          p_body_html?: string
          p_body_text?: string
          p_category?: string
          p_metadata?: Json
          p_priority?: number
          p_related_booking_id?: string
          p_related_listing_id?: string
          p_related_supplier_id?: string
          p_subject?: string
          p_template_key?: string
          p_template_vars?: Json
          p_to_email: string
          p_to_name?: string
          p_to_profile_id?: string
        }
        Returns: string
      }
      send_daily_health_summary: { Args: never; Returns: Json }
      send_meeting_reminders: { Args: never; Returns: Json }
      send_rotating_push: { Args: never; Returns: Json }
      seo_browse_data: {
        Args: { p_cat: string; p_city: string }
        Returns: Json
      }
      seo_combos: { Args: never; Returns: Json }
      seo_norm_area: { Args: { t: string }; Returns: string }
      set_agent_enabled: {
        Args: { p_agent_name: string; p_enabled: boolean }
        Returns: Json
      }
      set_comms_settings: {
        Args: {
          p_always_cc?: string[]
          p_owner_email: string
          p_owner_name?: string
        }
        Returns: Json
      }
      set_employee_email: {
        Args: { p_email: string; p_employee_id: string }
        Returns: Json
      }
      set_employee_permission: {
        Args: { p_employee_id: string; p_key: string; p_value: boolean }
        Returns: Json
      }
      set_employee_permissions_bulk: {
        Args: { p_employee_id: string; p_permissions: Json }
        Returns: Json
      }
      set_my_avatar: { Args: { _url: string }; Returns: string }
      set_order_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["mp_order_status"]
          p_order_id: string
          p_reason?: string
        }
        Returns: Json
      }
      set_vault_secret: {
        Args: { p_name: string; p_value: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      snapshot_agent_performance: { Args: never; Returns: number }
      snapshot_daily_kpis: { Args: { p_date?: string }; Returns: Json }
      submit_careers_application: {
        Args: {
          p_city?: string
          p_cv_url?: string
          p_email?: string
          p_expected_salary_egp?: number
          p_experience_years?: number
          p_full_name: string
          p_last_salary_egp?: number
          p_phone: string
          p_position?: string
          p_why_join?: string
        }
        Returns: Json
      }
      supplier_bulk_import_listings: {
        Args: { p_default_category_id?: string; p_items: Json }
        Returns: Json
      }
      supplier_bulk_import_menu_items: {
        Args: { p_items: Json; p_listing_id: string }
        Returns: Json
      }
      supplier_bulk_import_products: {
        Args: { p_items: Json; p_listing_id: string }
        Returns: Json
      }
      supplier_hunter_callback: {
        Args: { p_request_id: string }
        Returns: Json
      }
      supplier_payout_request: {
        Args: {
          p_amount: number
          p_instapay_ref?: string
          p_notes?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      supplier_payout_set_status: {
        Args: { p_id: string; p_reference?: string; p_status: string }
        Returns: undefined
      }
      supplier_self_dashboard: {
        Args: { p_supplier_id?: string }
        Returns: Json
      }
      supplier_self_delete_branch: {
        Args: { p_branch_id: string; p_supplier_id: string }
        Returns: Json
      }
      supplier_self_delete_employee: {
        Args: { p_employee_id: string; p_supplier_id: string }
        Returns: Json
      }
      supplier_self_delete_service: {
        Args: { p_service_id: string; p_supplier_id: string }
        Returns: Json
      }
      supplier_self_save_branch: {
        Args: {
          p_address?: string
          p_branch_id?: string
          p_city?: string
          p_closes_at?: string
          p_district?: string
          p_lat?: number
          p_lng?: number
          p_manager_name?: string
          p_manager_phone?: string
          p_name?: string
          p_opens_at?: string
          p_phone?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      supplier_self_save_employee: {
        Args: {
          p_accepted_insurance?: string[]
          p_bio?: string
          p_branch_id?: string
          p_consultation_fee_egp?: number
          p_employee_id?: string
          p_full_name?: string
          p_personal_commission_rate?: number
          p_phone?: string
          p_role?: string
          p_role_ar?: string
          p_salary_egp?: number
          p_specialty_label_ar?: string
          p_supplier_id: string
          p_title_ar?: string
          p_years_experience?: number
        }
        Returns: Json
      }
      supplier_self_save_service: {
        Args: {
          p_category?: string
          p_commission_pct?: number
          p_description?: string
          p_duration_minutes?: number
          p_name_ar?: string
          p_name_en?: string
          p_price_egp?: number
          p_provider_employee_id?: string
          p_service_id?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      supplier_self_set_media: {
        Args: {
          p_supplier_id: string
          p_target: string
          p_target_id?: string
          p_url?: string
        }
        Returns: Json
      }
      supplier_self_update_business: {
        Args: {
          p_business_name?: string
          p_city?: string
          p_contact_email?: string
          p_contact_phone?: string
          p_description_ar?: string
          p_logo_url?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      sync_bourse_to_ads: { Args: { p_max?: number }; Returns: Json }
      system_health_check: {
        Args: never
        Returns: {
          actual: string
          check_name: string
          check_status: string
          expected: string
          severity: string
        }[]
      }
      system_pulse_check: { Args: never; Returns: Json }
      test_anthropic_connection: { Args: never; Returns: string }
      track_event: {
        Args: {
          p_category?: string
          p_event_type: string
          p_listing_id?: string
          p_metadata?: Json
          p_page_url?: string
          p_session_id?: string
          p_visitor_id: string
        }
        Returns: string
      }
      trigger_agent_async: {
        Args: { p_agent_name: string; p_args?: Json }
        Returns: undefined
      }
      trigger_email_sender: { Args: never; Returns: Json }
      unlock_orchestrator_job: {
        Args: { p_and_enable?: boolean; p_job_key: string }
        Returns: string
      }
      update_listing_views_from_events: { Args: never; Returns: Json }
      update_my_profile: {
        Args: {
          p_account_type?: string
          p_business_name?: string
          p_commercial_registration?: string
          p_email?: string
          p_full_name?: string
          p_national_id?: string
          p_payout_details?: string
          p_payout_method?: string
        }
        Returns: Json
      }
      update_supplier_kyc_admin: {
        Args: {
          p_kyc_status: string
          p_rejection_reason?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      upsert_agent_directives: {
        Args: {
          p_current_trend?: string
          p_excluded_categories?: string[]
          p_focus_areas?: string[]
          p_scope?: string
          p_target_audience?: string
          p_tips_text?: string
        }
        Returns: Json
      }
      user_has_supplier_access: {
        Args: {
          p_permission?: string
          p_supplier_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      vault_upsert: {
        Args: { p_description?: string; p_name: string; p_secret: string }
        Returns: string
      }
      verify_numbers_health: {
        Args: never
        Returns: {
          calls_24h: number
          healthy: boolean
          is_active: boolean
          label: string
          last_call_at: string
          last_heartbeat_at: string
          phone: string
          source_key: string
        }[]
      }
      verify_phone_otp: {
        Args: { p_code: string; p_listing_id?: string; p_phone: string }
        Returns: Json
      }
      wa_check_inbound_verification: { Args: { p_code: string }; Returns: Json }
      wa_claim_hot_lead: { Args: { p_conv: string }; Returns: boolean }
      wa_claim_reply: { Args: { p_message_id: string }; Returns: boolean }
      wa_confirm_inbound_verification: {
        Args: { p_code: string; p_sender_phone: string }
        Returns: Json
      }
      wa_create_inbound_verification: {
        Args: { p_listing_id?: string; p_phone?: string; p_purpose?: string }
        Returns: Json
      }
      wa_delivery_health: {
        Args: { p_minutes?: number }
        Returns: {
          ack_pct: number
          acked: number
          outbound: number
          session_id: string
        }[]
      }
      wa_inbound_watchdog: { Args: never; Returns: Json }
      wa_login_mint: {
        Args: { p_full_name?: string; p_phone: string }
        Returns: Json
      }
      wa_meta_merge: {
        Args: { p_conv: string; p_patch: Json }
        Returns: undefined
      }
      wa_queue_expire_stale: { Args: never; Returns: number }
      wa_rekey_lid_conversations: {
        Args: { p_lid: string; p_phone: string }
        Returns: Json
      }
      wa_reply_claims_gc: { Args: never; Returns: undefined }
      wake_agent: { Args: { p_agent_name: string }; Returns: Json }
      wake_all_stale_agents: { Args: never; Returns: Json }
      wallet_admin_adjust: {
        Args: {
          p_admin?: string
          p_amount: number
          p_direction: string
          p_kind: string
          p_profile: string
          p_reason: string
        }
        Returns: {
          amount: number
          balance_cash_after: number | null
          balance_credit_after: number | null
          counterparty_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          direction: string
          id: string
          kind: Database["public"]["Enums"]["wallet_balance_kind"]
          metadata: Json
          profile_id: string
          reference_id: string | null
          reference_type: string | null
          status: Database["public"]["Enums"]["wallet_txn_status"]
          type: Database["public"]["Enums"]["wallet_txn_type"]
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_apply_order_discount: {
        Args: { p_order_id: string; p_profile: string }
        Returns: Json
      }
      wallet_ensure: {
        Args: { p_profile: string }
        Returns: {
          balance_cash: number
          balance_credit: number
          created_at: string
          currency: string
          id: string
          pin_hash: string | null
          profile_id: string
          status: Database["public"]["Enums"]["wallet_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_pay: {
        Args: {
          p_amount: number
          p_description?: string
          p_profile: string
          p_reference_id?: string
          p_reference_type?: string
          p_source?: string
        }
        Returns: {
          amount: number
          balance_cash_after: number | null
          balance_credit_after: number | null
          counterparty_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          direction: string
          id: string
          kind: Database["public"]["Enums"]["wallet_balance_kind"]
          metadata: Json
          profile_id: string
          reference_id: string | null
          reference_type: string | null
          status: Database["public"]["Enums"]["wallet_txn_status"]
          type: Database["public"]["Enums"]["wallet_txn_type"]
          wallet_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      wallet_pay_order: {
        Args: { p_order_id: string; p_profile: string }
        Returns: Json
      }
      wallet_process_withdrawal: {
        Args: {
          p_action: string
          p_admin?: string
          p_notes?: string
          p_withdrawal: string
        }
        Returns: {
          admin_notes: string | null
          amount: number
          created_at: string
          currency: string
          details: string
          hold_txn_id: string | null
          id: string
          method: string
          processed_at: string | null
          processed_by: string | null
          profile_id: string
          status: Database["public"]["Enums"]["wallet_withdrawal_status"]
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_request_withdrawal: {
        Args: {
          p_amount: number
          p_details: string
          p_method: string
          p_profile: string
        }
        Returns: {
          admin_notes: string | null
          amount: number
          created_at: string
          currency: string
          details: string
          hold_txn_id: string | null
          id: string
          method: string
          processed_at: string | null
          processed_by: string | null
          profile_id: string
          status: Database["public"]["Enums"]["wallet_withdrawal_status"]
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_topup: {
        Args: {
          p_actor?: string
          p_amount: number
          p_description?: string
          p_kind?: string
          p_profile: string
          p_provider?: string
          p_reference?: string
        }
        Returns: {
          amount: number
          balance_cash_after: number | null
          balance_credit_after: number | null
          counterparty_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          direction: string
          id: string
          kind: Database["public"]["Enums"]["wallet_balance_kind"]
          metadata: Json
          profile_id: string
          reference_id: string | null
          reference_type: string | null
          status: Database["public"]["Enums"]["wallet_txn_status"]
          type: Database["public"]["Enums"]["wallet_txn_type"]
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_transfer: {
        Args: {
          p_amount: number
          p_description?: string
          p_from: string
          p_kind?: string
          p_to: string
        }
        Returns: {
          amount: number
          balance_cash_after: number | null
          balance_credit_after: number | null
          counterparty_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          direction: string
          id: string
          kind: Database["public"]["Enums"]["wallet_balance_kind"]
          metadata: Json
          profile_id: string
          reference_id: string | null
          reference_type: string | null
          status: Database["public"]["Enums"]["wallet_txn_status"]
          type: Database["public"]["Enums"]["wallet_txn_type"]
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      whatsapp_send_safety_check: {
        Args: { p_recipient_phone: string }
        Returns: Json
      }
      whatsapp_upsert_conversation:
        | {
            Args: {
              p_agent_name?: string
              p_contact_type?: string
              p_name?: string
              p_phone: string
              p_profile_id?: string
              p_supplier_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_agent_name?: string
              p_contact_type?: string
              p_name?: string
              p_phone: string
              p_profile_id?: string
              p_session_id?: string
              p_supplier_id?: string
            }
            Returns: string
          }
      whatsapp_watchdog_check: { Args: never; Returns: Json }
      whoami: { Args: { p_module_token?: string }; Returns: Json }
    }
    Enums: {
      attribute_type:
        | "text"
        | "number"
        | "boolean"
        | "select"
        | "multi_select"
        | "date"
        | "file"
      availability_status: "available" | "booked" | "blocked"
      booking_status: "confirmed" | "cancelled" | "completed" | "no_show"
      listing_status:
        | "draft"
        | "pending_review"
        | "published"
        | "paused"
        | "rejected"
      mp_booking_status:
        | "pending_payment"
        | "confirmed"
        | "active"
        | "completed"
        | "cancelled"
        | "refunded"
      mp_order_status:
        | "awaiting_quote"
        | "quoted"
        | "pending_payment"
        | "paid"
        | "accepted"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "delivered"
        | "completed"
        | "cancelled"
        | "refunded"
      mp_payment_status:
        | "pending"
        | "authorized"
        | "captured"
        | "failed"
        | "refunded"
      payment_status: "pending" | "paid" | "refunded"
      plan_type: "hourly" | "daily" | "package" | "monthly"
      pricing_period:
        | "hourly"
        | "daily"
        | "weekly"
        | "monthly"
        | "per_event"
        | "half_day"
        | "weekend"
        | "per_trip"
        | "per_person"
        | "per_job"
        | "per_meter"
        | "session"
        | "package"
        | "per_service"
        | "per_package"
        | "per_session"
        | "per_visit"
        | "per_consultation"
        | "per_procedure"
        | "per_treatment"
        | "per_pulse"
        | "per_unit"
        | "monthly_contract"
        | "yearly_contract"
      space_type: "indoor" | "outdoor" | "meeting_room" | "private_office"
      supplier_kyc_status: "pending" | "approved" | "rejected" | "suspended"
      user_role: "customer" | "supplier" | "admin"
      wallet_balance_kind: "cash" | "credit"
      wallet_status: "active" | "frozen" | "closed"
      wallet_topup_status: "pending" | "completed" | "failed" | "cancelled"
      wallet_txn_status: "pending" | "completed" | "failed" | "reversed"
      wallet_txn_type:
        | "topup"
        | "payment"
        | "transfer_in"
        | "transfer_out"
        | "withdrawal"
        | "withdrawal_refund"
        | "refund"
        | "credit_grant"
        | "adjustment"
      wallet_withdrawal_status:
        | "pending"
        | "approved"
        | "rejected"
        | "paid"
        | "cancelled"
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
      attribute_type: [
        "text",
        "number",
        "boolean",
        "select",
        "multi_select",
        "date",
        "file",
      ],
      availability_status: ["available", "booked", "blocked"],
      booking_status: ["confirmed", "cancelled", "completed", "no_show"],
      listing_status: [
        "draft",
        "pending_review",
        "published",
        "paused",
        "rejected",
      ],
      mp_booking_status: [
        "pending_payment",
        "confirmed",
        "active",
        "completed",
        "cancelled",
        "refunded",
      ],
      mp_order_status: [
        "awaiting_quote",
        "quoted",
        "pending_payment",
        "paid",
        "accepted",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "completed",
        "cancelled",
        "refunded",
      ],
      mp_payment_status: [
        "pending",
        "authorized",
        "captured",
        "failed",
        "refunded",
      ],
      payment_status: ["pending", "paid", "refunded"],
      plan_type: ["hourly", "daily", "package", "monthly"],
      pricing_period: [
        "hourly",
        "daily",
        "weekly",
        "monthly",
        "per_event",
        "half_day",
        "weekend",
        "per_trip",
        "per_person",
        "per_job",
        "per_meter",
        "session",
        "package",
        "per_service",
        "per_package",
        "per_session",
        "per_visit",
        "per_consultation",
        "per_procedure",
        "per_treatment",
        "per_pulse",
        "per_unit",
        "monthly_contract",
        "yearly_contract",
      ],
      space_type: ["indoor", "outdoor", "meeting_room", "private_office"],
      supplier_kyc_status: ["pending", "approved", "rejected", "suspended"],
      user_role: ["customer", "supplier", "admin"],
      wallet_balance_kind: ["cash", "credit"],
      wallet_status: ["active", "frozen", "closed"],
      wallet_topup_status: ["pending", "completed", "failed", "cancelled"],
      wallet_txn_status: ["pending", "completed", "failed", "reversed"],
      wallet_txn_type: [
        "topup",
        "payment",
        "transfer_in",
        "transfer_out",
        "withdrawal",
        "withdrawal_refund",
        "refund",
        "credit_grant",
        "adjustment",
      ],
      wallet_withdrawal_status: [
        "pending",
        "approved",
        "rejected",
        "paid",
        "cancelled",
      ],
    },
  },
} as const
