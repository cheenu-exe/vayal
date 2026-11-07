import { ArrowUpRight, MapPin, ShieldCheck, Truck } from "lucide-react";
import { Link } from "wouter";
import { formatRupees } from "@/prototype/format";
import type { MachineListing } from "@/prototype/types";

export function MachineCard({ machine }: { machine: MachineListing }) {
  const photo = machine.photos[0] || "/manus-storage/async-images/8P6agS5NXeeAVtkqdQiTO1/image-2.webp";
  return <article className="machine-card">
    <Link href={`/machine/${machine.id}`} className="machine-card-visual" aria-label={`View ${machine.name}`}>
      <img src={photo} alt={`${machine.name} in an agricultural field`} loading="lazy" />
      <span className="machine-category-chip">{machine.category}</span>
      <span className="machine-demo-mark">DEMO</span>
      <span className="machine-visual-arrow"><ArrowUpRight size={17} /></span>
    </Link>
    <div className="machine-card-body">
      <div className="machine-card-top"><span className="machine-operation">{machine.manufacturer} · {machine.model}</span><span className="machine-rating">★ {machine.rating.toFixed(1)}</span></div>
      <h3><Link href={`/machine/${machine.id}`}>{machine.name}</Link></h3>
      <div className="machine-card-meta"><span><MapPin size={14} />{machine.village}, {machine.district}</span><span>~{machine.distanceKm} km · demo estimate</span></div>
      <div className="machine-card-tags"><span className="verification-mini"><ShieldCheck size={14} />Verified · demo status</span>{machine.hasOperator && <span><Truck size={13} />Operator</span>}</div>
      <div className="machine-card-rate"><div><b>{formatRupees(machine.hourlyRate)}</b><small>/ hour</small><span className="rate-divider">·</span><b>{formatRupees(machine.dailyRate)}</b><small>/ day</small></div><Link href={`/machine/${machine.id}`}>View details <ArrowUpRight size={14} /></Link></div>
    </div>
  </article>;
}
