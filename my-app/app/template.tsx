// Template global usado pelo Next.js para envolver as páginas da aplicação.
export default function Template({ children }: { children: React.ReactNode }) {
  // Aplica a transição visual entre páginas e garante altura mínima de tela cheia.
  return <div className="site-page-transition min-h-screen">{children}</div>;
}
