import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, CategoryRule, FinancialMetrics, TransactionCategory, Client, ClientAddon } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, differenceInMonths, eachMonthOfInterval, format } from 'date-fns';

// ============================================
// Transaction Hooks
// ============================================

export const useTransactions = (startDate?: Date, endDate?: Date) => {
    return useQuery({
        queryKey: ['transactions', startDate?.toISOString(), endDate?.toISOString()],
        queryFn: async () => {
            let query = supabase
                .from('transactions')
                .select('*')
                .order('date', { ascending: false });

            if (startDate && endDate) {
                query = query
                    .gte('date', startDate.toISOString().split('T')[0])
                    .lte('date', endDate.toISOString().split('T')[0]);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Transaction[];
        },
    });
};

export const useCreateTransaction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => {
            const { data, error } = await supabase
                .from('transactions')
                .insert(transaction)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['financial-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['cash-flow-history'] });
            toast({ title: 'Transação criada com sucesso!' });
        },
        onError: (error) => {
            console.error('Error creating transaction:', error);
            toast({ title: 'Erro ao criar transação', variant: 'destructive' });
        },
    });
};

export const useUpdateTransaction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Transaction> & { id: string }) => {
            const { data, error } = await supabase
                .from('transactions')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['financial-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['cash-flow-history'] });
            toast({ title: 'Transação atualizada com sucesso!' });
        },
        onError: (error) => {
            console.error('Error updating transaction:', error);
            toast({ title: 'Erro ao atualizar transação', variant: 'destructive' });
        },
    });
};

export const useDeleteTransaction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['financial-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['cash-flow-history'] });
            toast({ title: 'Transação excluída com sucesso!' });
        },
        onError: (error) => {
            console.error('Error deleting transaction:', error);
            toast({ title: 'Erro ao excluir transação', variant: 'destructive' });
        },
    });
};

export const useBulkCreateTransactions = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (transactions: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>[]) => {
            const { data, error } = await supabase
                .from('transactions')
                .insert(transactions)
                .select();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['financial-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['cash-flow-history'] });
            toast({ title: `${data?.length || 0} transações importadas com sucesso!` });
        },
        onError: (error) => {
            console.error('Error importing transactions:', error);
            toast({ title: 'Erro ao importar transações', variant: 'destructive' });
        },
    });
};

export const useBulkUpdateTransactions = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Transaction> }) => {
            // Update each transaction
            const promises = ids.map(id =>
                supabase
                    .from('transactions')
                    .update({ ...updates, updated_at: new Date().toISOString() })
                    .eq('id', id)
            );

            const results = await Promise.all(promises);
            const errors = results.filter(r => r.error);
            if (errors.length > 0) {
                throw new Error(`Failed to update ${errors.length} transactions`);
            }

            return ids.length;
        },
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['financial-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['cash-flow-history'] });
            toast({ title: `${count} transações atualizadas com sucesso!` });
        },
        onError: (error) => {
            console.error('Error updating transactions:', error);
            toast({ title: 'Erro ao atualizar transações', variant: 'destructive' });
        },
    });
};

export const useBulkDeleteTransactions = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase
                .from('transactions')
                .delete()
                .in('id', ids);

            if (error) throw error;
            return ids.length;
        },
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['financial-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['cash-flow-history'] });
            toast({ title: `${count} transações excluídas com sucesso!` });
        },
        onError: (error) => {
            console.error('Error deleting transactions:', error);
            toast({ title: 'Erro ao excluir transações', variant: 'destructive' });
        },
    });
};

// ============================================
// Category Rules Hooks
// ============================================

export const useCategoryRules = () => {
    return useQuery({
        queryKey: ['category-rules'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('category_rules')
                .select('*')
                .order('priority', { ascending: false });

            if (error) throw error;
            return data as CategoryRule[];
        },
    });
};

export const useCreateCategoryRule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (rule: Omit<CategoryRule, 'id' | 'created_at'>) => {
            const { data, error } = await supabase
                .from('category_rules')
                .insert(rule)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['category-rules'] });
            toast({ title: 'Regra criada com sucesso!' });
        },
        onError: (error) => {
            console.error('Error creating rule:', error);
            toast({ title: 'Erro ao criar regra', variant: 'destructive' });
        },
    });
};

