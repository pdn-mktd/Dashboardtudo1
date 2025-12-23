import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, X, RotateCcw, Trash2 } from 'lucide-react';
import { Client, ClientAddon } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useProducts } from '@/hooks/useProducts';
import { 
  useClientAddons, 
  useCreateClientAddon, 
  useCancelClientAddon,
  useReactivateClientAddon,
  useDeleteClientAddon 
} from '@/hooks/useClientAddons';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface ClientAddonsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
}

export function ClientAddonsDialog({ open, onOpenChange, client }: ClientAddonsDialogProps) {
  const { data: addons, isLoading } = useClientAddons(client.id);
  const { data: products } = useProducts();
  const createAddon = useCreateClientAddon();
  const cancelAddon = useCancelClientAddon();
  const reactivateAddon = useReactivateClientAddon();
  const deleteAddon = useDeleteClientAddon();

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [addonToCancel, setAddonToCancel] = useState<ClientAddon | null>(null);
  const [cancelDate, setCancelDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleAddAddon = async () => {
    if (!selectedProductId) return;
    
    await createAddon.mutateAsync({
      client_id: client.id,
      product_id: selectedProductId,
      quantity,
      start_date: startDate,
    });
    
    setShowAddForm(false);
    setSelectedProductId('');
    setQuantity(1);
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleCancelClick = (addon: ClientAddon) => {
    setAddonToCancel(addon);
    setCancelDate(format(new Date(), 'yyyy-MM-dd'));
    setCancelDialogOpen(true);
  };

  const confirmCancel = async () => {
    if (addonToCancel) {
      await cancelAddon.mutateAsync({
        id: addonToCancel.id,
        end_date: cancelDate,
      });
      setCancelDialogOpen(false);
      setAddonToCancel(null);
    }
  };

  const handleReactivate = async (addon: ClientAddon) => {
    await reactivateAddon.mutateAsync(addon.id);
  };

  const handleDelete = async (addon: ClientAddon) => {
    await deleteAddon.mutateAsync(addon.id);
  };

  const activeAddons = addons?.filter(a => a.status === 'active') || [];
  const cancelledAddons = addons?.filter(a => a.status === 'cancelled') || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Adicionais de {client.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add new addon section */}
            {!showAddForm ? (
              <Button 
                onClick={() => setShowAddForm(true)} 
                variant="outline" 
                className="w-full gap-2"
                disabled={client.status === 'churned'}
              >
                <Plus className="h-4 w-4" />
                Adicionar Produto Extra
              </Button>
            ) : (
              <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Novo Adicional</h4>
                  <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Produto</Label>
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {formatCurrency(Number(product.price))} ({product.billing_period})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Quantidade</Label>
                    <Input 
                      type="number" 
                      min={1} 
                      value={quantity} 
                      onChange={(e) => setQuantity(Number(e.target.value))} 
                    />
                  </div>
                  
                  <div>
                    <Label>Data de Início</Label>
                    <Input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleAddAddon} 
                    disabled={!selectedProductId || createAddon.isPending}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            )}

            {/* Active addons */}
            {activeAddons.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Adicionais Ativos</h4>
                <div className="space-y-2">
                  {activeAddons.map((addon) => (
                    <div key={addon.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{addon.products?.name}</span>
                          <Badge variant="secondary">x{addon.quantity}</Badge>
                          <Badge className="bg-success/10 text-success border-success/20">Ativo</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatCurrency(Number(addon.products?.price || 0) * addon.quantity)} / {addon.products?.payment_type === 'unico' ? 'único' : 'mensal'}
                          {' • '}Início: {formatDate(addon.start_date)}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleCancelClick(addon)}
                        className="text-destructive hover:text-destructive"
                      >
                        Cancelar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cancelled addons */}
            {cancelledAddons.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Adicionais Cancelados</h4>
                <div className="space-y-2">
                  {cancelledAddons.map((addon) => (
                    <div key={addon.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-muted-foreground">{addon.products?.name}</span>
                          <Badge variant="secondary">x{addon.quantity}</Badge>
                          <Badge variant="destructive">Cancelado</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {addon.end_date && `Cancelado em: ${formatDate(addon.end_date)}`}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleReactivate(addon)}
                          title="Reativar"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(addon)}
                          className="text-destructive hover:text-destructive"
                          title="Excluir permanentemente"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isLoading && addons?.length === 0 && !showAddForm && (
              <div className="text-center py-6 text-muted-foreground">
                Nenhum adicional cadastrado para este cliente.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Adicional</AlertDialogTitle>
            <AlertDialogDescription>
              Informe a data de cancelamento do adicional "{addonToCancel?.products?.name}".
              O histórico será preservado para análise.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Data de Cancelamento</Label>
            <Input 
              type="date" 
              value={cancelDate} 
              onChange={(e) => setCancelDate(e.target.value)} 
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}