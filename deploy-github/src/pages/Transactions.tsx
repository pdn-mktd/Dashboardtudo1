import { useState, useRef } from 'react';
import { Plus, Upload, Download, Pencil, Trash2, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import { Skeleton } from '@/components/ui/skeleton';
import { TablePagination } from '@/components/TablePagination';
import {
    useTransactions,
    useCreateTransaction,
    useUpdateTransaction,
    useDeleteTransaction,
    useBulkCreateTransactions,
    useCategoryRules,
    parseCSV,
    detectCSVColumns,
    parseAmount,
    parseDate,
    applyCategoryRules,
    generateImportHash,
} from '@/hooks/useFinancial';
import {
    Transaction,
    TransactionCategory,
    TransactionType,
    CATEGORY_LABELS
} from '@/types/database';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { startOfYear, endOfYear } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

// Form Schema
const transactionSchema = z.object({
    date: z.string().min(1, 'Data é obrigatória'),
    description: z.string().min(1, 'Descrição é obrigatória'),
    amount: z.string().min(1, 'Valor é obrigatório'),
    category: z.string().min(1, 'Categoria é obrigatória'),
    type: z.enum(['expense', 'revenue']),
    is_cac: z.boolean(),
    notes: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

// Categories by type
const EXPENSE_CATEGORIES: TransactionCategory[] = [
    'marketing', 'sales', 'infrastructure', 'tools',
    'payroll', 'taxes', 'administrative', 'other'
];

const REVENUE_CATEGORIES: TransactionCategory[] = [
    'subscription', 'service', 'consulting', 'other_revenue'
];

export default function Transactions() {
    const [startDate] = useState(startOfYear(new Date()));
    const [endDate] = useState(endOfYear(new Date()));
    const { data: transactions, isLoading } = useTransactions(startDate, endDate);
    const { data: categoryRules } = useCategoryRules();
    const createTransaction = useCreateTransaction();
    const updateTransaction = useUpdateTransaction();
    const deleteTransaction = useDeleteTransaction();
    const bulkCreate = useBulkCreateTransactions();

    const [formOpen, setFormOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importPreview, setImportPreview] = useState<Omit<Transaction, 'id' | 'created_at' | 'updated_at'>[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterIsCac, setFilterIsCac] = useState<string>('all');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const itemsPerPage = 15;

    const form = useForm<TransactionFormData>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            date: format(new Date(), 'yyyy-MM-dd'),
            description: '',
            amount: '',
            category: '',
            type: 'expense',
            is_cac: false,
            notes: '',
        },
    });

    const transactionType = form.watch('type');

    // Filter transactions
    const filteredTransactions = transactions?.filter(t => {
        if (filterCategory !== 'all' && t.category !== filterCategory) return false;
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (filterIsCac === 'yes' && !t.is_cac) return false;
        if (filterIsCac === 'no' && t.is_cac) return false;
        return true;
    }) || [];

    const paginatedTransactions = filteredTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleEdit = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        form.reset({
            date: transaction.date,
            description: transaction.description,
            amount: Math.abs(transaction.amount).toString(),
            category: transaction.category,
            type: transaction.type as 'expense' | 'revenue',
            is_cac: transaction.is_cac,
            notes: transaction.notes || '',
        });
        setFormOpen(true);
    };

    const handleDelete = (transaction: Transaction) => {
        setTransactionToDelete(transaction);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (transactionToDelete) {
            await deleteTransaction.mutateAsync(transactionToDelete.id);
            setDeleteDialogOpen(false);
            setTransactionToDelete(null);
        }
    };

    const onSubmit = async (data: TransactionFormData) => {
        const amount = parseFloat(data.amount.replace(',', '.'));
        const finalAmount = data.type === 'expense' ? -Math.abs(amount) : Math.abs(amount);

        const transactionData = {
            date: data.date,
            description: data.description,
            amount: finalAmount,
            category: data.category as TransactionCategory,
            type: data.type as TransactionType,
            is_cac: data.is_cac,
            notes: data.notes || null,
            source: 'manual' as const,
            subcategory: null,
            import_hash: null,
        };

        if (editingTransaction) {
            await updateTransaction.mutateAsync({ id: editingTransaction.id, ...transactionData });
        } else {
            await createTransaction.mutateAsync(transactionData);
        }

        setFormOpen(false);
        setEditingTransaction(null);
        form.reset();
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const { headers, rows } = parseCSV(content);
            const { dateColumn, descriptionColumn, amountColumn } = detectCSVColumns(headers);

            const preview = rows.map(row => {
                const rawDate = row[dateColumn] || '';
                const description = row[descriptionColumn] || '';
                const rawAmount = row[amountColumn] || '0';
                const amount = parseAmount(rawAmount);
                const date = parseDate(rawDate);

                // Try to categorize automatically
                const categorization = categoryRules ? applyCategoryRules(description, categoryRules) : null;

                return {
                    date,
                    description,
                    amount: amount < 0 ? amount : -amount, // Assume expenses are negative
                    category: (categorization?.category || 'other') as TransactionCategory,
                    is_cac: categorization?.is_cac || false,
                    type: (amount > 0 ? 'revenue' : 'expense') as TransactionType,
                    source: 'import' as const,
                    subcategory: null,
                    notes: null,
                    import_hash: generateImportHash(date, description, amount),
                };
            }).filter(t => t.description.trim() !== '');

            setImportPreview(preview);
            setImportDialogOpen(true);
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleImportConfirm = async () => {
        if (importPreview.length > 0) {
            await bulkCreate.mutateAsync(importPreview);
            setImportDialogOpen(false);
            setImportPreview([]);
        }
    };

    const clearFilters = () => {
        setFilterCategory('all');
        setFilterType('all');
        setFilterIsCac('all');
        setCurrentPage(1);
    };

    const hasActiveFilters = filterCategory !== 'all' || filterType !== 'all' || filterIsCac !== 'all';

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Transações</h1>
                        <p className="text-muted-foreground mt-1">
                            Gerencie receitas e despesas da sua operação
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".csv,.txt"
                            onChange={handleFileUpload}
                        />
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                            <Upload className="h-4 w-4" />
                            Importar CSV
                        </Button>
                        <Button onClick={() => {
                            setEditingTransaction(null);
                            form.reset();
                            setFormOpen(true);
                        }} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Nova Transação
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Filtros:</span>
                        </div>
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os tipos</SelectItem>
                                <SelectItem value="expense">Despesas</SelectItem>
                                <SelectItem value="revenue">Receitas</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas categorias</SelectItem>
                                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterIsCac} onValueChange={setFilterIsCac}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="É CAC?" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="yes">Somente CAC</SelectItem>
                                <SelectItem value="no">Não CAC</SelectItem>
                            </SelectContent>
                        </Select>
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                                <X className="h-4 w-4" />
                                Limpar
                            </Button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-card rounded-xl border border-border shadow-card">
                    {isLoading ? (
                        <div className="p-6 space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-muted-foreground">Nenhuma transação encontrada.</p>
                            <Button onClick={() => setFormOpen(true)} className="mt-4 gap-2">
                                <Plus className="h-4 w-4" />
                                Adicionar Transação
                            </Button>
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Categoria</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>CAC</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedTransactions.map((transaction) => (
                                        <TableRow key={transaction.id}>
                                            <TableCell className="text-muted-foreground">
                                                {formatDate(transaction.date)}
                                            </TableCell>
                                            <TableCell className="font-medium max-w-[300px] truncate">
                                                {transaction.description}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {CATEGORY_LABELS[transaction.category as TransactionCategory] || transaction.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={transaction.type === 'revenue' ? 'default' : 'destructive'}
                                                    className={transaction.type === 'revenue' ? 'bg-success/10 text-success border-success/20' : ''}
                                                >
                                                    {transaction.type === 'revenue' ? 'Receita' : 'Despesa'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {transaction.is_cac && (
                                                    <Badge variant="outline" className="text-primary border-primary/30">
                                                        CAC
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${transaction.amount >= 0 ? 'text-success' : 'text-destructive'
                                                }`}>
                                                {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(transaction)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(transaction)}
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <TablePagination
                                currentPage={currentPage}
                                totalPages={Math.ceil(filteredTransactions.length / itemsPerPage)}
                                onPageChange={setCurrentPage}
                                itemsPerPage={itemsPerPage}
                                totalItems={filteredTransactions.length}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Transaction Form Dialog */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
                        </DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Data</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="expense">Despesa</SelectItem>
                                                    <SelectItem value="revenue">Receita</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descrição</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Descrição da transação" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valor (R$)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="0,00" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Categoria</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {(transactionType === 'expense' ? EXPENSE_CATEGORIES : REVENUE_CATEGORIES).map(cat => (
                                                        <SelectItem key={cat} value={cat}>
                                                            {CATEGORY_LABELS[cat]}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {transactionType === 'expense' && (
                                <FormField
                                    control={form.control}
                                    name="is_cac"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormLabel className="text-sm font-normal cursor-pointer">
                                                Esta despesa entra no cálculo do CAC (Custo de Aquisição)
                                            </FormLabel>
                                        </FormItem>
                                    )}
                                />
                            )}

                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Observações</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Observações opcionais..."
                                                className="resize-none"
                                                rows={2}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createTransaction.isPending || updateTransaction.isPending}
                                >
                                    {editingTransaction ? 'Salvar' : 'Criar Transação'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Import Preview Dialog */}
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Importar Transações ({importPreview.length} encontradas)
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Revise as transações antes de importar. As categorias foram detectadas automaticamente.
                        </p>
                        <div className="max-h-[400px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Categoria</TableHead>
                                        <TableHead>CAC</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {importPreview.slice(0, 50).map((t, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="text-muted-foreground">{formatDate(t.date)}</TableCell>
                                            <TableCell className="max-w-[250px] truncate">{t.description}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {CATEGORY_LABELS[t.category as TransactionCategory]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {t.is_cac && <Badge variant="outline">CAC</Badge>}
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${t.amount >= 0 ? 'text-success' : 'text-destructive'}`}>
                                                {formatCurrency(t.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {importPreview.length > 50 && (
                                <p className="text-sm text-muted-foreground text-center py-2">
                                    Mostrando 50 de {importPreview.length} transações
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleImportConfirm} disabled={bulkCreate.isPending}>
                                Importar {importPreview.length} transações
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. A transação será permanentemente removida.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Layout>
    );
}
