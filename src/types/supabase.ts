// Generado desde Supabase local. Ejecuta npm run supabase:types para actualizar.
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
      matches: {
        Row: {
          capacity: number;
          created_at: string;
          id: string;
          location: string;
          organizer_id: string;
          price_per_player: number | null;
          revision: number;
          slug: string;
          starts_at: string;
          status: string;
          title: string;
        };
        Insert: {
          capacity: number;
          created_at?: string;
          id?: string;
          location: string;
          organizer_id: string;
          price_per_player?: number | null;
          revision?: number;
          slug: string;
          starts_at: string;
          status?: string;
          title: string;
        };
        Update: {
          capacity?: number;
          created_at?: string;
          id?: string;
          location?: string;
          organizer_id?: string;
          price_per_player?: number | null;
          revision?: number;
          slug?: string;
          starts_at?: string;
          status?: string;
          title?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          organizer_id: string;
          preferred_position: string | null;
          skill: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          organizer_id: string;
          preferred_position?: string | null;
          skill?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          organizer_id?: string;
          preferred_position?: string | null;
          skill?: number;
        };
        Relationships: [];
      };
      registrations: {
        Row: {
          created_at: string;
          id: string;
          match_id: string;
          paid: boolean;
          player_name: string;
          position: string;
          status: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          match_id: string;
          paid?: boolean;
          player_name: string;
          position: string;
          status?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          match_id?: string;
          paid?: boolean;
          player_name?: string;
          position?: string;
          status?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "registrations_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      team_assignments: {
        Row: {
          match_id: string;
          pitch_x: number;
          pitch_y: number;
          registration_id: string;
          team_id: string;
        };
        Insert: {
          match_id: string;
          pitch_x?: number;
          pitch_y?: number;
          registration_id: string;
          team_id: string;
        };
        Update: {
          match_id?: string;
          pitch_x?: number;
          pitch_y?: number;
          registration_id?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_registration_match_fk";
            columns: ["registration_id", "match_id"];
            isOneToOne: false;
            referencedRelation: "registrations";
            referencedColumns: ["id", "match_id"];
          },
          {
            foreignKeyName: "assignments_team_match_fk";
            columns: ["team_id", "match_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id", "match_id"];
          },
          {
            foreignKeyName: "team_assignments_registration_id_fkey";
            columns: ["registration_id"];
            isOneToOne: true;
            referencedRelation: "registrations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_assignments_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          color: string;
          id: string;
          idx: number;
          match_id: string;
          name: string;
        };
        Insert: {
          color?: string;
          id?: string;
          idx: number;
          match_id: string;
          name: string;
        };
        Update: {
          color?: string;
          id?: string;
          idx?: number;
          match_id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teams_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_match_player: {
        Args: { p_match_id: string; p_name: string; p_position: string };
        Returns: Json;
      };
      cancel_registration: {
        Args: { p_registration_id: string };
        Returns: Json;
      };
      commit_match_teams: {
        Args: {
          p_assignments: Json;
          p_expected_revision: number;
          p_match_id: string;
          p_publish: boolean;
          p_teams: Json;
        };
        Returns: undefined;
      };
      create_match: {
        Args: {
          p_capacity: number;
          p_location: string;
          p_price_per_player?: number;
          p_starts_at: string;
          p_title: string;
        };
        Returns: Json;
      };
      finish_match: { Args: { p_match_id: string }; Returns: undefined };
      get_admin_match: { Args: { p_match_id: string }; Returns: Json };
      get_my_registration: { Args: { p_slug: string }; Returns: Json };
      get_public_match: { Args: { p_slug: string }; Returns: Json };
      is_app_administrator: { Args: never; Returns: boolean };
      join_match: {
        Args: { p_name: string; p_position: string; p_slug: string };
        Returns: Json;
      };
      list_organizer_matches: {
        Args: never;
        Returns: {
          capacity: number;
          created_at: string;
          id: string;
          location: string;
          organizer_id: string;
          price_per_player: number | null;
          revision: number;
          slug: string;
          starts_at: string;
          status: string;
          title: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "matches";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      reduce_capacity: {
        Args: { p_match_id: string; p_new_capacity: number };
        Returns: Json;
      };
      save_match_teams: {
        Args: {
          p_assignments: Json;
          p_match_id: string;
          p_publish?: boolean;
          p_teams: Json;
        };
        Returns: undefined;
      };
      set_match_capacity: {
        Args: { p_capacity: number; p_match_id: string };
        Returns: Json;
      };
      set_registration_paid: {
        Args: { p_paid: boolean; p_registration_id: string };
        Returns: undefined;
      };
      update_match_details: {
        Args: {
          p_location: string;
          p_match_id: string;
          p_price_per_player?: number;
          p_starts_at: string;
          p_title: string;
        };
        Returns: undefined;
      };
      update_match_event: {
        Args: {
          p_capacity: number;
          p_expected_revision: number;
          p_location: string;
          p_match_id: string;
          p_price_per_player?: number;
          p_starts_at: string;
          p_title: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
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
    Enums: {},
  },
} as const;
