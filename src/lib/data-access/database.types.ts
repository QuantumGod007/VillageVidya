export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      academic_boards: {
        Row: {
          coverage: string;
          created_at: string;
          id: string;
          is_published: boolean;
          name: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          coverage: string;
          created_at?: string;
          id: string;
          is_published?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          coverage?: string;
          created_at?: string;
          id?: string;
          is_published?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      academic_grades: {
        Row: {
          board_id: string;
          created_at: string;
          id: string;
          is_published: boolean;
          number: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          board_id: string;
          created_at?: string;
          id: string;
          is_published?: boolean;
          number: number;
          updated_at?: string;
        };
        Update: {
          board_id?: string;
          created_at?: string;
          id?: string;
          is_published?: boolean;
          number?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "academic_grades_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "academic_boards";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_subjects: {
        Row: {
          created_at: string;
          grade_id: string;
          id: string;
          is_published: boolean;
          name: Database["public"]["Enums"]["subject_name"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          grade_id: string;
          id: string;
          is_published?: boolean;
          name: Database["public"]["Enums"]["subject_name"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          grade_id?: string;
          id?: string;
          is_published?: boolean;
          name?: Database["public"]["Enums"]["subject_name"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "academic_subjects_grade_id_fkey";
            columns: ["grade_id"];
            isOneToOne: false;
            referencedRelation: "academic_grades";
            referencedColumns: ["id"];
          },
        ];
      };
      adult_test_accounts: {
        Row: {
          created_at: string;
          enabled: boolean;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          enabled?: boolean;
          user_id: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "adult_test_accounts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_attempts: {
        Row: {
          assessment_id: string;
          created_at: string;
          id: string;
          learner_id: string;
          lesson_id: string;
          score_percent: number;
          selected_option: number;
        };
        ComputedFields: never;
        Insert: {
          assessment_id: string;
          created_at?: string;
          id?: string;
          learner_id: string;
          lesson_id: string;
          score_percent: number;
          selected_option: number;
        };
        Update: {
          assessment_id?: string;
          created_at?: string;
          id?: string;
          learner_id?: string;
          lesson_id?: string;
          score_percent?: number;
          selected_option?: number;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_assessment_id_lesson_id_fkey";
            columns: ["assessment_id", "lesson_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id", "lesson_id"];
          },
          {
            foreignKeyName: "assessment_attempts_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learner_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      assessments: {
        Row: {
          answer_index: number;
          created_at: string;
          explanation: string;
          id: string;
          is_published: boolean;
          lesson_id: string;
          options: string[];
          question: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          answer_index: number;
          created_at?: string;
          explanation: string;
          id: string;
          is_published?: boolean;
          lesson_id: string;
          options: string[];
          question: string;
          updated_at?: string;
        };
        Update: {
          answer_index?: number;
          created_at?: string;
          explanation?: string;
          id?: string;
          is_published?: boolean;
          lesson_id?: string;
          options?: string[];
          question?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessments_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: true;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      chapters: {
        Row: {
          created_at: string;
          id: string;
          is_published: boolean;
          kind: Database["public"]["Enums"]["chapter_kind"];
          position: number;
          source_id: string | null;
          subject_id: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id: string;
          is_published?: boolean;
          kind: Database["public"]["Enums"]["chapter_kind"];
          position: number;
          source_id?: string | null;
          subject_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_published?: boolean;
          kind?: Database["public"]["Enums"]["chapter_kind"];
          position?: number;
          source_id?: string | null;
          subject_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chapters_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "curriculum_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chapters_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "academic_subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      curriculum_sources: {
        Row: {
          created_at: string;
          edition: string;
          id: string;
          is_published: boolean;
          scope: string;
          title: string;
          updated_at: string;
          url: string;
          verified_on: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          edition: string;
          id: string;
          is_published?: boolean;
          scope?: string;
          title: string;
          updated_at?: string;
          url: string;
          verified_on: string;
        };
        Update: {
          created_at?: string;
          edition?: string;
          id?: string;
          is_published?: boolean;
          scope?: string;
          title?: string;
          updated_at?: string;
          url?: string;
          verified_on?: string;
        };
        Relationships: [];
      };
      guardian_consent_records: {
        Row: {
          created_at: string;
          decision_note: string;
          event_number: number;
          id: string;
          policy_version: string;
          recorded_by: string;
          relationship_id: string;
          status: Database["public"]["Enums"]["review_status"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          decision_note: string;
          event_number?: never;
          id?: string;
          policy_version: string;
          recorded_by: string;
          relationship_id: string;
          status?: Database["public"]["Enums"]["review_status"];
        };
        Update: {
          created_at?: string;
          decision_note?: string;
          event_number?: never;
          id?: string;
          policy_version?: string;
          recorded_by?: string;
          relationship_id?: string;
          status?: Database["public"]["Enums"]["review_status"];
        };
        Relationships: [
          {
            foreignKeyName: "guardian_consent_records_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guardian_consent_records_relationship_id_fkey";
            columns: ["relationship_id"];
            isOneToOne: false;
            referencedRelation: "guardian_relationships";
            referencedColumns: ["id"];
          },
        ];
      };
      guardian_relationships: {
        Row: {
          created_at: string;
          guardian_id: string;
          guardian_role: Database["public"]["Enums"]["app_role"] | null;
          id: string;
          learner_id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["review_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          guardian_id: string;
          guardian_role?: never;
          id?: string;
          learner_id: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          guardian_id?: string;
          guardian_role?: never;
          id?: string;
          learner_id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guardian_relationships_guardian_id_fkey";
            columns: ["guardian_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guardian_relationships_guardian_id_guardian_role_fkey";
            columns: ["guardian_id", "guardian_role"];
            isOneToOne: false;
            referencedRelation: "user_roles";
            referencedColumns: ["user_id", "role"];
          },
          {
            foreignKeyName: "guardian_relationships_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learner_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "guardian_relationships_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      learner_academic_enrollments: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          language: Database["public"]["Enums"]["learning_language"];
          learner_id: string;
          subject_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          language: Database["public"]["Enums"]["learning_language"];
          learner_id: string;
          subject_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          language?: Database["public"]["Enums"]["learning_language"];
          learner_id?: string;
          subject_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learner_academic_enrollments_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learner_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "learner_academic_enrollments_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "academic_subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      learner_bookmarks: {
        Row: {
          created_at: string;
          learner_id: string;
          lesson_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          learner_id: string;
          lesson_id: string;
        };
        Update: {
          created_at?: string;
          learner_id?: string;
          lesson_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learner_bookmarks_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learner_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "learner_bookmarks_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      learner_profiles: {
        Row: {
          created_at: string;
          required_role: Database["public"]["Enums"]["app_role"] | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          required_role?: never;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          required_role?: never;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learner_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learner_profiles_user_id_required_role_fkey";
            columns: ["user_id", "required_role"];
            isOneToOne: false;
            referencedRelation: "user_roles";
            referencedColumns: ["user_id", "role"];
          },
        ];
      };
      lesson_progress: {
        Row: {
          checkpoint_percent: number;
          created_at: string;
          learner_id: string;
          lesson_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          checkpoint_percent?: number;
          created_at?: string;
          learner_id: string;
          lesson_id: string;
          updated_at?: string;
        };
        Update: {
          checkpoint_percent?: number;
          created_at?: string;
          learner_id?: string;
          lesson_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_progress_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learner_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          chapter_id: string;
          concept: string;
          content_origin: string;
          created_at: string;
          example: string;
          id: string;
          is_published: boolean;
          keywords: string[];
          language: Database["public"]["Enums"]["learning_language"];
          minutes: number;
          position: number;
          steps: string[];
          subtitle: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          chapter_id: string;
          concept: string;
          content_origin?: string;
          created_at?: string;
          example: string;
          id: string;
          is_published?: boolean;
          keywords?: string[];
          language: Database["public"]["Enums"]["learning_language"];
          minutes: number;
          position: number;
          steps: string[];
          subtitle: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          chapter_id?: string;
          concept?: string;
          content_origin?: string;
          created_at?: string;
          example?: string;
          id?: string;
          is_published?: boolean;
          keywords?: string[];
          language?: Database["public"]["Enums"]["learning_language"];
          minutes?: number;
          position?: number;
          steps?: string[];
          subtitle?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          preferred_language: Database["public"]["Enums"]["learning_language"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name: string;
          id: string;
          preferred_language?: Database["public"]["Enums"]["learning_language"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          preferred_language?: Database["public"]["Enums"]["learning_language"];
          updated_at?: string;
        };
        Relationships: [];
      };
      tutor_availability: {
        Row: {
          created_at: string;
          enabled: boolean;
          ends_at: string;
          id: string;
          starts_at: string;
          timezone: string;
          tutor_id: string;
          updated_at: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          enabled?: boolean;
          ends_at: string;
          id?: string;
          starts_at: string;
          timezone?: string;
          tutor_id: string;
          updated_at?: string;
          weekday: number;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          ends_at?: string;
          id?: string;
          starts_at?: string;
          timezone?: string;
          tutor_id?: string;
          updated_at?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tutor_availability_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutor_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      tutor_languages: {
        Row: {
          created_at: string;
          language: Database["public"]["Enums"]["learning_language"];
          tutor_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          language: Database["public"]["Enums"]["learning_language"];
          tutor_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          language?: Database["public"]["Enums"]["learning_language"];
          tutor_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tutor_languages_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutor_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      tutor_profiles: {
        Row: {
          academic_grade: number;
          bio: string;
          completed_sessions: number;
          created_at: string;
          required_role: Database["public"]["Enums"]["app_role"] | null;
          teaching_skill_score: number | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          academic_grade: number;
          bio?: string;
          completed_sessions?: number;
          created_at?: string;
          required_role?: never;
          teaching_skill_score?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          academic_grade?: number;
          bio?: string;
          completed_sessions?: number;
          created_at?: string;
          required_role?: never;
          teaching_skill_score?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tutor_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_profiles_user_id_required_role_fkey";
            columns: ["user_id", "required_role"];
            isOneToOne: false;
            referencedRelation: "user_roles";
            referencedColumns: ["user_id", "role"];
          },
        ];
      };
      tutor_subject_qualifications: {
        Row: {
          created_at: string;
          subject_id: string;
          tutor_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          subject_id: string;
          tutor_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          subject_id?: string;
          tutor_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tutor_subject_qualifications_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "academic_subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_subject_qualifications_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutor_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      tutor_verification_records: {
        Row: {
          created_at: string;
          decision_note: string;
          event_number: number;
          id: string;
          reviewed_by: string;
          status: Database["public"]["Enums"]["review_status"];
          tutor_id: string;
          verified_grade: number | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          decision_note: string;
          event_number?: never;
          id?: string;
          reviewed_by: string;
          status?: Database["public"]["Enums"]["review_status"];
          tutor_id: string;
          verified_grade?: number | null;
        };
        Update: {
          created_at?: string;
          decision_note?: string;
          event_number?: never;
          id?: string;
          reviewed_by?: string;
          status?: Database["public"]["Enums"]["review_status"];
          tutor_id?: string;
          verified_grade?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "tutor_verification_records_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_verification_records_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutor_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      user_roles: {
        Row: {
          assigned_by: string | null;
          created_at: string;
          role: Database["public"]["Enums"]["app_role"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          assigned_by?: string | null;
          created_at?: string;
          role: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          assigned_by?: string | null;
          created_at?: string;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      app_role: "learner" | "tutor" | "guardian" | "champion" | "admin";
      chapter_kind: "reference" | "supplementary";
      learning_language: "English" | "हिन्दी" | "मराठी" | "తెలుగు";
      review_status: "pending" | "approved" | "rejected" | "revoked";
      subject_name: "Mathematics" | "Science" | "English" | "Social Science";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["learner", "tutor", "guardian", "champion", "admin"],
      chapter_kind: ["reference", "supplementary"],
      learning_language: ["English", "हिन्दी", "मराठी", "తెలుగు"],
      review_status: ["pending", "approved", "rejected", "revoked"],
      subject_name: ["Mathematics", "Science", "English", "Social Science"],
    },
  },
} as const;
