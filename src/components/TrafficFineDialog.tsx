import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  placa: z.string().min(1, "Placa é obrigatória"),
  infracao: z.string().min(1, "Infração é obrigatória"),
  motivo: z.string().min(1, "Motivo é obrigatório"),
  data_infracao: z.date({ required_error: "Data da infração é obrigatória" }),
  valor_multa: z.string().min(1, "Valor é obrigatório"),
  valor_com_desconto: z.string().optional(),
  situacao: z.string().min(1, "Situação é obrigatória"),
  gravidade: z.string().optional(),
  pontuacao: z.string().optional(),
  orgao_autuador: z.string().optional(),
  tipo_infracao: z.string().optional(),
  condutor: z.string().optional(),
  endereco: z.string().optional(),
  auto_infracao: z.string().optional(),
  data_limite_recurso: z.date().optional(),
  prazo_indicacao_condutor: z.date().optional(),
  recebimento_infracao: z.date().optional(),
  habilitado_faturar: z.boolean().default(false),
  faturado: z.boolean().default(false),
  em_recurso: z.boolean().default(false),
  em_posse_cliente: z.boolean().default(false),
  justificativa: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TrafficFineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

interface Vehicle {
  id: string;
  plate: string;
  model: string;
  brand: string;
}

export const TrafficFineDialog = ({ open, onOpenChange, onSave }: TrafficFineDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      placa: "",
      infracao: "",
      motivo: "",
      valor_multa: "",
      valor_com_desconto: "",
      situacao: "aberta",
      gravidade: "",
      pontuacao: "0",
      orgao_autuador: "",
      tipo_infracao: "",
      condutor: "",
      endereco: "",
      auto_infracao: "",
      habilitado_faturar: false,
      faturado: false,
      em_recurso: false,
      em_posse_cliente: false,
      justificativa: "",
      observacoes: "",
    },
  });

  useEffect(() => {
    if (open) {
      fetchVehicles();
    }
  }, [open]);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate, model, brand')
        .order('plate');

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      // Encontrar o veículo correspondente
      const vehicle = vehicles.find(v => v.plate === data.placa);

      const fineData = {
        placa: data.placa,
        infracao: data.infracao,
        motivo: data.motivo,
        data_infracao: data.data_infracao.toISOString().split('T')[0],
        valor_multa: parseFloat(data.valor_multa),
        valor_com_desconto: data.valor_com_desconto ? parseFloat(data.valor_com_desconto) : null,
        situacao: data.situacao,
        gravidade: data.gravidade || null,
        pontuacao: parseInt(data.pontuacao || "0"),
        orgao_autuador: data.orgao_autuador || null,
        tipo_infracao: data.tipo_infracao || null,
        condutor: data.condutor || null,
        endereco: data.endereco || null,
        auto_infracao: data.auto_infracao || null,
        data_limite_recurso: data.data_limite_recurso ? data.data_limite_recurso.toISOString().split('T')[0] : null,
        prazo_indicacao_condutor: data.prazo_indicacao_condutor ? data.prazo_indicacao_condutor.toISOString().split('T')[0] : null,
        recebimento_infracao: data.recebimento_infracao ? data.recebimento_infracao.toISOString().split('T')[0] : null,
        habilitado_faturar: data.habilitado_faturar,
        faturado: data.faturado,
        em_recurso: data.em_recurso,
        em_posse_cliente: data.em_posse_cliente,
        justificativa: data.justificativa || null,
        observacoes: data.observacoes || null,
        veiculo_id: vehicle?.id || null,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      };

      const { error } = await supabase
        .from('multas_transito')
        .insert([fineData]);

      if (error) throw error;

      toast({
        title: "Multa cadastrada",
        description: "A multa foi cadastrada com sucesso.",
      });

      form.reset();
      onOpenChange(false);
      onSave();
    } catch (error) {
      console.error('Error saving traffic fine:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível cadastrar a multa.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Multa de Trânsito</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="placa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa do Veículo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a placa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.plate}>
                            {vehicle.plate} - {vehicle.brand} {vehicle.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="auto_infracao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auto de Infração</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Número do auto de infração" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="infracao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Infração</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Descrição da infração" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_infracao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Infração</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="velocidade">Excesso de Velocidade</SelectItem>
                        <SelectItem value="estacionamento">Estacionamento Irregular</SelectItem>
                        <SelectItem value="semaforo">Avanço de Sinal</SelectItem>
                        <SelectItem value="alcool">Dirigir sob Efeito de Álcool</SelectItem>
                        <SelectItem value="celular">Uso de Celular</SelectItem>
                        <SelectItem value="cinto">Não Uso do Cinto</SelectItem>
                        <SelectItem value="outra">Outra</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="motivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Motivo detalhado da infração" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="data_infracao"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data da Infração</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_limite_recurso"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Limite Recurso</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prazo_indicacao_condutor"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Prazo Indicação Condutor</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="valor_multa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor da Multa (R$)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valor_com_desconto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor com Desconto (R$)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pontuacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pontuação</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="situacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Situação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a situação" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="aberta">Aberta</SelectItem>
                        <SelectItem value="paga">Paga</SelectItem>
                        <SelectItem value="em_recurso">Em Recurso</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gravidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gravidade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a gravidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="leve">Leve</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="grave">Grave</SelectItem>
                        <SelectItem value="gravissima">Gravíssima</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="orgao_autuador"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Órgão Autuador</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: DETRAN-SP" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="condutor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condutor</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do condutor" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endereco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço da Infração</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Local onde ocorreu a infração" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="habilitado_faturar"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Habilitado para Faturar</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="faturado"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Faturado</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="em_recurso"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Em Recurso</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="em_posse_cliente"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Em Posse do Cliente</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="justificativa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Justificativa</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Justificativa para recurso ou observações" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Observações gerais" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Multa"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};