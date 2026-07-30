import { readFileSync } from "node:fs";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("artifacts/aida-portfolio/src/pages/Newsletter.tsx");
const app = read("artifacts/aida-portfolio/src/App.tsx");
const shell = read("artifacts/aida-portfolio/src/components/layout/Shell.tsx");
const signup = read(
  "artifacts/aida-portfolio/src/components/StudioLetterSignup.tsx",
);
const server = read("artifacts/api-server/src/routes/newsletter.ts");

for (const required of [
  'path="/newsletter"',
  'path="/studio-letter"',
  'to="/newsletter"',
  "A quiet letter from my studio, sent from time to time.",
  "Atölyemden, ara sıra gelen sessiz bir mektup.",
  'variant="hero"',
  'context="studio-letter"',
]) {
  if (!`${app}\n${page}`.includes(required))
    throw new Error(`Newsletter page is missing: ${required}`);
}
if (
  !shell.includes('href: "/newsletter"') ||
  !shell.includes('href="/newsletter"')
)
  throw new Error("Newsletter is missing from public navigation or footer");
if (
  !signup.includes("featuredLetterRevisionId: featured.id") ||
  !signup.includes('"studio-letter:subscribed"')
)
  throw new Error(
    "Hero signup does not use featured delivery and shared success state",
  );
if (
  !server.includes('"studio-letter-page"') ||
  !server.includes("featuredLetterSent")
)
  throw new Error(
    "Newsletter page is not connected to existing subscriber delivery",
  );

console.log("Newsletter public page verification passed.");
