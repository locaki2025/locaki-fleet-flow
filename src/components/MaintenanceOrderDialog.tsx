import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { mockVehicles } from "@/data/mockData";
import { Calendar as CalendarIcon, Wrench } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MaintenanceOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated?: (newOrder: any) => void;
}

const MaintenanceOrderDialog = ({ open, onOpenChange, onOrderCreated }: MaintenanceOrderDialogProps) => {
  const { toast } = useToast();
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [formData, setFormData] = useState({
    vehicleId: "",
    type: "",
    priority: "",
    description: "",
    estimatedCost: "",
    mechanic: "",
    location: "",
    currentKm: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vehicleId || !formData.type || !formData.description || !scheduledDate) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Create new order object
    const newOrder = {
      id: `order_${Date.now()}`,
      vehicleId: formData.vehicleId,
      type: formData.type,
      priority: formData.priority || 'media',
      description: formData.description,
      cost: parseFloat(formData.estimatedCost) || 0,
      currentKm: parseInt(formData.currentKm) || 0,
      status: 'aberta',
      scheduledDate: scheduledDate.toISOString(),
      mechanic: formData.mechanic,
      location: formData.location,
      createdAt: new Date().toISOString()
    };
    
    toast({
      title: "Ordem de serviço criada!",
      description: `Nova ordem de manutenção foi agendada para ${format(scheduledDate, "dd/MM/yyyy", { locale: ptBR })}`,
    });
    
    // Reset form
    setFormData({
      vehicleId: "",
      type: "",
      priority: "",
      description: "",
      estimatedCost: "",
      mechanic: "",
      location: "",
      currentKm: ""
    });
    setScheduledDate(undefined);
    onOpenChange(false);
    onOrderCreated?.(newOrder);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getVehicleInfo = (vehicleId: string) => {
    const vehicle = mockVehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}` : '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary/10 flex items-center justify-center">
              <Wrench className="h-4 w-4 text-primary" />
            </div>
            Nova Ordem de Serviço
          </DialogTitle>
          <DialogDescription>
            Crie uma nova ordem de manutenção para sua frota
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle">Veículo *</Label>
              <Select value={formData.vehicleId} onValueChange={(value) => handleInputChange('vehicleId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o veículo" />
                </SelectTrigger>
                <SelectContent>
                  {mockVehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.brand} {vehicle.model} - {vehicle.plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Manutenção *</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventiva">Preventiva</SelectItem>
                  <SelectItem value="corretiva">Corretiva</SelectItem>
                  <SelectItem value="revisao">Revisão</SelectItem>
                  <SelectItem value="pneus">Pneus</SelectItem>
                  <SelectItem value="freios">Freios</SelectItem>
                  <SelectItem value="motor">Motor</SelectItem>
                  <SelectItem value="eletrica">Elétrica</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Data Agendada *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecionar data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição do Serviço *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descreva detalhadamente o serviço a ser realizado"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedCost">Custo Estimado (R$)</Label>
              <Input
                id="estimatedCost"
                type="number"
                step="0.01"
                min="0"
                value={formData.estimatedCost}
                onChange={(e) => handleInputChange('estimatedCost', e.target.value)}
                placeholder="0,00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currentKm">Km Atual do Veículo</Label>
              <Input
                id="currentKm"
                type="number"
                min="0"
                value={formData.currentKm}
                onChange={(e) => handleInputChange('currentKm', e.target.value)}
                placeholder="Digite a quilometragem atual"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mechanic">Mecânico Responsável</Label>
            <Input
              id="mechanic"
              value={formData.mechanic}
              onChange={(e) => handleInputChange('mechanic', e.target.value)}
              placeholder="Nome do mecânico"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Local do Serviço</Label>
            <Select value={formData.location} onValueChange={(value) => handleInputChange('location', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oficina_propria">Oficina Própria</SelectItem>
                <SelectItem value="oficina_terceirizada">Oficina Terceirizada</SelectItem>
                <SelectItem value="local_cliente">Local do Cliente</SelectItem>
                <SelectItem value="concessionaria">Concessionária</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90">
              Criar Ordem de Serviço
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceOrderDialog;