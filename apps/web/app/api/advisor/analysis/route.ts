import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { month, year, userSummary } = await req.json();

    if (month === undefined || year === undefined) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios (month, year)' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY no está configurada. Usando fallback de análisis local.');
      const mockReport = getMockAnalysis(month, year, userSummary);
      return NextResponse.json({ analysis: mockReport });
    }

    const systemPrompt = `Eres FinTrack Advisor, un asesor financiero automático de alta fidelidad.
Tu objetivo es realizar un análisis financiero completo y estructurado de los movimientos del usuario para el mes seleccionado y devolver una revisión en formato Markdown limpio y elegante.

Cuentas del usuario: ${JSON.stringify(userSummary?.accounts || [])}
Transacciones del mes seleccionado: ${JSON.stringify(
      (userSummary?.transactions || []).filter((t: any) => {
        const d = new Date(t.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
    )}

Reglas de formato del informe:
1. Devuelve un texto formateado exclusivamente en Markdown.
2. Sé sumamente analítico y directo. Identifica patrones, anomalías de gasto y oportunidades reales de ahorro.
3. El informe debe estructurarse con las siguientes secciones:
   - ## Resumen Ejecutivo (ingresos vs gastos y tasa de ahorro)
   - ## Análisis por Categoría (dónde se concentran los mayores flujos)
   - ## Oportunidades de Optimización (consejos concretos)
4. AVISO LEGAL: Incluye obligatoriamente el siguiente disclaimer en una sección final:
   - "--- \n*Aviso Legal de Inversión: Este análisis automático tiene carácter puramente educativo e informativo, y no debe interpretarse como asesoramiento financiero profesional o recomendación de inversión.*"`;

    const userPrompt = `Realiza el análisis financiero detallado para el mes de ${getMonthName(month)} de ${year}.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: {
            temperature: 0.1,
          }
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini Analysis API Error:', errText);
      throw new Error(`Gemini Analysis API respondió con estado ${response.status}`);
    }

    const resultData = await response.json();
    const content = resultData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ analysis: content });
  } catch (error: any) {
    console.error('Error en API de análisis del asesor:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function getMonthName(m: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[m] || '';
}

function getMockAnalysis(month: number, year: number, summary: any): string {
  const monthName = getMonthName(month);
  const txs = (summary?.transactions || []).filter((t: any) => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const income = txs.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const expenses = txs.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const savings = income - expenses;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

  // Expenses categories
  const expenseByCategory = txs
    .filter((t: any) => t.type === 'expense')
    .reduce((acc: any, t: any) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {});

  const categoryRanking = Object.entries(expenseByCategory)
    .sort((a: any, b: any) => b[1] - a[1])
    .map(([cat, val]: any) => `- **${cat}**: ${val.toFixed(2)} EUR`)
    .join('\n');

  return `# Análisis Financiero - ${monthName} de ${year}

## Resumen Ejecutivo
Durante este periodo, has registrado un total de **${income.toFixed(2)} EUR** en ingresos y **${expenses.toFixed(2)} EUR** en gastos. 
- **Flujo Neto**: ${savings >= 0 ? '+' : ''}${savings.toFixed(2)} EUR
- **Tasa de Ahorro**: ${savingsRate}%
${savingsRate >= 20 ? 'Excelente trabajo, te mantienes por encima del umbral de ahorro recomendado del 20%.' : 'Tu tasa de ahorro es inferior al 20%. Sugerimos revisar las categorías opcionales para recortar costes.'}

## Análisis por Categoría
Tus gastos se concentraron en las siguientes áreas este mes:
${categoryRanking || '*No hay gastos registrados este mes.*'}

## Oportunidades de Optimización
1. **Gastos Fijos vs. Variables**: Revisa si tus gastos recurrentes representan más del 50% de tus ingresos.
2. **Suscripciones**: Audita los cobros periódicos y elimina aquellos servicios digitales que no utilices semanalmente.
3. **Control Diario**: Intenta fijar un presupuesto diario para gastos no esenciales (ocio, cafés, salidas) de cara al próximo mes.

---
*Aviso Legal de Inversión: Este análisis automático tiene carácter puramente educativo e informativo, y no debe interpretarse como asesoramiento financiero profesional o recomendación de inversión.*`;
}
