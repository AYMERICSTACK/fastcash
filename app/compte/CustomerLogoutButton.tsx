"use client";

import { useRouter } from "next/navigation";

export default function CustomerLogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/customer/logout", {
      method: "POST",
    });

    router.push("/compte/login");
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-light" onClick={logout}>
      Déconnexion
    </button>
  );
}
