import { useState } from 'react';
import { Plus, Pencil, Trash2, Users, Package, Download } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { ClientAddonsDialog } from '@/components/clients/ClientAddonsDialog';
import { useClients, useDeleteClient } from '@/hooks/useClients';
import { Client } from '@/types/database';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TablePagination } from '@/components/TablePagination';

export default function Clients() {
  const { data: clients, isLoading } = useClients();
  const deleteClient = useDeleteClient();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | undefined>();
  const [addonsDialogOpen, setAddonsDialogOpen] = useState(false);
  const [clientForAddons, setClientForAddons] = useState<Client | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setFormOpen(true);
  };

  const handleDelete = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const handleManageAddons = (client: Client) => {
    setClientForAddons(client);
    setAddonsDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (clientToDelete) {
      await deleteClient.mutateAsync(clientToDelete.id);
      setDeleteDialogOpen(false);
      setClientToDelete(undefined);
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setSelectedClient(undefined);
  };

  // Helper to check if product is recurring
  const isRecurringProduct = (product: { payment_type?: string } | undefined): boolean => {
    return !product || product.payment_type !== 'unico';
  };

  // Calculate total MRR for a client including addons (only recurring products)
  const getClientMrr = (client: Client): number => {
    let mrr = 0;

    // Main product - only if recurring
    if (client.products && isRecurringProduct(client.products)) {
      mrr += client.products.billing_period === 'anual'
        ? Number(client.products.price) / 12
        : Number(client.products.price);
    }

    // Active addons - only recurring ones
    const activeAddons = client.client_addons?.filter(a => a.status === 'active') || [];
    activeAddons.forEach(addon => {
      if (addon.products && isRecurringProduct(addon.products)) {
        const addonMonthly = addon.products.billing_period === 'anual'
          ? Number(addon.products.price) / 12
          : Number(addon.products.price);
        mrr += addonMonthly * addon.quantity;
      }
    });

    return mrr;
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!clients || clients.length === 0) return;

    const headers = ['Nome', 'Email', 'Produto', 'Status', 'Data Entrada', 'Data Cancel.', 'Motivo Cancel.', 'MRR', 'Anotações'];

    const rows = clients.map(client => {
      const mrr = getClientMrr(client);
      return [
        client.name,
        client.email,
        client.products?.name || '-',
        client.status === 'active' ? 'Ativo' : 'Cancelado',
        formatDate(client.start_date),
        client.churn_date ? formatDate(client.churn_date) : '-',
        client.churn_reason || '-',
        mrr.toFixed(2),
        (client.notes || '-').replace(/[\n\r]/g, ' '),
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie sua base de clientes e seus adicionais
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button onClick={() => setFormOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card animate-fade-in">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : clients?.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum cliente cadastrado
              </h3>
              <p className="text-muted-foreground mb-4">
                Comece adicionando seu primeiro cliente.
              </p>
              <Button onClick={() => setFormOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Cliente
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Produto Principal</TableHead>
                    <TableHead>Adicionais</TableHead>
                    <TableHead>MRR</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((client) => {
                    const activeAddons = client.client_addons?.filter(a => a.status === 'active') || [];
                    const clientMrr = getClientMrr(client);

                    return (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell className="text-muted-foreground">{client.email}</TableCell>
                        <TableCell>
                          {client.products ? (
                            <span className="text-sm">
                              {client.products.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {activeAddons.length > 0 ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="secondary" className="cursor-pointer">
                                    {activeAddons.length} ativo{activeAddons.length > 1 ? 's' : ''}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="space-y-1">
                                    {activeAddons.map(addon => (
                                      <div key={addon.id} className="text-xs">
                                        {addon.products?.name} x{addon.quantity}
                                      </div>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-success">
                          {formatCurrency(clientMrr)}/mês
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(client.start_date)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={client.status === 'active' ? 'default' : 'destructive'}
                            className={client.status === 'active' ? 'bg-success/10 text-success border-success/20' : ''}
                          >
                            {client.status === 'active' ? 'Ativo' : 'Cancelado'}
                          </Badge>
                          {client.churn_date && (
                            <span className="text-xs text-muted-foreground ml-2">
                              em {formatDate(client.churn_date)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleManageAddons(client)}
                                  >
                                    <Package className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Gerenciar Adicionais</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(client)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(client)}
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
              <TablePagination
                currentPage={currentPage}
                totalPages={Math.ceil((clients?.length || 0) / itemsPerPage)}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={clients?.length || 0}
              />
            </>
          )}
        </div>
      </div>

      <ClientFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        client={selectedClient}
      />

      {clientForAddons && (
        <ClientAddonsDialog
          open={addonsDialogOpen}
          onOpenChange={setAddonsDialogOpen}
          client={clientForAddons}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{clientToDelete?.name}"?
              Esta ação não pode ser desfeita e todos os adicionais serão removidos.
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