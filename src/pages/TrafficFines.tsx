import { useState, useEffect } from "react";
import { Plus, FileText, AlertTriangle, Calendar, DollarSign, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TrafficFineDialog } from "@/components/TrafficFineDialog";
import { TrafficFineDetailsDialog } from "@/components/TrafficFineDetailsDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TrafficFine {
  id: string;
  placa: string;
  infracao: string;
  motivo: string;
  data_infracao: string;
  valor_multa: number;
  valor_com_desconto?: number;
  situacao: string;
  gravidade?: string;
  pontuacao: number;
  orgao_autuador?: string;
  data_limite_recurso?: string;
  habilitado_faturar: boolean;
  faturado: boolean;
  em_recurso: boolean;
  em_posse_cliente: boolean;
  created_at: string;
}

const TrafficFines = () => {
  const [fines, setFines] = useState<TrafficFine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFine, setSelectedFine] = useState<TrafficFine | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { toast } = useToast();

  const fetchFines = async () => {
    try {
      const { data, error } = await supabase
        .from('multas_transito')
        .select('*')
        .order('data_infracao', { ascending: false });

      if (error) throw error;
      setFines(data || []);
    } catch (error) {
      console.error('Error fetching traffic fines:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as multas.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFines();
  }, []);

  const getSituationBadgeVariant = (situacao: string) => {
    switch (situacao.toLowerCase()) {
      case 'aberta':
        return 'destructive';
      case 'paga':
        return 'default';
      case 'em recurso':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getGravityBadgeVariant = (gravidade?: string) => {
    switch (gravidade?.toLowerCase()) {
      case 'leve':
        return 'secondary';
      case 'média':
        return 'default';
      case 'grave':
        return 'destructive';
      case 'gravíssima':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleFineClick = (fine: TrafficFine) => {
    setSelectedFine(fine);
    setIsDetailsOpen(true);
  };

  const syncWithSerpro = async () => {
    try {
      // Chamada para a função edge que fará a sincronização com o Serpro
      const { data, error } = await supabase.functions.invoke('serpro-sync-fines');
      
      if (error) throw error;
      
      toast({
        title: "Sincronização iniciada",
        description: "A sincronização com o Serpro foi iniciada. As multas serão atualizadas em breve.",
      });
      
      // Recarregar a lista após um delay
      setTimeout(() => {
        fetchFines();
      }, 2000);
    } catch (error) {
      console.error('Error syncing with Serpro:', error);
      toast({
        variant: "destructive",
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar com o Serpro.",
      });
    }
  };

  const exportToPDF = async () => {
    try {
      // Group fines by vehicle plate
      const finesByVehicle = fines.reduce((acc, fine) => {
        if (!acc[fine.placa]) {
          acc[fine.placa] = [];
        }
        acc[fine.placa].push(fine);
        return acc;
      }, {} as Record<string, TrafficFine[]>);

      const vehiclePlates = Object.keys(finesByVehicle);
      
      if (vehiclePlates.length === 0) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não há multas para exportar.",
        });
        return;
      }

      toast({
        title: "Gerando relatórios",
        description: `Gerando ${vehiclePlates.length} relatórios por veículo...`,
      });

      // Generate PDF for each vehicle
      for (const plate of vehiclePlates) {
        const vehicleFines = finesByVehicle[plate];
        
        const { data, error } = await supabase.functions.invoke('generate-fines-report', {
          body: { fines: vehicleFines }
        });

        if (error) {
          console.error(`Error generating report for vehicle ${plate}:`, error);
          continue;
        }

        // Create download link for the PDF and trigger download
        if (data.pdf) {
          try {
            // Convert base64 to blob
            const binaryString = atob(data.pdf);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            const pdfBlob = new Blob([bytes], { type: 'application/pdf' });
            
            // Try modern Web Share API first (for mobile devices)
            if (navigator.share && navigator.canShare?.({ files: [new File([pdfBlob], `multas-${plate}.pdf`, { type: 'application/pdf' })] })) {
              const file = new File([pdfBlob], `multas-${plate}-${new Date().toISOString().split('T')[0]}.pdf`, { type: 'application/pdf' });
              await navigator.share({
                title: `Relatório de Multas - ${plate}`,
                text: `Relatório de multas do veículo ${plate}`,
                files: [file]
              });
            } else {
              // Fallback to traditional download
              const url = URL.createObjectURL(pdfBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `multas-${plate}-${new Date().toISOString().split('T')[0]}.pdf`;
              link.style.display = 'none';
              
              // Add to document, click, and remove
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              // Clean up the URL
              setTimeout(() => URL.revokeObjectURL(url), 100);
            }
          } catch (shareError) {
            console.error(`Error sharing/downloading PDF for ${plate}:`, shareError);
            // Fallback download method
            const url = URL.createObjectURL(new Blob([Uint8Array.from(atob(data.pdf), c => c.charCodeAt(0))], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `multas-${plate}-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
          
          // Small delay between downloads to avoid browser blocking
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }

      toast({
        title: "Relatórios exportados",
        description: `${vehiclePlates.length} relatórios foram exportados para seu dispositivo com sucesso.`,
      });
    } catch (error) {
      console.error('Error generating reports:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível gerar os relatórios.",
      });
    }
  };

  const stats = {
    total: fines.length,
    abertas: fines.filter(f => f.situacao === 'aberta').length,
    pagas: fines.filter(f => f.situacao === 'paga').length,
    emRecurso: fines.filter(f => f.em_recurso).length,
    valorTotal: fines.reduce((acc, f) => acc + Number(f.valor_multa), 0),
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando multas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Multas de Trânsito</h1>
          <p className="text-muted-foreground">
            Gerencie as multas de trânsito dos veículos locados
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={syncWithSerpro}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            Sincronizar Serpro
          </Button>
          <Button variant="outline" onClick={exportToPDF}>
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Multa
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Multas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.abertas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagas</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.pagas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Recurso</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.emRecurso}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(stats.valorTotal)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Multas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Multas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Infração</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Gravidade</TableHead>
                <TableHead>Pontos</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fines.map((fine) => (
                <TableRow 
                  key={fine.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleFineClick(fine)}
                >
                  <TableCell className="font-medium">{fine.placa}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {fine.infracao}
                  </TableCell>
                  <TableCell>
                    {format(new Date(fine.data_infracao), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(Number(fine.valor_multa))}
                      </div>
                      {fine.valor_com_desconto && (
                        <div className="text-sm text-green-600">
                          Com desconto: {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(Number(fine.valor_com_desconto))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getSituationBadgeVariant(fine.situacao)}>
                      {fine.situacao}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {fine.gravidade && (
                      <Badge variant={getGravityBadgeVariant(fine.gravidade)}>
                        {fine.gravidade}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {fine.pontuacao} pts
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {fine.faturado && (
                        <Badge variant="secondary" className="text-xs">
                          Faturado
                        </Badge>
                      )}
                      {fine.em_recurso && (
                        <Badge variant="default" className="text-xs">
                          Recurso
                        </Badge>
                      )}
                      {fine.em_posse_cliente && (
                        <Badge variant="outline" className="text-xs">
                          Cliente
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {fines.length === 0 && (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhuma multa encontrada</h3>
              <p className="text-muted-foreground">
                Comece adicionando uma nova multa ou sincronize com o Serpro.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <TrafficFineDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={fetchFines}
      />

      {selectedFine && (
        <TrafficFineDetailsDialog
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          fine={selectedFine}
          onUpdate={fetchFines}
        />
      )}
    </div>
  );
};

export default TrafficFines;