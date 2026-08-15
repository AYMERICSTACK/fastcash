export default function Loading() {
  return (
    <main className="fc-state-page" aria-live="polite" aria-busy="true">
      <div className="container fc-state-shell">
        <span className="fc-state-spinner" aria-hidden="true" />
        <p className="hero-kicker">Fast Cash Genève</p>
        <h1>Chargement en cours…</h1>
        <p>Nous préparons votre expérience.</p>
      </div>
    </main>
  );
}
