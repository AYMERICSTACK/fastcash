"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, LoaderCircle, MapPin, Pencil, Plus, Search, Trash2, X } from "lucide-react";

type Address = {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  postalCode: string | null;
  city: string;
  country: string;
};

type Form = {
  label: string;
  line1: string;
  line2: string;
  postalCode: string;
  city: string;
  country: string;
};

type AddressSuggestion = {
  label: string;
  line1: string;
  postalCode: string;
  city: string;
  country: string;
};

const emptyForm: Form = {
  label: "",
  line1: "",
  line2: "",
  postalCode: "",
  city: "",
  country: "Suisse",
};

const COUNTRIES = [
  "Suisse",
  "France",
  "Allemagne",
  "Italie",
  "Autriche",
  "Belgique",
  "Espagne",
  "Portugal",
  "Pays-Bas",
  "Luxembourg",
  "Royaume-Uni",
  "Liechtenstein",
  "Autre",
];

export default function AddressManager({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(addresses.length === 0);
  const [form, setForm] = useState<Form>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const requestIdRef = useRef(0);
  const suggestionSelectionRef = useRef(false);
  const editorRef = useRef<HTMLElement | null>(null);

  const autocompleteCountry =
    form.country === "Suisse" || form.country === "France";
  const autocompleteEnabled = Boolean(autocompleteCountry);

  function revealEditor() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        editorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        window.setTimeout(() => {
          const firstField = editorRef.current?.querySelector<
            HTMLInputElement | HTMLSelectElement
          >("input, select");
          firstField?.focus({ preventScroll: true });
        }, 450);
      });
    });
  }

  function edit(address: Address) {
    setEditingId(address.id);
    setOpen(true);
    setMessage("");
    setAddressQuery(address.line1);
    setSuggestions([]);
    setSuggestionsOpen(false);
    setForm({
      label: address.label || "",
      line1: address.line1,
      line2: address.line2 || "",
      postalCode: address.postalCode || "",
      city: address.city,
      country: address.country,
    });
    revealEditor();
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setAddressQuery("");
    setSuggestions([]);
    setSuggestionsOpen(false);
    setOpen(false);
    setMessage("");
  }

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setAddressQuery("");
    setSuggestions([]);
    setSuggestionsOpen(false);
    setMessage("");
    setOpen(true);
    revealEditor();
  }

  useEffect(() => {
    if (suggestionSelectionRef.current) {
      suggestionSelectionRef.current = false;
      setSearching(false);
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }

    if (!autocompleteEnabled) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setSearching(false);
      return;
    }

    const query = addressQuery.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setSearching(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/address-search?q=${encodeURIComponent(query)}&country=${encodeURIComponent(form.country)}`,
          {
            signal: controller.signal,
          },
        );
        const payload = (await response.json()) as { suggestions?: AddressSuggestion[] };
        if (requestId !== requestIdRef.current) return;
        const next = payload.suggestions ?? [];
        setSuggestions(next);
        setSuggestionsOpen(next.length > 0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestions([]);
          setSuggestionsOpen(false);
        }
      } finally {
        if (requestId === requestIdRef.current) setSearching(false);
      }
    }, 320);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [addressQuery, autocompleteEnabled, form.country]);

  function chooseSuggestion(suggestion: AddressSuggestion) {
    suggestionSelectionRef.current = true;
    setForm((current) => ({
      ...current,
      line1: suggestion.line1,
      postalCode: suggestion.postalCode,
      city: suggestion.city,
      country: suggestion.country,
    }));
    setAddressQuery(suggestion.line1);
    setSuggestions([]);
    setSuggestionsOpen(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        editingId ? `/api/customer/addresses/${editingId}` : "/api/customer/addresses",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(result.message || "Enregistrement impossible.");
        return;
      }
      reset();
      router.refresh();
    } catch {
      setMessage("Une erreur réseau est survenue.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Supprimer définitivement cette adresse ?")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/customer/addresses/${id}`, { method: "DELETE" });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(result.message || "Suppression impossible.");
        return;
      }
      if (editingId === id) reset();
      router.refresh();
    } catch {
      setMessage("Une erreur réseau est survenue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="account-address-toolbar">
        <button className="btn btn-gold" type="button" onClick={openNew}>
          <Plus size={17} /> Ajouter une adresse
        </button>
      </div>

      {addresses.length ? (
        <div className="account-card-grid">
          {addresses.map((address) => (
            <article className="account-card account-address-card" key={address.id}>
              <span><MapPin size={24} /></span>
              <strong>{address.label || "Adresse"}</strong>
              <p>
                {address.line1}
                {address.line2 ? <><br />{address.line2}</> : null}
                <br />
                {[address.postalCode, address.city].filter(Boolean).join(" ")}
                <br />
                {address.country}
              </p>
              <div className="account-address-actions">
                <button type="button" onClick={() => edit(address)}>
                  <Pencil size={15} /> Modifier
                </button>
                <button type="button" onClick={() => remove(address.id)} disabled={busy}>
                  <Trash2 size={15} /> Supprimer
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="account-empty-state">
          <MapPin size={34} />
          <strong>Aucune adresse enregistrée</strong>
          <p>Ajoutez une adresse pour accélérer vos prochaines commandes.</p>
        </div>
      )}

      {open ? (
        <section ref={editorRef} className="account-data-card account-address-editor">
          <div className="account-editor-head">
            <div>
              <p className="hero-kicker">{editingId ? "Modification" : "Nouvelle adresse"}</p>
              <h2>{editingId ? "Modifier cette adresse" : "Ajouter une adresse"}</h2>
            </div>
            <button type="button" className="account-icon-button" onClick={reset} aria-label="Fermer">
              <X size={20} />
            </button>
          </div>

          <form className="account-edit-form" onSubmit={submit}>
            <div className="account-form-grid">
              <label>
                <span>Libellé</span>
                <input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Domicile, Bureau..."
                />
              </label>

              <label>
                <span>Pays</span>
                <select
                  required
                  value={COUNTRIES.includes(form.country) ? form.country : "Autre"}
                  onChange={(e) => {
                    const country = e.target.value;
                    setForm({ ...form, country: country === "Autre" ? "" : country });
                    setAddressQuery("");
                    setSuggestions([]);
                    setSuggestionsOpen(false);
                  }}
                  autoComplete="country-name"
                >
                  {COUNTRIES.map((country) => (
                    <option value={country} key={country}>{country}</option>
                  ))}
                </select>
              </label>

              {form.country === "" ? (
                <label className="account-form-wide">
                  <span>Autre pays</span>
                  <input
                    required
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="Saisissez le pays"
                    autoComplete="country-name"
                  />
                </label>
              ) : null}

              <label className="account-form-wide account-address-search-field">
                <span>Adresse</span>
                <div className="account-address-search-wrap">
                  <Search className="account-address-search-icon" size={17} aria-hidden="true" />
                  <input
                    required
                    value={addressQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      suggestionSelectionRef.current = false;
                      setAddressQuery(value);
                      setForm({ ...form, line1: value });
                      setSuggestionsOpen(true);
                    }}
                    onFocus={() => suggestions.length && setSuggestionsOpen(true)}
                    placeholder={
                      autocompleteEnabled
                        ? `Commencez à saisir une adresse ${form.country === "France" ? "française" : "suisse"}...`
                        : "Saisissez l'adresse"
                    }
                    autoComplete="off"
                    aria-autocomplete={autocompleteEnabled ? "list" : undefined}
                    aria-expanded={autocompleteEnabled ? suggestionsOpen : undefined}
                  />
                  {searching ? <LoaderCircle className="account-address-search-loader" size={17} aria-hidden="true" /> : null}

                  {autocompleteEnabled && suggestionsOpen && suggestions.length ? (
                    <div className="account-address-suggestions" role="listbox">
                      {suggestions.map((suggestion, index) => (
                        <button
                          type="button"
                          role="option"
                          key={`${suggestion.label}-${index}`}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => chooseSuggestion(suggestion)}
                        >
                          <MapPin size={16} />
                          <span>
                            <strong>{suggestion.line1}</strong>
                            <small>{[suggestion.postalCode, suggestion.city].filter(Boolean).join(" ")}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <small className="account-field-help">
                  {autocompleteEnabled
                    ? `Suggestions officielles pour les adresses ${form.country === "France" ? "françaises" : "suisses"}. Vous pouvez aussi continuer en saisie manuelle.`
                    : "Saisie manuelle disponible pour ce pays."}
                </small>
              </label>

              <label className="account-form-wide">
                <span>Complément</span>
                <input
                  value={form.line2}
                  onChange={(e) => setForm({ ...form, line2: e.target.value })}
                  autoComplete="address-line2"
                  placeholder="Appartement, étage, bâtiment..."
                />
              </label>

              <label>
                <span>Code postal</span>
                <input
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  autoComplete="postal-code"
                />
              </label>

              <label>
                <span>Ville</span>
                <input
                  required
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  autoComplete="address-level2"
                />
              </label>
            </div>

            <div className="account-edit-actions">
              <button className="btn btn-gold" disabled={busy}>
                {busy ? "Enregistrement..." : editingId ? "Enregistrer les modifications" : "Ajouter l'adresse"}
              </button>
              {message ? <p className="account-feedback error">{message}</p> : null}
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}
