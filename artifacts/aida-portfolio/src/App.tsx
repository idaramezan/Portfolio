import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Route, Switch, Router as WouterRouter } from "wouter";

import Shell from "@/components/layout/Shell";
import Home from "@/pages/Home";
import Prints from "@/pages/Prints";
import Gallery from "@/pages/Gallery";
import ShopOriginals from "@/pages/ShopOriginals";
import About from "@/pages/About";
import Admin from "@/pages/Admin";
import StudioMail from "@/pages/StudioMail";
import StudioMailDetail from "@/pages/StudioMailDetail";
import HowToCollect from "@/pages/HowToCollect";
import { CurrencyProvider } from "@/lib/currency";
import { LocaleProvider } from "@/lib/locale";
import International from "@/pages/International";
import Links from "@/pages/Links";
import RegionalShop, { type ShopCategory } from "@/components/RegionalShop";
import MysteryMail from "@/pages/MysteryMail";
import RegionalLanding from "@/pages/RegionalLanding";
import OriginalDetail from "@/pages/OriginalDetail";
import Newsletter from "@/pages/Newsletter";

const queryClient = new QueryClient();

function RedirectTo({ to }: { to: string }) {
  const search = window.location.search;
  window.location.replace(`${to}${search}`);
  return null;
}

const regional =
  (region: "TR" | "INTERNATIONAL", category: ShopCategory) => () => (
    <RegionalShop region={region} category={category} />
  );

function Router() {
  return (
    <Switch>
      <Route path="/admin/*" component={Admin} />
      <Route path="/admin" component={Admin} />
      <Route path="/links" component={Links} />
      <Route>
        <Shell>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/gallery" component={Gallery} />
            <Route path="/shop/turkiye/originals/:slug">
              {() => <OriginalDetail market="turkiye" />}
            </Route>
            <Route
              path="/shop/turkiye/originals"
              component={regional("TR", "originals")}
            />
            <Route
              path="/shop/turkiye/prints"
              component={regional("TR", "prints")}
            />
            <Route path="/shop/turkiye/mystery-mail" component={MysteryMail} />
            <Route path="/shop/turkiye/studio-mail">
              <RedirectTo to="/shop/turkiye/mystery-mail" />
            </Route>
            <Route path="/shop/turkiye">
              {() => <RegionalLanding region="TR" />}
            </Route>
            <Route path="/shop/international/originals/:slug">
              {() => <OriginalDetail market="international" />}
            </Route>
            <Route
              path="/shop/international/originals"
              component={regional("INTERNATIONAL", "originals")}
            />
            <Route
              path="/shop/international/prints"
              component={regional("INTERNATIONAL", "prints")}
            />
            <Route path="/shop/international">
              {() => <RegionalLanding region="INTERNATIONAL" />}
            </Route>
            <Route path="/originals">
              <RedirectTo to="/shop/turkiye/originals" />
            </Route>
            <Route path="/shop">
              <RedirectTo to="/shop/turkiye/originals" />
            </Route>
            <Route path="/prints">
              <RedirectTo to="/shop/turkiye/prints" />
            </Route>
            <Route path="/studio-mail">
              <RedirectTo to="/shop/turkiye/mystery-mail" />
            </Route>
            <Route path="/studio-mail/:slug">
              <RedirectTo to="/shop/turkiye/mystery-mail" />
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <CurrencyProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </CurrencyProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}

export default App;
