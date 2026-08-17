import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Check, Copy, Upload } from "lucide-react";
import {
  clearCart,
  loadCart,
  type CartItem,
  type ShoppingRegion,
} from "@/lib/store";
import { useLocale } from "@/lib/locale";
import { trackAnalytics } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";

const PROVINCES =
  "Adana,Adıyaman,Afyonkarahisar,Ağrı,Aksaray,Amasya,Ankara,Antalya,Ardahan,Artvin,Aydın,Balıkesir,Bartın,Batman,Bayburt,Bilecik,Bingöl,Bitlis,Bolu,Burdur,Bursa,Çanakkale,Çankırı,Çorum,Denizli,Diyarbakır,Düzce,Edirne,Elazığ,Erzincan,Erzurum,Eskişehir,Gaziantep,Giresun,Gümüşhane,Hakkâri,Hatay,Iğdır,Isparta,İstanbul,İzmir,Kahramanmaraş,Karabük,Karaman,Kars,Kastamonu,Kayseri,Kilis,Kırıkkale,Kırklareli,Kırşehir,Kocaeli,Konya,Kütahya,Malatya,Manisa,Mardin,Mersin,Muğla,Muş,Nevşehir,Niğde,Ordu,Osmaniye,Rize,Sakarya,Samsun,Şanlıurfa,Siirt,Sinop,Sivas,Şırnak,Tekirdağ,Tokat,Trabzon,Tunceli,Uşak,Van,Yalova,Yozgat,Zonguldak".split(
    ",",
  );
const COUNTRY_CODES =
  "AD AE AF AG AI AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG UY UZ VA VC VE VN VU WS YE ZA ZM ZW".split(
    " ",
  );
type Quote = {
  market: string;
  currency: "TRY" | "USD";
  items: Array<{ name: string; quantity: number; lineTotalMinor: number }>;
  subtotalMinor: number;
  shippingMinor: number;
  grandTotalMinor: number;
  printQuantity: number;
  originalQuantity: number;
};
type Bank = {
  account_holder: string;
  bank_name: string;
  iban: string;
  swift_bic?: string;
  branch_info?: string;
  instructions?: string;
};
const initial = {
  fullName: "",
  email: "",
  phone: "",
  countryCode: "TR",
  countryName: "Türkiye",
  province: "",
  district: "",
  city: "",
  postalCode: "",
  address: "",
  deliveryNotes: "",
  consent: false,
  honey: "",
};
function productId(item: CartItem) {
  const base = item.id.split(":")[0];
  return (
    item.productId ||
    base
      .replace(/^original-/, "")
      .replace(/^print-product-/, "")
      .replace(/^product-/, "")
  );
}
function itemsFor(cart: CartItem[]) {
  return cart.map((item) => ({
    productId: productId(item),
    kind:
      item.kind === "original"
        ? "original"
        : item.kind === "print" || item.kind === "product"
          ? "print"
          : item.kind,
    quantity: item.quantity,
    selectedOptions: item.printConfiguration
      ? {
          sizeId: item.printConfiguration.sizeId,
          framing: item.printConfiguration.framing,
          color: item.selectedColor,
        }
      : { color: item.selectedColor },
  }));
}
const money = (minor: number, currency: string) =>
  new Intl.NumberFormat(currency === "TRY" ? "tr-TR" : "en-US", {
    style: "currency",
    currency,
  }).format(minor / 100);

