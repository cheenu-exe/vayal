import { ArrowRight, CircleHelp, LayoutDashboard, LogOut, Menu, Tractor, UserRound, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { usePrototype } from "@/contexts/PrototypeContext";
import type { Role } from "@/prototype/types";

type NavItem = { href: string; label: string };

const farmerNav: NavItem[] = [
  { href: "/farmer", label: "Dashboard" },
  { href: "/farmer/find", label: "Find Machinery" },
  { href: "/farmer/bookings", label: "My Bookings" },
  { href: "/profile", label: "Profile" },
  { href: "/help", label: "Help Center" },
];

const ownerNav: NavItem[] = [
  { href: "/owner", label: "Dashboard" },
  { href: "/owner/machinery", label: "My Machinery" },
  { href: "/owner/machinery/new", label: "Add Machinery" },
  { href: "/owner/requests", label: "Booking Requests" },
  { href: "/owner/verification", label: "Verification" },
  { href: "/owner/earnings", label: "Earnings" },
  { href: "/profile", label: "Profile" },
  { href: "/help", label: "Help Center" },
];

function activePath(location: string, href: string) {
  return location === href || (href !== "/" && location.startsWith(`${href}/`));
}

export function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, signOut } = usePrototype();
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const role = currentUser?.role;
  const nav = role === "farmer" ? farmerNav : role === "owner" ? ownerNav : [];

  const handleSignOut = () => {
    signOut();
    setMenuOpen(false);
    setLocation("/");
  };

  const publicLinks = [
    { href: "/farmer/find", label: "Browse machinery" },
    { href: "/#how-it-works", label: "How it works" },
    { href: "/#farmers", label: "For Farm Holders" },
    { href: "/#owners", label: "For Machinery Owners" },
  ];

  return <div className="app-shell">
    <div className="prototype-strip"><span><i className="strip-dot" /> VAYAL · LOCAL PROTOTYPE</span><span>Demo data stays in this browser. No SMS, payment or live booking.</span></div>
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand-lockup" aria-label="Vayal home" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark" aria-hidden="true"><span className="brand-mark-sun" /><span className="brand-mark-field" /><Tractor size={18} /></span>
          <span className="brand-word">vayal<span className="brand-period">.</span><small>வயல் · TAMIL NADU</small></span>
        </Link>
        <button className="mobile-menu" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
          {(currentUser ? nav : publicLinks).map(item => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={activePath(location, item.href) ? "active" : ""}>{item.label}</Link>)}
          {currentUser && <button className="nav-logout mobile-logout" onClick={handleSignOut}><LogOut size={15} /> Log out</button>}
        </nav>
        <div className="header-actions">
          {currentUser ? <>
            <Link className="account-chip" href="/profile"><span className="account-chip-dot" />{currentUser.name.split(" ")[0]} <small>{currentUser.role === "farmer" ? "Farm Holder" : "Owner"}</small></Link>
            <button className="nav-logout desktop-logout" onClick={handleSignOut} title="Log out"><LogOut size={16} /><span>Logout</span></button>
          </> : <>
            <Link className="login-link" href="/start">Login</Link>
            <Link className="button button-primary header-cta" href="/start">Get started <ArrowRight size={15} /></Link>
          </>}
        </div>
      </div>
    </header>
    {currentUser && <div className="role-ribbon"><div className="role-ribbon-inner"><span>{role === "farmer" ? <Tractor size={15} /> : <UserRound size={15} />}{role === "farmer" ? "Farm Holder workspace" : "Machinery Owner workspace"}</span><span className="ribbon-demo"><i className="status-dot" /> Prototype session · {currentUser.phone}</span></div></div>}
    <main className="page-main">{children}</main>
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-main"><Link href="/" className="footer-brand"><span className="footer-mark"><span></span><span></span></span><b>vayal<span>.</span></b><small>வயல்</small></Link><p>A local machinery network for farmers who need access, not ownership. Built for the fields of Tamil Nadu.</p><span className="footer-prototype-note"><CircleHelp size={14} /> Prototype information only · no live service</span></div>
        <div className="footer-links"><div><b>For Farm Holders</b><Link href="/farmer/find">Find machinery</Link><Link href="/farmer/bookings">My bookings</Link><Link href="/help">Help center</Link></div><div><b>For Machinery Owners</b><Link href="/owner/machinery/new">Add machinery</Link><Link href="/owner/requests">Booking requests</Link><Link href="/owner/verification">Verification</Link></div><div><b>Vayal</b><Link href="/#how-it-works">How it works</Link><Link href="/start">Get started</Link><a href="mailto:hello@vayal.example">hello@vayal.example</a></div></div>
      </div>
      <div className="footer-bottom"><span>© 2026 Vayal marketplace · Tamil Nadu, India</span><span>Demo data stays on this device</span></div>
    </footer>
  </div>;
}

export function roleLoginPath(role: Role) {
  return `/auth/${role}`;
}
