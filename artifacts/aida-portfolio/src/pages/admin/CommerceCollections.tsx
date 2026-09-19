import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useInternationalProducts } from "@/hooks/use-international";
import {
  loadShopSettings,
  saveShopSettingsAndWait,
  type ShopSettings,
} from "@/lib/store";
import ReadyPaletteAdmin from "@/pages/admin/ReadyPaletteAdmin";
import CustomPaletteAdmin from "@/pages/admin/CustomPaletteAdmin";
import MailClubAdmin from "@/pages/admin/MailClubAdmin";

export default function CommerceCollections({
  section,
}: {
  section: "palettes" | "mail-club" | "animation-merch";
}) {
  const [settings, setSettings] = useState<ShopSettings>(() =>
    loadShopSettings(),
  );
  const [saving, setSaving] = useState(false);
  const international = useInternationalProducts();
  const save = async () => {
    setSaving(true);
    try {
      await saveShopSettingsAndWait(settings);
    } finally {
      setSaving(false);
    }
  };
  const title =
    section === "palettes"
      ? "Palettes"
      : section === "mail-club"
        ? "Mail Club"
        : "Animation Merch";
  return (
    <AdminLayout
      title={title}
      actions={
        <button className="button-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      }
    >
      {section === "palettes" && (
        <div className="space-y-8">
          <CustomPaletteAdmin settings={settings} onChange={setSettings} />
          <ReadyPaletteAdmin settings={settings} onChange={setSettings} />
        </div>
      )}
      {section === "mail-club" && (
        <MailClubAdmin settings={settings} onChange={setSettings} />
      )}
      {section === "animation-merch" && (
        <section className="admin-card">
          <h2 className="font-serif text-2xl">Synced Fourthwall products</h2>
          <p className="mt-2 text-sm">
            Select products to show on the homepage. Checkout remains on
            Fourthwall.
          </p>
          {international.products.map((product) => (
            <label
              className="mt-4 flex items-center gap-4 border-t pt-4"
              key={product.id}
            >
              <input
                type="checkbox"
                checked={settings.animationMerchProductIds.includes(product.id)}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    animationMerchProductIds: e.target.checked
                      ? [...settings.animationMerchProductIds, product.id]
                      : settings.animationMerchProductIds.filter(
                          (id) => id !== product.id,
                        ),
                  })
                }
              />
              {product.primaryImage && (
                <img
                  className="h-16 w-16 object-contain"
                  src={product.primaryImage.url}
                  alt=""
                />
              )}
              <span>
                <strong>{product.name}</strong>
                <br />
                <small>
                  {product.price.formatted} ·{" "}
                  {product.available ? "Available" : "Unavailable"}
                </small>
              </span>
            </label>
          ))}
        </section>
      )}
    </AdminLayout>
  );
}
