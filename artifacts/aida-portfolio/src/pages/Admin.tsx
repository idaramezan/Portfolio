import { useEffect, useState } from "react";
import {
  loadShopSettings,
  saveShopSettings,
  type ManagedProduct,
  type ShopSettings,
} from "@/lib/store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type AdminTab = "prints" | "originals";
const PRINT_TYPES = ["T-shirt", "Mug", "Print", "Sticker"] as const;
const ADMIN_USERNAME = "thisisme";
const ADMIN_PASSWORD = "a0019280718";

const emptyManagedProduct = (kind: ManagedProduct["kind"]): ManagedProduct => ({
  id: `new-${Math.random().toString(36).slice(2, 8)}`,
  kind,
  name: "",
  description: "",
  imageUrl: "",
  priceCents: 0,
  available: true,
  maxPerUser: kind === "print" ? 5 : 1,
  dimension: "",
  printType: kind === "print" ? "Print" : undefined,
});

export default function Admin() {
  const [settings, setSettings] = useState<ShopSettings>(loadShopSettings());
  const [tab, setTab] = useState<AdminTab>("prints");
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [newProductDraft, setNewProductDraft] = useState<ManagedProduct | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("aida-admin-authenticated") === "true";
  });

  useEffect(() => {
    saveShopSettings(settings);
  }, [settings]);

  const updateMailPrint = (patch: Partial<ShopSettings["mailPrint"]>) => {
    setSettings((current) => ({ ...current, mailPrint: { ...current.mailPrint, ...patch } }));
  };

  const updateManagedProduct = (id: string, patch: Partial<ManagedProduct>, kind: AdminTab) => {
    setSettings((current) => ({
      ...current,
      [kind === "prints" ? "printProducts" : "originalProducts"]: (
        (kind === "prints" ? current.printProducts : current.originalProducts) as ManagedProduct[]
      ).map((product) => (product.id === id ? { ...product, ...patch } : product)),
    }));
  };

  const isPlaceholderProduct = (product: ManagedProduct) =>
    product.id.startsWith("new-") ||
    !product.name.trim();

  const openNewProductModal = (kind: AdminTab) => {
    setTab(kind);
    setNewProductDraft(emptyManagedProduct(kind === "prints" ? "print" : "original"));
    setNewProductModalOpen(true);
  };

  const saveNewProduct = () => {
    if (!newProductDraft) return;
    setSettings((current) => ({
      ...current,
      [newProductDraft.kind === "print" ? "printProducts" : "originalProducts"]: [
        ...((newProductDraft.kind === "print" ? current.printProducts : current.originalProducts) as ManagedProduct[]),
        newProductDraft,
      ],
    }));
    setNewProductModalOpen(false);
    setNewProductDraft(null);
  };

  const closeNewProductModal = () => {
    setNewProductModalOpen(false);
    setNewProductDraft(null);
  };

  const removeManagedProduct = (id: string, kind: AdminTab) => {
    setSettings((current) => ({
      ...current,
      [kind === "prints" ? "printProducts" : "originalProducts"]: (
        (kind === "prints" ? current.printProducts : current.originalProducts) as ManagedProduct[]
      ).filter((product) => product.id !== id),
    }));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      window.sessionStorage.setItem("aida-admin-authenticated", "true");
      return;
    }
    window.alert("Invalid username or password.");
  };

  const managedProducts = (tab === "prints" ? settings.printProducts : settings.originalProducts).filter(
    (product) => !isPlaceholderProduct(product),
  );

  if (!authenticated) {
    return (
      <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl border border-ink/10 bg-card p-10">
          <h1 className="font-serif text-4xl text-ink mb-4">Admin login</h1>
          <p className="text-muted-foreground mb-8">Enter your credentials to manage shop products and settings.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block text-sm font-sans text-ink">
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2 w-full border border-ink/15 bg-paper px-3 py-2"
              />
            </label>
            <label className="block text-sm font-sans text-ink">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full border border-ink/15 bg-paper px-3 py-2"
              />
            </label>
            <button type="submit" className="inline-flex items-center justify-center rounded-none bg-ink px-6 py-3 font-serif text-lg text-paper hover:bg-coral transition-colors">
              Unlock admin panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-24 space-y-10">
      <div className="border-b border-ink/15 pb-8">
        <p className="font-sans text-sm uppercase tracking-[0.35em] text-muted-foreground">Studio admin</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-serif text-ink">Manage your shop offerings</h1>
        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
          Control the monthly mail print, general product settings, and the managed print/original catalog.
        </p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="border border-ink/10 bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl text-ink">Monthly mail print</h2>
              <p className="mt-2 text-sm text-muted-foreground">Edit the current monthly surprise mail print banner and price.</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-sans">
              <input type="checkbox" checked={settings.mailPrint.enabled} onChange={(e) => updateMailPrint({ enabled: e.target.checked })} />
              Enabled
            </label>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block text-sm font-sans text-ink">
              Banner title
              <input value={settings.mailPrint.title} onChange={(e) => updateMailPrint({ title: e.target.value })} className="mt-2 w-full border border-ink/15 bg-paper px-3 py-2" />
            </label>
            <label className="block text-sm font-sans text-ink">
              Description
              <textarea value={settings.mailPrint.description} onChange={(e) => updateMailPrint({ description: e.target.value })} className="mt-2 min-h-24 w-full border border-ink/15 bg-paper px-3 py-2" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-sans text-ink">
                Month label
                <input value={settings.mailPrint.monthLabel} onChange={(e) => updateMailPrint({ monthLabel: e.target.value })} className="mt-2 w-full border border-ink/15 bg-paper px-3 py-2" />
              </label>
              <label className="block text-sm font-sans text-ink">
                Price
                <input type="number" value={settings.mailPrint.priceCents / 100} onChange={(e) => updateMailPrint({ priceCents: Math.round(Number(e.target.value) * 100) })} className="mt-2 w-full border border-ink/15 bg-paper px-3 py-2" />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm font-sans">
              <input type="checkbox" checked={settings.mailPrint.available} onChange={(e) => updateMailPrint({ available: e.target.checked })} />
              Available to add to basket
            </label>
          </div>
        </div>

        <div className="border border-ink/10 bg-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl text-ink">WhatsApp checkout</h2>
              <p className="mt-2 text-sm text-muted-foreground">Update the number that receives customer orders via WhatsApp.</p>
            </div>
          </div>
          <label className="mt-6 block text-sm font-sans text-ink">
            WhatsApp number
            <input value={settings.whatsappNumber} onChange={(e) => setSettings((current) => ({ ...current, whatsappNumber: e.target.value }))} className="mt-2 w-full border border-ink/15 bg-paper px-3 py-2" />
          </label>
        </div>
      </section>

      <section className="border border-ink/10 bg-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-2xl text-ink">Managed products</h2>
            <p className="mt-2 text-sm text-muted-foreground">Upload prints and originals, set prices, availability and preview images.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("prints")}
              className={`rounded-none px-4 py-2 text-sm ${tab === "prints" ? "bg-ink text-paper" : "border border-ink/15 bg-paper text-ink"}`}
            >
              Prints
            </button>
            <button
              type="button"
              onClick={() => setTab("originals")}
              className={`rounded-none px-4 py-2 text-sm ${tab === "originals" ? "bg-ink text-paper" : "border border-ink/15 bg-paper text-ink"}`}
            >
              Originals
            </button>
            <Button variant="default" size="sm" onClick={() => openNewProductModal(tab)}>
              Add {tab === "prints" ? "print" : "original"}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-6">
          {managedProducts.map((product) => (
            <div key={product.id} className="border border-ink/10 bg-paper p-5 grid gap-4 md:grid-cols-[1fr_220px] md:items-start">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">{product.kind === "print" ? "Print" : "Original"}</p>
                    <h3 className="font-serif text-2xl text-ink mt-2">{product.name || "Untitled product"}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeManagedProduct(product.id, tab)}
                    className="text-sm text-coral"
                  >
                    Remove
                  </button>
                </div>
                <label className="block text-sm font-sans text-ink">
                  Product name
                  <input
                    value={product.name}
                    onChange={(e) => updateManagedProduct(product.id, { name: e.target.value }, tab)}
                    className="mt-2 w-full border border-ink/15 bg-card px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-sans text-ink">
                  Description
                  <textarea
                    value={product.description}
                    onChange={(e) => updateManagedProduct(product.id, { description: e.target.value }, tab)}
                    className="mt-2 w-full min-h-24 border border-ink/15 bg-card px-3 py-2"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-sans text-ink">
                    Price
                    <input
                      type="number"
                      value={product.priceCents / 100}
                      onChange={(e) => updateManagedProduct(product.id, { priceCents: Math.round(Number(e.target.value) * 100) }, tab)}
                      className="mt-2 w-full border border-ink/15 bg-card px-3 py-2"
                    />
                  </label>
                  <label className="block text-sm font-sans text-ink">
                    Dimension
                    <input
                      value={product.dimension}
                      onChange={(e) => updateManagedProduct(product.id, { dimension: e.target.value }, tab)}
                      className="mt-2 w-full border border-ink/15 bg-card px-3 py-2"
                    />
                  </label>
                </div>
                {tab === "prints" && (
                  <label className="block text-sm font-sans text-ink">
                    Print type
                    <select
                      value={product.printType || "Print"}
                      onChange={(e) => updateManagedProduct(product.id, { printType: e.target.value as ManagedProduct["printType"] }, tab)}
                      className="mt-2 w-full border border-ink/15 bg-card px-3 py-2"
                    >
                      {PRINT_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="flex items-center gap-2 text-sm font-sans">
                  <input
                    type="checkbox"
                    checked={product.available}
                    onChange={(e) => updateManagedProduct(product.id, { available: e.target.checked }, tab)}
                  />
                  Available for purchase
                </label>
                <label className="block text-sm font-sans text-ink">
                  Max per customer
                  <input
                    type="number"
                    min="1"
                    value={product.maxPerUser}
                    onChange={(e) => updateManagedProduct(product.id, { maxPerUser: Math.max(1, Number(e.target.value)) }, tab)}
                    className="mt-2 w-full border border-ink/15 bg-card px-3 py-2"
                  />
                </label>
              </div>
              <div className="space-y-4">
                <div className="space-y-4">
                  <label className="block text-sm font-sans text-ink">Product image URL</label>
                  <input
                    value={product.imageUrl}
                    onChange={(e) => updateManagedProduct(product.id, { imageUrl: e.target.value }, tab)}
                    placeholder="https://example.com/image.jpg"
                    className="mt-2 w-full border border-ink/15 bg-card px-3 py-2 text-sm"
                  />
                  <div className="grid gap-2">
                    <label htmlFor={`upload-${product.id}`} className="inline-flex cursor-pointer items-center justify-center rounded-none border border-ink/15 bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5">
                      Choose file
                    </label>
                    <input
                      id={`upload-${product.id}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === "string") {
                            updateManagedProduct(product.id, { imageUrl: reader.result }, tab);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="sr-only"
                    />
                    <p className="text-xs text-muted-foreground">Recommended: JPG/PNG, under 5MB.</p>
                  </div>
                </div>
                <div className="h-48 overflow-hidden rounded-none border border-ink/10 bg-ink/5">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image selected</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Dialog open={newProductModalOpen} onOpenChange={(open) => { if (!open) closeNewProductModal(); setNewProductModalOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new {tab === "prints" ? "print" : "original"}</DialogTitle>
            <DialogDescription>
              Define the product details, upload an image, and save it to your managed catalog.
            </DialogDescription>
          </DialogHeader>
          {newProductDraft ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-sans text-ink">
                  Product name
                  <input
                    value={newProductDraft.name}
                    onChange={(e) => setNewProductDraft({ ...newProductDraft, name: e.target.value })}
                    className="mt-2 w-full border border-ink/15 bg-card px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-sans text-ink">
                  Price
                  <input
                    type="number"
                    value={newProductDraft.priceCents / 100}
                    min={0}
                    onChange={(e) => setNewProductDraft({ ...newProductDraft, priceCents: Math.round(Number(e.target.value) * 100) })}
                    className="mt-2 w-full border border-ink/15 bg-card px-3 py-2"
                  />
                </label>
              </div>

              <label className="block text-sm font-sans text-ink">
                Description
                <textarea
                  value={newProductDraft.description}
                  onChange={(e) => setNewProductDraft({ ...newProductDraft, description: e.target.value })}
                  className="mt-2 w-full min-h-24 border border-ink/15 bg-card px-3 py-2"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-sans text-ink">
                  Dimension
                  <input
                    value={newProductDraft.dimension}
                    onChange={(e) => setNewProductDraft({ ...newProductDraft, dimension: e.target.value })}
                    className="mt-2 w-full border border-ink/15 bg-card px-3 py-2"
                  />
                </label>
                {tab === "prints" && (
                  <label className="block text-sm font-sans text-ink">
                    Product type
                    <select
                      value={newProductDraft.printType}
                      onChange={(e) => setNewProductDraft({ ...newProductDraft, printType: e.target.value as ManagedProduct["printType"] })}
                      className="mt-2 w-full border border-ink/15 bg-card px-3 py-2"
                    >
                      {PRINT_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-ink">Product image</p>
                  <p className="text-xs text-muted-foreground">Recommended JPG/PNG under 5MB</p>
                </div>
                <input
                  value={newProductDraft.imageUrl}
                  onChange={(e) => setNewProductDraft({ ...newProductDraft, imageUrl: e.target.value })}
                  placeholder="Paste an image URL"
                  className="w-full border border-ink/15 bg-card px-3 py-2 text-sm"
                />
                <div className="grid gap-2">
                  <label htmlFor="new-product-image" className="inline-flex cursor-pointer items-center justify-center rounded-none border border-ink/15 bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5">
                    Choose file
                  </label>
                  <input
                    id="new-product-image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === "string") {
                          setNewProductDraft({ ...newProductDraft, imageUrl: reader.result });
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="sr-only"
                  />
                </div>
              </div>

              <div className="h-64 overflow-hidden rounded-none border border-ink/10 bg-ink/5">
                {newProductDraft.imageUrl ? (
                  <img src={newProductDraft.imageUrl} alt={newProductDraft.name || "New product image"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image selected yet</div>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm font-sans">
                <input
                  type="checkbox"
                  checked={newProductDraft.available}
                  onChange={(e) => setNewProductDraft({ ...newProductDraft, available: e.target.checked })}
                />
                Available for purchase
              </label>

              <label className="block text-sm font-sans text-ink">
                Max per customer
                <input
                  type="number"
                  min={1}
                  value={newProductDraft.maxPerUser}
                  onChange={(e) => setNewProductDraft({ ...newProductDraft, maxPerUser: Math.max(1, Number(e.target.value)) })}
                  className="mt-2 w-full border border-ink/15 bg-card px-3 py-2"
                />
              </label>
            </div>
          ) : null}
          <DialogFooter className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={closeNewProductModal}>Cancel</Button>
            <Button onClick={saveNewProduct}>Save product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
