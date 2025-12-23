// Serviço de integração com Groq AI
// API compatível com OpenAI

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface GroqResponse {
    choices: {
        message: {
            role: string;
            content: string;
        };
    }[];
}

interface PlanningContext {
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
    startDate?: Date;
    actions?: ActionItem[];
}

const SYSTEM_PROMPT = (context: PlanningContext) => `Você é um consultor de negócios especializado em SaaS, growth e finanças. 
Você está ajudando um empreendedor do segmento "${context.segment}" a planejar o crescimento do negócio.

DADOS ATUAIS DO NEGÓCIO:
- CAC (Custo de Aquisição): R$ ${context.currentMetrics.cac.toFixed(2)}
- Ticket Médio: R$ ${context.currentMetrics.ticketMedio.toFixed(2)}
- Churn Rate: ${context.currentMetrics.churnRate.toFixed(1)}%
- MRR (Receita Recorrente): R$ ${context.currentMetrics.mrr.toFixed(2)}
- LTV: R$ ${context.currentMetrics.ltv.toFixed(2)}
- Total de Clientes Ativos: ${context.currentMetrics.totalClientes}
- Novos Clientes/Mês: ${context.currentMetrics.novosClientesMes}

CENÁRIO SIMULADO PELO USUÁRIO:
- CAC (meta): R$ ${context.simulatedMetrics.cac.toFixed(2)}
- Ticket Médio (meta): R$ ${context.simulatedMetrics.ticketMedio.toFixed(2)}
- Churn Rate (meta): ${context.simulatedMetrics.churnRate.toFixed(1)}%
- Novos Clientes/Mês (meta): ${context.simulatedMetrics.novosClientesMes}
- Horizonte de Projeção: ${context.horizonte} meses

PLANO DE AÇÃO ATUAL:
${context.actions && context.actions.length > 0
        ? context.actions.map((a, i) => {
            let taskInfo = `${i + 1}. [${a.completed ? 'FEITA' : 'PENDENTE'}] ${a.title} (${a.priority})`;
            if (a.subtasks && a.subtasks.length > 0) {
                taskInfo += `\n   Sub-tarefas: ${a.subtasks.map(s => `[${s.completed ? '✓' : ' '}] ${s.title}`).join(', ')}`;
            }
            if (a.notes) {
                taskInfo += `\n   Observações: ${a.notes}`;
            }
            return taskInfo;
        }).join('\n')
        : 'Nenhuma tarefa no plano ainda.'
    }

INSTRUÇÕES:
1. Seja objetivo e prático nas respostas
2. Dê sugestões acionáveis e específicas para o segmento
3. Quando sugerir mudanças nos números, seja claro sobre quais valores ajustar
4. Use emojis moderadamente para deixar as respostas mais visuais
5. Responda sempre em português brasileiro
6. Se o usuário pedir para ajustar um valor específico, forneça a sugestão de forma clara
7. Você pode ADICIONAR novas tarefas ao plano quando sugerido
8. Você pode REMOVER tarefas quando o usuário pedir
9. Você pode ADICIONAR sub-tarefas dentro de tarefas existentes
10. Você pode REMOVER sub-tarefas quando o usuário pedir
11. Use as observações das tarefas para ter mais contexto sobre o que o usuário está fazendo

FORMATO DE SUGESTÃO DE AJUSTE:
Quando quiser sugerir uma mudança nos sliders, use este formato:
[AJUSTAR: cac=VALOR] ou [AJUSTAR: churnRate=VALOR] etc.

FORMATO DE ADICIONAR TAREFA:
Quando quiser adicionar uma nova tarefa ao plano:
[TAREFA: titulo="Título da Tarefa" descricao="Descrição detalhada" prioridade="alta|media|baixa"]

FORMATO DE REMOVER TAREFA:
Quando o usuário pedir para remover uma tarefa (use o número da lista):
[REMOVER: numero=1]

FORMATO DE ADICIONAR SUB-TAREFA:
Quando quiser adicionar uma sub-tarefa a uma tarefa existente:
[SUBTAREFA: tarefa=NUMERO titulo="Título da sub-tarefa"]

FORMATO DE REMOVER SUB-TAREFA:
Quando o usuário pedir para remover uma sub-tarefa:
[REMOVER_SUB: tarefa=NUMERO subtarefa=NUMERO]

Exemplo: "Sugiro reduzir seu CAC para R$ 200 [AJUSTAR: cac=200]"
Exemplo: "Vou adicionar essa tarefa para você [TAREFA: titulo="Criar landing page" descricao="Desenvolver página de captura" prioridade="alta"]"
Exemplo: "Pronto, removi a tarefa 3 [REMOVER: numero=3]"
Exemplo: "Adicionei uma sub-tarefa [SUBTAREFA: tarefa=1 titulo="Mapear pontos de melhoria"]"
Exemplo: "Removi a sub-tarefa [REMOVER_SUB: tarefa=1 subtarefa=2]"
`;

