import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardMetrics, Client, Expense, ClientAddon } from '@/types/database';
import { startOfMonth, endOfMonth, format, subMonths, parseISO, isWithinInterval, differenceInMonths, isBefore, isAfter, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UseDashboardParams {
  startDate: Date;
  endDate: Date;
}

// Helper to calculate monthly price from a product (only for recurring products)
const getMonthlyPrice = (price: number, billingPeriod: string): number => {
  return billingPeriod === 'anual' ? price / 12 : price;
};

// Check if product is recurring (for MRR calculations)
const isRecurringProduct = (product: { payment_type?: string } | undefined): boolean => {
  // Default to 'recorrente' for backwards compatibility
  return !product || product.payment_type !== 'unico';
};

// Check if client was active at a specific date
const wasClientActiveAt = (client: Client, date: Date): boolean => {
  const clientStartDate = parseISO(client.start_date);
  if (clientStartDate > date) return false;

  if (client.status === 'churned' && client.churn_date) {
    const churnDate = parseISO(client.churn_date);
    return churnDate > date;
  }

  return client.status === 'active';
};

// Check if addon was active at a specific date
const wasAddonActiveAt = (addon: ClientAddon, date: Date): boolean => {
  const addonStartDate = parseISO(addon.start_date);
  if (addonStartDate > date) return false;

  if (addon.status === 'cancelled' && addon.end_date) {
    const endDate = parseISO(addon.end_date);
    return endDate > date;
  }

  return addon.status === 'active';
};

// Calculate MRR for a specific date, including add-ons (only recurring products)
const calculateMrrAtDate = (clients: Client[], addons: ClientAddon[], date: Date): number => {
  let mrr = 0;

  // Main product MRR (only recurring)
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
  startDate: Date,
  endDate: Date
): DashboardMetrics => {
  // Active clients at the end of the period (only count those with recurring products for MRR purposes)
  const activeClients = clients.filter(c => wasClientActiveAt(c, endDate));
  const activeClientsWithRecurring = activeClients.filter(c => c.products && isRecurringProduct(c.products));

  // Calculate MRR at end of period (with add-ons, only recurring)
  const mrr = calculateMrrAtDate(clients, addons, endDate);

  // ARR = MRR * 12
  const arr = mrr * 12;

  // Ticket Médio - MRR divided by active clients with recurring products
  const ticketMedio = activeClientsWithRecurring.length > 0 ? mrr / activeClientsWithRecurring.length : 0;

  // New clients in the selected period
  const newClientsInPeriod = clients.filter(c => {
    const clientStartDate = parseISO(c.start_date);
    return isWithinInterval(clientStartDate, { start: startDate, end: endDate });
  });
  const newClientsThisMonth = newClientsInPeriod.length;

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

  // Get expenses within the selected period
  const periodExpenses = expenses.filter(e => {
    const expenseDate = parseISO(e.month_year);
    return isWithinInterval(expenseDate, { start: startOfMonth(startDate), end: endOfMonth(endDate) });
  });

  const totalExpenses = periodExpenses.reduce((acc, e) => {
    return acc + Number(e.marketing_spend) + Number(e.sales_spend);
  }, 0);

  // CAC (Cost of Acquisition) - total expenses / new clients in period
  const cac = newClientsThisMonth > 0 ? totalExpenses / newClientsThisMonth : 0;

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
  // For each month in the period, calculate what was actually billed
  const months = eachMonthOfInterval({ start: startDate, end: endDate });

  let faturamentoReal = 0;

  months.forEach(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    // New clients in this month pay full price
    clients.forEach(client => {
      if (!client.products) return;
      const clientStartDate = parseISO(client.start_date);

      // Check if client started in this month
      if (isWithinInterval(clientStartDate, { start: monthStart, end: monthEnd })) {
        // New client - pays full price (annual pays full annual, monthly pays monthly)
        faturamentoReal += Number(client.products.price);
      } else if (wasClientActiveAt(client, monthEnd) && clientStartDate < monthStart) {
        // Existing active client - pays recurring
        if (client.products.billing_period === 'mensal') {
          faturamentoReal += Number(client.products.price);
        } else if (client.products.billing_period === 'anual') {
          // Annual clients: normalize by dividing by 12 for monthly view
          faturamentoReal += Number(client.products.price) / 12;
        }
      }
    });

    // Add-ons revenue
    addons.forEach(addon => {
      if (!addon.products) return;
      const client = clients.find(c => c.id === addon.client_id);
      if (!client || !wasClientActiveAt(client, monthEnd)) return;

      const addonStartDate = parseISO(addon.start_date);

      // Check if addon started in this month
      if (isWithinInterval(addonStartDate, { start: monthStart, end: monthEnd })) {
        // New addon - pays full price
        faturamentoReal += Number(addon.products.price) * addon.quantity;
      } else if (wasAddonActiveAt(addon, monthEnd) && addonStartDate < monthStart) {
        // Existing active addon - pays recurring
        if (addon.products.billing_period === 'mensal') {
          faturamentoReal += Number(addon.products.price) * addon.quantity;
        } else if (addon.products.billing_period === 'anual') {
          // Annual add-ons: normalize by dividing by 12 for monthly view
          faturamentoReal += (Number(addon.products.price) / 12) * addon.quantity;
        }
      }
    });
  });

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

  // Gross Margin - This will be calculated properly when transactions table is set up
  // For now, a simple calculation: (Revenue - CAC Expenses) / Revenue * 100
  // CAC expenses = total expenses from the period (marketing + sales)
  const cacExpenses = totalExpenses; // From expenses table
  const grossProfit = faturamentoReal - cacExpenses;
  const grossMargin = faturamentoReal > 0 ? (grossProfit / faturamentoReal) * 100 : 0;

  return {
    mrr,
    arr,
    ticketMedio,
    churnRate,
    cac,
    ltv,
    faturamentoReal,
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

      // Fetch expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*');

      if (expensesError) throw expensesError;

      // Fetch all client addons
      const { data: addons, error: addonsError } = await supabase
        .from('client_addons')
        .select('*, products(*)');

      if (addonsError) throw addonsError;

      const typedClients = clients as Client[];
      const typedExpenses = expenses as Expense[];
      const typedAddons = addons as ClientAddon[];

      return calculateMetrics(typedClients, typedExpenses, typedAddons, startDate, endDate);
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

      const typedClients = clients as Client[];
      const typedExpenses = expenses as Expense[];
      const typedAddons = addons as ClientAddon[];

      const currentMetrics = calculateMetrics(typedClients, typedExpenses, typedAddons, startDate, endDate);
      const comparisonMetrics = calculateMetrics(typedClients, typedExpenses, typedAddons, comparisonStartDate, comparisonEndDate);

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