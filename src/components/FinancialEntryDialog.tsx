import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FinancialEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEntryCreated: () => void;
}

const FinancialEntryDialog = ({ open, onOpenChange, onEntryCreated }: FinancialEntryDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    type: "",
    plate: "",
    location: "",
    amount: "",
    due_date: "",
    description: "",
    is_received: false,
    generate_invoice: false
  });

  useEffect(() => {
    if (open && user) {
      fetchVehicles();
    }
  }, [open, user]);

  const fetchVehicles = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('plate, model, brand')
        .eq('user_id', user.id)
        .eq('status', 'disponivel');

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const fetchTenantsByPlate = async (plate: string) => {
    if (!user?.id || !plate) return;
    
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('cliente_nome, cliente_id')
        .eq('user_id', user.id)
        .eq('moto_id', plate)
        .eq('status', 'ativo');

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const handlePlateChange = (plate: string) => {
    setFormData(prev => ({ ...prev, plate, location: "" }));
    fetchTenantsByPlate(plate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('financial_entries')
        .insert({
          user_id: user.id,
          type: formData.type,
          plate: formData.plate,
          location: formData.location,
          amount: parseFloat(formData.amount),
          due_date: formData.due_date || null,
          description: formData.description || null,
          is_received: formData.is_received,
          generate_invoice: formData.generate_invoice
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Entrada financeira criada com sucesso!",
      });

      setFormData({
        type: "",
        plate: "",
        location: "",
        amount: "",
        due_date: "",
        description: "",
        is_received: false,
        generate_invoice: false
      });
      
      onEntryCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating financial entry:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar entrada financeira",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Entrada</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tipo de Entrada</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="locacao">Locação</SelectItem>
                <SelectItem value="manutencao">Manutenção</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Placa</Label>
            <Select value={formData.plate} onValueChange={handlePlateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a placa" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.plate} value={vehicle.plate}>
                    {vehicle.plate} - {vehicle.brand} {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Locatário</Label>
            <Select value={formData.location} onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o locatário" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.cliente_id} value={tenant.cliente_nome}>
                    {tenant.cliente_nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valor R$</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0,00"
                required
              />
            </div>
            <div>
              <Label>Data de Vencimento</Label>
              <Input 
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
          </div>
          
          <div>
            <Label>Descrição</Label>
            <Textarea 
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição..."
              className="h-20 resize-none"
            />
          </div>
          
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="is_received"
                checked={formData.is_received}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_received: !!checked }))}
              />
              <Label htmlFor="is_received">Valor recebido</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="generate_invoice"
                checked={formData.generate_invoice}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, generate_invoice: !!checked }))}
              />
              <Label htmlFor="generate_invoice">Gerar Boleto</Label>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FinancialEntryDialog;