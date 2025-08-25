import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeviceCreated: () => void;
}

const DeviceDialog = ({ open, onOpenChange, onDeviceCreated }: DeviceDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    imei: "",
    vehiclePlate: "",
    chipNumber: "",
    trackerModel: "",
    status: "online",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para adicionar dispositivos",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.name || !formData.imei || !formData.vehiclePlate) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.from('devices').insert({
        user_id: user.id,
        name: formData.name,
        imei: formData.imei,
        vehicle_plate: formData.vehiclePlate,
        chip_number: formData.chipNumber || null,
        tracker_model: formData.trackerModel || null,
        status: formData.status,
      });

      if (error) throw error;

      toast({
        title: "Dispositivo criado",
        description: `${formData.name} foi adicionado com sucesso`,
      });

      onDeviceCreated();
      onOpenChange(false);
      setFormData({
        name: "",
        imei: "",
        vehiclePlate: "",
        chipNumber: "",
        trackerModel: "",
        status: "online",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar dispositivo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Dispositivo</DialogTitle>
          <DialogDescription>
            Cadastre um novo rastreador GPS para a frota
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Dispositivo</Label>
            <Input
              id="name"
              placeholder="Ex: Rastreador Honda CG 160"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="imei">IMEI</Label>
            <Input
              id="imei"
              placeholder="123456789012345"
              value={formData.imei}
              onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="vehiclePlate">Placa do Veículo</Label>
            <Input
              id="vehiclePlate"
              placeholder="ABC-1234"
              value={formData.vehiclePlate}
              onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="chipNumber">Número do Chip</Label>
            <Input
              id="chipNumber"
              placeholder="Ex: 11999999999"
              value={formData.chipNumber}
              onChange={(e) => setFormData({ ...formData, chipNumber: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="trackerModel">Modelo do Rastreador</Label>
            <Input
              id="trackerModel"
              placeholder="Ex: GT06N, TK102, ST901"
              value={formData.trackerModel}
              onChange={(e) => setFormData({ ...formData, trackerModel: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">Status Inicial</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="maintenance">Manutenção</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-primary hover:opacity-90"
              disabled={isLoading}
            >
              {isLoading ? "Criando..." : "Adicionar Dispositivo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceDialog;