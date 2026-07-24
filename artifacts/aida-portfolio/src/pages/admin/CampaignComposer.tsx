import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bold,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  MailCheck,
  Minus,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { ADMIN_PASSWORD_SESSION_KEY } from "@/pages/Admin";

type TextBlock = {
  id: string;
  type: "text";
  text: string;
  size: "small" | "normal" | "large" | "heading";
  align: "left" | "center";
  bold: boolean;
  italic: boolean;
  linkUrl: string;
  linkText: string;
};
type ImageBlock = {
  id: string;
  type: "image";
  url: string;
  alt: string;
  linkUrl: string;
};
type ButtonBlock = { id: string; type: "button"; text: string; url: string };
type DividerBlock = { id: string; type: "divider" };
type Block = TextBlock | ImageBlock | ButtonBlock | DividerBlock;
type WithoutId<T> = T extends { id: string } ? Omit<T, "id"> : never;
type StoredBlock = WithoutId<Block>;

const id = () => crypto.randomUUID();
const newText = (text = "", size: TextBlock["size"] = "normal"): TextBlock => ({
  id: id(),
  type: "text",
  text,
  size,
  align: "left",
  bold: false,
  italic: false,
  linkUrl: "",
  linkText: "",
});

const defaultBlocks: Block[] = [
  newText("Hello, art lover!", "large"),
  newText("I'm so happy you're here. ❤️ Welcome to the Art Club!"),
  newText(
    "This little community means a lot to me, and I'm excited to share more of my creative world with you. You'll get early access to new paintings, behind-the-scenes moments from my studio, exclusive offers, and the occasional surprise; things I don't share anywhere else.",
  ),
  newText(
    "More than anything, thank you for supporting independent artists. Every print, painting, message, and subscription helps me keep creating, and I'm truly grateful that you've chosen to be part of this journey.",
  ),
  newText("I can't wait to share what's coming next."),
];

type Campaign = {
  id: string;
  subject: string;
  status: string;
  recipient_count: number;
  sent_count: number;
  created_at: string;
};

type Template = {
  id: string;
  name: string;
  subject: string;
  preheader: string | null;
  blocks: StoredBlock[];
  is_starter: boolean;
};

type Subscriber = {
  id: number;
  email: string;
  name: string | null;
  unsubscribedAt: string | null;
};

function hydrateBlocks(blocks: StoredBlock[]): Block[] {
  return blocks.map((block) => {
    if (block.type === "text")
      return {
        id: id(),
        type: "text",
        text: block.text || "",
        size: block.size || "normal",
        align: block.align || "left",
        bold: Boolean(block.bold),
        italic: Boolean(block.italic),
        linkUrl: block.linkUrl || "",
        linkText: block.linkText || "",
      };
    if (block.type === "image")
      return {
        id: id(),
        type: "image",
        url: block.url || "",
        alt: block.alt || "Studio artwork",
        linkUrl: block.linkUrl || "",
      };
    return { ...block, id: id() } as Block;
  });
}

