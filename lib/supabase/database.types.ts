export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      workflows: {
        Row: {
          id: number;
          created_at: string;
          name: string | null;
          description: string | null;
          trigger: string | null;
          enabled: boolean | null;
          workflow: {
            actions: {
              id: string;
              kind: string;
              name: string;
              description: string;
              position?: { x: number; y: number };
            }[];
            edges: {
              from: string;
              to: string;
            }[];
            triggerPosition?: { x: number; y: number };
          } | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          name?: string | null;
          description?: string | null;
          trigger?: string | null;
          enabled?: boolean | null;
          workflow?: Json | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          name?: string | null;
          description?: string | null;
          trigger?: string | null;
          enabled?: boolean | null;
          workflow?: Json | null;
        };
      };
      blog_posts: {
        Row: {
          id: number;
          created_at: string;
          title: string | null;
          subtitle: string | null;
          markdown: string | null;
          markdown_ai_revision: string | null;
          ai_publishing_recommendations: string | null;
          status: string | null;
          published: boolean;
          published_at: string | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          title?: string | null;
          subtitle?: string | null;
          markdown?: string | null;
          markdown_ai_revision?: string | null;
          ai_publishing_recommendations?: string | null;
          status?: string | null;
          published?: boolean;
          published_at?: string | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          title?: string | null;
          subtitle?: string | null;
          markdown?: string | null;
          markdown_ai_revision?: string | null;
          ai_publishing_recommendations?: string | null;
          status?: string | null;
          published?: boolean;
          published_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
      PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
      PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never;