export const useDeleteCategoryRule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('category_rules')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['category-rules'] });
            toast({ title: 'Regra excluída com sucesso!' });
        },
        onError: (error) => {
            console.error('Error deleting rule:', error);
            toast({ title: 'Erro ao excluir regra', variant: 'destructive' });
        },
    });
};

// ============================================
// Financial Metrics Hook
// ============================================

export const useFinancialMetrics = (
    startDate: Date,
    endDate: Date,
    mrrRevenue: number,    // Receita recorrente (MRR acumulado)
    setupRevenue: number   // Receita de setup/pagamentos únicos
) => {
    return useQuery({
        queryKey: ['financial-metrics', startDate.toISOString(), endDate.toISOString(), mrrRevenue, setupRevenue],
        queryFn: async (): Promise<FinancialMetrics> => {
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('*')
                .gte('date', startDate.toISOString().split('T')[0])
                .lte('date', endDate.toISOString().split('T')[0]);

            if (error) throw error;

            const txns = transactions as Transaction[];

            // Calculate metrics
            const revenueTransactions = txns.filter(t => t.type === 'revenue');
            const expenseTransactions = txns.filter(t => t.type === 'expense');

            // Other revenue = revenue transactions EXCLUDING subscription (already in mrrRevenue)
            // These are manual entries like service, consulting, other_revenue
            const otherRevenue = revenueTransactions
                .filter(t => t.category !== 'subscription')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            // Total revenue = MRR + Setup + Other manual entries
            const subscriptionRevenue = mrrRevenue;
            const totalRevenue = mrrRevenue + setupRevenue + otherRevenue;

            const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
            const cacExpenses = expenseTransactions
                .filter(t => t.is_cac)
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            const operationalExpenses = totalExpenses - cacExpenses;

            const grossProfit = totalRevenue - cacExpenses;
            const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

            const operationalResult = totalRevenue - totalExpenses;
            const operationalMargin = totalRevenue > 0 ? (operationalResult / totalRevenue) * 100 : 0;

            const months = Math.max(1, differenceInMonths(endDate, startDate) + 1);
            const burnRate = totalExpenses / months;

            // Group expenses by category
            const expensesByCategory = Object.entries(
                expenseTransactions.reduce((acc, t) => {
                    const category = t.category;
                    acc[category] = (acc[category] || 0) + Math.abs(t.amount);
                    return acc;
                }, {} as Record<string, number>)
            ).map(([category, amount]) => ({ category, amount }));

            return {
                totalRevenue,
                subscriptionRevenue,
                setupRevenue,
                otherRevenue,
                totalExpenses,
                cacExpenses,
                operationalExpenses,
                grossProfit,
                grossMargin,
                operationalResult,
                operationalMargin,
                burnRate,
                expensesByCategory,
            };
        },
    });
};

// ============================================
// Cash Flow History Hook
// ============================================

