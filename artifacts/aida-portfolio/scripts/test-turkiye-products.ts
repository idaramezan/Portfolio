import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calculatePrintPrice,
  centsToUsd,
  formatPrintSize,
  getPrintStartingPrice,
  getPrintConfigurationKey,
  normalizePrintSizes,
  normalizePrintOptions,
  usdToCents,
  validatePrintOptions,
} from "../src/lib/turkiye-products.ts";
import {
  getMysteryMailCountdown,
  getMysteryMailUrgency,
} from "../src/lib/mystery-mail.ts";
import {
  isPubliclyVisible,
  isPurchasable,
  isSoldOut,
  normalizeOriginalStatus,
  normalizeProductStatus,
} from "../src/lib/product-status.ts";
import { formatCompactNumber } from "../src/lib/compact-number.ts";
import {
  ARTWORK_SURFACE_LABELS,
  formatArtworkSurface,
  normalizeArtworkSurface,
} from "../src/lib/artwork-surface.ts";

assert.equal(normalizeArtworkSurface("paper"), "paper");
assert.equal(normalizeArtworkSurface("canvas"), "canvas");
assert.equal(normalizeArtworkSurface(undefined), "paper");
assert.equal(normalizeArtworkSurface("wood"), "paper");
assert.equal(formatArtworkSurface("paper"), "Oil pastel on paper");
assert.equal(formatArtworkSurface("canvas"), "Oil pastel on canvas");
assert.deepEqual(Object.keys(ARTWORK_SURFACE_LABELS), ["paper", "canvas"]);

const options = {
  sizes: [
    {
      id: "a5",
      label: "A5",
      additionalPriceUsdCents: 0,
      available: true,
      isBaseSize: true,
      displayOrder: 1,
    },
    {
      id: "a4",
      label: "A4",
      additionalPriceUsdCents: 1000,
      available: true,
      isBaseSize: false,
      displayOrder: 2,
    },
  ],
  framing: {
    unframedAvailable: true,
    framedAvailable: true,
    frameAdditionalPriceUsdCents: 2000,
  },
};

assert.equal(
  calculatePrintPrice({
    basePriceCents: 2500,
    sizePriceDifferenceCents: 0,
    finishPriceDifferenceCents: 0,
  }).unitPriceCents,
  2500,
);
assert.equal(getPrintConfigurationKey("a4", "framed"), "a4:framed");
assert.notEqual(
  getPrintConfigurationKey("a4", "framed"),
  getPrintConfigurationKey("a3", "framed"),
);
assert.notEqual(
  getPrintConfigurationKey("a4", "framed"),
  getPrintConfigurationKey("a4", "unframed"),
);
assert.equal(
  calculatePrintPrice({
    basePriceCents: 2500,
    sizePriceDifferenceCents: 1000,
    finishPriceDifferenceCents: 0,
  }).unitPriceCents,
  3500,
);
assert.equal(
  calculatePrintPrice({
    basePriceCents: 2500,
    sizePriceDifferenceCents: 1000,
    finishPriceDifferenceCents: 2000,
  }).unitPriceCents,
  5500,
);
assert.equal(getPrintStartingPrice(2500, options), 2500);

for (const [input, expectedUnit, expectedTotal] of [
  [
    {
      basePriceCents: 1000,
      sizePriceDifferenceCents: 0,
      finishPriceDifferenceCents: 0,
      quantity: 1,
    },
    1000,
    1000,
  ],
  [
    {
      basePriceCents: 1000,
      sizePriceDifferenceCents: 200,
      finishPriceDifferenceCents: 0,
      quantity: 1,
    },
    1200,
    1200,
  ],
  [
    {
      basePriceCents: 1000,
      sizePriceDifferenceCents: 0,
      finishPriceDifferenceCents: 500,
      quantity: 1,
    },
    1500,
    1500,
  ],
  [
    {
      basePriceCents: 1000,
      sizePriceDifferenceCents: 200,
      finishPriceDifferenceCents: 500,
      quantity: 1,
    },
    1700,
    1700,
  ],
  [
    {
      basePriceCents: 1000,
      sizePriceDifferenceCents: 200,
      finishPriceDifferenceCents: 500,
      quantity: 2,
    },
    1700,
    3400,
  ],
] as const) {
  const result = calculatePrintPrice(input);
  assert.equal(result.unitPriceCents, expectedUnit);
  assert.equal(result.lineTotalCents, expectedTotal);
}
assert.equal(
  calculatePrintPrice({
    basePriceCents: 1000,
    sizePriceDifferenceCents: 200,
    finishPriceDifferenceCents: 500,
    quantity: 3,
  }).unitPriceCents,
  1700,
);
assert.throws(() =>
  calculatePrintPrice({
    basePriceCents: 1000,
    sizePriceDifferenceCents: -1,
    finishPriceDifferenceCents: 0,
  }),
);
assert.equal(usdToCents("25.00"), 2500);
assert.equal(usdToCents("10.99"), 1099);
assert.equal(centsToUsd(2500), "25.00");
assert.deepEqual(
  normalizePrintSizes([
    { ...options.sizes[0], available: false, isBaseSize: true },
    { ...options.sizes[1], isBaseSize: false },
  ]).map((size) => ({
    id: size.id,
    base: size.isBaseSize,
    difference: size.additionalPriceUsdCents,
  })),
  [
    { id: "a5", base: false, difference: 0 },
    { id: "a4", base: true, difference: 0 },
  ],
);
assert.deepEqual(validatePrintOptions(options), []);
assert.ok(
  validatePrintOptions({
    ...options,
    sizes: options.sizes.map((size) => ({ ...size, isBaseSize: false })),
  }).length > 0,
);

