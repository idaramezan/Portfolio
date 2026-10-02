import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  loadShopSettings,
  saveShopSettingsAndWait,
  type HomepageContent,
  type ShopSettings,
} from "@/lib/store";
import { ADMIN_PASSWORD_SESSION_KEY } from "@/pages/Admin";

const field = "mt-1 min-h-11 w-full border border-ink/20 bg-paper px-3";
export default function HomepageContentAdmin() {
  const [settings, setSettings] = useState<ShopSettings>(() =>
    loadShopSettings(),
  );
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const content = settings.homepageContent;
  const setContent = async (next: HomepageContent, persist = false) => {
    const nextSettings = { ...settings, homepageContent: next };
    setSettings(nextSettings);
    if (!persist) return;
    setSaving(true);
    setSaveMessage("");
    try {
      await saveShopSettingsAndWait(nextSettings);
      setSaveMessage("Image uploaded and homepage updated.");
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : "Homepage update failed.",
      );
      throw error;
    } finally {
      setSaving(false);
    }
  };
  const save = async () => {
    setSaving(true);
    try {
      await saveShopSettingsAndWait(settings);
      setSaveMessage("Homepage changes saved.");
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : "Homepage update failed.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <AdminLayout
      title="Homepage"
      actions={
        <button className="button-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      }
    >
      {saveMessage && (
        <p
          className="mb-5 border border-ink/15 bg-paper px-4 py-3 text-sm"
          role="status"
        >
          {saveMessage}
        </p>
      )}
      <div className="grid gap-6">
        <Editor title="Hero">
          <ImageField
            label="Hero image"
            value={content.hero.image}
            onChange={(image, persist) =>
              setContent(
                { ...content, hero: { ...content.hero, image } },
                persist,
              )
            }
          />
          <Text
            label="Eyebrow"
            value={content.hero.eyebrow}
            onChange={(eyebrow) =>
              setContent({ ...content, hero: { ...content.hero, eyebrow } })
            }
          />
          <Text
            label="Headline"
            area
            value={content.hero.headline}
            onChange={(headline) =>
              setContent({ ...content, hero: { ...content.hero, headline } })
            }
          />
          <Text
            label="Supporting text"
            area
            value={content.hero.supportingText}
            onChange={(supportingText) =>
              setContent({
                ...content,
                hero: { ...content.hero, supportingText },
              })
            }
          />
          <Text
            label="Primary CTA text"
            value={content.hero.primaryCtaText}
            onChange={(primaryCtaText) =>
              setContent({
                ...content,
                hero: { ...content.hero, primaryCtaText },
              })
            }
          />
          <Text
            label="Primary CTA URL"
            value={content.hero.primaryCtaUrl}
            onChange={(primaryCtaUrl) =>
              setContent({
                ...content,
                hero: { ...content.hero, primaryCtaUrl },
              })
            }
          />
          <Text
            label="Secondary CTA text"
            value={content.hero.secondaryCtaText}
            onChange={(secondaryCtaText) =>
              setContent({
                ...content,
                hero: { ...content.hero, secondaryCtaText },
              })
            }
          />
          <Text
            label="Secondary CTA URL"
            value={content.hero.secondaryCtaUrl}
            onChange={(secondaryCtaUrl) =>
              setContent({
                ...content,
                hero: { ...content.hero, secondaryCtaUrl },
              })
            }
          />
        </Editor>
        <Editor title="Creative paths">
          <ImageField
            label="Painting image"
            value={content.paintingPath.image}
            onChange={(image, persist) =>
              setContent(
                {
                  ...content,
                  paintingPath: { ...content.paintingPath, image },
                },
                persist,
              )
            }
          />
          <Text
            label="Painting heading"
            value={content.paintingPath.heading}
            onChange={(heading) =>
              setContent({
                ...content,
                paintingPath: { ...content.paintingPath, heading },
              })
            }
          />
          <Text
            label="Painting description"
            value={content.paintingPath.description}
            onChange={(description) =>
              setContent({
                ...content,
                paintingPath: { ...content.paintingPath, description },
              })
            }
          />
          <ImageField
            label="Moving Image poster"
            value={content.movingPath.image}
            onChange={(image, persist) =>
              setContent(
                {
                  ...content,
                  movingPath: { ...content.movingPath, image },
                },
                persist,
              )
            }
          />
          <Text
            label="Preview video URL"
            value={content.movingPath.previewVideo || ""}
            onChange={(previewVideo) =>
              setContent({
                ...content,
                movingPath: { ...content.movingPath, previewVideo },
              })
            }
          />
          <Text
            label="Moving Image heading"
            value={content.movingPath.heading}
            onChange={(heading) =>
              setContent({
                ...content,
                movingPath: { ...content.movingPath, heading },
              })
            }
          />
          <Text
            label="Moving Image description"
            value={content.movingPath.description}
            onChange={(description) =>
              setContent({
                ...content,
                movingPath: { ...content.movingPath, description },
              })
            }
          />
        </Editor>
        <Editor title="Featured content">
          <Select
            label="Featured Moving Image"
            value={content.featuredMovingProjectId || ""}
            options={[
              ["", "Automatic"],
              ...settings.movingImageProjects.map((x) => [x.id, x.title]),
            ]}
            onChange={(featuredMovingProjectId) =>
              setContent({ ...content, featuredMovingProjectId })
            }
          />
          <ImageField
            label="Moving Image cover override"
            value={content.featuredMovingCover || ""}
            onChange={(featuredMovingCover, persist) =>
              setContent({ ...content, featuredMovingCover }, persist)
            }
          />
          <Picker
            title="Featured originals · maximum 3"
            ids={content.featuredOriginalIds}
            items={settings.originalProducts.map((x) => [x.id, x.name])}
            max={3}
            onChange={(featuredOriginalIds) =>
              setContent({ ...content, featuredOriginalIds })
            }
          />
          <Picker
            title="Featured prints · maximum 4"
            ids={content.featuredPrintIds}
            items={settings.printProducts.map((x) => [x.id, x.name])}
            max={4}
            onChange={(featuredPrintIds) =>
              setContent({ ...content, featuredPrintIds })
            }
          />
        </Editor>
        <Editor title="Studio Letter">
          <ImageField
            label="Editorial image"
            value={content.studioLetter.image || ""}
            onChange={(image, persist) =>
              setContent(
                {
                  ...content,
                  studioLetter: { ...content.studioLetter, image },
                },
                persist,
              )
            }
          />
          <Text
            label="Heading"
            value={content.studioLetter.heading}
            onChange={(heading) =>
              setContent({
                ...content,
                studioLetter: { ...content.studioLetter, heading },
              })
            }
          />
          <Text
            label="Body"
            area
            value={content.studioLetter.body}
            onChange={(body) =>
              setContent({
                ...content,
                studioLetter: { ...content.studioLetter, body },
              })
            }
          />
          <Text
            label="Visible excerpt"
            area
            value={content.studioLetter.excerpt}
            onChange={(excerpt) =>
              setContent({
                ...content,
                studioLetter: { ...content.studioLetter, excerpt },
              })
            }
          />
          <Text
            label="CTA"
            value={content.studioLetter.cta}
            onChange={(cta) =>
              setContent({
                ...content,
                studioLetter: { ...content.studioLetter, cta },
              })
            }
          />
        </Editor>
        <Editor title="About preview">
          <ImageField
            label="Portrait"
            value={content.about.portrait}
            onChange={(portrait, persist) =>
              setContent(
                { ...content, about: { ...content.about, portrait } },
                persist,
              )
            }
          />
          <Text
            label="Eyebrow"
            value={content.about.eyebrow}
            onChange={(eyebrow) =>
              setContent({ ...content, about: { ...content.about, eyebrow } })
            }
          />
          <Text
            label="Headline"
            value={content.about.headline}
            onChange={(headline) =>
              setContent({ ...content, about: { ...content.about, headline } })
            }
          />
          <Text
            label="Paragraph"
            area
            value={content.about.paragraph}
            onChange={(paragraph) =>
              setContent({ ...content, about: { ...content.about, paragraph } })
            }
          />
          <Text
            label="CTA text"
            value={content.about.cta}
            onChange={(cta) =>
              setContent({ ...content, about: { ...content.about, cta } })
            }
          />
          <Text
            label="CTA URL"
            value={content.about.ctaUrl}
            onChange={(ctaUrl) =>
              setContent({ ...content, about: { ...content.about, ctaUrl } })
            }
          />
        </Editor>
      </div>
    </AdminLayout>
  );
}
function Editor({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-card">
      <h2 className="font-serif text-3xl">{title}</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}
function Text({
  label,
  value,
  onChange,
  area = false,
}: {
  label: string;
  value: string;
  onChange: (x: string) => void;
  area?: boolean;
}) {
  return (
    <label>
      {label}
      {area ? (
        <textarea
          className={field}
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={field}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[][];
  onChange: (x: string) => void;
}) {
  return (
    <label>
      {label}
      <select
        className={field}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([id, name]) => (
          <option value={id} key={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
function Picker({
  title,
  ids,
  items,
  max,
  onChange,
}: {
  title: string;
  ids: string[];
  items: string[][];
  max: number;
  onChange: (x: string[]) => void;
}) {
  return (
    <fieldset className="border border-ink/10 p-3">
      <legend className="font-semibold">{title}</legend>
      {items.map(([id, name]) => (
        <label className="mt-2 flex gap-2" key={id}>
          <input
            type="checkbox"
            checked={ids.includes(id)}
            disabled={!ids.includes(id) && ids.length >= max}
            onChange={(e) =>
              onChange(
                e.target.checked ? [...ids, id] : ids.filter((x) => x !== id),
              )
            }
          />
          {name}
        </label>
      ))}
    </fieldset>
  );
}
function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (x: string, persist?: boolean) => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <p className="font-medium">{label}</p>
      {value && (
        <img src={value} alt="" className="mt-2 h-28 w-full object-contain" />
      )}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="button-primary cursor-pointer">
          {busy ? "Uploading…" : value ? "Replace image" : "Upload image"}
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              try {
                const body = new FormData();
                body.append("image", file);
                body.append("productId", "homepage-content");
                const response = await fetch("/api/admin/product-media", {
                  method: "POST",
                  headers: {
                    "x-admin-password":
                      sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "",
                  },
                  body,
                });
                const payload = await response.json();
                if (!response.ok || !payload.imageUrl)
                  throw new Error(payload.error || "Upload failed");
                await onChange(payload.imageUrl, true);
              } catch (error) {
                window.alert(
                  error instanceof Error
                    ? error.message
                    : "Image upload failed",
                );
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {value && (
          <button
            className="button-link"
            type="button"
            disabled={busy}
            onClick={() => onChange("", true)}
          >
            Remove image
          </button>
        )}
      </div>
      <small className="mt-1 block text-ink/55">JPG, PNG or WebP.</small>
    </div>
  );
}
