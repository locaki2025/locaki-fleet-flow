import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InvoiceDialog = ({ open, onOpenChange }: InvoiceDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    cliente_nome: "",
    cliente_email: "",
    cliente_cpf: "",
    descricao: "",
    valor: "",
    vencimento: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para criar uma fatura",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('boletos')
        .insert({
          user_id: user.id,
          cliente_nome: formData.cliente_nome,
          cliente_email: formData.cliente_email,
          cliente_cpf: formData.cliente_cpf || null,
          descricao: formData.descricao,
          valor: parseFloat(formData.valor),
          vencimento: formData.vencimento,
          status: 'pendente',
          fatura_id: `FAT-${Date.now()}`,
          cliente_id: `CLI-${Date.now()}`,
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Fatura criada com sucesso!",
        description: "A nova fatura foi adicionada ao sistema",
      });

      // Reset form
      setFormData({
        cliente_nome: "",
        cliente_email: "",
        cliente_cpf: "",
        descricao: "",
        valor: "",
        vencimento: "",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Erro ao criar fatura",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Fatura</DialogTitle>
          <DialogDescription>
            Preencha as informações para criar uma nova fatura
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cliente_nome">Nome do Cliente</Label>
            <Input
              id="cliente_nome"
              value={formData.cliente_nome}
              onChange={(e) => handleChange("cliente_nome", e.target.value)}
              placeholder="Digite o nome do cliente"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente_email">Email do Cliente</Label>
            <Input
              id="cliente_email"
              type="email"
              value={formData.cliente_email}
              onChange={(e) => handleChange("cliente_email", e.target.value)}
              placeholder="cliente@exemplo.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente_cpf">CPF do Cliente (opcional)</Label>
            <Input
              id="cliente_cpf"
              value={formData.cliente_cpf}
              onChange={(e) => handleChange("cliente_cpf", e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleChange("descricao", e.target.value)}
              placeholder="Descrição da fatura..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => handleChange("valor", e.target.value)}
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vencimento">Vencimento</Label>
              <Input
                id="vencimento"
                type="date"
                value={formData.vencimento}
                onChange={(e) => handleChange("vencimento", e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-primary hover:opacity-90"
            >
              {loading ? "Criando..." : "Criar Fatura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDialog;