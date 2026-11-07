import { ArrowRight, CalendarDays, MapPin, MessageSquareText, ShieldCheck, Tractor } from "lucide-react";
import { Link } from "wouter";
import { MarketplaceLayout } from "@/components/MarketplaceLayout";
import { BookingStatusBadge } from "@/components/StatusBadge";
import { PageHeading } from "@/components/PageHeading";
import { RoleGate } from "@/components/RoleGate";
import { usePrototype } from "@/contexts/PrototypeContext";
import { formatDate, formatRupees } from "@/prototype/format";

function BookingList() {
  const { state, currentUser, changeBookingStatus } = usePrototype();
  const bookings = state.bookings.filter(booking => booking.farmerPhone === currentUser?.phone).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <MarketplaceLayout><section className="bookings-page page-container">
    <PageHeading eyebrow="FARM HOLDER WORKSPACE" title="My Bookings" description="Keep your machine requests and fieldwork dates together." action={<Link className="button button-secondary" href="/farmer/find"><Tractor size={15} /> Find machinery</Link>} />
    <div className="demo-notice"><span className="demo-notice-dot" />These are local prototype bookings. A live owner is not contacted.</div>
    <div className="booking-count-row"><span>{bookings.length} sample {bookings.length === 1 ? "booking" : "bookings"}</span><span>Updated in this browser only</span></div>
    {bookings.length ? <div className="farmer-booking-list">{bookings.map(booking => <article className="farmer-booking-card" key={booking.id}>
      <Link href={`/machine/${booking.machineId}`} className="farmer-booking-photo"><img src={booking.machinePhoto} alt={booking.machineName} /><span>DEMO</span></Link>
      <div className="farmer-booking-main"><div className="booking-card-top"><BookingStatusBadge status={booking.status} /><span className="booking-reference">{booking.id}</span></div><h2><Link href={`/farmer/bookings/${booking.id}`}>{booking.machineName}</Link></h2><p><CalendarDays size={14} />{formatDate(booking.requestedDate)} · {booking.preferredTime}<i>·</i>{booking.duration} {booking.durationUnit}</p><p><MapPin size={14} />{booking.farmLocation.village}, {booking.farmLocation.town}, {booking.farmLocation.district}</p><div className="booking-card-owner"><span>Owner</span><b>{booking.ownerName}</b><span className="demo-tag">SAMPLE</span></div>{booking.ownerResponse && <div className="owner-response-line"><MessageSquareText size={14} />{booking.ownerResponse}</div>}</div>
      <div className="farmer-booking-side"><span className="overline">ESTIMATED · DEMO</span><b>{formatRupees(booking.estimatedAmount)}</b><span className="price-caption">No payment taken</span>{booking.status === "accepted" && <button className="button button-primary" onClick={() => changeBookingStatus(booking.id, "confirmed")}>Confirm booking <ArrowRight size={14} /></button>}{booking.status === "confirmed" && <Link className="button button-primary" href={`/farmer/bookings/${booking.id}/verify`}><ShieldCheck size={14} /> On-site steps</Link>}{booking.status === "on_site_verified" && <Link className="button button-secondary" href={`/farmer/bookings/${booking.id}/verify`}>View verification <ArrowRight size={14} /></Link>}{["pending", "accepted", "confirmed"].includes(booking.status) && <button className="cancel-link" onClick={() => changeBookingStatus(booking.id, "cancelled")}>Cancel demo request</button>}</div>
    </article>)}</div> : <div className="empty-state"><span><CalendarDays size={23} /></span><h3>No bookings in this local profile</h3><p>Browse sample machinery to start a request journey.</p><Link className="button button-primary" href="/farmer/find">Find machinery <ArrowRight size={15} /></Link></div>}
  </section></MarketplaceLayout>;
}

export default function FarmerBookings() {
  return <RoleGate role="farmer"><BookingList /></RoleGate>;
}
