import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const home = readFileSync(
  new URL("../artifacts/aida-portfolio/src/pages/Home.tsx", import.meta.url),
  "utf8",
);
const streams = readFileSync(
  new URL(
    "../artifacts/aida-portfolio/src/components/TikTokLiveSection.tsx",
    import.meta.url,
  ),
  "utf8",
);

assert.ok(home.includes("const HOME_COPY"));
assert.ok(home.includes("const text = HOME_COPY[locale]"));
for (const translation of [
  "Aida’nın atölyesinden",
  "Ne arıyorsunuz?",
  "Orijinal Eserler",
  "Baskılar ve Çıkartmalar",
  "Atölyeden en yeniler",
  "Mevcut tüm çalışmaları gör",
  "Aida ile tanış",
  "Orijinal yağlı pastel",
  "Türkiye içinde ücretsiz teslimat",
]) {
  assert.ok(
    home.includes(translation),
    `homepage must include Turkish copy: ${translation}`,
  );
}
assert.ok(home.includes("usePageMeta(text.seoTitle, text.seoDescription)"));
assert.ok(streams.includes('locale === "tr" ? "CANLI RESİM"'));

console.log("Homepage localization verification passed.");
