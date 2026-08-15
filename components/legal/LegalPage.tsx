import Link from "next/link";
import type { ReactNode } from "react";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
};

export default function LegalPage({ eyebrow, title, intro, children }: LegalPageProps) {
  return (
    <main className="legal-page">
      <section className="legal-hero">
        <div className="container legal-hero-inner">
          <p className="hero-kicker">{eyebrow}</p>
          <h1 className="title-lg">{title}</h1>
          <p>{intro}</p>
        </div>
      </section>

      <section className="section">
        <div className="container legal-layout">
          <article className="legal-content">{children}</article>
          <aside className="legal-nav" aria-label="Informations légales">
            <strong>Informations utiles</strong>
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/conditions-generales">Conditions générales</Link>
            <Link href="/livraison-retours">Livraison et retours</Link>
            <Link href="/politique-confidentialite">Confidentialité</Link>
            <Link href="/politique-cookies">Cookies</Link>
            <Link href="/contact">Nous contacter</Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
