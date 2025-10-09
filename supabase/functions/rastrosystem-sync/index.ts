import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const rastrosystemApiKey = Deno.env.get('RASTROSYSTEM_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RastrosystemConfig {
  api_base_url: string;
  username: string;
  password: string;
  sync_interval: number;
}

const logIntegration = async (
  userId: string,
  operation: string,
  requestData: any,
  responseData: any,
  status: string,
  errorMessage?: string
) => {
  await supabase.from('integration_logs').insert({
    user_id: userId,
    service: 'rastrosystem',
    operation,
    request_data: requestData,
    response_data: responseData,
    status,
    error_message: errorMessage,
  });
};

const authenticateRastrosystem = async (config: RastrosystemConfig) => {
  const response = await fetch(`${config.api_base_url}/api_v2/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: config.username,
      password: config.password,
    }),
  });

  if (!response.ok) {
    throw new Error(`Rastrosystem authentication failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.token;
};

const syncDevicesFromRastrosystem = async (userId: string, config: RastrosystemConfig) => {
  console.log(`Syncing devices for user: ${userId}`);

  try {
    // Authenticate with Rastrosystem
    const token = await authenticateRastrosystem(config);

    // Get vehicles from Rastrosystem
    const response = await fetch(`${config.api_base_url}/api_v2/veiculos/${userId}/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch vehicles: ${response.statusText}`);
    }

    const vehicles = await response.json();

    await logIntegration(
      userId,
      'fetch_vehicles',
      { user_id: userId },
      vehicles,
      'success'
    );

    // Sync each vehicle to our devices table
    for (const vehicle of vehicles) {
      // Get latest position for this vehicle
      let lastPosition = null;
      try {
        const positionResponse = await fetch(`${config.api_base_url}/api_v2/veiculo/${vehicle.device_id}/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (positionResponse.ok) {
          lastPosition = await positionResponse.json();
        }
      } catch (error) {
        console.log(`Error fetching position for vehicle ${vehicle.device_id}:`, error);
      }

      // Upsert vehicle no Supabase a partir da placa
      const vehiclePayload: any = {
        user_id: userId,
        plate: vehicle.placa,
        brand: 'Rastrosystem',
        model: vehicle.name || vehicle.nome || vehicle.modelo || 'Veículo',
        color: 'preto',
        category: 'moto',
        year: new Date().getFullYear(),
        odometer: Number(vehicle.odometer) ? Math.round(Number(vehicle.odometer)) : 0,
        chip_number: vehicle.chip ?? null,
        tracker_model: vehicle.modelo || vehicle.modelo_equipamento || null,
        tracker_id: String(vehicle.imei || vehicle.unique_id || vehicle.device_id || ''),
        status: (vehicle.status_veiculo === 1 ? 'disponivel' : 'indisponivel'),
        rastrosystem_id: String(vehicle.veiculo_id ?? vehicle.id ?? ''),
        vehicle_id: String(vehicle.veiculo_id ?? vehicle.id ?? ''),
        updated_at: new Date().toISOString(),
      };

      let vehicleId: string | null = null;
      const { data: existingVehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('user_id', userId)
        .eq('plate', vehicle.placa)
        .maybeSingle();

      if (existingVehicle?.id) {
        const { data: updated } = await supabase
          .from('vehicles')
          .update(vehiclePayload)
          .eq('id', existingVehicle.id)
          .select('id')
          .maybeSingle();
        vehicleId = updated?.id ?? existingVehicle.id;
      } else {
        const { data: inserted } = await supabase
          .from('vehicles')
          .insert(vehiclePayload)
          .select('id')
          .maybeSingle();
        vehicleId = inserted?.id ?? null;
      }

      // Mapear sinal GSM (0-100) para barras (0-4)
      const gsm = (vehicle.attributes?.gsm ?? null) as number | null;
      const signalBars = gsm != null
        ? Math.max(0, Math.min(4, Math.round((Number(gsm) / 100) * 4)))
        : 0;

      // Tentar parsear datas no formato dd/MM/yyyy HH:mm:ss
      const parseBrDate = (s?: string) => {
        try {
          if (!s) return new Date();
          const [datePart, timePart = '00:00:00'] = String(s).split(' ');
          const [dd, mm, yyyy] = datePart.split('/').map(Number);
          const [HH, II, SS] = timePart.split(':').map(Number);
          return new Date(yyyy, (mm || 1) - 1, dd || 1, HH || 0, II || 0, SS || 0);
        } catch (_) {
          return new Date();
        }
      };

      // Upsert device data
      const deviceData: any = {
        user_id: userId,
        name: vehicle.name || vehicle.nome || vehicle.placa,
        imei: String(vehicle.imei || vehicle.unique_id || vehicle.device_id || ''),
        vehicle_plate: vehicle.placa,
        status: (vehicle.status === true || vehicle.status_veiculo === 1) ? 'online' : 'offline',
        latitude: vehicle.latitude ?? lastPosition?.latitude ?? null,
        longitude: vehicle.longitude ?? lastPosition?.longitude ?? null,
        address: vehicle.address ?? lastPosition?.endereco ?? null,
        last_update: vehicle.server_time ? parseBrDate(vehicle.server_time) : (vehicle.time ? parseBrDate(vehicle.time) : new Date()),
        battery: (vehicle.attributes?.battery ?? lastPosition?.bateria ?? 100) as number,
        signal: signalBars,
        tracker_model: vehicle.modelo || vehicle.modelo_equipamento || vehicle.protocolo || null,
        updated_at: new Date().toISOString(),
        vehicle_id: vehicleId,
      };

      // Verificar se já existe pelo IMEI
      const { data: existingDevice } = await supabase
        .from('devices')
        .select('id')
        .eq('user_id', userId)
        .eq('imei', deviceData.imei)
        .maybeSingle();

      if (existingDevice) {
        await supabase
          .from('devices')
          .update(deviceData)
          .eq('id', existingDevice.id);
      } else {
        await supabase
          .from('devices')
          .insert(deviceData);
      }

      console.log(`Synced device: ${deviceData.name} (${deviceData.imei})`);
    }

    return { success: true, count: vehicles.length };

  } catch (error) {
    console.error(`Error syncing devices for user ${userId}:`, error);
    
    await logIntegration(
      userId,
      'sync_devices',
      { user_id: userId },
      null,
      'error',
      error instanceof Error ? error.message : String(error)
    );

    throw error;
  }
};

const sendCommandToDevice = async (deviceId: string, command: string, config: RastrosystemConfig) => {
  const token = await authenticateRastrosystem(config);

  const response = await fetch(`${config.api_base_url}/api_v2/comando/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, user_id, device_id, command } = await req.json();

    // Get user's Rastrosystem config
    const { data: configData } = await supabase
      .from('tenant_config')
      .select('*')
      .eq('user_id', user_id)
      .eq('config_key', 'rastrosystem_settings')
      .single();

    const config: RastrosystemConfig = configData?.config_value || {
      api_base_url: 'https://teste.rastrosystem.com.br',
      username: '',
      password: '',
      sync_interval: 60,
    };

    if (!config.username || !config.password) {
      throw new Error('Rastrosystem credentials not configured');
    }

    let result;

    switch (action) {
      case 'sync_devices':
        result = await syncDevicesFromRastrosystem(user_id, config);
        break;

      case 'send_command':
        if (!device_id || !command) {
          throw new Error('device_id and command are required for send_command action');
        }
        result = await sendCommandToDevice(device_id, command, config);
        
        await logIntegration(
          user_id,
          'send_command',
          { device_id, command },
          result,
          'success'
        );
        break;

      case 'test_connection':
        const token = await authenticateRastrosystem(config);
        result = { success: true, message: 'Connection test successful', token: !!token };
        
        await logIntegration(
          user_id,
          'test_connection',
          config,
          result,
          'success'
        );
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Error in rastrosystem-sync:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);