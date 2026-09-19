import type { CurrencyCode } from "@/lib/market";
import type { ProductSale } from "@/lib/store";
import { calculateProductSale, getSaleStatus } from "@/lib/product-sale";
import { formatCurrencyMinor } from "@/lib/currency";

const dateValue = (value?: string) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";
export default function SaleEditor({
  regularPriceMinor,
  currency,
  sale,
  onChange,
}: {
  regularPriceMinor: number;
  currency: CurrencyCode;
  sale?: ProductSale;
  onChange: (sale: ProductSale) => void;
}) {
  const value: ProductSale = sale || {
    enabled: false,
    percentage: 20,
    allowDiscountCodes: true,
  };
  const pricing = calculateProductSale(regularPriceMinor, value);
  const status = getSaleStatus(value);
  const patch = (changes: Partial<ProductSale>) =>
    onChange({ ...value, ...changes });
  return (
    <section className="border-t border-ink/10 pt-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-coral">
            Sale / Discount
          </p>
          <span className="mt-1 inline-block text-xs font-bold uppercase tracking-wider text-ink/45">
            {status}
          </span>
        </div>
        <label className="flex items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(event) => patch({ enabled: event.target.checked })}
          />
          Put this item on sale
        </label>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <label className="font-semibold">
          Discount %
          <input
            className="mt-2 min-h-11 w-full border border-ink/20 px-3"
            type="number"
            min="1"
            max="100"
            step="0.01"
            value={value.percentage}
            onChange={(event) =>
              patch({
                percentage: Math.min(
                  100,
                  Math.max(0, Number(event.target.value)),
                ),
              })
            }
          />
        </label>
        <label>
          Starts <span className="text-ink/45">(optional)</span>
          <input
            className="mt-2 min-h-11 w-full border border-ink/20 px-3"
            type="datetime-local"
            value={dateValue(value.startsAt)}
            onChange={(event) =>
              patch({
                startsAt: event.target.value
                  ? new Date(event.target.value).toISOString()
                  : undefined,
              })
            }
          />
        </label>
        <label>
          Ends <span className="text-ink/45">(optional)</span>
          <input
            className="mt-2 min-h-11 w-full border border-ink/20 px-3"
            type="datetime-local"
            value={dateValue(value.endsAt)}
            onChange={(event) =>
              patch({
                endsAt: event.target.value
                  ? new Date(event.target.value).toISOString()
                  : undefined,
              })
            }
          />
        </label>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.allowDiscountCodes}
          onChange={(event) =>
            patch({ allowDiscountCodes: event.target.checked })
          }
        />
        Allow discount codes on this sale item
      </label>
      <dl className="mt-5 grid grid-cols-3 gap-3 bg-ink/[.035] p-4 text-sm">
        <div>
          <dt className="text-ink/50">Regular price</dt>
          <dd className="mt-1 font-bold">
            {formatCurrencyMinor(regularPriceMinor, currency)}
          </dd>
        </div>
        <div>
          <dt className="text-ink/50">Sale price</dt>
          <dd className="mt-1 font-bold text-coral">
            {formatCurrencyMinor(pricing.finalPriceMinor, currency)}
          </dd>
        </div>
        <div>
          <dt className="text-ink/50">You save</dt>
          <dd className="mt-1 font-bold">
            {formatCurrencyMinor(pricing.discountAmountMinor, currency)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
