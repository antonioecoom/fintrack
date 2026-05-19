'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '../../src/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  const supabase = createClient();
  const router = useRouter();

  // Check if session already exists, if so redirect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard');
      }
    });
  }, [router, supabase]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (useMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage({
          text: '¡Enlace mágico enviado! Revisa tu bandeja de entrada.',
          type: 'success',
        });
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        setMessage({
          text: 'Registro completado. Por favor, inicia sesión.',
          type: 'success',
        });
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (err: any) {
      setMessage({
        text: err.message || 'Ocurrió un error en la autenticación',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-surface p-8 shadow-none">
        
        {/* Header */}
        <div className="flex flex-col items-center space-y-2">
          <div className="text-2xl font-medium tracking-tight text-textPrimary">
            FinTrack
          </div>
          <p className="text-sm text-textSecondary">
            {useMagicLink 
              ? 'Accede instantáneamente sin contraseña' 
              : isSignUp 
                ? 'Crea tu cuenta de finanzas personales' 
                : 'Inicia sesión en tu panel financiero'
            }
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`rounded-md p-3 text-sm ${
              message.type === 'success'
                ? 'bg-positive/10 text-positive border border-positive/20'
                : 'bg-negative/10 text-negative border border-negative/20'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-4">
            
            {isSignUp && !useMagicLink && (
              <div>
                <label className="block text-xs font-medium text-textSecondary uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Tu nombre"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-textSecondary uppercase tracking-wider mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                placeholder="nombre@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand transition-colors"
              />
            </div>

            {!useMagicLink && (
              <div>
                <label className="block text-xs font-medium text-textSecondary uppercase tracking-wider mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand transition-colors"
                />
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-brand py-2 text-sm font-medium text-white hover:bg-brandHover transition-colors disabled:opacity-50"
          >
            {loading ? 'Procesando...' : useMagicLink ? 'Enviar Enlace Mágico' : isSignUp ? 'Registrarse' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Auth Mode Toggles */}
        <div className="flex flex-col items-center space-y-2 pt-2 text-xs text-textSecondary">
          
          {!useMagicLink && (
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage(null);
              }}
              className="hover:text-textPrimary transition-colors"
            >
              {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
          )}

          <button
            onClick={() => {
              setUseMagicLink(!useMagicLink);
              setMessage(null);
            }}
            className="text-brand hover:underline font-medium transition-colors"
          >
            {useMagicLink ? 'Volver al inicio tradicional' : 'Entrar con enlace mágico (Magic Link)'}
          </button>
        </div>

        {/* Legal Disclaimer */}
        <div className="border-t border-border/40 pt-4 text-center">
          <p className="text-[10px] leading-relaxed text-textMuted">
            <strong>Aviso Legal de Inversiones:</strong> FinTrack es una herramienta de análisis financiero personal. Toda la información y recomendaciones proporcionadas tienen carácter exclusivamente informativo y educativo, y no constituyen de ninguna manera asesoramiento financiero, legal o de inversión. Rentabilidades pasadas no garantizan rendimientos futuros.
          </p>
        </div>

      </div>
    </div>
  );
}
