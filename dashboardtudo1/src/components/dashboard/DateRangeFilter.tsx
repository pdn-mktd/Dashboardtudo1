import { useState } from 'react';
import { format, subMonths, subYears, startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DateRangeFilterProps {
  startDate: Date;
  endDate: Date;
  onDateChange: (start: Date, end: Date) => void;
  comparisonStartDate?: Date;
  comparisonEndDate?: Date;
  onComparisonChange?: (start: Date | undefined, end: Date | undefined) => void;
}

const presets = [
  { label: 'Este mês', getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
  { label: 'Últimos 3 meses', getValue: () => ({ start: startOfMonth(subMonths(new Date(), 2)), end: endOfMonth(new Date()) }) },
  { label: 'Últimos 6 meses', getValue: () => ({ start: startOfMonth(subMonths(new Date(), 5)), end: endOfMonth(new Date()) }) },
  { label: 'Este ano', getValue: () => ({ start: startOfYear(new Date()), end: endOfYear(new Date()) }) },
  { label: 'Ano passado', getValue: () => ({ start: startOfYear(subYears(new Date(), 1)), end: endOfYear(subYears(new Date(), 1)) }) },
];

export function DateRangeFilter({
  startDate,
  endDate,
  onDateChange,
  comparisonStartDate,
  comparisonEndDate,
  onComparisonChange,
}: DateRangeFilterProps) {
  const [isComparing, setIsComparing] = useState(false);

  const handlePresetChange = (value: string) => {
    const preset = presets.find(p => p.label === value);
    if (preset) {
      const { start, end } = preset.getValue();
      onDateChange(start, end);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-card rounded-xl border border-border animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Período:</span>
        <Select onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecionar período" />
          </SelectTrigger>
          <SelectContent>
            {presets.map((preset) => (
              <SelectItem key={preset.label} value={preset.label}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal',
                !startDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inicial'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => date && onDateChange(date, endDate)}
              initialFocus
              locale={ptBR}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground">até</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal',
                !endDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Data final'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={(date) => date && onDateChange(startDate, date)}
              initialFocus
              locale={ptBR}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {onComparisonChange && (
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant={isComparing ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setIsComparing(!isComparing);
              if (isComparing) {
                onComparisonChange(undefined, undefined);
              } else {
                // Default comparison: same period last year
                onComparisonChange(subYears(startDate, 1), subYears(endDate, 1));
              }
            }}
          >
            {isComparing ? 'Remover Comparação' : 'Comparar'}
          </Button>

          {isComparing && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'justify-start text-left font-normal',
                      !comparisonStartDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {comparisonStartDate ? format(comparisonStartDate, 'dd/MM/yy') : 'Início'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={comparisonStartDate}
                    onSelect={(date) => date && onComparisonChange(date, comparisonEndDate)}
                    initialFocus
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'justify-start text-left font-normal',
                      !comparisonEndDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {comparisonEndDate ? format(comparisonEndDate, 'dd/MM/yy') : 'Fim'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={comparisonEndDate}
                    onSelect={(date) => date && onComparisonChange(comparisonStartDate, date)}
                    initialFocus
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
      )}
    </div>
  );
}
