import { useEffect, useState, useRef, useMemo } from 'react';
import { GoogleMap, LoadScript, InfoWindow } from '@react-google-maps/api';
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
  speed?: number;
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
  lng: -46.6333, // São Paulo
};

const CONFIG_KEY = 'google_maps_api_key';

const GoogleMapComponent = ({ vehicles }: GoogleMapComponentProps) => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const hasFittedBounds = useRef(false);

  // Função auxiliar para parsear coordenadas
  const parseCoord = (val: any): number | null => {
    if (val == null) return null;
    const str = typeof val === 'string' ? val.replace(',', '.') : val;
    const num = Number(str);
    return Number.isFinite(num) ? num : null;
  };

  // Filtra e normaliza veículos válidos
  const validVehicles = useMemo(() => {
    const mapped = vehicles.map((v) => ({
      ...v,
      latitude: parseCoord(v.latitude),
      longitude: parseCoord(v.longitude),
    }));
    return mapped.filter((v) => v.latitude != null && v.longitude != null);
  }, [vehicles]);

  // Carrega a API key do Supabase
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const { data, error } = await supabase
          .from('tenant_config')
          .select('config_value')
          .eq('config_key', CONFIG_KEY)
          .maybeSingle();

        if (error) return console.error('Erro carregando chave API:', error);

        if (data?.config_value) {
          setApiKey(String(data.config_value));
        } else {
          setIsConfiguring(true);
        }
      } catch (error) {
        console.error('Erro carregando chave API:', error);
        setIsConfiguring(true);
      }
    };

    loadApiKey();
  }, []);

  // Salva a chave de API no Supabase
  const saveApiKey = async () => {
    if (!inputKey.trim()) {
      return toast({
        title: "Erro",
        description: "Por favor, insira uma chave de API válida",
        variant: "destructive",
      });
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return toast({
          title: "Erro",
          description: "Você precisa estar autenticado para salvar a configuração",
          variant: "destructive",
        });
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
        description: "Chave da API salva com sucesso",
      });
    } catch (error) {
      console.error('Erro salvando chave API:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar chave da API",
        variant: "destructive",
      });
    }
  };

  // Atualiza/Cria marcadores dinamicamente
  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    const currentVehicleIds = new Set(validVehicles.map(v => v.id));

    // Remove marcadores antigos
    markersRef.current.forEach((marker, id) => {
      if (!currentVehicleIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });

    // Atualiza ou cria marcadores
    validVehicles.forEach(vehicle => {
      const position = { lat: Number(vehicle.latitude), lng: Number(vehicle.longitude) };
      const icon = getMarkerIcon(vehicle);

      const existing = markersRef.current.get(vehicle.id);
      if (existing) {
        existing.setPosition(position);
        existing.setIcon(icon);
      } else {
        const marker = new google.maps.Marker({
          map: mapRef.current!,
          position,
          icon,
          title: `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}`,
        });

        marker.addListener('click', () => setSelectedVehicle(vehicle));
        markersRef.current.set(vehicle.id, marker);
      }
    });

    // Centraliza apenas na primeira vez
    if (!hasFittedBounds.current && validVehicles.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      validVehicles.forEach((v) => {
        bounds.extend({ lat: Number(v.latitude), lng: Number(v.longitude) });
      });
      try {
        mapRef.current.fitBounds(bounds, 64);
        hasFittedBounds.current = true;
      } catch (e) {
        console.warn('Erro ajustando bounds:', e);
      }
    }
  }, [validVehicles]);

  // Ícone do marcador de acordo com o status
  const getMarkerIcon = (vehicle: Vehicle): google.maps.Symbol => {
    let color = '#ef4444'; // offline

    if (vehicle.status === 'online') {
      const speed = Number(vehicle.speed || 0);
      color = speed > 0 ? '#3b82f6' : '#22c55e'; // azul ou verde
    }

    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 1,
      strokeWeight: 3,
      strokeColor: '#fff',
      scale: 8,
    };
  };

  if (isConfiguring) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Car className="w-10 h-10 mx-auto text-primary" />
          <p>Configure a chave da API do Google Maps:</p>
          <Input
            placeholder="Cole sua chave aqui"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
          />
          <Button onClick={saveApiKey}>Salvar</Button>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Car className="w-10 h-10 animate-pulse text-muted-foreground" />
        <p>Carregando mapa...</p>
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={apiKey}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={13}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
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
              <p className="text-xs font-mono text-gray-600">{selectedVehicle.plate}</p>
              <p className="text-xs">
                <span className="font-medium">Status:</span>{' '}
               
