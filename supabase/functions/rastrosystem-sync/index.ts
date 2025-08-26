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

      // Upsert device data
      const deviceData = {
        user_id: userId,
        name: vehicle.nome || vehicle.placa,
        imei: vehicle.device_id || vehicle.imei,
        vehicle_plate: vehicle.placa,
        status: vehicle.status === 'online' ? 'online' : 'offline',
        latitude: lastPosition?.latitude,
        longitude: lastPosition?.longitude,
        address: lastPosition?.endereco,
        last_update: lastPosition?.data_gps ? new Date(lastPosition.data_gps) : new Date(),
        battery: lastPosition?.bateria || 100,
        signal: lastPosition?.sinal || 4,
        tracker_model: vehicle.modelo_equipamento,
        updated_at: new Date().toISOString(),
      };

      // Check if device already exists
      const { data: existingDevice } = await supabase
        .from('devices')
        .select('id')
        .eq('user_id', userId)
        .eq('imei', deviceData.imei)
        .single();

      if (existingDevice) {
        // Update existing device
        await supabase
          .from('devices')
          .update(deviceData)
          .eq('id', existingDevice.id);
      } else {
        // Insert new device
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
      error.message
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
        error: error.message,
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