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
  // Campos avançados para criação via Cora
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [idemKey, setIdemKey] = useState("");

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
    // Endereço do cliente
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    complemento: "",
    cep: "",
    // Multa e desconto
    multa: "0",
    desconto_tipo: "PERCENT",
    desconto_valor: "0",
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
      rua: "",
      numero: "",
      bairro: "",
      cidade: "",
      estado: "",
      complemento: "",
      cep: "",
      multa: "0",
      desconto_tipo: "PERCENT",
      desconto_valor: "0",
    });
    setSelectedPlate("");
    setCurrentRenter(null);
    setRentalHistory([]);
    setAdvancedOpen(false);
    setAccessToken("");
    setBaseUrl("");
    setIdemKey("");
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
      // Determinar tipo de documento (CPF ou CNPJ)
      const cleanedDoc = (formData.cliente_id || "00000000000").replace(/\D/g, "");
      const docType = cleanedDoc.length === 14 ? "CNPJ" : "CPF";
      
      // Montar payload no formato exato da API Cora
      const payload: any = {
        action: "create_invoice",
        user_id: user.id,
        boleto: {
          code: crypto.randomUUID().substring(0, 8),
          customer: {
            name: formData.cliente_nome,
            email: formData.cliente_email,
            document: {
              identity: cleanedDoc,
              type: docType
            },
            address: {
              street: formData.rua || "Rua não informada",
              number: formData.numero || "S/N",
              district: formData.bairro || "Centro",
              city: formData.cidade || "Cidade",
              state: formData.estado || "SP",
              complement: formData.complemento || "N/A",
              zip_code: (formData.cep || "00000000").replace(/\D/g, "")
            }
          },
          services: [
            {
              name: formData.descricao || "Serviço de Locação",
              description: formData.observacoes || formData.descricao || "Serviço prestado",
              amount: Math.round(parseFloat(formData.valor) * 100) // em centavos
            }
          ],
          payment_terms: {
            due_date: formData.vencimento,
            fine: {
              amount: Math.round(parseFloat(formData.multa || "0") * 100)
            },
            interest: {
              rate: parseFloat(formData.taxa_juros || "3.67")
            },
            discount: parseFloat(formData.desconto_valor || "0") > 0 ? {
              type: formData.desconto_tipo || "PERCENT",
              value: parseFloat(formData.desconto_valor)
            } : undefined
          },
          notifications: {
            channels: ["EMAIL"],
            destination: {
              name: formData.cliente_nome,
              email: formData.cliente_email
            },
            rules: [
              "NOTIFY_TEN_DAYS_BEFORE_DUE_DATE",
              "NOTIFY_TWO_DAYS_BEFORE_DUE_DATE",
              "NOTIFY_ON_DUE_DATE",
              "NOTIFY_TWO_DAYS_AFTER_DUE_DATE",
              "NOTIFY_WHEN_PAID"
            ]
          }
        }
      };

      // Remove discount se for undefined
      if (!payload.boleto.payment_terms.discount) {
        delete payload.boleto.payment_terms.discount;
      }

      // Campos avançados opcionais vindos do formulário
      if (accessToken) payload.access_token = accessToken;
      if (baseUrl) payload.base_url = baseUrl;
      if (idemKey) payload.idempotency_Key = idemKey;

      const { data, error } = await supabase.functions.invoke("cora-webhook", {
        body: payload,
      });

      if (error) {
        console.error("Erro ao criar fatura no Cora:", error);
        throw new Error(error.message || "Falha ao criar no Cora");
      }

      // Se criado com sucesso no Cora, a função já inicia a sincronização com o banco
      toast({
        title: "Boleto solicitado no Cora",
        description: "Sincronizando boletos com o banco de dados...",
      });

      resetForm();
      onOpenChange(false);
      onInvoiceCreated?.();
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Erro ao criar boleto no Cora",
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
            <Label htmlFor="cliente_id">CPF/CNPJ do Cliente *</Label>
            <Input
              id="cliente_id"
              value={formData.cliente_id}
              onChange={(e) => handleChange("cliente_id", e.target.value)}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              required
            />
          </div>

          {/* Endereço do Cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rua">Rua *</Label>
              <Input
                id="rua"
                value={formData.rua}
                onChange={(e) => handleChange("rua", e.target.value)}
                placeholder="Nome da rua"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero">Número *</Label>
              <Input
                id="numero"
                value={formData.numero}
                onChange={(e) => handleChange("numero", e.target.value)}
                placeholder="123"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro *</Label>
              <Input
                id="bairro"
                value={formData.bairro}
                onChange={(e) => handleChange("bairro", e.target.value)}
                placeholder="Centro"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade *</Label>
              <Input
                id="cidade"
                value={formData.cidade}
                onChange={(e) => handleChange("cidade", e.target.value)}
                placeholder="São Paulo"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estado">Estado *</Label>
              <Input
                id="estado"
                value={formData.estado}
                onChange={(e) => handleChange("estado", e.target.value)}
                placeholder="SP"
                maxLength={2}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cep">CEP *</Label>
              <Input
                id="cep"
                value={formData.cep}
                onChange={(e) => handleChange("cep", e.target.value)}
                placeholder="00000-000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                value={formData.complemento}
                onChange={(e) => handleChange("complemento", e.target.value)}
                placeholder="Apto 123"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Nome do Serviço *</Label>
            <Input
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleChange("descricao", e.target.value)}
              placeholder="Ex: Locação de Motocicleta"
              required
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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taxa_juros">Juros (% mês)</Label>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="multa">Multa (R$)</Label>
              <Input
                id="multa"
                type="number"
                step="0.01"
                min="0"
                value={formData.multa}
                onChange={(e) => handleChange("multa", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desconto_valor">Desconto</Label>
              <div className="flex gap-2">
                <Input
                  id="desconto_valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.desconto_valor}
                  onChange={(e) => handleChange("desconto_valor", e.target.value)}
                  placeholder="0"
                  className="w-20"
                />
                <Select value={formData.desconto_tipo} onValueChange={(v) => handleChange("desconto_tipo", v)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">%</SelectItem>
                    <SelectItem value="FIXED">R$</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

          {/* Campos avançados (opcionais) */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Campos avançados (opcional)</Label>
              <Button type="button" variant="ghost" onClick={() => setAdvancedOpen(!advancedOpen)}>
                {advancedOpen ? "Ocultar" : "Mostrar"}
              </Button>
            </div>
            {advancedOpen && (
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="access_token">Access Token</Label>
                  <Input id="access_token" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="Cole o access_token da Cora (opcional)" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="base_url">Base URL</Label>
                  <Input id="base_url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://matls-clients.api.stage.cora.com.br" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="idempotency_key">Idempotency Key</Label>
                  <Input id="idempotency_key" value={idemKey} onChange={(e) => setIdemKey(e.target.value)} placeholder="Opcional (será gerado se vazio)" />
                </div>
              </div>
            )}
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
