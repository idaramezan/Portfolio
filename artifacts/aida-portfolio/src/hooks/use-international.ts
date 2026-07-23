import { useEffect, useState } from "react";
import {
  getInternationalProducts,
  type InternationalProduct,
} from "@/lib/fourthwall";
export function useInternationalProducts() {
  const [products, setProducts] = useState<InternationalProduct[]>([]);
  const [shopUrl, setShopUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    getInternationalProducts(controller.signal)
      .then((data) => {
        setProducts(data.products);
        setShopUrl(data.shopUrl);
      })
      .catch((reason: any) => {
        setError(true);
        setShopUrl(reason?.fallback?.shopUrl || null);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);
  return { products, shopUrl, loading, error };
}
