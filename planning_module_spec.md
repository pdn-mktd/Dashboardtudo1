# Especificação do Módulo: Planejamento Financeiro e Simulação com IA

## 🎯 Objetivo
Criar uma ferramenta onde o empreendedor possa projetar o futuro financeiro da empresa, simular cenários ("E se..."), definir ações concretas e acompanhar os resultados em tempo real. A IA atua como copiloto, sugerindo estratégias e ajustando valores automaticamente.

**Filosofia:** "Plano sem ação não é nada."

---

## 🏗️ Estrutura da Página (/planejamento)

### Layout: Stepper de 4 Passos (Jornada de Planejamento)

```
PASSO 1 ───── PASSO 2 ───── PASSO 3 ───── PASSO 4
Situação     Simular       Planejar      Acompanhar
Atual        Cenários      Ações         Resultados
```

---

## 📊 PASSO 1: Situação Atual

**Objetivo:** Mostrar os KPIs atuais do negócio (importados do Dashboard).

**Conteúdo:**
- Cards com métricas atuais: CAC, LTV, MRR, Churn, Ticket Médio, Novos Clientes/Mês
- Modal de onboarding (primeira vez): Pergunta o segmento do negócio

**Segmentos Disponíveis:**
- SaaS / Software
- E-commerce / Varejo Online
- Serviços (Consultoria, Agência, etc.)
- Infoprodutos / Cursos
- Clínicas / Negócios com Agendamento
- Outro (campo livre)

---

## 🎚️ PASSO 2: Simular Cenários

**Objetivo:** Permitir que o usuário "brinque" com os números e veja o impacto.

**Métricas Editáveis (Inputs):**
- CAC (Custo de Aquisição)
- Ticket Médio / Preço
- Churn Rate
- Novos Clientes por Mês

**Métricas Calculadas (Outputs):**
- MRR / ARR
- LTV
- Lucro / Margem
- ROI

**Horizonte Temporal:**
- Slider de 1 a 24 meses (usuário escolhe)
- Marcos visuais automáticos: 3, 6, 12, 24 meses

**Visualização:**
- Gráfico de linha mostrando evolução mês a mês
- Cards "Hoje" vs "Em X meses" lado a lado
- Cores: Verde (melhoria), Vermelho (piora)

**Salvamento de Cenários:**
- Até 2 cenários salvos por usuário
- Opção de comparar ("Arena de Decisão")
- Exportação em PDF/Planilha com marca "Feito por tudo1"

---

## 🏆 Comparativo: Arena de Decisão

Ao clicar em "Comparar Cenários", abre modal full-screen:

- Exibe os 2 cenários lado a lado
- Destaca "vencedor" em cada métrica
- Gráfico sobreposto das duas projeções
- Veredicto da IA (v2): Recomendação de qual cenário atacar
- Botões: "Escolher Cenário A" / "Escolher Cenário B"

---

## ✅ PASSO 3: Planejar Ações

**Objetivo:** Transformar o cenário escolhido em ações concretas.

**Conteúdo:**
- Lista de ações sugeridas (baseadas no segmento)
- Cada ação tem: Descrição, Checkbox, Data de início
- Usuário pode adicionar ações personalizadas
- Define data de início do plano

**Plano de Ação v1 (sem LLM):**
- Lista genérica de boas práticas por segmento
- Exemplo SaaS: "Implementar régua de e-mail de onboarding"
- Exemplo E-commerce: "Criar campanha de recuperação de carrinho"

**Plano de Ação v2 (com LLM):**
- IA analisa dados + segmento + meta
- Gera plano personalizado
- Sugere prioridades

---

## 📈 PASSO 4: Acompanhar Resultados

**Objetivo:** Comparar evolução real vs planejada.

**Conteúdo:**
- Dashboard de acompanhamento
- Gráfico: Linha "Planejado" vs Linha "Real"
- Indicadores de status:
  - "Você está 15% acima do planejado! 🎉"
  - "Atenção: CAC 10% acima do esperado ⚠️"
- Lista de ações com status (Concluída, Em andamento, Atrasada)

**Gatilho de Retenção:**
- Usuário VOLTA para ver se está no caminho
- Notificações proativas (futuro): "Seu CAC subiu, quer revisar o plano?"

---

## 🤖 Copiloto IA (v2)

**Posição:** Botão flutuante no canto inferior direito.

**Comportamento:**
- **Minimizado:** Ícone de 🤖💬
- **Expandido:** Sidebar lateral com chat

**Funcionalidades:**
- Proativo: "Notei que seu Churn aumentou. Quer simular uma redução?"
- Reativo: Usuário pergunta, IA responde
- Ação direta: Botão "Aplicar sugestão" move os sliders automaticamente
- Comentários em tempo real: "Boa! Essa mudança aumenta seu lucro em 23%."

---

## 🛠️ Roadmap de Implementação

### Fase 1 (MVP - Sem LLM)
- [ ] Página /planejamento com stepper
- [ ] Passo 1: Cards de situação atual
- [ ] Passo 2: Sliders + gráfico de projeção
- [ ] Salvamento de até 2 cenários
- [ ] Modal de comparação básico
- [ ] Passo 3: Lista de ações genéricas por segmento
- [ ] Passo 4: Dashboard de acompanhamento

### Fase 2 (Com LLM)
- [ ] Integração com OpenAI/Gemini
- [ ] Copiloto flutuante
- [ ] Plano de ação personalizado gerado por IA
- [ ] Veredicto IA na Arena de Decisão
- [ ] Comentários proativos da IA

### Fase 3 (Avançado)
- [ ] Notificações push/email
- [ ] Benchmarking com dados de mercado
- [ ] Integração com calendário (ações viram eventos)
- [ ] Histórico de planos anteriores

---

## 📝 Exemplo de Uso (User Story)

> Pedro, dono de um SaaS, entra na aba Planejamento.
>
> **Passo 1:** Vê seus KPIs atuais: Lucro R$ 5k, CAC R$ 350, Churn 6%.
>
> **Passo 2:** Move os sliders: CAC para R$ 250, Churn para 3%. O gráfico mostra que em 6 meses o lucro vai para R$ 12k. Salva como "Cenário Otimista".
>
> **Passo 2 (bis):** Cria outro cenário mais conservador. CAC R$ 300, Churn 4%. Lucro em 6 meses: R$ 8k. Salva como "Cenário Seguro".
>
> **Arena:** Compara os dois. Vê que o Otimista tem mais upside mas exige mais esforço. Escolhe o Otimista.
>
> **Passo 3:** Vê lista de ações sugeridas: "Melhorar onboarding", "Criar campanha de reativação". Define início para 01/01/2025.
>
> **Passo 4:** Toda semana, volta para ver se está no caminho. Vê que o CAC real está em R$ 280 (melhorando!).
>
> **Copiloto (futuro):** A IA avisa: "Parabéns! Você reduziu o CAC em 20%. Continue assim e bate a meta antes do prazo!"

---

## 🎨 Referências Visuais

- Stepper: Similar ao checkout de e-commerce (etapas claras)
- Sliders: Estilo Spotify (arredondados, responsivos)
- Gráficos: Recharts (já usado no projeto)
- Arena: Estilo "VS" de jogos/esportes
- Copiloto: Estilo Intercom/Drift (chat flutuante)
