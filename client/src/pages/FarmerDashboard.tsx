import { useMemo, useState } from "react";
import { ArrowDownUp, ArrowRight, CalendarDays, MapPin, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Tractor } from "lucide-react";
import { Link } from "wouter";
import { MachineCard } from "@/components/MachineCard";
import { MarketplaceLayout } from "@/components/MarketplaceLayout";
import { PageHeading } from "@/components/PageHeading";
import { RoleGate } from "@/components/RoleGate";
import { usePrototype } from "@/contexts/PrototypeContext";
import { categories, todayInputValue } from "@/prototype/format";

function MachineryBrowser({ dashboard = false }: { dashboard?: boolean }) {
  const { state, currentUser } = usePrototype();
  const params = new URLSearchParams(window.location.search);
  const [query, setQuery] = useState(params.get("q") || "");
  const [location, setLocation] = useState(dashboard && currentUser ? `${currentUser.village}, ${currentUser.district}` : "");
  const [category, setCategory] = useState(params.get("category") || "");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxDistance, setMaxDistance] = useState("");
  const [availableDate, setAvailableDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const verifiedMachines = useMemo(() => state.machines.filter(machine => machine.enabled && machine.verificationStatus === "verified"), [state.machines]);
  const filtered = useMemo(() => {
    const searchText = `${query} ${location}`.trim().toLowerCase();
    return verifiedMachines.filter(machine => {
      const words = `${machine.name} ${machine.category} ${machine.manufacturer} ${machine.model} ${machine.description} ${machine.district} ${machine.town} ${machine.village} ${machine.pinCode} ${machine.operatingArea}`.toLowerCase();
      if (searchText && !searchText.split(/[\s,]+/).filter(Boolean).every(word => words.includes(word))) return false;
      if (category && machine.category !== category) return false;
      if (maxPrice && machine.hourlyRate > Number(maxPrice) && machine.dailyRate > Number(maxPrice)) return false;
      if (maxDistance && machine.distanceKm > Number(maxDistance)) return false;
      if (availableDate && (machine.unavailableDates.includes(availableDate) || availableDate < machine.availabilityStart || availableDate > machine.availabilityEnd)) return false;
      return true;
    });
  }, [verifiedMachines, query, location, category, maxPrice, maxDistance, availableDate]);

  const clear = () => { setQuery(""); setLocation(""); setCategory(""); setMaxPrice(""); setMaxDistance(""); setAvailableDate(""); };
  const hasFilters = Boolean(query || location || category || maxPrice || maxDistance || availableDate);

  return <MarketplaceLayout><section className="catalog-page page-container">
    {dashboard ? <PageHeading eyebrow="FARM HOLDER DASHBOARD" title={`Good ${new Date().getHours() < 12 ? "morning" : "day"}, ${currentUser?.name.split(" ")[0] || "farmer"}.`} description="Find the machine your fieldwork needs, then keep each request in view." action={<Link href="/farmer/bookings" className="button button-secondary">My Bookings <ArrowRight size={15} /></Link>} /> : <PageHeading eyebrow="BROWSE THE NETWORK" title="Machinery near the work." description="Search the sample network by equipment, operation or the place your field needs service." />}
    <div className="catalog-disclosure"><span><ShieldCheck size={16} /> Demo listings with a simulated “Verified” state only</span><span><MapPin size={15} /> Approximate distance from the sample hub · not GPS</span></div>
    <div className="browse-filter-bar">
      <label className="browse-search"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tractors, harvesters, fieldwork…" aria-label="Search machinery" /></label>
      <label className="browse-search location-search"><MapPin size={17} /><input value={location} onChange={event => setLocation(event.target.value)} placeholder="Village, town, district or PIN" aria-label="Search location" /></label>
      <button className={`button button-secondary filter-toggle ${showFilters ? "selected" : ""}`} onClick={() => setShowFilters(value => !value)} aria-expanded={showFilters}><SlidersHorizontal size={15} /> Filters {hasFilters && <span className="filter-count">{[query, location, category, maxPrice, maxDistance, availableDate].filter(Boolean).length}</span>}</button>
    </div>
    <div className="category-chip-row catalog-categories">{["All machinery", ...categories].map(item => <button key={item} className={`category-chip ${category === item || (item === "All machinery" && !category) ? "category-chip-active" : ""}`} onClick={() => setCategory(item === "All machinery" ? "" : item)}>{item === "All machinery" ? <Tractor size={15} /> : null}{item}</button>)}</div>
    {showFilters && <div className="filter-panel"><label className="filter-select"><span>Maximum rate (₹)</span><input type="number" min="1" value={maxPrice} onChange={event => setMaxPrice(event.target.value)} placeholder="Any price" /></label><label className="filter-select"><span>Approx. distance</span><select value={maxDistance} onChange={event => setMaxDistance(event.target.value)}><option value="">Any distance</option><option value="10">Within ~10 km</option><option value="25">Within ~25 km</option><option value="50">Within ~50 km</option><option value="100">Within ~100 km</option></select></label><label className="filter-select"><span>Available on</span><input type="date" min={todayInputValue()} value={availableDate} onChange={event => setAvailableDate(event.target.value)} /></label><label className="filter-select"><span>Machine type</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option>{categories.map(item => <option key={item}>{item}</option>)}</select></label><button className="text-link filter-clear" onClick={clear}><RotateCcw size={14} /> Clear filters</button></div>}
    <div className="catalog-heading"><div><span className="eyebrow"><i className="eyebrow-rule" /> SAMPLE MACHINERY · TAMIL NADU</span><h2>{filtered.length} {filtered.length === 1 ? "machine" : "machines"} to explore</h2></div><span className="catalog-sort"><ArrowDownUp size={14} /> Nearest first · illustrative</span></div>
    {filtered.length ? <div className="machine-grid">{filtered.sort((a, b) => a.distanceKm - b.distanceKm).map(machine => <MachineCard key={machine.id} machine={machine} />)}</div> : <div className="empty-state"><span><Search size={23} /></span><h3>No demo machines match those filters</h3><p>Try another place or clear a filter. This prototype includes a small Tamil Nadu sample network.</p><button className="button button-secondary" onClick={clear}>Clear filters</button></div>}
    <div className="catalog-footnote"><CalendarDays size={15} /> Availability and distance are sample data. Confirm real timing, rates and transport with the owner in a future live service.</div>
  </section></MarketplaceLayout>;
}

export function FarmerHome() {
  return <RoleGate role="farmer"><MachineryBrowser dashboard /></RoleGate>;
}

export default function FarmerDashboard() {
  return <MachineryBrowser />;
}
