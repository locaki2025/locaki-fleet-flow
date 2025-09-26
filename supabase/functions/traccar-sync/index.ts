import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TraccarConfig {
  api_url: string;
  username: string;
  password: string;
  sync_interval: number;
}

// Log integration events
async function logIntegration(
  supabase: any,
  user_id: string,
  service: string,
  operation: string,
  status: 'success' | 'error',
  request_data?: any,
  response_data?: any,
  error_message?: string
) {
  try {
    await supabase.from('integration_logs').insert({
      user_id,
      service,
      operation,
      status,
      request_data,
      response_data,
      error_message
    });
  } catch (error) {
    console.error('Error logging integration:', error);
  }
}

// Authenticate with Traccar API
async function authenticateTraccar(config: TraccarConfig): Promise<string> {
  const auth = btoa(`${config.username}:${config.password}`);
  
  const response = await fetch(`${config.api_url}/api/session`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: config.username,
      password: config.password
    })
  });

  if (!response.ok) {
    throw new Error(`Traccar authentication failed: ${response.statusText}`);
  }

  const cookies = response.headers.get('set-cookie');
  return cookies || '';
}

// Sync devices from Traccar
async function syncDevicesFromTraccar(supabase: any, user_id: string, config: TraccarConfig) {
  const auth = btoa(`${config.username}:${config.password}`);
  
  try {
    console.log('Fetching devices from Traccar...');
    
    // Fetch devices
    const devicesResponse = await fetch(`${config.api_url}/api/devices`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      }
    });

    if (!devicesResponse.ok) {
      throw new Error(`Failed to fetch devices: ${devicesResponse.statusText}`);
    }

    const devices = await devicesResponse.json();
    console.log(`Found ${devices.length} devices in Traccar`);

    // Fetch positions for all devices
    const positionsResponse = await fetch(`${config.api_url}/api/positions`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      }
    });

    const positions = await positionsResponse.json();
    console.log(`Found ${positions.length} positions in Traccar`);

    // Create a map of device positions
    const positionMap = new Map();
    positions.forEach((position: any) => {
      positionMap.set(position.deviceId, position);
    });

    // Sync each device
    for (const device of devices) {
      const position = positionMap.get(device.id);
      
      const deviceData = {
        user_id,
        name: device.name,
        imei: device.uniqueId,
        vehicle_plate: device.name, // Traccar doesn't have separate plate field
        status: device.status === 'online' ? 'online' : 'offline',
        latitude: position?.latitude || null,
        longitude: position?.longitude || null,
        last_update: position ? new Date(position.fixTime).toISOString() : new Date().toISOString(),
        address: position?.address || null,
        battery: null, // Traccar may not provide battery info
        signal: null,
        tracker_model: device.model || null,
        chip_number: device.phone || null,
      };

      // Check if device exists
      const { data: existingDevice } = await supabase
        .from('devices')
        .select('id')
        .eq('imei', device.uniqueId)
        .eq('user_id', user_id)
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
    }

    await logIntegration(
      supabase,
      user_id,
      'traccar',
      'sync_devices',
      'success',
      { device_count: devices.length }
    );

    return { success: true, message: `Synchronized ${devices.length} devices from Traccar` };

  } catch (error) {
    console.error('Error syncing devices from Traccar:', error);
    
    await logIntegration(
      supabase,
      user_id,
      'traccar',
      'sync_devices',
      'error',
      {},
      {},
      error instanceof Error ? error.message : String(error)
    );

    throw error;
  }
}

// Test connection to Traccar
async function testConnection(config: TraccarConfig) {
  const auth = btoa(`${config.username}:${config.password}`);
  
  const response = await fetch(`${config.api_url}/api/session`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`Connection test failed: ${response.statusText}`);
  }

  return { success: true, message: 'Connection successful' };
}

