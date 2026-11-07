import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "@/lib/i18n";
import { PrototypeProvider } from "@/contexts/PrototypeContext";
import { MarketplaceLayout } from "@/components/MarketplaceLayout";
import { Link } from "wouter";

const Home = lazy(() => import("@/pages/Home"));
const RoleSelection = lazy(() => import("@/pages/RoleSelection"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const FarmerDashboard = lazy(() => import("@/pages/FarmerDashboard"));
const FarmerHome = lazy(() => import("@/pages/FarmerDashboard").then(module => ({ default: module.FarmerHome })));
const MachineDetail = lazy(() => import("@/pages/MachineDetail"));
const FarmerBookings = lazy(() => import("@/pages/FarmerBookings"));
const BookingDetail = lazy(() => import("@/pages/BookingDetail"));
const OnSiteVerification = lazy(() => import("@/pages/OnSiteVerification"));
const OwnerDashboard = lazy(() => import("@/pages/OwnerDashboard"));
const OwnerMachinery = lazy(() => import("@/pages/OwnerMachinery"));
const MachineRegistration = lazy(() => import("@/pages/MachineRegistration"));
const OwnerRequests = lazy(() => import("@/pages/OwnerRequests"));
const VerificationPage = lazy(() => import("@/pages/VerificationPage"));
const Earnings = lazy(() => import("@/pages/Earnings"));
const Profile = lazy(() => import("@/pages/Profile"));
const HelpCenter = lazy(() => import("@/pages/HelpCenter"));

function NotFoundPage() {
  return <MarketplaceLayout><section className="page-container not-found-card"><span className="eyebrow">VAYAL · PAGE NOT FOUND</span><h1>This path is outside the prototype.</h1><p>Head back to the start or choose a demo role to continue.</p><div className="not-found-actions"><Link className="button button-secondary" href="/">Home</Link><Link className="button button-primary" href="/start">Choose a role</Link></div></section></MarketplaceLayout>;
}

function Router() {
  return <Suspense fallback={<div className="route-loading" aria-live="polite"><span className="brand-mark"><i /><i /></span><b>Opening Vayal…</b></div>}>
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/start" component={RoleSelection} />
      <Route path="/auth/:role" component={AuthPage} />
      <Route path="/machines" component={FarmerDashboard} />
      <Route path="/farmer/find" component={FarmerDashboard} />
      <Route path="/farmer" component={FarmerHome} />
      <Route path="/farmer/bookings/:id/verify" component={OnSiteVerification} />
      <Route path="/farmer/bookings/:id" component={BookingDetail} />
      <Route path="/farmer/bookings" component={FarmerBookings} />
      <Route path="/machine/:id" component={MachineDetail} />
      <Route path="/owner" component={OwnerDashboard} />
      <Route path="/owner/machinery/new" component={MachineRegistration} />
      <Route path="/owner/machinery/:id" component={MachineRegistration} />
      <Route path="/owner/machinery" component={OwnerMachinery} />
      <Route path="/owner/requests/:id/verify" component={OnSiteVerification} />
      <Route path="/owner/requests" component={OwnerRequests} />
      <Route path="/owner/verification" component={VerificationPage} />
      <Route path="/owner/earnings" component={Earnings} />
      <Route path="/profile" component={Profile} />
      <Route path="/help" component={HelpCenter} />
      <Route component={NotFoundPage} />
    </Switch>
  </Suspense>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><LanguageProvider><TooltipProvider><PrototypeProvider><Toaster /><Router /></PrototypeProvider></TooltipProvider></LanguageProvider></ThemeProvider></ErrorBoundary>;
}
