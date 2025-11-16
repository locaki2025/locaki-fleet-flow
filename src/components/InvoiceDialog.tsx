import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceCreated?: () => void;
}

const InvoiceDialog = ({ open, onOpenChange, onInvoiceCreated }: InvoiceDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedPlate, setSelectedPlate] = useState("");
  const [currentRenter, setCurrentRenter] = useState<any>(null);
  const [rentalHistory, setRentalHistory] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    cliente_nome: "",
    cliente_email: "",
    cliente_id: "",
    descricao: "",
    valor: "",
    vencimento: "",
    observacoes: "",
    placa: "",
    dataCriacao: new Date().toISOString().split("T")[0], // Data atual
    taxa_juros: "3.67", // Taxa de juros padrão
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      cliente_nome: "",
      cliente_email: "",
      cliente_id: "",
      descricao: "",
      valor: "",
      vencimento: "",
      observacoes: "",
      placa: "",
      dataCriacao: new Date().toISOString().split("T")[0],
      taxa_juros: "3.67",
    });
    setSelectedPlate("");
    setCurrentRenter(null);
    setRentalHistory([]);
  };

  // Buscar veículos quando o dialog abrir
  useEffect(() => {
    if (open && user) {
      fetchVehicles();
    }
  }, [open, user]);

  // Buscar dados de locação quando uma placa for selecionada
  useEffect(() => {
    if (selectedPlate && user) {
      fetchRentalData(selectedPlate);
    }
  }, [selectedPlate, user]);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate, brand, model, status")
        .eq("user_id", user!.id)
        .order("plate");

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  const fetchRentalData = async (plate: string) => {
    try {
      // Buscar contrato ativo atual
      const { data: activeContract, error: activeError } = await supabase
        .from("contratos")
        .select("*")
        .eq("user_id", user!.id)
        .eq("moto_id", plate)
        .eq("status", "ativo")
        .maybeSingle();

      if (activeError && activeError.code !== "PGRST116") {
        throw activeError;
      }

      setCurrentRenter(activeContract);

      // Buscar histórico de contratos para esta placa
      const { data: history, error: historyError } = await supabase
        .from("contratos")
        .select("cliente_nome, cliente_email, data_inicio, data_fim, status")
        .eq("user_id", user!.id)
        .eq("moto_id", plate)
        .order("data_inicio", { ascending: false })
        .limit(5);

      if (historyError) throw historyError;
      setRentalHistory(history || []);

      // Auto-preencher dados do locatário atual se houver
      if (activeContract) {
        setFormData((prev) => ({
          ...prev,
          cliente_nome: activeContract.cliente_nome,
          cliente_email: activeContract.cliente_email,
          cliente_id: activeContract.cliente_cpf || "",
          placa: plate,
        }));
      } else {
        setFormData((prev) => ({ ...prev, placa: plate }));
      }
    } catch (error) {
      console.error("Error fetching rental data:", error);
    }
  };

  const handlePlateSelect = (plate: string) => {
    setSelectedPlate(plate);
    handleChange("placa", plate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para criar faturas",
        variant: "destructive",
      });
      return;
    }

    if (!formData.cliente_nome || !formData.cliente_email || !formData.valor || !formData.vencimento) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("boletos").insert({
        user_id: user.id,
        cliente_nome: formData.cliente_nome,
        cliente_email: formData.cliente_email,
        cliente_id: formData.cliente_id || formData.cliente_email,
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        vencimento: formData.vencimento,
        observacoes: formData.observacoes,
        placa: formData.placa,
        status: "pendente",
        fatura_id: `FAT-${Date.now()}`,
        tipo_cobranca: "avulsa",
      });

      if (error) {
        console.error("Supabase error creating invoice:", error);
        throw new Error(`Erro ao criar fatura: ${error.message}`);
      }

      toast({
        title: "Fatura criada",
        description: "A fatura foi criada com sucesso!",
      });

      resetForm();
      onOpenChange(false);
      if (onInvoiceCreated) {
        onInvoiceCreated();
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Erro ao criar fatura",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDialogChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Nova Fatura</DialogTitle>
          <DialogDescription>Crie uma nova fatura para cobrança de serviços</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2 custom-scrollbar max-h-[calc(85vh-140px)]">
          {/* Seleção de Placa do Veículo */}
          <div className="space-y-2">
            <Label htmlFor="placa">Placa do Veículo</Label>
            <Select value={selectedPlate} onValueChange={handlePlateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma placa..." />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.plate}>
                    {vehicle.plate} - {vehicle.brand} {vehicle.model} ({vehicle.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Informações do Locatário Atual */}
          {currentRenter && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Locatário Atual</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Nome:</span>
                    <span className="text-sm">{currentRenter.cliente_nome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm">{currentRenter.cliente_email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Período:</span>
                    <span className="text-sm">
                      {new Date(currentRenter.data_inicio).toLocaleDateString()} -
                      {currentRenter.data_fim ? new Date(currentRenter.data_fim).toLocaleDateString() : "Em andamento"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge variant={currentRenter.status === "ativo" ? "default" : "secondary"}>
                      {currentRenter.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Histórico de Locatários */}
          {rentalHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Histórico de Locatários</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {rentalHistory.map((rental, index) => (
                    <div key={index} className="flex justify-between items-center border-b pb-2 last:border-b-0">
                      <div>
                        <span className="text-sm font-medium">{rental.cliente_nome}</span>
                        <div className="text-xs text-muted-foreground">
                          {new Date(rental.data_inicio).toLocaleDateString()} -
                          {rental.data_fim ? new Date(rental.data_fim).toLocaleDateString() : "Atual"}
                        </div>
                      </div>
                      <Badge variant={rental.status === "ativo" ? "default" : "secondary"} className="text-xs">
                        {rental.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente_nome">Nome do Cliente *</Label>
              <Input
                id="cliente_nome"
                value={formData.cliente_nome}
                onChange={(e) => handleChange("cliente_nome", e.target.value)}
                placeholder="Nome completo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cliente_email">Email do Cliente *</Label>
              <Input
                id="cliente_email"
                type="email"
                value={formData.cliente_email}
                onChange={(e) => handleChange("cliente_email", e.target.value)}
                placeholder="email@exemplo.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente_id">ID/CPF do Cliente</Label>
            <Input
              id="cliente_id"
              value={formData.cliente_id}
              onChange={(e) => handleChange("cliente_id", e.target.value)}
              placeholder="CPF ou ID do cliente (opcional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição do Serviço</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleChange("descricao", e.target.value)}
              placeholder="Descreva o serviço prestado..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) => handleChange("valor", e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vencimento">Data de Vencimento *</Label>
              <Input
                id="vencimento"
                type="date"
                value={formData.vencimento}
                onChange={(e) => handleChange("vencimento", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataCriacao">Data de Criação</Label>
              <Input
                id="dataCriacao"
                type="date"
                value={formData.dataCriacao}
                onChange={(e) => handleChange("dataCriacao", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taxa_juros">Taxa de Juros (% ao mês)</Label>
              <Input
                id="taxa_juros"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.taxa_juros}
                onChange={(e) => handleChange("taxa_juros", e.target.value)}
                placeholder="3.67"
              />
              <p className="text-xs text-muted-foreground">
                Taxa de juros aplicada após o vencimento
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleChange("observacoes", e.target.value)}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90" disabled={loading}>
              {loading ? "Criando..." : "Criar Fatura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDialog;
