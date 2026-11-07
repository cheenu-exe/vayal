import { ArrowRight, Sprout, Tractor, UserRound } from "lucide-react";
import { Link } from "wouter";
import { MarketplaceLayout } from "@/components/MarketplaceLayout";
import { DemoNotice } from "@/components/PageHeading";

export default function RoleSelection() {
  return <MarketplaceLayout><section className="role-select-page page-container">
    <div className="role-select-heading"><span className="eyebrow"><i className="eyebrow-rule" /> YOUR VAYAL JOURNEY</span><h1>How will you use<br /><em>Vayal this season?</em></h1><p>Choose the path that fits your work. Each role has its own demo sign-in and workspace.</p></div>
    <div className="role-choice-grid">
      <article className="role-choice-card role-choice-farmer"><span className="role-card-index">01 / FARM HOLDER</span><span className="role-choice-icon"><Tractor size={27} /></span><h2>Farm Holder</h2><p>Find and rent agricultural machinery near your farmland.</p><ul><li>Browse by machine and fieldwork</li><li>Compare sample rates and operating area</li><li>Track your demo booking requests</li></ul><Link className="button button-primary" href="/auth/farmer">Continue as Farm Holder <ArrowRight size={16} /></Link></article>
      <article className="role-choice-card role-choice-owner"><span className="role-card-index">02 / MACHINERY OWNER</span><span className="role-choice-icon"><Sprout size={26} /></span><h2>Machinery Owner</h2><p>Register your agricultural machinery and receive rental requests.</p><ul><li>Set machine details, rates and availability</li><li>Manage a simulated verification journey</li><li>Review sample booking requests</li></ul><Link className="button button-primary" href="/auth/owner">Continue as Machinery Owner <ArrowRight size={16} /></Link></article>
    </div>
    <div className="role-returning"><UserRound size={16} /><span>Already used this browser? Enter the same role and phone number to return to your local demo profile.</span><Link href="/auth/farmer">Farm Holder login</Link><Link href="/auth/owner">Owner login</Link></div>
    <DemoNotice>Six-digit demo code only · No SMS is sent · New demo profiles stay in this browser.</DemoNotice>
  </section></MarketplaceLayout>;
}