export const useCashFlowHistory = (startDate: Date, endDate: Date) => {
    return useQuery({
        queryKey: ['cash-flow-history', startDate.toISOString(), endDate.toISOString()],
        queryFn: async () => {
            // Fetch manual transactions
            const { data: transactions, error: transError } = await supabase
                .from('transactions')
                .select('*')
                .gte('date', startDate.toISOString().split('T')[0])
                .lte('date', endDate.toISOString().split('T')[0])
                .order('date', { ascending: true });

            if (transError) throw transError;

            // Fetch clients with products for subscription revenue
            const { data: clients, error: clientsError } = await supabase
                .from('clients')
                .select('*, products(*)');

            if (clientsError) throw clientsError;

            // Fetch client addons
            const { data: addons, error: addonsError } = await supabase
                .from('client_addons')
                .select('*, products(*)');

            if (addonsError) throw addonsError;

            const typedClients = clients as unknown as Client[];
            const typedAddons = addons as unknown as ClientAddon[];
            const typedTransactions = (transactions || []) as unknown as Transaction[];

            // Generate all months in the range
            const months = eachMonthOfInterval({ start: startDate, end: endDate });
            const monthlyData: Record<string, { month: string; revenue: number; expenses: number; net: number }> = {};

            // Initialize all months
            months.forEach(month => {
                const monthKey = format(month, 'yyyy-MM');
                monthlyData[monthKey] = { month: monthKey, revenue: 0, expenses: 0, net: 0 };
            });

            // Add subscription revenue (MRR) for each month
            // Only count RECURRING products (mensal/anual), not one-time payments
            months.forEach(month => {
                const monthKey = format(month, 'yyyy-MM');
                const monthEnd = endOfMonth(month);
                const monthStart = startOfMonth(month);

                // Calculate MRR from active clients with RECURRING products
                typedClients.forEach(client => {
                    if (!client.products) return;

                    // Only count recurring products
                    const billingPeriod = client.products.billing_period;
                    if (billingPeriod !== 'mensal' && billingPeriod !== 'anual') return;

                    const clientStartDate = parseISO(client.start_date);

                    // Check if client was active in this month
                    const isActive = clientStartDate <= monthEnd &&
                        (client.status === 'active' ||
                            (client.status === 'churned' && client.churn_date && parseISO(client.churn_date) > monthStart));

                    if (isActive) {
                        // Add monthly revenue
                        const monthlyPrice = billingPeriod === 'anual'
                            ? Number(client.products.price) / 12
                            : Number(client.products.price);
                        monthlyData[monthKey].revenue += monthlyPrice;
                    }
                });

                // Add addon revenue (only recurring)
                typedAddons.forEach(addon => {
                    if (!addon.products) return;
                    const client = typedClients.find(c => c.id === addon.client_id);
                    if (!client) return;

                    // Only count recurring addons
                    const billingPeriod = addon.products.billing_period;
                    if (billingPeriod !== 'mensal' && billingPeriod !== 'anual') return;

                    const addonStartDate = parseISO(addon.start_date);
                    const addonEndDate = addon.end_date ? parseISO(addon.end_date) : null;

                    const isActive = addonStartDate <= monthEnd &&
                        (addon.status === 'active' ||
                            (addon.status === 'cancelled' && addonEndDate && addonEndDate > monthStart));

                    if (isActive) {
                        const monthlyPrice = billingPeriod === 'anual'
                            ? Number(addon.products.price) / 12
                            : Number(addon.products.price);
                        monthlyData[monthKey].revenue += monthlyPrice * addon.quantity;
                    }
                });
            });

            // Add manual transactions (revenue and expenses)
            // EXCLUDE subscription revenue as it's already calculated from clients
            typedTransactions.forEach(t => {
                const monthKey = t.date.substring(0, 7); // YYYY-MM
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { month: monthKey, revenue: 0, expenses: 0, net: 0 };
                }

                if (t.type === 'revenue') {
                    // Only add non-subscription revenue entries (avoid duplication with MRR)
                    if (t.category !== 'subscription') {
                        monthlyData[monthKey].revenue += Math.abs(t.amount);
                    }
                } else if (t.type === 'expense') {
                    // Add expenses
                    monthlyData[monthKey].expenses += Math.abs(t.amount);
                }
            });

            // Calculate net for each month
            Object.values(monthlyData).forEach(data => {
                data.net = data.revenue - data.expenses;
            });

            return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
        },
    });
};

// ============================================
// Utility Functions
// ============================================

export const applyCategoryRules = (
    description: string,
    rules: CategoryRule[]
): { category: TransactionCategory; is_cac: boolean } | null => {
    const upperDesc = description.toUpperCase();

    // Sort by priority (highest first)
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
        // Convert wildcard pattern to regex
        const pattern = rule.pattern
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');

        const regex = new RegExp(pattern, 'i');
        if (regex.test(upperDesc)) {
            return { category: rule.category, is_cac: rule.is_cac };
        }
    }

    return null;
};

export const parseCSV = (content: string): { headers: string[]; rows: string[][] } => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    // Detect delimiter (comma or semicolon)
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const parseRow = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    const headers = parseRow(lines[0]);
    const rows = lines.slice(1).map(parseRow);

    return { headers, rows };
};

