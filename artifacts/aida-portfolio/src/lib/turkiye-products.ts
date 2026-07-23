export type TurkeyProductCategory = "tshirt" | "mug" | "print" | "sticker";
export type PrintFraming = "framed" | "unframed";
export type TshirtColor = "black" | "white";

export interface PrintSizeOption {
  id: string;
  label: string;
  widthCm?: number;
  heightCm?: number;
  widthIn?: number;
  heightIn?: number;
  additionalPriceUsdCents: number;
  /** @deprecated Read only during legacy migration. */
  priceDifferenceUsdCents?: number;
  available: boolean;
  isBaseSize: boolean;
  displayOrder: number;
}

export interface PrintProductOptions {
  sizes: PrintSizeOption[];
  framing: {
    unframedAvailable: boolean;
    framedAvailable: boolean;
    defaultFinish?: PrintFraming;
    frameAdditionalPriceUsdCents: number;
    /** @deprecated Read only during legacy migration. */
    framePriceDifferenceUsdCents?: number;
  };
}

export function usdToCents(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round((amount + Number.EPSILON) * 100);
}

export function centsToUsd(value: number) {
  return (Math.max(0, Math.trunc(value || 0)) / 100).toFixed(2);
}

export function normalizePrintSizes(sizes: PrintSizeOption[]) {
  const ordered = [...sizes].map((size, index) => {
    const { priceDifferenceUsdCents, ...canonical } = size;
    return {
      ...canonical,
      id:
        size.id ||
        `size-${
          size.label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") || index + 1
        }`,
      displayOrder: index + 1,
      isBaseSize: false,
      additionalPriceUsdCents: Math.max(
        0,
        Math.trunc(
          size.additionalPriceUsdCents ?? priceDifferenceUsdCents ?? 0,
        ),
      ),
    };
  });
  const startingIndex = ordered.findIndex((size) => size.available);
  if (startingIndex >= 0) {
    ordered[startingIndex].isBaseSize = true;
    ordered[startingIndex].additionalPriceUsdCents = 0;
  }
  return ordered;
}

export function normalizePrintOptions(options: PrintProductOptions) {
  const { framePriceDifferenceUsdCents, ...framing } = options.framing;
  return {
    sizes: normalizePrintSizes(
      [...(options.sizes || [])].sort(
        (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0),
      ),
    ),
    framing: {
      ...framing,
      defaultFinish:
        options.framing.defaultFinish === "framed" &&
        options.framing.framedAvailable
          ? "framed"
          : options.framing.unframedAvailable
            ? "unframed"
            : "framed",
      frameAdditionalPriceUsdCents: Math.max(
        0,
        Math.trunc(
          options.framing.frameAdditionalPriceUsdCents ??
            framePriceDifferenceUsdCents ??
            0,
        ),
      ),
    },
  };
}

const cleanMeasurement = (value: number) =>
  Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace(/\.0$/, "");

export function formatPrintSize(size: PrintSizeOption) {
  const hasCm = Number.isFinite(size.widthCm) && Number.isFinite(size.heightCm);
  const explicitInches =
    Number.isFinite(size.widthIn) && Number.isFinite(size.heightIn);
  const labelledInches = size.label.match(
    /([\d.]+)\s*[×x]\s*([\d.]+)\s*(?:in|inch|inches)\b/i,
  );
  const comparisonWidthIn = explicitInches
    ? size.widthIn!
    : labelledInches
      ? Number(labelledInches[1])
      : undefined;
  const comparisonHeightIn = explicitInches
    ? size.heightIn!
    : labelledInches
      ? Number(labelledInches[2])
      : undefined;
  const mismatch = Boolean(
    hasCm &&
    Number.isFinite(comparisonWidthIn) &&
    Number.isFinite(comparisonHeightIn) &&
    (Math.abs(size.widthCm! / 2.54 - comparisonWidthIn!) > 0.11 ||
      Math.abs(size.heightCm! / 2.54 - comparisonHeightIn!) > 0.11),
  );
  const measurementOnly =
    /^\s*[\d.]+\s*[×x]\s*[\d.]+\s*(cm|in|inch|inches)?\s*$/i.test(size.label);
  const name = measurementOnly ? "" : size.label.trim();
  const cm = hasCm
    ? `${cleanMeasurement(size.widthCm!)} × ${cleanMeasurement(size.heightCm!)} cm`
    : "";
  const widthIn = hasCm ? size.widthCm! / 2.54 : size.widthIn;
  const heightIn = hasCm ? size.heightCm! / 2.54 : size.heightIn;
  const inches =
    Number.isFinite(widthIn) && Number.isFinite(heightIn)
      ? `${cleanMeasurement(widthIn!)} × ${cleanMeasurement(heightIn!)} in`
      : "";
  return {
    primary: [name, cm].filter(Boolean).join(" · ") || size.label,
    secondary: hasCm || name ? inches : "",
    mismatch,
  };
}

