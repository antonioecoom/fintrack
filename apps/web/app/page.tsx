import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="w-full max-w-lg space-y-6">
        
        {/* Brand Logo */}
        <div className="flex items-center justify-center space-x-2">
          <span className="text-3xl font-medium tracking-tight text-textPrimary">FinTrack</span>
          <span className="rounded bg-brand/10 border border-brand/20 px-1.5 py-0.5 text-[10px] font-medium text-brand">PRO</span>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-textPrimary">
            Tus finanzas e inversión, bajo control absoluto
          </h1>
          <p className="text-sm text-textSecondary max-w-md mx-auto leading-relaxed">
            Control de cuentas, movimientos automáticos y categorización inteligente mediante inteligencia artificial (Claude API) en una interfaz flat minimalista.
          </p>
        </div>

        {/* Call to Actions */}
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex rounded bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brandHover transition-colors"
          >
            Entrar al Panel
          </Link>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-border/30 pt-6 max-w-sm mx-auto">
          <p className="text-[10px] leading-relaxed text-textMuted">
            <strong>Aviso Legal de Inversiones:</strong> FinTrack es una herramienta de análisis financiero personal. Toda la información y recomendaciones proporcionadas tienen carácter exclusivamente informativo y educativo, y no constituyen de ninguna manera asesoramiento financiero, de inversión o legal.
          </p>
        </div>

      </div>
    </div>
  );
}
