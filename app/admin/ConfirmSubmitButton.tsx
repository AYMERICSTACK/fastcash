"use client";

import { useState } from "react";
import { useAdminConfirm } from "./AdminProviders";

function splitMessage(message: string) {
  const [title, ...rest] = message.split("?");
  const cleanTitle = title.trim();
  const description = rest.join("?").trim();

  return {
    title: cleanTitle ? `${cleanTitle} ?` : "Confirmer cette action ?",
    description: description || "Cette action peut modifier les données FAST CASH.",
  };
}

export default function ConfirmSubmitButton({
  children,
  message,
  className,
  tone = "danger",
  pendingLabel = "Traitement en cours…",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  tone?: "danger" | "default";
  pendingLabel?: string;
}) {
  const confirm = useAdminConfirm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <button
      className={className}
      type="button"
      disabled={isSubmitting}
      onClick={async (event) => {
        const form = event.currentTarget.form;
        if (!form || isSubmitting) return;

        const { title, description } = splitMessage(message);
        const confirmed = await confirm({
          title,
          description,
          tone,
          confirmLabel: typeof children === "string" ? children : "Confirmer",
        });

        if (!confirmed) return;

        setIsSubmitting(true);
        form.requestSubmit();
      }}
    >
      {isSubmitting ? pendingLabel : children}
    </button>
  );
}
