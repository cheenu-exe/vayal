import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CircleUserRound, MapPin, Phone, Save, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { MarketplaceLayout } from "@/components/MarketplaceLayout";
import { DemoNotice, PageHeading } from "@/components/PageHeading";
import { usePrototype } from "@/contexts/PrototypeContext";

function ProfileEditor() {
  const { currentUser, updateProfile } = usePrototype();
  const [form, setForm] = useState({ name: currentUser?.name || "", district: currentUser?.district || "", town: currentUser?.town || "", village: currentUser?.village || "", pinCode: currentUser?.pinCode || "" });
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (currentUser) setForm({ name: currentUser.name, district: currentUser.district, town: currentUser.town, village: currentUser.village, pinCode: currentUser.pinCode }); }, [currentUser]);
  const submit = (event: FormEvent) => { event.preventDefault(); updateProfile(form); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  if (!currentUser) return <MarketplaceLayout><div className="page-container not-found-card"><span className="eyebrow">PROFILE</span><h1>Sign in to view your local profile.</h1><Link className="button button-primary" href="/start">Choose a role <ArrowRight size={15} /></Link></div></MarketplaceLayout>;
  return <MarketplaceLayout><section className="profile-page page-container"><PageHeading eyebrow="YOUR VAYAL PROFILE" title="Account details" description="Update the sample details used to personalise your local prototype." /><DemoNotice>Changes stay in this browser only. The demo phone number is not verified and cannot be edited here.</DemoNotice><div className="profile-grid"><aside className="profile-card"><span className="profile-avatar"><CircleUserRound size={34} /></span><span className="eyebrow">{currentUser.role === "farmer" ? "FARM HOLDER" : "MACHINERY OWNER"}</span><h2>{currentUser.name}</h2><p><Phone size={14} />{currentUser.phone} · demo</p><p><MapPin size={14} />{currentUser.village}, {currentUser.district}</p><span className="profile-status"><ShieldCheck size={15} />Local prototype account</span></aside><form className="profile-form" onSubmit={submit}><span className="eyebrow"><i className="eyebrow-rule" /> PROFILE INFORMATION</span><h2>Where should the prototype look?</h2><label className="form-label">Name<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required /></label><div className="form-row"><label className="form-label">District<input value={form.district} onChange={event => setForm({ ...form, district: event.target.value })} required /></label><label className="form-label">Town / taluk<input value={form.town} onChange={event => setForm({ ...form, town: event.target.value })} /></label></div><div className="form-row"><label className="form-label">Village<input value={form.village} onChange={event => setForm({ ...form, village: event.target.value })} required /></label><label className="form-label">PIN code<input inputMode="numeric" maxLength={6} value={form.pinCode} onChange={event => setForm({ ...form, pinCode: event.target.value.replace(/\D/g, "") })} /></label></div><div className="profile-form-actions"><button className="button button-primary" type="submit"><Save size={15} /> Save local changes</button>{saved && <span className="saved-inline"><ShieldCheck size={15} />Saved in this browser</span>}</div></form></div></section></MarketplaceLayout>;
}

export default ProfileEditor;
