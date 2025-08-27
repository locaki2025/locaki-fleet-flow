import React, { useEffect, useState } from 'react';
import { useMonitoramentoTraccar } from '@/hooks/useMonitoramentoTraccar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Clock } from 'lucide-react';

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

interface MonitoramentoTraccarExampleProps {
  deviceId?: number;
}

export const MonitoramentoTraccarExample: React.FC<MonitoramentoTraccarExampleProps> = ({ 
  deviceId = 1 
}) => {
  const { 
    fetchLatestPosition, 
    fetchLocation, 
    updateMapMarker, 
    startRealTimeTracking,
    isLoading, 
    error 
  } = useMonitoramentoTraccar();

  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [allPositions, setAllPositions] = useState<Position[]>([]);
  const [isTracking, setIsTracking] = useState(false);

  // Função para buscar posição atual
  const handleFetchCurrentPosition = async () => {
    const position = await fetchLatestPosition(deviceId);
    if (position) {
      setCurrentPosition(position);
      // Atualiza o marcador no mapa (se houver)
      updateMapMarker(position);
    }
  };

  // Função para buscar todas as posições
  const handleFetchAllPositions = async () => {
    const positions = await fetchLocation(deviceId);
    setAllPositions(positions);
  };

  // Função para iniciar/parar rastreamento em tempo real
  const handleToggleTracking = () => {
    if (isTracking) {
      setIsTracking(false);
      // O cleanup será feito automaticamente pelo useEffect
    } else {
      setIsTracking(true);
    }
  };

  // Efeito para rastreamento em tempo real
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (isTracking) {
      cleanup = startRealTimeTracking(deviceId, 30000); // 30 segundos
      
      // Atualiza o estado local quando uma nova posição é recebida
      const interval = setInterval(async () => {
        const position = await fetchLatestPosition(deviceId);
        if (position) {
          setCurrentPosition(position);
        }
      }, 30000);

      return () => {
        cleanup?.();
        clearInterval(interval);
      };
    }

    return () => {
      cleanup?.();
    };
  }, [isTracking, deviceId, startRealTimeTracking, fetchLatestPosition]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatSpeed = (speed: number) => {
    return `${Math.round(speed * 1.852)} km/h`; // Conversão de nós para km/h
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Monitoramento Traccar - Dispositivo {deviceId}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={handleFetchCurrentPosition} 
              disabled={isLoading}
              variant="outline"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Buscar Posição Atual
            </Button>
            
            <Button 
              onClick={handleFetchAllPositions} 
              disabled={isLoading}
              variant="outline"
            >
              Buscar Todas as Posições
            </Button>
            
            <Button 
              onClick={handleToggleTracking} 
              disabled={isLoading}
              variant={isTracking ? "destructive" : "default"}
            >
              {isTracking ? "Parar Rastreamento" : "Iniciar Rastreamento"}
            </Button>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Carregando...
            </div>
          )}

          {isTracking && (
            <Badge variant="secondary" className="w-fit">
              <Clock className="h-3 w-3 mr-1" />
              Rastreamento ativo
            </Badge>
          )}
        </CardContent>
      </Card>

      {currentPosition && (
        <Card>
          <CardHeader>
            <CardTitle>Posição Atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>Latitude:</strong> {currentPosition.latitude.toFixed(6)}
              </div>
              <div>
                <strong>Longitude:</strong> {currentPosition.longitude.toFixed(6)}
              </div>
              <div>
                <strong>Velocidade:</strong> {formatSpeed(currentPosition.speed)}
              </div>
              <div>
                <strong>Última atualização:</strong> {formatDate(currentPosition.fixTime)}
              </div>
            </div>
            
            {currentPosition.address && (
              <div>
                <strong>Endereço:</strong> {currentPosition.address}
              </div>
            )}

            <div className="mt-4">
              <strong>Coordenadas para Google Maps:</strong>
              <div className="mt-1 p-2 bg-muted rounded font-mono text-sm">
                {currentPosition.latitude},{currentPosition.longitude}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {allPositions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Posições ({allPositions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {allPositions.slice(0, 10).map((position) => (
                <div 
                  key={position.id} 
                  className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm"
                >
                  <div>
                    <strong>Dispositivo {position.deviceId}:</strong> {position.latitude.toFixed(4)}, {position.longitude.toFixed(4)}
                  </div>
                  <div className="text-muted-foreground">
                    {formatDate(position.fixTime)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};