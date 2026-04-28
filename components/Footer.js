import Link from 'next/link';

export default function Footer({ variant = 'default' }) {
  const isDark = variant === 'dark';
  const baseColor = isDark ? 'text-white/60' : 'text-slate-400';
  const linkColor = isDark ? 'text-white/80 hover:text-white' : 'text-slate-500 hover:text-intento-blue';
  const borderColor = isDark ? 'border-white/10' : 'border-slate-200';
  const bgColor = isDark ? 'bg-transparent' : 'bg-white';

  return (
    <footer className={`${bgColor} border-t ${borderColor} px-6 py-4 mt-auto`}>
      <div className="max-w-3xl mx-auto flex flex-col items-center gap-2">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
          <Link href="/privacidade" className={`${linkColor} font-semibold`}>
            Política de Privacidade
          </Link>
          <Link href="/termos" className={`${linkColor} font-semibold`}>
            Termos de Uso
          </Link>
        </div>
        <p className={`text-[11px] ${baseColor} font-medium text-center`}>
          © 2026 Intento Grupo Educacional LTDA · CNPJ 49.929.921/0001-22
        </p>
      </div>
    </footer>
  );
}