// Send command to device
async function sendCommandToDevice(config: TraccarConfig, deviceId: string, command: string) {
  const auth = btoa(`${config.username}:${config.password}`);
  
  const commandData = {
    deviceId: parseInt(deviceId),
    type: command,
    attributes: {}
  };

  const response = await fetch(`${config.api_url}/api/commands/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commandData)
  });

  if (!response.ok) {
    throw new Error(`Command failed: ${response.statusText}`);
  }

  return await response.json();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid token');
    }

    const body = await req.json();
    const { action, deviceId, command } = body;

    // Get Traccar configuration for the user
    let { data: configData, error: configError } = await supabase
      .from('tenant_config')
      .select('config_value')
      .eq('user_id', user.id)
      .eq('config_key', 'traccar_settings')
      .maybeSingle();

    let config: TraccarConfig | null = null;
    
    if (!configError && configData) {
      config = configData.config_value;
    }
    
    // If no configuration found, create default config using project secrets
    if (!config) {
      const traccarApiUrl = Deno.env.get('TRACCAR_API_URL');
      const traccarApiToken = Deno.env.get('TRACCAR_API_TOKEN');
      
      if (traccarApiUrl && traccarApiToken) {
        // Create default Traccar configuration
        const defaultConfig = {
          api_url: traccarApiUrl,
          username: 'admin', // Default username
          password: traccarApiToken,
          sync_interval: 30
        };
        
        // Save default config for user
        const { error: insertError } = await supabase
          .from('tenant_config')
          .insert({
            user_id: user.id,
            config_key: 'traccar_settings',
            config_value: defaultConfig
          });
          
        if (!insertError) {
          config = defaultConfig;
          console.log('Created default Traccar configuration for user:', user.id);
        }
      }
    }
    
    // If still no configuration found, create sample data for demo
    if (!config) {
      console.log('No Traccar configuration found, creating sample vehicles for demo');
      
      // Create sample vehicles for demo
      const sampleVehicles = [
        {
          user_id: user.id,
          name: 'Honda CG 160 - ABC-1234',
          imei: `demo_${user.id}_1`,
          vehicle_plate: 'ABC-1234',
          status: 'online',
          latitude: -3.7327,
          longitude: -38.5267,
          address: 'Fortaleza, CE - Centro',
          last_update: new Date().toISOString(),
          battery: 85,
          signal: 4,
          tracker_model: 'Demo GPS',
          chip_number: null
        },
        {
          user_id: user.id,
          name: 'Yamaha Factor - DEF-5678',
          imei: `demo_${user.id}_2`,
          vehicle_plate: 'DEF-5678',
          status: 'offline',
          latitude: -3.7400,
          longitude: -38.5200,
          address: 'Fortaleza, CE - Aldeota',
          last_update: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          battery: 45,
          signal: 2,
          tracker_model: 'Demo GPS',
          chip_number: null
        }
      ];
      
      // Insert or update demo vehicles in devices table
      for (const vehicle of sampleVehicles) {
        const { data: existingDevice } = await supabase
          .from('devices')
          .select('id')
          .eq('imei', vehicle.imei)
          .eq('user_id', user.id)
          .single();

        if (existingDevice) {
          await supabase
            .from('devices')
            .update(vehicle)
            .eq('id', existingDevice.id);
        } else {
          await supabase
            .from('devices')
            .insert(vehicle);
        }
        
        // Also create corresponding vehicle records
        const vehicleData = {
          user_id: user.id,
          brand: vehicle.name.includes('Honda') ? 'Honda' : 'Yamaha',
          model: vehicle.name.includes('Honda') ? 'CG 160' : 'Factor',
          plate: vehicle.vehicle_plate,
          year: 2023,
          latitude: vehicle.latitude,
          longitude: vehicle.longitude,
          address: vehicle.address,
          status: vehicle.status,
          last_update: vehicle.last_update,
          traccar_device_id: null
        };
        
        const vehicleId = `vehicle_${vehicle.imei}`;
        
        await supabase
          .from('vehicles')
          .upsert({ ...vehicleData, id: vehicleId }, { onConflict: 'id' });
      }
      
      await logIntegration(
        supabase,
        user.id,
        'traccar',
        'create_demo_data',
        'success',
        { device_count: sampleVehicles.length }
      );
      
      return new Response(JSON.stringify({
        success: true,
        message: `Created ${sampleVehicles.length} demo vehicles. Configure Traccar for real tracking.`,
        vehicles_created: sampleVehicles.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'sync_devices':
        const syncResult = await syncDevicesFromTraccar(supabase, user.id, config);
        return new Response(JSON.stringify(syncResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'test_connection':
        const testResult = await testConnection(config);
        await logIntegration(
          supabase,
          user.id,
          'traccar',
          'test_connection',
          'success'
        );
        return new Response(JSON.stringify(testResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'send_command':
        if (!deviceId || !command) {
          throw new Error('Device ID and command are required');
        }
        
        const commandResult = await sendCommandToDevice(config, deviceId, command);
        await logIntegration(
          supabase,
          user.id,
          'traccar',
          'send_command',
          'success',
          { deviceId, command }
        );
        
        return new Response(JSON.stringify(commandResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in traccar-sync function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);