import { useEffect, useState, useRef, useMemo } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
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
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onVehicleClick?: (vehicle: Vehicle) => void;
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

// Função estável para determinar ícone dos marcadores (fora do componente)
const getMarkerIcon = (vehicle: any) => {
  let color = '#ef4444'; // Vermelho para offline (padrão)
  
  // Verifica se está online
  if (vehicle.status === 'online' || vehicle.status === true) {
    // Verifica se está em movimento (velocidade > 0)
    const speed = Number(vehicle.speed || vehicle.velocidade || 0);
    if (speed > 0) {
      color = '#3b82f6'; // Azul para em movimento
    } else {
      color = '#22c55e'; // Verde para online parado
    }
  }
  
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeWeight: 3,
    strokeColor: '#ffffff',
    scale: 8,
    labelOrigin: new google.maps.Point(0, -2), // Posiciona o label acima do círculo
  };
};

const GoogleMapComponent = ({ vehicles, initialCenter, initialZoom = 13, onVehicleClick }: GoogleMapComponentProps) => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState<string>('');
  const [inputKey, setInputKey] = useState<string>('');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [mapCenter, setMapCenter] = useState(initialCenter || defaultCenter);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const hasFittedBoundsRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const centerAppliedRef = useRef(false);


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

  // Atualiza marcadores existentes ou cria novos sem recarregar o mapa
  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    
    
    const allVehicleIds = new Set(vehicles.map((v: any) => v.id));
    
    // Evita remover todos os marcadores em atualizações transitórias vazias
    if (vehicles.length > 0) {
      markersRef.current.forEach((marker, id) => {
        if (!allVehicleIds.has(id)) {
          marker.setMap(null);
          markersRef.current.delete(id);
        }
        // Se o veículo ainda existe porém está sem coordenadas válidas nesta renderização,
        // mantemos o marcador na última posição conhecida (não removemos aqui).
      });
    }


    // Atualiza ou cria marcadores
    validVehicles.forEach((vehicle: any) => {
      const existingMarker = markersRef.current.get(vehicle.id);
      const position = { lat: Number(vehicle.latitude), lng: Number(vehicle.longitude) };
      const icon = getMarkerIcon(vehicle);
      const label = {
        text: vehicle.plate || '',
        color: '#ffffff',
        fontSize: '11px',
        fontWeight: 'bold',
        className: 'marker-label'
      };

      if (existingMarker) {
        // Apenas atualiza a posição, ícone e label do marcador existente
        existingMarker.setPosition(position);
        existingMarker.setIcon(icon);
        existingMarker.setLabel(label);
      } else {
        // Cria novo marcador
        const marker = new google.maps.Marker({
          position,
          map: mapRef.current,
          icon,
          label,
          title: `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}`,
        });

        marker.addListener('click', () => {
          if (onVehicleClick) {
            onVehicleClick(vehicle);
          }
        });

        markersRef.current.set(vehicle.id, marker);
      }
    });

    // Ajusta bounds apenas na primeira vez e somente quando não houver initialCenter
    if (!hasFittedBoundsRef.current && validVehicles.length > 0 && !initialCenter) {
      const bounds = new google.maps.LatLngBounds();
      validVehicles.forEach((v: any) => bounds.extend({ lat: Number(v.latitude), lng: Number(v.longitude) }));
      try {
        mapRef.current.fitBounds(bounds, 64);
        hasFittedBoundsRef.current = true;
      } catch (e) {
        console.warn('Não foi possível ajustar bounds do mapa:', e);
      }
    }

    // Força centralização quando initialCenter está definido
    if (mapReady && initialCenter && !centerAppliedRef.current && validVehicles.length > 0) {
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.setCenter(initialCenter);
          mapRef.current.setZoom(initialZoom);
          centerAppliedRef.current = true;
        }
      }, 300);
    }
  }, [validVehicles, vehicles, mapReady, initialCenter, initialZoom]);



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
        onLoad={(map) => {
          mapRef.current = map;
          map.setCenter(initialCenter || mapCenter);
          map.setZoom(initialZoom);
          hasFittedBoundsRef.current = !!initialCenter;
          setMapReady(true);
          
          // Atualiza o centro quando o usuário move o mapa
          map.addListener('center_changed', () => {
            const center = map.getCenter();
            if (center) {
              setMapCenter({ lat: center.lat(), lng: center.lng() });
            }
          });
          
          console.log('Mapa carregado');
        }}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
          gestureHandling: 'greedy', // Permite movimentação livre do mapa
        }}
      >
      </GoogleMap>
    </LoadScript>
  );
};

export default GoogleMapComponent;
