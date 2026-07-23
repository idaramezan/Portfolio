import { useState } from "react";
import { useLocation } from "wouter";
import Dashboard from "@/pages/admin/Dashboard";
import Catalog from "@/pages/admin/Catalog";
import ProductEditor from "@/pages/admin/ProductEditor";
import Inventory from "@/pages/admin/Inventory";
import Media from "@/pages/admin/Media";
import SettingsPage from "@/pages/admin/Settings";

const USER = "thisisme";
const PASS = "a0019280718";
export const ADMIN_PASSWORD_SESSION_KEY = "aida-admin-password";

export default function Admin() {
  const [location] = useLocation();
  const [authenticated, setAuthenticated] = useState(
    () =>
      import.meta.env.DEV ||
      sessionStorage.getItem("aida-admin-authenticated") === "true",
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  if (!authenticated)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3efe6] p-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (username === USER && password === PASS) {
              sessionStorage.setItem("aida-admin-authenticated", "true");
              sessionStorage.setItem(ADMIN_PASSWORD_SESSION_KEY, password);
              setAuthenticated(true);
            } else setError("The username or password is incorrect.");
          }}
          className="w-full max-w-md border border-ink/10 bg-paper p-7 shadow-lg"
        >
          <p className="text-xs font-bold uppercase tracking-[.2em] text-coral">
            Protected studio management
          </p>
          <h1 className="mt-3 font-serif text-3xl">Admin sign in</h1>
          <label className="mt-6 block text-sm font-semibold">
            Username
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-2 h-11 w-full border border-ink/15 bg-paper px-3"
            />
          </label>
          <label className="mt-4 block text-sm font-semibold">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 h-11 w-full border border-ink/15 bg-paper px-3"
            />
          </label>
          {error && (
            <p role="alert" className="mt-3 text-sm font-semibold text-coral">
              {error}
            </p>
          )}
          <button className="button-primary mt-6 w-full">Sign in</button>
        </form>
      </main>
    );
  const editor = location.match(
    /^\/admin\/(originals|prints|studio-mail|mystery-mail)\/(new|[^/]+)$/,
  );
  if (editor)
    return (
      <ProductEditor
        kind={
          (editor[1] === "mystery-mail" ? "studio-mail" : editor[1]) as
            "originals" | "prints" | "studio-mail"
        }
      />
    );
  if (location === "/admin/originals") return <Catalog kind="originals" />;
  if (location === "/admin/prints") return <Catalog kind="prints" />;
  if (location === "/admin/products") return <Catalog kind="prints" />;
  if (location === "/admin/mystery-mail") return <Catalog kind="studio-mail" />;
  if (location === "/admin/studio-mail") return <Catalog kind="studio-mail" />;
  if (location === "/admin/inventory") return <Inventory />;
  if (location === "/admin/media") return <Media />;
  const setting = location.match(
    /^\/admin\/settings\/(whatsapp|currency|fourthwall|links|site)$/,
  );
  if (setting) return <SettingsPage section={setting[1] as any} />;
  return <Dashboard />;
}
