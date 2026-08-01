import { useEffect, useState } from "react";
import {
  getInternationalProductsCached,
  type InternationalProduct,
} from "@/lib/fourthwall";
export function useInternationalProducts() {
  const [products, setProducts] = useState<InternationalProduct[]>([]);
  const [shopUrl, setShopUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    getInternationalProductsCached()
      .then((data) => {
        if (!active) return;
        setProducts(data.products);
        setShopUrl(data.shopUrl);
      })
      .catch((reason: any) => {
        if (!active) return;
        setError(true);
        setShopUrl(reason?.fallback?.shopUrl || null);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);
  return { products, shopUrl, loading, error };
}
