import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n";
import { Layout } from "@/components/layout";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import NewOrder from "@/pages/new-order";
import Menu from "@/pages/menu";
import Customers from "@/pages/customers";
import Inventory from "@/pages/inventory";
import Recipes from "@/pages/recipes";
import Scheduled from "@/pages/scheduled";
import Bills from "@/pages/bills";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";

setAuthTokenGetter(() => localStorage.getItem("mufaz_token"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function AppRouter() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <Layout>
          <Dashboard />
        </Layout>
      </Route>
      <Route path="/dashboard">
        <Layout>
          <Dashboard />
        </Layout>
      </Route>
      <Route path="/orders/new">
        <Layout>
          <NewOrder />
        </Layout>
      </Route>
      <Route path="/orders">
        <Layout>
          <Orders />
        </Layout>
      </Route>
      <Route path="/menu">
        <Layout>
          <Menu />
        </Layout>
      </Route>
      <Route path="/customers">
        <Layout>
          <Customers />
        </Layout>
      </Route>
      <Route path="/inventory">
        <Layout>
          <Inventory />
        </Layout>
      </Route>
      <Route path="/recipes">
        <Layout>
          <Recipes />
        </Layout>
      </Route>
      <Route path="/scheduled">
        <Layout>
          <Scheduled />
        </Layout>
      </Route>
      <Route path="/bills">
        <Layout>
          <Bills />
        </Layout>
      </Route>
      <Route path="/reports">
        <Layout>
          <Reports />
        </Layout>
      </Route>
      <Route path="/settings">
        <Layout>
          <Settings />
        </Layout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRouter />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
