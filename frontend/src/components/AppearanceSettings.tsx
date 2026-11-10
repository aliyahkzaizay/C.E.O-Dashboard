import { useId, useRef, useState } from "react";
import type { Appearance } from "../hooks/useAppearance";
import "./AppearanceSettings.css";

type Props = { appearance: Appearance; onChange: (next: Appearance) => void; storageError: string };
const presets = [{ name: "Blue", color: "#2563eb" }, { name: "Purple", color: "#7040c8" }, { name: "Teal", color: "#087e75" }];
function hsv(hex: string) {
  const [r, g, b] = hex.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255);
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  return { h: d ? (((max === r ? (g-b)/d : max === g ? (b-r)/d+2 : (r-g)/d+4)*60+360)%360) : 0, s: max ? d/max*100 : 0, v: max*100 };
}
function hexColor(h: number, s: number, v: number) {
  const c=v/100*s/100, x=c*(1-Math.abs(h/60%2-1)), m=v/100-c;
  const channels=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return "#"+channels.map(n=>Math.round((n+m)*255).toString(16).padStart(2,"0")).join("");
}

/** Personal theme controls with a pointer wheel and equivalent keyboard sliders. */
export default function AppearanceSettings({ appearance, onChange, storageError }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(appearance.accent);
  const [error, setError] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [color, setColor] = useState(() => hsv(appearance.accent));
  const custom = !presets.some(p=>p.color===appearance.accent);
  function choose(accent: string, selectedColor = hsv(accent)) { setColor(selectedColor); setDraft(accent); setError(""); onChange({ ...appearance, accent }); }
  function close() { setOpen(false); trigger.current?.focus(); }
  function point(event: React.PointerEvent<HTMLDivElement>) {
    const rect=event.currentTarget.getBoundingClientRect(), x=event.clientX-rect.left-rect.width/2, y=event.clientY-rect.top-rect.height/2;
    const next = { h: (Math.atan2(y,x)*180/Math.PI+360)%360, s: Math.min(100,Math.hypot(x,y)/(rect.width/2)*100), v: 100 };
    choose(hexColor(next.h,next.s,next.v), next);
  }
  return <section className="appearance-settings" aria-labelledby={`${id}-heading`}>
    <h3 id={`${id}-heading`}>Appearance</h3><p>Personal to your account on this browser.</p>
    <div className="appearance-options"><fieldset><legend>Theme</legend><div className="appearance-choices">
      {(["light", "dark", "system"] as const).map(theme=><button type="button" key={theme} aria-pressed={appearance.theme===theme} onClick={()=>onChange({...appearance,theme})}>{theme[0].toUpperCase()+theme.slice(1)}</button>)}
    </div></fieldset><fieldset><legend>Accent color</legend><div className="appearance-choices">
      {presets.map(p=><button type="button" key={p.name} className="appearance-swatch" aria-label={p.name} aria-pressed={appearance.accent===p.color} onClick={()=>choose(p.color)}><span style={{background:p.color}} /></button>)}
      <button type="button" ref={trigger} className="appearance-swatch" aria-label="Choose custom accent color" aria-pressed={custom} aria-expanded={open} aria-controls={`${id}-picker`} onClick={()=>{setDraft(appearance.accent);setOpen(!open)}}><span className="appearance-rainbow" style={custom?{background:appearance.accent,color:"var(--ceo-on-accent)"}:undefined}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m16 3 5 5-3 3-5-5zM14 7 4 17v3h3L17 10M12 5l7 7" /></svg></span></button>
    </div></fieldset></div>
    {open && <div className="appearance-picker" id={`${id}-picker`} onKeyDown={e=>{if(e.key==="Escape")close()}}><div className="appearance-picker-heading"><h4>Custom color</h4><button type="button" aria-label="Close color picker" onClick={close}>×</button></div>
      <div className="appearance-wheel" role="img" aria-label="Drag to choose a color, or use the sliders below" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);point(e)}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))point(e)}}><span style={{left:`${50+Math.cos(color.h*Math.PI/180)*color.s/2}%`,top:`${50+Math.sin(color.h*Math.PI/180)*color.s/2}%`}} /></div>
      {([['Hue','h',359],['Saturation','s',100],['Brightness','v',100]] as const).map(([label,key,max])=><label key={key}>{label}<input type="range" min="0" max={max} value={color[key]} onChange={e=>{const next={...color,[key]:+e.target.value};choose(hexColor(next.h,next.s,next.v), next)}} /></label>)}
      <label>Hex color<input type="text" value={draft} maxLength={7} spellCheck={false} aria-invalid={!!error} aria-describedby={error?`${id}-error`:undefined} onChange={e=>{setDraft(e.target.value);if(/^#[0-9a-f]{6}$/i.test(e.target.value))choose(e.target.value.toLowerCase())}} onBlur={()=>setError(/^#[0-9a-f]{6}$/i.test(draft)?"":"Enter # followed by six hex digits.")} /></label>
      {error && <p id={`${id}-error`} role="alert">{error}</p>}
    </div>}
    {storageError && <p role="status">{storageError}</p>}
  </section>;
}
