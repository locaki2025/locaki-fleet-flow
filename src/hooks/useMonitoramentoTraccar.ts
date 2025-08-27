import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Position {
  id: number;
  deviceId: number;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  course: number;
  fixTime: string;
  address?: string;
}

interface TraccarConfig {
  api_url: string;
  username: string;
  password: string;
  sync_interval: number;
}

export const useMonitoramentoTraccar = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTraccarConfig = useCallback(async (): Promise<TraccarConfig | null> => {
    if (!user) return null;

    try {
      const { data } = await supabase
        .from('tenant_config')
        .select('config_value')
        .eq('user_id', user.id)
        .eq('config_key', 'traccar_settings')
        .maybeSingle();

      return (data?.config_value as unknown as TraccarConfig) || null;
    } catch (error) {
      console.error('Error getting Traccar config:', error);
      return null;
    }
  }, [user]);

  const fetchLocation = useCallback(async (deviceId?: number): Promise<Position[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const config = await getTraccarConfig();
      if (!config) {
        throw new Error('Configuração do Traccar não encontrada');
      }

      const auth = btoa(`${config.username}:${config.password}`);
      const url = deviceId 
        ? `${config.api_url}/api/positions?deviceId=${deviceId}`
        : `${config.api_url}/api/positions`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro na API do Traccar: ${response.statusText}`);
      }

      const positions: Position[] = await response.json();
      return positions;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Error fetching location:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [getTraccarConfig]);

  const fetchLatestPosition = useCallback(async (deviceId: number): Promise<Position | null> => {
    const positions = await fetchLocation(deviceId);
    
    if (positions.length === 0) return null;

    // Retorna a posição mais recente
    const latestPosition = positions.reduce((latest, current) => {
      return new Date(current.fixTime) > new Date(latest.fixTime) ? current : latest;
    });

    return latestPosition;
  }, [fetchLocation]);

  const updateMapMarker = useCallback((position: Position, mapInstance?: any, markersRef?: any) => {
    if (!position) return;

    const { latitude, longitude, deviceId } = position;

    // Se um mapa específico foi passado, atualiza o marcador
    if (mapInstance && markersRef) {
      const marker = markersRef.current?.[deviceId];
      if (marker) {
        marker.setLngLat([longitude, latitude]);
        
        // Opcionalmente, centraliza o mapa na nova posição
        mapInstance.flyTo({
          center: [longitude, latitude],
          zoom: 15,
          essential: true
        });
      }
    }

    // Log da nova posição para debug
    console.log(`Posição atualizada para dispositivo ${deviceId}:`, {
      latitude,
      longitude,
      timestamp: position.fixTime,
      address: position.address
    });

    return { latitude, longitude };
  }, []);

  const startRealTimeTracking = useCallback((deviceId: number, intervalMs: number = 30000) => {
    const interval = setInterval(async () => {
      try {
        const position = await fetchLatestPosition(deviceId);
        if (position) {
          updateMapMarker(position);
        }
      } catch (error) {
        console.error('Error in real-time tracking:', error);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [fetchLatestPosition, updateMapMarker]);

  return {
    fetchLocation,
    fetchLatestPosition,
    updateMapMarker,
    startRealTimeTracking,
    isLoading,
    error,
  };
};