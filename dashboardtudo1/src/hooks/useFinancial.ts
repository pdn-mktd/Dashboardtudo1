import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, CategoryRule, FinancialMetrics, TransactionCategory } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, differenceInMonths } from 'date-fns';

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
            toast({ title: `${data?.length || 0} transações importadas com sucesso!` });
        },
        onError: (error) => {
            console.error('Error importing transactions:', error);
            toast({ title: 'Erro ao importar transações', variant: 'destructive' });
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

export const useFinancialMetrics = (startDate: Date, endDate: Date, subscriptionRevenue: number) => {
    return useQuery({
        queryKey: ['financial-metrics', startDate.toISOString(), endDate.toISOString(), subscriptionRevenue],
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

            const otherRevenue = revenueTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
            const totalRevenue = subscriptionRevenue + otherRevenue;

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
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('*')
                .gte('date', startDate.toISOString().split('T')[0])
                .lte('date', endDate.toISOString().split('T')[0])
                .order('date', { ascending: true });

            if (error) throw error;

            // Group by month
            const monthlyData: Record<string, { month: string; revenue: number; expenses: number; net: number }> = {};

            (transactions as Transaction[]).forEach(t => {
                const monthKey = t.date.substring(0, 7); // YYYY-MM
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { month: monthKey, revenue: 0, expenses: 0, net: 0 };
                }

                if (t.type === 'revenue') {
                    monthlyData[monthKey].revenue += Math.abs(t.amount);
                } else if (t.type === 'expense') {
                    monthlyData[monthKey].expenses += Math.abs(t.amount);
                }
                monthlyData[monthKey].net = monthlyData[monthKey].revenue - monthlyData[monthKey].expenses;
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
} => {
    const lowerHeaders = headers.map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

    // Find date column
    const datePatterns = ['data', 'date', 'dt', 'dia'];
    const dateColumn = lowerHeaders.findIndex(h => datePatterns.some(p => h.includes(p)));

    // Find description column
    const descPatterns = ['descricao', 'description', 'desc', 'historico', 'lancamento', 'detalhe'];
    const descriptionColumn = lowerHeaders.findIndex(h => descPatterns.some(p => h.includes(p)));

    // Find amount column
    const amountPatterns = ['valor', 'amount', 'value', 'quantia', 'total'];
    const amountColumn = lowerHeaders.findIndex(h => amountPatterns.some(p => h.includes(p)));

    return {
        dateColumn: dateColumn >= 0 ? dateColumn : 0,
        descriptionColumn: descriptionColumn >= 0 ? descriptionColumn : 1,
        amountColumn: amountColumn >= 0 ? amountColumn : 2,
    };
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
