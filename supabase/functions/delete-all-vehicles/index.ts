import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Deleting all vehicles and devices for user: ${user.id}`);

    // Delete all vehicle_positions first (foreign key dependency)
    const { error: positionsError } = await supabaseClient
      .from('vehicle_positions')
      .delete()
      .eq('user_id', user.id);

    if (positionsError) {
      console.error('Error deleting vehicle positions:', positionsError);
      throw new Error(`Failed to delete vehicle positions: ${positionsError.message}`);
    }

    console.log('✓ Vehicle positions deleted');

    // Delete all devices
    const { error: devicesError } = await supabaseClient
      .from('devices')
      .delete()
      .eq('user_id', user.id);

    if (devicesError) {
      console.error('Error deleting devices:', devicesError);
      throw new Error(`Failed to delete devices: ${devicesError.message}`);
    }

    console.log('✓ Devices deleted');

    // Delete all vehicles
    const { error: vehiclesError } = await supabaseClient
      .from('vehicles')
      .delete()
      .eq('user_id', user.id);

    if (vehiclesError) {
      console.error('Error deleting vehicles:', vehiclesError);
      throw new Error(`Failed to delete vehicles: ${vehiclesError.message}`);
    }

    console.log('✓ Vehicles deleted');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'All vehicles, devices, and vehicle positions deleted successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in delete-all-vehicles function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
