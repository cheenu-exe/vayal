import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronLeft, FileText, ImagePlus, Info, MapPin, Plus, Save, ShieldCheck, Tractor, Trash2, Truck, UploadCloud } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { MarketplaceLayout } from "@/components/MarketplaceLayout";
import { DemoNotice, PageHeading } from "@/components/PageHeading";
import { RoleGate } from "@/components/RoleGate";
import { usePrototype } from "@/contexts/PrototypeContext";
import { compressPhoto } from "@/prototype/photo";
import { categories, formatRupees, todayInputValue } from "@/prototype/format";
import type { MachineDraft, MachineListing } from "@/prototype/types";

const stepNames = ["Basic Information", "Machine Details", "Photographs", "Document Verification", "Rental Information", "Review and Submit"];
const photoSlots = ["Front view", "Side view", "Rear view", "Additional photos"];

function blankDraft(): MachineDraft {
  return {
    name: "", category: "Tractors", manufacturer: "", model: "", year: new Date().getFullYear(), serialNumber: "", capacity: "", specifications: "", condition: "Good", fuelType: "Diesel", description: "", photos: [], documents: [],
    hourlyRate: 0, dailyRate: 0, hasOperator: false, operatorName: "", district: "", town: "", village: "", pinCode: "", operatingArea: "", transportCharge: 0,
    availabilityStart: todayInputValue(), availabilityEnd: "", unavailableDates: [],
  };
}

function draftFromMachine(machine: MachineListing): MachineDraft {
  const { id: _id, ownerPhone: _ownerPhone, ownerName: _ownerName, verificationStatus: _verificationStatus, verificationReason: _verificationReason, enabled: _enabled, isDemo: _isDemo, distanceKm: _distanceKm, rating: _rating, reviewCount: _reviewCount, createdAt: _createdAt, ...draft } = machine;
  return draft;
}

function readDraft(key: string) {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? { ...blankDraft(), ...JSON.parse(saved) as Partial<MachineDraft> } : blankDraft();
  } catch { return blankDraft(); }
}

