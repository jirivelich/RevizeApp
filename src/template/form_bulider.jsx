import { useState, useEffect, useRef } from "react";

/* ─── Persistence ─────────────────────────────────────────────────────────── */
const SK = "fb_doc_v3";
const load = () => { try { return JSON.parse(localStorage.getItem(SK) || "null"); } catch { return null; } };
const save = (d) => localStorage.setItem(SK, JSON.stringify(d));
const uid  = () => Math.random().toString(36).slice(2, 8);

/* ─── Block types ─────────────────────────────────────────────────────────── */
// page      → A4 stránka (container)
// section   → odstavec s nadpisem + pole
// table     → tabulka s volitelnou hlavičkou a řádky
// freetext  → čistý text / nadpis bez polí

const FIELD_TYPES = ["text","number","date","textarea","checkbox","select"];

const mkField = (over={}) => ({ id:uid(), type:"text", label:"Pole", placeholder:"", required:false, options:"", ...over });
const mkRow   = (cols)    => ({ id:uid(), cells: cols.map(()=>({ id:uid(), value:"" })) });
const mkSection = () => ({
  id:uid(), kind:"section",
  title:"Nový oddíl", titleVisible:true,
  cols:1,   // 1 | 2 | 3
  fields:[ mkField({ label:"Pole 1" }) ],
});
const mkTable = (r=3, c=3) => ({
  id:uid(), kind:"table",
  title:"Tabulka", titleVisible:true,
  hasHeader:true,
  cols: Array.from({length:c}, (_,i)=>({ id:uid(), label:`Sloupec ${i+1}`, width:1 })),
  rows: Array.from({length:r}, ()=> mkRow(Array.from({length:c}))),
});
const mkFreetext = () => ({
  id:uid(), kind:"freetext",
  text:"Nadpis / popis", style:"h2",
});
const mkPage = (n=1) => ({
  id:uid(), label:`Strana ${n}`,
  overflow:false,   // false = pevná A4, true = přetékání
  blocks:[ mkSection() ],
});
const defaultDoc = () => ({
  id:uid(), name:"Nový dokument", description:"",
  pages:[ mkPage(1) ],
});

