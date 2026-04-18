import { useState } from 'react';
import { format } from 'date-fns';
import { Pause } from 'lucide-react';
import { Client } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePauseClient } from '@/hooks/useClientPauses';

interface ClientPauseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
}

export function ClientPauseDialog({ open, onOpenChange, client }: ClientPauseDialogProps) {
  const pauseClient = usePauseClient();

  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const handlePause = async () => {
    await pauseClient.mutateAsync({
      clientId: client.id,
      startDate,
      endDate: endDate || undefined,
      reason: reason || undefined,
    });
    onOpenChange(false);
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setEndDate('');
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause className="h-5 w-5 text-amber-500" />
            Pausar Assinatura
          </DialogTitle>
          <DialogDescription>
            Pausar a assinatura de <strong>{client.name}</strong>. O cliente não será contabilizado como churn, mas o MRR e faturamento ficarão suspensos durante a pausa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label>Data de Início da Pausa *</Label>
            <Input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
          </div>

          <div>
            <Label>Data de Fim da Pausa (opcional)</Label>
            <Input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
            <p className="text-xs text-muted-foreground mt-1">
              Deixe em branco se não souber quando a pausa termina.
            </p>
          </div>

          <div>
            <Label>Motivo da Pausa (opcional)</Label>
            <Textarea 
              placeholder="Ex: Viagem, férias, problemas financeiros temporários..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handlePause} 
            disabled={!startDate || pauseClient.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            ⏸️ Confirmar Pausa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
