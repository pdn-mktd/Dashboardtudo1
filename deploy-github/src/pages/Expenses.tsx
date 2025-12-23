import { useState } from 'react';
import { Plus, Pencil, Trash2, Receipt } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { ExpenseFormDialog } from '@/components/expenses/ExpenseFormDialog';
import { useExpenses, useDeleteExpense } from '@/hooks/useExpenses';
import { Expense } from '@/types/database';
import { formatCurrency, formatMonthYear } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

export default function Expenses() {
  const { data: expenses, isLoading } = useExpenses();
  const deleteExpense = useDeleteExpense();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | undefined>();

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setFormOpen(true);
  };

  const handleDelete = (expense: Expense) => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (expenseToDelete) {
      await deleteExpense.mutateAsync(expenseToDelete.id);
      setDeleteDialogOpen(false);
      setExpenseToDelete(undefined);
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setSelectedExpense(undefined);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Despesas</h1>
            <p className="text-muted-foreground mt-1">
              Registre seus gastos com marketing e vendas
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Despesa
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card animate-fade-in">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : expenses?.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhuma despesa registrada
              </h3>
              <p className="text-muted-foreground mb-4">
                Registre suas despesas mensais para calcular o CAC.
              </p>
              <Button onClick={() => setFormOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Registrar Despesa
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês/Ano</TableHead>
                  <TableHead>Marketing</TableHead>
                  <TableHead>Vendas</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses?.map((expense) => {
                  const total = Number(expense.marketing_spend) + Number(expense.sales_spend);
                  return (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium capitalize">
                        {formatMonthYear(expense.month_year)}
                      </TableCell>
                      <TableCell>{formatCurrency(Number(expense.marketing_spend))}</TableCell>
                      <TableCell>{formatCurrency(Number(expense.sales_spend))}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(total)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(expense)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(expense)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        expense={selectedExpense}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta despesa?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
