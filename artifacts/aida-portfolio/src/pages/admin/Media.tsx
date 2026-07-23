import { useEffect, useState } from "react";
import { assetImages, portrait, studioMailImage } from "@/lib/assets";
import AdminLayout from "@/components/admin/AdminLayout";
export default function Media() {
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "uploading" | "saved" | "error">(
    "idle",
  );
  const password =
    sessionStorage.getItem("aida-admin-password") ||
    import.meta.env.VITE_ADMIN_PASSWORD ||
    "a0019280718";
  useEffect(() => {
    fetch("/api/admin/product-media", {
      headers: { "x-admin-password": password },
    })
      .then((response) => (response.ok ? response.json() : { images: [] }))
      .then((payload) => setUploaded(payload.images || []))
      .catch(() => setUploaded([]));
  }, []);
  const images = [portrait, studioMailImage, ...assetImages, ...uploaded];
  const upload = async (file?: File) => {
    if (!file) return;
    setState("uploading");
    const body = new FormData();
    body.append("image", file);
    body.append("productId", "media-library");
    try {
      const response = await fetch("/api/admin/product-media", {
        method: "POST",
        headers: { "x-admin-password": password },
        body,
      });
      const payload = await response.json();
      if (!response.ok || !payload.imageUrl) throw new Error();
      setUploaded((current) => [...current, payload.imageUrl]);
      setState("saved");
    } catch {
      setState("error");
    }
  };
  return (
    <AdminLayout title="Media Library">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold">Project images</h2>
          <p className="text-sm text-ink/50">
            Project assets and images stored persistently in PostgreSQL.
          </p>
        </div>
        <label className="button-primary cursor-pointer">
          {state === "uploading" ? "Uploading…" : "Upload image"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={state === "uploading"}
            onChange={(event) => upload(event.target.files?.[0])}
            className="sr-only"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {images.map((src, index) => (
          <figure
            key={`${src}-${index}`}
            className="border border-ink/10 bg-paper p-2"
          >
            <img
              src={src}
              alt={`Studio media ${index + 1}`}
              className="aspect-square w-full object-cover"
            />
            <figcaption className="mt-2 text-xs text-ink/50">
              Studio image {index + 1}
            </figcaption>
          </figure>
        ))}
      </div>
      <p aria-live="polite" className="mt-6 text-sm font-semibold">
        {state === "saved"
          ? "Image uploaded successfully."
          : state === "error"
            ? "Image upload failed. Existing media was preserved."
            : "Uploaded images are stored persistently in the database and are available on every device."}
      </p>
    </AdminLayout>
  );
}
