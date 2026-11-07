import { Link } from "wouter";
import { ArrowRight, CalendarDays, MapPin, Tractor } from "lucide-react";
import { toast } from "sonner";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { MarketplaceLayout } from "@/components/MarketplaceLayout";
import { useLanguage } from "@/lib/i18n";
import { statusLabel } from "@/lib/marketplace";
import { trpc } from "@/lib/trpc";

export default function FarmerRequests() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const profile = trpc.marketplace.profile.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const requests = trpc.marketplace.myBookings.useQuery(undefined, { enabled: Boolean(user && profile.data?.farmerEnabled), retry: false });
  const utils = trpc.useUtils();
  const update = trpc.marketplace.updateBooking.useMutation({ onSuccess: async () => { await utils.marketplace.myBookings.invalidate(); toast.success("Request updated."); }, onError: error => toast.error(error.message) });
  return <MarketplaceLayout><div className="requests-page">
    <div className="page-intro"><span className="section-overline">FARMER WORKSPACE</span><h1>{t("farmerRequests")}</h1><p>Keep your machinery enquiries and fieldwork dates together.</p></div>
    {!user && !loading ? <div className="state-panel"><div className="loading-mark"><Tractor size={21} /></div><h3>Sign in to view your requests</h3><button className="button button-primary" onClick={() => startLogin()}>{t("signIn")}</button></div> : profile.data && !profile.data.farmerEnabled ? <div className="state-panel"><div className="loading-mark"><Tractor size={21} /></div><h3>Enable farmer access to see your requests</h3><Link className="button button-primary" href="/account">{t("openProfile")}</Link></div> : requests.isLoading ? <div className="page-state">Loading your requests…</div> : requests.data?.length ? <div className="request-list">{requests.data.map(row => {
      const b = row.booking;
      return <article className="request-card" key={b.id}>
        <div className="request-card-image"><img src={row.imageUrl || "/manus-storage/async-images/8P6agS5NXeeAVtkqdQiTO1/image-2.webp"} alt={row.machineName} /></div>
        <div className="request-card-content"><div className="request-card-top"><span className={`status-pill status-${b.status}`}>{statusLabel(b.status, t)}</span><span className="request-number">VY-{String(b.id).padStart(4, "0")}</span></div><h2>{row.machineTitle}</h2><p><CalendarDays size={14} />{b.startDate} – {b.endDate}<span className="request-separator">·</span><MapPin size={14} />{b.farmerVillage}, {b.farmerDistrict}</p><div className="request-detail-line"><b>Fieldwork:</b> {b.operation}{b.areaAcres ? ` · ${b.areaAcres} acres` : ""}<span className="request-separator">·</span><b>Owner:</b> {row.ownerName}</div>{b.ownerResponse && <div className="owner-response"><b>Owner note</b><p>{b.ownerResponse}</p></div>}</div>
        <div className="request-card-actions"><Link href={`/machine/${b.listingId}`} className="text-button">View machine <ArrowRight size={15} /></Link>{b.status === "pending" && <button className="button button-outline-danger" disabled={update.isPending} onClick={() => update.mutate({ id: b.id, status: "cancelled" })}>{t("cancelRequest")}</button>}</div>
      </article>;
    })}</div> : requests.isError ? <div className="state-panel error-panel">Could not load your requests. <button onClick={() => requests.refetch()}>{t("retry")}</button></div> : <div className="state-panel empty-panel"><div className="loading-mark"><CalendarDays size={20} /></div><h3>{t("noFarmerRequests")}</h3><p>Requests you send to machinery owners will appear here.</p><Link href="/" className="button button-primary">{t("browse")} <ArrowRight size={16} /></Link></div>}
  </div></MarketplaceLayout>;
}
