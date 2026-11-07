import { useState } from "react";
import { ArrowRight, CircleHelp, Mail, MapPin, MessageCircle, RotateCcw, ShieldCheck, Smartphone, WalletCards } from "lucide-react";
import { Link, useLocation } from "wouter";
import { MarketplaceLayout } from "@/components/MarketplaceLayout";
import { DemoNotice, PageHeading } from "@/components/PageHeading";
import { usePrototype } from "@/contexts/PrototypeContext";

const faqs = [
  { q: "Is my booking sent to the owner?", a: "No. Booking requests and owner responses in this prototype are stored locally in your browser. No other person receives a notification." },
  { q: "Will I receive an OTP by SMS?", a: "No. Sign-in uses the visible demo code 123456. On-site booking codes are generated only inside the sample booking journey." },
  { q: "Does a verified badge mean this machine or owner was checked?", a: "No. All sample verification states are simulated for interface demonstration. No document or identity is reviewed by Vayal or an authority." },
  { q: "Does the location pin confirm that someone reached the farm?", a: "No. The address is typed by a prototype user. This version has no GPS, geofencing, map matching or location proof." },
  { q: "Are earnings withdrawable and is payment enabled?", a: "No. Earnings are illustrative sample values. The prototype has no wallet, payment gateway, payout, commission or real booking." },
  { q: "How do I restart the demo?", a: "Choose “Reset local demo data” below. It clears this browser's Vayal prototype profiles, bookings, registration drafts and review states, then restores the sample starting records." },
];

export default function HelpCenter() {
  const { resetPrototype } = usePrototype();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState<string | null>(faqs[0].q);
  const [resetMessage, setResetMessage] = useState("");
  const reset = () => {
    if (!window.confirm("Clear Vayal prototype data from this browser and restore the sample starting records? This does not change any real service.")) return;
    resetPrototype();
    setResetMessage("Local demo state reset. The sample starting records have been restored.");
    setLocation("/");
  };
  return <MarketplaceLayout><section className="help-page page-container"><PageHeading eyebrow="HELP CENTER" title="A little clarity goes a long way." description="Learn how to explore the prototype and what remains simulated." /><DemoNotice>Vayal here is a front-end prototype. Do not enter sensitive personal, financial or identity information.</DemoNotice><div className="help-grid"><aside className="help-side-card"><span className="help-icon"><CircleHelp size={22} /></span><h2>Need a hand?</h2><p>Start with role selection or open a sample journey.</p><Link className="button button-secondary full-width" href="/start">Choose a role <ArrowRight size={14} /></Link><a className="help-mail" href="mailto:hello@vayal.example"><Mail size={15} /> hello@vayal.example <small>Example address · not monitored</small></a><div className="help-boundary-list"><span><Smartphone size={15} /> No real SMS</span><span><ShieldCheck size={15} /> No real verification</span><span><WalletCards size={15} /> No payments</span><span><MapPin size={15} /> No GPS location</span></div></aside><section className="help-faq"><span className="eyebrow"><i className="eyebrow-rule" /> PROTOTYPE FAQ</span><h2>What can I try?</h2><div className="faq-list">{faqs.map(item => <div className={`help-faq-item ${open === item.q ? "is-open" : ""}`} key={item.q}><button aria-expanded={open === item.q} onClick={() => setOpen(open === item.q ? null : item.q)}>{item.q}<span>{open === item.q ? "−" : "+"}</span></button>{open === item.q && <p>{item.a}</p>}</div>)}</div></section></div><section className="reset-demo-card"><span className="reset-icon"><RotateCcw size={20} /></span><div><span className="overline">RESET LOCAL PROTOTYPE</span><h2>Start over with sample data.</h2><p>Clear browser-local edits, draft machines, bookings and demo profiles. The original sample records return.</p>{resetMessage && <small className="saved-inline">{resetMessage}</small>}</div><button className="button button-secondary" onClick={reset}><RotateCcw size={15} /> Reset local demo data</button></section></section></MarketplaceLayout>;
}
