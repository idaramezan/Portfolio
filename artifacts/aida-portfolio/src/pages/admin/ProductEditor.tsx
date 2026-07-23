import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ImagePlus,
  Save,
  Trash2,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { type ManagedProduct, type StudioMailPackage } from "@/lib/store";
import { DEFAULT_MYSTERY_MAIL_EMPTY_STATE } from "@/lib/store";
import { productRepository } from "@/lib/productRepository";
import {
  normalizeOriginalStatus,
  normalizeProductStatus,
  type OriginalStatus,
} from "@/lib/product-status";
import {
  calculatePrintPrice,
  centsToUsd,
  formatPrintSize,
  normalizePrintSizes,
  normalizePrintOptions,
  usdToCents,
  validatePrintOptions,
} from "@/lib/turkiye-products";
import {
  ARTWORK_SURFACE_LABELS,
  normalizeArtworkSurface,
  type ArtworkSurface,
} from "@/lib/artwork-surface";
const field = "mt-2 h-11 w-full border border-ink/15 bg-paper px-3 text-sm";
const area = "mt-2 min-h-28 w-full border border-ink/15 bg-paper p-3 text-sm";
const slugify = (x: string) =>
  x
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const formatUsd = (cents: number) => `$${centsToUsd(cents)}`;
export default function ProductEditor({
  kind,
}: {
  kind: "originals" | "prints" | "studio-mail";
}) {
  const [location, navigate] = useLocation();
  const id = location.split("/").pop() || "new";
  const isNew = id === "new",
    isMail = kind === "studio-mail";
  const [settings, setSettings] = useState(productRepository.getSettings);
  const existing: any = isNew ? null : productRepository.getById(kind, id);
  const uniqueId = () =>
    `${isMail ? "mail" : kind.slice(0, -1)}-${crypto.randomUUID()}`;
  const blank: any = isMail
    ? {
        id: uniqueId(),
        slug: "",
        title: "",
        titleTr: "",
        theme: "",
        shortDescription: "",
        shortDescriptionTr: "",
        fullDescription: "",
        contents: [],
        priceUsdCents: 0,
        priceCurrency: "TRY",
        priceMinor: 0,
        inventory: 0,
        lowStockThreshold: 4,
        showExactInventory: true,
        status: "draft",
        featured: false,
        displayOrder: settings.studioMailPackages.length + 1,
        shippingCountries: ["TR"],
        shippingNote: "Delivery within Türkiye only",
        expiresAt: "",
        timezone: "Europe/Istanbul",
        maximumQuantity: 2,
        includesExclusivePrint: true,
        includesStickers: true,
        mysteryItemsNote: "Other mystery studio items",
      }
    : {
        id: uniqueId(),
        kind: kind === "prints" ? "print" : "original",
        name: "",
        description: "",
        imageUrl: "",
        priceUsdCents: 0,
        priceCurrency: kind === "originals" ? "USD" : "TRY",
        priceMinor: 0,
        available: false,
        maxPerUser: kind === "prints" ? 5 : 1,
        inventory: kind === "prints" ? 10 : undefined,
        dimension: "",
        artworkSurface: kind === "originals" ? "paper" : undefined,
        status: "draft",
        featured: false,
        slug: "",
        updatedAt: new Date().toISOString(),
        availableInTurkiye: true,
        availableInternationally: kind === "originals",
        category: kind === "prints" ? "print" : undefined,
        galleryImages: [],
        displayOrder: settings.printProducts.length + 1,
        freeShippingInTurkiye: false,
        printOptions:
          kind === "prints"
            ? {
                sizes: [
                  {
                    id: "13x18",
                    label: "13 × 18 cm",
                    widthCm: 13,
                    heightCm: 18,
                    additionalPriceUsdCents: 0,
                    available: true,
                    isBaseSize: true,
                    displayOrder: 1,
                  },
                ],
                framing: {
                  unframedAvailable: true,
                  framedAvailable: false,
                  defaultFinish: "unframed",
                  frameAdditionalPriceUsdCents: 0,
                },
              }
            : undefined,
      };
  const [draft, setDraft] = useState<any>(() => {
    const initialDraft = structuredClone(existing || blank);

    // Older catalog records can contain both the former and current field
    // names. Canonicalize them once so a controlled input never displays one
    // property while writing to another.
    if (isMail) {
      initialDraft.title = initialDraft.title ?? initialDraft.name ?? "";
      initialDraft.shortDescription =
        initialDraft.shortDescription ?? initialDraft.description ?? "";
    } else {
      initialDraft.name = initialDraft.name ?? initialDraft.title ?? "";
      initialDraft.description =
        initialDraft.description ?? initialDraft.shortDescription ?? "";
      if (kind === "originals") {
        initialDraft.artworkSurface = normalizeArtworkSurface(
          initialDraft.artworkSurface,
        );
      }
    }

    if (initialDraft.category === "print" && initialDraft.printOptions?.sizes) {
      initialDraft.printOptions.sizes = normalizePrintSizes(
        initialDraft.printOptions.sizes,
      );
    }
    return initialDraft;
  });
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const newSizeRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const editVersionRef = useRef(0);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(
    () => () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview],
  );
  const update = (patch: any) => {
    editVersionRef.current += 1;
    setDraft((x: any) => ({ ...x, ...patch }));
    setDirty(true);
  };
  const updateMysteryMailSettings = (patch: any) => {
    const next = {
      ...settings,
      mysteryMail: {
        ...settings.mysteryMail,
        ...patch,
        emptyState: {
          ...DEFAULT_MYSTERY_MAIL_EMPTY_STATE,
          ...settings.mysteryMail.emptyState,
          ...(patch.emptyState || {}),
        },
      },
    };
    setSettings(next);
    productRepository.replaceSettings(next);
  };
  const setStorefrontMode = (mode: "active-edition" | "not-available-yet") => {
    if (
      mode === "not-available-yet" &&
      settings.mysteryMail.storefrontMode === "active-edition" &&
      !window.confirm(
        "This will close the current public Mystery Mail edition and replace it with the no-edition state. Existing basket items will become unavailable.",
      )
    )
      return;
    updateMysteryMailSettings({ storefrontMode: mode });
  };
  const validate = (publish: boolean) => {
    const publishing =
      publish ||
      normalizeProductStatus(draft.status, draft.available) === "published";
    const next: Record<string, string> = {};
    const title = draft.title || draft.name;
    if (!title?.trim()) next.title = "Title is required";
    if (
      !Number.isInteger(draft.priceUsdCents) ||
      (draft.category === "print"
        ? draft.priceUsdCents < 0
        : draft.priceUsdCents <= 0)
    )
      next.price = "Enter a valid price.";
    if (publishing && !isMail && !draft.imageUrl && !pendingImage)
      next.image = "Add a product image before publishing.";
    if (isMail && !draft.theme?.trim()) next.theme = "Theme is required";
    if (
      kind === "originals" &&
      !["paper", "canvas"].includes(draft.artworkSurface)
    )
      next.artworkSurface = "Choose an artwork surface.";
    if (draft.inventory < 0) next.inventory = "Quantity cannot be negative.";
    if (
      publishing &&
      kind === "prints" &&
      (!Number.isInteger(draft.inventory) || draft.inventory < 0)
    )
      next.inventory = "Enter a valid available quantity.";
    if (
      publishing &&
      kind === "prints" &&
      draft.category === "tshirt" &&
      !draft.tshirtOptions?.availableColors?.length
    )
      next.options = "Select at least one T-shirt color";
    if (publishing && kind === "prints" && draft.category === "print") {
      const optionErrors = validatePrintOptions(draft.printOptions);
      if (optionErrors.length) next.options = optionErrors[0];
    }
    if (
      publishing &&
      isMail &&
      (!draft.expiresAt || Date.parse(draft.expiresAt) <= Date.now())
    )
      next.expiration = "Published Mystery Mail requires a future expiration";
    const duplicateSlug = productRepository
      .getAll()
      .some(
        (product: any) =>
          product.id !== id && product.slug && product.slug === draft.slug,
      );
    if (duplicateSlug)
      next.slug = "This slug is already used by another product";
    setErrors(next);
    if (Object.keys(next).length) titleRef.current?.focus();
    return !Object.keys(next).length;
  };
  const uploadImage = async (file: File) => {
    const body = new FormData();
    body.append("image", file);
    body.append("productId", draft.id);
    const password =
      sessionStorage.getItem("aida-admin-password") ||
      import.meta.env.VITE_ADMIN_PASSWORD ||
      "a0019280718";
    const response = await fetch("/api/admin/product-media", {
      method: "POST",
      headers: { "x-admin-password": password },
      body,
    });
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => ({}))
      : {};
    if (!response.ok || !payload.imageUrl) {
      if (payload.error) throw new Error(payload.error);
      if (response.status === 404)
        throw new Error(
          "The image upload service is unavailable. Start the API server and try again.",
        );
      throw new Error(`Image upload failed (HTTP ${response.status}).`);
    }
    return String(payload.imageUrl);
  };
  const persist = async (publish = false) => {
    if (savingRef.current) return;
    if (!validate(publish)) return;
    const savingVersion = editVersionRef.current;
    const targetStatus =
      kind === "originals"
        ? publish
          ? "available"
          : normalizeOriginalStatus(draft.status, draft.available)
        : publish
          ? "published"
          : normalizeProductStatus(draft.status, draft.available);
    if (targetStatus === "published" && isMail) {
      const active = settings.studioMailPackages.find(
        (item) =>
          item.id !== draft.id &&
          item.status === "published" &&
          item.expiresAt &&
          Date.parse(item.expiresAt) > Date.now() &&
          item.inventory !== 0,
      );
      if (active) {
        if (
          !window.confirm(
            "Another Mystery Mail is currently active. Archive the current edition and publish this one?",
          )
        )
          return;
        productRepository.update("studio-mail", active.id, {
          status: "archived",
        });
      }
    }
    savingRef.current = true;
    setSaving(true);
    setErrors((current) => ({ ...current, save: "" }));
    let uploadedImageUrl = draft.imageUrl;
    try {
      if (pendingImage) uploadedImageUrl = await uploadImage(pendingImage);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        save:
          error instanceof Error
            ? error.message
            : "Changes could not be saved. Your form values have been preserved.",
      }));
      setSaving(false);
      savingRef.current = false;
      return;
    }
    const now = new Date().toISOString();
    const normalizedPrintOptions =
      kind === "prints" && draft.category === "print"
        ? normalizePrintOptions(draft.printOptions)
        : draft.printOptions;
    const final = {
      ...draft,
      priceCurrency: kind === "originals" ? "USD" : "TRY",
      priceMinor: draft.priceUsdCents,
      ...(!isMail ? { imageUrl: uploadedImageUrl } : {}),
      printOptions: normalizedPrintOptions,
      printOptionWarnings:
        kind === "prints" && normalizedPrintOptions
          ? normalizedPrintOptions.sizes
              .filter((size: any) => formatPrintSize(size).mismatch)
              .map(
                (size: any) =>
                  `${size.label}: centimetre and inch measurements do not match. Review this size in admin.`,
              )
          : draft.printOptionWarnings,
      updatedAt: now,
      status: targetStatus,
      ...(!isMail
        ? {
            available:
              targetStatus ===
              (kind === "originals" ? "available" : "published"),
          }
        : {}),
    };
    let saved: ManagedProduct | StudioMailPackage;
    try {
      saved = isNew
        ? productRepository.create(kind, final)
        : productRepository.update(kind, id, final);
      if (isMail && targetStatus === "published") {
        const latest = productRepository.getSettings();
        latest.mysteryMail = {
          ...latest.mysteryMail,
          storefrontMode: "active-edition",
          activeEditionId: final.id,
        };
        productRepository.replaceSettings(latest);
        setSettings(latest);
      }
      // Keep the editor in sync with the exact record that was persisted.
      // This also prevents a settings refresh from restoring the pre-edit
      // snapshot after an update.
      if (editVersionRef.current === savingVersion) {
        setDraft(structuredClone(saved));
        setPendingImage(null);
        setImagePreview("");
      }
    } catch (error) {
      setErrors({
        save:
          error instanceof Error ? error.message : "Product could not be saved",
      });
      setSaving(false);
      savingRef.current = false;
      return;
    }
    setDirty(editVersionRef.current !== savingVersion);
    setSavedAt(now);
    setSaving(false);
    savingRef.current = false;
    if (isNew) navigate(`/admin/${kind}/${final.id}`, { replace: true });
  };
  const imageChange = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrors((x) => ({ ...x, image: "Use JPEG, PNG or WebP" }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors((x) => ({
        ...x,
        image: "Image must be under 10 MB",
      }));
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setPendingImage(file);
    setImagePreview(URL.createObjectURL(file));
    setErrors((current) => ({ ...current, image: "" }));
    setDirty(true);
    editVersionRef.current += 1;
  };
  const setSizes = (sizes: any[]) =>
    update({
      printOptions: {
        ...draft.printOptions,
        sizes: normalizePrintSizes(sizes),
      },
    });
  const changeSize = (index: number, patch: any) => {
    const sizes = [...(draft.printOptions?.sizes || [])];
    const usesCentimetres = "widthCm" in patch || "heightCm" in patch;
    sizes[index] = {
      ...sizes[index],
      ...(usesCentimetres ? { widthIn: undefined, heightIn: undefined } : {}),
      ...patch,
    };
    setSizes(sizes);
  };
  const moveSize = (index: number, direction: -1 | 1) => {
    const sizes = [...draft.printOptions.sizes];
    [sizes[index], sizes[index + direction]] = [
      sizes[index + direction],
      sizes[index],
    ];
    setSizes(sizes);
  };
  const changeFraming = (patch: any) =>
    update({
      printOptions: {
        ...draft.printOptions,
        framing: { ...draft.printOptions.framing, ...patch },
      },
    });
  const title =
    draft.title ||
    draft.name ||
    `New ${isMail ? "Mystery Mail edition" : kind.slice(0, -1)}`;
  if (!isNew && !existing)
    return (
      <AdminLayout title="Product not found">
        <div className="border border-coral/20 bg-paper p-8">
          <h2 className="text-xl font-bold">Product not found</h2>
          <p className="mt-2 text-sm text-ink/55">
            No product with ID “{id}” exists in the canonical catalog.
          </p>
          <button
            onClick={() => navigate(`/admin/${kind}`)}
            className="button-primary mt-5"
          >
            Return to catalog
          </button>
        </div>
      </AdminLayout>
    );
  return (
    <AdminLayout title={title}>
      {isMail && (
        <section className="mb-6 border border-ink/10 bg-paper p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-ink/45">
            Public Mystery Mail page
          </p>
          <fieldset className="mt-4 grid gap-3 md:grid-cols-2">
            <legend className="sr-only">
              Public Mystery Mail availability
            </legend>
            <label className="flex min-h-16 items-start gap-3 border border-ink/15 p-4">
              <input
                type="radio"
                name="mystery-storefront-mode"
                value="active-edition"
                checked={
                  settings.mysteryMail.storefrontMode === "active-edition"
                }
                onChange={() => setStorefrontMode("active-edition")}
                className="mt-1"
              />
              <span>
                <strong className="block">Show active edition</strong>
                <span className="text-xs text-ink/50">
                  Use the selected published edition, its price and ordering
                  window.
                </span>
              </span>
            </label>
            <label className="flex min-h-16 items-start gap-3 border border-ink/15 p-4">
              <input
                type="radio"
                name="mystery-storefront-mode"
                value="not-available-yet"
                checked={
                  settings.mysteryMail.storefrontMode === "not-available-yet"
                }
                onChange={() => setStorefrontMode("not-available-yet")}
                className="mt-1"
              />
              <span>
                <strong className="block">Show “Not available yet”</strong>
                <span className="text-xs text-ink/50">
                  The page stays visible, but visitors see that no edition is
                  currently available.
                </span>
              </span>
            </label>
          </fieldset>
          {settings.mysteryMail.storefrontMode === "active-edition" && (
            <label className="mt-4 block max-w-md text-sm font-semibold">
              Active public edition
              <select
                value={settings.mysteryMail.activeEditionId || ""}
                onChange={(e) =>
                  updateMysteryMailSettings({ activeEditionId: e.target.value })
                }
                className={field}
              >
                <option value="">Select an edition</option>
                {settings.studioMailPackages
                  .filter((edition) =>
                    ["published", "sold_out"].includes(edition.status),
                  )
                  .map((edition) => (
                    <option key={edition.id} value={edition.id}>
                      {edition.title}
                    </option>
                  ))}
              </select>
              {!settings.mysteryMail.activeEditionId && (
                <span className="mt-1 block text-xs text-coral">
                  Select a published edition to show purchase information.
                </span>
              )}
            </label>
          )}
          {settings.mysteryMail.storefrontMode === "not-available-yet" && (
            <div className="mt-5 border-t border-ink/10 pt-5">
              <p className="eyebrow">Public preview</p>
              <h2 className="mt-2 text-2xl">
                {settings.mysteryMail.emptyState?.heading}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-ink/60">
                {settings.mysteryMail.emptyState?.description}
              </p>
              <a
                href="/shop/turkiye/mystery-mail"
                className="button-secondary mt-4"
              >
                View storefront
              </a>
              <details className="mt-5 border-t border-ink/10 pt-4">
                <summary className="cursor-pointer text-sm font-semibold">
                  Empty-state message
                </summary>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {[
                    ["eyebrow", "Eyebrow"],
                    ["heading", "Heading"],
                    ["description", "Description"],
                    ["supportingLine", "Supporting line"],
                    ["primaryCtaLabel", "CTA label"],
                    ["primaryCtaUrl", "CTA destination"],
                  ].map(([key, label]) => (
                    <label key={key} className="text-sm font-semibold">
                      {label}
                      <input
                        value={
                          (settings.mysteryMail.emptyState as any)?.[key] || ""
                        }
                        onChange={(e) =>
                          updateMysteryMailSettings({
                            emptyState: { [key]: e.target.value },
                          })
                        }
                        className={field}
                      />
                    </label>
                  ))}
                </div>
              </details>
            </div>
          )}
        </section>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <FormSection
            title={isMail ? "Edition information" : "Product information"}
          >
            {kind === "prints" && !isMail && (
              <label>
                Product type
                <select
                  value={draft.category || "print"}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (
                      next !== draft.category &&
                      (draft.printOptions || draft.tshirtOptions)
                    ) {
                      if (
                        !window.confirm(
                          "Changing the category will remove incompatible product options.",
                        )
                      )
                        return;
                    }
                    update({
                      category: next,
                      printOptions:
                        next === "print"
                          ? draft.printOptions || {
                              sizes: [
                                {
                                  id: "13x18",
                                  label: "13 × 18 cm",
                                  widthCm: 13,
                                  heightCm: 18,
                                  additionalPriceUsdCents: 0,
                                  available: true,
                                  isBaseSize: true,
                                  displayOrder: 1,
                                },
                              ],
                              framing: {
                                unframedAvailable: true,
                                framedAvailable: false,
                                defaultFinish: "unframed",
                                frameAdditionalPriceUsdCents: 0,
                              },
                            }
                          : undefined,
                      tshirtOptions:
                        next === "tshirt" ? { availableColors: [] } : undefined,
                      mugOptions:
                        next === "mug" ? { color: "white" } : undefined,
                      stickerOptions: next === "sticker" ? {} : undefined,
                    });
                  }}
                  className={field}
                >
                  <option value="tshirt">T-shirt</option>
                  <option value="mug">Mug</option>
                  <option value="print">Print</option>
                  <option value="sticker">Sticker</option>
                </select>
              </label>
            )}
            <label>
              {isMail ? "Mystery Mail name" : "Product title"}
              <input
                ref={titleRef}
                value={isMail ? draft.title || "" : draft.name || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  update(
                    isMail
                      ? { title: value, slug: draft.slug || slugify(value) }
                      : { name: value, slug: draft.slug || slugify(value) },
                  );
                }}
                className={field}
                aria-invalid={!!errors.title}
              />
              {errors.title && <ErrorText>{errors.title}</ErrorText>}
            </label>
            {isMail && (
              <label>
                Mystery Mail name — Turkish
                <input
                  value={draft.titleTr || ""}
                  onChange={(e) => update({ titleTr: e.target.value })}
                  className={field}
                  lang="tr"
                />
                <span className="mt-1 block text-xs text-ink/45">
                  Shown when the storefront language is Turkish.
                </span>
              </label>
            )}
            {!isMail && (
              <label>
                Slug
                <input
                  value={draft.slug || ""}
                  onChange={(e) => update({ slug: slugify(e.target.value) })}
                  className={field}
                />
                {errors.slug && <ErrorText>{errors.slug}</ErrorText>}
                <span className="mt-1 block text-xs text-ink/45">
                  Public URL: /{kind}/{draft.slug || "product-slug"}
                </span>
              </label>
            )}
            {isMail && (
              <label>
                Vague subtitle
                <input
                  value={draft.vagueSubtitle || draft.theme}
                  onChange={(e) =>
                    update({
                      vagueSubtitle: e.target.value,
                      theme: e.target.value,
                    })
                  }
                  className={field}
                />
                {errors.theme && <ErrorText>{errors.theme}</ErrorText>}
              </label>
            )}
            <label>
              {isMail ? "Teaser description" : "Short description"}
              <textarea
                value={
                  isMail
                    ? draft.shortDescription || ""
                    : draft.description || ""
                }
                onChange={(e) =>
                  update(
                    isMail
                      ? { shortDescription: e.target.value }
                      : { description: e.target.value },
                  )
                }
                className={area}
              />
            </label>
            {isMail && (
              <label>
                Teaser description — Turkish
                <textarea
                  value={draft.shortDescriptionTr || ""}
                  onChange={(e) =>
                    update({ shortDescriptionTr: e.target.value })
                  }
                  className={area}
                  lang="tr"
                />
                <span className="mt-1 block text-xs text-ink/45">
                  Shown when the storefront language is Turkish.
                </span>
              </label>
            )}
            {!isMail && (
              <label className="md:col-span-2">
                Full description{" "}
                <span className="font-normal text-ink/45">(optional)</span>
                <textarea
                  value={draft.fullDescription || ""}
                  onChange={(e) => update({ fullDescription: e.target.value })}
                  className={area}
                />
              </label>
            )}
          </FormSection>
          {!isMail && (
            <FormSection title="Product image">
              <div className="flex flex-wrap gap-5">
                {imagePreview || draft.imageUrl ? (
                  <div className="relative">
                    <img
                      src={imagePreview || draft.imageUrl}
                      alt="Product preview"
                      className="h-40 w-40 object-cover"
                    />
                    <button
                      onClick={() => {
                        if (
                          !window.confirm(
                            "Remove this product image? This takes effect when you save.",
                          )
                        )
                          return;
                        if (imagePreview) URL.revokeObjectURL(imagePreview);
                        setPendingImage(null);
                        setImagePreview("");
                        update({ imageUrl: "" });
                      }}
                      className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center bg-paper shadow"
                      aria-label="Remove image"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center bg-ink/5 text-ink/35">
                    <ImagePlus />
                  </div>
                )}
                <label className="flex h-11 cursor-pointer items-center border border-ink/20 px-4 text-sm font-semibold">
                  {imagePreview || draft.imageUrl
                    ? "Replace image"
                    : "Choose image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => imageChange(e.target.files?.[0])}
                    className="sr-only"
                  />
                </label>
              </div>
              {errors.image && <ErrorText>{errors.image}</ErrorText>}
              <p className="text-xs text-ink/45">
                JPEG, PNG or WebP, up to 2 MB.
              </p>
            </FormSection>
          )}
          <FormSection title={isMail ? "Price and availability" : "Pricing"}>
            <label>
              {kind === "originals"
                ? "Base price in USD"
                : isMail
                  ? "Price in TRY"
                  : draft.category === "print"
                    ? "Starting price in TRY"
                    : "Price in TRY"}
              <div className="relative">
                <span className="absolute left-3 top-3 text-sm">{kind === "originals" ? "$" : "₺"}</span>
                <input
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.priceUsdCents / 100 || ""}
                  onChange={(e) =>
                    update({ priceUsdCents: usdToCents(e.target.value) })
                  }
                  className={`${field} pl-7`}
                />
              </div>
              <span className="mt-1 block text-xs text-ink/45">
                {kind === "originals"
                  ? "Original prices are stored in USD. The Türkiye shop automatically displays the current TRY equivalent."
                  : draft.category === "print"
                    ? "Enter the smallest base-size price in Turkish lira."
                    : "Enter the customer price in Turkish lira."}
              </span>
              {errors.price && <ErrorText>{errors.price}</ErrorText>}
            </label>
            {kind !== "originals" && draft.pricingMigration && !draft.pricingMigrationReviewed && (
              <div className="md:col-span-2 border border-coral/30 bg-coral/5 p-4 text-sm">
                <strong className="text-coral">This price was converted from USD. Review it before publishing.</strong>
                <p className="mt-2 text-ink/60">Rate: {draft.pricingMigration.appliedConversionRate} · {draft.pricingMigration.conversionDate}</p>
                <button type="button" className="button-secondary mt-3" onClick={() => update({ pricingMigrationReviewed: true })}>Confirm reviewed TRY price</button>
              </div>
            )}
            {isMail && (
              <>
                <label>
                  Available quantity
                  <input
                    type="number"
                    min="0"
                    value={draft.inventory}
                    onChange={(e) =>
                      update({ inventory: Math.max(0, Number(e.target.value)) })
                    }
                    className={field}
                  />
                  <span className="mt-1 block text-xs text-ink/45">
                    How many can currently be ordered?
                  </span>
                  {errors.inventory && (
                    <ErrorText>{errors.inventory}</ErrorText>
                  )}
                </label>
                <label>
                  Maximum per basket
                  <input
                    type="number"
                    min="1"
                    value={draft.maximumQuantity || 1}
                    onChange={(e) =>
                      update({
                        maximumQuantity: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className={field}
                  />
                </label>
              </>
            )}
          </FormSection>
          <FormSection title={isMail ? "Order window" : "Inventory"}>
            {isMail ? (
              <>
                <label>
                  Available until (Istanbul time)
                  <input
                    type="datetime-local"
                    value={
                      draft.expiresAt
                        ? new Date(draft.expiresAt).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      update({
                        expiresAt: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : "",
                      })
                    }
                    className={field}
                  />
                  {errors.expiration && (
                    <ErrorText>{errors.expiration}</ErrorText>
                  )}
                </label>
                <label>
                  Time zone
                  <input readOnly value="Europe/Istanbul" className={field} />
                  {draft.expiresAt && (
                    <span className="mt-1 block text-xs text-ink/45">
                      Deadline:{" "}
                      {new Date(draft.expiresAt).toLocaleString("en-GB", {
                        timeZone: "Europe/Istanbul",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      Istanbul time
                    </span>
                  )}
                </label>
              </>
            ) : (
              <>
                {kind === "originals" && (
                  <>
                    <label>
                      Dimensions
                      <input
                        value={draft.dimension || ""}
                        onChange={(e) => update({ dimension: e.target.value })}
                        className={field}
                      />
                    </label>
                    <fieldset
                      className="md:col-span-2"
                      aria-describedby="artwork-surface-help artwork-surface-error"
                    >
                      <legend className="font-semibold">Artwork surface</legend>
                      <p
                        id="artwork-surface-help"
                        className="mt-1 text-sm text-ink/50"
                      >
                        Choose the physical surface used for this original work.
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {(Object.entries(ARTWORK_SURFACE_LABELS) as [
                          ArtworkSurface,
                          string,
                        ][]).map(([value, label]) => (
                          <label
                            key={value}
                            className={`flex min-h-12 cursor-pointer items-center gap-3 border p-4 transition-colors focus-within:ring-2 focus-within:ring-coral ${
                              draft.artworkSurface === value
                                ? "border-coral bg-coral/5"
                                : "border-ink/15 bg-paper"
                            }`}
                          >
                            <input
                              type="radio"
                              name="artworkSurface"
                              value={value}
                              checked={draft.artworkSurface === value}
                              onChange={() => update({ artworkSurface: value })}
                              aria-invalid={Boolean(errors.artworkSurface)}
                            />
                            <span className="font-semibold">{label}</span>
                            {draft.artworkSurface === value && (
                              <span className="ml-auto text-xs font-bold uppercase tracking-wider text-coral">
                                Selected
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                      {errors.artworkSurface && (
                        <span id="artwork-surface-error">
                          <ErrorText>{errors.artworkSurface}</ErrorText>
                        </span>
                      )}
                    </fieldset>
                  </>
                )}
                {kind === "prints" && (
                  <label>
                    Available quantity
                    <input
                      type="number"
                      min="0"
                      value={draft.inventory ?? 0}
                      onChange={(e) =>
                        update({
                          inventory: Math.max(0, Number(e.target.value)),
                        })
                      }
                      className={field}
                    />
                    <span className="mt-1 block text-xs text-ink/45">
                      How many can currently be ordered?
                    </span>
                    {errors.inventory && (
                      <ErrorText>{errors.inventory}</ErrorText>
                    )}
                  </label>
                )}
              </>
            )}
          </FormSection>
          {kind === "prints" && draft.category === "print" && (
            <FormSection title="Options and pricing">
              {draft.printOptionWarnings?.length > 0 && (
                <div className="md:col-span-2 border border-coral/30 bg-coral/5 p-4 text-sm text-coral">
                  <strong>Measurement review needed</strong>
                  {draft.printOptionWarnings.map((warning: string) => (
                    <p key={warning} className="mt-1">
                      {warning}
                    </p>
                  ))}
                </div>
              )}
              <div className="md:col-span-2 space-y-3">
                <p className="text-sm font-semibold">Available sizes</p>
                <p className="text-sm font-normal text-ink/50">
                  Add the sizes customers can order. The first available size
                  uses the base print price.
                </p>
                {(draft.printOptions?.sizes || []).map(
                  (size: any, index: number) => (
                    <div
                      key={size.id}
                      className="grid gap-3 border-t border-ink/10 py-4 sm:grid-cols-2 lg:grid-cols-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2 lg:col-span-4">
                        <strong>
                          {size.isBaseSize ? "Base size" : `Size ${index + 1}`}
                        </strong>
                        {size.isBaseSize && (
                          <span className="text-xs font-semibold text-coral">
                            Included in base price
                          </span>
                        )}
                      </div>
                      <label>
                        Size name
                        <input
                          ref={
                            index === draft.printOptions.sizes.length - 1
                              ? newSizeRef
                              : undefined
                          }
                          value={size.label}
                          onChange={(e) =>
                            changeSize(index, { label: e.target.value })
                          }
                          className={field}
                        />
                      </label>
                      <label>
                        Width (cm)
                        <input
                          type="number"
                          value={size.widthCm || ""}
                          onChange={(e) =>
                            changeSize(index, {
                              widthCm: Number(e.target.value),
                            })
                          }
                          className={field}
                        />
                      </label>
                      <label>
                        Height (cm)
                        <input
                          type="number"
                          value={size.heightCm || ""}
                          onChange={(e) =>
                            changeSize(index, {
                              heightCm: Number(e.target.value),
                            })
                          }
                          className={field}
                        />
                      </label>
                      <label>
                        Size price difference in TRY
                        <div className="relative">
                          <span className="absolute left-3 top-3">+₺</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={size.isBaseSize}
                            value={centsToUsd(size.additionalPriceUsdCents)}
                            onChange={(e) =>
                              changeSize(index, {
                                additionalPriceUsdCents: usdToCents(
                                  e.target.value,
                                ),
                              })
                            }
                            className={`${field} pl-8 disabled:bg-ink/5`}
                          />
                        </div>
                        <span className="mt-1 block text-xs font-normal text-ink/45">
                          This amount is added to the base print price.
                        </span>
                      </label>
                      <label className="flex min-h-11 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={size.available}
                          onChange={(e) =>
                            changeSize(index, { available: e.target.checked })
                          }
                        />
                        Available
                      </label>
                      <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-1">
                        <IconButton
                          label="Move up"
                          disabled={!index}
                          onClick={() => moveSize(index, -1)}
                        >
                          <ArrowUp size={16} />
                        </IconButton>
                        <IconButton
                          label="Move down"
                          disabled={
                            index === draft.printOptions.sizes.length - 1
                          }
                          onClick={() => moveSize(index, 1)}
                        >
                          <ArrowDown size={16} />
                        </IconButton>
                        <IconButton
                          label="Duplicate"
                          onClick={() =>
                            setSizes([
                              ...draft.printOptions.sizes.slice(0, index + 1),
                              {
                                ...size,
                                id: crypto.randomUUID(),
                                isBaseSize: false,
                              },
                              ...draft.printOptions.sizes.slice(index + 1),
                            ])
                          }
                        >
                          <Copy size={16} />
                        </IconButton>
                        <IconButton
                          label="Remove"
                          disabled={draft.printOptions.sizes.length === 1}
                          onClick={() =>
                            setSizes(
                              draft.printOptions.sizes.filter(
                                (_: any, i: number) => i !== index,
                              ),
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </div>
                  ),
                )}
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => {
                    setSizes([
                      ...(draft.printOptions?.sizes || []),
                      {
                        id: crypto.randomUUID(),
                        label: "",
                        additionalPriceUsdCents: 0,
                        available: true,
                        isBaseSize: false,
                        displayOrder:
                          (draft.printOptions?.sizes?.length || 0) + 1,
                      },
                    ]);
                    requestAnimationFrame(() => newSizeRef.current?.focus());
                  }}
                >
                  Add another size
                </button>
              </div>
              <div className="md:col-span-2 border-t border-ink/10 pt-5">
                <h3 className="font-semibold">Framing</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="flex min-h-20 items-center gap-3 border border-ink/10 p-4">
                    <input
                      type="checkbox"
                      checked={draft.printOptions?.framing?.unframedAvailable}
                      onChange={(e) =>
                        update({
                          printOptions: {
                            ...draft.printOptions,
                            framing: {
                              ...draft.printOptions.framing,
                              unframedAvailable: e.target.checked,
                            },
                          },
                        })
                      }
                    />
                    <span>
                      <strong className="block">Unframed</strong>
                      <span className="text-xs font-normal text-ink/50">
                        Print only, packed flat.
                      </span>
                    </span>
                  </label>
                  <label className="flex min-h-20 items-center gap-3 border border-ink/10 p-4">
                    <input
                      type="checkbox"
                      checked={draft.printOptions?.framing?.framedAvailable}
                      onChange={(e) =>
                        update({
                          printOptions: {
                            ...draft.printOptions,
                            framing: {
                              ...draft.printOptions.framing,
                              framedAvailable: e.target.checked,
                            },
                          },
                        })
                      }
                    />
                    <span>
                      <strong className="block">Framed</strong>
                      <span className="text-xs font-normal text-ink/50">
                        Prepared in a frame before delivery.
                      </span>
                    </span>
                  </label>
                </div>
                <fieldset className="mt-4 max-w-xl">
                  <legend className="text-sm font-semibold">
                    Default finish
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm">
                    {draft.printOptions?.framing?.unframedAvailable && (
                      <label className="flex min-h-11 items-center gap-2">
                        <input
                          type="radio"
                          name="default-finish"
                          checked={
                            (draft.printOptions.framing.defaultFinish ||
                              "unframed") === "unframed"
                          }
                          onChange={() =>
                            changeFraming({ defaultFinish: "unframed" })
                          }
                        />
                        Unframed
                      </label>
                    )}
                    {draft.printOptions?.framing?.framedAvailable && (
                      <label className="flex min-h-11 items-center gap-2">
                        <input
                          type="radio"
                          name="default-finish"
                          checked={
                            draft.printOptions.framing.defaultFinish ===
                            "framed"
                          }
                          onChange={() =>
                            changeFraming({ defaultFinish: "framed" })
                          }
                        />
                        Framed
                      </label>
                    )}
                  </div>
                </fieldset>
                {draft.printOptions?.framing?.unframedAvailable && (
                  <label className="mt-4 block max-w-sm">
                    Unframed price difference
                    <div className="relative">
                      <span className="absolute left-3 top-3">+$</span>
                      <input
                        readOnly
                        value="0.00"
                        className={`${field} bg-ink/5 pl-8`}
                      />
                    </div>
                  </label>
                )}
                {draft.printOptions?.framing?.framedAvailable && (
                  <label className="mt-4 block max-w-sm">
                    Frame price difference in TRY
                    <div className="relative">
                      <span className="absolute left-3 top-3">+₺</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={centsToUsd(
                          draft.printOptions?.framing
                            ?.frameAdditionalPriceUsdCents || 0,
                        )}
                        onChange={(e) =>
                          update({
                            printOptions: {
                              ...draft.printOptions,
                              framing: {
                                ...draft.printOptions.framing,
                                frameAdditionalPriceUsdCents: usdToCents(
                                  e.target.value,
                                ),
                              },
                            },
                          })
                        }
                        className={`${field} pl-8`}
                      />
                    </div>
                    <span className="mt-1 block text-xs font-normal text-ink/45">
                      This amount is added after the selected size price
                      difference.
                    </span>
                  </label>
                )}
              </div>
              <div className="md:col-span-2 border-t border-ink/10 pt-5">
                <h3 className="font-semibold">Customer price preview</h3>
                <div className="mt-3 divide-y divide-ink/10 border-y border-ink/10">
                  {(draft.printOptions?.sizes || [])
                    .filter((size: any) => size.available)
                    .map((size: any) => (
                      <div
                        key={size.id}
                        className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_auto_auto] sm:gap-8"
                      >
                        <strong>{size.label || "Unnamed size"}</strong>
                        {draft.printOptions.framing.unframedAvailable && (
                          <span>
                            Unframed:{" "}
                            <b>
                              {formatUsd(
                                calculatePrintPrice({
                                  basePriceCents: draft.priceUsdCents,
                                  sizePriceDifferenceCents:
                                    size.additionalPriceUsdCents,
                                  finishPriceDifferenceCents: 0,
                                }).unitPriceCents,
                              )}
                            </b>
                          </span>
                        )}
                        {draft.printOptions.framing.framedAvailable && (
                          <span>
                            Framed:{" "}
                            <b>
                              {formatUsd(
                                calculatePrintPrice({
                                  basePriceCents: draft.priceUsdCents,
                                  sizePriceDifferenceCents:
                                    size.additionalPriceUsdCents,
                                  finishPriceDifferenceCents:
                                    draft.printOptions.framing
                                      .frameAdditionalPriceUsdCents,
                                }).unitPriceCents,
                              )}
                            </b>
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
              {errors.options && <ErrorText>{errors.options}</ErrorText>}
            </FormSection>
          )}
          {kind === "prints" && draft.category === "tshirt" && (
            <FormSection title="Available colors">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.tshirtOptions?.availableColors?.includes(
                    "black",
                  )}
                  onChange={(e) => {
                    const colors = new Set(
                      draft.tshirtOptions?.availableColors || [],
                    );
                    e.target.checked
                      ? colors.add("black")
                      : colors.delete("black");
                    update({ tshirtOptions: { availableColors: [...colors] } });
                  }}
                />
                <span
                  className="h-5 w-5 rounded-full border border-ink bg-ink"
                  aria-hidden="true"
                />
                Black
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.tshirtOptions?.availableColors?.includes(
                    "white",
                  )}
                  onChange={(e) => {
                    const colors = new Set(
                      draft.tshirtOptions?.availableColors || [],
                    );
                    e.target.checked
                      ? colors.add("white")
                      : colors.delete("white");
                    update({ tshirtOptions: { availableColors: [...colors] } });
                  }}
                />
                <span
                  className="h-5 w-5 rounded-full border border-ink/30 bg-white"
                  aria-hidden="true"
                />
                White
              </label>
              {errors.options && <ErrorText>{errors.options}</ErrorText>}
            </FormSection>
          )}
          {kind === "prints" && draft.category === "mug" && (
            <div className="border border-ink/10 bg-paper p-5">
              <strong>Color: White</strong>
              <p className="mt-1 text-sm text-ink/55">
                Mugs currently use one fixed color.
              </p>
            </div>
          )}
          {kind === "prints" && draft.category === "sticker" && (
            <FormSection title="Sticker details">
              <label>
                Format description
                <input
                  value={draft.stickerOptions?.formatDescription || ""}
                  onChange={(e) =>
                    update({
                      stickerOptions: { formatDescription: e.target.value },
                    })
                  }
                  className={field}
                />
              </label>
              <label>
                Approximate dimensions{" "}
                <span className="font-normal text-ink/45">(optional)</span>
                <input
                  value={draft.stickerOptions?.approximateDimensions || ""}
                  onChange={(e) =>
                    update({
                      stickerOptions: {
                        ...draft.stickerOptions,
                        approximateDimensions: e.target.value,
                      },
                    })
                  }
                  className={field}
                />
              </label>
            </FormSection>
          )}
          {kind === "originals" && !isMail && (
            <FormSection title="Sales channels">
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={draft.availableInTurkiye !== false}
                  onChange={(e) =>
                    update({ availableInTurkiye: e.target.checked })
                  }
                />
                Available in Türkiye Shop
                <span className="block text-xs font-normal text-ink/50">
                  Free shipping
                </span>
              </label>
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={draft.availableInternationally !== false}
                  onChange={(e) =>
                    update({ availableInternationally: e.target.checked })
                  }
                />
                Available in International Shop
                <span className="block text-xs font-normal text-ink/50">
                  Shipping quoted separately
                </span>
              </label>
            </FormSection>
          )}
          {kind === "prints" && !isMail && (
            <div className="border border-ink/10 bg-paper p-5 text-sm">
              <strong>Türkiye Shop product</strong>
              <p className="mt-1 text-ink/55">
                Local signed prints are available only through the Türkiye shop.
              </p>
            </div>
          )}
          {isMail && (
            <div className="border border-ink/10 bg-paper p-5 text-sm">
              <strong>Türkiye Shop only</strong>
              <p className="mt-1 text-ink/55">
                Mystery Mail is not available in the International shop.
              </p>
            </div>
          )}
        </div>
        <aside className="h-fit border border-ink/10 bg-paper p-5 xl:sticky xl:top-24">
          <p className="text-xs font-bold uppercase tracking-wider text-ink/45">
            Publishing
          </p>
          <label className="mt-4 block">
            Status
            <select
              value={draft.status || "draft"}
              onChange={(e) =>
                update({
                  status:
                    kind === "originals"
                      ? (e.target.value as OriginalStatus)
                      : e.target.value,
                })
              }
              className={field}
            >
              {kind === "originals" ? (
                <>
                  <option value="available">Available</option>
                  <option value="sold">Sold</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </>
              ) : isMail ? (
                <>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="sold_out">Sold out</option>
                  <option value="archived">Archived</option>
                </>
              ) : (
                <>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="sold_out">Sold out</option>
                  <option value="archived">Archived</option>
                </>
              )}
            </select>
            {isMail && (
              <span className="mt-2 block text-xs leading-relaxed text-ink/50">
                {
                  {
                    draft:
                      "Private work in progress. Visitors cannot see this edition.",
                    published:
                      "Visible and orderable while inventory and the ordering window remain valid.",
                    sold_out:
                      "Visible, but ordering is disabled because the edition sold out.",
                    archived:
                      "Kept in admin history and not used as the active public edition.",
                  }[draft.status as string]
                }
              </span>
            )}
            {!isMail && kind !== "originals" && (
              <span className="mt-2 block text-xs leading-relaxed text-ink/50">
                {
                  {
                    draft: "Visible only in admin.",
                    published: "Visible in the shop and available to order.",
                    sold_out: "Visible in the shop with ordering disabled.",
                    archived: "Hidden from the shop and kept in admin history.",
                  }[draft.status as string]
                }
              </span>
            )}
            {kind === "originals" && (
              <span className="mt-2 block text-xs leading-relaxed text-ink/50">
                {
                  {
                    available: "Visible in the shop and available to order.",
                    sold: "Visible in the shop with ordering disabled.",
                    draft: "Visible only in admin.",
                    archived: "Hidden from the shop and kept in admin history.",
                  }[draft.status as OriginalStatus]
                }
              </span>
            )}
          </label>
          <label className="mt-4 flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={Boolean(draft.featured)}
              onChange={(e) => update({ featured: e.target.checked })}
            />
            Featured
          </label>
          <div className="mt-6 grid gap-2">
            <button
              type="button"
              onClick={() => persist(false)}
              disabled={saving || (!isNew && !dirty)}
              className="button-secondary gap-2"
            >
              <Save size={16} />
              {saving
                ? kind === "originals"
                  ? "Updating…"
                  : "Saving…"
                : kind === "originals"
                  ? "Update original"
                  : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => persist(isNew)}
              disabled={saving}
              className="button-primary"
            >
              {saving
                ? "Saving…"
                : existing
                  ? "Update product"
                  : "Publish product"}
            </button>
            <a
              href={
                isMail
                  ? "/shop/turkiye/mystery-mail"
                  : kind === "prints"
                    ? "/shop/turkiye/prints"
                    : "/shop/turkiye/originals"
              }
              className="button-secondary text-center"
            >
              Preview
            </a>
            <button
              onClick={() => navigate(`/admin/${kind}`)}
              className="min-h-11 text-sm font-semibold underline"
            >
              Cancel
            </button>
            {!isNew && (
              <button
                type="button"
                onClick={() => {
                  productRepository.update(kind, id, { status: "archived" });
                  navigate(`/admin/${kind}`);
                }}
                className="min-h-11 text-sm font-semibold text-coral underline"
              >
                Archive product
              </button>
            )}
          </div>
          {errors.save && <ErrorText>{errors.save}</ErrorText>}
          <p aria-live="polite" className="mt-4 text-xs text-ink/50">
            {saving
              ? "Saving…"
              : dirty
                ? "Unsaved changes"
                : savedAt
                  ? `${isNew ? "Product created successfully." : "Product updated successfully."} Saved ${new Date(savedAt).toLocaleTimeString()}`
                  : "Not saved yet"}
          </p>
        </aside>
      </div>
    </AdminLayout>
  );
}
function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-ink/10 pb-7">
      <h2 className="mb-5 text-lg font-bold">{title}</h2>
      <div className="grid gap-5 md:grid-cols-2 [&>label]:text-sm [&>label]:font-semibold">
        {children}
      </div>
    </section>
  );
}
function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <span role="alert" className="mt-1 block text-xs font-semibold text-coral">
      {children}
    </span>
  );
}
function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center border border-ink/15 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