// Funções para gerenciar API key no localStorage
export const getApiKey = (): string | null => {
    return localStorage.getItem('groq_api_key');
};

export const setApiKey = (key: string): void => {
    localStorage.setItem('groq_api_key', key);
};

export const removeApiKey = (): void => {
    localStorage.removeItem('groq_api_key');
};

export const chatWithGroq = async (
    messages: Message[],
    context: PlanningContext
): Promise<string> => {
    const apiKey = getApiKey();

    if (!apiKey) {
        throw new Error('API_KEY_NOT_SET');
    }

    const systemMessage: Message = {
        role: 'system',
        content: SYSTEM_PROMPT(context),
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile', // Modelo mais recente da Groq
            messages: [systemMessage, ...messages],
            temperature: 0.7,
            max_tokens: 1024,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Erro na API Groq: ${error}`);
    }

    const data: GroqResponse = await response.json();
    return data.choices[0]?.message?.content || 'Sem resposta da IA.';
};

// Função para extrair comandos de ajuste da resposta
export const parseAdjustmentCommands = (response: string): Record<string, number> => {
    const adjustments: Record<string, number> = {};
    const regex = /\[AJUSTAR:\s*(\w+)=(\d+(?:\.\d+)?)\]/g;
    let match;

    while ((match = regex.exec(response)) !== null) {
        const [, key, value] = match;
        adjustments[key] = parseFloat(value);
    }

    return adjustments;
};

// Interface para comando de tarefa
export interface TaskCommand {
    titulo: string;
    descricao: string;
    prioridade: 'alta' | 'media' | 'baixa';
}

// Interface para comando de remoção
export interface RemoveCommand {
    numero: number;
}

// Função para parsear comando de adicionar tarefa
export const parseTaskCommand = (response: string): TaskCommand | null => {
    const regex = /\[TAREFA:\s*titulo="([^"]+)"\s*descricao="([^"]+)"\s*prioridade="(alta|media|baixa)"\]/;
    const match = response.match(regex);

    if (match) {
        return {
            titulo: match[1],
            descricao: match[2],
            prioridade: match[3] as 'alta' | 'media' | 'baixa',
        };
    }

    return null;
};

// Função para parsear comando de remover tarefa
export const parseRemoveCommand = (response: string): RemoveCommand | null => {
    const regex = /\[REMOVER:\s*numero=(\d+)\]/;
    const match = response.match(regex);

    if (match) {
        return { numero: parseInt(match[1], 10) };
    }

    return null;
};

// Interface para comando de sub-tarefa
export interface SubtaskCommand {
    tarefa: number;
    titulo: string;
}

// Interface para comando de remover sub-tarefa
export interface RemoveSubtaskCommand {
    tarefa: number;
    subtarefa: number;
}

// Função para parsear comando de adicionar sub-tarefa
export const parseSubtaskCommand = (response: string): SubtaskCommand | null => {
    const regex = /\[SUBTAREFA:\s*tarefa=(\d+)\s*titulo="([^"]+)"\]/;
    const match = response.match(regex);

    if (match) {
        return {
            tarefa: parseInt(match[1], 10),
            titulo: match[2],
        };
    }

    return null;
};

// Função para parsear comando de remover sub-tarefa
export const parseRemoveSubtaskCommand = (response: string): RemoveSubtaskCommand | null => {
    const regex = /\[REMOVER_SUB:\s*tarefa=(\d+)\s*subtarefa=(\d+)\]/;
    const match = response.match(regex);

    if (match) {
        return {
            tarefa: parseInt(match[1], 10),
            subtarefa: parseInt(match[2], 10),
        };
    }

    return null;
};

// Função para limpar todos os comandos da resposta exibida
export const cleanResponse = (response: string): string => {
    return response
        .replace(/\[AJUSTAR:\s*\w+=\d+(?:\.\d+)?\]/g, '')
        .replace(/\[TAREFA:\s*titulo="[^"]+"\s*descricao="[^"]+"\s*prioridade="(?:alta|media|baixa)"\]/g, '')
        .replace(/\[REMOVER:\s*numero=\d+\]/g, '')
        .replace(/\[SUBTAREFA:\s*tarefa=\d+\s*titulo="[^"]+"\]/g, '')
        .replace(/\[REMOVER_SUB:\s*tarefa=\d+\s*subtarefa=\d+\]/g, '')
        .trim();
};

// Interface para sub-tarefas
export interface SubTask {
    id: string;
    title: string;
    completed: boolean;
}

// Interface para ações do plano
export interface ActionItem {
    id: string;
    title: string;
    description: string;
    priority: 'alta' | 'media' | 'baixa';
    suggestedDate: string;
    completed: boolean;
    subtasks?: SubTask[];
    notes?: string;
}

// Prompt específico para gerar plano de ação
const ACTION_PLAN_PROMPT = (context: PlanningContext) => `Você é um consultor de negócios especializado em SaaS, growth e finanças.
Crie um plano de ação específico para um negócio do segmento "${context.segment}".

SITUAÇÃO ATUAL:
- CAC: R$ ${context.currentMetrics.cac.toFixed(2)}
- Ticket Médio: R$ ${context.currentMetrics.ticketMedio.toFixed(2)}
- Churn Rate: ${context.currentMetrics.churnRate.toFixed(1)}%
- MRR: R$ ${context.currentMetrics.mrr.toFixed(2)}
- Clientes Ativos: ${context.currentMetrics.totalClientes}

METAS PARA ${context.horizonte} MESES:
- CAC meta: R$ ${context.simulatedMetrics.cac.toFixed(2)} (${context.simulatedMetrics.cac < context.currentMetrics.cac ? 'redução' : 'aumento'})
- Ticket Médio meta: R$ ${context.simulatedMetrics.ticketMedio.toFixed(2)}
- Churn Rate meta: ${context.simulatedMetrics.churnRate.toFixed(1)}%
- Novos Clientes/Mês meta: ${context.simulatedMetrics.novosClientesMes}

INSTRUÇÕES:
Gere exatamente 5 ações específicas, priorizadas e acionáveis.

IMPORTANTE: Responda APENAS com um JSON válido no seguinte formato, sem nenhum texto antes ou depois:
[
  {
    "title": "Título curto da ação",
    "description": "Descrição detalhada do que fazer",
    "priority": "alta",
    "weeksToStart": 1
  }
]

As prioridades devem ser: "alta", "media" ou "baixa".
weeksToStart é o número de semanas a partir de hoje para começar a ação (1 a 12).
`;

// Função para gerar plano de ação com IA
export const generateActionPlan = async (
    context: PlanningContext
): Promise<ActionItem[]> => {
    const apiKey = getApiKey();

    if (!apiKey) {
        throw new Error('API_KEY_NOT_SET');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: ACTION_PLAN_PROMPT(context),
                },
                {
                    role: 'user',
                    content: 'Gere o plano de ação em JSON.',
                },
            ],
            temperature: 0.7,
            max_tokens: 1024,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Erro na API Groq: ${error}`);
    }

    const data: GroqResponse = await response.json();
    const content = data.choices[0]?.message?.content || '[]';

    try {
        // Extrair JSON da resposta (pode ter texto ao redor)
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('JSON não encontrado na resposta');
        }

        const rawActions = JSON.parse(jsonMatch[0]);

        // Converter para ActionItem com IDs e datas
        // Usar a data de início do projeto ou hoje como fallback
        const baseDate = context.startDate ? new Date(context.startDate) : new Date();
        return rawActions.map((action: any, index: number): ActionItem => {
            const taskDate = new Date(baseDate);
            taskDate.setDate(baseDate.getDate() + (action.weeksToStart || index) * 7);

            return {
                id: `action-${Date.now()}-${index}`,
                title: action.title || 'Ação sem título',
                description: action.description || '',
                priority: action.priority || 'media',
                suggestedDate: taskDate.toISOString().split('T')[0],
                completed: false,
            };
        });
    } catch (e) {
        console.error('Erro ao parsear plano de ação:', e, content);
        throw new Error('Erro ao processar plano de ação da IA');
    }
};

