import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/language-context";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/app-layout";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Specialists from "@/pages/specialists";
import SpecialistProfile from "@/pages/specialist-profile";
import Evaluations from "@/pages/evaluations";
import NewEvaluation from "@/pages/new-evaluation";
import EvaluationDetail from "@/pages/evaluation-detail";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();

function AuthenticatedRoutes() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={() => {
          window.location.href = "/dashboard";
          return null;
        }} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/specialists" component={Specialists} />
        <Route path="/specialists/:id" component={SpecialistProfile} />
        <Route path="/evaluations" component={Evaluations} />
        <Route path="/evaluations/new" component={NewEvaluation} />
        <Route path="/evaluations/:id" component={EvaluationDetail} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route component={AuthenticatedRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
