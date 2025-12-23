import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Product } from '@/types/database';
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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateProduct, useUpdateProduct } from '@/hooks/useProducts';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  price: z.string().min(1, 'Preço é obrigatório'),
  billing_period: z.enum(['mensal', 'anual', 'unico']),
});

type FormData = z.infer<typeof formSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
}

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const isEditing = !!product;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      price: '',
      billing_period: 'mensal',
    },
  });

  useEffect(() => {
    if (product) {
      // Map old payment_type=unico to billing_period=unico for backwards compatibility
      let billingPeriod: 'mensal' | 'anual' | 'unico' = product.billing_period;
      if (product.payment_type === 'unico') {
        billingPeriod = 'unico';
      }
      form.reset({
        name: product.name,
        price: String(product.price),
        billing_period: billingPeriod,
      });
    } else {
      form.reset({
        name: '',
        price: '',
        billing_period: 'mensal',
      });
    }
  }, [product, form]);

  const onSubmit = async (data: FormData) => {
    // Derive payment_type from billing_period
    const isOneTime = data.billing_period === 'unico';
    const productData = {
      name: data.name,
      price: parseFloat(data.price),
      billing_period: (isOneTime ? 'mensal' : data.billing_period) as 'mensal' | 'anual',
      payment_type: (isOneTime ? 'unico' : 'recorrente') as 'recorrente' | 'unico',
    };

    if (isEditing && product) {
      await updateProduct.mutateAsync({ id: product.id, ...productData });
    } else {
      await createProduct.mutateAsync(productData);
    }

    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Plano</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Plano Pro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço (R$)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="99.90" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billing_period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequência de Cobrança</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a frequência" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal (Recorrente)</SelectItem>
                      <SelectItem value="anual">Anual (Recorrente)</SelectItem>
                      <SelectItem value="unico">Pagamento Único (Setup/Serviço)</SelectItem>
                    </SelectContent>
                  </Select>
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
                disabled={createProduct.isPending || updateProduct.isPending}
              >
                {isEditing ? 'Salvar' : 'Criar Produto'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
