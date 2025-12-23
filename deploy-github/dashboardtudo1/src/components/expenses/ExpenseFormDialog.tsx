import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Expense } from '@/types/database';
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
import { useCreateExpense, useUpdateExpense } from '@/hooks/useExpenses';

const formSchema = z.object({
  month_year: z.string().min(1, 'Mês/Ano é obrigatório'),
  marketing_spend: z.string().min(1, 'Gasto com marketing é obrigatório').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
    { message: 'Valor deve ser um número positivo' }
  ),
  sales_spend: z.string().min(1, 'Gasto com vendas é obrigatório').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
    { message: 'Valor deve ser um número positivo' }
  ),
});

type FormData = z.infer<typeof formSchema>;

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense;
}

export function ExpenseFormDialog({ open, onOpenChange, expense }: ExpenseFormDialogProps) {
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const isEditing = !!expense;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      month_year: format(new Date(), 'yyyy-MM-01'),
      marketing_spend: '',
      sales_spend: '',
    },
  });

  useEffect(() => {
    if (expense) {
      form.reset({
        month_year: expense.month_year,
        marketing_spend: String(expense.marketing_spend),
        sales_spend: String(expense.sales_spend),
      });
    } else {
      form.reset({
        month_year: format(new Date(), 'yyyy-MM-01'),
        marketing_spend: '',
        sales_spend: '',
      });
    }
  }, [expense, form]);

  const onSubmit = async (data: FormData) => {
    // Convert month input (yyyy-MM) to date format (yyyy-MM-01)
    const monthYearDate = data.month_year.length === 7 
      ? `${data.month_year}-01` 
      : data.month_year;

    const expenseData = {
      month_year: monthYearDate,
      marketing_spend: parseFloat(data.marketing_spend),
      sales_spend: parseFloat(data.sales_spend),
    };

    try {
      if (isEditing && expense) {
        await updateExpense.mutateAsync({ id: expense.id, ...expenseData });
      } else {
        await createExpense.mutateAsync(expenseData);
      }

      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled by mutation hooks
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="month_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mês/Ano</FormLabel>
                  <FormControl>
                    <Input type="month" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="marketing_spend"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gasto com Marketing (R$)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sales_spend"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gasto com Vendas (R$)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
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
                disabled={createExpense.isPending || updateExpense.isPending}
              >
                {isEditing ? 'Salvar' : 'Registrar Despesa'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