const threeSizeOptions = {
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
    {
      id: "a4",
      label: "A4",
      widthCm: 21,
      heightCm: 29.7,
      additionalPriceUsdCents: 1000,
      available: true,
      isBaseSize: false,
      displayOrder: 2,
    },
    {
      id: "a3",
      label: "A3",
      widthCm: 29.7,
      heightCm: 42,
      additionalPriceUsdCents: 2500,
      available: true,
      isBaseSize: false,
      displayOrder: 3,
    },
  ],
  framing: {
    unframedAvailable: true,
    framedAvailable: true,
    frameAdditionalPriceUsdCents: 2000,
  },
};
assert.equal(threeSizeOptions.sizes.filter((size) => size.available).length, 3);
const normalizedThreeSizes = normalizePrintOptions(threeSizeOptions);
assert.deepEqual(
  normalizedThreeSizes.sizes.map((size) => [
    size.id,
    size.displayOrder,
    size.available,
    size.isBaseSize,
    size.additionalPriceUsdCents,
  ]),
  [
    ["13x18", 1, true, true, 0],
    ["a4", 2, true, false, 1000],
    ["a3", 3, true, false, 2500],
  ],
);
assert.deepEqual(
  threeSizeOptions.sizes.flatMap((size) => [
    calculatePrintPrice({
      basePriceCents: 4500,
      sizePriceDifferenceCents: size.additionalPriceUsdCents,
      finishPriceDifferenceCents: 0,
    }).unitPriceCents,
    calculatePrintPrice({
      basePriceCents: 4500,
      sizePriceDifferenceCents: size.additionalPriceUsdCents,
      finishPriceDifferenceCents: 2000,
    }).unitPriceCents,
  ]),
  [4500, 6500, 5500, 7500, 7000, 9000],
);
assert.deepEqual(formatPrintSize(threeSizeOptions.sizes[0]), {
  primary: "13 × 18 cm",
  secondary: "5.1 × 7.1 in",
  mismatch: false,
});
assert.equal(
  formatPrintSize({
    ...threeSizeOptions.sizes[0],
    label: "8 × 10 in",
    widthIn: 8,
    heightIn: 10,
  }).mismatch,
  true,
);
assert.equal(
  formatPrintSize({ ...threeSizeOptions.sizes[0], label: "8 × 10 in" })
    .mismatch,
  true,
);

const modalSource = readFileSync(
  new URL("../src/components/TurkeyProductDialog.tsx", import.meta.url),
  "utf8",
);
assert.ok(modalSource.includes("availableSizes.map"));
assert.ok(modalSource.includes("Choose a size"));
assert.ok(modalSource.includes("Choose a finish"));
assert.ok(modalSource.includes('aria-modal="true"'));
assert.ok(modalSource.includes('aria-live="polite"'));
assert.ok(modalSource.includes("getPrintConfigurationKey"));
assert.ok(modalSource.includes("createPortal"));
assert.ok(modalSource.includes('className="print-modal__media"'));
assert.ok(modalSource.includes('className="print-modal__content"'));
assert.equal(
  modalSource.match(/aria-label="Close product options"/g)?.length,
  1,
);
assert.ok(!modalSource.includes("desktopCloseRef"));
const sizeOptionMarkup = modalSource.slice(
  modalSource.indexOf("availableSizes.map"),
  modalSource.indexOf("</fieldset>", modalSource.indexOf("availableSizes.map")),
);
const finishOptionMarkup = modalSource.slice(
  modalSource.indexOf("framingOptions.map"),
  modalSource.indexOf("</fieldset>", modalSource.indexOf("framingOptions.map")),
);
assert.ok(!sizeOptionMarkup.includes("<Money"));
assert.ok(!finishOptionMarkup.includes("<Money"));
assert.ok(modalSource.includes("calculatedLineTotalUsdCents"));