/* ─── Print CSS ───────────────────────────────────────────────────────────── */
const PRINT_CSS = `
@page { size:A4 portrait; margin:0; }
@media print {
  html,body { margin:0; padding:0; background:white; }
  body > * { display:none !important; }
  #PRINTROOT { display:block !important; }
  .noprint { display:none !important; }
  .a4 {
    width:210mm; min-height:297mm; padding:16mm 18mm;
    background:white; color:#111;
    font-family:'Georgia','Times New Roman',serif;
    font-size:11pt; line-height:1.55; box-sizing:border-box;
    page-break-after:always; break-after:page;
  }
  .a4.overflow { min-height:unset; page-break-after:auto; break-after:auto; }
  .sec-title { font-size:10.5pt; font-weight:bold; text-transform:uppercase;
    letter-spacing:.07em; border-bottom:1pt solid #222; padding-bottom:3pt; margin:12pt 0 7pt; }
  .fields-grid { display:grid; gap:8pt; }
  .cols-1 { grid-template-columns:1fr; }
  .cols-2 { grid-template-columns:1fr 1fr; }
  .cols-3 { grid-template-columns:1fr 1fr 1fr; }
  .flabel { font-size:7.5pt; font-weight:bold; color:#555;
    text-transform:uppercase; letter-spacing:.05em; display:block; margin-bottom:2pt; }
  .fvalue { border-bottom:.75pt solid #999; min-height:16pt; padding:1pt 2pt;
    font-size:10.5pt; display:block; width:100%; box-sizing:border-box;
    background:transparent; color:#111; font-family:inherit;
    border-top:none; border-left:none; border-right:none; outline:none; }
  .fvalue.ta { min-height:36pt; }
  .chk { display:flex; align-items:center; gap:5pt; margin-top:4pt; }
  .chkbox { width:11pt; height:11pt; border:.75pt solid #444; flex-shrink:0;
    display:inline-flex; align-items:center; justify-content:center; font-size:9pt; font-weight:bold; }
  .doc-title { font-size:17pt; font-weight:bold; text-align:center; margin-bottom:3pt; }
  .doc-meta  { font-size:8.5pt; color:#666; text-align:center;
    border-bottom:.5pt solid #ccc; padding-bottom:7pt; margin-bottom:18pt; }
  .ft-h1 { font-size:16pt; font-weight:bold; margin:10pt 0 4pt; }
  .ft-h2 { font-size:13pt; font-weight:bold; margin:8pt 0 4pt; }
  .ft-h3 { font-size:10.5pt; font-weight:bold; font-style:italic; margin:6pt 0 3pt; }
  .ft-body { font-size:10.5pt; margin:4pt 0; }
  table.ftable { border-collapse:collapse; width:100%; margin:8pt 0; font-size:10pt; }
  table.ftable th { background:#f0f0f0; font-weight:bold; border:.75pt solid #999; padding:3pt 5pt; font-size:9pt; text-align:left; }
  table.ftable td { border:.75pt solid #bbb; padding:2pt 4pt; min-height:16pt; vertical-align:top; }
  table.ftable td input { border:none; outline:none; background:transparent; width:100%; font-size:10pt; font-family:inherit; }
  .tbl-title { font-size:10.5pt; font-weight:bold; text-transform:uppercase;
    letter-spacing:.07em; border-bottom:1pt solid #222; padding-bottom:3pt; margin:12pt 0 5pt; }
  .sig-row { display:flex; justify-content:space-between; margin-top:28pt; }
  .sig-label { font-size:7.5pt; color:#666; text-transform:uppercase; letter-spacing:.05em; margin-bottom:4pt; }
  .sig-line { border-bottom:.75pt solid #888; height:22pt; }
}`;

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [doc,    setDoc]    = useState(() => load() || defaultDoc());
  const [mode,   setMode]   = useState("edit");   // edit | fill | preview
  const [selPg,  setSelPg]  = useState(0);
  const [selBlk, setSelBlk] = useState(null);     // { pgIdx, blkIdx }
  const [formData, setFD]   = useState({});

  useEffect(() => { const s=document.createElement("style"); s.textContent=PRINT_CSS; document.head.appendChild(s); return()=>s.remove(); },[]);
  useEffect(() => { save(doc); }, [doc]);

  /* doc-level mutations */
  const updDoc = (fn) => setDoc(d => { const c=clone(d); fn(c); return c; });
  const addPage    = () => updDoc(d => { d.pages.push(mkPage(d.pages.length+1)); setSelPg(d.pages.length-1); });
  const delPage    = (i) => updDoc(d => { if(d.pages.length===1) return; d.pages.splice(i,1); setSelPg(Math.min(i, d.pages.length-2)); });
  const movePage   = (i, dir) => updDoc(d => { const b=d.pages[i+dir]; if(!b) return; d.pages[i+dir]=d.pages[i]; d.pages[i]=b; setSelPg(i+dir); });
  const updPage    = (pi, fn) => updDoc(d => fn(d.pages[pi]));
  const addBlock   = (pi, blk) => updDoc(d => { d.pages[pi].blocks.push(blk); setSelBlk({ pgIdx:pi, blkIdx:d.pages[pi].blocks.length-1 }); });
  const delBlock   = (pi, bi) => updDoc(d => { d.pages[pi].blocks.splice(bi,1); setSelBlk(null); });
  const moveBlock  = (pi, bi, dir) => updDoc(d => { const bl=d.pages[pi].blocks; const b=bl[bi+dir]; if(!b) return; bl[bi+dir]=bl[bi]; bl[bi]=b; setSelBlk({ pgIdx:pi, blkIdx:bi+dir }); });
  const updBlock   = (pi, bi, fn) => updDoc(d => fn(d.pages[pi].blocks[bi]));

  const enterFill  = () => {
    const fd={};
    doc.pages.forEach(pg => pg.blocks.forEach(bl => {
      if (bl.kind==="section") bl.fields.forEach(f => { fd[f.id]=f.defaultValue||""; });
      if (bl.kind==="table")   bl.rows.forEach(r => r.cells.forEach(c => { fd[c.id]=""; }));
    }));
    setFD(fd); setMode("fill");
  };

  const selBlock = selBlk ? doc.pages[selBlk.pgIdx]?.blocks[selBlk.blkIdx] : null;

  return (
    <div style={T.app}>
      {/* Print root (hidden on screen) */}
      <div id="PRINTROOT" style={{ display:"none" }}>
        {doc.pages.map((pg,pi) => <PrintPage key={pg.id} pg={pg} doc={doc} data={formData} isLast={pi===doc.pages.length-1} />)}
      </div>

      {/* Header */}
      <header style={T.hdr} className="noprint">
        <div style={T.hInner}>
          <div style={T.logo}><span style={{color:C.accent,fontSize:18}}>▣</span><span style={T.ltxt}>FormBuilder</span></div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {["edit","fill"].map(m=>(
              <button key={m} style={{...T.hTab, ...(mode===m?T.hTabActive:{})}} onClick={() => m==="fill" ? enterFill() : setMode(m)}>
                {m==="edit"?"✏️ Editor":"📝 Vyplnit"}
              </button>
            ))}
            {mode==="fill" && <button style={{...T.hBtn,background:C.success,borderColor:C.success,color:"#fff",fontWeight:600}} onClick={()=>window.print()}>🖨 Tisk / PDF</button>}
          </div>
          <div style={{fontSize:12,color:C.muted}}>Uloženo v prohlížeči</div>
        </div>
      </header>

      {mode==="edit" && (
        <div style={T.editLayout} className="noprint">
          {/* Left: page tree + block inspector */}
          <aside style={T.sidebar}>
            {/* Doc meta */}
            <div style={T.sSection}>
              <div style={T.sTitle}>Dokument</div>
              <input style={T.sInp} value={doc.name} onChange={e=>updDoc(d=>d.name=e.target.value)} placeholder="Název dokumentu" />
              <input style={{...T.sInp,marginTop:5}} value={doc.description} onChange={e=>updDoc(d=>d.description=e.target.value)} placeholder="Popis (volitelný)" />
            </div>

            {/* Pages */}
            <div style={T.sSection}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={T.sTitle}>Stránky</div>
                <button style={T.sBtnAdd} onClick={addPage}>+ strana</button>
              </div>
              {doc.pages.map((pg,pi)=>(
                <div key={pg.id} style={{...T.pgRow, ...(selPg===pi?T.pgRowSel:{})}} onClick={()=>{setSelPg(pi);setSelBlk(null);}}>
                  <span style={{flex:1,fontSize:13,fontWeight:selPg===pi?600:400}}>{pg.label||`Strana ${pi+1}`}</span>
                  <span style={{fontSize:10,color:C.muted,marginRight:4}}>{pg.overflow?"∞":"A4"}</span>
                  <button style={T.sIconBtn} onClick={e=>{e.stopPropagation();movePage(pi,-1);}}>↑</button>
                  <button style={T.sIconBtn} onClick={e=>{e.stopPropagation();movePage(pi,1);}}>↓</button>
                  <button style={{...T.sIconBtn,color:C.danger}} onClick={e=>{e.stopPropagation();delPage(pi);}}>×</button>
                </div>
              ))}
            </div>

            {/* Selected page settings */}
            {doc.pages[selPg] && (
              <div style={T.sSection}>
                <div style={T.sTitle}>Nastavení strany {selPg+1}</div>
                <label style={T.lbl}>Název strany</label>
                <input style={T.sInp} value={doc.pages[selPg].label} onChange={e=>updPage(selPg,p=>p.label=e.target.value)} />
                <label style={{...T.lbl,marginTop:8,display:"flex",gap:6,alignItems:"center"}}>
                  <input type="checkbox" checked={doc.pages[selPg].overflow} onChange={e=>updPage(selPg,p=>p.overflow=e.target.checked)} />
                  Přetékání (obsah přechází na další stránku)
                </label>
                <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:5}}>
                  <div style={{fontSize:11,color:C.muted,marginBottom:2}}>Přidat blok:</div>
                  <button style={T.sBtnBlk} onClick={()=>addBlock(selPg, mkSection())}>＋ Oddíl (sekce s poli)</button>
                  <button style={T.sBtnBlk} onClick={()=>addBlock(selPg, mkTable())}>＋ Tabulka</button>
                  <button style={T.sBtnBlk} onClick={()=>addBlock(selPg, mkFreetext())}>＋ Nadpis / text</button>
                </div>
              </div>
            )}

            {/* Block inspector */}
            {selBlock && (
              <BlockInspector
                key={selBlk.pgIdx+"-"+selBlk.blkIdx}
                block={selBlock}
                onChange={(fn)=>updBlock(selBlk.pgIdx, selBlk.blkIdx, fn)}
                onDelete={()=>delBlock(selBlk.pgIdx, selBlk.blkIdx)}
                onMove={(d)=>moveBlock(selBlk.pgIdx, selBlk.blkIdx, d)}
              />
            )}
          </aside>

          {/* Centre: A4 canvas */}
          <div style={T.canvas}>
            <div style={T.canvasInner}>
              {doc.pages.map((pg,pi)=>(
                <div key={pg.id} style={{marginBottom:40}}>
                  <div style={{...T.pgLabel}} className="noprint">
                    <span>Strana {pi+1}{pg.label?" — "+pg.label:""}</span>
                    <span style={{color:pg.overflow?C.accent:C.muted,fontSize:11}}>{pg.overflow?"přetékání povoleno":"pevná A4"}</span>
                  </div>
                  <EditPage
                    pg={pg} pi={pi}
                    selBlk={selBlk}
                    onSelBlk={(bi)=>setSelBlk({pgIdx:pi,blkIdx:bi})}
                    doc={doc}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode==="fill" && (
        <div style={{background:C.bg,minHeight:"calc(100vh - 52px)",display:"flex",flexDirection:"column",alignItems:"center",paddingTop:20,paddingBottom:60}} className="noprint">
          <div style={{width:794,display:"flex",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
            <span style={{fontSize:13,color:C.muted}}>Vyplňte formulář. Tisk/PDF zachová přesné rozložení A4.</span>
            <button style={{...T.hBtn,background:"transparent",borderColor:C.border,color:C.muted}} onClick={()=>setMode("edit")}>← Zpět do editoru</button>
          </div>
          <div id="PRINTROOT" style={{display:"block"}}>
            {doc.pages.map((pg,pi)=>(
              <FillPage key={pg.id} pg={pg} doc={doc} data={formData} setData={setFD} isLast={pi===doc.pages.length-1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ EDIT PAGE ═══════════════════════════════════════ */
function EditPage({ pg, pi, selBlk, onSelBlk, doc }) {
  return (
    <div style={{
      width:794, minHeight: pg.overflow ? "auto" : 1123,
      background:"#fff", color:"#111",
      fontFamily:"'Georgia','Times New Roman',serif",
      padding:"64px 72px", boxSizing:"border-box",
      boxShadow:"0 6px 40px rgba(0,0,0,0.55)",
      position:"relative",
    }}>
      {/* Doc title only on first page */}
      {pi===0 && (
        <div style={{textAlign:"center",marginBottom:20,borderBottom:"1px solid #ccc",paddingBottom:12}}>
          <div style={{fontSize:20,fontWeight:700}}>{doc.name||"Bez názvu"}</div>
          {doc.description && <div style={{fontSize:11,color:"#888",marginTop:3}}>{doc.description}</div>}
          <div style={{fontSize:11,color:"#999",marginTop:4}}>{new Date().toLocaleDateString("cs-CZ")}</div>
        </div>
      )}

      {pg.blocks.map((bl, bi) => {
        const isSel = selBlk?.pgIdx===pi && selBlk?.blkIdx===bi;
        return (
          <div key={bl.id}
            onClick={()=>onSelBlk(bi)}
            style={{
              position:"relative", cursor:"pointer",
              outline: isSel ? "2px solid #4f8ef7" : "2px solid transparent",
              borderRadius:3, marginBottom:16,
              transition:"outline .12s",
            }}
          >
            {isSel && <div style={{position:"absolute",top:-10,right:-2,background:"#4f8ef7",color:"#fff",fontSize:10,padding:"1px 7px",borderRadius:3,zIndex:10,pointerEvents:"none"}}>
              {bl.kind==="section"?"Oddíl":bl.kind==="table"?"Tabulka":"Text"}
            </div>}
            <EditBlock bl={bl} />
          </div>
        );
      })}

      {pg.blocks.length===0 && (
        <div style={{textAlign:"center",padding:"60px 0",color:"#bbb",fontSize:13,border:"1px dashed #ddd",borderRadius:4}}>
          Prázdná strana — přidejte blok z levého panelu
        </div>
      )}
    </div>
  );
}

function EditBlock({ bl }) {
  if (bl.kind==="freetext") {
    const style={h1:{fontSize:20,fontWeight:700,margin:"8px 0 4px"},h2:{fontSize:16,fontWeight:700,margin:"6px 0 3px"},h3:{fontSize:13,fontWeight:700,fontStyle:"italic",margin:"5px 0 2px"},body:{fontSize:13,margin:"3px 0"}}[bl.style];
    return <div style={style}>{bl.text||<span style={{color:"#bbb"}}>Prázdný text</span>}</div>;
  }
  if (bl.kind==="table") return <EditTable bl={bl} />;
  return <EditSection bl={bl} />;
}

function EditSection({ bl }) {
  const gridCols = ["1fr","1fr 1fr","1fr 1fr 1fr"][bl.cols-1]||"1fr";
  return (
    <div>
      {bl.titleVisible && <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:"1.5px solid #222",paddingBottom:5,marginBottom:10}}>{bl.title||"Oddíl"}</div>}
      <div style={{display:"grid",gridTemplateColumns:gridCols,gap:"10px 16px"}}>
        {bl.fields.map(f=>(
          <div key={f.id} style={{minWidth:0}}>
            <div style={{fontSize:10,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>{f.label}{f.required&&<span style={{color:"#c00"}}> *</span>}</div>
            {f.type==="checkbox"
              ? <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}><div style={{width:13,height:13,border:"1px solid #888",borderRadius:1}}/><span style={{fontSize:11,color:"#aaa"}}>zaškrtnutí</span></div>
              : <div style={{borderBottom:"1px solid #bbb",minHeight:18,marginTop:2,color:f.placeholder?"#ccc":"transparent",fontSize:13,paddingBottom:2}}>{f.placeholder||"–"}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditTable({ bl }) {
  return (
    <div>
      {bl.titleVisible && <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:"1.5px solid #222",paddingBottom:5,marginBottom:8}}>{bl.title||"Tabulka"}</div>}
      <table style={{borderCollapse:"collapse",width:"100%",fontSize:12}}>
        {bl.hasHeader && (
          <thead>
            <tr>{bl.cols.map(c=><th key={c.id} style={{background:"#f0f0f0",border:"1px solid #bbb",padding:"4px 7px",textAlign:"left",fontSize:10,fontWeight:700}}>{c.label}</th>)}</tr>
          </thead>
        )}
        <tbody>
          {bl.rows.map(r=>(
            <tr key={r.id}>
              {r.cells.map(c=><td key={c.id} style={{border:"1px solid #ccc",padding:"3px 6px",minHeight:20,fontSize:12,color:"#ddd"}}>–</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════ BLOCK INSPECTOR ══════════════════════════════════ */
function BlockInspector({ block, onChange, onDelete, onMove }) {
  const upd = (fn) => onChange(b => { fn(b); });

  return (
    <div style={T.sSection}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={T.sTitle}>
          {block.kind==="section"?"✦ Oddíl":block.kind==="table"?"▦ Tabulka":"T Text/Nadpis"}
        </div>
        <div style={{display:"flex",gap:4}}>
          <button style={T.sIconBtn} onClick={()=>onMove(-1)}>↑</button>
          <button style={T.sIconBtn} onClick={()=>onMove(1)}>↓</button>
          <button style={{...T.sIconBtn,color:C.danger}} onClick={onDelete}>×</button>
        </div>
      </div>

      {block.kind==="freetext" && <FreetextInspector b={block} upd={upd} />}
      {block.kind==="section"  && <SectionInspector  b={block} upd={upd} />}
      {block.kind==="table"    && <TableInspector    b={block} upd={upd} />}
    </div>
  );
}

function FreetextInspector({ b, upd }) {
  return (
    <>
      <label style={T.lbl}>Text / nadpis</label>
      <textarea style={{...T.sInp,minHeight:60,resize:"vertical"}} value={b.text} onChange={e=>upd(x=>x.text=e.target.value)} />
      <label style={T.lbl}>Styl</label>
      <select style={T.sInp} value={b.style} onChange={e=>upd(x=>x.style=e.target.value)}>
        <option value="h1">H1 — Velký nadpis</option>
        <option value="h2">H2 — Střední nadpis</option>
        <option value="h3">H3 — Malý nadpis</option>
        <option value="body">Tělo textu</option>
      </select>
    </>
  );
}

function SectionInspector({ b, upd }) {
  const addField = () => upd(x=>x.fields.push(mkField({label:`Pole ${x.fields.length+1}`})));
  const delField = (fi) => upd(x=>x.fields.splice(fi,1));
  const updField = (fi,k,v) => upd(x=>x.fields[fi][k]=v);
  const moveField= (fi,dir) => upd(x=>{ const a=x.fields; if(!a[fi+dir]) return; const t=a[fi+dir]; a[fi+dir]=a[fi]; a[fi]=t; });

  return (
    <>
      <label style={T.lbl}>Název oddílu</label>
      <input style={T.sInp} value={b.title} onChange={e=>upd(x=>x.title=e.target.value)} />
      <label style={{...T.lbl,display:"flex",gap:5,alignItems:"center",marginTop:6}}>
        <input type="checkbox" checked={b.titleVisible} onChange={e=>upd(x=>x.titleVisible=e.target.checked)} />
        Zobrazit název oddílu
      </label>
      <label style={T.lbl}>Rozložení polí</label>
      <div style={{display:"flex",gap:5,marginBottom:10}}>
        {[1,2,3].map(n=>(
          <button key={n} style={{...T.colBtn,...(b.cols===n?T.colBtnSel:{})}} onClick={()=>upd(x=>x.cols=n)}>
            {["1 sloupec","2 sl.","3 sl."][n-1]}
          </button>
        ))}
      </div>

      <div style={{fontSize:11,color:C.muted,marginBottom:6}}>Pole oddílu:</div>
      {b.fields.map((f,fi)=>(
        <div key={f.id} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,padding:8,marginBottom:6}}>
          <div style={{display:"flex",gap:5,marginBottom:5,alignItems:"center"}}>
            <input style={{...T.sInp,flex:1,margin:0}} value={f.label} onChange={e=>updField(fi,"label",e.target.value)} placeholder="Název pole" />
            <button style={T.sIconBtn} onClick={()=>moveField(fi,-1)}>↑</button>
            <button style={T.sIconBtn} onClick={()=>moveField(fi,1)}>↓</button>
            <button style={{...T.sIconBtn,color:C.danger}} onClick={()=>delField(fi)}>×</button>
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            <select style={{...T.sInp,flex:1,margin:0}} value={f.type} onChange={e=>updField(fi,"type",e.target.value)}>
              {FIELD_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            <label style={{fontSize:11,color:C.muted,display:"flex",gap:4,alignItems:"center"}}>
              <input type="checkbox" checked={f.required} onChange={e=>updField(fi,"required",e.target.checked)}/> *
            </label>
          </div>
          {f.type==="select" && (
            <input style={{...T.sInp,marginTop:5}} value={f.options} onChange={e=>updField(fi,"options",e.target.value)} placeholder="Možnosti: Ano,Ne,Nevím" />
          )}
          <input style={{...T.sInp,marginTop:5}} value={f.placeholder} onChange={e=>updField(fi,"placeholder",e.target.value)} placeholder="Placeholder text" />
        </div>
      ))}
      <button style={T.sBtnAdd} onClick={addField}>+ Přidat pole</button>
    </>
  );
}

function TableInspector({ b, upd }) {
  const addCol = () => upd(x=>{ const id=uid(); x.cols.push({id,label:`Sl. ${x.cols.length+1}`,width:1}); x.rows.forEach(r=>r.cells.push({id:uid(),value:""})); });
  const delCol = (ci) => upd(x=>{ if(x.cols.length<=1) return; x.cols.splice(ci,1); x.rows.forEach(r=>r.cells.splice(ci,1)); });
  const addRow = () => upd(x=>x.rows.push(mkRow(x.cols)));
  const delRow = (ri) => upd(x=>{ if(x.rows.length<=1) return; x.rows.splice(ri,1); });

  return (
    <>
      <label style={T.lbl}>Název tabulky</label>
      <input style={T.sInp} value={b.title} onChange={e=>upd(x=>x.title=e.target.value)} />
      <label style={{...T.lbl,display:"flex",gap:5,alignItems:"center",marginTop:6}}>
        <input type="checkbox" checked={b.titleVisible} onChange={e=>upd(x=>x.titleVisible=e.target.checked)} />
        Zobrazit název
      </label>
      <label style={{...T.lbl,display:"flex",gap:5,alignItems:"center",marginTop:6}}>
        <input type="checkbox" checked={b.hasHeader} onChange={e=>upd(x=>x.hasHeader=e.target.checked)} />
        Záhlaví (první řádek = popis)
      </label>

      <div style={{fontSize:11,color:C.muted,marginBottom:4,marginTop:8}}>Sloupce:</div>
      {b.cols.map((c,ci)=>(
        <div key={c.id} style={{display:"flex",gap:5,marginBottom:4,alignItems:"center"}}>
          <input style={{...T.sInp,flex:1,margin:0}} value={c.label} onChange={e=>upd(x=>x.cols[ci].label=e.target.value)} placeholder="Název sloupce" />
          <button style={{...T.sIconBtn,color:C.danger}} onClick={()=>delCol(ci)}>×</button>
        </div>
      ))}
      <button style={{...T.sBtnAdd,marginBottom:8}} onClick={addCol}>+ Přidat sloupec</button>

      <div style={{fontSize:11,color:C.muted,marginBottom:4,marginTop:4}}>Řádky: {b.rows.length}</div>
      <div style={{display:"flex",gap:6}}>
        <button style={T.sBtnAdd} onClick={addRow}>+ Řádek</button>
        <button style={{...T.sBtnAdd,color:C.danger,borderColor:C.danger}} onClick={()=>delRow(b.rows.length-1)}>– Řádek</button>
      </div>
    </>
  );
}

/* ═══════════════════════ FILL PAGE ═══════════════════════════════════════ */
function FillPage({ pg, doc, data, setData, isLast }) {
  const set = (id,v) => setData(p=>({...p,[id]:v}));
  const pgIdx = doc.pages.indexOf(pg); // approx
  return (
    <div className="a4" style={{
      width:794, minHeight: pg.overflow ? "auto" : 1123,
      background:"#fff", color:"#111",
      fontFamily:"'Georgia','Times New Roman',serif",
      padding:"64px 72px", boxSizing:"border-box",
      boxShadow:"0 6px 40px rgba(0,0,0,0.55)",
      marginBottom:32,
    }}>
      {doc.pages[0]===pg && (
        <div className="doc-header" style={{textAlign:"center",marginBottom:20,borderBottom:"1px solid #ccc",paddingBottom:12}}>
          <div className="doc-title" style={{fontSize:20,fontWeight:700}}>{doc.name||"Bez názvu"}</div>
          {doc.description && <div style={{fontSize:11,color:"#888",marginTop:3}}>{doc.description}</div>}
          <div className="doc-meta" style={{fontSize:11,color:"#999",marginTop:4}}>{new Date().toLocaleDateString("cs-CZ")}</div>
        </div>
      )}
      {pg.blocks.map(bl => <FillBlock key={bl.id} bl={bl} data={data} set={set} />)}
      {isLast && (
        <div className="sig-row" style={{display:"flex",justifyContent:"space-between",marginTop:44}}>
          {[["Podpis",180],["Datum",140],["Razítko",110]].map(([l,w])=>(
            <div key={l}><div className="sig-label" style={{fontSize:10,color:"#666",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>{l}</div><div className="sig-line" style={{borderBottom:"1px solid #888",height:24,width:w}}/></div>
          ))}
        </div>
      )}
    </div>
  );
}

function FillBlock({ bl, data, set }) {
  if (bl.kind==="freetext") {
    const st={h1:{fontSize:20,fontWeight:700,margin:"8px 0 4px"},h2:{fontSize:16,fontWeight:700,margin:"6px 0 3px"},h3:{fontSize:13,fontWeight:700,fontStyle:"italic",margin:"5px 0 2px"},body:{fontSize:13,margin:"3px 0"}}[bl.style];
    return <div className={`ft-${bl.style}`} style={st}>{bl.text}</div>;
  }
  if (bl.kind==="table") return <FillTable bl={bl} data={data} set={set} />;
  return <FillSection bl={bl} data={data} set={set} />;
}

function FillSection({ bl, data, set }) {
  const gridCols=["1fr","1fr 1fr","1fr 1fr 1fr"][bl.cols-1]||"1fr";
  const inpBase={width:"100%",border:"none",borderBottom:"1px solid #aaa",background:"transparent",color:"#111",fontSize:13,padding:"3px 2px",outline:"none",fontFamily:"'Georgia',serif",boxSizing:"border-box"};
  return (
    <div style={{marginBottom:18}}>
      {bl.titleVisible && <div className="sec-title" style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:"1.5px solid #222",paddingBottom:5,marginBottom:10}}>{bl.title}</div>}
      <div className={`fields-grid cols-${bl.cols}`} style={{display:"grid",gridTemplateColumns:gridCols,gap:"10px 18px"}}>
        {bl.fields.map(f=>(
          <div key={f.id} className="f-block" style={{minWidth:0}}>
            <span className="flabel" style={{fontSize:10,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:3}}>{f.label}{f.required&&<span style={{color:"#c00"}}> *</span>}</span>
            {f.type==="checkbox"
              ? <div className="chk" style={{display:"flex",alignItems:"center",gap:7,marginTop:3}}>
                  <div className="chkbox" style={{width:13,height:13,border:"1px solid #555",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#1a6640",fontWeight:700}}>
                    {data[f.id]?"✓":""}
                  </div>
                  <input type="checkbox" checked={!!data[f.id]} onChange={e=>set(f.id,e.target.checked)} style={{width:15,height:15,cursor:"pointer",accentColor:"#2a6496"}}/>
                </div>
              : f.type==="textarea"
                ? <textarea className="fvalue ta" style={{...inpBase,minHeight:52,resize:"vertical"}} value={data[f.id]||""} placeholder={f.placeholder} onChange={e=>set(f.id,e.target.value)} rows={3}/>
                : f.type==="select"
                  ? <select className="fvalue" style={inpBase} value={data[f.id]||""} onChange={e=>set(f.id,e.target.value)}>
                      <option value="">— Vyberte —</option>
                      {(f.options||"").split(",").filter(Boolean).map(o=><option key={o.trim()} value={o.trim()}>{o.trim()}</option>)}
                    </select>
                  : <input className="fvalue" type={f.type} style={inpBase} value={data[f.id]||""} placeholder={f.placeholder} onChange={e=>set(f.id,e.target.value)}/>
            }
          </div>
        ))}
      </div>
    </div>
  );
}

function FillTable({ bl, data, set }) {
  const tdBase={border:"1px solid #ccc",padding:"3px 5px",verticalAlign:"top"};
  const inpBase={border:"none",outline:"none",background:"transparent",width:"100%",fontSize:12,fontFamily:"'Georgia',serif",color:"#111"};
  return (
    <div style={{marginBottom:18}}>
      {bl.titleVisible && <div className="tbl-title" style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:"1.5px solid #222",paddingBottom:5,marginBottom:8}}>{bl.title}</div>}
      <table className="ftable" style={{borderCollapse:"collapse",width:"100%",fontSize:12}}>
        {bl.hasHeader && <thead><tr>{bl.cols.map(c=><th key={c.id} style={{background:"#f0f0f0",border:"1px solid #bbb",padding:"4px 7px",textAlign:"left",fontSize:10,fontWeight:700}}>{c.label}</th>)}</tr></thead>}
        <tbody>
          {bl.rows.map(r=>(
            <tr key={r.id}>
              {r.cells.map(c=><td key={c.id} style={tdBase}><input style={inpBase} value={data[c.id]||""} onChange={e=>set(c.id,e.target.value)}/></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════ PRINT PAGE (hidden) ══════════════════════════════ */
function PrintPage({ pg, doc, data, isLast }) {
  return <FillPage pg={pg} doc={doc} data={data} setData={()=>{}} isLast={isLast} />;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const clone = (x) => JSON.parse(JSON.stringify(x));

/* ─── Colours & Tokens ────────────────────────────────────────────────────── */
const C = { bg:"#0d1117", surface:"#161b26", card:"#1c2130", border:"#252d42", accent:"#4f8ef7", text:"#dde2f0", muted:"#6b7490", danger:"#e05555", success:"#3ecf8e" };

const T = {
  app:       { minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'IBM Plex Sans','Segoe UI',system-ui,sans-serif" },
  hdr:       { background:C.surface, borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, zIndex:200 },
  hInner:    { maxWidth:1600, margin:"0 auto", padding:"0 20px", height:50, display:"flex", alignItems:"center", gap:12, justifyContent:"space-between" },
  logo:      { display:"flex", alignItems:"center", gap:8 },
  ltxt:      { fontWeight:700, fontSize:15 },
  hTab:      { background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"5px 14px", borderRadius:7, cursor:"pointer", fontSize:13 },
  hTabActive:{ background:C.accent, borderColor:C.accent, color:"#fff", fontWeight:600 },
  hBtn:      { padding:"5px 14px", borderRadius:7, cursor:"pointer", fontSize:13, border:`1px solid ${C.border}` },

  editLayout:{ display:"grid", gridTemplateColumns:"300px 1fr", minHeight:"calc(100vh - 50px)" },
  sidebar:   { background:C.surface, borderRight:`1px solid ${C.border}`, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:0 },
  sSection:  { borderBottom:`1px solid ${C.border}`, paddingBottom:14, marginBottom:14 },
  sTitle:    { fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 },
  sInp:      { width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, padding:"6px 9px", color:C.text, fontSize:12, outline:"none", boxSizing:"border-box" },
  lbl:       { display:"flex", alignItems:"center", fontSize:11, color:C.muted, marginBottom:4, gap:4 },
  sIconBtn:  { background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:13, padding:"0 3px" },
  sBtnAdd:   { background:"transparent", color:C.accent, border:`1px dashed ${C.accent}`, padding:"4px 10px", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer" },
  sBtnBlk:   { background:C.card, border:`1px solid ${C.border}`, color:C.text, padding:"7px 10px", borderRadius:7, fontSize:12, cursor:"pointer", textAlign:"left" },
  pgRow:     { display:"flex", alignItems:"center", gap:3, padding:"6px 8px", borderRadius:7, cursor:"pointer", marginBottom:3 },
  pgRowSel:  { background:C.card },
  colBtn:    { background:C.bg, border:`1px solid ${C.border}`, color:C.muted, padding:"4px 9px", borderRadius:6, fontSize:11, cursor:"pointer" },
  colBtnSel: { background:C.accent, borderColor:C.accent, color:"#fff", fontWeight:600 },

  canvas:    { overflowY:"auto", background:"#1a1a2e", padding:"28px 0" },
  canvasInner:{ display:"flex", flexDirection:"column", alignItems:"center" },
  pgLabel:   { width:794, display:"flex", justifyContent:"space-between", fontSize:11, color:"#6b7490", marginBottom:6, padding:"0 4px" },
};