export const detectCSVColumns = (headers: string[]): {
    dateColumn: number;
    descriptionColumn: number;
    amountColumn: number;
    categoryColumn: number;
} => {
    const lowerHeaders = headers.map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());

    console.log('CSV Headers (normalized):', lowerHeaders);

    // Find date column
    const datePatterns = ['data', 'date', 'dt', 'dia', 'quando'];
    const dateColumn = lowerHeaders.findIndex(h => datePatterns.some(p => h.includes(p)));

    // Find description column
    const descPatterns = ['item', 'descricao', 'description', 'desc', 'historico', 'lancamento', 'detalhe'];
    const descriptionColumn = lowerHeaders.findIndex(h => descPatterns.some(p => h.includes(p)));

    // Find amount column
    const amountPatterns = ['quanto', 'valor', 'amount', 'value', 'quantia', 'total'];
    const amountColumn = lowerHeaders.findIndex(h => amountPatterns.some(p => h.includes(p)));

    // Find category column - be specific to avoid matching wrong columns
    const categoryColumn = lowerHeaders.findIndex(h => h === 'categoria' || h === 'category');

    console.log('Detected columns:', { dateColumn, descriptionColumn, amountColumn, categoryColumn });

    return {
        dateColumn: dateColumn >= 0 ? dateColumn : 0,
        descriptionColumn: descriptionColumn >= 0 ? descriptionColumn : 1,
        amountColumn: amountColumn >= 0 ? amountColumn : 2,
        categoryColumn: categoryColumn,
    };
};

// Map CSV category names (Portuguese or custom) to TransactionCategory
export const mapCSVCategory = (csvCategory: string): { category: TransactionCategory; is_cac: boolean } => {
    const normalized = csvCategory.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // Map common Portuguese category names to system categories
    const categoryMappings: Record<string, { category: TransactionCategory; is_cac: boolean }> = {
        // Marketing related (CAC)
        'marketing': { category: 'marketing', is_cac: true },
        'ads': { category: 'marketing', is_cac: true },
        'anuncios': { category: 'marketing', is_cac: true },
        'publicidade': { category: 'marketing', is_cac: true },
        'meta ads': { category: 'marketing', is_cac: true },
        'google ads': { category: 'marketing', is_cac: true },
        'trafego pago': { category: 'marketing', is_cac: true },
        'trafego': { category: 'marketing', is_cac: true },

        // Sales (CAC)
        'vendas': { category: 'sales', is_cac: true },
        'comercial': { category: 'sales', is_cac: true },
        'comissao': { category: 'sales', is_cac: true },
        'comissoes': { category: 'sales', is_cac: true },

        // Infrastructure
        'infraestrutura': { category: 'infrastructure', is_cac: false },
        'infra': { category: 'infrastructure', is_cac: false },
        'servidor': { category: 'infrastructure', is_cac: false },
        'servidores': { category: 'infrastructure', is_cac: false },
        'hospedagem': { category: 'infrastructure', is_cac: false },
        'cloud': { category: 'infrastructure', is_cac: false },
        'aws': { category: 'infrastructure', is_cac: false },

        // Tools (including common SaaS names)
        'ferramentas': { category: 'tools', is_cac: false },
        'ferramenta': { category: 'tools', is_cac: false },
        'software': { category: 'tools', is_cac: false },
        'softwares': { category: 'tools', is_cac: false },
        'saas': { category: 'tools', is_cac: false },
        'assinatura': { category: 'tools', is_cac: false },
        'assinaturas': { category: 'tools', is_cac: false },
        'mensalidade': { category: 'tools', is_cac: false },
        'highlevel': { category: 'tools', is_cac: false },
        'gohighlevel': { category: 'tools', is_cac: false },
        'whatsapp': { category: 'tools', is_cac: false },
        'automacao': { category: 'tools', is_cac: false },
        'autoreply': { category: 'tools', is_cac: false },
        'auto-recharge': { category: 'tools', is_cac: false },
        'stevo': { category: 'tools', is_cac: false },
        'sthub': { category: 'tools', is_cac: false },
        'integracao': { category: 'tools', is_cac: false },
        'kong': { category: 'tools', is_cac: false },
        'suprimentos': { category: 'tools', is_cac: false },
        'dominio': { category: 'tools', is_cac: false },
        'umode': { category: 'tools', is_cac: false },
        'gorilla': { category: 'tools', is_cac: false },
        'leadsgorilla': { category: 'tools', is_cac: false },
        'leadsorilla': { category: 'tools', is_cac: false },
        'paddle': { category: 'tools', is_cac: false },
        'paddlenet': { category: 'tools', is_cac: false },
        'turismo': { category: 'tools', is_cac: false },

        // Payroll
        'folha': { category: 'payroll', is_cac: false },
        'folha de pagamento': { category: 'payroll', is_cac: false },
        'salario': { category: 'payroll', is_cac: false },
        'salarios': { category: 'payroll', is_cac: false },
        'funcionarios': { category: 'payroll', is_cac: false },
        'pessoal': { category: 'payroll', is_cac: false },
        'rh': { category: 'payroll', is_cac: false },

        // Taxes
        'impostos': { category: 'taxes', is_cac: false },
        'imposto': { category: 'taxes', is_cac: false },
        'taxas': { category: 'taxes', is_cac: false },
        'taxa': { category: 'taxes', is_cac: false },
        'tributos': { category: 'taxes', is_cac: false },

        // Administrative
        'administrativo': { category: 'administrative', is_cac: false },
        'admin': { category: 'administrative', is_cac: false },
        'escritorio': { category: 'administrative', is_cac: false },
        'aluguel': { category: 'administrative', is_cac: false },
        'contador': { category: 'administrative', is_cac: false },
        'contabilidade': { category: 'administrative', is_cac: false },

        // Revenue categories - Accounts that receive money
        'receita': { category: 'other_revenue', is_cac: false },
        'receitas': { category: 'other_revenue', is_cac: false },
        'faturamento': { category: 'subscription', is_cac: false },
        'servico': { category: 'service', is_cac: false },
        'servicos': { category: 'service', is_cac: false },
        'consultoria': { category: 'consulting', is_cac: false },
        'conta tudo1': { category: 'administrative', is_cac: false },
        'tudo1': { category: 'administrative', is_cac: false },
        'pedro': { category: 'administrative', is_cac: false },
        'nu ale': { category: 'administrative', is_cac: false },
        'realizado': { category: 'other', is_cac: false },

        // Other
        'outros': { category: 'other', is_cac: false },
        'outro': { category: 'other', is_cac: false },
        'other': { category: 'other', is_cac: false },
        'diversos': { category: 'other', is_cac: false },
    };

    // Try exact match first
    if (categoryMappings[normalized]) {
        return categoryMappings[normalized];
    }

    // Try partial match
    for (const [key, value] of Object.entries(categoryMappings)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return value;
        }
    }

    // Default to 'other'
    return { category: 'other', is_cac: false };
};