const pricingBasketSource = readFileSync(
  new URL("../src/pages/Basket.tsx", import.meta.url),
  "utf8",
);
const pricingStoreSource = readFileSync(
  new URL("../src/lib/store.ts", import.meta.url),
  "utf8",
);
const pricingRegionalShopSource = readFileSync(
  new URL("../src/components/RegionalShop.tsx", import.meta.url),
  "utf8",
);
assert.ok(pricingBasketSource.includes("getCanonicalCartItemPricing"));
assert.ok(pricingBasketSource.includes("Unit price:"));
assert.ok(pricingBasketSource.includes("Line total:"));
assert.ok(pricingStoreSource.includes("PRINT_PRICING_BACKUP_KEY"));
assert.ok(pricingStoreSource.includes("writeSettingsStorage"));
assert.ok(pricingStoreSource.includes("clearObsoleteMigrationStorage"));
assert.ok(pricingStoreSource.includes("QuotaExceededError"));
assert.ok(pricingRegionalShopSource.includes("getPrintStartingPrice"));

const siteStyles = readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8",
);
assert.ok(siteStyles.includes(".print-modal-overlay"));
assert.ok(siteStyles.includes(".print-modal__content"));
assert.ok(siteStyles.includes("@media (min-width: 900px)"));
assert.ok(
  siteStyles.includes(
    "grid-template-columns: minmax(0, 0.46fr) minmax(420px, 0.54fr)",
  ),
);
assert.ok(siteStyles.includes("object-fit: contain"));

const managedCardSource = readFileSync(
  new URL("../src/components/ManagedProductCard.tsx", import.meta.url),
  "utf8",
);
assert.ok(managedCardSource.includes('"Add to basket"'));
assert.ok(managedCardSource.includes('"Choose options"'));
assert.ok(managedCardSource.includes('"View painting"'));
assert.ok(managedCardSource.includes("disabled={!purchasable ||"));
assert.ok(managedCardSource.includes("convertUsdCentsToTry"));
assert.ok(managedCardSource.includes('canonicalCurrency: original ? "USD" : "TRY"'));
assert.ok(managedCardSource.includes("original ? 1 : product.maxPerUser"));
assert.ok(siteStyles.includes(".managed-product-card__media--artwork"));
assert.ok(siteStyles.includes("aspect-ratio: 4 / 5"));

assert.equal(formatCompactNumber(224800), "224.8K");
assert.equal(formatCompactNumber(68700), "68.7K");
assert.equal(formatCompactNumber(3817), "3.8K");
assert.equal(formatCompactNumber(160), "160");

const liveSectionSource = readFileSync(
  new URL("../src/components/TikTokLiveSection.tsx", import.meta.url),
  "utf8",
);
const liveConfigSource = readFileSync(
  new URL("../src/config/tiktok-live.ts", import.meta.url),
  "utf8",
);
assert.ok(liveSectionSource.includes("if (!enabled) return null"));
assert.ok(liveSectionSource.includes('target="_blank"'));
assert.ok(liveSectionSource.includes('rel="noopener noreferrer"'));
assert.ok(liveSectionSource.includes("LiveSocialProof"));
assert.ok(!liveSectionSource.includes("<figcaption"));
assert.ok(liveConfigSource.includes("Painted live. Watched by thousands."));
assert.equal((liveConfigSource.match(/collageStyleKey:/g) || []).length, 6);
assert.ok(liveConfigSource.includes("comments: 3817"));
assert.ok(liveConfigSource.includes("displayOrder: 5"));
assert.ok(!liveConfigSource.includes("plateSmall"));
assert.ok(siteStyles.includes(".home-live-section__layout"));
assert.ok(siteStyles.includes("scroll-snap-type: x proximity"));
assert.ok(siteStyles.includes("@media (prefers-reduced-motion: reduce)"));

const editorSource = readFileSync(
  new URL("../src/pages/admin/ProductEditor.tsx", import.meta.url),
  "utf8",
);
assert.ok(editorSource.includes("Starting price in TRY"));
assert.ok(editorSource.includes("Base size"));
assert.ok(editorSource.includes("Size price difference in TRY"));
assert.ok(editorSource.includes("Frame price difference in TRY"));
assert.ok(editorSource.includes("Default finish"));
assert.ok(editorSource.includes("Customer price preview"));
assert.ok(editorSource.includes("Add another size"));
assert.ok(!editorSource.includes("USD cents"));
assert.ok(!editorSource.includes("isMail ? { coverImage"));

for (const page of [
  "MysteryMail.tsx",
  "StudioMail.tsx",
  "StudioMailDetail.tsx",
]) {
  const source = readFileSync(
    new URL(`../src/pages/${page}`, import.meta.url),
    "utf8",
  );
  assert.ok(source.includes("mysteryMailCoverImage"));
}

