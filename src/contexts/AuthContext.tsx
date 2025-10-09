import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  rastrosystemSyncing: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rastrosystemSyncing, setRastrosystemSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          throw error;
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          console.log("Initial session loaded:", session ? "authenticated" : "not authenticated");
          // Trigger sync on initial load as well (guarded by per-user key)
          if (session?.user) {
            performRastrosystemSync(session.user);
          }
        }
      } catch (error) {
        console.error("Failed to get initial session:", error);
        if (mounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session ? "authenticated" : "not authenticated");

      if (!mounted) return;

      if (event === "TOKEN_REFRESHED") {
        console.log("Token refreshed successfully");
      } else if (event === "SIGNED_OUT") {
        console.log("User signed out");
      } else if (event === "SIGNED_IN") {
        console.log("User signed in");
      }

      setSession(session);
      setUser(session?.user ?? null);

      // Trigger Rastrosystem sync when user signs in
      if (event === "SIGNED_IN" && session?.user) {
        performRastrosystemSync(session.user);
      }

      if (!loading) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Rastrosystem sync function
  const performRastrosystemSync = async (currentUser: User) => {
    // Use per-user sync key to avoid conflicts between different users
    const lastSyncKey = `rastrosystem_last_sync_${currentUser.id}`;
    const lastSync = sessionStorage.getItem(lastSyncKey);
    if (lastSync) {
      console.log("Sincronização Rastrosystem já realizada nesta sessão para este usuário");
      return;
    }

    setRastrosystemSyncing(true);

    try {
      console.log("Iniciando sincronização com Rastrosystem...");

      // Step 1: Authenticate
      const authResponse = await fetch("https://locaki.rastrosystem.com.br/api_v2/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: "54858795000100",
          senha: "123456",
          app: 9,
        }),
      });

      if (!authResponse.ok) throw new Error("Falha na autenticação Rastrosystem");

      const authData = await authResponse.json();
      sessionStorage.setItem("rastrosystem_token", authData.token);
      sessionStorage.setItem("rastrosystem_cliente_id", authData.cliente_id);

      // Step 2: Sync vehicles
      const vehiclesResponse = await fetch(
        `https://locaki.rastrosystem.com.br/api_v2/veiculos/${authData.cliente_id}/`,
        {
          headers: {
            Authorization: `token ${authData.token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (vehiclesResponse.ok) {
        const vehiclesData = await vehiclesResponse.json();
        const vehicles = vehiclesData.dispositivos || [];

        console.log("vehiclesData:", vehiclesData);
        console.log(`Sincronizando ${vehicles.length} veículos do Rastrosystem...`);

        for (const vehicle of vehicles) {
          if (!vehicle.placa || !vehicle.id) continue;

          // Usa upsert para inserir ou atualizar veículos baseado no rastrosystem_id único
          const { error: vehicleError } = await supabase
            .from("vehicles")
            .upsert({
              user_id: currentUser.id,
              rastrosystem_id: vehicle.id.toString(),
              vehicle_id: vehicle.veiculo_id,
              plate: vehicle.placa,
              brand: "",
              model: vehicle.modelo || vehicle.name || "Não informado",
              imei: vehicle.imei,
              color: "Não informado",
              year: new Date().getFullYear(),
              category: "moto",
              status: "disponivel",
              chip_number: vehicle.chip,
              odometer: parseInt(vehicle.odometer) || 0,
              observations: `Importado do Rastrosystem - IMEI: ${vehicle.imei}`,
            }, {
              onConflict: 'rastrosystem_id',
              ignoreDuplicates: false
            });

          if (vehicleError) {
            console.error("Erro ao sincronizar veículo:", vehicleError);
          } else {
            console.log("Veículo sincronizado:", vehicle.placa);
          }

          // Também sincronizar o device correspondente
          const { error: deviceError } = await supabase
            .from("devices")
            .upsert({
              user_id: currentUser.id,
              rastrosystem_id: vehicle.id.toString(),
              name: vehicle.name || `${vehicle.modelo} - ${vehicle.placa}`,
              vehicle_plate: vehicle.placa,
              chip_number: vehicle.chip,
              tracker_model: vehicle.modelo || "Rastrosystem",
              status: "online",
              battery: 100,
              signal: 4,
              latitude: null,
              longitude: null,
              address: null,
              last_update: new Date().toISOString(),
            }, {
              onConflict: 'rastrosystem_id',
              ignoreDuplicates: false
            });

          if (deviceError) {
            console.error("Erro ao sincronizar device:", deviceError);
          } else {
            console.log("Device sincronizado:", vehicle.placa);
          }
        }
      }

      // Step 3: Sync customers
      const customersResponse = await fetch("https://locaki.rastrosystem.com.br/api_v2/list-pessoas", {
        headers: {
          Authorization: `token ${authData.token}`,
          "Content-Type": "application/json",
        },
      });

      if (customersResponse.ok) {
        const customers = await customersResponse.json();
        console.log(`Sincronizando ${customers.length} clientes do Rastrosystem...`);

        for (const customer of customers) {
          const cpfCnpj = customer.cpf || customer.cnpj || "";
          if (!cpfCnpj) continue;

          // Usa upsert para inserir ou atualizar baseado no cpf_cnpj e user_id
          const { error } = await supabase
            .from("customers")
            .upsert({
              user_id: currentUser.id,
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
            }, {
              onConflict: 'cpf_cnpj,user_id',
              ignoreDuplicates: false
            });

          if (error) {
            console.error("Erro ao sincronizar cliente:", error);
          } else {
            console.log("Cliente sincronizado:", customer.nome);
          }
        }
      }

      sessionStorage.setItem(`rastrosystem_last_sync_${currentUser.id}`, new Date().toISOString());
      console.log("✅ Sincronização Rastrosystem concluída com sucesso");
      console.log("📊 Verifique as páginas de Veículos e Clientes para ver os dados importados");
    } catch (error) {
      console.error("❌ Erro na sincronização Rastrosystem:", error);
    } finally {
      setRastrosystemSyncing(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      console.error("Sign in error:", error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { error };
    } catch (error) {
      console.error("Sign up error:", error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    rastrosystemSyncing,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
