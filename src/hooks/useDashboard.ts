import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardMetrics, Client, Expense, ClientAddon, Transaction } from '@/types/database';
import { startOfMonth, endOfMonth, format, subMonths, parseISO, isWithinInterval, differenceInMonths, isBefore, isAfter, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UseDashboardParams {
  startDate: Date;
  endDate: Date;
}

// Helper to calculate monthly price from a product (only for recurring products)
export const getMonthlyPrice = (price: number, billingPeriod: string): number => {
  return billingPeriod === 'anual' ? price / 12 : price;
};

// Check if product is recurring (for MRR calculations)
export const isRecurringProduct = (product: { payment_type?: string } | undefined): boolean => {
  // Default to 'recorrente' for backwards compatibility
  return !product || product.payment_type !== 'unico';
};

// Check if client was active at a specific date
export const wasClientActiveAt = (client: Client, date: Date): boolean => {
  const clientStartDate = parseISO(client.start_date);
  if (clientStartDate > date) return false;

  if (client.status === 'churned' && client.churn_date) {
    const churnDate = parseISO(client.churn_date);
    return churnDate > date;
  }

  return client.status === 'active';
};

// Check if addon was active at a specific date
export const wasAddonActiveAt = (addon: ClientAddon, date: Date): boolean => {
  const addonStartDate = parseISO(addon.start_date);
  if (addonStartDate > date) return false;

  if (addon.status === 'cancelled' && addon.end_date) {
    const endDate = parseISO(addon.end_date);
    return endDate > date;
  }

  return addon.status === 'active';
};

// Calculate MRR for a specific date, including add-ons (only recurring products)
// MRR = Potential Monthly Recurring Revenue from ALL active clients
export const calculateMrrAtDate = (clients: Client[], addons: ClientAddon[], date: Date): number => {
  let mrr = 0;

  // Main product MRR (all active recurring clients)
  clients.forEach(client => {
    if (wasClientActiveAt(client, date) && client.products && isRecurringProduct(client.products)) {
      mrr += getMonthlyPrice(Number(client.products.price), client.products.billing_period);
    }
  });

  // Add-ons MRR (only recurring)
  addons.forEach(addon => {
    const client = clients.find(c => c.id === addon.client_id);
    if (client && wasClientActiveAt(client, date) && wasAddonActiveAt(addon, date) && addon.products && isRecurringProduct(addon.products)) {
      const addonMonthlyPrice = getMonthlyPrice(Number(addon.products.price), addon.products.billing_period);
      mrr += addonMonthlyPrice * addon.quantity;
    }
  });

  return mrr;
};

// Helper function to calculate metrics for a date range
const calculateMetrics = (
  clients: Client[],
  expenses: Expense[],
  addons: ClientAddon[],
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): DashboardMetrics => {
  // Active clients at the end of the period (only count those with recurring products for MRR purposes)
  const activeClients = clients.filter(c => wasClientActiveAt(c, endDate));
  const activeClientsWithRecurring = activeClients.filter(c => c.products && isRecurringProduct(c.products));

  // Calculate MRR at end of period (all active clients with recurring products)
  // MRR = Potential monthly revenue from ALL active subscriptions
  const mrr = calculateMrrAtDate(clients, addons, endDate);

  // ARR = MRR * 12
  const arr = mrr * 12;

  // Ticket Médio - MRR divided by active clients with recurring products
  const ticketMedio = activeClientsWithRecurring.length > 0 ? mrr / activeClientsWithRecurring.length : 0;

  const newClientsInPeriod = clients.filter(c => {
    const clientStartDate = parseISO(c.start_date);
    return isWithinInterval(clientStartDate, { start: startDate, end: endDate });
  });
  const newClientsThisMonth = newClientsInPeriod.length;

  // Calcular média de novos clientes nos últimos 6 meses (para projeção mais realista)
  const sixMonthsAgo = subMonths(endDate, 6);
  const newClientsLast6Months = clients.filter(c => {
    const clientStartDate = parseISO(c.start_date);
    return isWithinInterval(clientStartDate, { start: sixMonthsAgo, end: endDate });
  }).length;
  // Se o período for menor que 6 meses, ajusta o divisor, mas mínimo de 1 para evitar divisão por zero
  const monthsDiff = Math.max(1, differenceInMonths(endDate, sixMonthsAgo));
  const averageNewClientsLast6Months = Math.round(newClientsLast6Months / monthsDiff) || 1;

  // Churned in the selected period
  const churnedInPeriod = clients.filter(c => {
    if (c.status !== 'churned' || !c.churn_date) return false;
    const churnDate = parseISO(c.churn_date);
    return isWithinInterval(churnDate, { start: startDate, end: endDate });
  });
  const churnedThisMonth = churnedInPeriod.length;

  // Clients at start of the period (were active at the beginning)
  const clientsAtStartOfPeriod = clients.filter(c => wasClientActiveAt(c, startDate)).length;

  // Churn Rate Calculation
  // Formula: (Churned / Average Clients) × 100
  // Average Clients = (clients at start + clients at end) / 2
  // This gives the churn rate for the SELECTED PERIOD
  const averageClients = (clientsAtStartOfPeriod + activeClients.length) / 2;
  const periodMonths = Math.max(1, differenceInMonths(endDate, startDate) + 1);

  // Churn rate for the entire period
  const churnRate = averageClients > 0
    ? (churnedThisMonth / averageClients) * 100
    : 0;

  // Monthly average churn rate
  const churnRateMonthly = churnRate / periodMonths;

  // Get legacy expenses within the selected period (fallback)
  const periodExpenses = expenses.filter(e => {
    const expenseDate = parseISO(e.month_year);
    return isWithinInterval(expenseDate, { start: startOfMonth(startDate), end: endOfMonth(endDate) });
  });

  const legacyTotalExpenses = periodExpenses.reduce((acc, e) => {
    return acc + Number(e.marketing_spend) + Number(e.sales_spend);
  }, 0);

  // Get CAC expenses from transactions (is_cac = true)
  const cacTransactions = transactions.filter(t => {
    const transactionDate = parseISO(t.date);
    return t.is_cac === true &&
      isWithinInterval(transactionDate, { start: startDate, end: endDate });
  });

  // Sum CAC expenses from transactions (use absolute value since expenses are negative)
  const totalCacExpenses = cacTransactions.reduce((acc, t) => {
    return acc + Math.abs(t.amount);
  }, 0);

  // CAC (Cost of Acquisition) - 100% based on transactions with is_cac = true
  const cac = newClientsThisMonth > 0 ? totalCacExpenses / newClientsThisMonth : 0;

  // LTV (Lifetime Value) Calculation
  // Formula: Ticket Médio × Average Customer Lifetime (in months)
  // Average Lifetime = 1 / Monthly Churn Rate
  // Cap at 36 months maximum (3 years) for realistic SaaS B2B projections
  const MAX_LIFETIME_MONTHS = 36;

  // Use the already calculated monthly churn rate
  const monthlyChurnRate = churnRateMonthly;

  // Calculate estimated lifetime
  // If churn rate is very low or zero, use the maximum cap
  let estimatedLifetimeMonths: number;
  if (monthlyChurnRate > 0) {
    // 1 / (churn% / 100) = months until average customer churns
    estimatedLifetimeMonths = Math.min(1 / (monthlyChurnRate / 100), MAX_LIFETIME_MONTHS);
  } else {
    // No churn observed - use maximum cap
    estimatedLifetimeMonths = MAX_LIFETIME_MONTHS;
  }

  const ltv = ticketMedio * estimatedLifetimeMonths;

  // Faturamento Real - Calculate actual revenue received in the period
  // Split into: recurring MRR and one-time setup payments
  const months = eachMonthOfInterval({ start: startDate, end: endDate });

  let mrrAccumulated = 0;  // MRR accumulated over all months
  let setupRevenue = 0;     // One-time payments (setup)

  months.forEach(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    // Use the same MRR calculation for consistency
    const monthlyMrr = calculateMrrAtDate(clients, addons, monthEnd);
    mrrAccumulated += monthlyMrr;

    // Add one-time sales (produtos únicos) - only clients that started in this month
    clients.forEach(client => {
      if (!client.products) return;
      // Only count non-recurring products (one-time payments)
      if (!isRecurringProduct(client.products)) {
        const clientStartDate = parseISO(client.start_date);
        if (isWithinInterval(clientStartDate, { start: monthStart, end: monthEnd })) {
          setupRevenue += Number(client.products.price);
        }
      }
    });

    // Add one-time addon sales
    addons.forEach(addon => {
      if (!addon.products) return;
      const client = clients.find(c => c.id === addon.client_id);
      if (!client || !wasClientActiveAt(client, monthEnd)) return;

      // Only count non-recurring addons (one-time payments)
      if (!isRecurringProduct(addon.products)) {
        const addonStartDate = parseISO(addon.start_date);
        if (isWithinInterval(addonStartDate, { start: monthStart, end: monthEnd })) {
          setupRevenue += Number(addon.products.price) * addon.quantity;
        }
      }
    });
  });

  // Total faturamento = MRR + Setup
  const faturamentoReal = mrrAccumulated + setupRevenue;

  // Payback Period = CAC / Ticket Médio (in months)
  const paybackPeriod = ticketMedio > 0 ? cac / ticketMedio : 0;

  // New MRR - MRR from new clients in the period
  let newMrr = 0;
  newClientsInPeriod.forEach(client => {
    if (client.products && isRecurringProduct(client.products)) {
      newMrr += getMonthlyPrice(Number(client.products.price), client.products.billing_period);
    }
  });

  // Churned MRR - MRR lost from churned clients in the period
  let churnedMrr = 0;
  churnedInPeriod.forEach(client => {
    if (client.products && isRecurringProduct(client.products)) {
      churnedMrr += getMonthlyPrice(Number(client.products.price), client.products.billing_period);
    }
  });

  // LTV/CAC Ratio
  // -1 means "not applicable" (no expenses registered, so CAC = 0)
  const ltvCacRatio = cac > 0 ? ltv / cac : -1;

  // Quick Ratio = New MRR / Churned MRR (simplified, no expansion/contraction)
  // -1 means "not applicable" (no churn and no new clients)
  // 99 is used as cap when there's new MRR but no churn (excellent scenario)
  let quickRatio: number;
  if (churnedMrr > 0) {
    quickRatio = newMrr / churnedMrr;
  } else if (newMrr > 0) {
    quickRatio = 99; // Cap: infinite growth (no churn, only new)
  } else {
    quickRatio = -1; // Not applicable: no activity
  }

  // Gross Margin - (Revenue - CAC Expenses) / Revenue * 100
  // CAC expenses = transactions with is_cac = true
  const cacExpenses = totalCacExpenses;
  const grossProfit = faturamentoReal - cacExpenses;
  const grossMargin = faturamentoReal > 0 ? (grossProfit / faturamentoReal) * 100 : 0;

  // Net Margin - Uses ALL expenses from transactions table
  // Filter transactions within the period and sum all expense amounts (negative values)
  const periodTransactions = transactions.filter(t => {
    const transactionDate = parseISO(t.date);
    return isWithinInterval(transactionDate, { start: startDate, end: endDate });
  });

  // Sum all expenses (negative amounts) from transactions
  const totalTransactionExpenses = periodTransactions
    .filter(t => t.type === 'expense' && t.amount < 0)
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  // Use transaction expenses if available, otherwise fall back to legacy expenses
  const allExpenses = totalTransactionExpenses > 0 ? totalTransactionExpenses : cacExpenses;
  const netProfit = faturamentoReal - allExpenses;
  const netMargin = faturamentoReal > 0 ? (netProfit / faturamentoReal) * 100 : 0;

  return {
    mrr,
    arr,
    ticketMedio,
    churnRate,
    cac,
    ltv,
    faturamentoReal,
    mrrAccumulated,  // MRR acumulado no período
    setupRevenue,    // Receita de pagamentos únicos
    paybackPeriod,
    activeClients: activeClients.length,
    newClientsThisMonth,
    churnedThisMonth,
    ltvCacRatio,
    quickRatio,
    newMrr,
    churnedMrr,
    churnRateMonthly,
    grossMargin,
    netMargin,
    averageNewClientsLast6Months,
  };
};

