import { Client } from '@/types/database';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface RecentClientsTableProps {
  clients: Client[];
}

export function RecentClientsTable({ clients }: RecentClientsTableProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-card animate-slide-up" style={{ animationDelay: '400ms' }}>
      <h3 className="text-lg font-semibold text-foreground mb-4">Últimos Clientes Cadastrados</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum cliente cadastrado ainda.
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell className="text-muted-foreground">{client.email}</TableCell>
                  <TableCell>
                    {client.products ? (
                      <span className="text-sm">
                        {client.products.name} - {formatCurrency(Number(client.products.price))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(client.start_date)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={client.status === 'active' ? 'default' : 'destructive'}
                      className={client.status === 'active' ? 'bg-success/10 text-success border-success/20' : ''}
                    >
                      {client.status === 'active' ? 'Ativo' : 'Cancelado'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
