"use client";

import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

export default function AdminLogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button type="button" className={styles.sidebarButton} onClick={logout}>
      Déconnexion
    </button>
  );
}
