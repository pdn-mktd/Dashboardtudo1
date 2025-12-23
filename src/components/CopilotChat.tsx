import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Bot,
    X,
    Send,
    Sparkles,
    Loader2,
    Settings,
    Key,
    Check
} from 'lucide-react';
import {
    chatWithGroq,
    parseAdjustmentCommands,
    parseTaskCommand,
    parseRemoveCommand,
    parseSubtaskCommand,
    parseRemoveSubtaskCommand,
    cleanResponse,
    getApiKey,
    setApiKey,
    ActionItem
} from '@/services/groqService';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface CopilotChatProps {
    segment: string;
    currentMetrics: {
        cac: number;
        ticketMedio: number;
        churnRate: number;
        mrr: number;
        ltv: number;
        totalClientes: number;
        novosClientesMes: number;
    };
    simulatedMetrics: {
        cac: number;
        ticketMedio: number;
        churnRate: number;
        novosClientesMes: number;
    };
    horizonte: number;
    actions?: ActionItem[];
    onAdjustment?: (adjustments: Record<string, number>) => void;
    onAddTask?: (task: { titulo: string; descricao: string; prioridade: 'alta' | 'media' | 'baixa' }) => void;
    onRemoveTask?: (index: number) => void;
    onAddSubtask?: (taskIndex: number, subtaskTitle: string) => void;
    onRemoveSubtask?: (taskIndex: number, subtaskIndex: number) => void;
}

