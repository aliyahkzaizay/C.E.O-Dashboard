import { useEffect, useId, useRef, useState } from "react";
import type { CeoEvent } from "../lib/events";
import { downloadReport, listEventReports, type PurchaseReport } from "../lib/finance";
import "./EventDetails.css";

/** Show event information and its existing private purchase-report documents. */
export default function EventDetails({ event, organizationId, onClose }: { event: CeoEvent; organizationId: string; onClose: () => void }) {
 const dialog = useRef<HTMLDialogElement>(null);
 const titleId = useId();
 const [closing, setClosing] = useState(false);
 const closeTimer=useRef<number | undefined>(undefined);
 const [attempt, setAttempt] = useState(0);
 const [result, setResult] = useState<{attempt:number; reports:PurchaseReport[]; error:string} | null>(null);
 const [selected, setSelected] = useState<PurchaseReport | null>(null);
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState("");
 const current = result?.attempt === attempt ? result : null;
 useEffect(()=>{
  const node=dialog.current;
  const previous=document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const overflow=document.body.style.overflow;
  node?.showModal();document.body.style.overflow="hidden";
  return ()=>{window.clearTimeout(closeTimer.current);node?.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
 },[]);
 function close() {
  if(closing)return;
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){onClose();return;}
  setClosing(true);closeTimer.current=window.setTimeout(onClose,160);
 }
 useEffect(()=>{
  const controller=new AbortController();
  void listEventReports(organizationId,event.event_id,controller.signal).then(reports=>{
   if(!controller.signal.aborted)setResult({attempt,reports,error:""});
  }).catch(error=>{if(!controller.signal.aborted)setResult({attempt,reports:[],error:error instanceof Error ? error.message : "Unable to load documents."});});
  return ()=>controller.abort();
 },[organizationId,event.event_id,attempt]);
 async function download(report:PurchaseReport) {
  if(busy)return;
  setBusy(true);setError("");
  try {
   const {url}=await downloadReport(organizationId,report.id);
   const response=await fetch(url,{cache:"no-store",credentials:"omit"});
   if(!response.ok)throw new Error("Unable to download the document. Please try again.");
   const objectUrl=URL.createObjectURL(await response.blob());
   const link=document.createElement("a");link.href=objectUrl;link.download=report.filename;
   document.body.append(link);link.click();link.remove();
   window.setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);
  }catch(error){setError(error instanceof Error ? error.message : "Unable to download document.");}
  finally{setBusy(false);}
 }
 return <dialog ref={dialog} className={`event-details ${closing ? "is-closing" : ""}`} aria-labelledby={titleId} onCancel={event=>{event.preventDefault();close();}}>
  <header><h2 id={titleId}>{event.event_name}</h2><button type="button" autoFocus aria-label="Close event details" onClick={close}>×</button></header>
  <p>{new Date(event.starts_at).toLocaleString()}{event.event_type ? ` · ${event.event_type}` : ""}</p>
  {event.description && <p className="event-details-description">{event.description}</p>}
  <section aria-labelledby={`${titleId}-reports`}><h3 id={`${titleId}-reports`}>Purchase reports &amp; documents</h3>
   {!current ? <p role="status">Loading documents…</p> : current.error ? <div><p role="alert">{current.error}</p><button type="button" onClick={()=>setAttempt(n=>n+1)}>Retry documents</button></div> : !current.reports.length ? <p>No purchase reports linked to this event yet.</p> : <ul className="event-document-list">{current.reports.map(report=><li key={report.id}><button className="event-document-title" type="button" aria-expanded={selected?.id===report.id} onClick={()=>{setSelected(selected?.id===report.id ? null : report);setError("");}}>{report.title}</button><small>{report.filename} · {report.uploader} · {report.date}</small>{selected?.id===report.id && <div className="event-document-content">{report.notes && <p>{report.notes}</p>}<button type="button" disabled={busy} onClick={()=>void download(report)}>{busy ? "Downloading…" : "Download document"}</button></div>}</li>)}</ul>}
   {error && <p role="alert">{error}</p>}
  </section>
 </dialog>;
}
