import type { HomepagePage, HomepageSourceSettings } from "@/lib/store";

export const HOMEPAGE_PAGES: ReadonlyArray<{
  value: HomepagePage;
  label: string;
  canonicalPath: string;
}> = [
  { value: "paintings", label: "Paintings", canonicalPath: "/paintings" },
  { value: "originals", label: "Originals", canonicalPath: "/paintings" },
  { value: "prints", label: "Prints", canonicalPath: "/shop?category=prints" },
  { value: "moving-image", label: "Moving Image", canonicalPath: "/animation" },
];

export function isHomepagePage(value: unknown): value is HomepagePage {
  return HOMEPAGE_PAGES.some((page) => page.value === value);
}

export function resolveHomepagePage(
  source: Partial<HomepageSourceSettings> | null | undefined,
  now = Date.now(),
): HomepagePage | null {
  if (source?.mode !== "page" || !isHomepagePage(source.page)) return null;
  if (!source.scheduleEnabled) return source.page;
  const start = source.startAt ? Date.parse(source.startAt) : Number.NaN;
  const end = source.endAt ? Date.parse(source.endAt) : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(start) || (source.endAt && !Number.isFinite(end)) || end <= start)
    return null;
  return now >= start && now < end ? source.page : null;
}

export function homepagePageLabel(page: HomepagePage | null) {
  return HOMEPAGE_PAGES.find((item) => item.value === page)?.label || "Default homepage";
}
