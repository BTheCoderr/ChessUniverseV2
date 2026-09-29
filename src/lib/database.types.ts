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
      beta_feedback: {
        Row: {
          app_view: string | null
          category: string
          created_at: string
          id: number
          message: string
          status: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          app_view?: string | null
          category: string
          created_at?: string
          id?: number
          message: string
          status?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          app_view?: string | null
          category?: string
          created_at?: string
          id?: number
          message?: string
          status?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_moves: {
        Row: {
          created_at: string
          fen_after: string
          from_square: string
          game_id: string
          id: number
          player_id: string | null
          ply: number
          promotion: string | null
          san: string
          to_square: string
        }
        Insert: {
          created_at?: string
          fen_after: string
          from_square: string
          game_id: string
          id?: number
          player_id?: string | null
          ply: number
          promotion?: string | null
          san: string
          to_square: string
        }
        Update: {
          created_at?: string
          fen_after?: string
          from_square?: string
          game_id?: string
          id?: number
          player_id?: string | null
          ply?: number
          promotion?: string | null
          san?: string
          to_square?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_moves_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_moves_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          black_id: string | null
          black_time_ms: number | null
          created_at: string
          current_turn: string
          draw_offer_by: string | null
          ended_at: string | null
          fen: string
          id: string
          increment_seconds: number
          last_move_at: string | null
          pgn: string
          result: Database["public"]["Enums"]["game_result"] | null
          result_reason: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["game_status"]
          time_control_minutes: number
          updated_at: string
          variant: string
          white_id: string | null
          white_time_ms: number | null
        }
        Insert: {
          black_id?: string | null
          black_time_ms?: number | null
          created_at?: string
          current_turn?: string
          draw_offer_by?: string | null
          ended_at?: string | null
          fen?: string
          id?: string
          increment_seconds?: number
          last_move_at?: string | null
          pgn?: string
          result?: Database["public"]["Enums"]["game_result"] | null
          result_reason?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["game_status"]
          time_control_minutes?: number
          updated_at?: string
          variant?: string
          white_id?: string | null
          white_time_ms?: number | null
        }
        Update: {
          black_id?: string | null
          black_time_ms?: number | null
          created_at?: string
          current_turn?: string
          draw_offer_by?: string | null
          ended_at?: string | null
          fen?: string
          id?: string
          increment_seconds?: number
          last_move_at?: string | null
          pgn?: string
          result?: Database["public"]["Enums"]["game_result"] | null
          result_reason?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["game_status"]
          time_control_minutes?: number
          updated_at?: string
          variant?: string
          white_id?: string | null
          white_time_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "games_black_id_fkey"
            columns: ["black_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_draw_offer_by_fkey"
            columns: ["draw_offer_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_white_id_fkey"
            columns: ["white_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_progress: {
        Row: {
          created_at: string
          legends_progress: Json
          preferences: Json
          puzzle_progress: Json
          sync_version: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          legends_progress?: Json
          preferences?: Json
          puzzle_progress?: Json
          sync_version?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          legends_progress?: Json
          preferences?: Json
          puzzle_progress?: Json
          sync_version?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          draws: number
          id: string
          losses: number
          rating: number
          updated_at: string
          username: string
          wins: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          draws?: number
          id: string
          losses?: number
          rating?: number
          updated_at?: string
          username: string
          wins?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          draws?: number
          id?: string
          losses?: number
          rating?: number
          updated_at?: string
          username?: string
          wins?: number
        }
        Relationships: []
      }
      saved_practice_games: {
        Row: {
          completed_at: string
          created_at: string
          difficulty: string
          local_id: string
          mode: string
          moves: Json
          result: string
          time_control_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at: string
          created_at?: string
          difficulty: string
          local_id: string
          mode: string
          moves: Json
          result: string
          time_control_minutes: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          difficulty?: string
          local_id?: string
          mode?: string
          moves?: Json
          result?: string
          time_control_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_practice_games_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      commit_online_move: {
        Args: {
          actor_id: string
          event_time: string
          expected_fen: string
          expected_turn: string
          move_from: string
          move_promotion: string
          move_san: string
          move_to: string
          next_black_time_ms: number
          next_fen: string
          next_pgn: string
          next_result: string
          next_result_reason: string
          next_status: string
          next_turn: string
          next_white_time_ms: number
          target_game_id: string
        }
        Returns: number
      }
      create_waiting_game: {
        Args: { game_minutes?: number; game_variant?: string }
        Returns: string
      }
      create_waiting_game_service: {
        Args: { actor_id: string; game_minutes?: number; game_variant?: string }
        Returns: string
      }
      finish_online_game: {
        Args: {
          actor_id: string
          event_time: string
          expected_fen: string
          next_black_time_ms: number
          next_result: string
          next_result_reason: string
          next_white_time_ms: number
          target_game_id: string
        }
        Returns: undefined
      }
      handle_online_draw_offer: {
        Args: {
          actor_id: string
          draw_action: string
          event_time: string
          expected_fen: string
          target_game_id: string
        }
        Returns: string
      }
      join_waiting_game: { Args: { target_game_id: string }; Returns: string }
      join_waiting_game_service: {
        Args: { actor_id: string; target_game_id: string }
        Returns: string
      }
    }
    Enums: {
      game_result: "white" | "black" | "draw"
      game_status: "waiting" | "active" | "completed" | "cancelled"
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
  public: {
    Enums: {
      game_result: ["white", "black", "draw"],
      game_status: ["waiting", "active", "completed", "cancelled"],
    },
  },
} as const
