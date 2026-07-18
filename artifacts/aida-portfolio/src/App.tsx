import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import Shell from '@/components/layout/Shell';
import Home from '@/pages/Home';
import Prints from '@/pages/Prints';
import About from '@/pages/About';
import Gallery from '@/pages/Gallery';
import ShopOriginals from '@/pages/ShopOriginals';
import Admin from '@/pages/Admin';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Admin — no Shell nav/footer */}
      <Route path="/admin" component={Admin} />

      {/* Public site */}
      <Route>
        <Shell>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/gallery" component={Gallery} />
            <Route path="/originals" component={ShopOriginals} />
            <Route path="/prints" component={Prints} />
            <Route path="/about" component={About} />
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
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
