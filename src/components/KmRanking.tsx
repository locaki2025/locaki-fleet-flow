import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trophy, Download, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DriverRanking {
  id: string;
  name: string;
  plate: string;
  totalKm: number;
  dailyAverage: number;
  isAdjusted: boolean;
  position: number;
}

const KmRanking = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<DriverRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [topCount, setTopCount] = useState("10");
  const [leader, setLeader] = useState<DriverRanking | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);

  useEffect(() => {
    if (user) {
      fetchKmRankingData();
    }
  }, [user]);

  const fetchKmRankingData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Buscar devices do usuário
      const { data: devices, error: devicesError } = await supabase
        .from('devices')
        .select(`
          id,
          name,
          vehicle_plate,
          status,
          last_update
        `)
        .eq('user_id', user.id);

      if (devicesError) throw devicesError;

      if (!devices || devices.length === 0) {
        setDrivers([]);
        setLeader(null);
        setTotalDistance(0);
        return;
      }

      // Por enquanto, simular dados de KM mais realistas baseados nos devices
      // TODO: Usar a função get_device_total_km quando os tipos forem atualizados
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const rankingData: DriverRanking[] = devices.map((device, index) => {
        // Simular KM baseado no status e última atualização do device
        const isActive = device.status === 'online';
        const lastUpdate = new Date(device.last_update);
        const daysSinceUpdate = Math.min(7, Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)));
        
        // Devices online percorrem mais KM
        const baseKm = isActive ? 
          Math.floor(Math.random() * 1500) + 300 : // 300-1800 km para devices online
          Math.floor(Math.random() * 800) + 50;    // 50-850 km para devices offline
        
        // Reduzir KM baseado em dias offline
        const adjustedKm = Math.max(0, baseKm - (daysSinceUpdate * 50));
        const dailyAverage = Math.round(adjustedKm / 7);
        
        // 25% chance de ter dados "ajustados" (correções manuais)
        const isAdjusted = Math.random() > 0.75;
        
        return {
          id: device.id,
          name: device.name || `Motorista ${device.vehicle_plate}`,
          plate: device.vehicle_plate,
          totalKm: Math.round(adjustedKm),
          dailyAverage,
          isAdjusted,
          position: index + 1
        };
      });

      // Ordenar por KM total (decrescente) e atribuir posições
      const sortedRanking = rankingData
        .filter(driver => driver.totalKm > 0) // Apenas devices com KM > 0
        .sort((a, b) => b.totalKm - a.totalKm)
        .map((driver, index) => ({
          ...driver,
          position: index + 1
        }));

      setDrivers(sortedRanking);
      setLeader(sortedRanking[0] || null);
      setTotalDistance(sortedRanking.reduce((sum, driver) => sum + driver.totalKm, 0));

    } catch (error) {
      console.error('Erro ao carregar ranking de KM:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o ranking de quilometragem.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Posição,Nome,Placa,Total KM,Média Diária,Tipo\n"
      + drivers.slice(0, parseInt(topCount)).map(driver => 
          `${driver.position},${driver.name},${driver.plate},${driver.totalKm},${driver.dailyAverage},${driver.isAdjusted ? 'Ajustado' : 'Normal'}`
        ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ranking_km_ultimos_7_dias.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Exportação concluída",
      description: "Ranking exportado com sucesso para CSV.",
    });
  };

  const getBarWidth = (km: number) => {
    if (drivers.length === 0) return 0;
    const maxKm = drivers[0]?.totalKm || 1;
    return (km / maxKm) * 100;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Ranking Por KM - Últimos 7 dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando ranking...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Ranking Por KM - Últimos 7 dias
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
                Normal
              </Badge>
              <Badge variant="outline" className="bg-orange-100 text-orange-600 border-orange-300">
                Ajustado
              </Badge>
            </div>
            <Select value={topCount} onValueChange={setTopCount}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Top 5</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="15">Top 15</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {leader && (
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-primary">Líder</h4>
                <p className="font-bold text-lg">{leader.name} - {leader.plate}</p>
                <p className="text-sm text-muted-foreground">
                  {leader.totalKm.toLocaleString()} km — Média diária de {leader.dailyAverage} km
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total percorrido (7d)</p>
                <p className="text-2xl font-bold text-primary">
                  {totalDistance.toLocaleString()} km
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {drivers.slice(0, parseInt(topCount)).map((driver) => (
            <div key={driver.id} className="flex items-center gap-3 p-2">
              <div className="w-60 text-sm">
                <div className="font-medium truncate">
                  {driver.name} - {driver.plate}
                </div>
              </div>
              
              <div className="flex-1 relative">
                <div className="h-6 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      driver.isAdjusted 
                        ? 'bg-orange-400' 
                        : 'bg-primary'
                    }`}
                    style={{ width: `${getBarWidth(driver.totalKm)}%` }}
                  />
                </div>
                <div className="absolute right-2 top-0 h-6 flex items-center">
                  <span className="text-xs font-medium text-white mix-blend-difference">
                    {driver.totalKm.toLocaleString()} km
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {drivers.length === 0 && (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Nenhum dispositivo com dados de localização encontrado.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Certifique-se de que seus dispositivos GPS estão ativos e enviando dados.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KmRanking;