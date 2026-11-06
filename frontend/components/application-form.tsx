"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/auth-context";
import { fetchApplicationStatus, submitApplication, uploadApplicationFile, type ApplicationStatus } from "@/lib/applications";

type Kind = "owner" | "rider";

const cuisineOptions = [
  "North Indian",
  "South Indian",
  "Mughlai",
  "Biryani",
  "Chinese",
  "Thai",
  "Italian",
  "Pizza",
  "Burgers",
  "Fast Food",
  "Cafe",
  "Bakery",
  "Desserts",
  "Healthy",
  "Street Food",
  "Seafood",
  "Other",
];

const restaurantTypes = ["Restaurant", "Cafe", "Bakery", "Cloud kitchen", "Food truck"];

const fields = {
  owner: [
    ["name", "Full name", "text"], ["email", "Email", "email"], ["phone", "Phone", "tel"],
    ["restaurantName", "Restaurant name", "text"], ["restaurantDescription", "Restaurant description", "textarea"],
    ["cuisine", "Cuisine type", "select"], ["restaurantType", "Restaurant type", "restaurantType"],
    ["address", "Address", "text"], ["city", "City", "text"],
    ["state", "State", "text"], ["pincode", "Pincode", "text"], ["openingTime", "Opening time", "time"],
    ["closingTime", "Closing time", "time"], ["preparationTime", "Average preparation time (minutes)", "number"],
    ["minimumOrder", "Minimum order value (₹)", "number"],
  ],
  rider: [
    ["fullName", "Full name", "text"], ["email", "Email", "email"], ["phone", "Phone", "tel"],
    ["address", "Address", "text"], ["city", "City", "text"], ["state", "State", "text"], ["pincode", "Pincode", "text"],
    ["vehicleType", "Vehicle type", "select"], ["vehicleNumber", "Vehicle number", "text"],
    ["vehicleBrand", "Vehicle brand", "text"], ["vehicleModel", "Vehicle model", "text"], ["licenseNumber", "Driving license number", "text"],
  ],
} as const;

const steps = {
  owner: [["Your details", ["name", "email", "phone"]], ["Restaurant", ["restaurantName", "restaurantDescription", "cuisine"]], ["Location", ["address", "city", "state", "pincode"]], ["Hours", ["openingTime", "closingTime"]], ["Review", []]],
  rider: [["Personal details", ["fullName", "email", "phone"]], ["Address", ["address", "city", "state", "pincode"]], ["Vehicle", ["vehicleType", "vehicleNumber", "vehicleBrand", "vehicleModel", "licenseNumber"]], ["Review", []]],
} as const;

function existingApplication(status: ApplicationStatus | undefined, kind: Kind) {
  return kind === "owner" ? status?.ownerApplication : status?.riderApplication;
}