assert.deepEqual(getMysteryMailCountdown(90061000), {
  days: 1,
  hours: 1,
  minutes: 1,
  seconds: 1,
});
assert.deepEqual(getMysteryMailCountdown(-1000), {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
});
assert.equal(getMysteryMailUrgency(31 * 86400000).limitedWindow, false);
assert.equal(getMysteryMailUrgency(30 * 86400000).limitedWindow, true);
assert.equal(getMysteryMailUrgency(7 * 86400000).closingSoon, true);
assert.equal(getMysteryMailUrgency(48 * 3600000).critical, true);
assert.equal(getMysteryMailUrgency(0).expired, true);

assert.equal(normalizeProductStatus("sold", true), "sold_out");
assert.equal(normalizeProductStatus("sold-out", true), "sold_out");
assert.equal(normalizeProductStatus("soldOut", true), "sold_out");
assert.equal(normalizeProductStatus("active", false), "published");
assert.equal(normalizeProductStatus("hidden", true), "archived");
for (const status of ["available", "sold", "draft", "archived"] as const) {
  assert.equal(normalizeOriginalStatus(status, status === "available"), status);
}
assert.equal(normalizeOriginalStatus("published", true), "available");
assert.equal(normalizeOriginalStatus("sold_out", true), "sold");

const productRepositorySource = readFileSync(
  new URL("../src/lib/productRepository.ts", import.meta.url),
  "utf8",
);
assert.ok(productRepositorySource.includes("normalizeOriginalStatus"));
assert.ok(productRepositorySource.includes("...existing"));
assert.ok(productRepositorySource.includes("...changes"));

const productEditorSource = readFileSync(
  new URL("../src/pages/admin/ProductEditor.tsx", import.meta.url),
  "utf8",
);
for (const status of ["available", "sold", "draft", "archived"]) {
  assert.ok(productEditorSource.includes(`<option value="${status}">`));
}
assert.ok(productEditorSource.includes("setDraft(structuredClone(saved))"));
assert.equal(isPubliclyVisible({ status: "published" }), true);
assert.equal(isPubliclyVisible({ status: "sold_out" }), true);
assert.equal(isPubliclyVisible({ status: "draft" }), false);
assert.equal(isPubliclyVisible({ status: "archived" }), false);
assert.equal(isPurchasable({ status: "published", inventory: 2 }), true);
assert.equal(isPurchasable({ status: "sold_out", inventory: 2 }), false);
assert.equal(isPurchasable({ status: "published", inventory: 0 }), false);
assert.equal(isSoldOut({ status: "published", inventory: 0 }), true);

assert.ok(editorSource.includes("persist(isNew)"));
assert.ok(editorSource.includes("setDraft(structuredClone(saved))"));
assert.ok(editorSource.includes("await uploadImage(pendingImage)"));
assert.ok(!editorSource.includes("new FileReader"));

const regionalShopSource = readFileSync(
  new URL("../src/components/RegionalShop.tsx", import.meta.url),
  "utf8",
);
assert.ok(regionalShopSource.includes("isPubliclyVisible(product)"));
assert.ok(regionalShopSource.includes("SOLD OUT"));
assert.ok(regionalShopSource.includes("opacity-65 grayscale-[.65]"));

const basketSource = readFileSync(
  new URL("../src/pages/Basket.tsx", import.meta.url),
  "utf8",
);
assert.ok(basketSource.includes("isCartItemAvailable"));
assert.ok(basketSource.includes("This item is no longer available"));

const mysteryPageSource = readFileSync(
  new URL("../src/pages/MysteryMail.tsx", import.meta.url),
  "utf8",
);
assert.ok(mysteryPageSource.includes("CompactCountdown"));
assert.ok(mysteryPageSource.includes('"@type": "WebPage"'));
assert.ok(mysteryPageSource.includes("const data = betweenEditions"));
const storeSource = readFileSync(
  new URL("../src/lib/store.ts", import.meta.url),
  "utf8",
);
assert.ok(storeSource.includes("Something new is taking shape."));
assert.ok(storeSource.includes('storefrontMode: "active-edition"'));
assert.ok(basketSource.includes("sizeSecondaryLabel"));
assert.ok(basketSource.includes('basketCurrency = region === "TR" ? "TRY" : "USD"'));
const shellSource = readFileSync(new URL("../src/components/layout/Shell.tsx", import.meta.url), "utf8");
assert.ok(!shellSource.includes("currency-select"));
const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
assert.ok(appSource.includes('/shop/turkiye/originals/:slug'));
assert.ok(appSource.includes('/shop/international/originals/:slug'));

console.log("Türkiye product pricing and validation tests passed.");
