import { useState } from "react";
import { ArrowRight, Check, FileText, Info, ShieldCheck, Upload, X } from "lucide-react";
import { Link } from "wouter";
import { MarketplaceLayout } from "@/components/MarketplaceLayout";
import { VerificationBadge } from "@/components/StatusBadge";
import { DemoNotice, PageHeading } from "@/components/PageHeading";
import { RoleGate } from "@/components/RoleGate";
import { usePrototype } from "@/contexts/PrototypeContext";
import { verificationStatusLabel } from "@/prototype/format";
import type { VerificationStatus } from "@/prototype/types";

const verificationStatuses: VerificationStatus[] = ["not_submitted", "submitted", "under_review", "verified", "rejected", "additional_documents_required"];
const reasons: Partial<Record<VerificationStatus, string>> = {
  rejected: "Please provide a clearer identification / serial-number photograph and proof of ownership. (Simulated demo reason.)",
  additional_documents_required: "A supporting document relevant to this machine category may be needed. (Simulated demo request.)",
  under_review: "Sample listing is waiting for a simulated review. No reviewer is connected.",
};

function ReviewQueue() {
  const { state, currentUser, changeVerification } = usePrototype();
  const machines = state.machines.filter(machine => machine.ownerPhone === currentUser?.phone);
  const [reasonsById, setReasonsById] = useState<Record<string, string>>({});
  return <MarketplaceLayout><section className="verification-page page-container"><PageHeading eyebrow="MACHINERY OWNER WORKSPACE" title="Verification Details" description="See a sample review state, supporting document list and any simulated follow-up." action={<Link className="button button-secondary" href="/owner/machinery">My Machinery <ArrowRight size={15} /></Link>} /><DemoNotice>Every status and reason is simulated. No authority, platform reviewer or external service has checked these machines or documents.</DemoNotice><div className="verification-explainer"><span><Info size={17} /></span><p><b>Documents depend on machine category and applicable regulations.</b><br />This prototype does not require vehicle-specific papers for every equipment type. Uploaded document names remain local and are not sent for review.</p></div>
    {machines.length ? <div className="review-machine-list">{machines.map(machine => <article className="review-machine-card" key={machine.id}><div className="review-machine-head"><img src={machine.photos[0]} alt={machine.name} /><div><span className="overline">{machine.category} · {machine.manufacturer} {machine.model}</span><h2>{machine.name}</h2><VerificationBadge status={machine.verificationStatus} /><p>{machine.verificationReason || "No additional review note."}</p></div><Link href={`/owner/machinery/${machine.id}`} className="text-link">Edit machine <ArrowRight size={14} /></Link></div><div className="review-documents"><span className="eyebrow"><i className="eyebrow-rule" /> SUPPORTING DOCUMENTS · LOCAL NAMES ONLY</span>{machine.documents.length ? machine.documents.map(doc => <span key={doc} className="document-chip"><FileText size={14} />{doc}</span>) : <span className="document-empty">No document names attached in this demo.</span>}</div><div className="review-state-control"><label className="form-label">Simulate review status<select value={machine.verificationStatus} onChange={event => { const status = event.target.value as VerificationStatus; changeVerification(machine.id, status, reasons[status] || ""); }}>{verificationStatuses.map(status => <option key={status} value={status}>{verificationStatusLabel(status)}</option>)}</select></label><p>Demo control only · status changes are local and are not a real approval.</p></div>{machine.verificationStatus === "rejected" || machine.verificationStatus === "additional_documents_required" ? <label className="form-label review-reason-field">Simulated review reason<textarea value={reasonsById[machine.id] ?? machine.verificationReason} onChange={event => setReasonsById({ ...reasonsById, [machine.id]: event.target.value })} rows={2} /><button className="button button-secondary" onClick={() => changeVerification(machine.id, machine.verificationStatus, reasonsById[machine.id] ?? machine.verificationReason)}>Save local reason</button></label> : null}<div className={`review-visibility-note ${machine.verificationStatus === "verified" && machine.enabled ? "visibility-eligible" : ""}`}><ShieldCheck size={16} /><span>{machine.verificationStatus === "verified" && machine.enabled ? "Eligible for Farm Holder discovery in this prototype (simulated)." : "Hidden from Farm Holder discovery until marked Verified and active in the prototype."}</span></div></article>)}</div> : <div className="empty-state"><span><Upload size={22} /></span><h3>No machinery to review</h3><p>Register a machine to explore the review-status flow.</p><Link className="button button-primary" href="/owner/machinery/new">Add Machinery <ArrowRight size={15} /></Link></div>}
    <div className="verification-status-key"><span className="overline">SAMPLE STATUS KEY</span><div>{verificationStatuses.map(status => <span key={status}><VerificationBadge status={status} compact /></span>)}</div></div>
  </section></MarketplaceLayout>;
}

export default function VerificationPage() {
  return <RoleGate role="owner"><ReviewQueue /></RoleGate>;
}
