"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n";

type FormState = "idle" | "loading" | "success" | "error";

export default function ContactForm() {
  const { dict } = useI18n();
  const copy = dict.contact.form;
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;

    setState("loading");
    setMessage("");

    const formData = new FormData(form);

    const body = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      subject: String(formData.get("subject") || ""),
      message: String(formData.get("message") || ""),
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const result = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.message || copy.error,
        );
      }

      form.reset();

      setState("success");
      setMessage(result.message || copy.success);
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : copy.error,
      );
    }
  }

  return (
    <form className="contact-premium-form" onSubmit={handleSubmit}>
      <div className="contact-form-row">
        <label>
          <span>{copy.name}</span>
          <input
            className="input"
            name="name"
            placeholder={copy.namePlaceholder}
            required
          />
        </label>

        <label>
          <span>{copy.email}</span>
          <input
            className="input"
            name="email"
            type="email"
            placeholder={copy.emailPlaceholder}
            required
          />
        </label>
      </div>

      <div className="contact-form-row">
        <label>
          <span>{copy.phone}</span>
          <input
            className="input"
            name="phone"
            type="tel"
            placeholder={copy.phonePlaceholder}
          />
        </label>

        <label>
          <span>{copy.subject}</span>
          <select name="subject" defaultValue={copy.subjects[0]}>
            {copy.subjects.map((subject) => (
              <option key={subject}>{subject}</option>
            ))}
          </select>
        </label>
      </div>

      <label>
        <span>{copy.message}</span>
        <textarea
          className="textarea"
          name="message"
          placeholder={copy.messagePlaceholder}
          required
        />
      </label>

      <button
        className="btn btn-gold contact-submit-btn"
        type="submit"
        disabled={state === "loading"}
      >
        {state === "loading" ? copy.loading : copy.submit}
      </button>

      {message ? (
        <div
          className={`contact-toast ${
            state === "error" ? "contact-toast-error" : ""
          }`}
          role="status"
        >
          <strong>{state === "error" ? "!" : "✓"}</strong>
          <span>{message}</span>
        </div>
      ) : null}
    </form>
  );
}
