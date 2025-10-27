// File: src/components/report/ReportModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { listPublicIssueTypes } from "../../services/issueTypes.api";
import { createIssue } from "../../services/issues.api";
import { useReportModal } from "../../store/useReportModal";
import { useAuth } from "../../store/useAuth";
import MapPicker from "./MapPicker";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILES = 10, MAX_BYTES = 2 * 1024 * 1024;

function inIndia(lat:number,lng:number){ return lat>=6.0 && lat<=37.1 && lng>=68.1 && lng<=97.4; }

export default function ReportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { initialLat, initialLng } = useReportModal();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [address, setAddress] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<{ id:number; title:string } | null>(null);

  const { data: types } = useQuery({
    queryKey: ["issue-types:public"],
    queryFn: listPublicIssueTypes,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const categories = useMemo(() => Array.isArray(types) ? types.map((t:any)=>t.name).filter(Boolean) : [], [types]);

  useEffect(() => {
    if (open) {
      setTitle(""); setCategory(""); setDescription(""); setAddress("");
      setLat(initialLat); setLng(initialLng);
      setFiles(null); setPreviews([]); setErr(null); setOk(null);
    }
  }, [open, initialLat, initialLng]);

  const addressRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const g = (window as any).google;
    if (!open || !addressRef.current || !g?.maps?.places?.Autocomplete) return;
    const ac = new g.maps.places.Autocomplete(addressRef.current, {
      fields: ["formatted_address", "geometry"],
      componentRestrictions: { country: "in" },
    });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const pos = place?.geometry?.location;
      const formatted = place?.formatted_address || addressRef.current!.value;
      setAddress(formatted || "");
      if (pos) { const p = { lat: pos.lat(), lng: pos.lng() }; setLat(p.lat); setLng(p.lng); }
    });
  }, [open]);

  function onFilesSel(list: FileList | null) {
    setFiles(list);
    setPreviews([]);
    if (!list) return;
    const arr = Array.from(list).slice(0, MAX_FILES);
    Promise.all(arr.map(f => new Promise<string>(res => { const r=new FileReader(); r.onload=()=>res(String(r.result)); r.readAsDataURL(f); })))
      .then(setPreviews);
  }
  function removeAt(i:number){
    if (!files) return;
    const arr = Array.from(files); arr.splice(i,1);
    const dt = new DataTransfer(); arr.forEach(f=>dt.items.add(f));
    setFiles(dt.files); setPreviews(p=>p.filter((_,idx)=>idx!==i));
  }

  const titleOk = title.trim().length >= 3 && title.trim().length <= 200;
  const descOk = description.trim().length >= 1 && description.trim().length <= 1000;
  const catOk = !!category;
  const coordsOk = typeof lat === "number" && typeof lng === "number";
  const filesOk = (() => {
    if (!files || files.length === 0) return true;
    if (files.length > MAX_FILES) return false;
    for (const f of Array.from(files)) { if (!ALLOWED.has(f.type) || f.size > MAX_BYTES) return false; }
    return true;
  })();
  const ready = titleOk && descOk && catOk && coordsOk && filesOk && lat!==undefined && lng!==undefined;

  const mut = useMutation({
    mutationFn: async () => {
      if (!ready) throw new Error("Please complete all required fields.");
      if (!inIndia(lat!, lng!)) throw new Error("Location must be within India.");
      const form = new FormData();
      form.append("title", title.trim());
      form.append("category", category);
      form.append("description", description.trim());
      form.append("lat", String(lat));
      form.append("lng", String(lng));
      form.append("address", address || "");
      form.append("country", "IN");
      if (files) Array.from(files).slice(0,MAX_FILES).forEach((f) => form.append("files", f));
      const res = await createIssue(form);
      return res as { id:number; title:string };
    },
    onSuccess: (data) => {
      setOk({ id: data.id, title: data.title });
    },
    onError: (e:any) => setErr(e?.response?.data?.detail || e?.message || "Submission failed"),
  });

  if (!user) {
    return (
      <Modal open={open} onClose={onClose} title="Report an issue">
        <p className="text-sm text-gray-700">Please sign in to report an issue.</p>
        <div className="mt-4"><Button onClick={onClose}>Close</Button></div>
      </Modal>
    );
  }

  const footer = ok ? (
    <div className="flex items-center justify-between">
      <div className="text-sm text-emerald-700">Ticket <b>#{ok.id}</b> created. A confirmation email was sent.</div>
      <Button onClick={onClose}>Close</Button>
    </div>
  ) : (
    <div className="flex items-center gap-3">
      <Button onClick={() => mut.mutate()} disabled={!ready || mut.isPending}>
        {mut.isPending ? "Submitting…" : "Submit"}
      </Button>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="Report an issue" wide footer={footer}>
      {!ok ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm">Title <span className="text-red-600">*</span></label>
            <Input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Pothole near MG Road" maxLength={200} required />
            {!titleOk && <p className="text-xs text-red-600 mt-1">Title must be 3–200 characters.</p>}
          </div>

          <div>
            <label className="text-sm">Category <span className="text-red-600">*</span></label>
            <select className="mt-1 w-full rounded-xl border p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={category} onChange={(e)=>setCategory(e.target.value)} required>
              <option value="">Select a category</option>
              {categories.map((c)=> <option key={c} value={c}>{c}</option>)}
            </select>
            {!catOk && <p className="text-xs text-red-600 mt-1">Please select a category.</p>}
          </div>

          <div>
            <label className="text-sm">Description <span className="text-red-600">*</span></label>
            <textarea className="mt-1 w-full rounded-xl border p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      value={description} onChange={(e)=>setDescription(e.target.value)} rows={4} maxLength={1000} required />
            <div className="flex justify-between">
              {!descOk && <p className="text-xs text-red-600 mt-1">Description is required (max 1000 chars).</p>}
              <p className="text-xs text-gray-500 mt-1 ml-auto">{description.length}/1000</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-sm">Address</label>
              <Input ref={addressRef as any} value={address} onChange={(e)=>setAddress(e.target.value)} placeholder="Type to search (India only)" />
              <p className="text-xs text-gray-500 mt-1">Start typing to see suggestions. Pick one to set coordinates.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Latitude <span className="text-red-600">*</span></label>
                <Input type="number" step="any" value={lat ?? ""} onChange={(e)=>setLat(e.target.value===""?undefined:Number(e.target.value))} placeholder="19.0760" required />
              </div>
              <div>
                <label className="text-sm">Longitude <span className="text-red-600">*</span></label>
                <Input type="number" step="any" value={lng ?? ""} onChange={(e)=>setLng(e.target.value===""?undefined:Number(e.target.value))} placeholder="72.8777" required />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm">Location</label>
            <div className="mt-2 rounded-xl border overflow-hidden">
              <div className="h-56 md:h-64">
                <MapPicker
                  initialLat={lat} initialLng={lng}
                  onPick={(p)=>{ setLat(p.lat); setLng(p.lng); }}
                />
              </div>
            </div>
            {coordsOk && !inIndia(lat!, lng!) && <p className="text-xs text-red-600 mt-1">Location must be within India.</p>}
          </div>

          <div>
            <label className="text-sm">Photos (optional)</label>
            <label className="mt-1 block rounded-xl border p-3 cursor-pointer bg-white hover:bg-gray-50">
              <span className="text-sm text-gray-600">Up to 10 images (JPG/PNG/WebP/GIF, ≤2MB each)</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e)=>onFilesSel(e.target.files)} />
            </label>
            {!!previews.length && (
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {previews.map((src,i)=>(
                  <li key={i} className="relative">
                    <img src={src} className="h-20 w-full object-cover rounded-lg border" />
                    <button type="button" onClick={()=>removeAt(i)} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border shadow">✕</button>
                  </li>
                ))}
              </ul>
            )}
            {!filesOk && <p className="text-xs text-red-600 mt-1">Check files: max 10, ≤2MB each; JPG/PNG/WebP/GIF only.</p>}
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border bg-emerald-50 border-emerald-200 p-3">
            <div className="text-sm text-emerald-800">
              Issue <b>#{ok.id}</b> submitted. We’ve emailed you a confirmation and will notify you on status updates.
            </div>
          </div>
          <div className="rounded-xl border bg-white p-3 text-sm text-gray-800">
            <div><b>Title:</b> {title}</div>
            <div><b>Category:</b> {category}</div>
            <div><b>Location:</b> {address || `${lat}, ${lng}`}</div>
            <div><b>Description:</b> {description}</div>
          </div>
        </div>
      )}
    </Modal>
  );
}