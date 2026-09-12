import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ChevronDown, Globe2, X } from "lucide-react";
import {
  clearCart,
  loadCart,
  saveCart,
  setActiveShoppingRegion,
} from "@/lib/store";
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
  const [warnBasket, setWarnBasket] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const pending = useRef<((destination: ShippingDestination) => void) | null>(
    null,
  );
  const trigger = useRef<HTMLElement | null>(null);
  const dialog = useRef<HTMLElement | null>(null);
  const countrySelect = useRef<HTMLSelectElement | null>(null);

  const countries = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    return COUNTRY_CODES.map((code) => ({
      code,
      name: names.of(code) || code,
    })).sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);
  const selected = countries.find((country) => country.code === selectedCode);

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
    const scrollY = window.scrollY;
    const previous = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    requestAnimationFrame(() => countrySelect.current?.focus());
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      );
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => {
      Object.assign(document.body.style, previous);
      window.scrollTo(0, scrollY);
      document.removeEventListener("keydown", handleKeydown);
      trigger.current?.focus();
    };
  }, [open]);

  const openDestination = (
    afterConfirm?: (next: ShippingDestination) => void,
  ) => {
    trigger.current = document.activeElement as HTMLElement;
    pending.current = afterConfirm || null;
    setSelectedCode(destination?.countryCode || "");
    setWarnBasket(false);
    setUpdateError("");
    setOpen(true);
  };
  const confirm = async (force = false) => {
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
    setUpdating(true);
    setUpdateError("");
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try {
      if (force && selected.code !== "TR") {
        const aceos = loadCart("TR").filter((item) => item.kind === "aceo");
        clearCart("TR");
        if (aceos.length) {
          const international = loadCart("INTERNATIONAL").filter(
            (item) => item.kind !== "aceo",
          );
          saveCart([...international, ...aceos], "INTERNATIONAL");
        }
      }
      if (selected.code === "TR") {
        const international = loadCart("INTERNATIONAL");
        const aceos = international.filter((item) => item.kind === "aceo");
        if (aceos.length) {
          saveCart(
            international.filter((item) => item.kind !== "aceo"),
            "INTERNATIONAL",
          );
          const local = loadCart("TR").filter((item) => item.kind !== "aceo");
          saveCart([...local, ...aceos], "TR");
        }
      }
      const next: ShippingDestination = {
        countryCode: selected.code,
        countryName: selected.name,
        source: "user",
        confirmedByUser: true,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setDestination(next);
      setActiveShoppingRegion(
        next.countryCode === "TR" ? "TR" : "INTERNATIONAL",
      );
      trackAnalytics("shipping_destination_changed", {
        metadata: { countryCode: next.countryCode },
      });
      toast({
        title:
          locale === "tr"
            ? `Gönderim konumu ${next.countryName} olarak güncellendi.`
            : `Shipping destination updated to ${next.countryName}.`,
      });
      const action = pending.current;
      pending.current = null;
      action?.(next);
      setOpen(false);
    } catch {
      setUpdateError(
        locale === "tr"
          ? "Gönderim ülkeni güncelleyemedik. Lütfen tekrar dene."
          : "We couldn’t update your shipping country. Please try again.",
      );
    } finally {
      setUpdating(false);
    }
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
              ref={dialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="destination-title"
              className="destination-modal destination-modal--shipping"
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
                      : "Choose your shipping country so we can show the correct prices, availability and delivery options."}
                  </p>
                  <label className="destination-modal__select">
                    <span>
                      {locale === "tr" ? "Gönderim ülkesi" : "Shipping country"}
                    </span>
                    <select
                      ref={countrySelect}
                      value={selectedCode}
                      onChange={(event) => {
                        setSelectedCode(event.target.value);
                        setUpdateError("");
                      }}
                    >
                      <option value="">
                        {locale === "tr" ? "Ülke seç" : "Choose a country"}
                      </option>
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {updateError && (
                    <p className="destination-modal__error" role="alert">
                      {updateError}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={!selected || updating}
                    className="destination-modal__confirm"
                    onClick={() => void confirm()}
                  >
                    <span>
                      {updating
                        ? locale === "tr"
                          ? "Güncelleniyor…"
                          : "Updating…"
                        : selected
                          ? selected.name.length > 24
                            ? locale === "tr"
                              ? "Devam et"
                              : "Continue"
                            : locale === "tr"
                              ? `${selected.name} ile devam et`
                              : `Continue with ${selected.name}`
                          : locale === "tr"
                            ? "Ülke seç"
                            : "Choose country"}
                    </span>
                    <ArrowRight aria-hidden="true" />
                  </button>
                  <p className="destination-modal__reassurance">
                    {locale === "tr"
                      ? "Bunu site başlığından istediğin zaman değiştirebilirsin."
                      : "You can change this anytime from the site header."}
                  </p>
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
                      className="destination-modal__confirm"
                      disabled={updating}
                      onClick={() => void confirm(true)}
                    >
                      <span>
                        {updating
                          ? locale === "tr"
                            ? "Güncelleniyor…"
                            : "Updating…"
                          : locale === "tr"
                            ? "Konumu değiştir"
                            : "Change destination"}
                      </span>
                      <ArrowRight aria-hidden="true" />
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
  menu = false,
}: {
  compact?: boolean;
  utility?: boolean;
  menu?: boolean;
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
  if (menu)
    return (
      <button
        type="button"
        className="destination-control destination-control--menu"
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
            ? locale === "tr"
              ? "Konum belirleniyor…"
              : "Finding destination…"
            : destination?.countryName ||
              (locale === "tr" ? "Ülke seç" : "Choose country")}
        </span>
        <strong>
          {locale === "tr" ? "Değiştir" : "Change"}
        </strong>
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