export const useDashboard = ({ startDate, endDate }: UseDashboardParams) => {
  return useQuery({
    queryKey: ['dashboard', startDate.toISOString(), endDate.toISOString()],
    queryFn: async (): Promise<DashboardMetrics> => {
      // Fetch all clients with their products
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*, products(*)');

      if (clientsError) throw clientsError;

      // Fetch expenses (legacy)
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*');

      if (expensesError) throw expensesError;

      // Fetch all client addons
      const { data: addons, error: addonsError } = await supabase
        .from('client_addons')
        .select('*, products(*)');

      if (addonsError) throw addonsError;

      // Fetch all transactions for CAC and margin calculations
      // @ts-ignore - transactions table exists but types may not be generated
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*');

      const typedClients = clients as Client[];
      const typedExpenses = expenses as Expense[];
      const typedAddons = addons as ClientAddon[];
      const typedTransactions = (transactions || []) as unknown as Transaction[];

      return calculateMetrics(typedClients, typedExpenses, typedAddons, typedTransactions, startDate, endDate);
    },
  });
};

// Comparison hook - fetches metrics for two periods
export const useDashboardComparison = (
  startDate: Date,
  endDate: Date,
  comparisonStartDate?: Date,
  comparisonEndDate?: Date
) => {
  return useQuery({
    queryKey: ['dashboard-comparison', startDate.toISOString(), endDate.toISOString(), comparisonStartDate?.toISOString(), comparisonEndDate?.toISOString()],
    queryFn: async () => {
      if (!comparisonStartDate || !comparisonEndDate) {
        return null;
      }

      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*, products(*)');

      if (clientsError) throw clientsError;

      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*');

      if (expensesError) throw expensesError;

      const { data: addons, error: addonsError } = await supabase
        .from('client_addons')
        .select('*, products(*)');

      if (addonsError) throw addonsError;

      // @ts-ignore - transactions table exists but types may not be generated
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*');

      const typedClients = clients as Client[];
      const typedExpenses = expenses as Expense[];
      const typedAddons = addons as ClientAddon[];
      const typedTransactions = (transactions || []) as unknown as Transaction[];

      const currentMetrics = calculateMetrics(typedClients, typedExpenses, typedAddons, typedTransactions, startDate, endDate);
      const comparisonMetrics = calculateMetrics(typedClients, typedExpenses, typedAddons, typedTransactions, comparisonStartDate, comparisonEndDate);

      return {
        current: currentMetrics,
        comparison: comparisonMetrics,
      };
    },
    enabled: !!comparisonStartDate && !!comparisonEndDate,
  });
};

