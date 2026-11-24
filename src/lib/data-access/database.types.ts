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
          revision: number;
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
          revision?: number;
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
          revision?: number;
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
      learner_lesson_activity: {
        Row: {
          learner_id: string;
          lesson_id: string;
          read_at: string | null;
          started_at: string;
        };
        ComputedFields: never;
        Insert: {
          learner_id: string;
          lesson_id: string;
          read_at?: string | null;
          started_at?: string;
        };
        Update: {
          learner_id?: string;
          lesson_id?: string;
          read_at?: string | null;
          started_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learner_lesson_activity_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learner_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "learner_lesson_activity_lesson_id_fkey";
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
      test_booking_events: {
        Row: {
          actor_id: string;
          created_at: string;
          event_number: number;
          from_status: string | null;
          id: string;
          intent_id: string;
          note: string;
          request_id: string;
          session_id: string | null;
          to_status: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          created_at?: string;
          event_number?: never;
          from_status?: string | null;
          id?: string;
          intent_id: string;
          note?: string;
          request_id: string;
          session_id?: string | null;
          to_status: string;
        };
        Update: {
          actor_id?: string;
          created_at?: string;
          event_number?: never;
          from_status?: string | null;
          id?: string;
          intent_id?: string;
          note?: string;
          request_id?: string;
          session_id?: string | null;
          to_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "test_booking_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_booking_events_intent_id_fkey";
            columns: ["intent_id"];
            isOneToOne: false;
            referencedRelation: "test_booking_intents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_booking_events_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "test_tutor_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_booking_events_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "test_scheduled_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      test_booking_intents: {
        Row: {
          actor_id: string;
          created_at: string;
          id: string;
          operation: string;
          payload: NonNullable<Json>;
          result_id: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          created_at?: string;
          id: string;
          operation: string;
          payload: NonNullable<Json>;
          result_id: string;
        };
        Update: {
          actor_id?: string;
          created_at?: string;
          id?: string;
          operation?: string;
          payload?: NonNullable<Json>;
          result_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "test_booking_intents_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      test_safety_actions: {
        Row: {
          action_note: string;
          actor_id: string;
          created_at: string;
          event_number: number;
          from_status: Database["public"]["Enums"]["test_safety_status"] | null;
          id: string;
          report_id: string;
          to_status: Database["public"]["Enums"]["test_safety_status"];
        };
        ComputedFields: never;
        Insert: {
          action_note: string;
          actor_id: string;
          created_at?: string;
          event_number?: never;
          from_status?:
            Database["public"]["Enums"]["test_safety_status"] | null;
          id?: string;
          report_id: string;
          to_status: Database["public"]["Enums"]["test_safety_status"];
        };
        Update: {
          action_note?: string;
          actor_id?: string;
          created_at?: string;
          event_number?: never;
          from_status?:
            Database["public"]["Enums"]["test_safety_status"] | null;
          id?: string;
          report_id?: string;
          to_status?: Database["public"]["Enums"]["test_safety_status"];
        };
        Relationships: [
          {
            foreignKeyName: "test_safety_actions_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_safety_actions_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "test_safety_reports";
            referencedColumns: ["id"];
          },
        ];
      };
      test_safety_reports: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          reporter_id: string;
          revision: number;
          status: Database["public"]["Enums"]["test_safety_status"];
          submission_id: string;
          summary: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          category: string;
          created_at?: string;
          id?: string;
          reporter_id: string;
          revision?: number;
          status?: Database["public"]["Enums"]["test_safety_status"];
          submission_id: string;
          summary: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          reporter_id?: string;
          revision?: number;
          status?: Database["public"]["Enums"]["test_safety_status"];
          submission_id?: string;
          summary?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "test_safety_reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      test_scheduled_sessions: {
        Row: {
          cancelled_at: string | null;
          completed_at: string | null;
          created_at: string;
          ends_at: string;
          id: string;
          language: Database["public"]["Enums"]["learning_language"];
          learner_id: string;
          request_id: string;
          revision: number;
          started_at: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["test_session_status"];
          subject_id: string;
          summary: string;
          tutor_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          ends_at: string;
          id?: string;
          language: Database["public"]["Enums"]["learning_language"];
          learner_id: string;
          request_id: string;
          revision?: number;
          started_at?: string | null;
          starts_at: string;
          status?: Database["public"]["Enums"]["test_session_status"];
          subject_id: string;
          summary?: string;
          tutor_id: string;
          updated_at?: string;
        };
        Update: {
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          ends_at?: string;
          id?: string;
          language?: Database["public"]["Enums"]["learning_language"];
          learner_id?: string;
          request_id?: string;
          revision?: number;
          started_at?: string | null;
          starts_at?: string;
          status?: Database["public"]["Enums"]["test_session_status"];
          subject_id?: string;
          summary?: string;
          tutor_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "test_scheduled_sessions_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learner_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "test_scheduled_sessions_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: true;
            referencedRelation: "test_tutor_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_scheduled_sessions_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "academic_subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_scheduled_sessions_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutor_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      test_trust_audit: {
        Row: {
          actor_id: string;
          created_at: string;
          id: string;
          operation: string;
          reason: string;
          request_id: string;
          request_payload: NonNullable<Json>;
          result_id: string;
          subject_id: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          created_at?: string;
          id?: string;
          operation: string;
          reason: string;
          request_id: string;
          request_payload: NonNullable<Json>;
          result_id: string;
          subject_id: string;
        };
        Update: {
          actor_id?: string;
          created_at?: string;
          id?: string;
          operation?: string;
          reason?: string;
          request_id?: string;
          request_payload?: NonNullable<Json>;
          result_id?: string;
          subject_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "test_trust_audit_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      test_tutor_requests: {
        Row: {
          created_at: string;
          ends_at: string;
          expires_at: string;
          id: string;
          language: Database["public"]["Enums"]["learning_language"];
          learner_id: string;
          previous_request_id: string | null;
          revision: number;
          search_id: string;
          search_started_at: string;
          session_id: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["test_request_status"];
          subject_id: string;
          topic: string;
          tutor_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          ends_at: string;
          expires_at: string;
          id?: string;
          language: Database["public"]["Enums"]["learning_language"];
          learner_id: string;
          previous_request_id?: string | null;
          revision?: number;
          search_id: string;
          search_started_at: string;
          session_id?: string | null;
          starts_at: string;
          status?: Database["public"]["Enums"]["test_request_status"];
          subject_id: string;
          topic?: string;
          tutor_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          ends_at?: string;
          expires_at?: string;
          id?: string;
          language?: Database["public"]["Enums"]["learning_language"];
          learner_id?: string;
          previous_request_id?: string | null;
          revision?: number;
          search_id?: string;
          search_started_at?: string;
          session_id?: string | null;
          starts_at?: string;
          status?: Database["public"]["Enums"]["test_request_status"];
          subject_id?: string;
          topic?: string;
          tutor_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "test_tutor_requests_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learner_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "test_tutor_requests_previous_request_id_fkey";
            columns: ["previous_request_id"];
            isOneToOne: true;
            referencedRelation: "test_tutor_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_tutor_requests_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: true;
            referencedRelation: "test_scheduled_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_tutor_requests_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "academic_subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_tutor_requests_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutor_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      tutor_availability: {
        Row: {
          created_at: string;
          enabled: boolean;
          ends_at: string;
          id: string;
          revision: number;
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
          revision?: number;
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
          revision?: number;
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
          discovery_preview_enabled: boolean;
          discovery_preview_id: string;
          required_role: Database["public"]["Enums"]["app_role"] | null;
          revision: number;
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
          discovery_preview_enabled?: boolean;
          discovery_preview_id?: string;
          required_role?: never;
          revision?: number;
          teaching_skill_score?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          academic_grade?: number;
          bio?: string;
          completed_sessions?: number;
          created_at?: string;
          discovery_preview_enabled?: boolean;
          discovery_preview_id?: string;
          required_role?: never;
          revision?: number;
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
      tutor_test_evidence: {
        Row: {
          created_at: string;
          event_number: number;
          id: string;
          label: string;
          note: string;
          prepared_by: string;
          tutor_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          event_number?: never;
          id?: string;
          label?: string;
          note: string;
          prepared_by: string;
          tutor_id: string;
        };
        Update: {
          created_at?: string;
          event_number?: never;
          id?: string;
          label?: string;
          note?: string;
          prepared_by?: string;
          tutor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tutor_test_evidence_prepared_by_fkey";
            columns: ["prepared_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_test_evidence_tutor_id_fkey";
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
      delete_tutor_availability: {
        Args: { p_id: string; p_revision: number };
        Returns: boolean;
      };
      discover_test_tutors: {
        Args: {
          p_ends_at?: string;
          p_language: Database["public"]["Enums"]["learning_language"];
          p_preference_only?: boolean;
          p_query?: string;
          p_starts_at?: string;
          p_subject_id: string;
          p_weekday?: number;
        };
        Returns: Json;
      };
      load_test_bookings: { Args: { p_record_id?: string }; Returns: Json };
      load_test_trust_history: {
        Args: { p_before_event?: number; p_kind: string; p_subject_id: string };
        Returns: Json;
      };
      load_test_trust_workspace: { Args: { p_query?: string }; Returns: Json };
      read_linked_test_learner: {
        Args: { p_relationship_id: string };
        Returns: Json;
      };
      record_learner_reading: {
        Args: { p_lesson_id: string; p_mark_read?: boolean };
        Returns: {
          learner_id: string;
          lesson_id: string;
          read_at: string | null;
          started_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "learner_lesson_activity";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      record_test_consent: {
        Args: {
          p_expected_event: number;
          p_grant: boolean;
          p_reason: string;
          p_relationship_id: string;
          p_request_id: string;
        };
        Returns: string;
      };
      request_test_tutor: {
        Args: {
          p_duration_minutes?: number;
          p_intent_id: string;
          p_language?: Database["public"]["Enums"]["learning_language"];
          p_preview_id?: string;
          p_previous_request_id?: string;
          p_starts_at?: string;
          p_subject_id?: string;
          p_topic?: string;
        };
        Returns: string;
      };
      respond_test_request: {
        Args: {
          p_action: string;
          p_intent_id: string;
          p_request_id: string;
          p_revision: number;
        };
        Returns: string;
      };
      review_test_relationship: {
        Args: {
          p_guardian_id: string;
          p_learner_id: string;
          p_reason: string;
          p_request_id: string;
          p_revision: number;
          p_status: Database["public"]["Enums"]["review_status"];
        };
        Returns: string;
      };
      review_test_safety_report: {
        Args: {
          p_note: string;
          p_report_id: string;
          p_request_id: string;
          p_revision: number;
          p_status: Database["public"]["Enums"]["test_safety_status"];
        };
        Returns: string;
      };
      review_test_tutor: {
        Args: {
          p_grade: number;
          p_reason: string;
          p_request_id: string;
          p_status: Database["public"]["Enums"]["review_status"];
          p_token: string;
          p_tutor_id: string;
        };
        Returns: string;
      };
      save_tutor_availability: {
        Args: {
          p_enabled: boolean;
          p_ends_at: string;
          p_id: string;
          p_revision: number;
          p_starts_at: string;
          p_weekday: number;
        };
        Returns: {
          created_at: string;
          enabled: boolean;
          ends_at: string;
          id: string;
          revision: number;
          starts_at: string;
          timezone: string;
          tutor_id: string;
          updated_at: string;
          weekday: number;
        };
        SetofOptions: {
          from: "*";
          to: "tutor_availability";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      save_tutor_bio: {
        Args: { p_bio: string; p_revision: number };
        Returns: {
          academic_grade: number;
          bio: string;
          completed_sessions: number;
          created_at: string;
          discovery_preview_enabled: boolean;
          discovery_preview_id: string;
          required_role: Database["public"]["Enums"]["app_role"] | null;
          revision: number;
          teaching_skill_score: number | null;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "tutor_profiles";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_tutor_discovery_preview: {
        Args: { p_enabled: boolean; p_revision: number };
        Returns: {
          academic_grade: number;
          bio: string;
          completed_sessions: number;
          created_at: string;
          discovery_preview_enabled: boolean;
          discovery_preview_id: string;
          required_role: Database["public"]["Enums"]["app_role"] | null;
          revision: number;
          teaching_skill_score: number | null;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "tutor_profiles";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      submit_test_safety_report: {
        Args: {
          p_category: string;
          p_submission_id: string;
          p_summary: string;
        };
        Returns: string;
      };
      switch_learner_enrollment: {
        Args: {
          p_language: Database["public"]["Enums"]["learning_language"];
          p_subject_id: string;
        };
        Returns: {
          created_at: string;
          id: string;
          is_active: boolean;
          language: Database["public"]["Enums"]["learning_language"];
          learner_id: string;
          subject_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "learner_academic_enrollments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      transition_test_session: {
        Args: {
          p_action: string;
          p_intent_id: string;
          p_note: string;
          p_revision: number;
          p_session_id: string;
        };
        Returns: string;
      };
    };
    Enums: {
      app_role: "learner" | "tutor" | "guardian" | "champion" | "admin";
      chapter_kind: "reference" | "supplementary";
      learning_language: "English" | "हिन्दी" | "मराठी" | "తెలుగు";
      review_status: "pending" | "approved" | "rejected" | "revoked";
      subject_name: "Mathematics" | "Science" | "English" | "Social Science";
      test_request_status:
        "pending" | "accepted" | "declined" | "expired" | "cancelled";
      test_safety_status: "submitted" | "under_review" | "resolved" | "closed";
      test_session_status:
        "scheduled" | "active" | "completed" | "cancelled" | "missed";
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
      test_request_status: [
        "pending",
        "accepted",
        "declined",
        "expired",
        "cancelled",
      ],
      test_safety_status: ["submitted", "under_review", "resolved", "closed"],
      test_session_status: [
        "scheduled",
        "active",
        "completed",
        "cancelled",
        "missed",
      ],
    },
  },
} as const;
