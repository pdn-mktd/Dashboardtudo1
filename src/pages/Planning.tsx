import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Users,
  Percent,
  BarChart3,
  CheckCircle2,
  Clock,
  Sparkles,
  Settings,
  Loader2,
  RefreshCw,
  Calendar,
  AlertCircle,
  Plus,
  Rocket,
  Trash2,
  StickyNote,
  ListChecks,
  FileText,
  Download,
  MoreVertical,
  PauseCircle,
  PlayCircle,
  XCircle,
  AlertTriangle,
  Pencil
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useDashboard } from '@/hooks/useDashboard';
import { CopilotChat } from '@/components/CopilotChat';
import { ThemeToggle } from '@/components/ThemeToggle';
import { generateActionPlan, structureUserPlan, ActionItem, SubTask, getApiKey } from '@/services/groqService';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { subMonths, startOfMonth, endOfMonth, format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PlanSummary } from '@/components/planning/PlanSummary';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// Tipos
interface SimulatedMetrics {
  mrr: number;
  arr: number;
  ltv: number;
  lucro: number;
  roi: number;
}

// Segmentos disponíveis
const SEGMENTS = [
  { id: 'saas', label: 'SaaS / Software', icon: '💻' },
  { id: 'ecommerce', label: 'E-commerce / Varejo Online', icon: '🛒' },
  { id: 'services', label: 'Serviços (Consultoria, Agência)', icon: '💼' },
  { id: 'infoproducts', label: 'Infoprodutos / Cursos', icon: '📚' },
  { id: 'clinics', label: 'Clínicas / Agendamento', icon: '🏥' },
  { id: 'other', label: 'Outro', icon: '🏢' },
];

// Componente de Step
const StepIndicator = ({
  currentStep,
  steps
}: {
  currentStep: number;
  steps: { id: number; label: string; icon: React.ReactNode }[]
}) => {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`flex flex-col items-center ${currentStep === step.id
              ? 'text-primary'
              : currentStep > step.id
                ? 'text-green-500'
                : 'text-muted-foreground'
              }`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${currentStep === step.id
                ? 'border-primary bg-primary/10'
                : currentStep > step.id
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-muted bg-muted/10'
                }`}
            >
              {currentStep > step.id ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                step.icon
              )}
            </div>
            <span className="text-xs mt-2 font-medium">{step.label}</span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-16 h-0.5 mx-2 transition-all ${currentStep > step.id ? 'bg-green-500' : 'bg-muted'
                }`}
            />
          )}
        </div>
      ))}
    </div>
  );
};

