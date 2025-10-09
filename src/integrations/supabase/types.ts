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
          contrato_origem_id: string | null
          created_at: string
          data_pagamento: string | null
          data_proxima_tentativa: string | null
          descricao: string | null
          fatura_id: string
          id: string
          metodo_pagamento: string | null
          observacoes: string | null
          placa: string | null
          qr_code_pix: string | null
          status: string
          tentativas_cobranca: number | null
          tipo_cobranca: string | null
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
          contrato_origem_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_proxima_tentativa?: string | null
          descricao?: string | null
          fatura_id: string
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          placa?: string | null
          qr_code_pix?: string | null
          status?: string
          tentativas_cobranca?: number | null
          tipo_cobranca?: string | null
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
          contrato_origem_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_proxima_tentativa?: string | null
          descricao?: string | null
          fatura_id?: string
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          placa?: string | null
          qr_code_pix?: string | null
          status?: string
          tentativas_cobranca?: number | null
          tipo_cobranca?: string | null
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
          cadeado_inclusos: boolean | null
          capa_banco_inclusos: boolean | null
          capacete_inclusos: boolean | null
          caucionamento: number | null
          cliente_cpf: string | null
          cliente_email: string
          cliente_id: string
          cliente_nome: string
          combustivel_devolucao: string | null
          combustivel_entrega: string | null
          created_at: string
          data_fim: string | null
          data_fim_completa: string | null
          data_inicio: string
          data_inicio_completa: string | null
          descricao: string | null
          diaria: number | null
          id: string
          km_permitidos_dia: number | null
          local_devolucao: string | null
          local_entrega: string | null
          moto_id: string
          moto_modelo: string
          multa_km_excedente: number | null
          multimeios_inclusos: boolean | null
          proxima_cobranca: string
          recorrente: boolean | null
          status: string
          ultima_fatura: string | null
          updated_at: string
          user_id: string
          valor_mensal: number
        }
        Insert: {
          cadeado_inclusos?: boolean | null
          capa_banco_inclusos?: boolean | null
          capacete_inclusos?: boolean | null
          caucionamento?: number | null
          cliente_cpf?: string | null
          cliente_email: string
          cliente_id: string
          cliente_nome: string
          combustivel_devolucao?: string | null
          combustivel_entrega?: string | null
          created_at?: string
          data_fim?: string | null
          data_fim_completa?: string | null
          data_inicio?: string
          data_inicio_completa?: string | null
          descricao?: string | null
          diaria?: number | null
          id?: string
          km_permitidos_dia?: number | null
          local_devolucao?: string | null
          local_entrega?: string | null
          moto_id: string
          moto_modelo: string
          multa_km_excedente?: number | null
          multimeios_inclusos?: boolean | null
          proxima_cobranca?: string
          recorrente?: boolean | null
          status?: string
          ultima_fatura?: string | null
          updated_at?: string
          user_id: string
          valor_mensal?: number
        }
        Update: {
          cadeado_inclusos?: boolean | null
          capa_banco_inclusos?: boolean | null
          capacete_inclusos?: boolean | null
          caucionamento?: number | null
          cliente_cpf?: string | null
          cliente_email?: string
          cliente_id?: string
          cliente_nome?: string
          combustivel_devolucao?: string | null
          combustivel_entrega?: string | null
          created_at?: string
          data_fim?: string | null
          data_fim_completa?: string | null
          data_inicio?: string
          data_inicio_completa?: string | null
          descricao?: string | null
          diaria?: number | null
          id?: string
          km_permitidos_dia?: number | null
          local_devolucao?: string | null
          local_entrega?: string | null
          moto_id?: string
          moto_modelo?: string
          multa_km_excedente?: number | null
          multimeios_inclusos?: boolean | null
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
      cora_sync_logs: {
        Row: {
          created_at: string
          end_date: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          start_date: string
          status: string
          sync_date: string
          transactions_conciliated: number | null
          transactions_imported: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          start_date: string
          status: string
          sync_date?: string
          transactions_conciliated?: number | null
          transactions_imported?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          start_date?: string
          status?: string
          sync_date?: string
          transactions_conciliated?: number | null
          transactions_imported?: number | null
          user_id?: string
        }
        Relationships: []
      }
      cora_transactions: {
        Row: {
          amount: number
          conciliated: boolean | null
          conciliated_boleto_id: string | null
          cora_transaction_id: string
          created_at: string
          currency: string
          description: string | null
          id: string
          raw_data: Json | null
          status: string
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          conciliated?: boolean | null
          conciliated_boleto_id?: string | null
          cora_transaction_id: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          raw_data?: Json | null
          status: string
          transaction_date: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          conciliated?: boolean | null
          conciliated_boleto_id?: string | null
          cora_transaction_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          raw_data?: Json | null
          status?: string
          transaction_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cora_transactions_boleto"
            columns: ["conciliated_boleto_id"]
            isOneToOne: false
            referencedRelation: "boletos"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          city: string
          cnh_attachment_url: string | null
          cnh_category: string | null
          cnh_expiry_date: string | null
          cpf_cnpj: string
          created_at: string
          email: string
          id: string
          name: string
          number: string
          observations: string | null
          phone: string
          rastrosystem_id: string | null
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
          cnh_attachment_url?: string | null
          cnh_category?: string | null
          cnh_expiry_date?: string | null
          cpf_cnpj: string
          created_at?: string
          email: string
          id?: string
          name: string
          number: string
          observations?: string | null
          phone: string
          rastrosystem_id?: string | null
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
          cnh_attachment_url?: string | null
          cnh_category?: string | null
          cnh_expiry_date?: string | null
          cpf_cnpj?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          number?: string
          observations?: string | null
          phone?: string
          rastrosystem_id?: string | null
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
      devices: {
        Row: {
          address: string | null
          battery: number | null
          chip_number: string | null
          created_at: string
          id: string
          imei: string
          last_update: string | null
          latitude: number | null
          longitude: number | null
          name: string
          signal: number | null
          status: string
          tracker_model: string | null
          updated_at: string
          user_id: string
          vehicle_id: string | null
          vehicle_plate: string
        }
        Insert: {
          address?: string | null
          battery?: number | null
          chip_number?: string | null
          created_at?: string
          id?: string
          imei: string
          last_update?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          signal?: number | null
          status?: string
          tracker_model?: string | null
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
          vehicle_plate: string
        }
        Update: {
          address?: string | null
          battery?: number | null
          chip_number?: string | null
          created_at?: string
          id?: string
          imei?: string
          last_update?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          signal?: number | null
          status?: string
          tracker_model?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_types: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
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
      integration_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          operation: string
          request_data: Json | null
          response_data: Json | null
          service: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          operation: string
          request_data?: Json | null
          response_data?: Json | null
          service: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          operation?: string
          request_data?: Json | null
          response_data?: Json | null
          service?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      multas_transito: {
        Row: {
          auto_infracao: string | null
          condutor: string | null
          created_at: string
          data_infracao: string
          data_limite_recurso: string | null
          documentos: Json | null
          em_posse_cliente: boolean | null
          em_recurso: boolean | null
          endereco: string | null
          faturado: boolean | null
          gravidade: string | null
          habilitado_faturar: boolean | null
          id: string
          infracao: string
          justificativa: string | null
          motivo: string
          observacoes: string | null
          orgao_autuador: string | null
          origem: string | null
          placa: string
          pontuacao: number | null
          prazo_indicacao_condutor: string | null
          recebimento_infracao: string | null
          serpro_id: string | null
          situacao: string
          tipo_infracao: string | null
          updated_at: string
          user_id: string
          valor_com_desconto: number | null
          valor_multa: number
          veiculo_id: string | null
        }
        Insert: {
          auto_infracao?: string | null
          condutor?: string | null
          created_at?: string
          data_infracao: string
          data_limite_recurso?: string | null
          documentos?: Json | null
          em_posse_cliente?: boolean | null
          em_recurso?: boolean | null
          endereco?: string | null
          faturado?: boolean | null
          gravidade?: string | null
          habilitado_faturar?: boolean | null
          id?: string
          infracao: string
          justificativa?: string | null
          motivo: string
          observacoes?: string | null
          orgao_autuador?: string | null
          origem?: string | null
          placa: string
          pontuacao?: number | null
          prazo_indicacao_condutor?: string | null
          recebimento_infracao?: string | null
          serpro_id?: string | null
          situacao?: string
          tipo_infracao?: string | null
          updated_at?: string
          user_id: string
          valor_com_desconto?: number | null
          valor_multa: number
          veiculo_id?: string | null
        }
        Update: {
          auto_infracao?: string | null
          condutor?: string | null
          created_at?: string
          data_infracao?: string
          data_limite_recurso?: string | null
          documentos?: Json | null
          em_posse_cliente?: boolean | null
          em_recurso?: boolean | null
          endereco?: string | null
          faturado?: boolean | null
          gravidade?: string | null
          habilitado_faturar?: boolean | null
          id?: string
          infracao?: string
          justificativa?: string | null
          motivo?: string
          observacoes?: string | null
          orgao_autuador?: string | null
          origem?: string | null
          placa?: string
          pontuacao?: number | null
          prazo_indicacao_condutor?: string | null
          recebimento_infracao?: string | null
          serpro_id?: string | null
          situacao?: string
          tipo_infracao?: string | null
          updated_at?: string
          user_id?: string
          valor_com_desconto?: number | null
          valor_multa?: number
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "multas_transito_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicle_positions: {
        Row: {
          created_at: string
          device_id: string
          id: string
          latitude: number
          longitude: number
          odometer: number | null
          speed: number | null
          timestamp: string
          user_id: string
          vehicle_plate: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          latitude: number
          longitude: number
          odometer?: number | null
          speed?: number | null
          timestamp?: string
          user_id: string
          vehicle_plate: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          latitude?: number
          longitude?: number
          odometer?: number | null
          speed?: number | null
          timestamp?: string
          user_id?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_positions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string
          category: string
          chassis: string | null
          chip_number: string | null
          color: string
          created_at: string
          id: string
          model: string
          observations: string | null
          odometer: number | null
          plate: string
          rastrosystem_id: string | null
          renavam: string | null
          status: string
          tracker_id: string | null
          tracker_model: string | null
          updated_at: string
          user_id: string
          vehicle_id: string | null
          year: number
        }
        Insert: {
          brand: string
          category: string
          chassis?: string | null
          chip_number?: string | null
          color: string
          created_at?: string
          id?: string
          model: string
          observations?: string | null
          odometer?: number | null
          plate: string
          rastrosystem_id?: string | null
          renavam?: string | null
          status?: string
          tracker_id?: string | null
          tracker_model?: string | null
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
          year: number
        }
        Update: {
          brand?: string
          category?: string
          chassis?: string | null
          chip_number?: string | null
          color?: string
          created_at?: string
          id?: string
          model?: string
          observations?: string | null
          odometer?: number | null
          plate?: string
          rastrosystem_id?: string | null
          renavam?: string | null
          status?: string
          tracker_id?: string | null
          tracker_model?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
          year?: number
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
      calculate_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      get_device_total_km: {
        Args: { device_uuid: string; end_date: string; start_date: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
