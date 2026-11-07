import { ArrowRight, CalendarDays, CircleDollarSign, Clock3, Plus, ShieldCheck, Tractor, Truck, UsersRound } from "lucide-react";
import { Link } from "wouter";
import { MarketplaceLayout } from "@/components/MarketplaceLayout";
import { BookingStatusBadge, VerificationBadge } from "@/components/StatusBadge";
import { PageHeading } from "@/components/PageHeading";
import { RoleGate } from "@/components/RoleGate";
import { usePrototype } from "@/contexts/PrototypeContext";
import { formatDate, formatRupees } from "@/prototype/format";

function OwnerHome() {
  const { state, currentUser } = usePrototype();
  const machines = state.machines.filter(machine => machine.ownerPhone === currentUser?.phone);
  const bookings = state.bookings.filter(booking => booking.ownerPhone === currentUser?.phone);
  const pending = bookings.filter(booking => booking.status === "pending");
  const active = bookings.filter(booking => ["accepted", "confirmed", "on_site_verified"].includes(booking.status));
  const completed = bookings.filter(booking => booking.status === "completed");
  const earnings = completed.reduce((sum, booking) => sum + booking.estimatedAmount, 0);
  const available = machines.filter(machine => machine.enabled && machine.verificationStatus === "verified").length;
  const recent = [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const latestReview = machines.find(machine => machine.verificationStatus !== "verified");

  return <MarketplaceLayout><section className="owner-dashboard page-container"><PageHeading eyebrow="MACHINERY OWNER WORKSPACE" title={`Keep your equipment working, ${currentUser?.name.split(" ")[0] || "owner"}.`} description="Manage sample listings, review booking requests and see what the Vayal owner journey could look like." action={<Link className="button button-primary" href="/owner/machinery/new"><Plus size={16} /> Add Machinery</Link>} />
    <div className="dashboard-demo-row"><span><i className="strip-dot" /> PRIVATE LOCAL DEMO</span><span>Metrics, requests and earnings below are illustrative — no live owner or customer is connected.</span></div>
    <div className="owner-metric-grid"><article className="owner-metric-card"><span><Tractor size={18} /></span><small>TOTAL MACHINERY</small><b>{machines.length}</b><Link href="/owner/machinery">View listings <ArrowRight size={13} /></Link></article><article className="owner-metric-card metric-green"><span><ShieldCheck size={18} /></span><small>AVAILABLE · DEMO</small><b>{available}</b><small className="metric-foot">Verified sample listings only</small></article><article className="owner-metric-card metric-gold"><span><Clock3 size={18} /></span><small>PENDING REQUESTS</small><b>{pending.length}</b><Link href="/owner/requests">Review requests <ArrowRight size={13} /></Link></article><article className="owner-metric-card"><span><UsersRound size={18} /></span><small>ACTIVE BOOKINGS</small><b>{active.length}</b><small className="metric-foot">Accepted through on-site demo</small></article><article className="owner-metric-card metric-earnings"><span><CircleDollarSign size={18} /></span><small>COMPLETED · SAMPLE</small><b>{formatRupees(earnings)}</b><Link href="/owner/earnings">Illustrative earnings <ArrowRight size={13} /></Link></article></div>
    <div className="owner-dashboard-grid"><section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow"><i className="eyebrow-rule" /> INCOMING REQUESTS</span><h2>Recent booking activity</h2></div><Link className="text-link" href="/owner/requests">All requests <ArrowRight size={14} /></Link></div>{recent.length ? <div className="recent-activity-list">{recent.map(booking => <Link href="/owner/requests" key={booking.id} className="recent-activity"><span className="activity-machine-icon"><Tractor size={17} /></span><span className="activity-copy"><b>{booking.farmerName} · {booking.machineName}</b><small><CalendarDays size={12} />{formatDate(booking.requestedDate)} · {booking.farmLocation.village}, {booking.farmLocation.district}</small></span><BookingStatusBadge status={booking.status} /></Link>)}</div> : <div className="mini-empty">No local booking activity yet.</div>}</section>
      <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow"><i className="eyebrow-rule" /> LISTING HEALTH</span><h2>Machine verification</h2></div><Link className="text-link" href="/owner/verification">Details <ArrowRight size={14} /></Link></div>{latestReview ? <div className="verification-summary"><div className="verification-summary-icon"><ShieldCheck size={20} /></div><div><b>{latestReview.name}</b><small>Sample review state</small><VerificationBadge status={latestReview.verificationStatus} /></div></div> : <div className="verified-all"><ShieldCheck size={19} /> All visible sample listings show the simulated verified state.</div>}<Link className="button button-secondary full-width" href="/owner/verification">Open verification details</Link></section></div>
    <div className="owner-shortcuts"><Link href="/owner/machinery/new"><Plus size={17} /><span><b>Register new machinery</b><small>Six short steps · photos stay in this browser</small></span><ArrowRight size={15} /></Link><Link href="/owner/earnings"><CircleDollarSign size={17} /><span><b>See illustrative earnings</b><small>No wallet or payout connection</small></span><ArrowRight size={15} /></Link><Link href="/help"><Truck size={17} /><span><b>Understand the demo limits</b><small>SMS, payment and booking stay simulated</small></span><ArrowRight size={15} /></Link></div>
  </section></MarketplaceLayout>;
}

export default function OwnerDashboard() {
  return <RoleGate role="owner"><OwnerHome /></RoleGate>;
}