// Componente de Card de Métrica
const MetricCard = ({
  title,
  currentValue,
  simulatedValue,
  format = 'currency',
  icon: Icon,
  isInput = false,
}: {
  title: string;
  currentValue: number;
  simulatedValue?: number;
  format?: 'currency' | 'percent' | 'number';
  icon: React.ElementType;
  isInput?: boolean;
}) => {
  const formatValue = (value: number) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
      case 'percent':
        // Se valor é 9999, significa infinito (CAC = 0)
        return value >= 9999 ? '∞' : `${value.toFixed(1)}%`;
      case 'number':
        return value.toLocaleString('pt-BR');
      default:
        return value.toString();
    }
  };

  const diff = simulatedValue !== undefined ? simulatedValue - currentValue : 0;
  const diffPercent = currentValue !== 0 ? (diff / currentValue) * 100 : 0;
  const isPositive = diff > 0;
  const isNegative = diff < 0;

  // Para CAC e Churn, menor é melhor
  const isGood = title.includes('CAC') || title.includes('Churn')
    ? isNegative
    : isPositive;

  return (
    <Card className={`relative overflow-hidden ${isInput ? 'border-primary/50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{title}</span>
          </div>
          {isInput && (
            <Badge variant="outline" className="text-xs">Editável</Badge>
          )}
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold">{formatValue(currentValue)}</div>
            <div className="text-xs text-muted-foreground">Atual</div>
          </div>

          {simulatedValue !== undefined && diff !== 0 && (
            <div className="text-right">
              <div className={`text-lg font-semibold ${isGood ? 'text-green-500' : 'text-red-500'}`}>
                {formatValue(simulatedValue)}
              </div>
              <div className={`text-xs flex items-center gap-1 ${isGood ? 'text-green-500' : 'text-red-500'}`}>
                {isGood ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? '+' : ''}{diffPercent.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

import {
  migrateLegacyPlan,
  getActivePlan,
  savePlan,
  archiveActivePlan,
  getPlansByStatus,
  getPlans,
  deletePlan as deleteStoredPlan
} from '@/services/planningStorage';
import { Plan, PlanStatus, Scenario } from '@/types/planning';

const PlanningHome = ({ onNew, onResume }: { onNew: () => void, onResume: (plan: Plan) => void }) => {
  const pausedPlans = getPlansByStatus('paused');
  const cancelledPlans = getPlansByStatus('cancelled');
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-8 lg:p-12 max-w-6xl animate-in fade-in duration-700">
      {/* Botão Voltar ao Dashboard */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar ao Dashboard
        </Button>
      </div>

      <div className="text-center mb-16">
        <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-400 to-blue-600 tracking-tight">
          Planejamento Estratégico
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Gerencie seus ciclos de crescimento, acompanhe metas e tome decisões baseadas em dados.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Card Criar Novo */}
        <Card
          className="hover:shadow-2xl transition-all border-primary/30 hover:border-primary/60 bg-gradient-to-br from-card to-muted/50 dark:from-slate-900 dark:to-slate-950 cursor-pointer group h-full relative overflow-hidden ring-1 ring-primary/10 dark:ring-white/5"
          onClick={onNew}
        >
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="absolute top-0 right-0 p-32 bg-primary/20 blur-[100px] opacity-20 group-hover:opacity-30 transition-opacity" />

          <CardContent className="p-8 lg:p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px] z-10 relative">
            <div className="p-6 bg-primary/10 rounded-full mb-8 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300 ring-1 ring-primary/20 shadow-[0_0_30px_rgba(37,99,235,0.15)]">
              <Rocket className="w-16 h-16 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4 tracking-tight text-foreground">Iniciar Novo Ciclo</h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-sm">
              Desenhe seu futuro. Defina metas, simule cenários e crie um plano de ação para escalar seu negócio.
            </p>
            <Button className="mt-10 w-full max-w-xs font-semibold h-12 text-md shadow-lg shadow-primary/20 transition-all hover:scale-105" size="lg">
              Começar Agora <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Lista de Pausados e Cancelados */}
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-foreground">
              <PauseCircle className="w-6 h-6 text-amber-500" />
              Retomar Planejamento
            </h3>

            {pausedPlans.length === 0 ? (
              <div className="text-muted-foreground/80 italic p-8 border border-dashed border-border rounded-lg text-center bg-muted/30">
                Nenhum plano pausado no momento.
              </div>
            ) : (
              <div className="space-y-3">
                {pausedPlans.map(plan => (
                  <Card key={plan.id} className="hover:border-amber-500/50 transition-all cursor-pointer bg-card border-border group" onClick={() => onResume(plan)}>
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-lg text-foreground group-hover:text-amber-500 transition-colors">{plan.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            Pausado em {new Date(plan.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/30">Pausado</Badge>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1"><ListChecks className="w-4 h-4" /> {plan.actions.length} Ações</div>
                        <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {plan.horizonte} meses</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Histórico Cancelados */}
          {cancelledPlans.length > 0 && (
            <div className="pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-4 font-medium flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Histórico de Cancelados
              </p>
              <div className="space-y-2">
                {cancelledPlans.map(plan => (
                  <div key={plan.id} className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg text-sm hover:border-muted-foreground/30 transition-colors group">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-foreground">{plan.title}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="bg-red-500/10 text-red-600 dark:text-red-500 px-1.5 py-0.5 rounded border border-red-500/30">Cancelado</span>
                        <span>Motivo: {plan.cancellationReason || 'Não informado'}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10" onClick={(e) => {
                      e.stopPropagation();
                      deleteStoredPlan(plan.id);
                      window.location.reload();
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente Principal
export default function Planning() {
  // Datas padrão para o hook (últimos 12 meses)
  const endDate = endOfMonth(new Date());
  const startDate = startOfMonth(subMonths(new Date(), 11));

  const { data: metrics, isLoading } = useDashboard({ startDate, endDate });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isCreatingNew, setIsCreatingNew] = useState(false); // Novo estado da Home

  // Carregar dados salvos ao iniciar
  useEffect(() => {
    migrateLegacyPlan();

    if (searchParams.get('new') === 'true') {
      setIsCreatingNew(true);
      window.history.replaceState(null, '', '/planejamento');
      return;
    }

    const active = getActivePlan();
    if (active) {
      // Restaurar estados do plano ativo
      if (active.segment) setSelectedSegment(active.segment);
      if (active.startDate) setPlanStartDate(new Date(active.startDate));
      if (active.actions) setActions(active.actions);
      if (active.scenarios) setSavedScenarios(active.scenarios);
      if (active.simulatedMetrics) {
        // Mesclar com o estado inicial para garantir campos
        setSimulated(prev => ({ ...prev, ...active.simulatedMetrics }));
      }
      if (active.horizonte) setHorizonte(active.horizonte);

      setPlanFinalized(true);
      setCurrentStep(4);
    } else {
      // Se não há plano ativo, o estado default (isCreatingNew=false) fará a Home aparecer
      setPlanFinalized(false);
    }
  }, [searchParams]);

  const handleFinishAndSave = () => {
    if (!selectedSegment) {
      toast.error("Selecione um segmento");
      return;
    }

    // Verificar se já existe um plano ativo para ATUALIZAR ao invés de criar
    const existingActive = getActivePlan();

    const planData: Plan = {
      id: existingActive?.id || crypto.randomUUID(),
      title: existingActive?.title || `Plano de Crescimento - ${format(new Date(), 'MMM yyyy')}`,
      status: 'active',
      segment: selectedSegment,
      startDate: planStartDate.toISOString(),
      horizonte: horizonte,
      currentMetrics: currentMetrics,
      simulatedMetrics: simulated,
      actions: actions,
      scenarios: savedScenarios,
      createdAt: existingActive?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    savePlan(planData);
    setPlanFinalized(true);
    setShowEditMode(false);
    toast.success(existingActive ? "Planejamento atualizado!" : "Planejamento iniciado com sucesso!");
  };

  const handlePausePlan = () => {
    const archived = archiveActivePlan('paused');
    if (archived) toast.success("Plano pausado com sucesso");
    else toast.info("Sincronizando...");

    // Limpar estados legados para evitar reload incorreto
    localStorage.removeItem('planning_finalized');

    // Forçar reload para garantir estado limpo
    setTimeout(() => window.location.reload(), 500);
  };

  const handleCancelPlan = (reason: string) => {
    const archived = archiveActivePlan('cancelled', reason);
    if (archived) toast.info("Plano cancelado");
    else toast.info("Sincronizando...");

    // Limpar estados legados
    localStorage.removeItem('planning_finalized');

    setTimeout(() => window.location.reload(), 500);
  };

  const handleDeletePlan = () => {
    const active = getActivePlan();
    if (active) {
      deleteStoredPlan(active.id);
    }

    // Fallback: Limpar legado se existir
    localStorage.removeItem('planning_finalized');
    localStorage.removeItem('planning_actions');
    localStorage.removeItem('planning_start_date');
    localStorage.removeItem('planning_status');
    localStorage.removeItem('planning_cancellation_reason');
    localStorage.removeItem('scenarios');

    toast.success("Plano excluído");
    setTimeout(() => window.location.reload(), 500);
  };
  // Estados
  const [currentStep, setCurrentStep] = useState(1);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [horizonte, setHorizonte] = useState(6);

  // Estados do Plano de Ação
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [actionsError, setActionsError] = useState<string | null>(null);
  const [planMode, setPlanMode] = useState<'choose' | 'ai' | 'custom' | 'list'>('choose');
  const [userPlanInput, setUserPlanInput] = useState('');

  // Plano finalizado = modo execução (tela de acompanhamento fixa)
  const [planFinalized, setPlanFinalized] = useState(false);
  const [showEditMode, setShowEditMode] = useState(false);

  // Estados para cenários salvos (para comparação)
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [scenarioName, setScenarioName] = useState('');

  // Estados para adicionar nova tarefa
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'alta' | 'media' | 'baixa'>('media');

  // Estados para detalhes da tarefa
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Valores atuais (do dashboard)
  // IMPORTANTE: Usar churnRateMonthly (mensal) ao invés de churnRate (acumulado do período)
  const currentMetrics = useMemo(() => ({
    cac: metrics?.cac || 300,
    ticketMedio: metrics?.ticketMedio || 150,
    churnRate: metrics?.churnRateMonthly || 5,
    // Usar média dos últimos 6 meses para projeção mais realista, fallback para o mês atual
    novosClientesMes: metrics?.averageNewClientsLast6Months || metrics?.newClientsThisMonth || 10,
    mrr: metrics?.mrr || 15000,
    ltv: metrics?.ltv || 1800,
    totalClientes: metrics?.activeClients || 100,
  }), [metrics]);

  // Valores simulados (editáveis)
  const [simulated, setSimulated] = useState({
    cac: currentMetrics.cac,
    ticketMedio: currentMetrics.ticketMedio,
    churnRate: currentMetrics.churnRate,
    novosClientesMes: currentMetrics.novosClientesMes,
  });

  const [planStartDate, setPlanStartDate] = useState<Date>(new Date());

  // Salvar data de início
  useEffect(() => {
    localStorage.setItem('planning_start_date', planStartDate.toISOString());
  }, [planStartDate]);

  // Atualizar valores simulados quando métricas carregarem
  useEffect(() => {
    if (metrics) {
      setSimulated({
        cac: metrics.cac || 300,
        ticketMedio: metrics.ticketMedio || 150,
        churnRate: metrics.churnRateMonthly || 5,
        novosClientesMes: metrics.newClientsThisMonth || 10,
      });
    }
  }, [metrics]);

  // --- Auto-Save no Storage Novo ---
  useEffect(() => {
    if (planFinalized) {
      const active = getActivePlan();
      if (active) {
        // Proteção contra sobrescrita acidental de ações na inicialização:
        // Se o estado local actions estiver vazio, mas o plano salvo tiver ações,
        // mantemos as ações salvas para evitar perda de dados por race condition de carga.
        const safeActions = actions.length === 0 && (active.actions?.length || 0) > 0
          ? active.actions
          : actions;

        const updated: Plan = {
          ...active,
          actions: safeActions,
          scenarios: savedScenarios,
          simulatedMetrics: simulated,
          startDate: planStartDate.toISOString(),
          updatedAt: new Date().toISOString()
        };
        savePlan(updated);
      }
    }
  }, [actions, savedScenarios, simulated, planStartDate, planFinalized]);

  // Salvar cenário atual
  const handleSaveScenario = () => {
    if (!scenarioName.trim()) return;

    const newScenario: Scenario = {
      id: `scenario-${Date.now()}`,
      name: scenarioName.trim(),
      cac: simulated.cac,
      ticketMedio: simulated.ticketMedio,
      churnRate: simulated.churnRate,
      novosClientesMes: simulated.novosClientesMes,
      horizonte,
      createdAt: new Date(),
    };

    setSavedScenarios(prev => [...prev.slice(-4), newScenario]); // Máximo 5 cenários
    setScenarioName('');
  };

  // Remover cenário
  const handleRemoveScenario = (id: string) => {
    setSavedScenarios(prev => prev.filter(s => s.id !== id));
  };

  // Carregar cenário para edição
  const handleLoadScenario = (scenario: Scenario) => {
    setSimulated({
      cac: scenario.cac,
      ticketMedio: scenario.ticketMedio,
      churnRate: scenario.churnRate,
      novosClientesMes: scenario.novosClientesMes,
    });
    setHorizonte(scenario.horizonte);
  };

  // --- PDF Export Logic ---
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    // Pequeno delay para garantir renderização
    await new Promise(resolve => setTimeout(resolve, 500));

    const element = document.getElementById('plan-summary-document');
    if (!element) {
      console.error("Elemento do resumo não encontrado");
      toast.error("Erro ao gerar PDF: elemento não encontrado");
      setIsExporting(false);
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Calcular dimensões da imagem proporcional à largura do PDF
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      // Se a imagem cabe em uma página
      if (imgHeight <= pdfHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
        // Dividir em múltiplas páginas
        let heightLeft = imgHeight;
        let position = 0;
        let pageCount = 0;

        while (heightLeft > 0) {
          if (pageCount > 0) {
            pdf.addPage();
          }

          // Adicionar a imagem com offset negativo para "scroll" na imagem
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);

          heightLeft -= pdfHeight;
          position -= pdfHeight;
          pageCount++;

          // Limite de segurança para evitar loop infinito
          if (pageCount > 50) break;
        }
      }

      pdf.save(`Plano_Estrategico_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (e) {
      console.error('Erro ao gerar PDF:', e);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };
  // -------------------------

  // --- Gestão de Estado do Plano ---
  type PlanningStatus = 'active' | 'paused' | 'cancelled';
  const [planningStatus, setPlanningStatus] = useState<PlanningStatus>('active');
  const [cancellationReason, setCancellationReason] = useState('');
  const [tempReason, setTempReason] = useState(''); // Para o input do dialog
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExitConfirmDialog, setShowExitConfirmDialog] = useState(false);
  const [pendingExitAction, setPendingExitAction] = useState<(() => void) | null>(null);

  // Handler para verificar se deve mostrar confirmação de saída
  const handleBackWithConfirmation = (backAction: () => void) => {
    if (actions.length > 0 && !planFinalized) {
      setPendingExitAction(() => backAction);
      setShowExitConfirmDialog(true);
    } else {
      backAction();
    }
  };

  const confirmExit = () => {
    if (pendingExitAction) {
      pendingExitAction();
    }
    setShowExitConfirmDialog(false);
    setPendingExitAction(null);
  };

  // ---------------------------------

  // Funcoes de IA (Copilot)o
  const handleSelectSegment = (segment: string) => {
    setSelectedSegment(segment);
    localStorage.setItem('planning_segment', segment);
    setShowSegmentModal(false);
  };

  // Gerar plano de ação com IA
  const handleGenerateActionPlan = async () => {
    if (!getApiKey()) {
      setActionsError('Configure sua API key do Groq primeiro (no chat do Copiloto)');
      return;
    }

    setLoadingActions(true);
    setActionsError(null);

    try {
      const generatedActions = await generateActionPlan({
        segment: SEGMENTS.find(s => s.id === selectedSegment)?.label || 'Outro',
        currentMetrics,
        simulatedMetrics: simulated,
        horizonte,
        startDate: planStartDate,
      });
      setActions(generatedActions);
      setPlanMode('list');
    } catch (err) {
      setActionsError(err instanceof Error ? err.message : 'Erro ao gerar plano');
    } finally {
      setLoadingActions(false);
    }
  };

  // Estruturar plano do usuário com IA
  const handleStructureUserPlan = async () => {
    if (!userPlanInput.trim()) {
      setActionsError('Descreva seu plano primeiro');
      return;
    }

    if (!getApiKey()) {
      setActionsError('Configure sua API key do Groq primeiro (no chat do Copiloto)');
      return;
    }

    setLoadingActions(true);
    setActionsError(null);

    try {
      const generatedActions = await structureUserPlan(
        {
          segment: SEGMENTS.find(s => s.id === selectedSegment)?.label || 'Outro',
          currentMetrics,
          simulatedMetrics: simulated,
          horizonte,
          startDate: planStartDate,
        },
        userPlanInput
      );
      setActions(generatedActions);
      setPlanMode('list');
    } catch (err) {
      setActionsError(err instanceof Error ? err.message : 'Erro ao estruturar plano');
    } finally {
      setLoadingActions(false);
    }
  };

  // Toggle ação como concluída
  const toggleActionComplete = (actionId: string) => {
    setActions(prev => prev.map(action =>
      action.id === actionId
        ? { ...action, completed: !action.completed }
        : action
    ));
  };

  // Adicionar nova tarefa manualmente
  const handleAddNewTask = () => {
    if (!newTaskTitle.trim()) return;

    const newAction: ActionItem = {
      id: `action-${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || 'Tarefa adicionada manualmente',
      priority: newTaskPriority,
      suggestedDate: new Date().toISOString().split('T')[0],
      completed: false,
    };

    setActions(prev => [...prev, newAction]);
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskPriority('media');
    setShowNewTaskModal(false);
  };

  // Adicionar sub-tarefa
  const handleAddSubtask = (taskIndex: number, title: string) => {
    setActions(prev => prev.map((action, index) => {
      if (index === taskIndex - 1) {
        const newSubtask = {
          id: `subtask-${Date.now()}`,
          title,
          completed: false,
        };
        return {
          ...action,
          subtasks: [...(action.subtasks || []), newSubtask],
        };
      }
      return action;
    }));
  };

  // Remover sub-tarefa
  const handleRemoveSubtask = (taskIndex: number, subtaskIndex: number) => {
    setActions(prev => prev.map((action, index) => {
      if (index === taskIndex - 1 && action.subtasks) {
        return {
          ...action,
          subtasks: action.subtasks.filter((_, i) => i !== subtaskIndex - 1),
        };
      }
      return action;
    }));
  };

  // Toggle sub-tarefa
  const toggleSubtaskComplete = (actionId: string, subtaskId: string) => {
    setActions(prev => prev.map(action => {
      if (action.id === actionId && action.subtasks) {
        return {
          ...action,
          subtasks: action.subtasks.map(st =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          ),
        };
      }
      return action;
    }));
  };

  // Atualizar notas
  const updateTaskNotes = (actionId: string, notes: string) => {
    setActions(prev => prev.map(action =>
      action.id === actionId ? { ...action, notes } : action
    ));
  };

  // Obter tarefa selecionada
  const selectedTask = actions.find(a => a.id === selectedTaskId);

  // Calcular métricas simuladas
  const simulatedMetrics = useMemo(() => {
    const churnDecimal = simulated.churnRate / 100;
    const ltv = churnDecimal > 0 ? simulated.ticketMedio / churnDecimal : simulated.ticketMedio * 24;

    // Calcular clientes projetados ao final do período considerando churn composto
    let clientesProjetados = currentMetrics.totalClientes;
    for (let i = 0; i < horizonte; i++) {
      clientesProjetados = clientesProjetados * (1 - churnDecimal) + simulated.novosClientesMes;
    }
    clientesProjetados = Math.round(clientesProjetados);

    const mrrFinal = clientesProjetados * simulated.ticketMedio;
    const arr = mrrFinal * 12;
    const custoTotal = simulated.cac * simulated.novosClientesMes * horizonte;
    const receitaTotal = mrrFinal * horizonte;
    const lucro = receitaTotal - custoTotal;
    // Se não há custo (CAC = 0), ROI é infinito (lucro puro). Usamos 9999 para representar.
    const roi = custoTotal > 0
      ? ((receitaTotal - custoTotal) / custoTotal) * 100
      : (receitaTotal > 0 ? 9999 : 0);

    return { mrr: mrrFinal, arr, ltv, lucro, roi, clientesProjetados };
  }, [simulated, horizonte, currentMetrics.totalClientes]);

  // Gerar dados para o gráfico de projeção
  const projectionData = useMemo(() => {
    const data = [];

    // Cenário Atual - projeção mês a mês
    let clientesAtual = currentMetrics.totalClientes;
    const churnAtualDecimal = currentMetrics.churnRate / 100;

    // Cenário Simulado - projeção mês a mês
    let clientesSimulado = currentMetrics.totalClientes;
    const churnSimuladoDecimal = simulated.churnRate / 100;

    for (let mes = 0; mes <= horizonte; mes++) {
      if (mes === 0) {
        // Mês inicial - ambos começam iguais
        data.push({
          mes: 'Hoje',
          atual: Math.round(currentMetrics.mrr),
          simulado: Math.round(currentMetrics.mrr),
        });
      } else {
        // Cenário Atual: clientes do mês anterior - churn + novos clientes
        clientesAtual = clientesAtual * (1 - churnAtualDecimal) + currentMetrics.novosClientesMes;
        const mrrAtual = clientesAtual * currentMetrics.ticketMedio;

        // Cenário Simulado: clientes do mês anterior - churn + novos clientes
        clientesSimulado = clientesSimulado * (1 - churnSimuladoDecimal) + simulated.novosClientesMes;
        const mrrSimulado = clientesSimulado * simulated.ticketMedio;

        data.push({
          mes: `Mês ${mes}`,
          atual: Math.round(mrrAtual),
          simulado: Math.round(mrrSimulado),
        });
      }
    }

    return data;
  }, [currentMetrics, simulated, horizonte]);

  // Steps
  const steps = [
    { id: 1, label: 'Situação Atual', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 2, label: 'Simular', icon: <Target className="w-5 h-5" /> },
    { id: 3, label: 'Planejar', icon: <CheckCircle2 className="w-5 h-5" /> },
    { id: 4, label: 'Acompanhar', icon: <Clock className="w-5 h-5" /> },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!planFinalized && !isCreatingNew) {
    return (
      <PlanningHome
        onNew={() => setIsCreatingNew(true)}
        onResume={(plan) => {
          plan.status = 'active';
          plan.updatedAt = new Date().toISOString();
          savePlan(plan);
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      {(!planFinalized || showEditMode) ? (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Planejamento</h1>
            <p className="text-muted-foreground">
              Simule cenários e trace seu plano de ação
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedSegment || ''}
              onValueChange={(value) => {
                setSelectedSegment(value);
                localStorage.setItem('planning_segment', value);
              }}
            >
              <SelectTrigger className="w-auto min-w-[200px] gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Selecione o segmento">
                  {selectedSegment && (
                    <>
                      {SEGMENTS.find(s => s.id === selectedSegment)?.icon}{' '}
                      {SEGMENTS.find(s => s.id === selectedSegment)?.label}
                    </>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SEGMENTS.map((segment) => (
                  <SelectItem key={segment.id} value={segment.id}>
                    <span className="flex items-center gap-2">
                      <span>{segment.icon}</span>
                      <span>{segment.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ThemeToggle />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-8 animate-in slide-in-from-top-4 duration-500">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2 text-primary">
              <Rocket className="w-8 h-8" />
              Modo Execução
            </h1>
            <p className="text-muted-foreground mt-1 text-lg">
              Foco total na meta! Execute as ações e acompanhe o progresso.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Navegação Rápida */}
            <div className="flex bg-muted rounded-lg p-1 mr-2 gap-1">
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => navigate('/')}>Dashboard</Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => navigate('/financeiro')}>Financeiro</Button>
            </div>

            <div className="bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 text-primary font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <div className="flex flex-col leading-none">
                <span className="text-[10px] opacity-70 uppercase tracking-widest font-bold">Prazo</span>
                <span className="text-sm">{format(addMonths(planStartDate, horizonte), "dd/MM/yyyy")}</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowSummaryModal(true)}
              className="hidden md:flex"
            >
              <FileText className="w-4 h-4 mr-2" />
              Resumo
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setShowEditMode(true);
                setCurrentStep(4);
              }}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Revisar Planejamento
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Gerenciar Plano</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handlePausePlan}>
                  <PauseCircle className="mr-2 h-4 w-4" /> Pausar Plano
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowCancelDialog(true)} className="text-red-500 focus:text-red-500">
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar Plano
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600 focus:text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Definitivamente
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
          </div>
        </div>
      )}



      {/* Stepper */}
      {(!planFinalized || showEditMode) && (
        <StepIndicator currentStep={currentStep} steps={steps} />
      )}

      {/* Conteúdo do Step Atual */}
      <div className="min-h-[500px]">
        {/* PASSO 1: Situação Atual */}
        {currentStep === 1 && (!planFinalized || showEditMode) && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Sua Situação Atual
                </CardTitle>
                <CardDescription>
                  Estes são seus números atuais, importados do Dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    title="CAC"
                    currentValue={currentMetrics.cac}
                    icon={DollarSign}
                    format="currency"
                  />
                  <MetricCard
                    title="Ticket Médio"
                    currentValue={currentMetrics.ticketMedio}
                    icon={DollarSign}
                    format="currency"
                  />
                  <MetricCard
                    title="Churn Rate"
                    currentValue={currentMetrics.churnRate}
                    icon={Percent}
                    format="percent"
                  />
                  <MetricCard
                    title="MRR"
                    currentValue={currentMetrics.mrr}
                    icon={TrendingUp}
                    format="currency"
                  />
                  <MetricCard
                    title="LTV"
                    currentValue={currentMetrics.ltv}
                    icon={Users}
                    format="currency"
                  />
                  <MetricCard
                    title="Total de Clientes"
                    currentValue={currentMetrics.totalClientes}
                    icon={Users}
                    format="number"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => setCurrentStep(2)} size="lg">
                Simular Cenários
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* PASSO 2: Simular */}
        {currentStep === 2 && (!planFinalized || showEditMode) && (
          <div className="space-y-6">
            {/* Configuração de Prazo e Início */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Configuração de Prazo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Data de Início */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Data de Início do Projeto</label>
                    <Input
                      type="date"
                      value={format(planStartDate, 'yyyy-MM-dd')}
                      onChange={(e) => {
                        // Manter o timezone local convertendo a string corretamente
                        if (e.target.value) {
                          const [year, month, day] = e.target.value.split('-').map(Number);
                          setPlanStartDate(new Date(year, month - 1, day));
                        }
                      }}
                    />
                  </div>

                  {/* Horizonte */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium">Duração do Plano</label>
                      <span className="text-sm font-bold text-primary">{horizonte} {horizonte === 1 ? 'mês' : 'meses'}</span>
                    </div>
                    <Slider
                      value={[horizonte]}
                      onValueChange={(value) => setHorizonte(value[0])}
                      min={1}
                      max={24}
                      step={1}
                      className="py-2"
                    />
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground px-1">
                      <span>1</span>
                      <span>6</span>
                      <span>12</span>
                      <span>18</span>
                      <span>24</span>
                    </div>
                  </div>
                </div>

                {/* Previsão */}
                <div className="bg-muted/50 p-3 rounded-lg border flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Previsão de Conclusão:</span>
                  <span className="font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(addMonths(planStartDate, horizonte), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Sliders de Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Ajuste os Valores
                  </CardTitle>
                  <CardDescription>
                    Mova os controles para simular diferentes cenários
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* CAC */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium">CAC (Custo de Aquisição)</label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          value={simulated.cac}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(10000, Number(e.target.value) || 0));
                            setSimulated(prev => ({ ...prev, cac: value }));
                          }}
                          className="w-24 h-8 text-right font-bold text-primary"
                        />
                      </div>
                    </div>
                    <Slider
                      value={[simulated.cac]}
                      onValueChange={(value) => setSimulated(prev => ({ ...prev, cac: value[0] }))}
                      min={50}
                      max={1000}
                      step={10}
                    />
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>R$ 50</span>
                      <span className="text-green-500">← Menor é melhor</span>
                      <span>R$ 1.000</span>
                    </div>
                  </div>

                  {/* Ticket Médio */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium">Ticket Médio</label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          value={simulated.ticketMedio}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(10000, Number(e.target.value) || 0));
                            setSimulated(prev => ({ ...prev, ticketMedio: value }));
                          }}
                          className="w-24 h-8 text-right font-bold text-primary"
                        />
                      </div>
                    </div>
                    <Slider
                      value={[simulated.ticketMedio]}
                      onValueChange={(value) => setSimulated(prev => ({ ...prev, ticketMedio: value[0] }))}
                      min={10}
                      max={1000}
                      step={10}
                    />
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>R$ 10</span>
                      <span className="text-green-500">Maior é melhor →</span>
                      <span>R$ 1.000</span>
                    </div>
                  </div>

                  {/* Churn Rate */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium">Churn Rate (%)</label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={simulated.churnRate}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                            setSimulated(prev => ({ ...prev, churnRate: value }));
                          }}
                          className="w-20 h-8 text-right font-bold text-primary"
                          step="0.1"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                    <Slider
                      value={[simulated.churnRate]}
                      onValueChange={(value) => setSimulated(prev => ({ ...prev, churnRate: value[0] }))}
                      min={0.5}
                      max={20}
                      step={0.5}
                    />
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>0.5%</span>
                      <span className="text-green-500">← Menor é melhor</span>
                      <span>20%</span>
                    </div>
                  </div>

                  {/* Novos Clientes/Mês */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium">Novos Clientes/Mês</label>
                      <Input
                        type="number"
                        value={simulated.novosClientesMes}
                        onChange={(e) => {
                          const value = Math.max(0, Math.min(1000, Number(e.target.value) || 0));
                          setSimulated(prev => ({ ...prev, novosClientesMes: value }));
                        }}
                        className="w-20 h-8 text-right font-bold text-primary"
                      />
                    </div>
                    <Slider
                      value={[simulated.novosClientesMes]}
                      onValueChange={(value) => setSimulated(prev => ({ ...prev, novosClientesMes: value[0] }))}
                      min={1}
                      max={100}
                      step={1}
                    />
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>1</span>
                      <span className="text-green-500">Maior é melhor →</span>
                      <span>100</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Métricas Calculadas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Resultado da Simulação
                  </CardTitle>
                  <CardDescription>
                    Comparativo: Atual vs Simulado em {horizonte} meses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MetricCard
                    title="MRR Projetado"
                    currentValue={currentMetrics.mrr}
                    simulatedValue={simulatedMetrics.mrr}
                    icon={TrendingUp}
                    format="currency"
                  />
                  <MetricCard
                    title="LTV"
                    currentValue={currentMetrics.ltv}
                    simulatedValue={simulatedMetrics.ltv}
                    icon={Users}
                    format="currency"
                  />
                  <MetricCard
                    title="Lucro no Período"
                    currentValue={currentMetrics.mrr * horizonte * 0.3}
                    simulatedValue={simulatedMetrics.lucro}
                    icon={DollarSign}
                    format="currency"
                  />
                  <MetricCard
                    title="ROI"
                    currentValue={100}
                    simulatedValue={simulatedMetrics.roi}
                    icon={Percent}
                    format="percent"
                  />
                  <MetricCard
                    title="Clientes Ativos"
                    currentValue={currentMetrics.totalClientes}
                    simulatedValue={simulatedMetrics.clientesProjetados}
                    icon={Users}
                    format="number"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de Projeção */}
            <Card>
              <CardHeader>
                <CardTitle>Projeção de MRR</CardTitle>
                <CardDescription>
                  Comparação entre cenário atual e simulado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={projectionData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="mes" className="text-xs" />
                      <YAxis
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                        className="text-xs"
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
                        ]}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="atual"
                        name="Cenário Atual"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="simulado"
                        name="Cenário Simulado"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                      {/* Marcos */}
                      {[3, 6, 12].filter(m => m <= horizonte).map(marco => (
                        <ReferenceLine
                          key={marco}
                          x={`Mês ${marco}`}
                          stroke="hsl(var(--primary))"
                          strokeDasharray="3 3"
                          strokeOpacity={0.5}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Salvar e Comparar Cenários */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Cenários Salvos
                </CardTitle>
                <CardDescription>
                  Salve cenários para comparar antes de criar seu plano de ação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Salvar cenário atual */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do cenário (ex: Otimista, Conservador...)"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveScenario()}
                  />
                  <Button onClick={handleSaveScenario} disabled={!scenarioName.trim()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                </div>

                {/* Lista de cenários salvos */}
                {savedScenarios.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid gap-2">
                      {savedScenarios.map((scenario) => (
                        <div key={scenario.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex-1">
                            <div className="font-medium">{scenario.name}</div>
                            <div className="text-xs text-muted-foreground flex gap-3 mt-1">
                              <span>CAC: R$ {scenario.cac.toFixed(0)}</span>
                              <span>Ticket: R$ {scenario.ticketMedio.toFixed(0)}</span>
                              <span>Churn: {scenario.churnRate.toFixed(1)}%</span>
                              <span>Novos: {scenario.novosClientesMes}/mês</span>
                              <span>{scenario.horizonte} meses</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleLoadScenario(scenario)}>
                              Carregar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveScenario(scenario.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {savedScenarios.length >= 2 && (
                      <Button variant="outline" className="w-full" onClick={() => setShowCompareModal(true)}>
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Comparar {savedScenarios.length} Cenários
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum cenário salvo ainda</p>
                    <p className="text-xs mt-1">Ajuste os valores acima e salve para comparar depois</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navegação */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={() => setCurrentStep(3)} size="lg">
                Criar Plano de Ação
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* PASSO 3: Plano de Ação com IA */}
        {currentStep === 3 && (!planFinalized || showEditMode) && (
          <div className="space-y-6">
            {/* Modo: Escolha */}
            {planMode === 'choose' && (
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Target className="w-6 h-6 text-primary" />
                    Como você quer criar seu plano?
                  </CardTitle>
                  <CardDescription>
                    Escolha a forma que melhor combina com você
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        setPlanMode('list');
                        handleGenerateActionPlan();
                      }}
                      className="p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">Gerar com IA</h3>
                          <Badge variant="secondary" className="text-xs">Recomendado</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        A IA analisa seus dados e cria sugestões personalizadas.
                      </p>
                    </button>
                    <button
                      onClick={() => setPlanMode('custom')}
                      className="p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                          <Target className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">Tenho um plano</h3>
                          <Badge variant="outline" className="text-xs">Personalizado</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Descreva sua ideia e a IA estrutura em tarefas.
                      </p>
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Modo: Descrever plano customizado */}
            {planMode === 'custom' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-orange-500" />
                      Descreva seu plano
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setPlanMode('choose')}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {actionsError && (
                    <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                      {actionsError}
                    </div>
                  )}
                  <Textarea
                    placeholder="Ex: Quero reduzir o churn focando em melhorar o onboarding. Também pretendo aumentar o ticket médio com upsell..."
                    value={userPlanInput}
                    onChange={(e) => setUserPlanInput(e.target.value)}
                    rows={5}
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleStructureUserPlan} disabled={loadingActions || !userPlanInput.trim()}>
                      {loadingActions ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      Estruturar com IA
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Modo: Lista de ações */}
            {planMode === 'list' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        Seu Plano de Ação
                      </CardTitle>
                      <CardDescription>
                        {actions.length} tarefas • Marque as concluídas
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                      setActions([]);
                      setUserPlanInput('');
                      setPlanMode('choose');
                    }}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Novo Plano
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Erro */}
                  {actionsError && (
                    <div className="flex items-center gap-2 p-4 mb-4 bg-destructive/10 text-destructive rounded-lg">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm">{actionsError}</span>
                    </div>
                  )}

                  {/* Estado vazio */}
                  {!loadingActions && actions.length === 0 && !actionsError && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Target className="w-16 h-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum plano gerado ainda</h3>
                      <p className="text-muted-foreground max-w-md mb-4">
                        Clique em "Gerar com IA" para criar um plano de ação personalizado
                        baseado no seu segmento e metas de simulação.
                      </p>
                    </div>
                  )}

                  {/* Loading */}
                  {loadingActions && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                      <p className="text-muted-foreground">Gerando plano de ação com IA...</p>
                    </div>
                  )}

                  {/* Lista de Ações */}
                  {!loadingActions && actions.length > 0 && (
                    <div className="space-y-4">
                      {actions.map((action, index) => (
                        <div
                          key={action.id}
                          className={`p-4 rounded-lg border ${action.completed ? 'bg-muted/50 border-muted' : 'bg-card border-border'
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={action.completed}
                              onCheckedChange={() => toggleActionComplete(action.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${action.completed ? 'line-through text-muted-foreground' : ''}`}>
                                    {index + 1}. {action.title}
                                  </span>
                                  <Badge
                                    variant={
                                      action.priority === 'alta' ? 'destructive' :
                                        action.priority === 'media' ? 'default' : 'secondary'
                                    }
                                    className="text-xs"
                                  >
                                    {action.priority}
                                  </Badge>
                                </div>
                                {/* Botão remover tarefa */}
                                {(!planFinalized || showEditMode) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                    onClick={() => setActions(prev => prev.filter(a => a.id !== action.id))}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                              <p className={`text-sm ${action.completed ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                                {action.description}
                              </p>
                              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  Iniciar em: {format(new Date(action.suggestedDate), "dd 'de' MMMM", { locale: ptBR })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Resumo */}
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Progresso: {actions.filter(a => a.completed).length} de {actions.length} ações concluídas
                          </span>
                          <Badge variant="outline">
                            {Math.round((actions.filter(a => a.completed).length / actions.length) * 100)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Navegação */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => handleBackWithConfirmation(() => setCurrentStep(2))}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={() => setCurrentStep(4)}>
                Ver Acompanhamento
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* PASSO 4: Acompanhamento (Execução) */}
        {(currentStep === 4 || (planFinalized && !showEditMode)) && (
          <div className="space-y-6">
            {/* Sem ações ainda */}
            {actions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Nenhum plano criado</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-4">
                    Crie um plano de ação primeiro para poder acompanhar seu progresso.
                  </p>
                  <Button onClick={() => setCurrentStep(3)}>
                    <Target className="w-4 h-4 mr-2" />
                    Criar Plano de Ação
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Cards de Resumo */}
                <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${planFinalized && !showEditMode ? 'animate-in fade-in duration-700' : ''}`}>
                  {/* Progresso das Ações */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Progresso do Plano</CardDescription>
                      <CardTitle className="text-3xl flex items-baseline gap-2">
                        {actions.filter(a => a.completed).length}/{actions.length}
                        <span className="text-sm text-muted-foreground font-normal">ações</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full bg-muted rounded-full h-2 mb-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${(actions.filter(a => a.completed).length / actions.length) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {Math.round((actions.filter(a => a.completed).length / actions.length) * 100)}% concluído
                      </p>
                    </CardContent>
                  </Card>

                  {/* MRR Atual vs Meta */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>MRR Atual</CardDescription>
                      <CardTitle className="text-3xl">
                        R$ {currentMetrics.mrr.toLocaleString('pt-BR')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Meta: R$ {simulatedMetrics.mrr.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <p className="text-xs text-primary mt-1">
                        {simulatedMetrics.mrr > currentMetrics.mrr ? '+' : ''}
                        {currentMetrics.mrr > 0 ? ((simulatedMetrics.mrr - currentMetrics.mrr) / currentMetrics.mrr * 100).toFixed(0) : 0}% planejado
                      </p>
                    </CardContent>
                  </Card>

                  {/* Horizonte */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Horizonte do Plano</CardDescription>
                      <CardTitle className="text-3xl flex items-baseline gap-2">
                        {horizonte}
                        <span className="text-sm text-muted-foreground font-normal">meses</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Término: {format(new Date(Date.now() + horizonte * 30 * 24 * 60 * 60 * 1000), "MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Comparativo Real vs Planejado */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Real vs Planejado
                    </CardTitle>
                    <CardDescription>
                      Acompanhe a evolução das suas métricas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* CAC */}
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">CAC</span>
                          {simulated.cac < currentMetrics.cac ? (
                            <Badge variant="default" className="text-xs bg-green-500">
                              <TrendingDown className="w-3 h-3 mr-1" />
                              Meta: reduzir
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Mantendo</Badge>
                          )}
                        </div>
                        <div className="text-2xl font-bold">R$ {currentMetrics.cac.toFixed(0)}</div>
                        <div className="text-xs text-muted-foreground">
                          Meta: R$ {simulated.cac.toFixed(0)}
                        </div>
                      </div>

                      {/* Ticket Médio */}
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Ticket Médio</span>
                          {simulated.ticketMedio > currentMetrics.ticketMedio ? (
                            <Badge variant="default" className="text-xs bg-green-500">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              Meta: aumentar
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Mantendo</Badge>
                          )}
                        </div>
                        <div className="text-2xl font-bold">R$ {currentMetrics.ticketMedio.toFixed(0)}</div>
                        <div className="text-xs text-muted-foreground">
                          Meta: R$ {simulated.ticketMedio.toFixed(0)}
                        </div>
                      </div>

                      {/* Churn */}
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Churn Rate</span>
                          {simulated.churnRate < currentMetrics.churnRate ? (
                            <Badge variant="default" className="text-xs bg-green-500">
                              <TrendingDown className="w-3 h-3 mr-1" />
                              Meta: reduzir
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Mantendo</Badge>
                          )}
                        </div>
                        <div className="text-2xl font-bold">{currentMetrics.churnRate.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">
                          Meta: {simulated.churnRate.toFixed(1)}%
                        </div>
                      </div>

                      {/* Novos Clientes */}
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Novos/Mês</span>
                          {simulated.novosClientesMes > currentMetrics.novosClientesMes ? (
                            <Badge variant="default" className="text-xs bg-green-500">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              Meta: aumentar
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Mantendo</Badge>
                          )}
                        </div>
                        <div className="text-2xl font-bold">{currentMetrics.novosClientesMes}</div>
                        <div className="text-xs text-muted-foreground">
                          Meta: {simulated.novosClientesMes}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lista de Ações (resumida) */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5" />
                          Ações do Plano
                        </CardTitle>
                        <CardDescription>
                          Marque as ações conforme for concluindo
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setShowNewTaskModal(true)}>
                          + Nova Tarefa
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          setShowEditMode(true);
                          setCurrentStep(3);
                        }}>
                          Editar Plano
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {actions.map((action, index) => (
                        <div
                          key={action.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${action.completed ? 'bg-muted/50' : ''
                            }`}
                        >
                          <Checkbox
                            checked={action.completed}
                            onCheckedChange={() => toggleActionComplete(action.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm ${action.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {index + 1}. {action.title}
                            </span>
                            {/* Indicadores de sub-tarefas, notas e data */}
                            <div className="flex gap-3 mt-1 flex-wrap">
                              {/* Data de início */}
                              {action.suggestedDate && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(action.suggestedDate), "dd/MM", { locale: ptBR })}
                                </span>
                              )}
                              {action.subtasks && action.subtasks.length > 0 && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <ListChecks className="w-3 h-3" />
                                  {action.subtasks.filter(s => s.completed).length}/{action.subtasks.length}
                                </span>
                              )}
                              {action.notes && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <StickyNote className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={
                              action.priority === 'alta' ? 'destructive' :
                                action.priority === 'media' ? 'default' : 'secondary'
                            }
                            className="text-xs shrink-0"
                          >
                            {action.priority}
                          </Badge>
                          {/* Botões de ação */}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTaskId(action.id);
                              }}
                            >
                              Detalhes
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTaskId(action.id);
                              }}
                              title="Editar tarefa"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActions(prev => prev.filter(a => a.id !== action.id));
                              }}
                              title="Excluir tarefa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Navegação */}
            <div className="flex justify-between items-center w-full">
              <Button variant="outline" onClick={() => setCurrentStep(3)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>

              <Button
                onClick={() => {
                  handleFinishAndSave();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20 ${planFinalized && !showEditMode ? 'hidden' : ''}`}
              >
                <Rocket className="w-4 h-4 mr-2" />
                {showEditMode ? 'Salvar Alterações e Voltar' : 'Concluir e Iniciar Execução'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Segmento */}
      <Dialog open={showSegmentModal} onOpenChange={setShowSegmentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Qual é o seu tipo de negócio?</DialogTitle>
            <DialogDescription>
              Isso nos ajuda a dar sugestões mais precisas para o seu segmento.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {SEGMENTS.map((segment) => (
              <Button
                key={segment.id}
                variant="outline"
                className="justify-start h-auto py-3"
                onClick={() => handleSelectSegment(segment.id)}
              >
                <span className="text-xl mr-3">{segment.icon}</span>
                <span>{segment.label}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Tarefa */}
      <Dialog open={showNewTaskModal} onOpenChange={setShowNewTaskModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Nova Tarefa
            </DialogTitle>
            <DialogDescription>
              Adicione uma nova ação ao seu plano. Use o chat do Copiloto para pedir sugestões de tarefas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título *</label>
              <Input
                placeholder="Ex: Implementar onboarding automatizado"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                placeholder="Detalhes da tarefa..."
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridade</label>
              <Select value={newTaskPriority} onValueChange={(value: 'alta' | 'media' | 'baixa') => setNewTaskPriority(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">🔴 Alta</SelectItem>
                  <SelectItem value="media">🟡 Média</SelectItem>
                  <SelectItem value="baixa">🟢 Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNewTaskModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddNewTask} disabled={!newTaskTitle.trim()}>
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes da Tarefa */}
      <Dialog open={!!selectedTaskId} onOpenChange={(open) => !open && setSelectedTaskId(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    {selectedTask.title}
                  </DialogTitle>
                  <Badge
                    variant={
                      selectedTask.priority === 'alta' ? 'destructive' :
                        selectedTask.priority === 'media' ? 'default' : 'secondary'
                    }
                  >
                    {selectedTask.priority}
                  </Badge>
                </div>
                <DialogDescription>
                  {selectedTask.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Data de Início */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Data de Início
                  </label>
                  <Input
                    type="date"
                    value={selectedTask.suggestedDate ? new Date(selectedTask.suggestedDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setActions(prev => prev.map(a =>
                        a.id === selectedTask.id
                          ? { ...a, suggestedDate: newDate }
                          : a
                      ));
                    }}
                    className="w-full"
                  />
                </div>

                {/* Sub-tarefas */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <ListChecks className="w-4 h-4" />
                      Sub-tarefas
                    </label>
                  </div>

                  {/* Lista de sub-tarefas */}
                  <div className="space-y-2">
                    {selectedTask.subtasks && selectedTask.subtasks.map((subtask, index) => (
                      <div key={subtask.id} className="flex items-center gap-2 p-2 rounded border">
                        <Checkbox
                          checked={subtask.completed}
                          onCheckedChange={() => toggleSubtaskComplete(selectedTask.id, subtask.id)}
                        />
                        <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {subtask.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:text-destructive"
                          onClick={() => {
                            const taskIndex = actions.findIndex(a => a.id === selectedTask.id) + 1;
                            handleRemoveSubtask(taskIndex, index + 1);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}

                    {(!selectedTask.subtasks || selectedTask.subtasks.length === 0) && (
                      <p className="text-sm text-muted-foreground">Nenhuma sub-tarefa ainda</p>
                    )}
                  </div>

                  {/* Adicionar sub-tarefa */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nova sub-tarefa..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                          const taskIndex = actions.findIndex(a => a.id === selectedTask.id) + 1;
                          handleAddSubtask(taskIndex, newSubtaskTitle.trim());
                          setNewSubtaskTitle('');
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (newSubtaskTitle.trim()) {
                          const taskIndex = actions.findIndex(a => a.id === selectedTask.id) + 1;
                          handleAddSubtask(taskIndex, newSubtaskTitle.trim());
                          setNewSubtaskTitle('');
                        }
                      }}
                      disabled={!newSubtaskTitle.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <StickyNote className="w-4 h-4" />
                    Observações
                  </label>
                  <Textarea
                    placeholder="Adicione observações, links, referências..."
                    value={selectedTask.notes || ''}
                    onChange={(e) => updateTaskNotes(selectedTask.id, e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    💡 O Copiloto IA pode ler suas observações para ter mais contexto
                  </p>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    // Gerar link do Google Calendar
                    const title = encodeURIComponent(selectedTask.title);
                    const details = encodeURIComponent(selectedTask.description || '');
                    const startDate = selectedTask.suggestedDate
                      ? new Date(selectedTask.suggestedDate).toISOString().replace(/-|:|\.\d+/g, '').slice(0, 8)
                      : new Date().toISOString().replace(/-|:|\.\d+/g, '').slice(0, 8);

                    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${startDate}/${startDate}`;

                    window.open(googleCalendarUrl, '_blank');
                  }}
                >
                  <Calendar className="w-4 h-4" />
                  Adicionar ao Google Agenda
                </Button>
                <Button onClick={() => setSelectedTaskId(null)}>
                  Fechar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Comparar Cenários */}
      <Dialog open={showCompareModal} onOpenChange={setShowCompareModal}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Comparar Cenários
            </DialogTitle>
            <DialogDescription>
              Analise os cenários lado a lado para tomar a melhor decisão
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Tabela de comparação */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Métrica</th>
                    <th className="text-center py-2 px-4 bg-muted/50">Atual</th>
                    {savedScenarios.map((s) => (
                      <th key={s.id} className="text-center py-2 px-4">{s.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-medium">CAC</td>
                    <td className="text-center py-2 px-4 bg-muted/50">R$ {currentMetrics.cac.toFixed(0)}</td>
                    {savedScenarios.map((s) => (
                      <td key={s.id} className={`text-center py-2 px-4 ${s.cac < currentMetrics.cac ? 'text-green-500' : s.cac > currentMetrics.cac ? 'text-red-500' : ''}`}>
                        R$ {s.cac.toFixed(0)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-medium">Ticket Médio</td>
                    <td className="text-center py-2 px-4 bg-muted/50">R$ {currentMetrics.ticketMedio.toFixed(0)}</td>
                    {savedScenarios.map((s) => (
                      <td key={s.id} className={`text-center py-2 px-4 ${s.ticketMedio > currentMetrics.ticketMedio ? 'text-green-500' : s.ticketMedio < currentMetrics.ticketMedio ? 'text-red-500' : ''}`}>
                        R$ {s.ticketMedio.toFixed(0)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-medium">Churn Rate</td>
                    <td className="text-center py-2 px-4 bg-muted/50">{currentMetrics.churnRate.toFixed(1)}%</td>
                    {savedScenarios.map((s) => (
                      <td key={s.id} className={`text-center py-2 px-4 ${s.churnRate < currentMetrics.churnRate ? 'text-green-500' : s.churnRate > currentMetrics.churnRate ? 'text-red-500' : ''}`}>
                        {s.churnRate.toFixed(1)}%
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-medium">Novos/Mês</td>
                    <td className="text-center py-2 px-4 bg-muted/50">{currentMetrics.novosClientesMes}</td>
                    {savedScenarios.map((s) => (
                      <td key={s.id} className={`text-center py-2 px-4 ${s.novosClientesMes > currentMetrics.novosClientesMes ? 'text-green-500' : s.novosClientesMes < currentMetrics.novosClientesMes ? 'text-red-500' : ''}`}>
                        {s.novosClientesMes}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-medium">Horizonte</td>
                    <td className="text-center py-2 px-4 bg-muted/50">-</td>
                    {savedScenarios.map((s) => (
                      <td key={s.id} className="text-center py-2 px-4">{s.horizonte} meses</td>
                    ))}
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td className="py-4 pr-4 font-medium">Ação</td>
                    <td className="text-center py-4 px-4 bg-muted/50"></td>
                    {savedScenarios.map((s) => (
                      <td key={s.id} className="text-center py-4 px-4">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            handleLoadScenario(s);
                            setShowCompareModal(false);
                          }}
                        >
                          Definir como Meta
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowCompareModal(false)}>
                Fechar
              </Button>
              {savedScenarios.length > 0 && (
                <Button onClick={() => {
                  handleLoadScenario(savedScenarios[savedScenarios.length - 1]);
                  setShowCompareModal(false);
                }}>
                  Usar Último Cenário
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Cancelar */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Deseja cancelar o planejamento?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O plano ficará registrado como cancelado. Você poderá reativá-lo futuramente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium mb-1 block">Motivo do Cancelamento:</label>
            <Textarea
              placeholder="Ex: Mudança de estratégia, falta de orçamento..."
              value={tempReason}
              onChange={(e) => setTempReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleCancelPlan(tempReason)} className="bg-red-600 hover:bg-red-700">
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Excluir */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Excluir Planejamento Definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todo o histórico, cenários e progresso serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlan} className="bg-red-600 hover:bg-red-700">
              Sim, Excluir Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Confirmar Saída */}
      <AlertDialog open={showExitConfirmDialog} onOpenChange={setShowExitConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Descartar alterações?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você tem ações no plano que ainda não foram finalizadas. Se voltar agora, elas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit} className="bg-amber-600 hover:bg-amber-700">
              Descartar e voltar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Resumo do Plano */}
      <Dialog open={showSummaryModal} onOpenChange={setShowSummaryModal}>
        <DialogContent className="max-w-[1000px] h-[90vh] overflow-y-auto bg-slate-100/90 p-6">
          <div className="flex justify-end gap-2 sticky top-0 z-20 mb-4 bg-transparent pointer-events-none">
            <div className="pointer-events-auto flex gap-2">
              <Button onClick={handleExportPDF} disabled={isExporting} className="shadow-lg">
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                Exportar PDF
              </Button>
              <Button variant="outline" onClick={() => setShowSummaryModal(false)} className="bg-white shadow-lg">Fechar</Button>
            </div>
          </div>

          <div className="flex justify-center pb-8">
            <PlanSummary
              segment={SEGMENTS.find(s => s.id === selectedSegment)?.label || 'Geral'}
              startDate={planStartDate}
              horizonte={horizonte}
              currentMetrics={currentMetrics}
              simulatedMetrics={simulated}
              actions={actions}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Copiloto IA */}
      {
        selectedSegment && (
          <CopilotChat
            segment={SEGMENTS.find(s => s.id === selectedSegment)?.label || 'Outro'}
            currentMetrics={currentMetrics}
            simulatedMetrics={simulated}
            horizonte={horizonte}
            actions={actions}
            onAdjustment={(adjustments) => {
              // Aplicar ajustes sugeridos pela IA
              setSimulated(prev => ({
                ...prev,
                ...adjustments,
              }));
            }}
            onAddTask={(task) => {
              // Adicionar tarefa sugerida pela IA
              const newAction: ActionItem = {
                id: `action-${Date.now()}`,
                title: task.titulo,
                description: task.descricao,
                priority: task.prioridade,
                suggestedDate: new Date().toISOString().split('T')[0],
                completed: false,
              };
              setActions(prev => [...prev, newAction]);
            }}
            onRemoveTask={(taskNumber) => {
              // Remover tarefa pelo número (1-indexed)
              setActions(prev => prev.filter((_, index) => index !== taskNumber - 1));
            }}
            onAddSubtask={handleAddSubtask}
            onRemoveSubtask={handleRemoveSubtask}
          />
        )
      }
    </div >
  );
}