export function ApplicationForm({ kind }: { kind: Kind }) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ["application-status", user?.id], queryFn: fetchApplicationStatus, enabled: Boolean(user) && !authLoading });
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>(() => ({ email: user?.email ?? "", name: user?.name ?? "", fullName: user?.name ?? "" }));
  const [files, setFiles] = useState<Record<string, File>>({});
  const imagePreview = useMemo(() => {
    const image = files.restaurantImage;
    return image && typeof URL !== "undefined" ? URL.createObjectURL(image) : "";
  }, [files.restaurantImage]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const currentSteps = steps[kind];
  const currentFields = currentSteps[step][1] as readonly string[];
  const labels = useMemo<Map<string, string>>(() => new Map(fields[kind].map(([name, label]) => [name, label])), [kind]);

  useEffect(() => {
    if (!imagePreview) return;
    return () => URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  if (authLoading || status.isLoading) return <main className="flex min-h-[70vh] items-center justify-center bg-[#f7f4ee] text-[#81786c]"><LoaderCircle className="mr-2 animate-spin" size={20} /> Checking your application status...</main>;
  if (!user) return <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center"><h1 className="font-serif text-4xl">Sign in to apply</h1><Link href="/login" className="mt-6 rounded-full bg-[#273b32] px-5 py-3 text-sm font-bold text-white">Go to sign in</Link></main>;
  const account = user;
  const userId = account.id;
  const role = status.data?.role.trim().toUpperCase() ?? account.role;
  const hasOppositePartnerRole = kind === "owner" ? role === "RIDER" : role === "RESTAURANT_OWNER";
  if (hasOppositePartnerRole) {
    return <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center"><h1 className="font-serif text-4xl">Partner application unavailable</h1><p className="mt-4 leading-7 text-[#81786c]">Your account is already an approved {kind === "owner" ? "rider" : "restaurant owner"} account. Partner roles cannot be combined.</p><Link href="/settings" className="mt-6 rounded-full bg-[#273b32] px-5 py-3 text-sm font-bold text-white">Back to settings</Link></main>;
  }
  const application = existingApplication(status.data, kind);
  if (application?.status === "PENDING" || application?.status === "APPROVED") {
    return <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center"><h1 className="font-serif text-4xl">{application.status === "APPROVED" ? "Application already approved" : "Application under review"}</h1><p className="mt-4 leading-7 text-[#81786c]">{application.status === "APPROVED" ? "Your partner access is ready from Settings." : "Our team is reviewing your application. We will notify you when there is an update."}</p><Link href="/settings" className="mt-6 rounded-full bg-[#273b32] px-5 py-3 text-sm font-bold text-white">Back to settings</Link></main>;
  }
  if (submitted) return <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center"><CheckCircle2 className="text-[#3b8b5c]" size={52} /><h1 className="mt-5 font-serif text-4xl">Application submitted</h1><p className="mt-4 leading-7 text-[#81786c]">Our team will review your {kind === "owner" ? "restaurant partner" : "rider"} application.</p><p className="mt-3 font-semibold text-[#b86123]">Status: Under review</p><Link href="/settings" className="mt-7 rounded-full bg-[#273b32] px-5 py-3 text-sm font-bold text-white">Back to settings</Link></main>;

  function update(name: string, value: string) { setValues((current) => ({ ...current, [name]: value })); }
  function validate() {
    if (currentFields.some((name) => !(values[name] || (name === "email" ? account.email : name === "name" || name === "fullName" ? account.name : "") || "").trim())) return "Please complete every field before continuing.";
    return "";
  }
  async function submit() {
    setError(""); setBusy(true);
    try {
      const uploadedDocuments: Record<string, string> = {};
      for (const [documentType, file] of Object.entries(files)) {
        uploadedDocuments[documentType] = await uploadApplicationFile(file, kind, documentType, (progress) => setUploadProgress((current) => ({ ...current, [documentType]: progress })));
      }
      const { restaurantName, name: applicantName, email, fullName, ...formValues } = values;
      const payload = {
        ...formValues,
        email: email || account.email || undefined,
        fullName: fullName || account.name || undefined,
        ...(kind === "owner"
          ? {
            name: restaurantName || undefined,
            preparationTime: formValues.preparationTime ? Number(formValues.preparationTime) : undefined,
            minimumOrder: formValues.minimumOrder ? Number(formValues.minimumOrder) : undefined,
            coverImage: uploadedDocuments.restaurantImage,
            businessDocuments: uploadedDocuments,
          }
          : { name: applicantName || account.name || undefined, drivingLicense: uploadedDocuments.drivingLicense, vehicleRegistration: uploadedDocuments.vehicleRegistration, identityDocument: uploadedDocuments.identityDocument }),
      };
      await submitApplication(kind, payload);
      await queryClient.invalidateQueries({ queryKey: ["application-status", userId] });
      setSubmitted(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your application could not be submitted."); } finally { setBusy(false); }
  }
  return (
    <main className="min-h-screen bg-[#f7f4ee] px-5 py-10 text-[#28241f] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/settings" className="inline-flex items-center text-sm font-semibold text-[#81786c] hover:text-[#273b32]"><ArrowLeft size={16} className="mr-2" /> Back to settings</Link>
        <p className="mt-10 text-xs font-bold uppercase tracking-[0.24em] text-[#d97732]">{kind === "owner" ? "Restaurant partnership" : "Delivery partnership"}</p>
        <h1 className="mt-3 font-serif text-5xl tracking-[-0.04em]">{kind === "owner" ? "Become a restaurant partner" : "Deliver with Cravio"}</h1>
        <div className="mt-8 flex flex-wrap gap-2">{currentSteps.map(([label], index) => <span key={label} className={`rounded-full px-3 py-1.5 text-xs font-bold ${index === step ? "bg-[#273b32] text-white" : index < step ? "bg-[#dcecdf] text-[#3b7650]" : "bg-[#e9e3d9] text-[#81786c]"}`}>{index + 1}. {label}</span>)}</div>
        <section className="mt-8 rounded-[1.75rem] border border-[#e8e0d4] bg-[#fffdf9] p-6 shadow-[0_14px_40px_rgba(40,36,31,0.05)] sm:p-8">
          {step < currentSteps.length - 1 ? <div className="grid gap-5 sm:grid-cols-2">{currentFields.map((name) => { const field = fields[kind].find(([key]) => key === name)!; const displayedValue = values[name] || (name === "email" ? account.email ?? "" : name === "name" || name === "fullName" ? account.name ?? "" : ""); return <label key={name} className={field[2] === "textarea" ? "sm:col-span-2" : ""}><span className="mb-2 block text-sm font-semibold text-[#4d473e]">{field[1]}</span>{field[2] === "textarea" ? <textarea value={displayedValue} onChange={(event) => update(name, event.target.value)} rows={4} className="w-full rounded-xl border border-[#ded7cb] bg-white px-4 py-3 outline-none focus:border-[#d97732]" /> : field[2] === "select" ? <select value={displayedValue} onChange={(event) => update(name, event.target.value)} className="w-full rounded-xl border border-[#ded7cb] bg-white px-4 py-3 outline-none focus:border-[#d97732]"><option value="">Select cuisine</option>{cuisineOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select> : field[2] === "restaurantType" ? <select value={displayedValue} onChange={(event) => update(name, event.target.value)} className="w-full rounded-xl border border-[#ded7cb] bg-white px-4 py-3 outline-none focus:border-[#d97732]"><option value="">Select restaurant type</option>{restaurantTypes.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input type={field[2]} value={displayedValue} onChange={(event) => update(name, event.target.value)} className="w-full rounded-xl border border-[#ded7cb] bg-white px-4 py-3 outline-none focus:border-[#d97732]" />}</label>; })}{kind === "owner" && step === 1 ? <div className="sm:col-span-2 rounded-2xl border border-dashed border-[#d6cfc3] bg-[#fffaf0] p-5"><p className="text-sm font-bold text-[#3d3830]">Restaurant photos</p><p className="mt-1 text-xs text-[#81786c]">Add a clear cover photo so customers can recognize your restaurant. JPG, PNG, or WEBP, maximum 10 MB.</p><label className="mt-4 block text-sm font-semibold text-[#4d473e]"><span className="sr-only">Restaurant cover image</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; setFiles((current) => file ? ({ ...current, restaurantImage: file }) : current); }} className="block w-full text-sm font-normal text-[#81786c]" />{imagePreview ? <img src={imagePreview} alt="Restaurant cover preview" className="mt-4 h-40 w-full rounded-xl object-cover" /> : null}<span className="mt-2 block text-xs font-normal text-[#81786c]">{files.restaurantImage?.name ?? "No cover photo selected"}</span></label></div> : null}{step === currentSteps.length - 2 ? <div className="sm:col-span-2 rounded-xl border border-dashed border-[#d6cfc3] bg-[#fffaf0] p-4"><p className="text-sm font-semibold text-[#4d473e]">Documents (optional)</p><p className="mt-1 text-xs text-[#81786c]">PDF, JPG, PNG, or WEBP. Maximum 10 MB each.</p>{(kind === "owner" ? [["businessDocuments", "Business document"]] : [["drivingLicense", "Driving license"], ["vehicleRegistration", "Vehicle registration"], ["identityDocument", "Identity document"]]).map(([key, label]) => <label key={key} className="mt-4 block text-sm font-semibold text-[#4d473e]">{label}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) setFiles((current) => ({ ...current, [key]: file })); }} className="mt-2 block w-full text-sm font-normal text-[#81786c]" />{uploadProgress[key] !== undefined ? <span className="mt-1 block text-xs text-[#3b7650]">Uploaded {uploadProgress[key]}%</span> : null}</label>)}</div> : null}</div> : <div><h2 className="font-serif text-3xl">Review your details</h2><div className="mt-5 divide-y divide-[#eee7dc]">{Object.entries(values).filter(([, value]) => value).map(([name, value]) => <div key={name} className="flex justify-between gap-5 py-3 text-sm"><span className="text-[#81786c]">{labels.get(name) ?? name}</span><strong className="text-right text-[#3d3830]">{value}</strong></div>)}{Object.entries(files).map(([name, file]) => <div key={name} className="flex justify-between gap-5 py-3 text-sm"><span className="text-[#81786c]">{name}</span><strong className="text-right text-[#3d3830]">{file.name}</strong></div>)}</div></div>}
          {error ? <p className="mt-5 rounded-xl bg-[#fbe8e2] px-4 py-3 text-sm text-[#a84e32]">{error}</p> : null}
          <div className="mt-8 flex justify-between gap-3"><button type="button" disabled={step === 0 || busy} onClick={() => setStep((current) => current - 1)} className="rounded-full border border-[#ded7cb] px-5 py-3 text-sm font-bold text-[#5d554c] disabled:opacity-40">Back</button>{step < currentSteps.length - 1 ? <button type="button" onClick={() => { const message = validate(); if (message) setError(message); else { setError(""); setStep((current) => current + 1); } }} className="inline-flex items-center rounded-full bg-[#d97732] px-5 py-3 text-sm font-bold text-white">Continue <ArrowRight size={16} className="ml-2" /></button> : <button type="button" disabled={busy} onClick={() => void submit()} className="rounded-full bg-[#273b32] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? "Submitting..." : "Submit application"}</button>}</div>
        </section>
      </div>
    </main>
  );
}