// Prompt para estruturar plano do usuário
const STRUCTURE_USER_PLAN_PROMPT = (context: PlanningContext, userPlan: string) => `Você é um consultor de negócios especializado em SaaS, growth e finanças.
O usuário do segmento "${context.segment}" descreveu o seguinte plano/objetivo:

"${userPlan}"

CONTEXTO DO NEGÓCIO:
- MRR atual: R$ ${context.currentMetrics.mrr.toFixed(2)}
- Churn Rate: ${context.currentMetrics.churnRate.toFixed(1)}%
- Ticket Médio: R$ ${context.currentMetrics.ticketMedio.toFixed(2)}
- CAC: R$ ${context.currentMetrics.cac.toFixed(2)}
- Horizonte de planejamento: ${context.horizonte} meses

TAREFA:
Transforme a ideia do usuário em 5-7 tarefas específicas, ordenadas cronologicamente.
Mantenha fidelidade à ideia original do usuário, mas estruture de forma acionável.

IMPORTANTE: Responda APENAS com um JSON válido no seguinte formato, sem nenhum texto antes ou depois:
[
  {
    "title": "Título curto e acionável",
    "description": "Descrição detalhada de como executar",
    "priority": "alta",
    "weeksToStart": 1
  }
]

As prioridades devem ser: "alta", "media" ou "baixa".
weeksToStart é o número de semanas a partir de hoje para começar (1 a 12).
`;

