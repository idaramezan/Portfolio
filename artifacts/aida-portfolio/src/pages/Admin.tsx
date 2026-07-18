import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Save, LogOut, Upload } from "lucide-react";
import { assetImages, getArtworkImage } from "@/lib/assets";

const BASE = `${import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}/api`;

const CATEGORIES = ["Animals", "Other", "Portraits", "Still Life"];
const STATUSES = ["AVAILABLE", "SOLD", "RESERVED"] as const;

const inputCls = "w-full border border-ink/20 px-3 py-2 font-sans text-sm focus:outline-none focus:border-coral bg-white";
const labelCls = "block font-sans text-xs text-ink/50 mb-1 uppercase tracking-wider";

type ArtRow = {
  id: number; title: string; category: string; year: number;
  sizeInches: string | null; priceCents: number | null; currency: string;
  status: string; imageUrl: string; medium: string; forSale: boolean;
};

async function adminFetch(path: string, pw: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...(opts.headers as Record<string, string> || {}), "x-admin-password": pw },
  });
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || res.statusText);
  return json;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className={labelCls}>{label}</label>{children}</div>;
}

export default function Admin() {
  const [pw, setPw] = useState(() => sessionStorage.getItem("adminPw") || "");
  const [authed, setAuthed] = useState(false);
  const [authErr, setAuthErr] = useState("");
  const [artworks, setArtworks] = useState<ArtRow[]>([]);
  const [edits, setEdits] = useState<Record<number, Partial<ArtRow> & { priceInput?: string }>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [deleting, setDeleting] = useState<Record<number, boolean>>({});

  // Add form
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ title: "", category: "Still Life", year: 2026, sizeInches: "15x10", priceInput: "", status: "AVAILABLE", forSale: false });
  const [addFile, setAddFile] = useState<File | null>(null);
  const [addPreview, setAddPreview] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadArtworks = async (password: string) => {
    const data = await fetch(`${BASE}/artworks?limit=200`).then((r) => r.json());
    setArtworks(Array.isArray(data) ? data : []);
  };

  const tryAuth = async (password: string) => {
    try {
      await adminFetch("/admin/verify", password, { method: "POST", headers: { "Content-Type": "application/json" } });
      sessionStorage.setItem("adminPw", password);
      setAuthed(true);
      setAuthErr("");
      await loadArtworks(password);
    } catch {
      setAuthErr("Incorrect password.");
    }
  };

  // Auto-login from session
  useEffect(() => {
    const stored = sessionStorage.getItem("adminPw");
    if (stored) tryAuth(stored);
  }, []);

  const logout = () => { sessionStorage.removeItem("adminPw"); setAuthed(false); setPw(""); };

  // ── Edit helpers ────────────────────────────────────────────────────────────
  const setField = (id: number, field: string, value: unknown) =>
    setEdits((p) => ({ ...p, [id]: { ...p[id], [field]: value } }));

  const isDirty = (id: number) => Object.keys(edits[id] || {}).length > 0;

  const handleSave = async (artwork: ArtRow) => {
    const ed = edits[artwork.id];
    if (!ed) return;
    setSaving((p) => ({ ...p, [artwork.id]: true }));
    try {
      const body: Record<string, unknown> = { ...ed };
      delete body.priceInput;
      // Convert dollar string → cents
      if (ed.priceInput !== undefined) {
        body.priceCents = ed.priceInput === "" ? null : Math.round(Number(ed.priceInput) * 100);
      }
      const updated = await adminFetch(`/artworks/${artwork.id}`, pw, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setArtworks((p) => p.map((a) => (a.id === artwork.id ? { ...a, ...updated } : a)));
      setEdits((p) => { const n = { ...p }; delete n[artwork.id]; return n; });
    } catch (e: any) {
      alert("Save failed: " + e.message);
    } finally {
      setSaving((p) => ({ ...p, [artwork.id]: false }));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this painting permanently?")) return;
    setDeleting((p) => ({ ...p, [id]: true }));
    try {
      await adminFetch(`/artworks/${id}`, pw, { method: "DELETE" });
      setArtworks((p) => p.filter((a) => a.id !== id));
    } catch (e: any) {
      alert("Delete failed: " + e.message);
      setDeleting((p) => ({ ...p, [id]: false }));
    }
  };

  // ── Add new painting ────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAddFile(f);
    setAddPreview(URL.createObjectURL(f));
  };

  const handleAdd = async () => {
    if (!addForm.title.trim()) { setAddErr("Title is required."); return; }
    if (!addFile) { setAddErr("Please choose an image."); return; }
    setAddBusy(true); setAddErr("");
    try {
      // 1. Create artwork record
      const created: ArtRow = await adminFetch("/artworks", pw, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: addForm.title.trim(),
          category: addForm.category,
          year: addForm.year,
          sizeInches: addForm.sizeInches || null,
          priceCents: addForm.priceInput === "" ? null : Math.round(Number(addForm.priceInput) * 100),
          status: addForm.status,
          forSale: addForm.forSale,
          medium: "Oil pastel",
          currency: "USD",
          availableAsPrint: false,
          imageUrl: "",
        }),
      });
      // 2. Upload image
      const fd = new FormData();
      fd.append("image", addFile);
      const withImage: ArtRow = await adminFetch(`/artworks/${created.id}/image`, pw, { method: "POST", body: fd });
      setArtworks((p) => [...p, withImage]);
      setAddOpen(false);
      setAddForm({ title: "", category: "Still Life", year: 2026, sizeInches: "15x10", priceInput: "", status: "AVAILABLE", forSale: false });
      setAddFile(null); setAddPreview(null);
    } catch (e: any) {
      setAddErr("Failed: " + e.message);
    } finally {
      setAddBusy(false);
    }
  };

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="w-full max-w-sm p-8 bg-white shadow-xl border border-ink/10">
          <h1 className="font-serif text-4xl text-ink mb-1">Admin</h1>
          <p className="font-sans text-muted-foreground text-sm mb-8">Aeda Art gallery management</p>
          <div className="space-y-3">
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && tryAuth(pw)}
              placeholder="Password"
              className="w-full border-2 border-ink/20 px-4 py-3 font-sans text-lg focus:outline-none focus:border-coral"
            />
            {authErr && <p className="text-coral font-sans text-sm">{authErr}</p>}
            <button
              onClick={() => tryAuth(pw)}
              className="w-full bg-ink text-paper font-serif text-xl py-3 hover:bg-coral transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main admin view ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F6F1E7]">
      {/* Header */}
      <div className="bg-ink text-paper px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow">
        <h1 className="font-serif text-2xl">Aeda Art — Gallery Admin</h1>
        <button onClick={logout} className="flex items-center gap-2 text-paper/60 hover:text-paper font-sans text-sm transition-colors">
          <LogOut size={15} /> Sign out
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* ── Add New Painting ─────────────────────────────────────────────── */}
        <div className="border-2 border-ink/10 bg-white">
          <button
            onClick={() => setAddOpen((o) => !o)}
            className="w-full flex items-center justify-between px-6 py-4 font-serif text-xl text-ink hover:bg-ink/5 transition-colors text-left"
          >
            <span className="flex items-center gap-3"><Plus size={20} />Add New Painting</span>
            <span className="font-sans text-sm text-ink/40">{addOpen ? "Collapse ▲" : "Expand ▼"}</span>
          </button>

          {addOpen && (
            <div className="px-6 pb-8 border-t border-ink/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                {/* Image drop zone */}
                <div>
                  <label className={labelCls}>Image *</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-ink/20 flex items-center justify-center cursor-pointer hover:border-coral transition-colors relative overflow-hidden bg-ink/3 aspect-[4/5]"
                  >
                    {addPreview ? (
                      <img src={addPreview} className="absolute inset-0 w-full h-full object-cover" alt="preview" />
                    ) : (
                      <div className="text-center text-ink/30 py-12">
                        <Upload size={36} className="mx-auto mb-3" />
                        <p className="font-sans text-sm">Click to upload</p>
                        <p className="font-sans text-xs mt-1">JPG, PNG up to 25 MB</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </div>

                {/* Fields */}
                <div className="space-y-4">
                  <Field label="Title *">
                    <input value={addForm.title} onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="e.g. The Dirty Martini" />
                  </Field>
                  <Field label="Category">
                    <select value={addForm.category} onChange={(e) => setAddForm((p) => ({ ...p, category: e.target.value }))} className={inputCls}>
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Year">
                    <input type="number" value={addForm.year} onChange={(e) => setAddForm((p) => ({ ...p, year: +e.target.value }))} className={inputCls} />
                  </Field>
                  <Field label="Size (inches)">
                    <input value={addForm.sizeInches} onChange={(e) => setAddForm((p) => ({ ...p, sizeInches: e.target.value }))} className={inputCls} placeholder="15x10" />
                  </Field>
                  <Field label="Price USD (leave blank = Price on Request)">
                    <input type="number" min={0} step={1} value={addForm.priceInput} onChange={(e) => setAddForm((p) => ({ ...p, priceInput: e.target.value }))} className={inputCls} placeholder="e.g. 250" />
                  </Field>
                  <Field label="Status">
                    <select value={addForm.status} onChange={(e) => setAddForm((p) => ({ ...p, status: e.target.value }))} className={inputCls}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <label className="flex items-center gap-3 cursor-pointer select-none mt-1">
                    <input
                      type="checkbox"
                      checked={addForm.forSale}
                      onChange={(e) => setAddForm((p) => ({ ...p, forSale: e.target.checked }))}
                      className="w-5 h-5 accent-coral"
                    />
                    <span className="font-sans text-sm text-ink font-medium">List in Shop Originals</span>
                    <span className="font-sans text-xs text-ink/40">(shows price + buy button)</span>
                  </label>
                  {addErr && <p className="text-coral font-sans text-sm">{addErr}</p>}
                  <button
                    onClick={handleAdd}
                    disabled={addBusy}
                    className="w-full bg-coral text-paper font-serif text-lg py-3 hover:bg-ink transition-colors disabled:opacity-50 mt-2"
                  >
                    {addBusy ? "Uploading…" : "Add Painting"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Paintings list ────────────────────────────────────────────────── */}
        <div>
          <h2 className="font-serif text-2xl text-ink mb-4">All Paintings <span className="text-ink/40 text-lg">({artworks.length})</span></h2>
          <div className="space-y-3">
            {artworks.map((art, idx) => {
              const ed = edits[art.id] || {};
              const dirty = isDirty(art.id);
              const priceInDollars = ed.priceInput !== undefined
                ? ed.priceInput
                : (art.priceCents !== null && art.priceCents !== undefined ? art.priceCents / 100 : "");

              return (
                <div key={art.id} className={`flex gap-4 p-4 bg-white transition-colors border-2 ${dirty ? "border-ochre" : "border-transparent"}`}>
                  {/* Thumbnail */}
                  <img
                    src={getArtworkImage(art, idx + 1)}
                    alt={art.title}
                    className="w-16 h-20 object-cover flex-shrink-0 bg-ink/10"
                  />

                  {/* Editable fields */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-3 items-start min-w-0">
                    <div className="col-span-2">
                      <label className={labelCls}>Title</label>
                      <input
                        value={ed.title !== undefined ? ed.title : art.title}
                        onChange={(e) => setField(art.id, "title", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Category</label>
                      <select
                        value={ed.category !== undefined ? ed.category : art.category}
                        onChange={(e) => setField(art.id, "category", e.target.value)}
                        className={inputCls}
                      >
                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Price (USD $)</label>
                      <input
                        type="number" min={0} step={1}
                        value={priceInDollars}
                        onChange={(e) => setField(art.id, "priceInput", e.target.value)}
                        placeholder="—"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Status</label>
                      <select
                        value={ed.status !== undefined ? ed.status : art.status}
                        onChange={(e) => setField(art.id, "status", e.target.value)}
                        className={inputCls}
                      >
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Size</label>
                      <input
                        value={ed.sizeInches !== undefined ? ed.sizeInches || "" : art.sizeInches || ""}
                        onChange={(e) => setField(art.id, "sizeInches", e.target.value)}
                        placeholder="15x10"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {/* For Sale toggle */}
                  <div className="col-span-2 md:col-span-1 flex items-start pt-5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={ed.forSale !== undefined ? !!ed.forSale : !!art.forSale}
                        onChange={(e) => setField(art.id, "forSale", e.target.checked)}
                        className="w-5 h-5 accent-coral"
                      />
                      <span className="font-sans text-xs text-ink font-medium leading-tight">Shop<br/>Originals</span>
                    </label>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleSave(art)}
                      disabled={!dirty || saving[art.id]}
                      className="flex items-center gap-1 px-3 py-2 bg-ink text-paper font-sans text-xs hover:bg-coral transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Save size={13} /> {saving[art.id] ? "…" : "Save"}
                    </button>
                    <button
                      onClick={() => handleDelete(art.id)}
                      disabled={!!deleting[art.id]}
                      className="flex items-center gap-1 px-3 py-2 border-2 border-coral text-coral font-sans text-xs hover:bg-coral hover:text-paper transition-colors"
                    >
                      <Trash2 size={13} /> {deleting[art.id] ? "…" : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
