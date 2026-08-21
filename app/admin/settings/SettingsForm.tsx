"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import styles from "../admin.module.css";
import { useAdminToast } from "../AdminProviders";

type SettingFieldType = "text" | "email" | "number" | "url" | "textarea" | "image" | "select" | "multiselect" | "switch";

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
  integrations?: ReactNode;
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

export default function SettingsForm({ settings, integrations }: SettingsFormProps) {
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
  const [activeSection, setActiveSection] = useState("Boutique");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const groupedSettings = useMemo(() => {
    const groups = new Map<string, SettingField[]>();

    for (const setting of settings) {
      const current = groups.get(setting.group) || [];
      current.push(setting);
      groups.set(setting.group, current);
    }

    return Array.from(groups.entries()).map(([group, items]) => ({ group, items }));
  }, [settings]);

  const sectionMeta: Record<string, { label: string; description: string; icon: string }> = {
    Boutique: { label: "Général", description: "Identité, devise et langues", icon: "⌂" },
    "Coordonnées": { label: "Coordonnées", description: "Adresse, téléphone et réseaux", icon: "◎" },
    Horaires: { label: "Horaires", description: "Heures d’ouverture", icon: "◷" },
    Accueil: { label: "Page d’accueil", description: "Hero et contenus principaux", icon: "◇" },
    "Informations légales": { label: "Informations légales", description: "Société, TVA et juridiction", icon: "§" },
    Commandes: { label: "Commandes", description: "Numérotation des commandes", icon: "▣" },
    Factures: { label: "Factures", description: "Numérotation des factures", icon: "▤" },
    Emails: { label: "Emails", description: "Adresses opérationnelles", icon: "@" },
    Paiements: { label: "Paiements", description: "Moyens de paiement", icon: "◈" },
    Livraison: { label: "Livraison", description: "Retrait, frais et transporteur", icon: "→" },
    Stock: { label: "Stock", description: "Seuils d’alerte", icon: "□" },
  };

  const activeGroup = groupedSettings.find((section) => section.group === activeSection) || groupedSettings[0];

  const activeMeta =
    activeSection === "Intégrations"
      ? { label: "Intégrations", description: "Google Business et services", icon: "↗" }
      : sectionMeta[activeGroup?.group] || { label: activeGroup?.group || "Paramètres", description: "", icon: "•" };

  function selectSection(section: string) {
    setActiveSection(section);
    setMobileMenuOpen(false);
    if (isEditing) {
      setIsEditing(false);
      setValues(savedValues);
    }
  }


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

  async function uploadImage(key: string, file: File) {
    if (!isEditing) return;
    const form = new FormData();
    form.append("files", file);
    try {
      const response = await fetch("/api/admin/media", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.assets?.[0]?.url) throw new Error(payload.error || "Upload impossible.");
      updateValue(key, payload.assets[0].url);
      toast.success("Image importée. Enregistrez les paramètres pour l'appliquer.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload impossible.");
    }
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
    <div className={styles.settingsForm}>
      <div className={styles.settingsMobileSectionPicker}>
        <button
          type="button"
          className={styles.settingsMobileSectionButton}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span className={styles.settingsMobileSectionIcon}>{activeMeta.icon}</span>
          <span>
            <small>Rubrique</small>
            <strong>{activeMeta.label}</strong>
          </span>
          <i>{mobileMenuOpen ? "×" : "⌄"}</i>
        </button>

        {mobileMenuOpen ? (
          <div
            className={styles.settingsMobileSectionOverlay}
            role="presentation"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className={styles.settingsMobileSectionMenu}
              role="dialog"
              aria-modal="true"
              aria-label="Choisir une rubrique"
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.settingsMobileSheetHandle} aria-hidden="true" />
              <div className={styles.settingsMobileSectionMenuHead}>
                <div>
                  <small>Paramètres FAST CASH</small>
                  <span>Choisir une rubrique</span>
                </div>
                <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Fermer">×</button>
              </div>
              <div className={styles.settingsMobileSectionList}>
              {groupedSettings.map((section) => {
                const meta = sectionMeta[section.group] || { label: section.group, description: "", icon: "•" };
                return (
                  <button
                    key={section.group}
                    type="button"
                    data-active={activeSection === section.group}
                    onClick={() => selectSection(section.group)}
                  >
                    <i>{meta.icon}</i>
                    <span><strong>{meta.label}</strong><small>{meta.description}</small></span>
                    {activeSection === section.group ? <b>✓</b> : null}
                  </button>
                );
              })}
              {integrations ? (
                <button
                  type="button"
                  data-active={activeSection === "Intégrations"}
                  onClick={() => selectSection("Intégrations")}
                >
                  <i>↗</i>
                  <span><strong>Intégrations</strong><small>Google Business et services</small></span>
                  {activeSection === "Intégrations" ? <b>✓</b> : null}
                </button>
              ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className={styles.settingsV21Layout}>
        <aside className={styles.settingsV21Nav}>
          <div className={styles.settingsV21NavHead}>
            <span>Configuration</span>
            <strong>Paramètres</strong>
          </div>
          <nav>
            {groupedSettings.map((section) => {
              const meta = sectionMeta[section.group] || { label: section.group, description: "", icon: "•" };
              return (
                <button key={section.group} type="button" data-active={activeSection === section.group} onClick={() => selectSection(section.group)}>
                  <i>{meta.icon}</i><span><strong>{meta.label}</strong><small>{meta.description}</small></span>
                </button>
              );
            })}
            {integrations ? (
              <button type="button" data-active={activeSection === "Intégrations"} onClick={() => selectSection("Intégrations")}>
                <i>↗</i><span><strong>Intégrations</strong><small>Google Business et services</small></span>
              </button>
            ) : null}
          </nav>
        </aside>

        <main className={styles.settingsV21Content}>
          <div className={styles.settingsV21Header}>
            <div>
              <p className={styles.statLabel}>{activeSection === "Intégrations" ? "Services connectés" : "Réglages boutique"}</p>
              <h2>{activeSection === "Intégrations" ? "Intégrations" : (sectionMeta[activeGroup?.group]?.label || activeGroup?.group)}</h2>
              <p>{activeSection === "Intégrations" ? "Gérez ici les services externes reliés à FAST CASH." : (sectionMeta[activeGroup?.group]?.description || "Modifiez les paramètres de cette section.")}</p>
            </div>
            {activeSection !== "Intégrations"
              ? (!isEditing
                  ? <button className={styles.button} type="button" onClick={startEditing}>Modifier</button>
                  : <span className={styles.editBadgeActive}>Mode édition</span>)
              : null}
          </div>

          {activeSection === "Intégrations" ? integrations : activeGroup ? (
            <form id="settings-config-form" className={`${styles.settingsV21Panel} ${!isEditing ? styles.readOnlyCard : ""}`} onSubmit={handleSubmit}>
              <div className={styles.settingsFields}>
                {activeGroup.items.map((setting) => {
                  const currentValue = values[setting.key] || "";
                  if (setting.type === "switch") {
                    const enabled = currentValue === "Actif";
                    return <label key={setting.key} className={styles.switchField}><span><strong>{setting.label}</strong>{setting.help ? <small>{setting.help}</small> : null}</span><button type="button" className={`${styles.switchButton} ${enabled ? styles.switchButtonActive : ""}`} aria-pressed={enabled} disabled={!isEditing || isPending} onClick={() => updateValue(setting.key, enabled ? "Inactif" : "Actif")}>{enabled ? "Actif" : "Inactif"}</button></label>;
                  }
                  if (setting.type === "multiselect") {
                    const selected = normalizeMultiValue(currentValue);
                    return <div key={setting.key} className={styles.fieldGroup}><span>{setting.label}</span><div className={styles.checkGrid}>{(setting.options || []).map((option) => <label key={option} className={styles.checkPill}><input type="checkbox" checked={selected.includes(option)} disabled={!isEditing || isPending} onChange={(event) => updateMultiValue(setting.key, option, event.target.checked)} />{option}</label>)}</div>{setting.help ? <small>{setting.help}</small> : null}</div>;
                  }
                  if (setting.type === "image") return <div key={setting.key} className={`${styles.fieldGroup} ${styles.settingsV21ImageField}`}><span>{setting.label}</span><div className={styles.settingsImagePreview}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={currentValue} alt={setting.label} /></div><label className={styles.buttonSecondary}>Remplacer l’image<input className={styles.hiddenInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={!isEditing || isPending} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(setting.key, file); event.currentTarget.value = ""; }} /></label>{setting.help ? <small>{setting.help}</small> : null}</div>;
                  if (setting.type === "textarea") return <label key={setting.key} className={styles.field}><span>{setting.label}</span><textarea rows={4} value={currentValue} disabled={!isEditing || isPending} onChange={(event) => updateValue(setting.key, event.target.value)} />{setting.help ? <small>{setting.help}</small> : null}</label>;
                  return <label key={setting.key} className={styles.field}><span>{setting.label}</span>{setting.type === "select" ? <select value={currentValue} disabled={!isEditing || isPending} onChange={(event) => updateValue(setting.key, event.target.value)}>{(setting.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input type={setting.type} min={setting.type === "number" ? 0 : undefined} value={currentValue} disabled={!isEditing || isPending} onChange={(event) => updateValue(setting.key, event.target.value)} />}{setting.help ? <small>{setting.help}</small> : null}</label>;
                })}
              </div>
            </form>
          ) : null}
        </main>
      </div>

      {isEditing ? <div className={styles.settingsV21SaveBar}><div><strong>{hasChanges ? "Modifications non enregistrées" : "Mode édition actif"}</strong><small>{hasChanges ? "Enregistrez pour appliquer vos changements à la boutique." : "Modifiez un champ pour activer l’enregistrement."}</small></div><div className={styles.actionsCompact}><button className={styles.buttonSecondary} type="button" onClick={cancelEditing} disabled={isPending}>Annuler</button><button className={styles.button} type="submit" form="settings-config-form" disabled={isPending || !hasChanges}>{isPending ? "Enregistrement..." : "Enregistrer"}</button></div></div> : null}
    </div>
  );
}