export default function CampaignComposer() {
  const password = sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) || "";
  const [subject, setSubject] = useState("A note from Aida’s studio");
  const [preheader, setPreheader] = useState("A new Studio Letter from Aida");
  const [blocks, setBlocks] = useState<Block[]>(defaultBlocks);
  const [testEmail, setTestEmail] = useState("aida@aedaart.com");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState<
    "idle" | "uploading" | "testing" | "sending" | "saving"
  >("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [templateName, setTemplateName] = useState("Art Club welcome");
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [recipientMode, setRecipientMode] = useState<"all" | "selected">("all");
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);
  const [subscriberSearch, setSubscriberSearch] = useState("");

  const loadCampaigns = () =>
    fetch("/api/newsletter/campaigns", {
      headers: { "x-admin-password": password },
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : { campaigns: [] }))
      .then((result) => setCampaigns(result.campaigns || []))
      .catch(() => setCampaigns([]));

  const applyTemplate = (template: Template) => {
    setSelectedTemplateId(template.id);
    setTemplateName(template.name);
    setSubject(template.subject);
    setPreheader(template.preheader || "");
    setBlocks(hydrateBlocks(template.blocks));
    setMessage(`Loaded “${template.name}”.`);
    setError("");
  };

  const loadTemplates = () =>
    fetch("/api/newsletter/templates", {
      headers: { "x-admin-password": password },
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Templates could not be loaded");
        setTemplates(result.templates || []);
        const initial = (result.templates || []).find(
          (template: Template) => template.id === "starter-welcome",
        );
        if (initial && selectedTemplateId === null) applyTemplate(initial);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Templates could not be loaded",
        ),
      );

  const loadSubscribers = () =>
    fetch("/api/newsletter/subscribers", {
      headers: { "x-admin-password": password },
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : { subscribers: [] }))
      .then((result) =>
        setSubscribers(
          (result.subscribers || []).filter(
            (subscriber: Subscriber) => !subscriber.unsubscribedAt,
          ),
        ),
      )
      .catch(() => setSubscribers([]));

  useEffect(() => {
    void loadCampaigns();
    void loadTemplates();
    void loadSubscribers();
  }, []);

  const update = (blockId: string, values: Partial<Block>) =>
    setBlocks((current) =>
      current.map((block) =>
        block.id === blockId ? ({ ...block, ...values } as Block) : block,
      ),
    );
  const remove = (blockId: string) =>
    setBlocks((current) => current.filter((block) => block.id !== blockId));
  const move = (index: number, direction: -1 | 1) =>
    setBlocks((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const payload = () => ({
    subject,
    preheader,
    blocks: blocks.map(({ id: _id, ...block }) => block),
  });

  const request = async (
    path: string,
    body: object,
    method: "POST" | "PUT" | "DELETE" = "POST",
  ) => {
    setMessage("");
    setError("");
    const response = await fetch(path, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(result.error || "The email could not be sent");
    return result;
  };

  const templatePayload = () => ({
    name: templateName,
    ...payload(),
  });

  const newTemplate = () => {
    setSelectedTemplateId(null);
    setTemplateName("Untitled Studio Letter");
    setSubject("A note from Aida’s studio");
    setPreheader("A new Studio Letter from Aida");
    setBlocks([newText("Hello, art lover!", "large"), newText("")]);
    setMessage("New template ready. Add your content, then save it.");
    setError("");
  };

  const saveTemplate = async (asCopy = false) => {
    setStatus("saving");
    try {
      const current = templates.find(
        (template) => template.id === selectedTemplateId,
      );
      const create = asCopy || !selectedTemplateId || current?.is_starter;
      const result = await request(
        create
          ? "/api/newsletter/templates"
          : `/api/newsletter/templates/${selectedTemplateId}`,
        {
          ...templatePayload(),
          name:
            asCopy || current?.is_starter
              ? `${templateName} copy`
              : templateName,
        },
        create ? "POST" : "PUT",
      );
      setSelectedTemplateId(result.template.id);
      setTemplateName(result.template.name);
      setMessage(create ? "Template created." : "Template saved.");
      await loadTemplates();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Template could not be saved",
      );
    } finally {
      setStatus("idle");
    }
  };

  const deleteTemplate = async () => {
    const current = templates.find(
      (template) => template.id === selectedTemplateId,
    );
    if (!current || current.is_starter) return;
    if (!window.confirm(`Delete the template “${current.name}”?`)) return;
    setStatus("saving");
    try {
      await request(`/api/newsletter/templates/${current.id}`, {}, "DELETE");
      newTemplate();
      await loadTemplates();
      setMessage("Template deleted.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Template could not be deleted",
      );
    } finally {
      setStatus("idle");
    }
  };

  const sendTest = async () => {
    setStatus("testing");
    try {
      const result = await request("/api/newsletter/campaigns/test", {
        ...payload(),
        testEmail,
      });
      setMessage(`Test email sent to ${result.sentTo}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Test email failed");
    } finally {
      setStatus("idle");
    }
  };

  const sendAll = async () => {
    if (confirmation !== "SEND") {
      setError("Type SEND in the confirmation field first.");
      return;
    }
    if (
      !window.confirm(
        recipientMode === "all"
          ? "Send this email to every active Studio Letter subscriber?"
          : `Send this email to ${selectedRecipients.length} selected subscribers?`,
      )
    )
      return;
    setStatus("sending");
    try {
      const result = await request("/api/newsletter/campaigns/send", {
        ...payload(),
        confirmation,
        ...(recipientMode === "selected"
          ? { recipientIds: selectedRecipients }
          : {}),
      });
      setMessage(`Campaign sent to ${result.sentCount} subscribers.`);
      setConfirmation("");
      await loadCampaigns();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Campaign send failed",
      );
    } finally {
      setStatus("idle");
    }
  };

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setStatus("uploading");
    setMessage("");
    setError("");
    const body = new FormData();
    body.append("image", file);
    body.append("productId", "newsletter-campaign");
    try {
      const response = await fetch("/api/admin/product-media", {
        method: "POST",
        headers: { "x-admin-password": password },
        body,
      });
      const result = await response.json();
      if (!response.ok || !result.imageUrl)
        throw new Error(result.error || "Image upload failed");
      const absoluteUrl = new URL(
        result.imageUrl,
        window.location.origin,
      ).toString();
      setBlocks((current) => [
        ...current,
        {
          id: id(),
          type: "image",
          url: absoluteUrl,
          alt: "Studio artwork",
          linkUrl: "",
        },
      ]);
      setMessage("Image uploaded and added to the email.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Image upload failed",
      );
    } finally {
      setStatus("idle");
    }
  };

  const filteredSubscribers = subscribers.filter((subscriber) => {
    const query = subscriberSearch.trim().toLowerCase();
    return (
      !query ||
      subscriber.email.toLowerCase().includes(query) ||
      subscriber.name?.toLowerCase().includes(query)
    );
  });

  const toggleRecipient = (subscriberId: number) =>
    setSelectedRecipients((current) =>
      current.includes(subscriberId)
        ? current.filter((id) => id !== subscriberId)
        : [...current, subscriberId],
    );

  return (
    <AdminLayout title="Studio Letter composer">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,.8fr)]">
        <div className="space-y-6">
          <section className="border border-ink/10 bg-paper p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl">Template library</h2>
                <p className="mt-1 text-sm text-ink/55">
                  Start with a branded template or create your own reusable
                  email.
                </p>
              </div>
              <button
                type="button"
                className="admin-button"
                onClick={newTemplate}
              >
                <Plus size={16} /> New template
              </button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className={`min-h-20 border p-3 text-left ${selectedTemplateId === template.id ? "border-coral bg-coral/5" : "border-ink/10 hover:border-coral/50"}`}
                >
                  <strong className="block">{template.name}</strong>
                  <span className="mt-1 block text-xs text-ink/50">
                    {template.is_starter ? "Starter template" : "Your template"}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="border border-ink/10 bg-paper p-5 md:p-6">
            <p className="text-sm text-ink/60">
              Write a branded Studio Letter, send yourself a test, then send one
              private email to every active subscriber.
            </p>
            <label className="mt-5 block text-sm font-semibold">
              Template name
              <input
                className="admin-input mt-2"
                value={templateName}
                maxLength={120}
                onChange={(event) => setTemplateName(event.target.value)}
              />
            </label>
            <label className="mt-5 block text-sm font-semibold">
              Subject
              <input
                className="admin-input mt-2"
                value={subject}
                maxLength={200}
                onChange={(event) => setSubject(event.target.value)}
              />
            </label>
            <label className="mt-4 block text-sm font-semibold">
              Inbox preview text
              <input
                className="admin-input mt-2"
                value={preheader}
                maxLength={300}
                onChange={(event) => setPreheader(event.target.value)}
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="admin-button"
                disabled={status !== "idle"}
                onClick={() => void saveTemplate(false)}
              >
                <Save size={16} />
                {templates.find(
                  (template) => template.id === selectedTemplateId,
                )?.is_starter
                  ? "Save customized copy"
                  : "Save template"}
              </button>
              {selectedTemplateId && (
                <button
                  type="button"
                  className="admin-button"
                  disabled={status !== "idle"}
                  onClick={() => void saveTemplate(true)}
                >
                  Duplicate
                </button>
              )}
              {selectedTemplateId &&
                !templates.find(
                  (template) => template.id === selectedTemplateId,
                )?.is_starter && (
                  <button
                    type="button"
                    className="admin-button !text-coral"
                    disabled={status !== "idle"}
                    onClick={() => void deleteTemplate()}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                )}
            </div>
          </section>

          <section className="border border-ink/10 bg-paper">
            <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 p-4">
              <button
                type="button"
                className="admin-button"
                onClick={() => setBlocks((x) => [...x, newText()])}
              >
                <Plus size={16} /> Text
              </button>
              <button
                type="button"
                className="admin-button"
                onClick={() =>
                  setBlocks((x) => [
                    ...x,
                    {
                      id: id(),
                      type: "button",
                      text: "View the collection",
                      url: "https://www.aedaart.com",
                    },
                  ])
                }
              >
                <LinkIcon size={16} /> Button
              </button>
              <button
                type="button"
                className="admin-button"
                onClick={() =>
                  setBlocks((x) => [...x, { id: id(), type: "divider" }])
                }
              >
                <Minus size={16} /> Divider
              </button>
              <label className="admin-button cursor-pointer">
                <ImagePlus size={16} />{" "}
                {status === "uploading" ? "Uploading…" : "Image"}
                <input
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={status !== "idle"}
                  onChange={(event) =>
                    void uploadImage(event.target.files?.[0])
                  }
                />
              </label>
            </div>
            <div className="space-y-3 p-4">
              {blocks.map((block, index) => (
                <div
                  key={block.id}
                  className="border border-ink/10 bg-[#faf7ef] p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <strong className="text-xs uppercase tracking-[.14em] text-ink/50">
                      {block.type} block
                    </strong>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="min-h-10 min-w-10 border border-ink/10"
                        onClick={() => move(index, -1)}
                        aria-label="Move block up"
                      >
                        <ArrowUp className="mx-auto" size={15} />
                      </button>
                      <button
                        type="button"
                        className="min-h-10 min-w-10 border border-ink/10"
                        onClick={() => move(index, 1)}
                        aria-label="Move block down"
                      >
                        <ArrowDown className="mx-auto" size={15} />
                      </button>
                      <button
                        type="button"
                        className="min-h-10 min-w-10 border border-ink/10 text-coral"
                        onClick={() => remove(block.id)}
                        aria-label="Remove block"
                      >
                        <Trash2 className="mx-auto" size={15} />
                      </button>
                    </div>
                  </div>
                  {block.type === "text" && (
                    <>
                      <textarea
                        className="admin-input min-h-28 py-3"
                        value={block.text}
                        onChange={(event) =>
                          update(block.id, { text: event.target.value })
                        }
                        placeholder="Write your message…"
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <select
                          className="admin-input !w-auto"
                          value={block.size}
                          onChange={(event) =>
                            update(block.id, {
                              size: event.target.value as TextBlock["size"],
                            })
                          }
                          aria-label="Font size"
                        >
                          <option value="small">Small</option>
                          <option value="normal">Normal</option>
                          <option value="large">Large</option>
                          <option value="heading">Heading</option>
                        </select>
                        <select
                          className="admin-input !w-auto"
                          value={block.align}
                          onChange={(event) =>
                            update(block.id, {
                              align: event.target.value as TextBlock["align"],
                            })
                          }
                          aria-label="Text alignment"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                        </select>
                        <button
                          type="button"
                          aria-pressed={block.bold}
                          className={`min-h-11 min-w-11 border ${block.bold ? "border-coral bg-coral text-paper" : "border-ink/15"}`}
                          onClick={() =>
                            update(block.id, { bold: !block.bold })
                          }
                        >
                          <Bold className="mx-auto" size={16} />
                        </button>
                        <button
                          type="button"
                          aria-pressed={block.italic}
                          className={`min-h-11 min-w-11 border ${block.italic ? "border-coral bg-coral text-paper" : "border-ink/15"}`}
                          onClick={() =>
                            update(block.id, { italic: !block.italic })
                          }
                        >
                          <Italic className="mx-auto" size={16} />
                        </button>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <input
                          className="admin-input"
                          value={block.linkText}
                          onChange={(event) =>
                            update(block.id, { linkText: event.target.value })
                          }
                          placeholder="Optional link text"
                        />
                        <input
                          className="admin-input"
                          type="url"
                          value={block.linkUrl}
                          onChange={(event) =>
                            update(block.id, { linkUrl: event.target.value })
                          }
                          placeholder="https://…"
                        />
                      </div>
                    </>
                  )}
                  {block.type === "image" && (
                    <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                      <img
                        src={block.url}
                        alt={block.alt}
                        className="aspect-square w-full object-cover"
                      />
                      <div className="space-y-2">
                        <input
                          className="admin-input"
                          value={block.alt}
                          onChange={(event) =>
                            update(block.id, { alt: event.target.value })
                          }
                          placeholder="Image description"
                        />
                        <input
                          className="admin-input"
                          type="url"
                          value={block.linkUrl}
                          onChange={(event) =>
                            update(block.id, { linkUrl: event.target.value })
                          }
                          placeholder="Optional image link"
                        />
                      </div>
                    </div>
                  )}
                  {block.type === "button" && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        className="admin-input"
                        value={block.text}
                        onChange={(event) =>
                          update(block.id, { text: event.target.value })
                        }
                        placeholder="Button text"
                      />
                      <input
                        className="admin-input"
                        type="url"
                        value={block.url}
                        onChange={(event) =>
                          update(block.id, { url: event.target.value })
                        }
                        placeholder="https://…"
                      />
                    </div>
                  )}
                  {block.type === "divider" && <hr className="border-ink/20" />}
                </div>
              ))}
            </div>
          </section>

          <section className="border border-ink/10 bg-paper p-5 md:p-6">
            <h2 className="font-serif text-2xl">Test and send</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                className="admin-input"
                type="email"
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
                aria-label="Test recipient"
              />
              <button
                type="button"
                className="admin-button justify-center"
                disabled={status !== "idle"}
                onClick={() => void sendTest()}
              >
                <MailCheck size={17} />{" "}
                {status === "testing" ? "Sending…" : "Send test"}
              </button>
            </div>
            <div className="mt-5 border-t border-ink/10 pt-5">
              <h3 className="font-semibold">Recipients</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label
                  className={`flex min-h-12 cursor-pointer items-center gap-3 border p-3 ${recipientMode === "all" ? "border-coral bg-coral/5" : "border-ink/10"}`}
                >
                  <input
                    type="radio"
                    name="recipients"
                    checked={recipientMode === "all"}
                    onChange={() => setRecipientMode("all")}
                  />
                  <span>
                    <strong className="block">All active subscribers</strong>
                    <span className="text-xs text-ink/50">
                      {subscribers.length} recipients
                    </span>
                  </span>
                </label>
                <label
                  className={`flex min-h-12 cursor-pointer items-center gap-3 border p-3 ${recipientMode === "selected" ? "border-coral bg-coral/5" : "border-ink/10"}`}
                >
                  <input
                    type="radio"
                    name="recipients"
                    checked={recipientMode === "selected"}
                    onChange={() => setRecipientMode("selected")}
                  />
                  <span>
                    <strong className="block">Selected subscribers</strong>
                    <span className="text-xs text-ink/50">
                      {selectedRecipients.length} selected
                    </span>
                  </span>
                </label>
              </div>
              {recipientMode === "selected" && (
                <div className="mt-3 border border-ink/10">
                  <div className="flex flex-col gap-2 border-b border-ink/10 p-3 sm:flex-row">
                    <label className="relative flex-1">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"
                        size={16}
                      />
                      <input
                        className="admin-input !mt-0 pl-9"
                        type="search"
                        value={subscriberSearch}
                        onChange={(event) =>
                          setSubscriberSearch(event.target.value)
                        }
                        placeholder="Search subscribers"
                      />
                    </label>
                    <button
                      type="button"
                      className="admin-button"
                      onClick={() =>
                        setSelectedRecipients((current) =>
                          Array.from(
                            new Set([
                              ...current,
                              ...filteredSubscribers.map(
                                (subscriber) => subscriber.id,
                              ),
                            ]),
                          ),
                        )
                      }
                    >
                      Select shown
                    </button>
                    <button
                      type="button"
                      className="admin-button"
                      onClick={() => setSelectedRecipients([])}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="max-h-56 divide-y divide-ink/10 overflow-y-auto">
                    {filteredSubscribers.map((subscriber) => (
                      <label
                        key={subscriber.id}
                        className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-ink/5"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipients.includes(subscriber.id)}
                          onChange={() => toggleRecipient(subscriber.id)}
                        />
                        <span className="min-w-0">
                          <strong className="block truncate">
                            {subscriber.name || subscriber.email}
                          </strong>
                          {subscriber.name && (
                            <span className="block truncate text-xs text-ink/50">
                              {subscriber.email}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                    {!filteredSubscribers.length && (
                      <p className="p-4 text-sm text-ink/50">
                        No active subscribers match this search.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-5 border-t border-ink/10 pt-5">
              <label className="block text-sm font-semibold">
                Type SEND to confirm
                <input
                  className="admin-input mt-2"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="button-primary mt-3 w-full justify-center"
                disabled={
                  status !== "idle" ||
                  confirmation !== "SEND" ||
                  (recipientMode === "selected" && !selectedRecipients.length)
                }
                onClick={() => void sendAll()}
              >
                <Send size={17} />{" "}
                {status === "sending"
                  ? "Sending campaign…"
                  : recipientMode === "all"
                    ? "Send to all active subscribers"
                    : `Send to ${selectedRecipients.length} selected subscribers`}
              </button>
            </div>
            <div aria-live="polite">
              {message && (
                <p className="mt-4 border-l-2 border-green-600 pl-3 text-sm font-semibold text-green-800">
                  {message}
                </p>
              )}
              {error && (
                <p
                  role="alert"
                  className="mt-4 border-l-2 border-coral pl-3 text-sm font-semibold text-coral"
                >
                  {error}
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <section>
            <h2 className="mb-3 font-serif text-2xl">Email preview</h2>
            <div className="bg-[#e9e0cf] p-4">
              <div className="border border-[#cbbb9f] bg-[#fffaf1] p-6 font-hand text-[#342d25] shadow-lg">
                <p className="mb-6 text-xs font-bold uppercase tracking-[.16em] text-[#a44938]">
                  Aida Ramezani · Artist
                </p>
                {blocks.map((block) => {
                  if (block.type === "divider")
                    return (
                      <hr key={block.id} className="my-6 border-[#cbbb9f]" />
                    );
                  if (block.type === "image")
                    return (
                      <img
                        key={block.id}
                        src={block.url}
                        alt={block.alt}
                        className="my-5 w-full border border-[#cbbb9f]"
                      />
                    );
                  if (block.type === "button")
                    return (
                      <p key={block.id} className="my-6 text-center">
                        <span className="inline-block bg-[#a44938] px-5 py-3 font-bold text-[#fffaf1]">
                          {block.text}
                        </span>
                      </p>
                    );
                  const sizes = {
                    small: "text-xs",
                    normal: "text-base",
                    large: "text-xl",
                    heading: "text-3xl",
                  };
                  return (
                    <p
                      key={block.id}
                      className={`mb-4 whitespace-pre-line leading-relaxed ${sizes[block.size]} ${block.align === "center" ? "text-center" : "text-left"} ${block.bold ? "font-bold" : ""} ${block.italic ? "italic" : ""}`}
                    >
                      {block.text}
                      {block.linkText && (
                        <>
                          <br />
                          <span className="text-[#a44938] underline">
                            {block.linkText}
                          </span>
                        </>
                      )}
                    </p>
                  );
                })}
                <div className="mt-8 border-t border-dashed border-[#bba98b] pt-6 text-center">
                  <img
                    src="/assets/aida-email-seal.png"
                    alt="Aida's artist seal"
                    className="mx-auto mb-2 w-[100px]"
                  />
                  <p className="text-2xl italic">XOXO, Aida</p>
                  <p className="mt-2 text-xs text-[#a44938]">
                    aida@aedaart.com
                  </p>
                  <p className="mt-3 text-[10px] text-ink/50 underline">
                    Unsubscribe from the Studio Letter
                  </p>
                </div>
              </div>
            </div>
          </section>
          {campaigns.length > 0 && (
            <section className="border border-ink/10 bg-paper p-5">
              <h2 className="font-serif text-2xl">Recent campaigns</h2>
              <div className="mt-3 divide-y divide-ink/10">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="py-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <strong>{campaign.subject}</strong>
                      <span className="uppercase text-ink/45">
                        {campaign.status}
                      </span>
                    </div>
                    <p className="mt-1 text-ink/55">
                      {campaign.sent_count} of {campaign.recipient_count} sent
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </AdminLayout>
  );
}
