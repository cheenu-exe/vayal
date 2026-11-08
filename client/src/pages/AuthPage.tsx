import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, CircleUserRound, LockKeyhole, Smartphone, Tractor, UserRound } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { MarketplaceLayout } from "@/components/MarketplaceLayout";
import { DemoNotice } from "@/components/PageHeading";
import { normalizePhone, usePrototype } from "@/contexts/PrototypeContext";
import type { Role } from "@/prototype/types";

const roleCopy: Record<Role, { name: string; title: string; intro: string; dashboard: string; icon: typeof Tractor }> = {
  farmer: { name: "Farm Holder", title: "Your fieldwork, in reach.", intro: "Verify your mobile number to access your farm holder workspace.", dashboard: "/farmer", icon: Tractor },
  owner: { name: "Machinery Owner", title: "Make your machine easier to find.", intro: "Verify your mobile number to access your machinery owner workspace.", dashboard: "/owner", icon: UserRound },
};

async function postJson(path: string, body: Record<string, string>) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => ({}));
  const result = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "The request failed. Please try again.");
  return result;
}

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
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    if (step !== "otp" || resendAvailableAt <= clock) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [step, resendAvailableAt, clock]);

  const resendSeconds = Math.max(0, Math.ceil((resendAvailableAt - clock) / 1000));

  const requestOtp = async (normalizedPhone: string) => {
    const result = await postJson("/api/auth/otp/request", { phone: normalizedPhone });
    const now = Date.now();
    setPhone(normalizedPhone);
    setOtp("");
    setResendAvailableAt(now + Number(result.resendAfterSeconds || 30) * 1000);
    setClock(now);
    setMessage("A six-digit verification code has been sent by SMS.");
    setStep("otp");
  };

  const submitPhone = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizePhone(phoneInput);
    if (!normalized) {
      setMessage("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setMessage("");
    setSending(true);
    try {
      await requestOtp(normalized);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send the verification code.");
    } finally {
      setSending(false);
    }
  };

  const resendOtp = async () => {
    if (!phone || sending || resendSeconds > 0) return;
    setMessage("");
    setSending(true);
    try {
      await requestOtp(phone);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not resend the verification code.");
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (otp.length !== 6) {
      setMessage("Enter the six-digit code sent to your phone.");
      return;
    }
    setMessage("");
    setVerifying(true);
    try {
      const result = await postJson("/api/auth/otp/verify", { phone, otp });
      if (result.verified !== true) throw new Error("The code could not be verified. Request a new code and try again.");
      const existing = findProfile(role, phone);
      if (existing && beginSession(role, phone)) {
        setLocation(content.dashboard);
        return;
      }
      setStep("profile");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not verify the code.");
    } finally {
      setVerifying(false);
    }
  };

  const finishProfile = (event: FormEvent) => {
    event.preventDefault();
    if (!profile.name.trim() || !profile.village.trim() || !profile.district.trim()) {
      setMessage("Add your name, village and district to complete your profile.");
      return;
    }
    completeRegistration({
      role,
      phone,
      name: profile.name.trim(),
      district: profile.district.trim(),
      town: profile.town.trim(),
      village: profile.village.trim(),
      pinCode: profile.pinCode.trim(),
    });
    setLocation(content.dashboard);
  };

  return <MarketplaceLayout><section className="auth-page page-container">
    <div className="auth-back"><Link href="/start"><ArrowLeft size={15} /> Back to role selection</Link><span className="role-card-index">{content.name.toUpperCase()} · PHONE VERIFICATION</span></div>
    <div className="auth-grid">
      <aside className="auth-story"><span className="auth-story-icon"><Icon size={25} /></span><span className="eyebrow"><i className="eyebrow-rule" /> {content.name.toUpperCase()}</span><h1>{content.title}</h1><p>{content.intro}</p><div className="auth-story-lines"><div><b>01</b><span>Enter your mobile number</span><Check size={15} /></div><div><b>02</b><span>Verify the SMS code</span><Check size={15} /></div><div><b>03</b><span>Continue to your workspace</span><Check size={15} /></div></div><DemoNotice variant="green">OTP delivery and verification happen on the server through MSG91. The current prototype still stores profile and marketplace data in this browser.</DemoNotice></aside>
      <div className="auth-panel">
        <div className="auth-stepper"><span className={step === "phone" ? "step-active" : "step-done"}><i>1</i> Mobile number</span><span className={step === "otp" ? "step-active" : step === "profile" ? "step-done" : ""}><i>2</i> SMS OTP</span><span className={step === "profile" ? "step-active" : ""}><i>3</i> Profile</span></div>
        {step === "phone" && <form onSubmit={submitPhone} className="form-stack"><span className="eyebrow"><i className="eyebrow-rule" /> {content.name.toUpperCase()} SIGN IN</span><h2>Enter your mobile number</h2><p>We will send a one-time verification code to this number by SMS.</p><label className="form-label">Mobile number<div className="phone-field"><span>+91</span><input autoComplete="tel-national" inputMode="numeric" maxLength={12} value={phoneInput} onChange={event => setPhoneInput(event.target.value)} placeholder="98765 43210" required /></div></label><button className="button button-primary full-width" type="submit" disabled={sending}>{sending ? "Sending code…" : "Send verification code"} <ArrowRight size={16} /></button><p className="field-caption"><LockKeyhole size={13} /> Your number is sent securely to Vayal's SMS provider for verification.</p>{message && <p className="form-error" role="alert">{message}</p>}</form>}
        {step === "otp" && <form onSubmit={verifyOtp} className="form-stack"><button className="quiet-back" type="button" onClick={() => { setStep("phone"); setMessage(""); }}><ArrowLeft size={14} /> Change mobile number</button><span className="otp-icon"><Smartphone size={21} /></span><span className="eyebrow"><i className="eyebrow-rule" /> SMS CODE · {phone}</span><h2>Enter the six-digit code</h2><p>Check your SMS inbox and enter the code sent to your mobile number.</p><label className="form-label">Six-digit OTP<input className="otp-input" autoComplete="one-time-code" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" required /></label><button className="button button-primary full-width" type="submit" disabled={verifying || otp.length !== 6}>{verifying ? "Verifying…" : "Verify and continue"} <ArrowRight size={16} /></button><button type="button" className="demo-fill-button" onClick={resendOtp} disabled={sending || resendSeconds > 0}>{sending ? "Sending…" : resendSeconds > 0 ? "Resend code in " + resendSeconds + "s" : "Resend OTP"}</button>{message && <p className="form-error" role="alert">{message}</p>}</form>}
        {step === "profile" && <form onSubmit={finishProfile} className="form-stack"><span className="otp-icon"><CircleUserRound size={22} /></span><span className="eyebrow"><i className="eyebrow-rule" /> FIRST-TIME PROFILE</span><h2>Tell us where you work</h2><p>Your mobile number has been verified. Add the details for your Vayal workspace.</p><div className="form-grid-two"><label className="form-label form-span-two">Name<input autoComplete="name" value={profile.name} onChange={event => setProfile({ ...profile, name: event.target.value })} placeholder="Your name" required /></label><label className="form-label">District<input value={profile.district} onChange={event => setProfile({ ...profile, district: event.target.value })} placeholder="Coimbatore" required /></label><label className="form-label">Town / taluk<input value={profile.town} onChange={event => setProfile({ ...profile, town: event.target.value })} placeholder="Pollachi" /></label><label className="form-label">Village<input value={profile.village} onChange={event => setProfile({ ...profile, village: event.target.value })} placeholder="Your village" required /></label><label className="form-label">PIN code<input inputMode="numeric" maxLength={6} value={profile.pinCode} onChange={event => setProfile({ ...profile, pinCode: event.target.value.replace(/\D/g, "") })} placeholder="642001" /></label></div><button className="button button-primary full-width" type="submit">Complete profile <ArrowRight size={16} /></button><p className="field-caption">Role: {content.name} · Verified number: {phone} · Profile data stays in this browser prototype.</p>{message && <p className="form-error" role="alert">{message}</p>}</form>}
      </div>
    </div>
  </section></MarketplaceLayout>;
}
