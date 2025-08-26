import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'contracts' | 'maintenance' | 'reports' | 'invoices';
  onApplyFilters: (filters: any) => void;
}

const FilterDialog = ({ open, onOpenChange, type, onApplyFilters }: FilterDialogProps) => {
  const [filters, setFilters] = useState<any>({});
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const handleApplyFilters = () => {
    const appliedFilters = {
      ...filters,
      dateFrom,
      dateTo,
    };
    onApplyFilters(appliedFilters);
    onOpenChange(false);
  };

  const getFilterTitle = () => {
    switch (type) {
      case 'contracts': return 'Filtros de Contratos';
      case 'maintenance': return 'Filtros de Manutenção';
      case 'reports': return 'Filtros de Relatórios';
      case 'invoices': return 'Filtros de Faturas';
      default: return 'Filtros';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {getFilterTitle()}
          </DialogTitle>
          <DialogDescription>
            Configure os filtros para refinar sua busca
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Status Filter */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select onValueChange={(value) => setFilters({...filters, status: value})}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {type === 'contracts' && (
                  <>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                  </>
                )}
                {type === 'maintenance' && (
                  <>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </>
                )}
                {type === 'invoices' && (
                  <>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Período
            </Label>
            <div className="col-span-3 space-y-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP", { locale: ptBR }) : "Data inicial"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP", { locale: ptBR }) : "Data final"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Vehicle Filter */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vehicle" className="text-right">
              Veículo
            </Label>
            <Input
              id="vehicle"
              placeholder="Placa do veículo"
              className="col-span-3"
              onChange={(e) => setFilters({...filters, vehicle: e.target.value})}
            />
          </div>

          {/* Value Range for Invoices */}
          {type === 'invoices' && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="minValue" className="text-right">
                  Valor mín.
                </Label>
                <Input
                  id="minValue"
                  type="number"
                  placeholder="0,00"
                  className="col-span-3"
                  onChange={(e) => setFilters({...filters, minValue: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="maxValue" className="text-right">
                  Valor máx.
                </Label>
                <Input
                  id="maxValue"
                  type="number"
                  placeholder="999999,99"
                  className="col-span-3"
                  onChange={(e) => setFilters({...filters, maxValue: e.target.value})}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApplyFilters} className="bg-gradient-primary hover:opacity-90">
            Aplicar Filtros
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilterDialog;