import { useId, useRef } from "react";

/** A light-dismiss popover keeps report actions out of the table's layout. */
export default function ReportActions({ title, disabled, onDelete }: { title: string; disabled: boolean; onDelete: () => void }) {
 const id=useId();
 const trigger=useRef<HTMLButtonElement>(null);
 const popover=useRef<HTMLDivElement>(null);
 return <><button ref={trigger} type="button" className="finance-more" disabled={disabled} aria-label={`Actions for ${title}`} popoverTarget={id} onClick={()=>{
  const rect=trigger.current?.getBoundingClientRect();
  if(rect && popover.current){popover.current.style.left=`${Math.max(8,Math.min(rect.right-160,window.innerWidth-168))}px`;popover.current.style.top=`${Math.max(8,Math.min(rect.bottom+6,window.innerHeight-64))}px`;}
 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></button><div ref={popover} id={id} popover="auto" className="finance-report-popover"><button type="button" disabled={disabled} aria-label={`Delete ${title}`} onClick={()=>{popover.current?.hidePopover();trigger.current?.focus();onDelete();}}>Delete report</button></div></>;
}
