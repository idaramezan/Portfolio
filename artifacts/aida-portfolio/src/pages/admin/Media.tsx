import { useEffect, useState } from "react";
import { assetImages, portrait, studioMailImage } from "@/lib/assets";
import AdminLayout from "@/components/admin/AdminLayout";
export default function Media() {
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [videos, setVideos] = useState<Array<{ id: string; original_name: string; byte_size: number }>>([]);
  const [state, setState] = useState<"idle" | "uploading" | "saved" | "error">(
    "idle",
  );
  const password =
    sessionStorage.getItem("aida-admin-password") ||
    import.meta.env.VITE_ADMIN_PASSWORD ||
    "a0019280718";
  useEffect(() => {
    Promise.all([
      fetch("/api/admin/product-media", { headers: { "x-admin-password": password } })
        .then((response) => (response.ok ? response.json() : { images: [] })),
      fetch("/api/collector-experience/admin", { headers: { "x-admin-password": password } })
        .then((response) => (response.ok ? response.json() : { media: [] })),
    ])
      .then(([imagePayload, videoPayload]) => {
        setUploaded(imagePayload.images || []);
        setVideos(videoPayload.media || []);
      })
      .catch(() => {
        setUploaded([]);
        setVideos([]);
      });
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
  const uploadVideo = async (file?: File) => {
    if (!file) return;
    setState("uploading");
    const body = new FormData();
    body.append("video", file);
    try {
      const response = await fetch("/api/collector-experience/media", {
        method: "POST",
        headers: { "x-admin-password": password },
        body,
      });
      const payload = await response.json();
      if (!response.ok || !payload.media) throw new Error();
      setVideos((current) => [payload.media, ...current]);
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
      <div className="mt-10 border-t border-ink/10 pt-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Collector experience videos</h2>
            <p className="text-sm text-ink/50">Original vertical MP4 or optional WebM files stored permanently in PostgreSQL.</p>
          </div>
          <label className="button-primary cursor-pointer">
            {state === "uploading" ? "Uploading…" : "Upload video"}
            <input type="file" accept="video/mp4,video/webm" disabled={state === "uploading"} onChange={(event) => uploadVideo(event.target.files?.[0])} className="sr-only" />
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {videos.map((video) => (
            <div key={video.id} className="border border-ink/10 bg-paper p-4">
              <p className="truncate text-sm font-bold">{video.original_name}</p>
              <p className="mt-1 text-xs text-ink/50">{(video.byte_size / 1024 / 1024).toFixed(1)} MB · permanent media</p>
            </div>
          ))}
          {!videos.length && <p className="text-sm text-ink/50">No uploaded collector videos yet.</p>}
        </div>
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