export function CopilotChat({
    segment,
    currentMetrics,
    simulatedMetrics,
    horizonte,
    actions,
    onAdjustment,
    onAddTask,
    onRemoveTask,
    onAddSubtask,
    onRemoveSubtask,
}: CopilotChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [hasApiKey, setHasApiKey] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Verificar se já tem API key
    useEffect(() => {
        const key = getApiKey();
        setHasApiKey(!!key);
        if (key) {
            setApiKeyInput(key.slice(0, 10) + '...');
        }
    }, []);

    // Auto-scroll para novas mensagens
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Mensagem inicial quando abre o chat
    useEffect(() => {
        if (isOpen && messages.length === 0 && hasApiKey) {
            const welcomeMessage: Message = {
                role: 'assistant',
                content: `Olá! 👋 Sou seu copiloto de planejamento. Vi que você está simulando um cenário para os próximos ${horizonte} meses.

Posso te ajudar com:
• Sugestões para melhorar seus números
• Análise do cenário atual vs simulado
• Plano de ação específico para ${segment}

O que gostaria de explorar?`,
                timestamp: new Date(),
            };
            setMessages([welcomeMessage]);
        }
    }, [isOpen, horizonte, segment, hasApiKey]);

    const handleSaveApiKey = () => {
        if (apiKeyInput.trim() && !apiKeyInput.includes('...')) {
            setApiKey(apiKeyInput.trim());
            setHasApiKey(true);
            setShowSettings(false);
            setApiKeyInput(apiKeyInput.trim().slice(0, 10) + '...');
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            // Preparar histórico para a API
            const apiMessages = messages.concat(userMessage).map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            }));

            const response = await chatWithGroq(apiMessages, {
                segment,
                currentMetrics,
                simulatedMetrics,
                horizonte,
                actions,
            });

            // Verificar se há comandos de ajuste
            const adjustments = parseAdjustmentCommands(response);
            if (Object.keys(adjustments).length > 0 && onAdjustment) {
                onAdjustment(adjustments);
            }

            // Verificar se há comando de adicionar tarefa
            const taskCommand = parseTaskCommand(response);
            if (taskCommand && onAddTask) {
                onAddTask(taskCommand);
            }

            // Verificar se há comando de remover tarefa
            const removeCommand = parseRemoveCommand(response);
            if (removeCommand && onRemoveTask) {
                onRemoveTask(removeCommand.numero);
            }

            // Verificar se há comando de adicionar sub-tarefa
            const subtaskCommand = parseSubtaskCommand(response);
            if (subtaskCommand && onAddSubtask) {
                onAddSubtask(subtaskCommand.tarefa, subtaskCommand.titulo);
            }

            // Verificar se há comando de remover sub-tarefa
            const removeSubtaskCommand = parseRemoveSubtaskCommand(response);
            if (removeSubtaskCommand && onRemoveSubtask) {
                onRemoveSubtask(removeSubtaskCommand.tarefa, removeSubtaskCommand.subtarefa);
            }

            // Limpar comandos da resposta exibida
            const cleanedResponse = cleanResponse(response);

            const assistantMessage: Message = {
                role: 'assistant',
                content: cleanedResponse,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
            if (err instanceof Error && err.message === 'API_KEY_NOT_SET') {
                setShowSettings(true);
                setError('Configure sua API key primeiro');
            } else {
                setError(err instanceof Error ? err.message : 'Erro ao conectar com a IA');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Sugestões rápidas
    const quickSuggestions = [
        'Como reduzir meu CAC?',
        'Meu churn está bom?',
        'Sugira um plano de ação',
    ];

    return (
        <>
            {/* Botão flutuante */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 ${isOpen ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'
                    }`}
                size="icon"
            >
                {isOpen ? (
                    <X className="h-6 w-6" />
                ) : (
                    <Bot className="h-6 w-6" />
                )}
            </Button>

            {/* Indicador de notificação */}
            {!isOpen && messages.length === 0 && (
                <div className="fixed bottom-6 right-24 bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg z-50 animate-bounce">
                    <span className="text-sm">💡 Precisa de ajuda?</span>
                </div>
            )}

            {/* Chat Panel */}
            {isOpen && (
                <Card className="fixed bottom-24 right-6 w-96 h-[500px] shadow-2xl z-50 flex flex-col">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="flex items-center justify-between text-base">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                Copiloto IA
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                    {segment}
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => setShowSettings(!showSettings)}
                                >
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                        {/* Configurações de API Key */}
                        {showSettings && (
                            <div className="p-4 border-b bg-muted/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <Key className="h-4 w-4" />
                                    <span className="text-sm font-medium">API Key do Groq</span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Obtenha sua chave em{' '}
                                    <a
                                        href="https://console.groq.com/keys"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary underline"
                                    >
                                        console.groq.com
                                    </a>
                                </p>
                                <div className="flex gap-2">
                                    <Input
                                        type="password"
                                        placeholder="gsk_xxxxxxxx..."
                                        value={apiKeyInput.includes('...') ? '' : apiKeyInput}
                                        onChange={(e) => setApiKeyInput(e.target.value)}
                                        className="flex-1 text-sm"
                                    />
                                    <Button size="sm" onClick={handleSaveApiKey}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                </div>
                                {hasApiKey && (
                                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                        <Check className="h-3 w-3" /> Chave configurada
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Aviso se não tem API key */}
                        {!hasApiKey && !showSettings && (
                            <div className="p-4 border-b bg-amber-50 dark:bg-amber-950">
                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                    ⚠️ Configure sua API key do Groq para usar o Copiloto.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => setShowSettings(true)}
                                >
                                    <Key className="h-4 w-4 mr-2" />
                                    Configurar
                                </Button>
                            </div>
                        )}

                        {/* Mensagens */}
                        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                            <div className="space-y-4">
                                {messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
                                            }`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${message.role === 'user'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted'
                                                }`}
                                        >
                                            <p className="whitespace-pre-wrap">{message.content}</p>
                                        </div>
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-muted rounded-lg px-3 py-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div className="flex justify-center">
                                        <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">
                                            {error}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        {/* Sugestões rápidas */}
                        {messages.length <= 1 && hasApiKey && (
                            <div className="px-4 py-2 border-t">
                                <p className="text-xs text-muted-foreground mb-2">Sugestões:</p>
                                <div className="flex flex-wrap gap-2">
                                    {quickSuggestions.map((suggestion, index) => (
                                        <Button
                                            key={index}
                                            variant="outline"
                                            size="sm"
                                            className="text-xs h-7"
                                            onClick={() => {
                                                setInput(suggestion);
                                            }}
                                        >
                                            {suggestion}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input */}
                        <div className="p-4 border-t">
                            <div className="flex gap-2">
                                <Input
                                    placeholder={hasApiKey ? "Digite sua pergunta..." : "Configure a API key primeiro"}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    disabled={isLoading || !hasApiKey}
                                    className="flex-1"
                                />
                                <Button
                                    size="icon"
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading || !hasApiKey}
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </>
    );
}
