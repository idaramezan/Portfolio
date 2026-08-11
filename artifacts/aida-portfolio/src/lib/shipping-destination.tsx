import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Globe2, Search, X } from "lucide-react";
import { clearCart, loadCart, setActiveShoppingRegion } from "@/lib/store";
import { useLocale } from "@/lib/locale";
import { useToast } from "@/hooks/use-toast";
import { trackAnalytics } from "@/lib/analytics";

export type ShippingDestination = {
  countryCode: string;
  countryName: string;
  source: "geo" | "user";
  confirmedByUser: boolean;
};

const STORAGE_KEY = "aida-shipping-destination-v1";
// Complete ISO 3166-1 alpha-2 list. Product eligibility is a separate concern.
export const COUNTRY_CODES =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  );

type DestinationContextValue = {
  destination: ShippingDestination | null;
  isTürkiye: boolean;
  loading: boolean;
  openDestination: (
    afterConfirm?: (destination: ShippingDestination) => void,
  ) => void;
};

const DestinationContext = createContext<DestinationContextValue | null>(null);

export function getStoredShippingDestination(): ShippingDestination | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return value?.countryCode && value?.countryName ? value : null;
  } catch {
    return null;
  }
}

export function ShippingDestinationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale } = useLocale();
  const { toast } = useToast();
  const [destination, setDestination] = useState<ShippingDestination | null>(
    getStoredShippingDestination,
  );
  const [loading, setLoading] = useState(!destination);
  const [open, setOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState(
    destination?.countryCode || "",
  );
  const [search, setSearch] = useState("");
  const [warnBasket, setWarnBasket] = useState(false);
  const pending = useRef<((destination: ShippingDestination) => void) | null>(
    null,
  );
  const trigger = useRef<HTMLElement | null>(null);

  const countries = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    return COUNTRY_CODES.map((code) => ({
      code,
      name: names.of(code) || code,
    })).sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);
  const selected = countries.find((country) => country.code === selectedCode);
  const aliases: Record<string, string> = {
    US: "united states usa america",
    TR: "türkiye turkey turkiye",
  };
  const filtered = countries.filter((country) =>
    `${country.name} ${country.code} ${aliases[country.code] || ""}`
      .toLocaleLowerCase(locale)
      .includes(search.toLocaleLowerCase(locale)),
  );

  useEffect(() => {
    if (destination) {
      setActiveShoppingRegion(
        destination.countryCode === "TR" ? "TR" : "INTERNATIONAL",
      );
      setLoading(false);
      return;
    }
    fetch("/api/currency")
      .then((response) => response.json())
      .then((data) => {
        const code = String(data.country || "").toUpperCase();
        if (!COUNTRY_CODES.includes(code)) return;
        const names = new Intl.DisplayNames([locale], { type: "region" });
        const next: ShippingDestination = {
          countryCode: code,
          countryName: names.of(code) || code,
          source: "geo",
          confirmedByUser: false,
        };
        setDestination(next);
        setActiveShoppingRegion(code === "TR" ? "TR" : "INTERNATIONAL");
        trackAnalytics("shipping_destination_detected", {
          metadata: { countryCode: code },
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) =>
      event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", close);
      trigger.current?.focus();
    };
  }, [open]);

  const openDestination = (
    afterConfirm?: (next: ShippingDestination) => void,
  ) => {
    trigger.current = document.activeElement as HTMLElement;
    pending.current = afterConfirm || null;
    setSelectedCode(destination?.countryCode || "");
    setSearch("");
    setWarnBasket(false);
    setOpen(true);
  };
  const confirm = (force = false) => {
    if (!selected) return;
    if (
      !force &&
      destination?.countryCode === "TR" &&
      selected.code !== "TR" &&
      loadCart("TR").length
    ) {
      setWarnBasket(true);
      return;
    }
    if (force && selected.code !== "TR") clearCart("TR");
    const next: ShippingDestination = {
      countryCode: selected.code,
      countryName: selected.name,
      source: "user",
      confirmedByUser: true,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setDestination(next);
    setActiveShoppingRegion(next.countryCode === "TR" ? "TR" : "INTERNATIONAL");
    trackAnalytics("shipping_destination_changed", {
      metadata: { countryCode: next.countryCode },
    });
    toast({
      title:
        locale === "tr"
          ? `Gönderim konumu ${next.countryName} olarak güncellendi.`
          : `Shipping destination updated to ${next.countryName}.`,
    });
    setOpen(false);
    const action = pending.current;
    pending.current = null;
    action?.(next);
  };

  return (
    <DestinationContext.Provider
      value={{
        destination,
        isTürkiye: destination?.countryCode === "TR",
        loading,
        openDestination,
      }}
    >
      {children}
      {open &&
        createPortal(
          <div
            className="destination-modal__overlay"
            onMouseDown={(event) =>
              event.target === event.currentTarget && setOpen(false)
            }
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="destination-title"
              className="destination-modal"
            >
              <button
                type="button"
                className="destination-modal__close"
                onClick={() => setOpen(false)}
                aria-label={
                  locale === "tr"
                    ? "Pencereyi kapat"
                    : "Close destination dialog"
                }
              >
                <X aria-hidden="true" />
              </button>
              {!warnBasket ? (
                <>
                  <p className="eyebrow">
                    {locale === "tr"
                      ? "GÖNDERİM KONUMU"
                      : "SHIPPING DESTINATION"}
                  </p>
                  <h2 id="destination-title">
                    {locale === "tr"
                      ? "Siparişini nereye gönderelim?"
                      : "Where should we send your order?"}
                  </h2>
                  <p>
                    {locale === "tr"
                      ? "Ülken için doğru fiyatları ve teslimat seçeneklerini göstereceğiz."
                      : "We'll show the right prices and delivery options for your country."}
                  </p>
                  <label className="destination-modal__search">
                    <span>
                      {locale === "tr" ? "Ülke ara" : "Search countries"}
                    </span>
                    <span>
                      <Search aria-hidden="true" />
                      <input
                        autoFocus
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                    </span>
                  </label>
                  <label className="destination-modal__select">
                    <span>
                      {locale === "tr" ? "Gönderim ülkesi" : "Shipping country"}
                    </span>
                    <select
                      value={selectedCode}
                      onChange={(event) => setSelectedCode(event.target.value)}
                    >
                      <option value="">
                        {locale === "tr" ? "Ülke seç" : "Choose a country"}
                      </option>
                      {filtered.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={!selected}
                    className="paper-button paper-button--pink paper-button--md destination-modal__confirm"
                    onClick={() => confirm()}
                  >
                    {selected
                      ? locale === "tr"
                        ? `${selected.name} konumunu kullan`
                        : `Use ${selected.name}`
                      : locale === "tr"
                        ? "Ülke seç"
                        : "Choose country"}
                  </button>
                </>
              ) : (
                <>
                  <p className="eyebrow">
                    {locale === "tr" ? "SEPETİN" : "YOUR BASKET"}
                  </p>
                  <h2 id="destination-title">
                    {locale === "tr"
                      ? "Sepetinde Türkiye için hazırlanan ürünler var."
                      : "Your basket contains items prepared for Türkiye."}
                  </h2>
                  <p>
                    {locale === "tr"
                      ? "Gönderim konumunu değiştirmek bu ürünlerin sipariş yöntemini değiştirir. Yerel ürünler sepetinden kaldırılır."
                      : "Changing your shipping destination changes how these pieces can be ordered. Local items will be removed from your basket."}
                  </p>
                  <div className="destination-modal__actions">
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => {
                        setSelectedCode("TR");
                        setWarnBasket(false);
                      }}
                    >
                      {locale === "tr" ? "Türkiye'yi koru" : "Keep Türkiye"}
                    </button>
                    <button
                      type="button"
                      className="paper-button paper-button--pink paper-button--md"
                      onClick={() => confirm(true)}
                    >
                      {locale === "tr"
                        ? "Konumu değiştir"
                        : "Change destination"}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>,
          document.body,
        )}
    </DestinationContext.Provider>
  );
}

export function useShippingDestination() {
  const value = useContext(DestinationContext);
  if (!value)
    throw new Error(
      "useShippingDestination must be used inside ShippingDestinationProvider",
    );
  return value;
}

export function DestinationControl({
  compact = false,
  utility = false,
}: {
  compact?: boolean;
  utility?: boolean;
}) {
  const { destination, loading, openDestination } = useShippingDestination();
  const { locale } = useLocale();
  const label = loading
    ? locale === "tr"
      ? "Konum belirleniyor"
      : "Finding destination"
    : destination
      ? locale === "tr"
        ? `${destination.countryName} konumuna gönderim`
        : `Shipping to ${destination.countryName}`
      : locale === "tr"
        ? "Gönderim konumu seçilmedi"
        : "Shipping destination not set";
  if (utility)
    return (
      <button
        type="button"
        className="destination-utility"
        onClick={() => openDestination()}
        aria-label={
          locale === "tr"
            ? `Gönderim konumunu değiştir. Şu anda ${destination?.countryName || "seçilmedi"}.`
            : `Change shipping destination. Currently ${destination?.countryName || "not selected"}.`
        }
      >
        <Globe2 aria-hidden="true" />
        <span>
          {loading
            ? "…"
            : destination?.countryName ||
              (locale === "tr" ? "Ülke" : "Country")}
        </span>
        <ChevronDown aria-hidden="true" />
      </button>
    );
  return (
    <button
      type="button"
      className={`destination-control ${compact ? "destination-control--compact" : ""}`}
      onClick={() => openDestination()}
    >
      <span>{label}</span>
      <strong>
        {locale === "tr"
          ? destination
            ? "Değiştir"
            : "Ülke seç"
          : destination
            ? "Change"
            : "Choose country"}
      </strong>
    </button>
  );
}