// Função para estruturar plano do usuário com IA
export const structureUserPlan = async (
    context: PlanningContext,
    userPlan: string
): Promise<ActionItem[]> => {
    const apiKey = getApiKey();

    if (!apiKey) {
        throw new Error('API_KEY_NOT_SET');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: STRUCTURE_USER_PLAN_PROMPT(context, userPlan),
                },
                {
                    role: 'user',
                    content: 'Estruture o plano em tarefas JSON.',
                },
            ],
            temperature: 0.7,
            max_tokens: 1500,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Erro na API Groq: ${error}`);
    }

    const data: GroqResponse = await response.json();
    const content = data.choices[0]?.message?.content || '[]';

    try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('JSON não encontrado na resposta');
        }

        const rawActions = JSON.parse(jsonMatch[0]);

        // Usar a data de início do projeto ou hoje como fallback
        const baseDate = context.startDate ? new Date(context.startDate) : new Date();
        return rawActions.map((action: any, index: number): ActionItem => {
            const taskDate = new Date(baseDate);
            taskDate.setDate(baseDate.getDate() + (action.weeksToStart || index) * 7);

            return {
                id: `action-${Date.now()}-${index}`,
                title: action.title || 'Ação sem título',
                description: action.description || '',
                priority: action.priority || 'media',
                suggestedDate: taskDate.toISOString().split('T')[0],
                completed: false,
            };
        });
    } catch (e) {
        console.error('Erro ao parsear plano estruturado:', e, content);
        throw new Error('Erro ao processar plano da IA');
    }
};
