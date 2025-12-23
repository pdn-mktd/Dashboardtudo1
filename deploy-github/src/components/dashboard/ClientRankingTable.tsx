import { useState, useMemo } from 'react';
import { Trophy, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/formatters';
import { differenceInMonths } from 'date-fns';

interface ClientWithProduct {
  id: string;
  name: string;
  status: string;
  start_date: string;
  churn_date: string | null;
  products?: {
    price: number;
    billing_period: string;
    payment_type?: string;
  } | null;
  client_addons?: Array<{
    quantity: number;
    status: string;
    start_date: string;
    end_date: string | null;
    products?: {
      price: number;
      billing_period: string;
      payment_type?: string;
    } | null;
  }>;
}

interface ClientRankingTableProps {
  clients: ClientWithProduct[];
}

type FilterType = 'all' | 'active' | 'churned';
type SortType = 'ltv' | 'tenure';

// Helper to check if product is recurring
const isRecurringProduct = (product: { payment_type?: string } | undefined | null): boolean => {
  return !product || product.payment_type !== 'unico';
};

export function ClientRankingTable({ clients }: ClientRankingTableProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('ltv');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const calculateMonthlyValue = (client: ClientWithProduct): number => {
    let monthly = 0;
    
    // Main product (only recurring)
    if (client.products && isRecurringProduct(client.products)) {
      const price = client.products.price;
      monthly += client.products.billing_period === 'anual' ? price / 12 : price;
    }
    
    // Add-ons (only active and recurring ones)
    if (client.client_addons) {
      client.client_addons.forEach(addon => {
        if (addon.status === 'active' && addon.products && isRecurringProduct(addon.products)) {
          const addonPrice = addon.products.price * addon.quantity;
          monthly += addon.products.billing_period === 'anual' ? addonPrice / 12 : addonPrice;
        }
      });
    }
    
    return monthly;
  };

  const calculateTenureMonths = (client: ClientWithProduct): number => {
    const startDate = new Date(client.start_date);
    const endDate = client.churn_date ? new Date(client.churn_date) : new Date();
    // +1 because the activation month already counts as month 1 (cash basis - payment received on activation)
    return Math.max(1, differenceInMonths(endDate, startDate) + 1);
  };

  const formatTenure = (months: number): string => {
    if (months < 12) {
      return `${months} ${months === 1 ? 'mês' : 'meses'}`;
    }
    const years = (months / 12).toFixed(1);
    return `${years} ${parseFloat(years) === 1 ? 'ano' : 'anos'}`;
  };

  // Novo cálculo de LTV real considerando período de cada addon
  // Pagamentos únicos são somados apenas uma vez (não multiplicados por tempo)
  const calculateRealLTV = (client: ClientWithProduct): number => {
    const clientEndDate = client.churn_date ? new Date(client.churn_date) : new Date();
    let totalLTV = 0;

    // Parte A: Plano Base
    if (client.products) {
      if (isRecurringProduct(client.products)) {
        // Recorrente: × Meses de Casa
        const tenureMonths = calculateTenureMonths(client);
        const baseMonthly = client.products.billing_period === 'anual' 
          ? client.products.price / 12 
          : client.products.price;
        totalLTV += baseMonthly * tenureMonths;
      } else {
        // Pagamento único: soma apenas uma vez
        totalLTV += client.products.price;
      }
    }

    // Parte B: Cada addon × seu período específico de atividade
    if (client.client_addons) {
      client.client_addons.forEach(addon => {
        if (addon.products) {
          if (isRecurringProduct(addon.products)) {
            // Addon recorrente: calcula por período
            const addonStart = new Date(addon.start_date);
            const addonEnd = addon.end_date 
              ? new Date(addon.end_date) 
              : clientEndDate;
            
            const addonMonths = Math.max(1, differenceInMonths(addonEnd, addonStart));
            const addonMonthly = addon.products.billing_period === 'anual'
              ? (addon.products.price * addon.quantity) / 12
              : addon.products.price * addon.quantity;
            
            totalLTV += addonMonthly * addonMonths;
          } else {
            // Addon de pagamento único: soma apenas uma vez
            totalLTV += addon.products.price * addon.quantity;
          }
        }
      });
    }

    return totalLTV;
  };

  const processedClients = useMemo(() => {
    return clients.map(client => {
      const tenureMonths = calculateTenureMonths(client);
      const ltv = calculateRealLTV(client);
      const averageTicket = tenureMonths > 0 ? ltv / tenureMonths : 0;
      
      return {
        ...client,
        monthlyValue: calculateMonthlyValue(client),
        tenureMonths,
        ltv,
        averageTicket,
      };
    });
  }, [clients]);

  const filteredAndSortedClients = useMemo(() => {
    let result = [...processedClients];
    
    // Apply filter
    if (filter === 'active') {
      result = result.filter(c => c.status === 'active');
    } else if (filter === 'churned') {
      result = result.filter(c => c.status === 'churned');
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === 'ltv') {
        return b.ltv - a.ltv;
      } else {
        return b.tenureMonths - a.tenureMonths;
      }
    });
    
    return result;
  }, [processedClients, filter, sortBy]);

  const totalPages = Math.ceil(filteredAndSortedClients.length / itemsPerPage);
  const paginatedClients = filteredAndSortedClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const toggleSort = (newSort: SortType) => {
    setSortBy(newSort);
    setCurrentPage(1);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Ranking de Clientes 🏆
        </CardTitle>
        
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('all')}
          >
            Todos
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('active')}
          >
            Ativos
          </Button>
          <Button
            variant={filter === 'churned' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('churned')}
          >
            Cancelados
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredAndSortedClients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum cliente encontrado
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`-ml-3 h-8 ${sortBy === 'tenure' ? 'text-primary' : ''}`}
                        onClick={() => toggleSort('tenure')}
                      >
                        Tempo de Casa
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Mensalidade</TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`-mr-3 h-8 ${sortBy === 'ltv' ? 'text-primary' : ''}`}
                        onClick={() => toggleSort('ltv')}
                      >
                        Total Gasto (LTV)
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClients.map((client, index) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {sortBy === 'ltv' && index === 0 && currentPage === 1 && (
                            <span className="text-lg">🥇</span>
                          )}
                          {sortBy === 'ltv' && index === 1 && currentPage === 1 && (
                            <span className="text-lg">🥈</span>
                          )}
                          {sortBy === 'ltv' && index === 2 && currentPage === 1 && (
                            <span className="text-lg">🥉</span>
                          )}
                          {client.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.status === 'active' ? 'default' : 'destructive'}>
                          {client.status === 'active' ? 'Ativo' : 'Cancelado'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatTenure(client.tenureMonths)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(client.monthlyValue)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(client.ltv)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(client.averageTicket)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredAndSortedClients.length)} de {filteredAndSortedClients.length} clientes
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
