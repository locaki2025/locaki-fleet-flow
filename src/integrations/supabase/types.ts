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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      boletos: {
        Row: {
          cliente_cpf: string | null
          cliente_email: string
          cliente_id: string
          cliente_nome: string
          codigo_barras: string | null
          contrato_id: string | null
          created_at: string
          data_pagamento: string | null
          descricao: string | null
          fatura_id: string
          id: string
          metodo_pagamento: string | null
          qr_code_pix: string | null
          status: string
          updated_at: string
          url_boleto: string | null
          user_id: string
          valor: number
          valor_pago: number | null
          vencimento: string
        }
        Insert: {
          cliente_cpf?: string | null
          cliente_email: string
          cliente_id: string
          cliente_nome: string
          codigo_barras?: string | null
          contrato_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          descricao?: string | null
          fatura_id: string
          id?: string
          metodo_pagamento?: string | null
          qr_code_pix?: string | null
          status?: string
          updated_at?: string
          url_boleto?: string | null
          user_id: string
          valor: number
          valor_pago?: number | null
          vencimento: string
        }
        Update: {
          cliente_cpf?: string | null
          cliente_email?: string
          cliente_id?: string
          cliente_nome?: string
          codigo_barras?: string | null
          contrato_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          descricao?: string | null
          fatura_id?: string
          id?: string
          metodo_pagamento?: string | null
          qr_code_pix?: string | null
          status?: string
          updated_at?: string
          url_boleto?: string | null
          user_id?: string
          valor?: number
          valor_pago?: number | null
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "boletos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          cliente_cpf: string | null
          cliente_email: string
          cliente_id: string
          cliente_nome: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          id: string
          moto_id: string
          moto_modelo: string
          proxima_cobranca: string
          recorrente: boolean | null
          status: string
          ultima_fatura: string | null
          updated_at: string
          user_id: string
          valor_mensal: number
        }
        Insert: {
          cliente_cpf?: string | null
          cliente_email: string
          cliente_id: string
          cliente_nome: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          id?: string
          moto_id: string
          moto_modelo: string
          proxima_cobranca?: string
          recorrente?: boolean | null
          status?: string
          ultima_fatura?: string | null
          updated_at?: string
          user_id: string
          valor_mensal?: number
        }
        Update: {
          cliente_cpf?: string | null
          cliente_email?: string
          cliente_id?: string
          cliente_nome?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          id?: string
          moto_id?: string
          moto_modelo?: string
          proxima_cobranca?: string
          recorrente?: boolean | null
          status?: string
          ultima_fatura?: string | null
          updated_at?: string
          user_id?: string
          valor_mensal?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          city: string
          cpf_cnpj: string
          created_at: string
          email: string
          id: string
          name: string
          number: string
          observations: string | null
          phone: string
          state: string
          status: string
          street: string
          type: string
          updated_at: string
          user_id: string
          zip_code: string
        }
        Insert: {
          city: string
          cpf_cnpj: string
          created_at?: string
          email: string
          id?: string
          name: string
          number: string
          observations?: string | null
          phone: string
          state: string
          status?: string
          street: string
          type: string
          updated_at?: string
          user_id: string
          zip_code: string
        }
        Update: {
          city?: string
          cpf_cnpj?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          number?: string
          observations?: string | null
          phone?: string
          state?: string
          status?: string
          street?: string
          type?: string
          updated_at?: string
          user_id?: string
          zip_code?: string
        }
        Relationships: []
      }
      financial_entries: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          due_date: string | null
          generate_invoice: boolean | null
          id: string
          is_received: boolean | null
          location: string | null
          plate: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          generate_invoice?: boolean | null
          id?: string
          is_received?: boolean | null
          location?: string | null
          plate: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          generate_invoice?: boolean | null
          id?: string
          is_received?: boolean | null
          location?: string | null
          plate?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_expenses: {
        Row: {
          amount: number
          attach_files: boolean | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_paid: boolean | null
          location: string | null
          plate: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          attach_files?: boolean | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_paid?: boolean | null
          location?: string | null
          plate: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          attach_files?: boolean | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_paid?: boolean | null
          location?: string | null
          plate?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          amount: number | null
          event_type: string
          id: string
          invoice_id: string
          payload: Json | null
          processed_at: string
          status: string | null
        }
        Insert: {
          amount?: number | null
          event_type: string
          id?: string
          invoice_id: string
          payload?: Json | null
          processed_at?: string
          status?: string | null
        }
        Update: {
          amount?: number | null
          event_type?: string
          id?: string
          invoice_id?: string
          payload?: Json | null
          processed_at?: string
          status?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
