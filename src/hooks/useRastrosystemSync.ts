import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const RASTROSYSTEM_API_URL = "https://locaki.rastrosystem.com.br/api_v2";
const RASTROSYSTEM_LOGIN = "54858795000100";
const RASTROSYSTEM_PASSWORD = "123456";
const RASTROSYSTEM_APP = 9;

interface RastrosystemToken {
  token: string;
  cliente_id: string;
}

export const useRastrosystemSync = () => {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Authenticate with Rastrosystem
  const authenticateRastrosystem = async (): Promise<RastrosystemToken | null> => {
    try {
      const response = await fetch(`${RASTROSYSTEM_API_URL}/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login: RASTROSYSTEM_LOGIN,
          senha: RASTROSYSTEM_PASSWORD,
          app: RASTROSYSTEM_APP,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha na autenticação com Rastrosystem");
      }

      const data = await response.json();

      // Save token and cliente_id to sessionStorage
      sessionStorage.setItem("rastrosystem_token", data.token);
      sessionStorage.setItem("rastrosystem_cliente_id", data.cliente_id);

      console.log("Autenticação Rastrosystem bem-sucedida");
      return { token: data.token, cliente_id: data.cliente_id };
    } catch (err) {
      console.error("Erro na autenticação Rastrosystem:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      return null;
    }
  };

  // Sync vehicles from Rastrosystem
  const syncVehicles = async (token: string, cliente_id: string) => {
    try {
      const response = await fetch(`${RASTROSYSTEM_API_URL}/veiculos/${cliente_id}/`, {
        method: "GET",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Falha ao buscar veículos do Rastrosystem");
      }

      const vehicles = await response.json();
      console.log("Veículos do Rastrosystem:", vehicles);

      // Sync each vehicle to database
      for (const vehicle of vehicles) {
        // Check if vehicle already exists
        const { data: existing } = await supabase
          .from("vehicles")
          .select("id")
          .eq("user_id", user!.id)
          .eq("plate", vehicle.placa)
          .maybeSingle();

        const vehicleData = {
          user_id: user!.id,
          plate: vehicle.placa || "",
          brand: vehicle.marca || "",
          model: vehicle.modelo || "Não informado",
          color: vehicle.cor || "Não informado",
          year: vehicle.ano || new Date().getFullYear(),
          category: "carro",
          status: "disponivel",
          renavam: vehicle.renavam || null,
          chassis: vehicle.chassi || null,
          observations: `Importado do Rastrosystem - ID: ${vehicle.id}`,
        };

        if (!existing) {
          // Insert new vehicle
          const { error } = await supabase.from("vehicles").insert(vehicleData);

          if (error) {
            console.error("Erro ao inserir veículo:", error);
          } else {
            console.log("Veículo inserido:", vehicle.placa);
          }
        } else {
          console.log("Veículo já existe:", vehicle.placa);
        }
      }

      console.log(`Sincronização de veículos concluída: ${vehicles.length} veículos processados`);
    } catch (err) {
      console.error("Erro ao sincronizar veículos:", err);
      throw err;
    }
  };

  // Sync customers from Rastrosystem
  const syncCustomers = async (token: string) => {
    try {
      const response = await fetch(`${RASTROSYSTEM_API_URL}/list-pessoas`, {
        method: "GET",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Falha ao buscar clientes do Rastrosystem");
      }

      const customers = await response.json();
      console.log("Clientes do Rastrosystem:", customers);

      // Sync each customer to database
      for (const customer of customers) {
        // Check if customer already exists
        const cpfCnpj = customer.cpf || customer.cnpj || "";
        if (!cpfCnpj) continue;

        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", user!.id)
          .eq("cpf_cnpj", cpfCnpj)
          .maybeSingle();

        const customerData = {
          user_id: user!.id,
          name: customer.nome || customer.razao_social || "Não informado",
          type: customer.cpf ? "PF" : "PJ",
          cpf_cnpj: cpfCnpj,
          email: customer.email || "nao-informado@email.com",
          phone: customer.telefone || customer.celular || "(00) 00000-0000",
          street: customer.endereco || "Não informado",
          number: customer.numero || "S/N",
          city: customer.cidade || "Não informado",
          state: customer.estado || "XX",
          zip_code: customer.cep || "00000-000",
          status: "ativo",
          observations: `Importado do Rastrosystem - ID: ${customer.id}`,
        };

        if (!existing) {
          // Insert new customer
          const { error } = await supabase.from("customers").insert(customerData);

          if (error) {
            console.error("Erro ao inserir cliente:", error);
          } else {
            console.log("Cliente inserido:", customer.nome);
          }
        } else {
          console.log("Cliente já existe:", customer.nome);
        }
      }

      console.log(`Sincronização de clientes concluída: ${customers.length} clientes processados`);
    } catch (err) {
      console.error("Erro ao sincronizar clientes:", err);
      throw err;
    }
  };

  // Main sync function
  const performSync = async () => {
    if (!user?.id) {
      console.log("Usuário não autenticado, pulando sincronização Rastrosystem");
      return;
    }

    if (syncing) {
      console.log("Sincronização já em andamento");
      return;
    }

    // Check if sync was already done in this session
    const lastSync = sessionStorage.getItem("rastrosystem_last_sync");
    if (lastSync) {
      console.log("Sincronização Rastrosystem já realizada nesta sessão");
      return;
    }

    setSyncing(true);
    setError(null);

    try {
      console.log("Iniciando sincronização com Rastrosystem...");

      // Step 1: Authenticate
      const auth = await authenticateRastrosystem();
      if (!auth) {
        throw new Error("Falha na autenticação");
      }

      // Step 2: Sync vehicles
      await syncVehicles(auth.token, auth.cliente_id);

      // Step 3: Sync customers
      await syncCustomers(auth.token);

      // Mark sync as complete for this session
      sessionStorage.setItem("rastrosystem_last_sync", new Date().toISOString());

      console.log("Sincronização Rastrosystem concluída com sucesso");
    } catch (err) {
      console.error("Erro na sincronização Rastrosystem:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSyncing(false);
    }
  };

  // Auto-sync on user login
  useEffect(() => {
    if (user?.id) {
      performSync();
    }
  }, [user?.id]);

  return {
    syncing,
    error,
    performSync,
  };
};
