"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../admin.module.css";

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@fastcash.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!response.ok) {
      setError("Email ou mot de passe incorrect.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form className={styles.loginForm} onSubmit={handleSubmit}>
      <label>
        Email administrateur
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@fastcash-geneve.ch"
          autoComplete="email"
          required
        />
      </label>

      <label>
        Mot de passe
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </label>

      {error ? <p className={styles.formError}>{error}</p> : null}

      <button type="submit" className={styles.button} disabled={loading}>
        {loading ? "Connexion..." : "Entrer dans l'administration"}
      </button>
    </form>
  );
}
