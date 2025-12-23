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

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  product_id: z.string().min(1, 'Produto é obrigatório'),
  status: z.enum(['active', 'churned']),
  start_date: z.string().min(1, 'Data de entrada é obrigatória'),
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      product_id: '',
      status: 'active',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      churn_date: '',
      churn_reason: '',
      notes: '',
    },
  });

  const status = form.watch('status');

  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        email: client.email,
        product_id: client.product_id || '',
        status: client.status,
        start_date: client.start_date,
        churn_date: client.churn_date || '',
        churn_reason: client.churn_reason || '',
        notes: client.notes || '',
      });
    } else {
      form.reset({
        name: '',
        email: '',
        product_id: '',
        status: 'active',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        churn_date: '',
        churn_reason: '',
        notes: '',
      });
    }
  }, [client, form]);

  const onSubmit = async (data: FormData) => {
    // Note: churn_reason and notes fields need to be added to Supabase database first
    // Run this SQL in Supabase:
    // ALTER TABLE clients ADD COLUMN churn_reason TEXT NULL;
    // ALTER TABLE clients ADD COLUMN notes TEXT NULL;
    const clientData: Record<string, unknown> = {
      name: data.name,
      email: data.email,
      product_id: data.product_id,
      status: data.status as 'active' | 'churned',
      start_date: data.start_date,
      churn_date: data.status === 'churned' && data.churn_date ? data.churn_date : null,
    };

    // Only include these fields if they have values (they may not exist in DB yet)
    // Uncomment after adding columns to Supabase:
    // if (data.churn_reason) clientData.churn_reason = data.churn_reason;
    // if (data.notes) clientData.notes = data.notes;

    if (isEditing && client) {
      await updateClient.mutateAsync({ id: client.id, ...clientData } as Parameters<typeof updateClient.mutateAsync>[0]);
    } else {
      await createClient.mutateAsync(clientData as Parameters<typeof createClient.mutateAsync>[0]);
    }

    onOpenChange(false);
    form.reset();
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
