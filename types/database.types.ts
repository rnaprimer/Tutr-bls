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
      boards: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      classes: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      students: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      tutor_applications: {
        Row: {
          availability: string | null
          boards: Json | null
          classes: Json | null
          created_at: string
          documents: Json | null
          email: string
          experience: string | null
          fee: string | null
          full_name: string
          google_response_id: string | null
          id: string
          location: string | null
          phone: string | null
          qualification: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          subjects: Json | null
          submitted_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          availability?: string | null
          boards?: Json | null
          classes?: Json | null
          created_at?: string
          documents?: Json | null
          email: string
          experience?: string | null
          fee?: string | null
          full_name: string
          google_response_id?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          qualification?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          subjects?: Json | null
          submitted_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          availability?: string | null
          boards?: Json | null
          classes?: Json | null
          created_at?: string
          documents?: Json | null
          email?: string
          experience?: string | null
          fee?: string | null
          full_name?: string
          google_response_id?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          qualification?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          subjects?: Json | null
          submitted_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutor_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_boards: {
        Row: {
          board_id: string
          tutor_id: string
        }
        Insert: {
          board_id: string
          tutor_id: string
        }
        Update: {
          board_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_boards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_boards_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "public_tutor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_boards_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_classes: {
        Row: {
          class_id: string
          tutor_id: string
        }
        Insert: {
          class_id: string
          tutor_id: string
        }
        Update: {
          class_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_classes_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "public_tutor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_classes_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_profiles: {
        Row: {
          application_id: string | null
          availability: string | null
          bio: string | null
          created_at: string
          display_name: string
          experience: string | null
          fee: string | null
          id: string
          is_verified: boolean
          locality: string | null
          photo_url: string | null
          qualification: string | null
          teaching_areas: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          availability?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          experience?: string | null
          fee?: string | null
          id?: string
          is_verified?: boolean
          locality?: string | null
          photo_url?: string | null
          qualification?: string | null
          teaching_areas?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          availability?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          experience?: string | null
          fee?: string | null
          id?: string
          is_verified?: boolean
          locality?: string | null
          photo_url?: string | null
          qualification?: string | null
          teaching_areas?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_profiles_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "tutor_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_subjects: {
        Row: {
          subject_id: string
          tutor_id: string
        }
        Insert: {
          subject_id: string
          tutor_id: string
        }
        Update: {
          subject_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_subjects_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "public_tutor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_subjects_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_tutor_profiles: {
        Row: {
          availability: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          experience: string | null
          fee: string | null
          id: string | null
          is_verified: boolean | null
          locality: string | null
          photo_url: string | null
          qualification: string | null
          teaching_areas: string | null
        }
        Insert: {
          availability?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          experience?: string | null
          fee?: string | null
          id?: string | null
          is_verified?: boolean | null
          locality?: string | null
          photo_url?: string | null
          qualification?: string | null
          teaching_areas?: string | null
        }
        Update: {
          availability?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          experience?: string | null
          fee?: string | null
          id?: string | null
          is_verified?: boolean | null
          locality?: string | null
          photo_url?: string | null
          qualification?: string | null
          teaching_areas?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_tutor_application: {
        Args: { p_application_id: string }
        Returns: Json
      }
      ingest_google_form_application: {
        Args: {
          p_availability?: string
          p_boards?: Json
          p_classes?: Json
          p_documents?: Json
          p_email: string
          p_experience?: string
          p_fee?: string
          p_full_name: string
          p_google_response_id: string
          p_location?: string
          p_phone?: string
          p_qualification?: string
          p_subjects?: Json
        }
        Returns: Json
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_current_user_admin: { Args: never; Returns: boolean }
      reject_tutor_application: {
        Args: { p_application_id: string; p_rejection_reason: string }
        Returns: Json
      }
      start_tutor_application_review: {
        Args: { p_application_id: string }
        Returns: Json
      }
    }
    Enums: {
      application_status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED"
      user_role: "USER" | "STUDENT" | "TUTOR" | "ADMIN"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      application_status: ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"],
      user_role: ["USER", "STUDENT", "TUTOR", "ADMIN"],
    },
  },
} as const
