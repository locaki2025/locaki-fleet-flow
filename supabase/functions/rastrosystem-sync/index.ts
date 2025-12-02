import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RastrosystemConfig {
  api_base_url: string;
  login: string;
  senha: string;
  app: number;
  sync_interval: number;
}

const logIntegration = async (
  userId: string,
  operation: string,
  requestData: any,
  responseData: any,
  status: string,
  errorMessage?: string,
) => {
  await supabase.from("integration_logs").insert({
    user_id: userId,
    service: "rastrosystem",
    operation,
    request_data: requestData,
    response_data: responseData,
    status,
    error_message: errorMessage,
  });
};

// Autenticação com formato correto do Rastrosystem
const authenticateRastrosystem = async (config: RastrosystemConfig) => {
  console.log("Autenticando no Rastrosystem...");
  console.log("URL:", `${config.api_base_url}/api_v2/login/`);
  
  const response = await fetch(`${config.api_base_url}/api_v2/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      login: config.login,
      senha: config.senha,
      app: config.app || 9,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Falha na autenticação:", response.status, errorText);
    throw new Error(`Rastrosystem authentication failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log("Login bem sucedido, cliente_id:", data.cliente_id);
  return { token: data.token, cliente_id: data.cliente_id };
};

// Busca posições em tempo real - usado pelo mapa
const fetchPositions = async (config: RastrosystemConfig) => {
  console.log("Buscando posições em tempo real...");
  
  const { token, cliente_id } = await authenticateRastrosystem(config);
  
  const response = await fetch(`${config.api_base_url}/api_v2/veiculos/${cliente_id}/`, {
    method: "GET",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Falha ao buscar veículos:", response.status, errorText);
    throw new Error(`Failed to fetch positions: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const dispositivos = data.dispositivos || data || [];
  
  console.log(`Retornando ${dispositivos.length} veículos com posições`);
  
  return dispositivos.map((d: any) => ({
    id: d.unique_id || String(d.id),
    imei: d.imei || d.unique_id,
    placa: d.placa || d.name || 'Sem placa',
    name: d.name || d.modelo || 'Dispositivo',
    latitude: d.latitude,
    longitude: d.longitude,
    status: d.status,
    speed: d.speed || d.velocidade || 0,
    velocidade: d.velocidade || d.speed || 0,
    server_time: d.server_time || d.time,
    address: d.address,
  }));
};

const syncDevicesFromRastrosystem = async (userId: string, config: RastrosystemConfig) => {
  console.log(`Syncing devices for user: ${userId}`);

  try {
    const { token, cliente_id } = await authenticateRastrosystem(config);

    // Get vehicles from Rastrosystem
    const response = await fetch(`${config.api_base_url}/api_v2/veiculos/${cliente_id}/`, {
      method: "GET",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch vehicles: ${response.statusText}`);
    }

    const data = await response.json();
    const vehicles = data.dispositivos || data || [];

    console.log("📦 Retorno da API Rastrosystem - Veículos:");
    console.log(`Total de veículos retornados: ${vehicles?.length || 0}`);

    await logIntegration(userId, "fetch_vehicles", { user_id: userId }, { count: vehicles.length }, "success");

    // Sync each vehicle to our vehicles and devices tables
    for (const vehicle of vehicles) {
      // Extrair vehicle_id da API Rastrosystem
      const apiVehicleId = String(vehicle.veiculo_id ?? vehicle.id ?? vehicle.unique_id ?? "");

      // Upsert vehicle no Supabase usando rastrosystem_id como identificador único
      const vehiclePayload: any = {
        user_id: userId,
        plate: vehicle.placa,
        brand: vehicle.marca || "Rastrosystem",
        model: vehicle.name || vehicle.nome || vehicle.modelo || "Veículo",
        color: vehicle.cor || "preto",
        category: vehicle.categoria || "moto",
        year: vehicle.ano || new Date().getFullYear(),
        odometer: Number(vehicle.odometer) ? Math.round(Number(vehicle.odometer)) : 0,
        chip_number: vehicle.chip ?? null,
        tracker_model: vehicle.modelo || vehicle.modelo_equipamento || null,
        imei: String(vehicle.imei || vehicle.unique_id || vehicle.device_id || ""),
        status: vehicle.status_veiculo === 1 ? "disponivel" : "indisponivel",
        rastrosystem_id: apiVehicleId,
        vehicle_id: vehicle.veiculo_id,
        updated_at: new Date().toISOString(),
      };

      let vehicleDbId: string | null = null;

      // Buscar veículo existente pela placa
      const { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("plate", vehicle.placa)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingVehicle?.id) {
        const { data: updated } = await supabase
          .from("vehicles")
          .update(vehiclePayload)
          .eq("id", existingVehicle.id)
          .select("id")
          .maybeSingle();
        vehicleDbId = updated?.id ?? existingVehicle.id;
      } else {
        const { data: inserted } = await supabase.from("vehicles").insert(vehiclePayload).select("id").maybeSingle();
        vehicleDbId = inserted?.id ?? null;
      }

      if (!vehicleDbId) {
        console.error(`Failed to upsert vehicle: ${vehicle.placa} (rastrosystem_id: ${apiVehicleId})`);
        continue;
      }

      // Mapear sinal GSM (0-100) para barras (0-4)
      const gsm = (vehicle.attributes?.gsm ?? null) as number | null;
      const signalBars = gsm != null ? Math.max(0, Math.min(4, Math.round((Number(gsm) / 100) * 4))) : 0;

      // Latitude e longitude
      const lat = vehicle.latitude ?? null;
      const lng = vehicle.longitude ?? null;

      // Upsert device
      const deviceData: any = {
        user_id: userId,
        name: vehicle.name || vehicle.nome || vehicle.placa,
        vehicle_plate: vehicle.placa,
        chip_number: vehicle.chip ?? null,
        tracker_model: vehicle.modelo || vehicle.modelo_equipamento || vehicle.protocolo || null,
        status: vehicle.status === true || vehicle.status === 1 ? "online" : "offline",
        latitude: lat,
        longitude: lng,
        address: vehicle.address ?? null,
        last_update: new Date().toISOString(),
        battery: (vehicle.attributes?.battery ?? 100) as number,
        signal: signalBars,
        rastrosystem_id: apiVehicleId,
        updated_at: new Date().toISOString(),
      };

      // Verificar se já existe device pela placa
      const { data: existingDevice } = await supabase
        .from("devices")
        .select("id")
        .eq("vehicle_plate", vehicle.placa)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingDevice) {
        await supabase.from("devices").update(deviceData).eq("id", existingDevice.id);
      } else {
        await supabase.from("devices").insert(deviceData);
      }

      console.log(`Synced vehicle and device: ${vehicle.placa} (lat: ${lat}, lng: ${lng})`);
    }

    return { success: true, count: vehicles.length };
  } catch (error) {
    console.error(`Error syncing devices for user ${userId}:`, error);

    await logIntegration(
      userId,
      "sync_devices",
      { user_id: userId },
      null,
      "error",
      error instanceof Error ? error.message : String(error),
    );

    throw error;
  }
};