export const parseAmount = (value: string): number => {
    // Remove currency symbols and spaces
    let cleaned = value.replace(/[R$\s]/g, '').trim();

    // Handle Brazilian format (1.234,56) vs US format (1,234.56)
    const hasCommaDecimal = cleaned.includes(',') && (
        cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.') ||
        !cleaned.includes('.')
    );

    if (hasCommaDecimal) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
        cleaned = cleaned.replace(/,/g, '');
    }

    return parseFloat(cleaned) || 0;
};

export const parseDate = (value: string): string => {
    // Try different date formats
    const formats = [
        // DD/MM/YYYY
        /^(\d{2})\/(\d{2})\/(\d{4})$/,
        // DD-MM-YYYY
        /^(\d{2})-(\d{2})-(\d{4})$/,
        // YYYY-MM-DD
        /^(\d{4})-(\d{2})-(\d{2})$/,
        // DD/MM/YY
        /^(\d{2})\/(\d{2})\/(\d{2})$/,
    ];

    for (const format of formats) {
        const match = value.match(format);
        if (match) {
            if (format === formats[0] || format === formats[1]) {
                // DD/MM/YYYY or DD-MM-YYYY
                return `${match[3]}-${match[2]}-${match[1]}`;
            } else if (format === formats[2]) {
                // YYYY-MM-DD
                return value;
            } else if (format === formats[3]) {
                // DD/MM/YY
                const year = parseInt(match[3]) > 50 ? `19${match[3]}` : `20${match[3]}`;
                return `${year}-${match[2]}-${match[1]}`;
            }
        }
    }

    // Fallback: try to parse with Date
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }

    return new Date().toISOString().split('T')[0];
};

export const generateImportHash = (date: string, description: string, amount: number): string => {
    const str = `${date}|${description}|${amount}`;
    // Simple hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
};
