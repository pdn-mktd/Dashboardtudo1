import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Client } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateClient, useUpdateClient } from '@/hooks/useClients';
import { useProducts } from '@/hooks/useProducts';
import { ArrowUpCircle } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  product_id: z.string().min(1, 'Produto é obrigatório'),
  status: z.enum(['active', 'churned']),
  start_date: z.string().min(1, 'Data de entrada é obrigatória'),
  plan_change_date: z.string().optional(),
  churn_date: z.string().optional(),
  churn_reason: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
}

export function ClientFormDialog({ open, onOpenChange, client }: ClientFormDialogProps) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const { data: products } = useProducts();
  const isEditing = !!client;

  // Rastreia o produto original para detectar mudança de plano (upsell/downgrade)
  const [originalProductId, setOriginalProductId] = useState<string | null>(null);
  const [showPlanChangeDate, setShowPlanChangeDate] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      product_id: '',
      status: 'active',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      plan_change_date: format(new Date(), 'yyyy-MM-dd'),
      churn_date: '',
      churn_reason: '',
      notes: '',
    },
  });

  const status = form.watch('status');
  const currentProductId = form.watch('product_id');

  // Detecta mudança de plano
  useEffect(() => {
    if (isEditing && originalProductId && currentProductId !== originalProductId) {
      setShowPlanChangeDate(true);
    } else {
      setShowPlanChangeDate(false);
    }
  }, [currentProductId, originalProductId, isEditing]);

  useEffect(() => {
    if (client) {
      setOriginalProductId(client.product_id);
      form.reset({
        name: client.name,
        email: client.email,
        product_id: client.product_id || '',
        status: client.status,
        start_date: client.start_date,
        plan_change_date: format(new Date(), 'yyyy-MM-dd'),
        churn_date: client.churn_date || '',
        churn_reason: client.churn_reason || '',
        notes: client.notes || '',
      });
    } else {
      setOriginalProductId(null);
      form.reset({
        name: '',
        email: '',
        product_id: '',
        status: 'active',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        plan_change_date: format(new Date(), 'yyyy-MM-dd'),
        churn_date: '',
        churn_reason: '',
        notes: '',
      });
    }
  }, [client, form]);

  // Calcula a diferença de valor entre planos para exibir
  const getUpgradeInfo = () => {
    if (!originalProductId || !currentProductId || originalProductId === currentProductId) return null;

    const oldProduct = products?.find(p => p.id === originalProductId);
    const newProduct = products?.find(p => p.id === currentProductId);

    if (!oldProduct || !newProduct) return null;

    const oldPrice = Number(oldProduct.price);
    const newPrice = Number(newProduct.price);
    const diff = newPrice - oldPrice;

    return {
      isUpgrade: diff > 0,
      diff: Math.abs(diff),
      oldName: oldProduct.name,
      newName: newProduct.name,
    };
  };

  const upgradeInfo = getUpgradeInfo();

  const onSubmit = async (data: FormData) => {
    const clientData: Record<string, unknown> = {
      name: data.name,
      email: data.email,
      product_id: data.product_id,
      status: data.status as 'active' | 'churned',
      start_date: data.start_date,
      churn_date: data.status === 'churned' && data.churn_date ? data.churn_date : null,
    };

    // Se houve mudança de plano, salva a data da alteração
    if (showPlanChangeDate && data.plan_change_date) {
      clientData.plan_change_date = data.plan_change_date;
    }

    if (isEditing && client) {
      await updateClient.mutateAsync({ id: client.id, ...clientData } as Parameters<typeof updateClient.mutateAsync>[0]);
    } else {
      await createClient.mutateAsync(clientData as Parameters<typeof createClient.mutateAsync>[0]);
    }

    onOpenChange(false);
    form.reset();
    setShowPlanChangeDate(false);
    setOriginalProductId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="product_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um produto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - R$ {Number(product.price).toFixed(2)} ({product.billing_period})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Seção de Upsell/Downgrade */}
            {showPlanChangeDate && upgradeInfo && (
              <div className={`p-3 rounded-lg border ${upgradeInfo.isUpgrade ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpCircle className={`h-5 w-5 ${upgradeInfo.isUpgrade ? 'text-emerald-500' : 'text-amber-500 rotate-180'}`} />
                  <span className={`font-medium ${upgradeInfo.isUpgrade ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {upgradeInfo.isUpgrade ? 'Upsell Detectado!' : 'Downgrade Detectado'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {upgradeInfo.oldName} → {upgradeInfo.newName} ({upgradeInfo.isUpgrade ? '+' : '-'}R$ {upgradeInfo.diff.toFixed(2)}/mês)
                </p>
                <FormField
                  control={form.control}
                  name="plan_change_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data da Alteração de Plano</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Entrada</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="churned">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {status === 'churned' && (
              <>
                <FormField
                  control={form.control}
                  name="churn_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Cancelamento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="churn_reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo do Cancelamento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o motivo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="preco">Preço alto</SelectItem>
                          <SelectItem value="concorrente">Foi para concorrente</SelectItem>
                          <SelectItem value="nao_usa">Não usa o produto</SelectItem>
                          <SelectItem value="suporte">Insatisfação com suporte</SelectItem>
                          <SelectItem value="funcionalidade">Falta de funcionalidades</SelectItem>
                          <SelectItem value="financeiro">Problemas financeiros</SelectItem>
                          <SelectItem value="fechou">Empresa fechou</SelectItem>
                          <SelectItem value="outro">Outro motivo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anotações / Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Anotações sobre o cliente..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createClient.isPending || updateClient.isPending}
              >
                {isEditing ? 'Salvar' : 'Cadastrar Cliente'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

