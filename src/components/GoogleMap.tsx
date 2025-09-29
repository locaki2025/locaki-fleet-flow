import { useEffect, useRef, useState } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { supabase } from '@/integrations/supabase/client';
import { Car } from 'lucide-react';

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
  lat: -15.7939,
  lng: -47.8828, // Brasília - Brasil
};

const GoogleMapComponent = ({ vehicles }: GoogleMapComponentProps) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        if (error) throw error;
        if (data?.apiKey) {
          setApiKey(data.apiKey);
        }
      } catch (error) {
        console.error('Error fetching Google Maps API key:', error);
      }
    };

    fetchApiKey();
  }, []);

  useEffect(() => {
    if (vehicles.length > 0 && vehicles[0].latitude && vehicles[0].longitude) {
      setMapCenter({
        lat: vehicles[0].latitude,
        lng: vehicles[0].longitude,
      });
    }
  }, [vehicles]);

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
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
        }}
      >
        {vehicles.map((vehicle) => (
          vehicle.latitude && vehicle.longitude && (
            <Marker
              key={vehicle.id}
              position={{
                lat: vehicle.latitude,
                lng: vehicle.longitude,
              }}
              icon={getMarkerIcon(vehicle.status)}
              onClick={() => setSelectedVehicle(vehicle)}
              title={`${vehicle.brand} ${vehicle.model} - ${vehicle.plate}`}
            />
          )
        ))}

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