const CHECKOUT_COPY = {
  en: {
    documentTitle: "Complete your order | Aida Ramezani",
    progressLabel: "Checkout progress",
    basketStep: "1. Basket",
    deliveryStep: "2. Delivery",
    paymentStep: "3. Payment",
    completeStep: "4. Complete",
    eyebrow: "Bank-transfer checkout",
    turkiyeTitle: "Complete your Türkiye order",
    internationalTitle: "International original order",
    intro:
      "Please make sure your information is complete and accurate. Aida will use it to prepare and deliver your order.",
    contact: "Contact details",
    fullName: "Full name",
    email: "Email address",
    phoneTr: "Phone (+90)",
    phoneInternational: "International phone number",
    deliveryAddress: "Delivery address",
    country: "Country",
    province: "Province",
    chooseProvince: "Choose a province",
    district: "District",
    chooseCountry: "Choose a country",
    city: "City",
    region: "State, province or region",
    postalTr: "Postal code (5 digits)",
    postalInternational: "Postal or ZIP code",
    fullAddress: "Full delivery address",
    addressPlaceholder: "Neighbourhood, street, building and apartment number",
    deliveryInstructions: "Delivery instructions (optional)",
    payment: "Payment",
    bankTitle: "Complete your bank transfer",
    bankIntro:
      "Please transfer the exact total before submitting your order. Use the reference where possible.",
    amount: "Amount to transfer",
    accountHolder: "Account holder",
    bank: "Bank",
    paymentReference: "Payment reference",
    receipt: "Payment receipt",
    receiptIntro:
      "Upload your completed bank-transfer receipt. Accepted formats: JPG, PNG, WebP or PDF. Maximum 10 MB.",
    chooseReceipt: "Choose receipt or take a photo",
    removeFile: "Remove file",
    consentBefore:
      "I confirm that my delivery and contact information is accurate, and I agree that it may be used to process and deliver this order.",
    privacy: "Privacy policy",
    submitting: "Submitting…",
    submitTr: "Submit order for payment review",
    submitInternational: "Submit international original order",
    summary: "Order summary",
    review: "Review your basket",
    products: "Products",
    shipping: "Shipping",
    total: "Total",
    calculating: "Calculating authoritative prices…",
    printShipping: (quantity: number) =>
      `Delivery calculation: 200 TL for the first print${quantity > 1 ? ` + 20 TL for ${quantity - 1} additional print${quantity > 2 ? "s" : ""}` : ""}. Originals ship free.`,
    originalsFree: "Original paintings ship free within Türkiye.",
    internationalShipping:
      "Fixed international original shipping: 100 USD per order.",
    empty: "Your basket is empty",
    returnShop: "Return to the shop",
    uploadRequired:
      "Upload your completed bank-transfer receipt before submitting.",
    submitError: "Order could not be submitted.",
    toastError: "Order could not be submitted",
    copied: (label: string) => `${label} copied`,
    copyLabel: (label: string) => `Copy ${label}`,
    successDocumentTitle: "Order received | Aida Ramezani",
    pending: "Pending payment review",
    received: "Your order has been received",
    awaiting: (number: string) => (
      <>
        Order <strong>{number}</strong> is awaiting payment verification.
      </>
    ),
    confirmation: (email: string) => (
      <>A confirmation has been sent to {email}.</>
    ),
    reviewTransfer:
      "Aida will review the transfer receipt and begin preparing your order after the payment is confirmed.",
    returnStudio: "Return to the studio",
  },
  tr: {
    documentTitle: "Siparişinizi tamamlayın | Aida Ramezani",
    progressLabel: "Ödeme adımları",
    basketStep: "1. Sepet",
    deliveryStep: "2. Teslimat",
    paymentStep: "3. Ödeme",
    completeStep: "4. Tamamlandı",
    eyebrow: "Banka havalesiyle ödeme",
    turkiyeTitle: "Türkiye siparişinizi tamamlayın",
    internationalTitle: "Uluslararası orijinal eser siparişi",
    intro:
      "Lütfen bilgilerinizin eksiksiz ve doğru olduğundan emin olun. Aida bu bilgileri siparişinizi hazırlamak ve teslim etmek için kullanacaktır.",
    contact: "İletişim bilgileri",
    fullName: "Ad soyad",
    email: "E-posta adresi",
    phoneTr: "Telefon (+90)",
    phoneInternational: "Uluslararası telefon numarası",
    deliveryAddress: "Teslimat adresi",
    country: "Ülke",
    province: "İl",
    chooseProvince: "İl seçin",
    district: "İlçe",
    chooseCountry: "Ülke seçin",
    city: "Şehir",
    region: "Eyalet, il veya bölge",
    postalTr: "Posta kodu (5 hane)",
    postalInternational: "Posta kodu",
    fullAddress: "Tam teslimat adresi",
    addressPlaceholder: "Mahalle, cadde/sokak, bina ve daire numarası",
    deliveryInstructions: "Teslimat notları (isteğe bağlı)",
    payment: "Ödeme",
    bankTitle: "Banka havalenizi tamamlayın",
    bankIntro:
      "Siparişinizi göndermeden önce lütfen toplam tutarı eksiksiz aktarın. Mümkünse ödeme açıklamasına referans kodunu yazın.",
    amount: "Gönderilecek tutar",
    accountHolder: "Hesap sahibi",
    bank: "Banka",
    paymentReference: "Ödeme referansı",
    receipt: "Ödeme dekontu",
    receiptIntro:
      "Tamamladığınız banka havalesinin dekontunu yükleyin. Kabul edilen formatlar: JPG, PNG, WebP veya PDF. En fazla 10 MB.",
    chooseReceipt: "Dekont seçin veya fotoğrafını çekin",
    removeFile: "Dosyayı kaldır",
    consentBefore:
      "Teslimat ve iletişim bilgilerimin doğru olduğunu onaylıyor ve bu bilgilerin siparişimin işlenmesi ve teslim edilmesi için kullanılmasını kabul ediyorum.",
    privacy: "Gizlilik politikası",
    submitting: "Gönderiliyor…",
    submitTr: "Siparişi ödeme kontrolüne gönder",
    submitInternational: "Uluslararası orijinal eser siparişini gönder",
    summary: "Sipariş özeti",
    review: "Sepetinizi kontrol edin",
    products: "Ürünler",
    shipping: "Kargo",
    total: "Toplam",
    calculating: "Fiyatlar hesaplanıyor…",
    printShipping: (quantity: number) =>
      `Teslimat hesaplaması: İlk baskı için 200 TL${quantity > 1 ? ` + ${quantity - 1} ek baskı için ${20 * (quantity - 1)} TL` : ""}. Orijinal eserlerde kargo ücretsizdir.`,
    originalsFree: "Orijinal eserlerin Türkiye içi kargosu ücretsizdir.",
    internationalShipping:
      "Uluslararası orijinal eser kargosu sipariş başına sabit 100 USD'dir.",
    empty: "Sepetiniz boş",
    returnShop: "Mağazaya dön",
    uploadRequired:
      "Siparişi göndermeden önce banka havalesi dekontunuzu yükleyin.",
    submitError: "Sipariş gönderilemedi.",
    toastError: "Sipariş gönderilemedi",
    copied: (label: string) => `${label} kopyalandı`,
    copyLabel: (label: string) => `${label} bilgisini kopyala`,
    successDocumentTitle: "Sipariş alındı | Aida Ramezani",
    pending: "Ödeme kontrolü bekleniyor",
    received: "Siparişiniz alındı",
    awaiting: (number: string) => (
      <>
        Siparişinizin (<strong>{number}</strong>) ödeme doğrulaması bekleniyor.
      </>
    ),
    confirmation: (email: string) => (
      <>Onay e-postası {email} adresine gönderildi.</>
    ),
    reviewTransfer:
      "Aida havale dekontunu kontrol edecek ve ödeme onaylandıktan sonra siparişinizi hazırlamaya başlayacaktır.",
    returnStudio: "Stüdyoya dön",
  },
};

