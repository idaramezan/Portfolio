import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

type MediaItem = {
  id: string;
  original_name: string;
  mime_type: string;
  byte_size: number;
};

type Config = {
  videoSource: "uploaded" | "youtube";
  uploadedVideoId: string | null;
  youtubeVideoId: string | null;
  posterUrl: string | null;
  youtubeHasEmbeddedBorders: boolean;
};

const fallback: Config = {
  videoSource: "youtube",
  uploadedVideoId: null,
  youtubeVideoId: "gAJYgEfwpQg",
  posterUrl: null,
  youtubeHasEmbeddedBorders: true,
};

export default function CollectorExperience() {
  const [config, setConfig] = useState(fallback);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "uploading" | "saving" | "saved" | "error">("loading");
  const [message, setMessage] = useState("");
  const password =
    sessionStorage.getItem("aida-admin-password") ||
    import.meta.env.VITE_ADMIN_PASSWORD ||
    "";
  const headers = { "x-admin-password": password };

  useEffect(() => {
    Promise.all([
      fetch("/api/collector-experience/admin", { headers }).then((r) => {
        if (!r.ok) throw new Error("Could not load video settings");
        return r.json();
      }),
      fetch("/api/admin/product-media", { headers }).then((r) =>
        r.ok ? r.json() : { images: [] },
      ),
    ])
      .then(([payload, imagePayload]) => {
        setConfig(payload.config || fallback);
        setMedia(payload.media || []);
        setImages(imagePayload.images || []);
        setState("idle");
      })
      .catch((error) => {
        setMessage(error.message);
        setState("error");
      });
  }, []);

  const upload = async (file?: File) => {
    if (!file) return;
    setState("uploading");
    setMessage("");
    const body = new FormData();
    body.append("video", file);
    try {
      const response = await fetch("/api/collector-experience/media", {
        method: "POST",
        headers,
        body,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Upload failed");
      setMedia((current) => [payload.media, ...current]);
      setConfig((current) => ({
        ...current,
        videoSource: "uploaded",
        uploadedVideoId: payload.media.id,
      }));
      setMessage("Video uploaded. Save settings to publish it.");
      setState("idle");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
      setState("error");
    }
  };

  const save = async () => {
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/collector-experience/admin", {
        method: "PUT",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify(config),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Save failed");
      setConfig(payload.config);
      setMessage("Original Collector Experience video saved.");
      setState("saved");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
      setState("error");
    }
  };

  return (
    <AdminLayout title="Original Collector Experience">
      <div className="max-w-3xl border border-ink/10 bg-paper p-6 shadow-sm">
        <p className="text-sm text-ink/60">
          Controls the existing packaging film on the homepage and original artwork pages.
        </p>

        <fieldset className="mt-6">
          <legend className="text-sm font-bold">Video source</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(["uploaded", "youtube"] as const).map((source) => (
              <label key={source} className="flex cursor-pointer gap-3 border border-ink/15 p-4">
                <input
                  type="radio"
                  name="videoSource"
                  checked={config.videoSource === source}
                  onChange={() => setConfig((current) => ({ ...current, videoSource: source }))}
                />
                <span>
                  <strong className="block">{source === "uploaded" ? "Uploaded video" : "YouTube"}</strong>
                  <span className="mt-1 block text-xs text-ink/55">
                    {source === "uploaded" ? "Preferred for a true vertical MP4." : "External fallback player."}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {config.videoSource === "uploaded" ? (
          <div className="mt-6">
            <label className="block text-sm font-bold">
              Media Library video
              <select
                value={config.uploadedVideoId || ""}
                onChange={(event) => setConfig((current) => ({ ...current, uploadedVideoId: event.target.value || null }))}
                className="mt-2 h-11 w-full border border-ink/15 bg-paper px-3"
              >
                <option value="">Choose an uploaded video</option>
                {media.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.original_name} · {(item.byte_size / 1024 / 1024).toFixed(1)} MB
                  </option>
                ))}
              </select>
            </label>
            <label className="button-primary mt-4 inline-flex cursor-pointer">
              {state === "uploading" ? "Uploading…" : "Upload MP4 or WebM"}
              <input
                className="sr-only"
                type="file"
                accept="video/mp4,video/webm"
                disabled={state === "uploading"}
                onChange={(event) => upload(event.target.files?.[0])}
              />
            </label>
            <p className="mt-2 text-xs text-ink/55">Use the original 9:16 MP4 (H.264 recommended), up to 450 MB.</p>
          </div>
        ) : (
          <div className="mt-6">
            <label className="block text-sm font-bold">
              YouTube URL or video ID
              <input
                value={config.youtubeVideoId || ""}
                onChange={(event) => setConfig((current) => ({ ...current, youtubeVideoId: event.target.value }))}
                className="mt-2 h-11 w-full border border-ink/15 bg-paper px-3"
                placeholder="https://youtube.com/shorts/…"
              />
            </label>
            <label className="mt-4 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={config.youtubeHasEmbeddedBorders}
                onChange={(event) => setConfig((current) => ({ ...current, youtubeHasEmbeddedBorders: event.target.checked }))}
                className="mt-1"
              />
              <span><strong className="block">Landscape canvas or borders are built into this upload</strong><span className="mt-1 block text-xs text-ink/55">Keep this checked for the current YouTube Short. Uncheck it only after replacing the URL with a genuine 9:16 YouTube upload.</span></span>
            </label>
            {config.youtubeHasEmbeddedBorders && (
              <div role="note" className="mt-4 border border-amber-600/30 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                <strong>This YouTube upload is a landscape file.</strong> Its portrait film, side fill and black borders are built into the source and cannot be removed safely. Upload the original vertical MP4 through the Media Library for a full-size 9:16 presentation. YouTube remains available as a fallback.
              </div>
            )}
          </div>
        )}

        <label className="mt-6 block text-sm font-bold">
          Poster image
          <select
            value={config.posterUrl || ""}
            onChange={(event) => setConfig((current) => ({ ...current, posterUrl: event.target.value || null }))}
            className="mt-2 h-11 w-full border border-ink/15 bg-paper px-3"
          >
            <option value="">Use the YouTube thumbnail</option>
            {images.map((url) => <option key={url} value={url}>{url}</option>)}
          </select>
        </label>

        <div className="mt-7 flex items-center gap-4">
          <button className="button-primary" disabled={state === "loading" || state === "saving" || state === "uploading"} onClick={save}>
            {state === "saving" ? "Saving…" : "Save video settings"}
          </button>
          <p aria-live="polite" className={`text-sm font-semibold ${state === "error" ? "text-coral" : "text-ink/65"}`}>{message}</p>
        </div>
      </div>
    </AdminLayout>
  );
}