const sendCommandToDevice = async (deviceId: string, command: string, config: RastrosystemConfig) => {
  const { token } = await authenticateRastrosystem(config);

  const response = await fetch(`${config.api_base_url}/api_v2/comando/`, {
    method: "POST",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      device_id: deviceId,
      command: command, // 'block' or 'unblock'
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send command: ${response.statusText}`);
  }

  return await response.json();
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, user_id, device_id, command } = await req.json();

    // Get user's Rastrosystem config - first try user's config, then try any config
    let configData = null;
    
    if (user_id) {
      const { data } = await supabase
        .from("tenant_config")
        .select("*")
        .eq("user_id", user_id)
        .eq("config_key", "rastrosystem_settings")
        .maybeSingle();
      configData = data;
    }
    
    // Se não encontrou config do usuário, busca qualquer config disponível
    if (!configData) {
      const { data } = await supabase
        .from("tenant_config")
        .select("*")
        .eq("config_key", "rastrosystem_settings")
        .limit(1)
        .maybeSingle();
      configData = data;
    }

    // Configuração padrão com credenciais hardcoded como fallback
    const defaultConfig: RastrosystemConfig = {
      api_base_url: "https://locaki.rastrosystem.com.br",
      login: "54858795000100",
      senha: "123456",
      app: 9,
      sync_interval: 60,
    };

    const config: RastrosystemConfig = configData?.config_value 
      ? {
          api_base_url: configData.config_value.api_base_url || defaultConfig.api_base_url,
          login: configData.config_value.login || configData.config_value.username || defaultConfig.login,
          senha: configData.config_value.senha || configData.config_value.password || defaultConfig.senha,
          app: configData.config_value.app || defaultConfig.app,
          sync_interval: configData.config_value.sync_interval || defaultConfig.sync_interval,
        }
      : defaultConfig;

    console.log("Usando config:", { 
      api_base_url: config.api_base_url, 
      login: config.login ? "***" : "missing",
      app: config.app 
    });

    let result;

    switch (action) {
      case "get_positions":
        // Nova ação para buscar posições em tempo real (usado pelo mapa)
        result = await fetchPositions(config);
        break;

      case "sync_devices":
        if (!user_id) {
          throw new Error("user_id is required for sync_devices action");
        }
        result = await syncDevicesFromRastrosystem(user_id, config);
        break;

      case "send_command":
        if (!device_id || !command) {
          throw new Error("device_id and command are required for send_command action");
        }
        result = await sendCommandToDevice(device_id, command, config);

        if (user_id) {
          await logIntegration(user_id, "send_command", { device_id, command }, result, "success");
        }
        break;

      case "test_connection":
        const authResult = await authenticateRastrosystem(config);
        result = { success: true, message: "Connection test successful", has_token: !!authResult.token };

        if (user_id) {
          await logIntegration(user_id, "test_connection", { api_base_url: config.api_base_url }, result, "success");
        }
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error in rastrosystem-sync:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  }
};

serve(handler);
