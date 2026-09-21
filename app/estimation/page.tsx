"use client";

import { FormEvent, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { trackAnalyticsEvent } from "@/lib/analytics";

type FormStatus = "idle" | "loading" | "success" | "error";

export default function EstimationPage() {
  const { dict, locale } = useI18n();
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;

    const form = event.currentTarget;
    const data = new FormData(form);

    setStatus("loading");
    setMessage(locale === "fr" ? "Envoi de votre demande..." : "Sending your request...");

    try {
      const response = await fetch("/api/estimation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          category: data.get("category"),
          description: data.get("description"),
          website: data.get("website"),
        }),
      });

      const payload = await response.json().catch(() => null) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message || (locale === "fr" ? "Impossible d'envoyer la demande." : "Unable to send the request."));
      }

      trackAnalyticsEvent("generate_lead", { lead_type: "estimation", category: String(data.get("category") || "") });
      form.reset();
      setStatus("success");
      setMessage(payload?.message || (locale === "fr"
        ? "Votre demande d'estimation a bien été envoyée. FAST CASH Genève vous répondra rapidement."
        : "Your estimation request has been sent. FAST CASH Geneva will get back to you shortly."));
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error
        ? error.message
        : (locale === "fr" ? "Impossible d'envoyer la demande." : "Unable to send the request."));
    }
  }

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <p className="hero-kicker">{dict.estimation.kicker}</p>
        <h1 className="title-lg">{dict.estimation.title}</h1>
        <p className="muted">{dict.estimation.intro}</p>
        <form className="form" onSubmit={handleSubmit}>
          <input className="input" name="name" autoComplete="name" required maxLength={120} placeholder={dict.estimation.name} />
          <input className="input" name="email" type="email" autoComplete="email" required maxLength={180} placeholder={dict.estimation.email} />
          <input className="input" name="phone" type="tel" autoComplete="tel" required maxLength={60} placeholder={dict.estimation.phone} />
          <select name="category" required defaultValue={dict.estimation.categories[0]}>
            {dict.estimation.categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <textarea className="textarea" name="description" required minLength={10} maxLength={3000} placeholder={dict.estimation.description} />
          <input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: "absolute", left: "-10000px", width: 1, height: 1, opacity: 0 }}
          />
          <button className="btn btn-gold" type="submit" disabled={status === "loading"}>
            {status === "loading"
              ? (locale === "fr" ? "Envoi en cours..." : "Sending...")
              : dict.estimation.submit}
          </button>
          {message ? (
            <p
              role={status === "error" ? "alert" : "status"}
              style={{ margin: 0, fontWeight: 700, color: status === "error" ? "#b42318" : status === "success" ? "#247a44" : undefined }}
            >
              {message}
            </p>
          ) : null}
        </form>
      </div>
    </main>
  );
}
