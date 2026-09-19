import { Link } from "wouter";
import { ImagePlus, MoreHorizontal } from "lucide-react";
import { formatCurrencyMinor } from "@/lib/currency";
import type { ReadyMadePalette, ShopSettings } from "@/lib/store";

export default function ReadyPaletteAdmin({ settings, onChange }: { settings: ShopSettings; onChange: (settings: ShopSettings) => void }) {
  const updateStatus = (id: string, status: ReadyMadePalette["status"]) => onChange({ ...settings, readyMadePalettes: settings.readyMadePalettes.map((palette) => palette.id === id ? { ...palette, status, stock: status === "sold" ? 0 : Math.max(1, palette.stock) } : palette) });
  return <section className="admin-card overflow-hidden p-0">
    <div className="flex flex-col gap-4 border-b border-ink/10 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">Türkiye catalog</p><h2 className="mt-1 font-serif text-3xl">Ready-made Palettes</h2><p className="mt-1 text-sm text-ink/60">One-off palettes, ready to ship. Türkiye delivery is 50 TL and free from 1,500 TL.</p></div>
      <Link href="/admin/palettes/new" className="button-primary inline-flex min-h-11 items-center justify-center px-5">Add palette</Link>
    </div>
    {!settings.readyMadePalettes.length ? <div className="grid justify-items-center gap-3 px-6 py-16 text-center"><span className="grid h-16 w-16 place-items-center bg-ink/5 text-ink/35"><ImagePlus /></span><h3 className="font-serif text-2xl">No ready-made palettes yet</h3><p className="max-w-md text-sm text-ink/60">Add the name, colors, price and one strong photograph to publish the first palette.</p><Link href="/admin/palettes/new" className="mt-2 font-semibold text-coral underline underline-offset-4">Add the first palette</Link></div> : <div className="divide-y divide-ink/10">{settings.readyMadePalettes.map((palette) => <article key={palette.id} className="grid gap-4 p-4 sm:grid-cols-[96px_1fr_auto] sm:items-center sm:p-5">
      <div className="h-24 w-24 overflow-hidden bg-ink/5">{palette.imageUrl ? <img src={palette.imageUrl} alt="" className="h-full w-full object-cover"/> : <span className="grid h-full place-items-center text-ink/30"><ImagePlus /></span>}</div>
      <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-serif text-xl font-bold">{palette.name}</h3><span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${palette.status === "available" ? "bg-mint/60 text-ink" : palette.status === "sold" ? "bg-coral/15 text-coral" : "bg-ink/5 text-ink/55"}`}>{palette.status}</span></div><p className="mt-1 text-sm text-ink/60">{palette.colors || "Colors not added"}</p><p className="mt-2 text-sm font-bold">{formatCurrencyMinor(palette.priceMinor, "TRY")}</p></div>
      <div className="flex flex-wrap items-center gap-2"><Link href={`/admin/palettes/${palette.id}`} className="inline-flex min-h-10 items-center border border-ink/15 px-4 text-sm font-semibold">Edit</Link>{palette.status !== "sold" && <button className="min-h-10 px-3 text-sm font-semibold text-coral" onClick={() => updateStatus(palette.id, "sold")}>Mark sold</button>}<details className="relative"><summary className="grid h-10 w-10 cursor-pointer list-none place-items-center" aria-label="More palette actions"><MoreHorizontal /></summary><div className="absolute right-0 z-10 mt-1 min-w-32 border border-ink/10 bg-paper p-1 shadow-lg">{palette.status === "sold" && <button className="block w-full px-3 py-2 text-left text-sm" onClick={() => updateStatus(palette.id, "available")}>Make available</button>}<button className="block w-full px-3 py-2 text-left text-sm" onClick={() => updateStatus(palette.id, "archived")}>Archive</button></div></details></div>
    </article>)}</div>}
  </section>;
}
