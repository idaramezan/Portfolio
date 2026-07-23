import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Boxes,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  Gauge,
  Globe2,
  Images,
  Instagram,
  Menu,
  MessageCircle,
  PackageOpen,
  PanelsTopLeft,
  Settings,
  ShoppingBag,
  X,
} from "lucide-react";

const groups = [
  ["Overview", [["/admin", "Dashboard", Gauge]]],
  [
    "Catalog",
    [
      ["/admin/originals", "Originals", PanelsTopLeft],
      ["/admin/prints", "Prints & Goods", Images],
      ["/admin/mystery-mail", "Mystery Mail", PackageOpen],
      ["/admin/media", "Media Library", Images],
    ],
  ],
  ["International", [["/admin/settings/fourthwall", "Fourthwall", Globe2]]],
  ["Store management", [["/admin/inventory", "Inventory", Boxes]]],
  ["Links", [["/admin/settings/links", "Link Hub & Social", Instagram]]],
  [
    "Settings",
    [
      ["/admin/settings/whatsapp", "WhatsApp", MessageCircle],
      ["/admin/settings/currency", "Currency", CircleDollarSign],
      ["/admin/settings/site", "Site Settings", Settings],
    ],
  ],
] as const;

export default function AdminLayout({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const sidebar = (
    <>
      <div className="flex h-16 items-center justify-between border-b border-ink/10 px-5">
        <Link href="/admin" className="font-serif text-xl font-bold">
          Aida Studio
        </Link>
        <button
          className="lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close admin navigation"
        >
          <X />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-3" aria-label="Admin navigation">
        {groups.map(([label, items]) => (
          <div key={label} className="mb-5">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[.2em] text-ink/45">
              {label}
            </p>
            {items.map(([href, text, Icon]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex min-h-11 items-center gap-3 px-3 text-sm font-semibold ${location === href || (href !== "/admin" && location.startsWith(`${href}/`)) ? "bg-coral text-paper" : "hover:bg-ink/5"}`}
              >
                <Icon size={17} />
                {text}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-ink/10 p-3">
        <a
          href="/"
          className="flex min-h-11 items-center gap-3 px-3 text-sm font-semibold"
        >
          <ExternalLink size={17} />
          View storefront
        </a>
      </div>
    </>
  );
  return (
    <div className="min-h-screen bg-[#f3efe6] font-sans text-ink">
      <aside className="admin-sidebar fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-ink/10 bg-paper">
        {sidebar}
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
            aria-label="Close navigation overlay"
          />
          <aside className="relative flex h-full w-[min(86vw,280px)] flex-col bg-paper shadow-2xl">
            {sidebar}
          </aside>
        </div>
      )}
      <div className="admin-content">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-ink/10 bg-paper/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="admin-menu-button min-h-11 min-w-11 items-center justify-center"
              aria-label="Open admin navigation"
            >
              <Menu className="mx-auto" />
            </button>
            <div>
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-1 text-xs text-ink/45"
              >
                <Link href="/admin">Admin</Link>
                <ChevronRight size={12} />
                <span>{title}</span>
              </nav>
              <h1 className="font-serif text-2xl font-bold md:text-3xl">
                {title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <a
              href="/"
              className="hidden min-h-10 items-center border border-ink/15 px-3 text-sm font-semibold sm:flex"
            >
              View storefront
            </a>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
