import { useState, type FormEvent } from "react";
import { ArrowLeft, Check, CheckCircle2, KeyRound, MapPin, Navigation, ShieldCheck, Smartphone } from "lucide-react";
import { Link, useRoute } from "wouter";
import { MarketplaceLayout } from "@/components/MarketplaceLayout";
import { BookingStatusBadge } from "@/components/StatusBadge";
import { DemoNotice, PageHeading } from "@/components/PageHeading";
import { usePrototype } from "@/contexts/PrototypeContext";
import { formatDate, formatRupees } from "@/prototype/format";

export default function OnSiteVerification() {
  const [, farmerParams] = useRoute("/farmer/bookings/:id/verify");
  const [, ownerParams] = useRoute("/owner/requests/:id/verify");
  const bookingId = farmerParams?.id || ownerParams?.id;
  const { state, currentUser, confirmFarmerPresence, confirmOperatorArrival, verifyOnSite, completeRental } = usePrototype();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const booking = state.bookings.find(item => item.id === bookingId && (item.farmerPhone === currentUser?.phone || item.ownerPhone === currentUser?.phone));
  const checkedIn = Boolean(booking?.operatorArrivalConfirmed);
  const isFarmer = currentUser?.role === "farmer";
  const isOwner = currentUser?.role === "owner";

  if (!booking || (!isFarmer && !isOwner)) return <MarketplaceLayout><section className="page-container not-found-card"><span className="eyebrow">ON-SITE CHECK</span><h1>This demo booking is not available to this profile.</h1><Link className="button button-secondary" href={isOwner ? "/owner/requests" : "/farmer/bookings"}>Back to bookings</Link></section></MarketplaceLayout>;

  const submitOtp = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!checkedIn) { setError("Confirm the operator's demo arrival at the entered farm location first."); return; }
    const success = verifyOnSite(booking.id, otp);
    if (!success) setError("The code is incorrect or the Farm Holder has not confirmed presence in this demo.");
    else setOtp("");
  };

  return <MarketplaceLayout><section className="onsite-page page-container"><Link className="back-link" href={isOwner ? "/owner/requests" : "/farmer/bookings"}><ArrowLeft size={15} /> Back to bookings</Link><PageHeading eyebrow="BOOKING HANDOFF · LOCAL DEMO" title="Confirm at the field." description="The sample rental uses a booking OTP before the operator starts work." action={<BookingStatusBadge status={booking.status} />} /><DemoNotice variant="green">This journey simulates the future on-site check only. Typed location and checkbox confirmations are not GPS, geofencing or proof of physical presence.</DemoNotice>
    <div className="onsite-grid"><div className="onsite-location-card"><span className="eyebrow"><i className="eyebrow-rule" /> REGISTERED FARM LOCATION · ENTERED BY FARMER</span><div className="location-illustration"><div className="location-field-grid" /><span className="location-pin"><MapPin size={22} /></span><span className="location-illustration-label">LOCATION SKETCH · NOT GPS</span></div><h2>{booking.farmLocation.village}</h2><p>{booking.farmLocation.town}, {booking.farmLocation.district} {booking.farmLocation.pinCode}</p><div className="location-confirm-row"><MapPin size={16} /><span><b>Location confirmation</b><small>Manually entered address · physical presence not verified</small></span></div><div className="location-party-row"><div><span className={`party-indicator ${booking.farmerPresent ? "party-ready" : ""}`}>{booking.farmerPresent ? <Check size={13} /> : "F"}</span><span><b>Farm Holder</b><small>{booking.farmerPresent ? "Demo presence confirmed" : "Awaiting self-confirmation"}</small></span></div><div><span className={`party-indicator ${booking.operatorPresent ? "party-ready" : ""}`}>{booking.operatorPresent ? <Check size={13} /> : "O"}</span><span><b>Operator</b><small>{booking.operatorPresent ? "Demo code verified" : "Awaiting code entry"}</small></span></div></div></div>
    <div className="onsite-action-panel"><div className="onsite-machine-row"><img src={booking.machinePhoto} alt={booking.machineName} /><span><small>MACHINE · {booking.id}</small><b>{booking.machineName}</b><small>{formatDate(booking.requestedDate)} · {booking.preferredTime} · {formatRupees(booking.estimatedAmount)} estimate</small></span></div><div className="onsite-steps"><div className={"onsite-step " + (booking.operatorArrivalConfirmed ? "is-done" : "")}><i>{booking.operatorArrivalConfirmed ? <Check size={14} /> : "1"}</i><span><b>Operator self-confirms arrival</b><small>Manual self-attestation only; this is not GPS verification.</small></span></div><div className={`onsite-step ${booking.farmerPresent ? "is-done" : ""}`}><i>{booking.farmerPresent ? <Check size={14} /> : "2"}</i><span><b>Farm Holder confirms presence</b><small>Owner enters the booking code after this step.</small></span></div><div className={`onsite-step ${booking.status === "on_site_verified" || booking.status === "completed" ? "is-done" : ""}`}><i>{booking.status === "on_site_verified" || booking.status === "completed" ? <Check size={14} /> : "3"}</i><span><b>Operator enters booking OTP</b><small>Only the matching local demo code advances the status.</small></span></div></div>
      {isFarmer && booking.status === "confirmed" && <div className="farmer-otp-share"><span className="otp-share-icon"><KeyRound size={18} /></span><div><span className="overline">SHARE WITH YOUR OPERATOR · DEMO ONLY</span><b className="booking-code">{booking.bookingOtp}</b><small>{booking.farmerPresent ? "Your demo presence is confirmed. Share this code with the operator to complete the handoff." : "This code is generated locally. Share it after confirming your presence; no SMS is sent."}</small></div></div>}
      {isFarmer && booking.status === "confirmed" && <button className={`button ${booking.farmerPresent ? "button-secondary" : "button-primary"} full-width`} disabled={booking.farmerPresent} onClick={() => confirmFarmerPresence(booking.id)}>{booking.farmerPresent ? <><CheckCircle2 size={16} /> Presence self-confirmed · demo</> : <>I am at this entered location <MapPin size={15} /></>}</button>}
      {isOwner && booking.status === "confirmed" && <form className="operator-verify-form" onSubmit={submitOtp}><span className="eyebrow"><i className="eyebrow-rule" /> OPERATOR CODE ENTRY</span><label className="form-label">Booking OTP shared by Farm Holder<input autoComplete="one-time-code" inputMode="numeric" minLength={6} maxLength={6} pattern="[0-9]{6}" value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" required /></label><label className="arrival-check"><input type="checkbox" checked={checkedIn} disabled={!booking.farmerPresent || checkedIn} onChange={event => { if (event.target.checked) confirmOperatorArrival(booking.id); }} /><span><b>Operator self-confirms arrival</b><small>{checkedIn ? "Arrival self-attestation saved in this browser." : "Self-confirm arrival after reaching the entered farm address. This does not prove location."}</small></span></label><button className="button button-primary full-width" type="submit" disabled={!booking.farmerPresent || !checkedIn || otp.length !== 6}><ShieldCheck size={16} /> Verify demo OTP</button>{error && <p className="form-error" role="alert">{error}</p>}</form>}
      {booking.status === "accepted" && <div className="waiting-panel"><Smartphone size={18} /><p>The Farm Holder must confirm the booking before the on-site OTP step is available.</p></div>}
      {(booking.status === "on_site_verified" || booking.status === "completed") && <div className="on-site-complete"><CheckCircle2 size={19} /><div><b>{booking.status === "completed" ? "Rental marked completed" : "On-Site Verified · Demo only"}</b><small>{booking.status === "completed" ? "Completed in local prototype data." : "Matching code + manual self-attestations only. No GPS proof."}</small></div></div>}
      {isOwner && booking.status === "on_site_verified" && <button className="button button-primary full-width" onClick={() => completeRental(booking.id)}>Mark rental completed <Check size={15} /></button>}
      <div className="onsite-disclosure"><Navigation size={15} /><span>Future GPS/geofencing integration point. Current prototype stores no coordinates and checks no physical location.</span></div>
    </div></div></section></MarketplaceLayout>;
}
