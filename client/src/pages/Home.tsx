import { ArrowDown, ArrowRight, Check, CircleHelp, ClipboardCheck, MapPin, ShieldCheck, Sprout, Tractor, Truck, WalletCards } from "lucide-react";
import { Link } from "wouter";
import { MarketplaceLayout } from "@/components/MarketplaceLayout";
import { DemoNotice } from "@/components/PageHeading";
import { categories } from "@/prototype/format";

const faqItems = [
  { q: "Is Vayal live for real rentals?", a: "This version is a frontend demonstration. Listings, verification labels and booking changes are sample or browser-local data; no real owner receives a request." },
  { q: "Does the prototype send an OTP by SMS?", a: "No. A demo code is shown in the sign-in flow. No mobile number is contacted or verified." },
  { q: "Are machine and owner documents genuinely verified?", a: "No. The verification states demonstrate a possible review journey only. They are not checks by Vayal or a government authority." },
  { q: "How are rental prices and distance calculated?", a: "Sample rates and approximate distances are illustrative. Confirm actual pricing, machine availability, field access and transport with the owner in a future live service." },
];

export default function Home() {
  return <MarketplaceLayout>
    <section className="hero-landing page-container">
      <div className="hero-copy">
        <span className="eyebrow"><i className="eyebrow-rule" /> AGRICULTURAL ACCESS, MADE LOCAL <b>· வயல்</b></span>
        <h1>The right machine,<br /><em>when your field</em><br />needs it.</h1>
        <p>Find tractors, harvesters and farm equipment from people who know the land. Rent for the work in front of you — without the cost of owning for the rest of the year.</p>
        <div className="hero-actions"><Link className="button button-primary" href="/start">Get Started <ArrowRight size={17} /></Link><Link className="button button-secondary" href="/farmer/find">Browse machinery <ArrowRight size={16} /></Link></div>
        <div className="hero-proof"><span><i className="proof-avatar">F</i><i className="proof-avatar proof-avatar-two">M</i><i className="proof-avatar proof-avatar-three">+</i></span><div><b>Local owners. Clear prices.</b><small>Start with a request. Talk directly.</small></div></div>
      </div>
      <div className="hero-visual" aria-label="Illustration of agricultural fields and a nearby tractor">
        <div className="hero-visual-top"><span>ACCESS OVER OWNERSHIP</span><b>1 request<br />to get moving</b></div>
        <div className="hero-sun" />
        <div className="hero-field-lines"><i /><i /><i /><i /><i /></div>
        <div className="hero-path" />
        <div className="hero-tractor"><Tractor size={36} strokeWidth={1.3} /></div>
        <div className="hero-pin hero-pin-one"><MapPin size={14} /> Near your field</div>
        <div className="hero-pin hero-pin-two"><span /> local owner <ArrowRight size={12} /></div>
        <div className="hero-visual-caption"><span className="status-dot" />Machinery, within reach</div>
      </div>
    </section>
    <div className="hero-footnote page-container"><span><b>01</b> No middlemen guessing. See the price, service area and sample availability before you call.</span><a href="#how-it-works">SCROLL TO BROWSE <ArrowDown size={13} /></a></div>

    <section className="browse-intro page-container" id="how-it-works">
      <div className="section-lead"><div><span className="eyebrow"><i className="eyebrow-rule" /> HOW VAYAL WORKS</span><h2>Start with the work<br />your field needs.</h2></div><p>Machinery access should fit the season, the field and the farmer — not require ownership for the full year.</p></div>
      <div className="category-band"><span className="overline">EQUIPMENT FOR THE FIELD</span><div className="category-chip-row">{categories.map((category, index) => <Link key={category} href={`/farmer/find?category=${encodeURIComponent(category)}`} className={`category-chip ${index === 0 ? "category-chip-active" : ""}`}><span className="category-chip-icon">{index === 0 ? <Tractor size={16} /> : <Sprout size={15} />}</span>{category}</Link>)}</div></div>
    </section>

    <section className="role-feature-grid page-container" id="farmers">
      <article className="role-feature-card role-feature-farmer">
        <div className="role-feature-icon"><Tractor size={23} /></div><span className="eyebrow"><i className="eyebrow-rule" /> FOR FARM HOLDERS</span><h2>Rent what your<br />field needs.</h2>
        <p>Find the right machine for this season, see the sample rate and request the dates that work for your farm.</p>
        <ul className="feature-list"><li><Check size={15} /> Compare clear hourly and daily rates</li><li><Check size={15} /> Search by village, town, district or PIN</li><li><Check size={15} /> Keep requests and booking status together</li></ul>
        <Link className="text-link" href="/start">Continue as Farm Holder <ArrowRight size={16} /></Link>
      </article>
      <article className="role-feature-card role-feature-owner" id="owners">
        <div className="role-feature-icon"><WalletCards size={22} /></div><span className="eyebrow"><i className="eyebrow-rule" /> FOR MACHINERY OWNERS</span><h2>Put idle hours<br />to work.</h2>
        <p>Make equipment discoverable to nearby farmers, set the details and review each request at your own pace.</p>
        <ul className="feature-list"><li><Check size={15} /> Set rates, service areas and availability</li><li><Check size={15} /> Organise requests in one place</li><li><Check size={15} /> Follow a visible demo verification journey</li></ul>
        <Link className="text-link" href="/start">Continue as Machinery Owner <ArrowRight size={16} /></Link>
      </article>
    </section>

    <section className="trust-band page-container">
      <div className="trust-band-heading"><span className="eyebrow"><i className="eyebrow-rule" /> BUILT AROUND YOUR SEASON</span><h2>Clear before the call.</h2><p>Plan the work with the details in view.</p></div>
      <div className="trust-items"><div className="trust-item"><span><WalletCards size={19} /></span><div><b>Know the rate</b><small>See a sample hourly and daily price upfront.</small></div></div><div className="trust-item"><span><Truck size={19} /></span><div><b>Plan mobilisation</b><small>View the operating area and transport notes.</small></div></div><div className="trust-item"><span><ShieldCheck size={19} /></span><div><b>Understand verification</b><small>See what a future review journey could include.</small></div></div></div>
    </section>

    <section className="verification-story page-container">
      <div className="verification-art"><div className="verification-card"><span className="verification-check"><ShieldCheck size={22} /></span><div><b>Review steps, in view</b><small>Documents · machine details · status</small></div><span className="demo-tag">DEMO</span></div><div className="verification-line" /><div className="verification-card verification-card-second"><span className="verification-check check-gold"><ClipboardCheck size={21} /></span><div><b>Booking OTP at the field</b><small>Farmer confirms · operator enters</small></div></div><span className="verification-art-label">CLEAR STEPS, NOT ASSUMPTIONS</span></div>
      <div className="verification-copy"><span className="eyebrow"><i className="eyebrow-rule" /> TRUST & SAFETY</span><h2>Good work starts<br />with clear details.</h2><p>Machine identity, documents, availability and service arrangements matter. Vayal's prototype shows where those checks belong — without claiming that a real check has happened.</p><div className="trust-note"><ShieldCheck size={17} /><span><b>Honest demo labels</b><small>“Verified” sample states are simulated. No document is reviewed by an authority.</small></span></div><div className="trust-note"><MapPin size={17} /><span><b>Location is not presence</b><small>An entered farm address is not GPS, geofencing or proof that anyone is at the field.</small></span></div><Link className="text-link" href="/help">Read prototype FAQs <ArrowRight size={15} /></Link></div>
    </section>

    <section className="owner-invite" aria-labelledby="owner-invite-title"><div className="owner-invite-inner page-container"><div><span className="eyebrow eyebrow-light"><i className="eyebrow-rule" /> FOR MACHINERY OWNERS</span><h2 id="owner-invite-title">Your idle machine can<br />move a season forward.</h2><p>Turn unused hours into useful work. Add equipment details and try the owner journey in the local prototype.</p><Link className="button button-light" href="/auth/owner">List your machinery <ArrowRight size={16} /></Link></div><div className="owner-invite-steps"><div><b>01</b><span>Add machine details and rates</span><Check size={16} /></div><div><b>02</b><span>Choose your service area</span><Check size={16} /></div><div><b>03</b><span>Review incoming demo requests</span><Check size={16} /></div></div></div></section>

    <section className="how-section page-container">
      <div className="section-lead"><div><span className="eyebrow"><i className="eyebrow-rule" /> A SIMPLE FIELDWORK TRAIL</span><h2>From need to fieldwork.</h2></div><p>A clear request first. Confirm the practical details with the owner before work begins.</p></div>
      <div className="how-grid"><article><span className="step-number">01</span><CalendarDaysIcon /><h3>Tell us the job</h3><p>Choose a machine, add your dates and share the work and field details.</p></article><article><span className="step-number">02</span><CircleHelp size={22} /><h3>Owner reviews</h3><p>Compare timing, mobilisation and service details in the sample journey.</p></article><article><span className="step-number">03</span><ShieldCheck size={22} /><h3>Confirm at the field</h3><p>Follow an on-site OTP example before a rental is marked ready to begin.</p></article></div>
    </section>

    <section className="faq-section page-container" id="faqs"><div className="section-lead"><div><span className="eyebrow"><i className="eyebrow-rule" /> GOOD TO KNOW</span><h2>Questions, answered.</h2></div><p>What this prototype shows — and what it does not.</p></div><div className="faq-list">{faqItems.map(item => <details key={item.q}><summary>{item.q}<span>+</span></summary><p>{item.a}</p></details>)}</div></section>

    <section className="final-cta page-container"><span className="final-cta-icon"><Sprout size={22} /></span><div><span className="overline">A LOCAL NETWORK, BUILT FOR THE FIELDS</span><h2>Find the machine your fieldwork needs.</h2><p>Choose your role and explore the prototype in a few steps.</p></div><Link className="button button-primary" href="/start">Get Started <ArrowRight size={16} /></Link></section>
    <div className="landing-disclosure page-container"><DemoNotice variant="green">All listings, owner reviews, rates and OTPs shown here are demonstration data. No live rental request is sent.</DemoNotice></div>
  </MarketplaceLayout>;
}

function CalendarDaysIcon() {
  return <span className="how-icon-calendar">10</span>;
}