function RegistrationWizard() {
  const [, params] = useRoute("/owner/machinery/:id");
  const editId = params?.id && params.id !== "new" ? params.id : null;
  const { state, currentUser, createMachine, updateMachine } = usePrototype();
  const [, setLocation] = useLocation();
  const machine = editId ? state.machines.find(item => item.id === editId && item.ownerPhone === currentUser?.phone) : undefined;
  const storageKey = `vayal-machine-draft-v1-${currentUser?.phone || "local"}-${editId || "new"}`;
  const [form, setForm] = useState<MachineDraft>(() => machine ? draftFromMachine(machine) : readDraft(storageKey));
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("");
  const [blockCandidate, setBlockCandidate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(machine ? draftFromMachine(machine) : readDraft(storageKey)); setStep(0); }, [machine?.id, storageKey]);
  useEffect(() => { try { window.localStorage.setItem(storageKey, JSON.stringify(form)); } catch { /* Local draft is optional if storage is full. */ } }, [form, storageKey]);

  const update = <K extends keyof MachineDraft>(key: K, value: MachineDraft[K]) => setForm(previous => ({ ...previous, [key]: value }));

  const choosePhoto = async (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const choosingAdditional = index === 3;
    const selectedFiles = (choosingAdditional ? files : files.slice(0, 1)).slice(0, choosingAdditional ? Math.max(0, 8 - form.photos.length) : 1);
    if (!selectedFiles.length) {
      setMessage("A listing can store up to eight compressed photos in this browser demo.");
      event.target.value = "";
      return;
    }
    setMessage("");
    try {
      const compressed = await Promise.all(selectedFiles.map(compressPhoto));
      setForm(previous => {
        if (choosingAdditional) return { ...previous, photos: [...previous.photos.slice(0, 3), ...previous.photos.slice(3), ...compressed].slice(0, 8) };
        const next = [...previous.photos];
        next[index] = compressed[0];
        return { ...previous, photos: next };
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not preview that photo.");
    }
    event.target.value = "";
  };

  const validateStep = () => {
    if (step === 0 && (!form.name.trim() || !form.manufacturer.trim() || !form.model.trim() || !form.year)) return "Add machine name, manufacturer, model and manufacturing year to continue.";
    if (step === 1 && (!form.capacity.trim() || !form.specifications.trim() || !form.description.trim())) return "Add horsepower or capacity, specifications and a machine description.";
    if (step === 2 && [0, 1, 2].some(index => !form.photos[index])) return "Add a front, side and rear machine photo before continuing. Additional photos are optional.";
    if (step === 4 && (form.hourlyRate <= 0 || form.dailyRate <= 0 || !form.district.trim() || !form.town.trim() || !form.village.trim() || !form.availabilityEnd)) return "Add hourly and daily rates, your operating location and the end of your sample availability window.";
    if (step === 4 && form.availabilityEnd < form.availabilityStart) return "Availability end must be on or after the start date.";
    return "";
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    if (step < stepNames.length - 1) {
      const issue = validateStep();
      if (issue) { setMessage(issue); return; }
      setStep(step + 1);
      return;
    }
    if (saving) return;
    setSaving(true);
    const payload: MachineDraft = { ...form, name: form.name.trim(), manufacturer: form.manufacturer.trim(), model: form.model.trim(), description: form.description.trim(), photos: form.photos.filter(Boolean) };
    if (editId && machine) {
      updateMachine(machine.id, payload);
      try { window.localStorage.removeItem(storageKey); } catch { /* Ignore local storage restrictions. */ }
      setLocation("/owner/machinery");
      return;
    }
    const id = createMachine(payload);
    if (!id) { setSaving(false); setMessage("Could not save this machine into local prototype data. Check your owner demo session."); return; }
    try { window.localStorage.removeItem(storageKey); } catch { /* Ignore local storage restrictions. */ }
    setLocation("/owner/verification");
  };

  const addUnavailableDate = () => {
    if (!blockCandidate || form.unavailableDates.includes(blockCandidate)) return;
    update("unavailableDates", [...form.unavailableDates, blockCandidate].sort());
    setBlockCandidate("");
  };

  const onDocuments = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []).map(file => `${file.name} · ${Math.max(1, Math.round(file.size / 1024))} KB`);
    update("documents", [...new Set([...form.documents, ...selected])]);
    event.target.value = "";
  };

  if (editId && !machine) return <MarketplaceLayout><section className="page-container not-found-card"><span className="eyebrow">MACHINERY OWNER</span><h1>That machine is not in this local owner profile.</h1><Link className="button button-secondary" href="/owner/machinery">Back to My Machinery</Link></section></MarketplaceLayout>;

  return <MarketplaceLayout><section className="registration-page page-container"><Link className="back-link" href="/owner/machinery"><ArrowLeft size={15} /> My Machinery</Link><PageHeading eyebrow="MACHINERY OWNER WORKSPACE" title={editId ? "Edit machine details" : "Register your machinery"} description={editId ? "Update machine information, rates, locations and availability in your local demo." : "A six-step journey for adding machinery to the sample network."} /><DemoNotice>Prototype only. Machine photos are compressed and stored in this browser; selected documents are filename-only sample metadata and are never uploaded or reviewed.</DemoNotice>
    <div className="wizard-layout"><aside className="wizard-sidebar"><span className="overline">REGISTRATION JOURNEY</span><div className="wizard-steps">{stepNames.map((name, index) => <button key={name} type="button" onClick={() => index <= step && setStep(index)} className={`wizard-step ${index === step ? "wizard-step-active" : index < step ? "wizard-step-done" : ""}`}><i>{index < step ? <Check size={14} /> : `0${index + 1}`}</i><span><b>{name}</b><small>{["Identity and category", "Specs and condition", "Front · side · rear", "Category-dependent", "Rates and service area", "Check before submit"][index]}</small></span></button>)}</div><div className="wizard-sidebar-note"><ShieldCheck size={16} /><span>New listings start in <b>Submitted</b> state. Farm Holders only see listings marked <b>Verified</b> in the demo.</span></div></aside>
      <form className="wizard-card" onSubmit={submit}><div className="wizard-card-head"><div><span className="eyebrow"><i className="eyebrow-rule" /> STEP 0{step + 1} OF 06</span><h2>{stepNames[step]}</h2><p>{step === 0 ? "Start with clear details that help farmers identify the machine." : step === 1 ? "Describe the equipment and the work it can support." : step === 2 ? "Add the front, side, rear and any extra machine photographs." : step === 3 ? "Attach relevant supporting document names for this equipment category." : step === 4 ? "Set sample prices and where you can serve." : "Review the full listing before adding it to local demo data."}</p></div><span className="wizard-step-counter">{step + 1}<i>/ 6</i></span></div>
        {step === 0 && <div className="wizard-form-grid"><label className="form-label form-span-two">Machine name<input autoFocus value={form.name} onChange={event => update("name", event.target.value)} placeholder="Mahindra 575 DI with 6 ft rotavator" required /></label><label className="form-label">Machine category<select value={form.category} onChange={event => update("category", event.target.value as MachineDraft["category"])}>{categories.map(category => <option key={category}>{category}</option>)}</select></label><label className="form-label">Manufacturer<input value={form.manufacturer} onChange={event => update("manufacturer", event.target.value)} placeholder="Mahindra" required /></label><label className="form-label">Model<input value={form.model} onChange={event => update("model", event.target.value)} placeholder="575 DI" required /></label><label className="form-label">Manufacturing year<input type="number" min="1950" max={new Date().getFullYear() + 1} value={form.year} onChange={event => update("year", Number(event.target.value))} required /></label><label className="form-label form-span-two">Identification / serial number <small className="optional-label">where available for this equipment category</small><input value={form.serialNumber} onChange={event => update("serialNumber", event.target.value)} placeholder="Serial / chassis / asset ID" /></label></div>}
        {step === 1 && <div className="wizard-form-grid"><label className="form-label">Horsepower / capacity<input value={form.capacity} onChange={event => update("capacity", event.target.value)} placeholder="47 HP · 6 ft" required /></label><label className="form-label">Condition<select value={form.condition} onChange={event => update("condition", event.target.value)}><option>Excellent</option><option>Very good</option><option>Good</option><option>Fair</option><option>Needs service</option></select></label><label className="form-label">Fuel type <small className="optional-label">where applicable</small><select value={form.fuelType} onChange={event => update("fuelType", event.target.value)}><option>Diesel</option><option>Petrol</option><option>Electric</option><option>Tractor powered</option><option>Not applicable</option><option>Other</option></select></label><label className="form-label form-span-two">Specifications<textarea rows={3} value={form.specifications} onChange={event => update("specifications", event.target.value)} placeholder="Working width, transmission, accessories, compatible equipment…" required /></label><label className="form-label form-span-two">Description<textarea rows={5} maxLength={1200} value={form.description} onChange={event => update("description", event.target.value)} placeholder="Describe the work this machine can do, its setup and any useful field-access notes." required /></label></div>}
        {step === 2 && <div className="photo-step"><div className="upload-guidance"><ImagePlus size={19} /><span><b>Use clear, current photographs.</b><small>Front, side and rear views help farmers understand the machine. Photos are compressed in this browser; nothing is uploaded.</small></span></div><div className="photo-slot-grid">{photoSlots.map((slot, index) => <label key={slot} className={`photo-upload-slot ${form.photos[index] ? "photo-slot-filled" : ""}`}><input type="file" accept="image/*" multiple={index === 3} onChange={event => void choosePhoto(index, event)} /><span className="photo-slot-image">{form.photos[index] ? <img src={form.photos[index]} alt={`${slot} preview`} /> : <ImagePlus size={22} />}</span><b>{slot}</b><small>{index === 3 ? `${Math.max(0, form.photos.length - 3)} additional selected · choose to add more` : form.photos[index] ? "Replace photo" : "Choose photo"}</small><span className="photo-select-button"><UploadCloud size={14} />{form.photos[index] ? "Change" : "Browse"}</span></label>)}</div><div className="photo-local-note"><Info size={15} />Only photo preview data is saved locally in this demo. Do not select sensitive images.</div></div>}
        {step === 3 && <div className="documents-step"><div className="document-upload-intro"><span><FileText size={20} /></span><div><b>Supporting documents · if relevant</b><p>Requirements depend on machine category and applicable regulations. Vehicle-only certificates are not universal requirements.</p></div></div><div className="document-optional-list"><span><Check size={14} /> Ownership proof / purchase invoice</span><span><Check size={14} /> Registration certificate · where applicable</span><span><Check size={14} /> Fitness Certificate · where applicable</span><span><Check size={14} /> Insurance · where applicable</span><span><Check size={14} /> Other relevant supporting document</span></div><label className="document-file-picker"><input type="file" accept="image/*,application/pdf" multiple onChange={onDocuments} /><UploadCloud size={18} /><b>Choose supporting files</b><small>PDF or image · filename and size are stored locally only</small></label>{form.documents.length > 0 && <div className="selected-documents">{form.documents.map(doc => <span key={doc}><FileText size={14} />{doc}<button type="button" aria-label={`Remove ${doc}`} onClick={() => update("documents", form.documents.filter(item => item !== doc))}><Trash2 size={14} /></button></span>)}</div>}<DemoNotice>These files are not uploaded or sent to a reviewer. Only their displayed names are kept as sample metadata.</DemoNotice></div>}
        {step === 4 && <div className="wizard-form-grid"><div className="form-section-label form-span-two"><span className="eyebrow"><i className="eyebrow-rule" /> RENTAL PRICING · ILLUSTRATIVE</span><p>Show sample prices per hour and per day. This prototype does not collect payment.</p></div><label className="form-label">Hourly rental rate (₹)<input type="number" min="1" max="1000000" value={form.hourlyRate || ""} onChange={event => update("hourlyRate", Number(event.target.value))} placeholder="850" required /></label><label className="form-label">Daily rental rate (₹)<input type="number" min="1" max="1000000" value={form.dailyRate || ""} onChange={event => update("dailyRate", Number(event.target.value))} placeholder="5600" required /></label><label className="form-label">Transport / delivery charge estimate (₹)<input type="number" min="0" max="1000000" value={form.transportCharge || ""} onChange={event => update("transportCharge", Number(event.target.value))} placeholder="0" /></label><label className="operator-toggle"><input type="checkbox" checked={form.hasOperator} onChange={event => update("hasOperator", event.target.checked)} /><Truck size={16} /><span><b>Operator available</b><small>{form.hasOperator ? "You can discuss an operator with the Farm Holder." : "Equipment rental without an included operator."}</small></span></label><label className="form-label form-span-two">Operator / service arrangement <small className="optional-label">optional</small><input value={form.operatorName} onChange={event => update("operatorName", event.target.value)} placeholder="Owner-operated · operator on request" /></label><div className="form-section-label form-span-two"><span className="eyebrow"><i className="eyebrow-rule" /> OPERATING LOCATION & AVAILABILITY</span><p>Location is a service-area description, not GPS or verified presence.</p></div><div className="form-row form-span-two"><label className="form-label">District<input value={form.district} onChange={event => update("district", event.target.value)} placeholder="Thanjavur" required /></label><label className="form-label">Town / taluk<input value={form.town} onChange={event => update("town", event.target.value)} placeholder="Kumbakonam" required /></label></div><div className="form-row form-span-two"><label className="form-label">Village<input value={form.village} onChange={event => update("village", event.target.value)} placeholder="Swamimalai" required /></label><label className="form-label">PIN code<input inputMode="numeric" maxLength={6} value={form.pinCode} onChange={event => update("pinCode", event.target.value.replace(/\D/g, ""))} placeholder="612302" /></label></div><label className="form-label form-span-two">Operating area / villages served<input value={form.operatingArea} onChange={event => update("operatingArea", event.target.value)} placeholder="Kumbakonam · Papanasam · nearby villages" /></label><div className="form-row form-span-two"><label className="form-label">Available from<input type="date" min={todayInputValue()} value={form.availabilityStart} onChange={event => update("availabilityStart", event.target.value)} required /></label><label className="form-label">Available through<input type="date" min={form.availabilityStart || todayInputValue()} value={form.availabilityEnd} onChange={event => update("availabilityEnd", event.target.value)} required /></label></div><div className="unavailable-date-editor form-span-two"><div><CalendarDays size={16} /><span><b>Dates not available</b><small>Optional · add a date blocked for maintenance or other work.</small></span></div><div className="unavailable-date-add"><input type="date" min={form.availabilityStart || todayInputValue()} value={blockCandidate} onChange={event => setBlockCandidate(event.target.value)} /><button type="button" className="button button-secondary" onClick={addUnavailableDate} disabled={!blockCandidate}><Plus size={14} /> Add date</button></div>{form.unavailableDates.length > 0 && <div className="unavailable-date-chips">{form.unavailableDates.map(date => <span key={date}>{date}<button type="button" onClick={() => update("unavailableDates", form.unavailableDates.filter(item => item !== date))} aria-label={`Remove unavailable date ${date}`}>×</button></span>)}</div>}</div></div>}
        {step === 5 && <div className="machine-review-step"><div className="review-machine-hero">{form.photos.filter(Boolean).length ? <img src={form.photos.find(Boolean)} alt="Machine photo preview" /> : <span><Tractor size={28} /></span>}<div><span className="overline">{form.category} · {form.year}</span><h3>{form.name || "Untitled machinery"}</h3><p>{form.manufacturer} {form.model} · {form.condition}</p></div></div><div className="review-machine-grid"><div><small>IDENTIFICATION</small><b>{form.serialNumber || "Not entered"}</b></div><div><small>CAPACITY</small><b>{form.capacity}</b></div><div><small>SPECIFICATIONS</small><b>{form.specifications}</b></div><div><small>DESCRIPTION</small><b>{form.description}</b></div><div><small>HOURLY RENTAL RATE</small><b>{formatRupees(form.hourlyRate)} / hour</b></div><div><small>DAILY RENTAL RATE</small><b>{formatRupees(form.dailyRate)} / day</b></div><div><small>OPERATOR</small><b>{form.hasOperator ? form.operatorName || "Available · details to discuss" : "Not included"}</b></div><div><small>OPERATING AREA</small><b>{form.village}, {form.town}, {form.district} · {form.pinCode}</b></div><div><small>AVAILABILITY WINDOW</small><b>{form.availabilityStart} to {form.availabilityEnd}</b></div><div><small>TRANSPORT ESTIMATE</small><b>{formatRupees(form.transportCharge)}</b></div><div className="review-machine-wide"><small>PHOTOGRAPHS & SUPPORTING DOCUMENT NAMES</small><b>{form.photos.filter(Boolean).length} photo(s) · {form.documents.length} document name(s)</b></div></div><div className="review-submission-note"><ShieldCheck size={17} /><span><b>Ready to submit to simulated review.</b><small>Submission only changes local prototype state. It is not sent to a real reviewer; this listing starts hidden and must be marked Verified in the demo to appear in search.</small></span></div></div>}
        {message && <p className="form-error" role="alert">{message}</p>}
        <div className="wizard-footer"><span>{step > 0 && <button type="button" className="button button-secondary" onClick={() => { setMessage(""); setStep(step - 1); }}><ChevronLeft size={15} /> Previous</button>}</span><div><span className="wizard-save-note"><Save size={13} /> Draft saved locally</span>{step < stepNames.length - 1 ? <button type="submit" className="button button-primary">Continue <ArrowRight size={15} /></button> : <button type="submit" className="button button-primary" disabled={saving}>{editId ? <><Check size={15} /> Save local changes</> : <><ShieldCheck size={15} /> Submit for demo review</>}</button>}</div></div>
      </form>
    </div>
  </section></MarketplaceLayout>;
}

export default function MachineRegistration() {
  return <RoleGate role="owner"><RegistrationWizard /></RoleGate>;
}
