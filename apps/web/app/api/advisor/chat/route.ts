import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, userSummary } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Falta el historial de mensajes o tiene un formato incorrecto.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY no está configurada. Usando fallback de respuestas simuladas.');
      const reply = getMockChatResponse(messages[messages.length - 1]?.content || '', userSummary);
      return NextResponse.json({ message: reply });
    }

    const systemPrompt = `Eres FinTrack Advisor, un asesor financiero de inteligencia artificial de nivel premium.
Tienes acceso al perfil financiero del usuario detallado a continuación.
Cuentas del usuario: ${JSON.stringify(userSummary?.accounts || [])}
Transacciones del usuario (últimas): ${JSON.stringify(userSummary?.transactions || [])}

Instrucciones de comportamiento:
1. Responde de forma sumamente concisa, elegante, educada y en castellano.
2. Basate estrictamente en los datos reales suministrados para responder preguntas sobre sus balances, gastos o ingresos. Si te preguntan algo fuera de tu alcance financiero, reconócelo humildemente.
3. No uses un lenguaje excesivamente formal, prefiere un tono directo y constructivo (inspirado en Robinhood/Linear).
4. AVISO LEGAL: Al final de cada respuesta que contenga sugerencias financieras o de inversión, añade este aviso textual de forma sutil y en una línea separada:
"*Aviso: Esta información es meramente educativa y no constituye asesoramiento financiero profesional.*"`;

    // Map next.js api messages to gemini contents structure
    const geminiContents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: geminiContents,
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: {
            temperature: 0.2,
          }
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini Chat API Error:', errText);
      throw new Error(`Gemini Chat API respondió con estado ${response.status}`);
    }

    const resultData = await response.json();
    const content = resultData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ message: content });
  } catch (error: any) {
    console.error('Error en API de chat del asesor:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Fallback generator for development convenience when Claude API key is absent
function getMockChatResponse(userMsg: string, summary: any): string {
  const msg = userMsg.toLowerCase();
  const accounts = summary?.accounts || [];
  const transactions = summary?.transactions || [];

  const totalBalance = accounts.reduce((s: number, a: any) => s + Number(a.balance), 0);
  const totalExpenses = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0);

  if (msg.includes('balance') || msg.includes('patrimonio') || msg.includes('cuanto tengo') || msg.includes('saldo')) {
    return `Actualmente dispones de un patrimonio neto total de **${totalBalance.toFixed(2)} EUR** distribuido en ${accounts.length} cuenta(s). 
${accounts.map((a: any) => `- **${a.name}**: ${a.balance} EUR`).join('\n')}

*Aviso: Esta información es meramente educativa y no constituye asesoramiento financiero profesional.*`;
  }

  if (msg.includes('gasto') || msg.includes('gastado') || msg.includes('comida') || msg.includes('mercadona')) {
    return `Has registrado un total de **${totalExpenses.toFixed(2)} EUR** en gastos. Las categorías donde más has gastado son alimentación y compras habituales. Te sugiero revisar los movimientos de mayor importe para detectar oportunidades de ahorro.

*Aviso: Esta información es meramente educativa y no constituye asesoramiento financiero profesional.*`;
  }

  if (msg.includes('ahorrar') || msg.includes('consejo') || msg.includes('ayuda')) {
    return `Para optimizar tu ahorro te sugiero:
1. Crear un presupuesto límite por categoría (ej. 15% para Ocio).
2. Revisar si tienes suscripciones que no uses a menudo.
3. Consolidar balances en cuentas remuneradas si es posible.

¿Quieres que analicemos en detalle alguna de tus cuentas o gastos recientes?

*Aviso: Esta información es meramente educativa y no constituye asesoramiento financiero profesional.*`;
  }

  return `Hola. Soy tu Asesor FinTrack. He analizado tus transacciones y cuentas. Actualmente registras un balance de **${totalBalance.toFixed(2)} EUR**. ¿En qué puedo ayudarte hoy sobre tu planificación de ahorros o gastos?

*Aviso: Esta información es meramente educativa y no constituye asesoramiento financiero profesional.*`;
}
