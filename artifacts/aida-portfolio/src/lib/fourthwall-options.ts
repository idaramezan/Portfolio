import type { InternationalProduct } from "@/lib/fourthwall";

export function decodeFourthwallText(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const hexadecimal = entity[1]?.toLowerCase() === "x";
      const point = Number.parseInt(
        entity.slice(hexadecimal ? 2 : 1),
        hexadecimal ? 16 : 10,
      );
      return Number.isFinite(point) ? String.fromCodePoint(point) : match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

const SIZE_PATTERN =
  /^(?:XXS|XS|S|M|L|XL|XXL|XXXL|[2-6]XL|\d{1,3}(?:\.\d+)?(?:\s*[×x]\s*\d{1,3}(?:\.\d+)?)?\s*(?:CM|IN|INCH|INCHES)?|ONE SIZE)$/i;

export function normalizeFourthwallVariant(
  productName: string,
  variant: InternationalProduct["variants"][number],
) {
  const raw = decodeFourthwallText(
    variant.name || variant.rawName || "Standard",
  ).trim();
  const title = decodeFourthwallText(productName).trim();
  let remainder = raw;
  if (
    title &&
    remainder.toLocaleLowerCase().startsWith(title.toLocaleLowerCase())
  )
    remainder = remainder.slice(title.length).replace(/^\s*[-–—:|]\s*/, "");
  const pieces = remainder
    .split(/\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  const structuredColor = variant.attributes?.color?.name?.trim();
  const structuredSize = variant.attributes?.size?.name?.trim();
  const fallbackSize =
    pieces.length > 1 && SIZE_PATTERN.test(pieces.at(-1) || "")
      ? pieces.at(-1)
      : undefined;
  const fallbackColor =
    pieces.length > 1
      ? pieces.slice(0, fallbackSize ? -1 : undefined).join(", ")
      : undefined;
  const color = structuredColor || fallbackColor || undefined;
  const size = structuredSize || fallbackSize || undefined;
  const label =
    [color, size].filter(Boolean).join(" · ") || remainder || "Standard";
  return {
    ...variant,
    color,
    size,
    label,
    swatch: variant.attributes?.color?.swatch,
  };
}
