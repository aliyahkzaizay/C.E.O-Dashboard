import { useEffect, useId, useRef, useState } from "react";
import { demoEvents, money, type FinanceTransaction } from "../lib/financeDemo";

type Detail = { key: string; title: string; subtitle?: string; rows: [string, string][]; change: string; x: number; y: number };
const colors = ["#2563eb", "#7c3aed"];
/** Preview finance trends with pointer, keyboard, and touch details; no database reads. */
export default function FinanceTrend({ transactions }: { transactions: FinanceTransaction[] }) {
 const [view, setView] = useState<"monthly" | "events">("monthly");
 const [months, setMonths] = useState(6);
 const [selected, setSelected] = useState(demoEvents.map(event => event.id));
 const [width, setWidth] = useState(650);
 const [detail, setDetail] = useState<Detail | null>(null);
 const [visible, setVisible] = useState(false);
 const [revision, setRevision] = useState(0);
 const container = useRef<HTMLDivElement>(null);
 const pinned = useRef(false);
 const tooltipId = useId();
 useEffect(() => {
  const node = container.current;
  if (!node) return;
  const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
  observer.observe(node);
  return () => observer.disconnect();
 }, []);
 function hide() { pinned.current = false; setVisible(false); }
 function changeView(next: "monthly" | "events") { hide(); setView(next); setRevision(n => n+1); }
 function reveal(next: Detail) { setDetail(next); setVisible(true); }
 const start = `2026-${String(12-months).padStart(2,"0")}-01`;
 const end = "2026-12-01";
 const labels = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"].slice(6-months);
 const monthly = labels.map((label,i) => {
  const rows = transactions.filter(row => row.date.startsWith(`2026-${String(12-months+i).padStart(2,"0")}`));
  return { label, income: rows.filter(row=>row.kind === "income").reduce((sum,row)=>sum+row.cents,0), expense: rows.filter(row=>row.kind === "expense").reduce((sum,row)=>sum+row.cents,0), categories: [...new Set(rows.filter(row=>row.kind === "income").map(row=>row.category))].join(" · ") };
 });
 const lines = demoEvents.filter(event=>selected.includes(event.id)).map(event=>{
  let total=0;
  const points=transactions.filter(row=>row.kind === "expense" && row.eventId === event.id && row.date < end).toSorted((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)).map(row=>{total+=row.cents;return {...row,total};});
  const opening=points.filter(row=>row.date<start).at(-1)?.total ?? 0;
  return {...event,opening,points:points.filter(row=>row.date>=start)};
 });
 const ceiling = Math.max(10000, ...(view === "monthly" ? monthly.flatMap(row=>[row.income,row.expense]) : lines.flatMap(line=>[line.opening,...line.points.map(row=>row.total)])))*1.15;
 const height=300,left=58,right=Math.max(160,width-20),bottom=255,top=30;
 const y=(value:number)=>bottom-value/ceiling*(bottom-top);
 const monthlyX=(i:number)=>left+(i+.5)*(right-left)/months;
 const dateX=(date:string)=>left+12+(Date.parse(date)-Date.parse(start))/(Date.parse(end)-Date.parse(start))*(right-left-24);
 const barWidth=Math.min(22,(right-left)/months*.3);
 const signed=(cents:number)=>`${cents>=0?"+":"−"}${money(Math.abs(cents))}`;
 const hits: Detail[] = view === "monthly" ? monthly.map((row,i)=>({key:row.label,title:`${row.label} 2026`,subtitle:row.categories || undefined,rows:[["Income",money(row.income)],["Expenses",money(row.expense)]],change:`${signed(row.income-row.expense)} net change`,x:monthlyX(i),y:y(Math.max(row.income,row.expense))})) : lines.flatMap(line=>line.points.map(row=>({key:row.id,title:line.name,subtitle:`${row.date} · ${row.description}`,rows:[["This purchase",money(row.cents)],["Spent so far",money(row.total)]],change:`+${money(row.cents)} more spent`,x:dateX(row.date),y:y(row.total)})));
 const tipWidth=Math.min(235,Math.max(170,width-12));
 return <section className="finance-panel"><div className="finance-heading"><div><h2>Finance trends</h2><p>{view === "monthly" ? "Income and expenses" : "Cumulative event spending by purchase date"} · USD</p></div><label>Demo period<select value={months} onChange={e=>{hide();setMonths(Number(e.target.value));setRevision(n=>n+1);}}><option value={6}>Jun–Nov 2026</option><option value={3}>Sep–Nov 2026</option></select></label></div>
 <div className={`finance-tabs finance-trend-tabs ${view === "events" ? "is-events" : ""}`}><span aria-hidden="true" className="finance-tab-indicator" /><button type="button" aria-pressed={view === "monthly"} onClick={()=>changeView("monthly")}>Monthly totals</button><button type="button" aria-pressed={view === "events"} onClick={()=>changeView("events")}>By event</button></div>
 <div className="finance-legend">{view === "monthly" ? <><span><i style={{background:"#15806b"}} />Income</span><span><i style={{background:"#2563eb"}} />Expenses</span></> : demoEvents.map((event,i)=><label key={event.id}><input type="checkbox" checked={selected.includes(event.id)} onChange={e=>{hide();setSelected(ids=>e.target.checked?[...ids,event.id]:ids.filter(id=>id!==event.id));}} /><i style={{background:colors[i]}} />{event.name}</label>)}</div>
 <div className="finance-interactive-chart" ref={container} onKeyDown={e=>{if(e.key === "Escape")hide();}} onPointerDown={e=>{if(!(e.target as Element).closest("button"))hide();}}>
 <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
 {[0,.5,1].map(f=><g key={f}><line x1={left} x2={right} y1={y(ceiling*f)} y2={y(ceiling*f)} stroke="#e2e8f0" /><text x={left-7} y={y(ceiling*f)+4} textAnchor="end">${Math.round(ceiling*f/100)}</text></g>)}
 {labels.map((label,i)=>width<420 && months===6 && i%2===1 ? null : <text key={label} x={monthlyX(i)} y="282" textAnchor="middle">{label}</text>)}
 <g key={`${view}-${months}-${revision}`} className={revision ? "finance-chart-enter" : undefined}>
 {view === "monthly" ? monthly.map((row,i)=><g key={row.label} opacity={visible && detail && detail.key!==row.label ? .55 : 1}><rect x={monthlyX(i)-barWidth-2} y={y(row.income)} width={barWidth} height={bottom-y(row.income)} rx="4" fill="#15806b" /><rect x={monthlyX(i)+2} y={y(row.expense)} width={barWidth} height={bottom-y(row.expense)} rx="4" fill="#2563eb" /></g>) : lines.map(line=>{const color=colors[demoEvents.findIndex(e=>e.id===line.id)];return <g key={line.id}><polyline points={[[dateX(start),y(line.opening)],...line.points.map(row=>[dateX(row.date),y(row.total)])].map(point=>point.join(",")).join(" ")} fill="none" stroke={color} strokeWidth="2.5" />{line.points.map(row=><circle key={row.id} cx={dateX(row.date)} cy={y(row.total)} r={visible && detail?.key===row.id ? 7 : 4.5} fill="white" stroke={color} strokeWidth="2.5" />)}</g>;})}
 </g></svg>
 {hits.map(hit=><button key={hit.key} type="button" className="finance-chart-hit" style={{left:hit.x-18,top:view === "monthly" ? hit.y : hit.y-18,width:36,height:view === "monthly" ? Math.max(36,bottom-hit.y) : 36}} aria-label={`${hit.title}${hit.subtitle?`, ${hit.subtitle}`:""}. ${hit.rows.map(row=>row.join(": ")).join(". ")}. ${hit.change}`} aria-describedby={visible && detail?.key===hit.key ? tooltipId : undefined} onPointerEnter={e=>{if(e.pointerType!=="touch")reveal(hit);}} onPointerLeave={()=>{if(!pinned.current)setVisible(false);}} onFocus={()=>reveal(hit)} onBlur={hide} onPointerDown={e=>{pinned.current=e.pointerType === "touch";}} onClick={()=>reveal(hit)} />)}
 <div id={tooltipId} role="tooltip" aria-hidden={!visible} className={`finance-chart-tooltip ${visible ? "is-visible" : ""}`} style={{width:tipWidth,left:Math.max(0,Math.min(width-tipWidth,(detail?.x??0)-tipWidth/2)),top:Math.max(2,(detail?.y??0)-175)}}>{detail && <><strong>{detail.title}</strong>{detail.subtitle && <p>{detail.subtitle}</p>}{detail.rows.map(([label,value])=><div key={label}><span>{label}</span><b>{value}</b></div>)}<footer>{detail.change}</footer></>}</div>
 </div>
 {view === "events" && !hits.length && <p role="status">{selected.length ? "No purchases in this period." : "Select an event to show its spending."}</p>}
 <details><summary>View chart values</summary><div className="finance-table-wrap"><table><thead><tr><th>{view === "monthly" ? "Month" : "Event / purchase"}</th><th>{view === "monthly" ? "Income" : "Purchase"}</th><th>{view === "monthly" ? "Expenses" : "Spent so far"}</th><th>Change</th></tr></thead><tbody>{hits.map(hit=><tr key={hit.key}><td>{hit.title}<small>{hit.subtitle}</small></td>{hit.rows.map(([label,value])=><td key={label}>{value}</td>)}<td>{hit.change}</td></tr>)}</tbody></table></div></details></section>;
}
