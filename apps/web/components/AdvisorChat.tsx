'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useFinanceStore } from '../src/store/useFinanceStore';
import { Send, Sparkles, User, Bot, AlertCircle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AdvisorChat() {
  const { accounts, transactions } = useFinanceStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu Asesor FinTrack personal. Puedo responder tus dudas sobre balances, desgloses de gastos o darte consejos de ahorro personalizados. ¿Qué te gustaría consultar hoy?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setLoading(true);

    try {
      // Gather user summary context
      const summary = {
        accounts: accounts.map(a => ({ name: a.name, type: a.type, balance: a.balance, currency: a.currency })),
        transactions: transactions.map(t => ({ amount: t.amount, type: t.type, category: t.category, description: t.description, date: t.date })),
      };

      const response = await fetch('/api/advisor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userText }],
          userSummary: summary,
        }),
      });

      if (!response.ok) throw new Error('Error al conectar con el Asesor IA');

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Disculpa, ocurrió un error temporal al intentar conectar con mi motor de análisis. Por favor, inténtalo de nuevo.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 bg-surface/50 px-4 py-3">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded bg-brand/10 text-brand">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="text-xs font-medium text-textPrimary">Chat de Asesoría IA</h2>
            <p className="text-[10px] text-textSecondary">Consultas financieras contextualizadas por Claude</p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              className={`flex items-start space-x-2.5 max-w-[85%] ${
                isUser ? 'ml-auto flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`p-1.5 rounded-full flex-shrink-0 ${
                  isUser ? 'bg-brand/20 text-brand' : 'bg-surface border border-border/50 text-textSecondary'
                }`}
              >
                {isUser ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div
                className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-brand text-white font-medium'
                    : 'bg-surface border border-border/60 text-textPrimary'
                }`}
              >
                {m.content.split('\n').map((line, i) => (
                  <p key={i} className={i > 0 ? 'mt-1.5' : ''}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start space-x-2.5 max-w-[80%]">
            <div className="p-1.5 rounded-full bg-surface border border-border/50 text-textSecondary">
              <Bot size={14} />
            </div>
            <div className="rounded-lg px-3 py-2 bg-surface border border-border/60 text-xs text-textSecondary flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-textMuted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-textMuted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-textMuted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="border-t border-border/40 bg-surface/30 p-3 flex gap-2">
        <input
          type="text"
          placeholder="Pregúntame algo, ej: ¿cuánto dinero tengo en total?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 rounded border border-border bg-card px-3 py-2 text-xs text-textPrimary outline-none focus:border-brand transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded bg-brand p-2 text-white hover:bg-brandHover transition-colors disabled:opacity-40"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