export const useMrrHistory = (startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['mrr-history', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*, products(*)');

      if (error) throw error;

      const { data: addons, error: addonsError } = await supabase
        .from('client_addons')
        .select('*, products(*)');

      if (addonsError) throw addonsError;

      const typedClients = clients as Client[];
      const typedAddons = addons as ClientAddon[];
      const months: { month: string; mrr: number }[] = [];

      // Use provided dates or default to last 12 months
      const end = endDate || new Date();
      const start = startDate || subMonths(end, 11);

      const totalMonths = differenceInMonths(end, start) + 1;

      for (let i = totalMonths - 1; i >= 0; i--) {
        const date = subMonths(end, i);
        const monthEnd = endOfMonth(date);

        const mrr = calculateMrrAtDate(typedClients, typedAddons, monthEnd);

        months.push({
          month: format(date, 'MMM/yy', { locale: ptBR }),
          mrr,
        });
      }

      return months;
    },
  });
};

export const useClientChurnHistory = (startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['client-churn-history', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*');

      if (error) throw error;

      const typedClients = clients as Client[];
      const months: { month: string; novos: number; cancelamentos: number }[] = [];

      // Use provided dates or default to last 12 months
      const end = endDate || new Date();
      const start = startDate || subMonths(end, 11);

      const totalMonths = differenceInMonths(end, start) + 1;

      for (let i = totalMonths - 1; i >= 0; i--) {
        const date = subMonths(end, i);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);

        const novos = typedClients.filter(c => {
          const clientStartDate = parseISO(c.start_date);
          return isWithinInterval(clientStartDate, { start: monthStart, end: monthEnd });
        }).length;

        const cancelamentos = typedClients.filter(c => {
          if (!c.churn_date) return false;
          const churnDate = parseISO(c.churn_date);
          return isWithinInterval(churnDate, { start: monthStart, end: monthEnd });
        }).length;

        months.push({
          month: format(date, 'MMM/yy', { locale: ptBR }),
          novos,
          cancelamentos,
        });
      }

      return months;
    },
  });
};

