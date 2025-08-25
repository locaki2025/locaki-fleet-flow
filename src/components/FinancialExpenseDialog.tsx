import { useState } from "react";
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

interface FinancialExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpenseCreated: () => void;
}

const FinancialExpenseDialog = ({ open, onOpenChange, onExpenseCreated }: FinancialExpenseDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    plate: "",
    location: "",
    amount: "",
    due_date: "",
    description: "",
    is_paid: false,
    attach_files: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('financial_expenses')
        .insert({
          user_id: user.id,
          type: formData.type,
          plate: formData.plate,
          location: formData.location,
          amount: parseFloat(formData.amount),
          due_date: formData.due_date || null,
          description: formData.description || null,
          is_paid: formData.is_paid,
          attach_files: formData.attach_files
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Saída financeira criada com sucesso!",
      });

      setFormData({
        type: "",
        plate: "",
        location: "",
        amount: "",
        due_date: "",
        description: "",
        is_paid: false,
        attach_files: false
      });
      
      onExpenseCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating financial expense:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar saída financeira",
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
          <DialogTitle>Adicionar Nova Saída</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tipo de Saída</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manutencao">Manutenção</SelectItem>
                <SelectItem value="combustivel">Combustível</SelectItem>
                <SelectItem value="seguro">Seguro</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Placa</Label>
            <Input 
              value={formData.plate}
              onChange={(e) => setFormData(prev => ({ ...prev, plate: e.target.value }))}
              placeholder="Digite a placa do veículo"
              required
            />
          </div>
          
          <div>
            <Label>Locatário</Label>
            <Input 
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Nome do locatário"
            />
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
                id="is_paid"
                checked={formData.is_paid}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_paid: !!checked }))}
              />
              <Label htmlFor="is_paid">Valor pago</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="attach_files"
                checked={formData.attach_files}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, attach_files: !!checked }))}
              />
              <Label htmlFor="attach_files">Anexar arquivos</Label>
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

export default FinancialExpenseDialog;