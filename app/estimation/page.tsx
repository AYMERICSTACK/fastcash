"use client";

import { useI18n } from "@/lib/i18n";

export default function EstimationPage() {
  const { dict } = useI18n();

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <p className="hero-kicker">{dict.estimation.kicker}</p>
        <h1 className="title-lg">{dict.estimation.title}</h1>
        <p className="muted">{dict.estimation.intro}</p>
        <form className="form">
          <input className="input" placeholder={dict.estimation.name} />
          <input className="input" placeholder={dict.estimation.email} />
          <input className="input" placeholder={dict.estimation.phone} />
          <select>
            {dict.estimation.categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <textarea className="textarea" placeholder={dict.estimation.description} />
          <button className="btn btn-gold" type="button">{dict.estimation.submit}</button>
        </form>
      </div>
    </main>
  );
}
