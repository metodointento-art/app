// app/painel/layout.js

export default function PainelLayout({ children }) {
  return (
    <section className="min-h-screen bg-slate-50">
      {/* O Next.js injeta o conteúdo do page.js aqui dentro */}
      {children}
    </section>
  );
}