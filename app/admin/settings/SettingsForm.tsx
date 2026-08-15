"use client";

import { useMemo, useState, useTransition } from "react";
import styles from "../admin.module.css";
import { useAdminToast } from "../AdminProviders";

type SettingFieldType = "text" | "email" | "number" | "select" | "multiselect" | "switch";

type SettingField = {
  key: string;
  label: string;
  group: string;
  value: string;
  type: SettingFieldType;
  options?: string[];
  help?: string;
};

type SettingsFormProps = {
  settings: SettingField[];
};

type SaveState = "idle" | "success" | "error";

function normalizeMultiValue(value: string) {
  return value
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean);
}

function serializeMultiValue(values: string[]) {
  return values.join(" / ");
}

export default function SettingsForm({ settings }: SettingsFormProps) {
  const initialValues = useMemo(
    () => Object.fromEntries(settings.map((setting) => [setting.key, setting.value])),
    [settings],
  );

  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [savedValues, setSavedValues] = useState<Record<string, string>>(initialValues);
  const [isEditing, setIsEditing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const toast = useAdminToast();

  const groupedSettings = useMemo(() => {
    const groups = new Map<string, SettingField[]>();

    for (const setting of settings) {
      const current = groups.get(setting.group) || [];
      current.push(setting);
      groups.set(setting.group, current);
    }

    return Array.from(groups.entries()).map(([group, items]) => ({ group, items }));
  }, [settings]);

  const hasChanges = useMemo(
    () => Object.keys(values).some((key) => values[key] !== savedValues[key]),
    [savedValues, values],
  );

  function startEditing() {
    setIsEditing(true);
    setSaveState("idle");
    setMessage("");
  }

  function cancelEditing() {
    setValues(savedValues);
    setIsEditing(false);
    setSaveState("idle");
    setMessage("");
  }

  function updateValue(key: string, value: string) {
    if (!isEditing) {
      return;
    }

    setValues((current) => ({ ...current, [key]: value }));
    setSaveState("idle");
    setMessage("");
  }

  function updateMultiValue(key: string, option: string, checked: boolean) {
    if (!isEditing) {
      return;
    }

    const currentValues = normalizeMultiValue(values[key] || "");
    const nextValues = checked
      ? Array.from(new Set([...currentValues, option]))
      : currentValues.filter((item) => item !== option);

    updateValue(key, serializeMultiValue(nextValues));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isEditing) {
      startEditing();
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: values }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || "Impossible d'enregistrer les paramètres.");
        }

        setSavedValues(values);
        setIsEditing(false);
        setSaveState("success");
        setMessage("");
        toast.success("Paramètres FAST CASH enregistrés avec succès.");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue.";
        setSaveState("error");
        setMessage("");
        toast.error(errorMessage);
      }
    });
  }

  return (
    <form className={styles.settingsForm} onSubmit={handleSubmit}>
      <div className={styles.settingsToolbar}>
        <div>
          <p className={styles.statLabel}>Centre de configuration</p>
          <h2 className={styles.sectionTitle}>Settings V1 éditables</h2>
          <p className={styles.formNote}>
            La page reste verrouillée par défaut pour éviter les erreurs. Cliquez sur Modifier pour
            ajuster les réglages, puis enregistrez pour revenir en lecture seule.
          </p>
        </div>
        <div className={styles.formActions}>
          {message ? (
            <span className={saveState === "error" ? styles.formError : styles.formMessage}>
              {message}
            </span>
          ) : null}

          <span className={isEditing ? styles.editBadgeActive : styles.editBadge}>
            {isEditing ? "Mode édition actif" : "Lecture seule"}
          </span>

          {isEditing ? (
            <div className={styles.actionsCompact}>
              <button className={styles.buttonSecondary} type="button" onClick={cancelEditing} disabled={isPending}>
                Annuler
              </button>
              <button className={styles.button} type="submit" disabled={isPending || !hasChanges}>
                {isPending ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
            </div>
          ) : (
            <button className={styles.button} type="button" onClick={startEditing}>
              Modifier les paramètres
            </button>
          )}
        </div>
      </div>

      <div className={styles.settingsGrid}>
        {groupedSettings.map((section) => (
          <article key={section.group} className={`${styles.card} ${!isEditing ? styles.readOnlyCard : ""}`}>
            <h3 className={styles.sectionTitle}>{section.group}</h3>
            <div className={styles.settingsFields}>
              {section.items.map((setting) => {
                const currentValue = values[setting.key] || "";

                if (setting.type === "switch") {
                  const enabled = currentValue === "Actif";

                  return (
                    <label key={setting.key} className={styles.switchField}>
                      <span>
                        <strong>{setting.label}</strong>
                        {setting.help ? <small>{setting.help}</small> : null}
                      </span>
                      <button
                        type="button"
                        className={`${styles.switchButton} ${enabled ? styles.switchButtonActive : ""}`}
                        aria-pressed={enabled}
                        disabled={!isEditing || isPending}
                        onClick={() => updateValue(setting.key, enabled ? "Inactif" : "Actif")}
                      >
                        {enabled ? "Actif" : "Inactif"}
                      </button>
                    </label>
                  );
                }

                if (setting.type === "multiselect") {
                  const selected = normalizeMultiValue(currentValue);

                  return (
                    <div key={setting.key} className={styles.fieldGroup}>
                      <span>{setting.label}</span>
                      <div className={styles.checkGrid}>
                        {(setting.options || []).map((option) => (
                          <label key={option} className={styles.checkPill}>
                            <input
                              type="checkbox"
                              checked={selected.includes(option)}
                              disabled={!isEditing || isPending}
                              onChange={(event) => updateMultiValue(setting.key, option, event.target.checked)}
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                      {setting.help ? <small>{setting.help}</small> : null}
                    </div>
                  );
                }

                return (
                  <label key={setting.key} className={styles.field}>
                    <span>{setting.label}</span>
                    {setting.type === "select" ? (
                      <select
                        value={currentValue}
                        disabled={!isEditing || isPending}
                        onChange={(event) => updateValue(setting.key, event.target.value)}
                      >
                        {(setting.options || []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={setting.type}
                        min={setting.type === "number" ? 0 : undefined}
                        value={currentValue}
                        disabled={!isEditing || isPending}
                        onChange={(event) => updateValue(setting.key, event.target.value)}
                      />
                    )}
                    {setting.help ? <small>{setting.help}</small> : null}
                  </label>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </form>
  );
}
