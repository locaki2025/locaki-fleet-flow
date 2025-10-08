import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Clock, Battery, X, User } from "lucide-react";

interface VehicleMapCardProps {
  vehicle: any;
  onClose: () => void;
}

const VehicleMapCard = ({ vehicle, onClose }: VehicleMapCardProps) => {
  if (!vehicle) return null;

  console.log('VehicleMapCard - Veículo recebido:', {
    plate: vehicle.plate,
    renter: vehicle.renter,
    fullVehicle: vehicle
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('pt-BR');
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="shadow-lg">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Navigation className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {vehicle.brand} {vehicle.model}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                {vehicle.plate}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={`${
              vehicle.status === 'online' 
                ? 'bg-success/10 text-success border-success' 
                : 'bg-destructive/10 text-destructive border-destructive'
            }`}
          >
            {vehicle.status === 'online' ? 'Online' : 'Offline'}
          </Badge>
          
          {vehicle.renter && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {vehicle.renter}
            </Badge>
          )}
        </div>

        <div className="space-y-2 text-xs">
          {vehicle.speed !== undefined && (
            <div className="flex items-center gap-2">
              <Navigation className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Vel.:</span>
              <span className="font-medium">{vehicle.speed || 0} km/h</span>
            </div>
          )}

          {vehicle.latitude && vehicle.longitude && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Lat.:</span>
              <span className="font-medium">{vehicle.latitude.toFixed(6)}</span>
            </div>
          )}

          {vehicle.latitude && vehicle.longitude && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Lon.:</span>
              <span className="font-medium">{vehicle.longitude.toFixed(6)}</span>
            </div>
          )}

          {vehicle.last_update && (
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Atual.:</span>
              <span className="font-medium">{formatDate(vehicle.last_update)}</span>
            </div>
          )}

          {vehicle.address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <span className="text-muted-foreground">Endereço:</span>
                <p className="font-medium break-words">{vehicle.address}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleMapCard;
