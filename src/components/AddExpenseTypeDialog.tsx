import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddExpenseTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTypeCreated: () => void;
}

const AddExpenseTypeDialog = ({ open, onOpenChange, onTypeCreated }: AddExpenseTypeDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [typeName, setTypeName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !typeName.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('expense_types')
        .insert({
          user_id: user.id,
          name: typeName.trim()
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Novo tipo de saída criado com sucesso!",
      });

      setTypeName("");
      onTypeCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating expense type:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar tipo de saída",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Tipo de Saída</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="typeName">Nome do Tipo</Label>
            <Input 
              id="typeName"
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              placeholder="Ex: Seguro, IPVA, Documentação..."
              required
            />
          </div>
          
          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !typeName.trim()}>
              {loading ? "Criando..." : "Criar Tipo"}
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

export default AddExpenseTypeDialog;