import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { description, amount, type, userSummary } = await req.json();

    if (!description || amount === undefined || !type) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios (description, amount, type)' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Mock fallback if API key is not configured yet (for local dev convenience)
      console.warn('GEMINI_API_KEY no está configurada. Usando fallback local.');
      const fallback = mockCategorize(description, type);
      return NextResponse.json(fallback);
    }

    // Context format
    const userContextStr = userSummary 
      ? `\nCuentas del usuario: ${JSON.stringify(userSummary.accounts)}\nCategorías recientes: ${JSON.stringify(userSummary.recent_categories || [])}`
      : '';

    const systemPrompt = `Eres FinTrack AI, el motor de inteligencia de una aplicación premium de finanzas personales.
Tu objetivo es clasificar transacciones financieras de forma limpia, elegante y consistente en castellano.
Recibirás una descripción de transacción, importe y tipo.

Contexto actual de las finanzas del usuario:${userContextStr}

Reglas:
1. Elige una categoría estándar en español (ej. Alimentación, Transporte, Nómina, Restaurantes, Suscripciones, Vivienda, Salud, Ocio, Transferencia, Inversiones, Impuestos, Educación, Compras, Viajes, etc.)
2. Si el tipo es 'transfer' y to_account_id o el contexto indica traspaso entre cuentas del usuario, la categoría debe ser obligatoriamente 'Transferencia'.
3. Devuelve SIEMPRE y ÚNICAMENTE un JSON válido que coincida exactamente con este tipo TypeScript:
{
  "category": string,
  "confidence": number, // entre 0.0 y 1.0
  "reasoning": string // explicación corta y concisa
}
4. NO uses bloques de código markdown (\`\`\`json ... \`\`\`). Responde exclusivamente con el string JSON crudo.`;

    const userPrompt = `Categoriza la siguiente transacción:
Descripción: "${description}"
Importe: ${amount} EUR
Tipo: "${type}"`;

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
            temperature: 0.0,
            responseMimeType: 'application/json',
          }
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error:', errText);
      throw new Error(`Gemini API respondió con estado ${response.status}`);
    }

    const resultData = await response.json();
    const content = resultData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
    
    // Parse response
    let parsedResult;
    try {
      // Strips any potential markdown ticks if Gemini disobeyed instruction
      const jsonStr = content.replace(/^```json/, '').replace(/```$/, '').trim();
      parsedResult = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('Error al parsear respuesta de Gemini:', content, parseErr);
      parsedResult = mockCategorize(description, type);
    }

    return NextResponse.json(parsedResult);
  } catch (error: any) {
    console.error('Error en API de categorización:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Fallback logic for when Claude API is offline or key is missing
function mockCategorize(description: string, type: string) {
  const desc = description.toLowerCase();
  
  if (type === 'transfer') {
    return { category: 'Transferencia', confidence: 0.99, reasoning: 'Clasificado como transferencia entre cuentas por el tipo indicado.' };
  }
  
  if (type === 'income') {
    if (desc.includes('nomina') || desc.includes('salary') || desc.includes('sueldo')) {
      return { category: 'Nómina', confidence: 0.95, reasoning: 'Identificado patrón de nómina mensual en la descripción.' };
    }
    return { category: 'Ingresos Varios', confidence: 0.70, reasoning: 'Ingreso genérico sin patrón explícito.' };
  }

  // Expense defaults
  if (desc.includes('mercadona') || desc.includes('carrefour') || desc.includes('super') || desc.includes('lidl') || desc.includes('alcampo') || desc.includes('dia')) {
    return { category: 'Alimentación', confidence: 0.95, reasoning: 'Coincide con supermercados de alimentación habituales.' };
  }
  if (desc.includes('uber') || desc.includes('cabify') || desc.includes('metro') || desc.includes('renfe') || desc.includes('gasol') || desc.includes('bp') || desc.includes('repsol')) {
    return { category: 'Transporte', confidence: 0.90, reasoning: 'Coincide con servicios de movilidad o estaciones de servicio.' };
  }
  if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('hbo') || desc.includes('amazon prime') || desc.includes('youtube')) {
    return { category: 'Suscripciones', confidence: 0.98, reasoning: 'Identificado cobro recurrente de plataforma multimedia.' };
  }
  if (desc.includes('restaurante') || desc.includes('bar') || desc.includes('burger') || desc.includes('starbucks') || desc.includes('pizza') || desc.includes('cafe')) {
    return { category: 'Restaurantes', confidence: 0.88, reasoning: 'Establecimiento de hostelería o cafetería.' };
  }
  if (desc.includes('alquiler') || desc.includes('hipoteca') || desc.includes('comunidad') || desc.includes('luz') || desc.includes('agua') || desc.includes('gas')) {
    return { category: 'Vivienda', confidence: 0.95, reasoning: 'Gasto asociado con el hogar o suministros residenciales.' };
  }
  if (desc.includes('inditex') || desc.includes('zara') || desc.includes('nike') || desc.includes('amazon') || desc.includes('aliexpress') || desc.includes('h&m')) {
    return { category: 'Compras', confidence: 0.80, reasoning: 'Gasto en comercios de compras generales o moda.' };
  }

  return { category: 'Otros Gastos', confidence: 0.50, reasoning: 'No se detectaron palabras clave específicas. Asignado a categoría general.' };
}
