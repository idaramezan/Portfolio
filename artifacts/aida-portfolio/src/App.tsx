import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Route, Switch, Router as WouterRouter, useLocation } from "wouter";
import { lazy, Suspense, useEffect } from "react";

import Shell from "@/components/layout/Shell";
import Home from "@/pages/Home";
import Gallery from "@/pages/Gallery";
import About from "@/pages/About";
import HowToCollect from "@/pages/HowToCollect";
import { CurrencyProvider } from "@/lib/currency";
import { LocaleProvider } from "@/lib/locale";
import Links from "@/pages/Links";
import OriginalDetail from "@/pages/OriginalDetail";
import PrintDetail from "@/pages/PrintDetail";
import Newsletter from "@/pages/Newsletter";
import AnalyticsConsent from "@/components/AnalyticsConsent";
import { analyticsConsent, trackAnalytics } from "@/lib/analytics";
import StickerDropExperience from "@/components/StickerDropExperience";
import Checkout, { CheckoutSuccess } from "@/pages/Checkout";
import EventApply from "@/pages/EventApply";
import Events from "@/pages/Events";
import EventDetail from "@/pages/EventDetail";
import EventReview from "@/pages/EventReview";
import HundredWindows from "@/pages/HundredWindows";
import { ShippingDestinationProvider } from "@/lib/shipping-destination";
import UnifiedShop from "@/pages/UnifiedShop";
import AceoDetail from "@/pages/AceoDetail";

const queryClient = new QueryClient();
const Admin = lazy(() => import("@/pages/Admin"));

function AdminRoute() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#f3efe6] font-semibold text-ink">
          Loading studio administration…
        </main>
      }
    >
      <Admin />
    </Suspense>
  );
}

function RedirectTo({ to }: { to: string }) {
  const search = window.location.search;
  window.location.replace(`${to}${search}`);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/admin/*" component={AdminRoute} />
      <Route path="/admin" component={AdminRoute} />
      <Route path="/links" component={Links} />
      <Route>
        <Shell>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/gallery" component={Gallery} />
            <Route path="/shop/turkiye/originals/:slug">
              {() => <OriginalDetail market="turkiye" />}
            </Route>
            <Route path="/shop/turkiye/originals">
              <RedirectTo to="/shop?category=originals" />
            </Route>
            <Route path="/shop/turkiye/prints/:slug">
              {() => <PrintDetail market="turkiye" />}
            </Route>
            <Route path="/shop/turkiye/prints">
              <RedirectTo to="/shop?category=prints" />
            </Route>
            <Route path="/shop/turkiye/mystery-mail">
              <RedirectTo to="/shop" />
            </Route>
            <Route path="/shop/turkiye/studio-mail">
              <RedirectTo to="/shop" />
            </Route>
            <Route path="/shop/turkiye">
              <RedirectTo to="/shop" />
            </Route>
            <Route path="/shop/international/originals/:slug">
              {() => <OriginalDetail market="international" />}
            </Route>
            <Route path="/shop/international/originals">
              <RedirectTo to="/shop?category=originals" />
            </Route>
            <Route path="/shop/international/prints">
              <RedirectTo to="/shop?category=prints" />
            </Route>
            <Route path="/shop/international">
              <RedirectTo to="/shop" />
            </Route>
            <Route path="/shop/originals/:slug">
              {() => <OriginalDetail market="turkiye" />}
            </Route>
            <Route path="/shop/aceos/:slug" component={AceoDetail} />
            <Route path="/shop/prints/:slug">
              {() => <PrintDetail market="turkiye" />}
            </Route>
            <Route path="/shop/mystery-mail">
              <RedirectTo to="/shop" />
            </Route>
            <Route path="/originals">
              <RedirectTo to="/shop?category=originals" />
            </Route>
            <Route path="/shop">
              <UnifiedShop />
            </Route>
            <Route path="/prints">
              <RedirectTo to="/shop?category=prints" />
            </Route>
            <Route path="/studio-mail">
              <RedirectTo to="/newsletter" />
            </Route>
            <Route path="/studio-mail/:slug">
              <RedirectTo to="/shop" />
            </Route>
            <Route path="/basket/turkiye">
              <RedirectTo to="/shop/turkiye" />
            </Route>
            <Route path="/basket/international">
              <RedirectTo to="/shop/international" />
            </Route>
            <Route path="/basket">
              <RedirectTo to="/shop/turkiye" />
            </Route>
            <Route path="/cart">
              <RedirectTo to="/shop/turkiye" />
            </Route>
            <Route path="/how-to-collect" component={HowToCollect} />
            <Route path="/about" component={About} />
            <Route path="/newsletter" component={Newsletter} />
            <Route path="/100-windows" component={HundredWindows} />
            <Route path="/studio-letter">
              <RedirectTo to="/newsletter" />
            </Route>
            <Route path="/event">
              <RedirectTo to="/events" />
            </Route>
            <Route path="/events/:slug/review/:token">
              {(params) => <EventReview token={params.token} />}
            </Route>
            <Route path="/checkout/turkiye">
              {() => <Checkout market="turkiye" />}
            </Route>
            <Route path="/checkout/international-originals">
              {() => <Checkout market="international_original" />}
            </Route>
            <Route path="/checkout/success/:orderNumber">
              {(params) => <CheckoutSuccess orderNumber={params.orderNumber} />}
            </Route>
            <Route path="/events/:eventId/apply">
              {(params) => <EventApply eventId={params.eventId} />}
            </Route>
            <Route path="/events/:slug">
              {(params) => <EventDetail slug={params.slug} />}
            </Route>
            <Route path="/events" component={Events} />
            <Route path="/international">
              <RedirectTo to="/shop/international" />
            </Route>
            <Route component={NotFound} />
          </Switch>
        </Shell>
      </Route>
    </Switch>
  );
}

function AnalyticsRouteTracker() {
  const [location] = useLocation();
  useEffect(() => {
    if (
      !analyticsConsent() ||
      location.startsWith("/admin") ||
      /^\/events\/[^/]+\/review\//.test(location)
    )
      return;
    trackAnalytics("page_view");
    if (location === "/shop/turkiye") trackAnalytics("turkiye_shop_opened");
    if (location === "/shop/international")
      trackAnalytics("international_shop_opened");
  }, [location]);
  useEffect(() => {
    const click = (event: MouseEvent) => {
      const element = (event.target as Element | null)?.closest("a,button");
      if (!element) return;
      const href = element instanceof HTMLAnchorElement ? element.href : "";
      if (href.includes("wa.me/")) trackAnalytics("whatsapp_checkout_started");
      else if (
        href &&
        new URL(href, window.location.href).origin !== window.location.origin
      )
        trackAnalytics("outbound_link_click", {
          metadata: { hrefDomain: new URL(href).hostname },
        });
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ShippingDestinationProvider>
          <CurrencyProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <AnalyticsRouteTracker />
                <StickerDropExperience />
                <Router />
              </WouterRouter>
              <Toaster />
              <AnalyticsConsent />
            </TooltipProvider>
          </CurrencyProvider>
        </ShippingDestinationProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}

export default App;
