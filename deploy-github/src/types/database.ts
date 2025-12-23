export interface Product {
  id: string;
  name: string;
  price: number;
  billing_period: 'mensal' | 'anual';
  payment_type: 'recorrente' | 'unico';
  created_at: string;
  updated_at: string;
}

export interface ClientAddon {
  id: string;
  client_id: string;
  product_id: string;
  quantity: number;
  start_date: string;
  end_date: string | null;
  status: 'active' | 'cancelled';
  created_at: string;
  updated_at: string;
  products?: Product;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'churned';
  start_date: string;
  churn_date: string | null;
  churn_reason: string | null;
  notes: string | null;
  product_id: string | null;
  created_at: string;
  updated_at: string;
  products?: Product;
  client_addons?: ClientAddon[];
}

export interface Expense {
  id: string;
  month_year: string;
  marketing_spend: number;
  sales_spend: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  mrr: number;
  ticketMedio: number;
  churnRate: number;
  cac: number;
  ltv: number;
  faturamentoReal: number;
  paybackPeriod: number;
  activeClients: number;
  newClientsThisMonth: number;
  churnedThisMonth: number;
  arr: number;
  ltvCacRatio: number;
  quickRatio: number;
  newMrr: number;
  churnedMrr: number;
  churnRateMonthly: number;
  grossMargin: number;  // Margem Bruta %
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// ============================================
// Financial System Types
// ============================================

export type TransactionCategory =
  | 'marketing'
  | 'sales'
  | 'infrastructure'
  | 'tools'
  | 'payroll'
  | 'taxes'
  | 'administrative'
  | 'other'
  | 'subscription'
  | 'service'
  | 'consulting'
  | 'other_revenue';

export type TransactionType = 'expense' | 'revenue' | 'transfer';

export type TransactionSource = 'manual' | 'import' | 'migrated';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;  // Negative = expense, Positive = revenue
  category: TransactionCategory;
  subcategory: string | null;
  is_cac: boolean;
  type: TransactionType;
  source: TransactionSource;
  import_hash: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryRule {
  id: string;
  pattern: string;
  category: TransactionCategory;
  is_cac: boolean;
  priority: number;
  created_at: string;
}

export interface FinancialMetrics {
  totalRevenue: number;
  subscriptionRevenue: number;
  otherRevenue: number;
  totalExpenses: number;
  cacExpenses: number;
  operationalExpenses: number;
  grossProfit: number;
  grossMargin: number;
  operationalResult: number;
  operationalMargin: number;
  burnRate: number;  // Monthly expense average
  expensesByCategory: { category: string; amount: number }[];
}

export interface DREItem {
  label: string;
  value: number;
  indent: number;
  isTotal?: boolean;
  isSubtotal?: boolean;
}

// Category display names in Portuguese
export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  marketing: 'Marketing',
  sales: 'Vendas',
  infrastructure: 'Infraestrutura',
  tools: 'Ferramentas',
  payroll: 'Folha de Pagamento',
  taxes: 'Impostos',
  administrative: 'Administrativo',
  other: 'Outros',
  subscription: 'Assinaturas',
  service: 'Serviços',
  consulting: 'Consultoria',
  other_revenue: 'Outras Receitas',
};