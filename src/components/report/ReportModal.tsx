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
import { useToast } from "../toast/ToastProvider";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILES = 10, MAX_BYTES = 2 * 1024 * 1024;
const inIndia = (lat?: number|null, lng?: number|null) =>
  lat != null && lng != null && lat >= 6.5 && lat <= 37.6 && lng >= 68.1 && lng <= 97.4;

//function inIndia(lat:number,lng:number){ return lat>=6.0 && lat<=37.1 && lng>=68.1 && lng<=97.4; }

export default function ReportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const reportModal = useReportModal();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const latLngInvalid = useMemo(() => (lat!=null && lng!=null) && !inIndia(lat, lng), [lat, lng]);
  const [address, setAddress] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<{ id:number; title:string } | null>(null);
  const toast = useToast();

  const { data: types } = useQuery({
    queryKey: ["issue-types:public"],
    queryFn: listPublicIssueTypes,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const categories = useMemo(() => Array.isArray(types) ? types.map((t:any)=>t.name).filter(Boolean) : [], [types]);

  useEffect(() => {
    if (!open) return;
    setTitle(""); setCategory(""); setDescription(""); setAddress(""); setErr(null); setOk(null);
    setFiles([]); setPreviews([]);
    setLat((v) => (typeof v === "number" ? v : 28.6139));
    setLng((v) => (typeof v === "number" ? v : 77.2090));
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (inIndia(latitude, longitude)) {
            setLat(latitude);
            setLng(longitude);
            // Reverse geocode to get address
            const g = (window as any).google;
            if (g?.maps?.Geocoder) {
              new g.maps.Geocoder().geocode(
                { location: { lat: latitude, lng: longitude } },
                (results: any[], status: string) => {
                  if (status === "OK" && results?.[0]) {
                    setAddress(results[0].formatted_address);
                  }
                }
              );
            }
          }
        },
        () => {
          // User denied or error - use default location
        }
      );
    }
  }, [open]);

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
      const g = place?.geometry?.location;
      const formatted = place?.formatted_address || addressRef.current!.value || "";
      setAddress(formatted);
      if (g) { setLat(g.lat()); setLng(g.lng()); }
    });
  }, [open]);

  function onFilesSel(list: FileList | null) {
    if (!list) return;
    const newFiles = Array.from(list);
    const combined = [...files, ...newFiles].slice(0, MAX_FILES);
    setFiles(combined);
    // Update previews for all files
    Promise.all(combined.map(f => new Promise<string>(res => { 
      const r = new FileReader(); 
      r.onload = () => res(String(r.result)); 
      r.readAsDataURL(f); 
    }))).then(setPreviews);
  }
  function removeAt(i: number) {
    const newFiles = files.filter((_, idx) => idx !== i);
    setFiles(newFiles);
    setPreviews(previews.filter((_, idx) => idx !== i));
  }

  const titleOk = title.trim().length >= 3 && title.trim().length <= 200;
  const descOk = description.trim().length >= 1 && description.trim().length <= 1000;
  const catOk = !!category;
  const coordsOk = typeof lat === "number" && typeof lng === "number";
  const filesOk = (() => {
    if (files.length === 0) return true;
    if (files.length > MAX_FILES) return false;
    for (const f of files) { if (!ALLOWED.has(f.type) || f.size > MAX_BYTES) return false; }
    return true;
  })();
  const ready = titleOk && descOk && catOk && coordsOk && filesOk && lat!==undefined && lng!==undefined;

  const mut = useMutation({
    mutationFn: async () => {
      if (!ready) {
        toast.show("Please complete all required fields.");
        throw new Error("Please complete all required fields.");
      }
      if (!title?.trim() || !category) {
        toast.show("Please fill required fields.");
        throw new Error("missing-fields");
      }
      if (lat == null || lng == null) {
        toast.show("Please pick a location.");
        throw new Error("Missing lat/lng");
      }
      if (typeof lat !== "number" || typeof lng !== "number") {
        toast.show("Please choose a valid location on the map.");
        throw new Error("missing-location");
      }
      if (!inIndia(lat, lng) || latLngInvalid) {
        toast.show("Location must be inside India.");
        throw new Error("Location outside India");
      }

      const form = new FormData();
      form.append("title", title.trim());
      form.append("category", category);
      form.append("description", description?.trim() || "");
      form.append("lat", String(lat));
      form.append("lng", String(lng));
      form.append("address", address || "");
      form.append("country", "IN");
      if (files.length > 0) {
        files.forEach((f) => form.append("files", f));
      }

      const res = await createIssue(form); 
      return res as { id:number; title:string };
    },
    onSuccess: (data) => {
      toast.show(`Report submitted — ticket #${data.id}`);
      setOk({ id: data.id, title: data.title });
    },
    onError: (e: any) => {
      if (e?.response?.status === 401) {
        const msg = "Your session has expired. Please log in again to submit a report.";
        toast.show(msg);
        setErr(msg);
        // Close modal and let user re-authenticate
        setTimeout(() => onClose(), 2000);
      } else {
        const msg = e?.response?.data?.detail || e?.message || "Submission failed";
        toast.show(msg);
        setErr(msg);
      }
    },
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
              <input ref={addressRef} value={address} onChange={(e)=>setAddress(e.target.value)} placeholder="Type to search (India only)" className="w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500 focus:bg-white shadow-sm" />
              <p className="text-xs text-gray-500 mt-1">Start typing to see suggestions. Pick one to set coordinates.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium">Latitude</label>
                <input 
                  value={lat ?? ""} 
                  onChange={(e)=>{
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setLat(val);
                    if (val !== undefined && typeof lng === "number" && inIndia(val, lng)) {
                      const g = (window as any).google;
                      if (g?.maps?.Geocoder) {
                        new g.maps.Geocoder().geocode(
                          { location: { lat: val, lng: lng } },
                          (results: any[], status: string) => {
                            if (status === "OK" && results?.[0]) {
                              setAddress(results[0].formatted_address);
                            }
                          }
                        );
                      }
                    }
                  }} 
                  className="mt-1 w-full rounded-xl border px-3 py-2" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Longitude</label>
                <input 
                  value={lng ?? ""} 
                  onChange={(e)=>{
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setLng(val);
                    if (val !== undefined && typeof lat === "number" && inIndia(lat, val)) {
                      const g = (window as any).google;
                      if (g?.maps?.Geocoder) {
                        new g.maps.Geocoder().geocode(
                          { location: { lat: lat, lng: val } },
                          (results: any[], status: string) => {
                            if (status === "OK" && results?.[0]) {
                              setAddress(results[0].formatted_address);
                            }
                          }
                        );
                      }
                    }
                  }} 
                  className="mt-1 w-full rounded-xl border px-3 py-2" 
                />
              </div>
            </div>
            {latLngInvalid && (
              <p className="text-xs text-red-600 mt-1 col-span-full">
                Selected coordinates must be inside India. Please adjust the pin or search an Indian address.
              </p>
            )}
          </div>

          <div>
            <label className="text-sm">Location</label>
            <div className="mt-2 rounded-xl border overflow-hidden">
              <div className="h-56 md:h-64">
                <MapPicker
                  initialLat={reportModal.initialLat ?? lat} initialLng={reportModal.initialLng ?? lng}
                  onPick={(p)=>{ 
                    setLat(p.lat); 
                    setLng(p.lng); 
                    if (p.address) setAddress(p.address);
                  }}
                />
              </div>
            </div>
            {coordsOk && !inIndia(lat!, lng!) && <p className="text-xs text-red-600 mt-1">Location must be within India.</p>}
          </div>

          <div>
            <label className="text-sm">Photos (optional)</label>
            <label className="mt-1 block rounded-xl border p-3 cursor-pointer bg-white hover:bg-gray-50">
              <span className="text-sm text-gray-600">
                {files.length > 0 ? `${files.length}/10 images selected` : "Click to add images (up to 10, JPG/PNG/WebP/GIF, ≤2MB each)"}
              </span>
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