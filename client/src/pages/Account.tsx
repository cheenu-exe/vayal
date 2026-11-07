import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { Check, CircleUserRound, Leaf, Tractor } from "lucide-react";
import { toast } from "sonner";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { MarketplaceLayout } from "@/components/MarketplaceLayout";
import { useLanguage } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";

const initial = { farmerEnabled: true, ownerEnabled: false, phone: "", district: "", taluk: "", village: "", language: "en" as "en" | "ta" };
export default function Account() {
  const { user, loading } = useAuth();
  const { t, setLanguage } = useLanguage();
  const profile = trpc.marketplace.profile.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const utils = trpc.useUtils();
  const [form, setForm] = useState(initial);
  useEffect(() => { if (profile.data) setForm({ farmerEnabled: profile.data.farmerEnabled, ownerEnabled: profile.data.ownerEnabled, phone: profile.data.phone || "", district: profile.data.district || "", taluk: profile.data.taluk || "", village: profile.data.village || "", language: profile.data.language }); }, [profile.data]);
  const save = trpc.marketplace.saveProfile.useMutation({ onSuccess: async value => { await utils.marketplace.profile.invalidate(); setLanguage(value.language); toast.success(t("profileSaved")); }, onError: error => toast.error(error.message) });
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate(form); };
  return <MarketplaceLayout><div className="account-page">
    <div className="page-intro"><span className="section-overline">YOUR ACCOUNT</span><h1>{t("profileTitle")}</h1><p>{t("profileIntro")}</p></div>
    {!user && !loading ? <div className="profile-signin panel"><div className="callout-icon"><CircleUserRound size={23} /></div><h2>Sign in to set up your Vayal profile</h2><p>{t("accountHint")}</p><button className="button button-primary" onClick={() => startLogin()}>{t("signIn")}</button></div> : <form className="profile-form panel" onSubmit={submit}>
      <div className="profile-identity"><span className="avatar-mark"><CircleUserRound size={26} /></span><div><b>{user?.name || "Vayal member"}</b><span>{user?.email || "Manus account"}</span></div></div>
      <div className="role-chooser">
        <label className={`role-choice ${form.farmerEnabled ? "checked" : ""}`}><input type="checkbox" checked={form.farmerEnabled} onChange={event => setForm({ ...form, farmerEnabled: event.target.checked })} /><span className="role-icon"><Tractor size={21} /></span><span><b>{t("farmer")}</b><small>Find equipment and follow your rental requests.</small></span><Check className="role-check" size={17} /></label>
        <label className={`role-choice ${form.ownerEnabled ? "checked" : ""}`}><input type="checkbox" checked={form.ownerEnabled} onChange={event => setForm({ ...form, ownerEnabled: event.target.checked })} /><span className="role-icon"><Leaf size={21} /></span><span><b>{t("ownerRole")}</b><small>Make machinery discoverable and respond to enquiries.</small></span><Check className="role-check" size={17} /></label>
      </div>
      <div className="form-section-label"><span>CONTACT & SERVICE LOCATION</span><i></i></div>
      <div className="profile-fields"><label>{t("phone")}<input type="tel" maxLength={20} value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder="+91 98765 43210" /></label><label>{t("yourDistrict")}<input value={form.district} onChange={event => setForm({ ...form, district: event.target.value })} placeholder="Thanjavur" /></label><label>Taluk<input value={form.taluk} onChange={event => setForm({ ...form, taluk: event.target.value })} placeholder="Kumbakonam" /></label><label>{t("yourVillage")}<input value={form.village} onChange={event => setForm({ ...form, village: event.target.value })} placeholder="Swamimalai" /></label></div>
      <div className="profile-actions"><p>Your contact details are used only to coordinate rental enquiries in Vayal.</p><button className="button button-primary" type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : t("saveProfile")}</button></div>
    </form>}
    <div className="account-links"><Link href="/">← {t("browse")}</Link>{form.ownerEnabled && <Link href="/owner">Manage machinery →</Link>}</div>
  </div></MarketplaceLayout>;
}
