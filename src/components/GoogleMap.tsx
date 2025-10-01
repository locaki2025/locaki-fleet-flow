import { useEffect, useState, useRef, useMemo } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { supabase } from '@/integrations/supabase/client';
import { Car } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  latitude: number;
  longitude: number;
  status: string;
  last_update: string;
  address?: string;
}

interface GoogleMapComponentProps {
  vehicles: Vehicle[];
}

const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '400px',
};

const defaultCenter = {
  lat: -23.5505,
  lng: -46.6333, // São Paulo - Brasil
};

const CONFIG_KEY = 'google_maps_api_key';

const GoogleMapComponent = ({ vehicles }: GoogleMapComponentProps) => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState<string>('');
  const [inputKey, setInputKey] = useState<string>('');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
const [mapCenter, setMapCenter] = useState(defaultCenter);
const mapRef = useRef<google.maps.Map | null>(null);


  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const { data, error } = await supabase
          .from('tenant_config')
          .select('config_value')
          .eq('config_key', CONFIG_KEY)
          .maybeSingle();

        if (error) {
          console.error('Error loading API key:', error);
          return;
        }

        if (data?.config_value) {
          const key = typeof data.config_value === 'string' 
            ? data.config_value 
            : String(data.config_value);
          setApiKey(key);
          console.log('Google Maps API key loaded successfully');
        } else {
          setIsConfiguring(true);
        }
      } catch (error) {
        console.error('Error loading API key:', error);
        setIsConfiguring(true);
      }
    };

    loadApiKey();
  }, []);

  const saveApiKey = async () => {
    if (!inputKey.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira uma chave de API válida",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the current user first
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast({
          title: "Erro",
          description: "Você precisa estar autenticado para salvar a configuração",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('tenant_config')
        .upsert({
          config_key: CONFIG_KEY,
          config_value: inputKey,
          user_id: user.id
        }, {
          onConflict: 'user_id,config_key'
        });

      if (error) throw error;

      setApiKey(inputKey);
      setIsConfiguring(false);
      toast({
        title: "Sucesso",
        description: "Chave da API do Google Maps configurada com sucesso",
      });
    } catch (error) {
      console.error('Error saving API key:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a chave da API",
        variant: "destructive",
      });
    }
  };

  // Normaliza coordenadas (suporta vírgula decimal) e pré-filtra veículos válidos
  const parseCoord = (val: any): number | null => {
    if (val == null) return null;
    const str = typeof val === 'string' ? val.replace(',', '.') : val;
    const num = Number(str);
    return Number.isFinite(num) ? num : null;
  };

  const validVehicles = useMemo(() => {
    const mapped = vehicles.map((v: any) => ({
      ...v,
      latitude: parseCoord(v.latitude),
      longitude: parseCoord(v.longitude),
    }));
    return mapped.filter((v: any) => v.latitude != null && v.longitude != null);
  }, [vehicles]);

  // Centraliza no primeiro veículo válido
  useEffect(() => {
    const first = validVehicles[0];
    if (first) {
      console.log('Centralizando mapa no veículo:', first.plate, { lat: first.latitude, lng: first.longitude });
      setMapCenter({ lat: Number(first.latitude), lng: Number(first.longitude) });
    }
  }, [validVehicles]);

  // Ajusta bounds para mostrar todos os veículos válidos
  useEffect(() => {
    if (!mapRef.current || validVehicles.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    validVehicles.forEach((v: any) => bounds.extend({ lat: Number(v.latitude), lng: Number(v.longitude) }));
    try {
      mapRef.current.fitBounds(bounds, 64);
    } catch (e) {
      console.warn('Não foi possível ajustar bounds do mapa:', e);
    }
  }, [validVehicles]);

  const getMarkerIcon = (status: string) => {
    const color = status === 'online' ? '#22c55e' : '#ef4444';
    return {
      path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
      fillColor: color,
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#ffffff',
      scale: 1.5,
    };
  };


  if (isConfiguring) {
    return (
      <div className="h-96 bg-background rounded-lg border flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
          <Car className="h-12 w-12 text-primary mx-auto" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Configure o Google Maps</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Para visualizar o mapa, você precisa configurar uma chave de API do Google Maps.
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Obtenha sua chave em:{' '}
              <a 
                href="https://console.cloud.google.com/google/maps-apis" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google Cloud Console
              </a>
            </p>
          </div>
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Cole sua chave de API aqui"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="w-full"
            />
            <Button onClick={saveApiKey} className="w-full">
              Salvar Configuração
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="h-96 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Car className="h-12 w-12 text-muted-foreground mx-auto animate-pulse" />
          <p className="text-lg font-medium text-muted-foreground">Carregando mapa...</p>
          <p className="text-sm text-muted-foreground">
            Configurando Google Maps
          </p>
        </div>
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={apiKey}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={13}
        onLoad={(map) => { mapRef.current = map; console.log('Mapa carregado, centro:', mapCenter, 'veículos válidos:', validVehicles.length); }}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
        }}
      >
        {validVehicles.map((vehicle: any) => {
          console.log('Renderizando marcador para:', vehicle.plate, {
            lat: Number(vehicle.latitude),
            lng: Number(vehicle.longitude)
          });

          return (
            <Marker
              key={vehicle.id}
              position={{
                lat: Number(vehicle.latitude),
                lng: Number(vehicle.longitude),
              }}
              icon={getMarkerIcon(vehicle.status)}
              onClick={() => setSelectedVehicle(vehicle)}
              title={`${vehicle.brand} ${vehicle.model} - ${vehicle.plate}`}
            />
          );
        })}

        {selectedVehicle && (
          <InfoWindow
            position={{
              lat: selectedVehicle.latitude,
              lng: selectedVehicle.longitude,
            }}
            onCloseClick={() => setSelectedVehicle(null)}
          >
            <div className="p-2 min-w-[200px]">
              <h3 className="font-semibold text-sm mb-1">
                {selectedVehicle.brand} {selectedVehicle.model}
              </h3>
              <p className="text-xs text-gray-600 font-mono mb-2">
                {selectedVehicle.plate}
              </p>
              <div className="space-y-1">
                <p className="text-xs">
                  <span className="font-medium">Status:</span>{' '}
                  <span
                    className={`${
                      selectedVehicle.status === 'online'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {selectedVehicle.status === 'online' ? 'Online' : 'Offline'}
                  </span>
                </p>
                <p className="text-xs">
                  <span className="font-medium">Última atualização:</span>{' '}
                  {new Date(selectedVehicle.last_update).toLocaleString('pt-BR')}
                </p>
                {selectedVehicle.address && (
                  <p className="text-xs">
                    <span className="font-medium">Endereço:</span>{' '}
                    {selectedVehicle.address}
                  </p>
                )}
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  );
};

export default GoogleMapComponent;