export const useRecentClients = () => {
  return useQuery({
    queryKey: ['recent-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*, products(*)')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as Client[];
    },
  });
};

// Hook for total revenue history (recurring + one-time payments)
export const useTotalRevenueHistory = (startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['total-revenue-history', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*, products(*)');

      if (error) throw error;

      const { data: addons, error: addonsError } = await supabase
        .from('client_addons')
        .select('*, products(*)');

      if (addonsError) throw addonsError;

      const typedClients = clients as Client[];
      const typedAddons = addons as ClientAddon[];
      const months: { month: string; recorrente: number; unico: number }[] = [];

      // Use provided dates or default to last 12 months
      const end = endDate || new Date();
      const start = startDate || subMonths(end, 11);

      const totalMonths = differenceInMonths(end, start) + 1;

      for (let i = totalMonths - 1; i >= 0; i--) {
        const date = subMonths(end, i);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);

        let recorrente = 0;
        let unico = 0;

        // Calculate revenue from clients
        typedClients.forEach(client => {
          if (!client.products) return;
          const clientStartDate = parseISO(client.start_date);
          const isRecurring = isRecurringProduct(client.products);

          // Check if client started in this month (first payment)
          if (isWithinInterval(clientStartDate, { start: monthStart, end: monthEnd })) {
            if (isRecurring) {
              // New recurring client - pays full price (annual pays full, monthly pays monthly)
              recorrente += Number(client.products.price);
            } else {
              // One-time payment
              unico += Number(client.products.price);
            }
          } else if (wasClientActiveAt(client, monthEnd) && clientStartDate < monthStart && isRecurring) {
            // Existing active client with recurring product - pays monthly
            if (client.products.billing_period === 'mensal') {
              recorrente += Number(client.products.price);
            }
          }
        });

        // Add-ons revenue
        typedAddons.forEach(addon => {
          if (!addon.products) return;
          const client = typedClients.find(c => c.id === addon.client_id);
          if (!client || !wasClientActiveAt(client, monthEnd)) return;

          const addonStartDate = parseISO(addon.start_date);
          const isRecurring = isRecurringProduct(addon.products);

          // Check if addon started in this month
          if (isWithinInterval(addonStartDate, { start: monthStart, end: monthEnd })) {
            if (isRecurring) {
              recorrente += Number(addon.products.price) * addon.quantity;
            } else {
              unico += Number(addon.products.price) * addon.quantity;
            }
          } else if (wasAddonActiveAt(addon, monthEnd) && addonStartDate < monthStart && isRecurring) {
            // Existing active addon - pays monthly
            if (addon.products.billing_period === 'mensal') {
              recorrente += Number(addon.products.price) * addon.quantity;
            }
          }
        });

        months.push({
          month: format(date, 'MMM/yy', { locale: ptBR }),
          recorrente,
          unico,
        });
      }

      return months;
    },
  });
};