export default function Checkout({
  market,
}: {
  market: "turkiye" | "international_original";
}) {
  const region: ShoppingRegion = market === "turkiye" ? "TR" : "INTERNATIONAL";
  const { toast } = useToast();
  const { locale } = useLocale();
  const [, navigate] = useLocation();
  const copyText = CHECKOUT_COPY[locale === "tr" ? "tr" : "en"];
  const cart = useMemo(() => loadCart(region), [region]);
  const key = `checkout-draft:${market}`;
  const [form, setForm] = useState<typeof initial>(() => {
    const base = {
      ...initial,
      countryCode: market === "turkiye" ? "TR" : "",
      countryName: market === "turkiye" ? "Türkiye" : "",
    };
    try {
      return {
        ...base,
        ...JSON.parse(sessionStorage.getItem(key) || "{}"),
        consent: false,
      };
    } catch {
      return base;
    }
  });
  const [quote, setQuote] = useState<Quote | null>(null),
    [bank, setBank] = useState<Bank | null>(null),
    [receipt, setReceipt] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [copied, setCopied] = useState("");
  useEffect(() => {
    document.title = copyText.documentTitle;
  }, [copyText.documentTitle]);
  useEffect(() => {
    if (error)
      toast({
        title: copyText.toastError,
        description: error,
        variant: "destructive",
      });
  }, [error, toast, copyText.toastError]);
  const idempotency = useMemo(() => {
    const k = `checkout-idempotency:${market}`;
    let value = sessionStorage.getItem(k);
    if (!value) {
      value = crypto.randomUUID();
      sessionStorage.setItem(k, value);
    }
    return value;
  }, [market]);
  const reference = `PAY-${idempotency.slice(0, 8).toUpperCase()}`;
  const countries = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    return COUNTRY_CODES.map((code) => ({
      code,
      name: names.of(code) || code,
    })).sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);
  useEffect(() => {
    sessionStorage.setItem(key, JSON.stringify({ ...form, consent: false }));
  }, [form, key]);
  useEffect(() => {
    trackAnalytics("checkout_started", {
      metadata: { market, productCount: cart.length },
    });
    fetch("/api/checkout/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ market, items: itemsFor(cart) }),
    })
      .then(async (r) => {
        const p = await r.json();
        if (!r.ok) throw new Error(p.error);
        setQuote(p);
        return fetch(`/api/checkout/bank/${p.currency}`);
      })
      .then(async (r) => {
        const p = await r.json();
        if (!r.ok) throw new Error(p.error);
        setBank(p);
        trackAnalytics("bank_instructions_viewed", { metadata: { market } });
      })
      .catch((e) => setError(e.message));
  }, [market]);
  const set = (name: string, value: any) =>
    setForm((current) => ({ ...current, [name]: value }));
  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(copyText.copied(label));
    setTimeout(() => setCopied(""), 1800);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receipt || !quote || !bank) return setError(copyText.uploadRequired);
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...form,
        market,
        language: locale,
        idempotencyKey: idempotency,
        items: itemsFor(cart),
        phone:
          market === "turkiye"
            ? `+90${form.phone.replace(/\D/g, "").replace(/^0/, "")}`
            : form.phone.trim(),
        city: market === "turkiye" ? form.district : form.city,
      };
      const data = new FormData();
      data.append("payload", JSON.stringify(payload));
      data.append("receipt", receipt);
      trackAnalytics("receipt_upload_started", { metadata: { market } });
      const response = await fetch("/api/checkout/orders", {
        method: "POST",
        body: data,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      trackAnalytics("order_submitted", {
        metadata: {
          market,
          currency: quote.currency,
          productCount: quote.items.length,
        },
      });
      clearCart(region);
      sessionStorage.removeItem(key);
      sessionStorage.removeItem(`checkout-idempotency:${market}`);
      navigate(`/checkout/success/${result.orderNumber}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copyText.submitError);
    } finally {
      setBusy(false);
    }
  };
  if (!cart.length && !quote)
    return (
      <main className="checkout-page">
        <div className="checkout-empty">
          <h1>{copyText.empty}</h1>
          <Link
            href={
              market === "turkiye" ? "/shop/turkiye" : "/shop/international"
            }
            className="button-primary"
          >
            {copyText.returnShop}
          </Link>
        </div>
      </main>
    );
  return (
    <main className="checkout-page">
      <div className="checkout-progress" aria-label={copyText.progressLabel}>
        <span>{copyText.basketStep}</span>
        <strong>{copyText.deliveryStep}</strong>
        <strong>{copyText.paymentStep}</strong>
        <span>{copyText.completeStep}</span>
      </div>
      <div className="checkout-layout">
        <form onSubmit={submit} className="checkout-form" noValidate>
          <header>
            <p className="eyebrow">{copyText.eyebrow}</p>
            <h1>
              {market === "turkiye"
                ? copyText.turkiyeTitle
                : copyText.internationalTitle}
            </h1>
            <p>{copyText.intro}</p>
          </header>
          {error && (
            <div role="alert" tabIndex={-1} className="checkout-error">
              {error}
            </div>
          )}
          <section className="checkout-panel">
            <h2>{copyText.contact}</h2>
            <div className="checkout-fields">
              <Field label={copyText.fullName}>
                <input
                  required
                  autoComplete="name"
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                />
              </Field>
              <Field label={copyText.email}>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </Field>
              <Field
                label={
                  market === "turkiye"
                    ? copyText.phoneTr
                    : copyText.phoneInternational
                }
              >
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  placeholder={market === "turkiye" ? "5xxxxxxxxx" : "+44…"}
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </Field>
            </div>
          </section>
          <section className="checkout-panel">
            <h2>{copyText.deliveryAddress}</h2>
            <div className="checkout-fields">
              {market === "turkiye" ? (
                <>
                  <Field label={copyText.country}>
                    <input value="Türkiye" readOnly />
                  </Field>
                  <Field label={copyText.province}>
                    <select
                      required
                      autoComplete="address-level1"
                      value={form.province}
                      onChange={(e) => set("province", e.target.value)}
                    >
                      <option value="">{copyText.chooseProvince}</option>
                      {PROVINCES.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={copyText.district}>
                    <input
                      required
                      autoComplete="address-level2"
                      value={form.district}
                      onChange={(e) => set("district", e.target.value)}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label={copyText.country}>
                    <select
                      required
                      autoComplete="country-name"
                      value={form.countryCode}
                      onChange={(e) => {
                        const found = countries.find(
                          (x) => x.code === e.target.value,
                        );
                        setForm((c) => ({
                          ...c,
                          countryCode: e.target.value,
                          countryName: found?.name || "",
                        }));
                      }}
                    >
                      <option value="">{copyText.chooseCountry}</option>
                      {countries.map((x) => (
                        <option key={x.code} value={x.code}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={copyText.city}>
                    <input
                      required
                      autoComplete="address-level2"
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                    />
                  </Field>
                  <Field label={copyText.region}>
                    <input
                      required
                      autoComplete="address-level1"
                      value={form.province}
                      onChange={(e) => set("province", e.target.value)}
                    />
                  </Field>
                </>
              )}
              <Field
                label={
                  market === "turkiye"
                    ? copyText.postalTr
                    : copyText.postalInternational
                }
              >
                <input
                  required
                  autoComplete="postal-code"
                  value={form.postalCode}
                  onChange={(e) => set("postalCode", e.target.value)}
                />
              </Field>
              <div className="checkout-field--wide">
                <Field label={copyText.fullAddress}>
                  <textarea
                    required
                    rows={5}
                    autoComplete="street-address"
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder={copyText.addressPlaceholder}
                  />
                </Field>
              </div>
              <div className="checkout-field--wide">
                <Field label={copyText.deliveryInstructions}>
                  <textarea
                    rows={3}
                    value={form.deliveryNotes}
                    onChange={(e) => set("deliveryNotes", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </section>
          {quote && bank && (
            <section className="checkout-panel checkout-bank">
              <p className="eyebrow">{copyText.payment}</p>
              <h2>{copyText.bankTitle}</h2>
              <p>{copyText.bankIntro}</p>
              <CopyRow
                label={copyText.amount}
                value={money(quote.grandTotalMinor, quote.currency)}
                onCopy={copy}
                copyLabel={copyText.copyLabel(copyText.amount)}
              />
              <CopyRow
                label={copyText.accountHolder}
                value={bank.account_holder}
              />
              <CopyRow label={copyText.bank} value={bank.bank_name} />
              <CopyRow
                label="IBAN"
                value={bank.iban}
                onCopy={copy}
                copyLabel={copyText.copyLabel("IBAN")}
              />
              {bank.swift_bic && (
                <CopyRow label="SWIFT / BIC" value={bank.swift_bic} />
              )}
              <CopyRow
                label={copyText.paymentReference}
                value={reference}
                onCopy={copy}
                copyLabel={copyText.copyLabel(copyText.paymentReference)}
              />
              {bank.instructions && (
                <p className="checkout-bank__note">{bank.instructions}</p>
              )}
            </section>
          )}
          <section className="checkout-panel">
            <h2>{copyText.receipt}</h2>
            <p>{copyText.receiptIntro}</p>
            <label className="receipt-upload">
              <Upload aria-hidden="true" />
              <span>
                {receipt
                  ? `${receipt.name} · ${(receipt.size / 1024 / 1024).toFixed(2)} MB`
                  : copyText.chooseReceipt}
              </span>
              <input
                required
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                capture="environment"
                onChange={(e) => {
                  setReceipt(e.target.files?.[0] || null);
                  trackAnalytics("receipt_upload_completed", {
                    metadata: { market },
                  });
                }}
              />
            </label>
            {receipt && (
              <button
                type="button"
                className="button-link"
                onClick={() => setReceipt(null)}
              >
                {copyText.removeFile}
              </button>
            )}
            <label className="checkout-consent">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => set("consent", e.target.checked)}
                required
              />
              <span>
                {copyText.consentBefore}{" "}
                <Link href="/privacy">{copyText.privacy}</Link>
              </span>
            </label>
            <input
              className="sr-only"
              tabIndex={-1}
              autoComplete="off"
              value={form.honey}
              onChange={(e) => set("honey", e.target.value)}
            />
            <button
              disabled={busy || !quote || !bank}
              className="button-primary checkout-submit"
            >
              {busy
                ? copyText.submitting
                : market === "turkiye"
                  ? copyText.submitTr
                  : copyText.submitInternational}
            </button>
          </section>
        </form>
        <aside className="checkout-summary">
          <p className="eyebrow">{copyText.summary}</p>
          <h2>{copyText.review}</h2>
          {quote ? (
            <>
              <ul>
                {quote.items.map((item, index) => (
                  <li key={index}>
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <strong>
                      {money(item.lineTotalMinor, quote.currency)}
                    </strong>
                  </li>
                ))}
              </ul>
              <dl>
                <div>
                  <dt>{copyText.products}</dt>
                  <dd>{money(quote.subtotalMinor, quote.currency)}</dd>
                </div>
                <div>
                  <dt>{copyText.shipping}</dt>
                  <dd>{money(quote.shippingMinor, quote.currency)}</dd>
                </div>
                <div className="checkout-total">
                  <dt>{copyText.total}</dt>
                  <dd>{money(quote.grandTotalMinor, quote.currency)}</dd>
                </div>
              </dl>
              <p className="checkout-shipping-copy">
                {market === "turkiye"
                  ? quote.printQuantity
                    ? copyText.printShipping(quote.printQuantity)
                    : copyText.originalsFree
                  : copyText.internationalShipping}
              </p>
            </>
          ) : (
            <p>{copyText.calculating}</p>
          )}
        </aside>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {copied}
      </p>
    </main>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="checkout-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function CopyRow({
  label,
  value,
  onCopy,
  copyLabel,
}: {
  label: string;
  value: string;
  onCopy?: (label: string, value: string) => void;
  copyLabel?: string;
}) {
  return (
    <div className="checkout-copy-row">
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
      {onCopy && (
        <button
          type="button"
          onClick={() => onCopy(label, value)}
          aria-label={copyLabel || `Copy ${label}`}
        >
          <Copy />
        </button>
      )}
    </div>
  );
}

export function CheckoutSuccess({ orderNumber }: { orderNumber: string }) {
  const { locale } = useLocale();
  const copyText = CHECKOUT_COPY[locale === "tr" ? "tr" : "en"];
  const [order, setOrder] = useState<any>(null);
  useEffect(() => {
    document.title = copyText.successDocumentTitle;
  }, [copyText.successDocumentTitle]);
  useEffect(() => {
    fetch(`/api/checkout/orders/${encodeURIComponent(orderNumber)}`)
      .then((r) => r.json())
      .then(setOrder);
  }, [orderNumber]);
  return (
    <main className="checkout-page">
      <section className="checkout-success">
        <span className="checkout-success__icon">
          <Check />
        </span>
        <p className="eyebrow">{copyText.pending}</p>
        <h1>{copyText.received}</h1>
        <p>{copyText.awaiting(orderNumber)}</p>
        {order && (
          <>
            <p>{copyText.confirmation(order.customer_email)}</p>
            <p className="checkout-success__total">
              {money(order.grand_total_minor, order.currency)}
            </p>
          </>
        )}
        <p>{copyText.reviewTransfer}</p>
        <Link href="/" className="button-primary">
          {copyText.returnStudio}
        </Link>
      </section>
    </main>
  );
}
