import { createOpenAI } from '@ai-sdk/openai';
import { streamText, CoreMessage } from 'ai';
import { AI_MENTOR_SYSTEM_PROMPT } from '@/lib/aiSystemPrompt';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, tradeContext } = body;
    // ai SDK 3.x: handleSubmit(e, { data: { imageUrl } }) envía la imagen en body.data
    const imageUrl: string | undefined = body.data?.imageUrl ?? body.imageUrl;

    // ✅ FIX: leer la API key del header correcto
    const apiKey = req.headers.get('x-openai-key') || req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API Key no configurada. Ve a AI Mentor → ícono de candado → ingresa tu OpenAI API Key.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customOpenAI = createOpenAI({ apiKey });

    // ════════════════════════════════════════════════
    // CONTEXTO ENRIQUECIDO — datos reales del trader
    // ════════════════════════════════════════════════
    let contextSection = '\n\n════ PERFIL DEL TRADER (DATOS REALES DEL JOURNAL) ════\n';

    if (tradeContext) {
      const { stats, recentTrades, patterns, accountInfo } = tradeContext;

      // Estadísticas globales
      if (stats) {
        contextSection += `
📊 ESTADÍSTICAS GLOBALES:
- Total Trades: ${stats.totalTrades} (${stats.wins}W / ${stats.losses}L / ${stats.breakevenCount}BE)
- Win Rate: ${stats.winRate}%
- Profit Factor: ${stats.profitFactor}
- Expectancy por trade: $${stats.expectancy}
- Net P&L total: $${stats.totalNet}
- Max Drawdown: -$${stats.maxDrawdown}
- Avg R:R logrado: ${stats.avgRMultiple}R
- Racha máx. ganadora: ${stats.maxConsecWins} trades
- Racha máx. perdedora: ${stats.maxConsecLosses} trades
- Plan seguido: ${stats.planFollowRate}% de las veces
- Tiempo promedio en trade: ${stats.avgHoldTime} minutos
`;
      }

      // Patrones detectados algorítmicamente
      if (patterns) {
        contextSection += `
🔍 PATRONES DETECTADOS (ANÁLISIS ALGORÍTMICO):
- Mejor día de la semana: ${patterns.bestDay || 'Sin datos'} (P&L: $${patterns.bestDayPnl?.toFixed(2) || '—'})
- Peor día de la semana: ${patterns.worstDay || 'Sin datos'} (P&L: $${patterns.worstDayPnl?.toFixed(2) || '—'})
- Mejor instrumento: ${patterns.bestAsset || 'Sin datos'} ($${patterns.bestAssetPnl?.toFixed(2) || '—'} neto)
- Revenge Trading detectado: ${patterns.revengeCount || 0} casos
- Win Rate en Long: ${patterns.longWinRate || '—'}%
- Win Rate en Short: ${patterns.shortWinRate || '—'}%
- Mejor sesión de mercado: ${patterns.bestSession || 'Sin datos'}
`;
      }

      // Información de cuenta
      if (accountInfo) {
        contextSection += `
💼 CUENTA:
- Tipo: ${accountInfo.isFunded ? 'CUENTA FONDEADA (Prop Firm)' : 'Cuenta Personal/Real'}
- Broker: ${accountInfo.broker || 'No especificado'}
`;
      }

      // Últimas 15 operaciones para análisis específico
      if (recentTrades && recentTrades.length > 0) {
        contextSection += `
📋 ÚLTIMAS ${recentTrades.length} OPERACIONES (más recientes primero):
`;
        recentTrades.forEach((t: any, i: number) => {
          contextSection += `${i + 1}. [${t.date}] ${t.instrument} ${t.side} x${t.contracts} | ${t.result} | Net: ${t.netPnl >= 0 ? '+' : ''}$${t.netPnl} | R: ${t.rMultiple !== null ? `${t.rMultiple}R` : 'N/A'} | Estrategia: ${t.strategy} | Emoción: ${t.emotion} | Plan: ${t.planFollowed ? '✅' : '❌'}${t.notes ? ` | Nota: "${t.notes.slice(0, 80)}"` : ''}\n`;
        });
      }
    } else {
      contextSection += 'Sin datos del journal disponibles. Pide al usuario que registre sus trades primero.\n';
    }

    contextSection += '\n════════════════════════════════════════════\n';

    const dynamicPrompt = AI_MENTOR_SYSTEM_PROMPT + contextSection;

    // Procesar imagen si viene adjunta
    const processedMessages = [...messages] as CoreMessage[];
    if (imageUrl && processedMessages.length > 0) {
      const lastMsg = processedMessages[processedMessages.length - 1];
      if (lastMsg.role === 'user') {
        const textContent = typeof lastMsg.content === 'string' ? lastMsg.content : '';
        const base64Data = imageUrl.includes(',') ? imageUrl.split(',')[1] : imageUrl;
        (lastMsg as any).content = [
          { type: 'text', text: textContent || 'Analiza este gráfico.' },
          { type: 'image', image: base64Data },
        ];
      }
    }

    const result = await streamText({
      model: customOpenAI('gpt-4o'),
      system: dynamicPrompt,
      messages: processedMessages,
      maxTokens: 1500,
      temperature: 0.7,
    });

    return result.toAIStreamResponse();

  } catch (error: any) {
    console.error('AI API Error:', error);
    const msg = error?.message || 'Error procesando la solicitud de IA.';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