export function getPrintConfigurationKey(
  sizeId: string,
  framing: PrintFraming,
) {
  return `${sizeId}:${framing}`;
}

export interface CalculatePrintPriceInput {
  basePriceCents: number;
  sizePriceDifferenceCents: number;
  finishPriceDifferenceCents: number;
  quantity?: number;
}

export function calculatePrintPrice({
  basePriceCents,
  sizePriceDifferenceCents,
  finishPriceDifferenceCents,
  quantity = 1,
}: CalculatePrintPriceInput) {
  const values = [
    basePriceCents,
    sizePriceDifferenceCents,
    finishPriceDifferenceCents,
    quantity,
  ];
  if (values.some((value) => !Number.isInteger(value)))
    throw new TypeError("Print pricing values must be integer cents.");
  if (
    basePriceCents < 0 ||
    sizePriceDifferenceCents < 0 ||
    finishPriceDifferenceCents < 0
  )
    throw new RangeError("Print prices and differences cannot be negative.");
  if (quantity < 1)
    throw new RangeError("Print quantity must be at least one.");

  const unitPriceCents =
    basePriceCents + sizePriceDifferenceCents + finishPriceDifferenceCents;
  return {
    unitPriceCents,
    lineTotalCents: unitPriceCents * quantity,
  };
}

export function getFinishPriceDifference(
  options: PrintProductOptions,
  finish: PrintFraming,
) {
  return finish === "framed" ? options.framing.frameAdditionalPriceUsdCents : 0;
}

export function validatePrintOptions(options?: PrintProductOptions) {
  const errors: string[] = [];
  if (!options?.sizes.length) return ["Add at least one available print size."];
  if (!options.sizes.some((size) => size.available))
    errors.push("Add at least one available print size.");
  const bases = options.sizes.filter(
    (size) => size.available && size.isBaseSize,
  );
  if (bases.length !== 1) errors.push("Choose one starting size.");
  if (bases[0] && bases[0].additionalPriceUsdCents !== 0)
    errors.push("The starting size must have no additional price.");
  if (
    options.sizes.some(
      (size) =>
        !Number.isInteger(size.additionalPriceUsdCents) ||
        size.additionalPriceUsdCents < 0,
    )
  )
    errors.push("Price differences must be zero or greater in whole cents.");
  const labels = options.sizes.map((size) => size.label.trim().toLowerCase());
  if (new Set(labels).size !== labels.length)
    errors.push("Duplicate size labels are not allowed.");
  if (!options.framing.unframedAvailable && !options.framing.framedAvailable)
    errors.push("Choose whether this print is sold framed, unframed or both.");
  const defaultFinish =
    options.framing.defaultFinish ||
    (options.framing.unframedAvailable ? "unframed" : "framed");
  if (
    (defaultFinish === "unframed" && !options.framing.unframedAvailable) ||
    (defaultFinish === "framed" && !options.framing.framedAvailable)
  )
    errors.push("Choose one available default finish.");
  if (
    !Number.isInteger(options.framing.frameAdditionalPriceUsdCents) ||
    options.framing.frameAdditionalPriceUsdCents < 0
  )
    errors.push(
      "Finish price differences must be zero or greater in whole cents.",
    );
  return errors;
}

export function getPrintStartingPrice(
  basePriceUsdCents: number,
  options?: PrintProductOptions,
) {
  if (!options) return basePriceUsdCents;
  const sizeDifference = Math.min(
    ...options.sizes
      .filter((size) => size.available)
      .map((size) => size.additionalPriceUsdCents),
  );
  const finishDifferences = [
    ...(options.framing.unframedAvailable ? [0] : []),
    ...(options.framing.framedAvailable
      ? [options.framing.frameAdditionalPriceUsdCents]
      : []),
  ];
  const finishDifference = Math.min(...finishDifferences);
  return calculatePrintPrice({
    basePriceCents: basePriceUsdCents,
    sizePriceDifferenceCents: Number.isFinite(sizeDifference)
      ? sizeDifference
      : 0,
    finishPriceDifferenceCents: Number.isFinite(finishDifference)
      ? finishDifference
      : 0,
  }).unitPriceCents;
}
