import { useState } from 'react';
import { format } from 'date-fns';
import { Play } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useReactivateClient } from '@/hooks/useClientPauses';

interface ClientReactivateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
}

export function ClientReactivateDialog({ open, onOpenChange, client }: ClientReactivateDialogProps) {
  const reactivateClient = useReactivateClient();

  const [reactivationDate, setReactivationDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [updateBillingCycle, setUpdateBillingCycle] = useState(false);

  const handleReactivate = async () => {
    await reactivateClient.mutateAsync({
      clientId: client.id,
      reactivationDate,
      updateBillingCycle,
    });
    onOpenChange(false);
    setReactivationDate(format(new Date(), 'yyyy-MM-dd'));
    setUpdateBillingCycle(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-emerald-500" />
            Reativar Assinatura
          </DialogTitle>
          <DialogDescription>
            Reativar a assinatura de <strong>{client.name}</strong>. O cliente voltará a ser contabilizado no MRR e faturamento a partir da data de reativação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label>Data de Reativação *</Label>
            <Input 
              type="date" 
              value={reactivationDate} 
              onChange={(e) => setReactivationDate(e.target.value)} 
            />
            <p className="text-xs text-muted-foreground mt-1">
              A pausa será encerrada nesta data e o cliente voltará ao status ativo.
            </p>
          </div>

          <div className="flex items-start space-x-2 pt-2">
            <Checkbox 
              id="update-cycle" 
              checked={updateBillingCycle}
              onCheckedChange={(checked) => setUpdateBillingCycle(checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="update-cycle"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Reiniciar ciclo de cobrança
              </label>
              <p className="text-xs text-muted-foreground">
                Se marcado, a data base para as próximas cobranças passará a ser no dia {reactivationDate ? format(new Date(reactivationDate), 'dd') : 'selecionado'}. 
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleReactivate} 
            disabled={!reactivationDate || reactivateClient.isPending}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            ▶️ Confirmar Reativação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
