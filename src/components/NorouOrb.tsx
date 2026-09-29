"use client";
import { useEffect, useState } from "react";
type OrbState = "idle" | "listening" | "thinking" | "planning" | "executing" | "success" | "offline";
type Props = { size?: "hero" | "compact"; active?: boolean; onClick?: () => void; label?: string; state?: OrbState };
export function NorouOrb({size="hero",active=false,onClick,label="Nova AI",state="idle"}: Props) {
  const [awake,setAwake]=useState(active);
  useEffect(()=>{if(!active){setAwake(false);return;}setAwake(true);const t=window.setTimeout(()=>setAwake(false),1400);return()=>window.clearTimeout(t);},[active]);
  const hero=size==="hero";
  const labelText={idle:"NOVA ONLINE",listening:"LISTENING",thinking:"THINKING",planning:"PLANNING",executing:"EXECUTING",success:"COMPLETE",offline:"LOCAL MODE"}[state];
  return <div className={`norou-holo-wrap norou-state-${state} ${hero?"norou-holo-hero":"norou-holo-compact"}`}>
    <button type="button" aria-label={`Open ${label}`} onClick={onClick} className={`norou-holo ${awake?"norou-holo-awake":""}`}>
      <span className="norou-holo-aura"/><span className="norou-holo-grid"/><span className="norou-holo-ring norou-holo-ring-a"/><span className="norou-holo-ring norou-holo-ring-b"/><span className="norou-holo-ring norou-holo-ring-c"/><span className="norou-holo-core"/><span className="norou-holo-core-hot"/>{(["p1","p2","p3","p4","p5","p6"] as const).map(p=><span key={p} className={`norou-holo-particle ${p}`}/>)}<span className="norou-holo-scanline"/>
    </button>{hero&&<div className="norou-holo-caption"><span className="norou-status-dot"/><span>{labelText}</span></div>}
  </div>;
}
