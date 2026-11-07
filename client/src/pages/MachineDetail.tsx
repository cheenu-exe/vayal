import { useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, MapPin, ShieldCheck, Tractor, Truck, UserRound, X } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { MarketplaceLayout } from "@/components/MarketplaceLayout";
import { BookingStatusBadge, VerificationBadge } from "@/components/StatusBadge";
import { DemoNotice, PageHeading } from "@/components/PageHeading";
import { usePrototype } from "@/contexts/PrototypeContext";
import { formatDate, formatRupees, isDateBlocked, todayInputValue } from "@/prototype/format";
import type { NewBookingInput } from "@/prototype/types";

const blankLocation = { village: "", town: "", district: "", pinCode: "" };

export default function MachineDetail() {
  const [, params] = useRoute("/machine/:id");
  const { state, currentUser, createBooking } = usePrototype();
  const [, setLocation] = useLocation();
  const machine = state.machines.find(item => item.id === params?.id && item.enabled && item.verificationStatus === "verified");
  const [form, setForm] = useState({ requestedDate: "", preferredTime: "07:00", duration: "4", durationUnit: "hours" as "hours" | "days", farmLocation: { ...blankLocation }, instructions: "" });
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");

  const estimate = useMemo(() => {
    if (!machine) return 0;
    const rate = form.durationUnit === "hours" ? machine.hourlyRate : machine.dailyRate;
    return rate * Number(form.duration || 0) + machine.transportCharge;
  }, [machine, form.duration, form.durationUnit]);

  if (!machine) return <MarketplaceLayout><section className="page-container not-found-card"><span className="eyebrow">MACHINE DETAILS</span><h1>This demo listing is unavailable.</h1><p>It may be paused or not in the simulated verified state.</p><Link className="button button-primary" href="/farmer/find">Browse available machinery <ArrowRight size={16} /></Link></section></MarketplaceLayout>;

  const dateMin = machine.availabilityStart > todayInputValue() ? machine.availabilityStart : todayInputValue();
  const submitForReview = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!currentUser || currentUser.role !== "farmer") { setError("Sign in as a Farm Holder to request this sample machine."); return; }
    if (!form.requestedDate || form.requestedDate < dateMin) { setError("Choose a date inside this machine's available service window."); return; }
    if (form.requestedDate > machine.availabilityEnd) { setError("That date is after this machine's listed availability window."); return; }
    if (isDateBlocked(form.requestedDate, machine.unavailableDates)) { setError("That sample date is marked unavailable. Choose another date."); return; }
    const duration = Number(form.duration);
    if (!Number.isInteger(duration) || duration < 1 || duration > 30) { setError("Choose a rental duration between 1 and 30."); return; }
    if (!form.farmLocation.village.trim() || !form.farmLocation.district.trim()) { setError("Add the farm village and district before reviewing the request."); return; }
    setReviewing(true);
  };

  const confirmBooking = () => {
    const bookingInput: NewBookingInput = {
      machineId: machine.id,
      requestedDate: form.requestedDate,
      preferredTime: form.preferredTime,
      duration: Math.max(1, Number(form.duration)),
      durationUnit: form.durationUnit,
      farmLocation: form.farmLocation,
      instructions: form.instructions.trim(),
    };
    const id = createBooking(bookingInput);
    if (!id) { setError("The request could not be saved in local prototype state. Try again."); setReviewing(false); return; }
    setReviewing(false);
    setLocation(`/farmer/bookings/${encodeURIComponent(id)}`);
  };

  return <MarketplaceLayout><section className="machine-detail-page page-container">
    <Link href="/farmer/find" className="back-link"><ArrowLeft size={15} /> Back to machinery</Link>
    <div className="detail-layout">
      <div className="detail-main-column">
        <div className="detail-photo-stage"><img src={machine.photos[0]} alt={`${machine.name} sample machine photograph`} /><span className="machine-photo-label">SAMPLE MACHINE PHOTO</span><span className="machine-photo-index">VY · {machine.id.slice(-2).toUpperCase()}</span></div>
        {new Set(machine.photos).size > 1 ? <div className="detail-mini-gallery">{Array.from(new Set(machine.photos)).slice(1, 4).map((photo, index) => <img key={photo} src={photo} alt={`${machine.name} additional sample view ${index + 1}`} />)}<span>Additional illustrative views stored for this local prototype.</span></div> : <div className="detail-gallery-note"><b>One illustrative sample photo</b><span>Owner submissions in the demo include front, side and rear views.</span></div>}
        <div className="machine-title-block"><div className="machine-title-badges"><span className="machine-category-chip">{machine.category}</span><VerificationBadge status={machine.verificationStatus} /></div><h1>{machine.name}</h1><p>{machine.manufacturer} {machine.model} · {machine.year} · {machine.condition}</p><div className="detail-rating">★ {machine.rating.toFixed(1)} <span>({machine.reviewCount} sample notes)</span></div></div>
        <DemoNotice>“Verified” is a simulated sample review state. This does not mean Vayal or an authority checked this machine or its owner.</DemoNotice>
        <section className="detail-info-section"><span className="eyebrow"><i className="eyebrow-rule" /> MACHINE DETAILS</span><h2>Work-ready information.</h2><p>{machine.description}</p><div className="spec-grid"><div><span className="spec-icon"><Tractor size={17} /></span><span><small>Machine & model</small><b>{machine.manufacturer} {machine.model}</b></span></div><div><span className="spec-icon"><MapPin size={17} /></span><span><small>Operating area</small><b>{machine.village}, {machine.town}, {machine.district}</b></span></div><div><span className="spec-icon"><UserRound size={17} /></span><span><small>Machinery owner</small><b>{machine.ownerName} <i className="demo-tag">DEMO</i></b></span></div><div><span className="spec-icon"><Truck size={17} /></span><span><small>Operator / delivery</small><b>{machine.hasOperator ? "Operator available" : "Operator not included"} · {formatRupees(machine.transportCharge)} transport estimate</b></span></div></div><div className="specification-box"><b>Specifications</b><span>{machine.capacity}</span><span>{machine.specifications}</span><span>Condition: {machine.condition} · Fuel: {machine.fuelType || "Not applicable"}</span></div></section>
        <section className="availability-section"><div className="section-heading-inline"><div><span className="eyebrow"><i className="eyebrow-rule" /> AVAILABILITY CALENDAR</span><h2>Check a sample date.</h2></div><span className="calendar-key"><i /> Available sample date</span></div><p>Calendar is illustrative. Owner confirmation would be required for a real rental.</p><div className="availability-window"><CalendarDays size={17} /><span>Sample service window</span><b>{formatDate(machine.availabilityStart)} – {formatDate(machine.availabilityEnd)}</b></div><div className="calendar-date-row">{Array.from({ length: 14 }, (_, index) => { const date = new Date(`${todayInputValue()}T12:00:00`); date.setDate(date.getDate() + index); const key = date.toISOString().slice(0, 10); const blocked = isDateBlocked(key, machine.unavailableDates) || key < machine.availabilityStart || key > machine.availabilityEnd; return <span key={key} className={blocked ? "calendar-day blocked" : "calendar-day"} title={blocked ? "Outside service window or marked unavailable" : "Inside listed service window; owner confirmation still required"}><small>{date.toLocaleDateString("en-IN", { weekday: "short" })}</small><b>{date.getDate()}</b></span>; })}</div><div className="calendar-legend"><span><i /> Sample available</span><span><i className="legend-blocked" /> Marked unavailable</span></div></section>
      </div>

      <aside className="booking-panel"><div className="booking-panel-top"><span className="eyebrow"><i className="eyebrow-rule" /> REQUEST THIS MACHINE</span><div className="price-line"><div><b>{formatRupees(machine.hourlyRate)}</b><small>/ hour</small></div><span>or</span><div><b>{formatRupees(machine.dailyRate)}</b><small>/ day</small></div></div><p>Rates and transport cost are examples; confirm details with the owner.</p></div>
        <form className="booking-form" onSubmit={submitForReview}><label className="form-label">Required date<input type="date" min={dateMin} max={machine.availabilityEnd} value={form.requestedDate} onChange={event => setForm({ ...form, requestedDate: event.target.value })} required /></label><div className="form-row"><label className="form-label">Preferred time<input type="time" value={form.preferredTime} onChange={event => setForm({ ...form, preferredTime: event.target.value })} required /></label><label className="form-label">Duration<select value={form.durationUnit} onChange={event => setForm({ ...form, durationUnit: event.target.value as "hours" | "days" })}><option value="hours">Hours</option><option value="days">Days</option></select></label></div><label className="form-label">Number of {form.durationUnit}<input type="number" min="1" max="30" value={form.duration} onChange={event => setForm({ ...form, duration: event.target.value })} required /></label><div className="form-section-rule"><span>FARM LOCATION</span></div><div className="form-row"><label className="form-label">Village<input value={form.farmLocation.village} onChange={event => setForm({ ...form, farmLocation: { ...form.farmLocation, village: event.target.value } })} placeholder={currentUser?.role === "farmer" ? currentUser.village : "Village"} required /></label><label className="form-label">Town / taluk<input value={form.farmLocation.town} onChange={event => setForm({ ...form, farmLocation: { ...form.farmLocation, town: event.target.value } })} placeholder={currentUser?.role === "farmer" ? currentUser.town : "Town"} /></label></div><div className="form-row"><label className="form-label">District<input value={form.farmLocation.district} onChange={event => setForm({ ...form, farmLocation: { ...form.farmLocation, district: event.target.value } })} placeholder={currentUser?.role === "farmer" ? currentUser.district : "District"} required /></label><label className="form-label">PIN code<input inputMode="numeric" maxLength={6} value={form.farmLocation.pinCode} onChange={event => setForm({ ...form, farmLocation: { ...form.farmLocation, pinCode: event.target.value.replace(/\D/g, "") } })} placeholder={currentUser?.role === "farmer" ? currentUser.pinCode : "PIN"} /></label></div><label className="form-label">Additional instructions<textarea rows={3} maxLength={500} value={form.instructions} onChange={event => setForm({ ...form, instructions: event.target.value })} placeholder="Field access, crop or transport details…" /></label><div className="booking-estimate"><span>Illustrative estimate · includes listed transport</span><b>{formatRupees(estimate)}</b></div><button className="button button-primary full-width" type="submit">Book Machine <ArrowRight size={16} /></button>{error && <p className="form-error" role="alert">{error} {(!currentUser || currentUser.role !== "farmer") && <Link href="/auth/farmer">Sign in as Farm Holder →</Link>}</p>}<p className="booking-small-print"><Clock3 size={13} /> A request stays pending until an owner accepts. Prototype requests are stored only in this browser.</p></form>
      </aside>
    </div>
    {reviewing && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setReviewing(false); }}><section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title"><button className="modal-close" onClick={() => setReviewing(false)} aria-label="Close"><X size={18} /></button><span className="eyebrow"><i className="eyebrow-rule" /> BEFORE YOU SUBMIT</span><h2 id="review-title">Review this demo request.</h2><p>The following summary will be saved to local browser storage only.</p><div className="review-summary"><div><small>Machine</small><b>{machine.name}</b></div><div><small>Date & preferred time</small><b>{formatDate(form.requestedDate)} · {form.preferredTime}</b></div><div><small>Rental duration</small><b>{form.duration} {form.durationUnit}</b></div><div><small>Farm location</small><b>{form.farmLocation.village}, {form.farmLocation.town}, {form.farmLocation.district} {form.farmLocation.pinCode}</b></div><div><small>Estimated total · demo only</small><b>{formatRupees(estimate)}</b></div></div><div className="modal-actions"><button className="button button-secondary" onClick={() => setReviewing(false)}>Edit request</button><button className="button button-primary" onClick={confirmBooking}>Submit local demo request <Check size={16} /></button></div><small className="modal-disclaimer">No owner is contacted. No payment is taken.</small></section></div>}
  </section></MarketplaceLayout>;
}
