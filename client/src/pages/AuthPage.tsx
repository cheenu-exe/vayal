import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, CircleUserRound, LockKeyhole, Smartphone, Tractor, UserRound } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { MarketplaceLayout } from "@/components/MarketplaceLayout";
import { DemoNotice } from "@/components/PageHeading";
import { normalizePhone, usePrototype } from "@/contexts/PrototypeContext";
import type { Role } from "@/prototype/types";

const roleCopy: Record<Role, { name: string; title: string; intro: string; dashboard: string; icon: typeof Tractor; demoPhone: string }> = {
  farmer: { name: "Farm Holder", title: "Your fieldwork, in reach.", intro: "Sign in to keep machinery requests and farm details together in your local demo.", dashboard: "/farmer", icon: Tractor, demoPhone: "9876543210" },
  owner: { name: "Machinery Owner", title: "Make your machine easier to find.", intro: "Sign in to manage sample listings, requests and verification states in your local demo.", dashboard: "/owner", icon: UserRound, demoPhone: "9876543211" },
};

export default function AuthPage() {
  const [, params] = useRoute("/auth/:role");
  const role: Role = params?.role === "owner" ? "owner" : "farmer";
  const content = roleCopy[role];
  const Icon = content.icon;
  const { findProfile, beginSession, completeRegistration } = usePrototype();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"phone" | "otp" | "profile">("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [otp, setOtp] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState({ name: "", district: "", town: "", village: "", pinCode: "" });

  const requestOtp = (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizePhone(phoneInput);
    if (!normalized) { setMessage("Enter a valid 10-digit Indian mobile number for this demo."); return; }
    setPhone(normalized);
    setMessage("");
    setStep("otp");
  };

  const verifyOtp = (event: FormEvent) => {
    event.preventDefault();
    if (otp !== "123456") { setMessage("That is not the demo code. Use 123456 to continue."); return; }
    const existing = findProfile(role, phone);
    if (existing) {
      beginSession(role, phone);
      setLocation(content.dashboard);
      return;
    }
    setMessage("");
    setStep("profile");
  };

  const finishProfile = (event: FormEvent) => {
    event.preventDefault();
    if (!profile.name.trim() || !profile.village.trim() || !profile.district.trim()) {
      setMessage("Add your name, village and district to complete the local demo profile.");
      return;
    }
    completeRegistration({ role, phone, name: profile.name.trim(), district: profile.district.trim(), town: profile.town.trim(), village: profile.village.trim(), pinCode: profile.pinCode.trim() });
    setLocation(content.dashboard);
  };

  const chooseDemo = () => { setPhoneInput(content.demoPhone); setMessage(""); };

  return <MarketplaceLayout><section className="auth-page page-container">
    <div className="auth-back"><Link href="/start"><ArrowLeft size={15} /> Back to role selection</Link><span className="role-card-index">{content.name.toUpperCase()} · LOCAL DEMO</span></div>
    <div className="auth-grid">
      <aside className="auth-story"><span className="auth-story-icon"><Icon size={25} /></span><span className="eyebrow"><i className="eyebrow-rule" /> {content.name.toUpperCase()}</span><h1>{content.title}</h1><p>{content.intro}</p><div className="auth-story-lines"><div><b>01</b><span>Enter a mobile number</span><Check size={15} /></div><div><b>02</b><span>Use the displayed demo code</span><Check size={15} /></div><div><b>03</b><span>Continue in your role workspace</span><Check size={15} /></div></div><DemoNotice variant="green">No SMS is sent. This prototype does not verify a real phone number.</DemoNotice></aside>
      <div className="auth-panel">
        <div className="auth-stepper"><span className={step === "phone" ? "step-active" : "step-done"}><i>1</i> Mobile number</span><span className={step === "otp" ? "step-active" : step === "profile" ? "step-done" : ""}><i>2</i> Demo OTP</span><span className={step === "profile" ? "step-active" : ""}><i>3</i> Profile</span></div>
        {step === "phone" && <form onSubmit={requestOtp} className="form-stack"><span className="eyebrow"><i className="eyebrow-rule" /> {content.name.toUpperCase()} SIGN IN</span><h2>Enter your mobile number</h2><p>Use your own number or select a seeded demo account. Nothing will be sent.</p><label className="form-label">Mobile number<div className="phone-field"><span>+91</span><input autoComplete="tel-national" inputMode="numeric" maxLength={12} value={phoneInput} onChange={event => setPhoneInput(event.target.value)} placeholder="98765 43210" required /></div></label><button className="button button-primary full-width" type="submit">Request demo OTP <ArrowRight size={16} /></button><button className="demo-fill-button" type="button" onClick={chooseDemo}>Use the sample {content.name.toLowerCase()} account · {content.demoPhone}</button><p className="field-caption"><LockKeyhole size={13} /> Mobile number is stored only in local prototype state.</p>{message && <p className="form-error" role="alert">{message}</p>}</form>}
        {step === "otp" && <form onSubmit={verifyOtp} className="form-stack"><button className="quiet-back" type="button" onClick={() => setStep("phone")}><ArrowLeft size={14} /> Change mobile number</button><span className="otp-icon"><Smartphone size={21} /></span><span className="eyebrow"><i className="eyebrow-rule" /> DEMO CODE · {phone}</span><h2>Enter the six-digit code</h2><p>For this prototype, use the fixed code below. No message will be sent.</p><DemoNotice>Demo OTP: <b>123456</b> · not a real phone verification</DemoNotice><label className="form-label">Six-digit demo OTP<input className="otp-input" autoComplete="one-time-code" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" required /></label><button type="button" className="demo-fill-button" onClick={() => setOtp("123456")}>Fill demo code</button><button className="button button-primary full-width" type="submit">Verify demo code <ArrowRight size={16} /></button>{message && <p className="form-error" role="alert">{message}</p>}</form>}
        {step === "profile" && <form onSubmit={finishProfile} className="form-stack"><span className="otp-icon"><CircleUserRound size={22} /></span><span className="eyebrow"><i className="eyebrow-rule" /> FIRST-TIME DEMO PROFILE</span><h2>Tell us where you work</h2><p>This local profile helps the prototype personalise machine discovery and requests.</p><div className="form-grid-two"><label className="form-label form-span-two">Name<input autoComplete="name" value={profile.name} onChange={event => setProfile({ ...profile, name: event.target.value })} placeholder="Your name" required /></label><label className="form-label">District<input value={profile.district} onChange={event => setProfile({ ...profile, district: event.target.value })} placeholder="Thanjavur" required /></label><label className="form-label">Town / taluk<input value={profile.town} onChange={event => setProfile({ ...profile, town: event.target.value })} placeholder="Kumbakonam" /></label><label className="form-label">Village<input value={profile.village} onChange={event => setProfile({ ...profile, village: event.target.value })} placeholder="Your village" required /></label><label className="form-label">PIN code<input inputMode="numeric" maxLength={6} value={profile.pinCode} onChange={event => setProfile({ ...profile, pinCode: event.target.value.replace(/\D/g, "") })} placeholder="612302" /></label></div><button className="button button-primary full-width" type="submit">Complete local profile <ArrowRight size={16} /></button><p className="field-caption">Role: {content.name} · Number: {phone} · Browser-local demo only</p>{message && <p className="form-error" role="alert">{message}</p>}</form>}
      </div>
    </div>
  </section></MarketplaceLayout>;
}
