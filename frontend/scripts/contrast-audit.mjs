// Contrast audit: lists visible text whose colour against its effective background is below 4.5:1.
// Needs the dev server on :3000 and headless Chrome with remote debugging on :9333:
//   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9333 --user-data-dir=/tmp/bn-chrome about:blank
//   node scripts/contrast-audit.mjs 1440 / /directory /recruitment "/search?q=a"
// Text over photos or gradients is skipped (check those by eye).
const [w, ...paths] = process.argv.slice(2);
const base = "http://127.0.0.1:9333";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const summary = {};
for (const path of paths) {
  const tab = await (await fetch(`${base}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Emulation.setDeviceMetricsOverride", { width: +w, height: 900, deviceScaleFactor: 1, mobile: +w < 700 });
  await send("Page.enable");
  await send("Page.navigate", { url: `http://localhost:3000${path}` });
  await sleep(4500);
  const res = await send("Runtime.evaluate", { returnByValue: true, expression: `(() => {
    const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(',').map(Number); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; };
    const lum = ({r,g,b}) => { const f = (v) => { v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
    const over = (top, bottom) => ({ r: top.r*top.a + bottom.r*(1-top.a), g: top.g*top.a + bottom.g*(1-top.a), b: top.b*top.a + bottom.b*(1-top.a), a: 1 });
    const bgOf = (el) => { let stack = []; let n = el; let image = false; while (n && n.nodeType === 1) { const cs = getComputedStyle(n); if (cs.backgroundImage && cs.backgroundImage !== 'none') image = true; const c = parse(cs.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } n = n.parentElement; } let base = {r:255,g:255,b:255,a:1}; for (let i = stack.length-1; i>=0; i--) base = over(stack[i], base); return {c: base, image}; };
    const out = {}; 
    for (const el of document.querySelectorAll('body *')) {
      if (!el.childNodes.length) continue; const own = [...el.childNodes].some(n => n.nodeType===3 && n.textContent.trim().length>1); if (!own) continue;
      const cs = getComputedStyle(el); if (cs.display==='none' || cs.visibility==='hidden' || parseFloat(cs.opacity) < 0.3) continue; const r = el.getBoundingClientRect(); if (r.width<2 || r.height<2) continue;
      if (el.closest('.bn-dd, [aria-hidden=true], script, style, .sr-only')) continue;
      const fg = parse(cs.color); if (!fg) continue; const {c: bg, image} = bgOf(el); if (image) continue;
      const f = over(fg, bg); const L1 = lum(f), L2 = lum(bg); const ratio = (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
      if (ratio < 4.5) { const key = (el.tagName+'.'+String(el.className).split(' ').slice(0,2).join('.')).slice(0,60) + ' | fg ' + cs.color + ' on ' + 'rgb('+[bg.r,bg.g,bg.b].map(Math.round).join(',')+')'; const e = out[key] = out[key] || {ratio: +ratio.toFixed(2), n: 0, sample: el.textContent.trim().slice(0,28)}; e.n++; }
    }
    return out; })()` });
  const out = res.result?.result?.value || {};
  const list = Object.entries(out).sort((a, b) => a[1].ratio - b[1].ratio);
  console.log(`\n${path}: ${list.length} low-contrast groups`);
  for (const [k, v] of list.slice(0, 14)) console.log(`  ${v.ratio}  x${v.n}  ${k}  "${v.sample}"`);
  await fetch(`${base}/json/close/${tab.id}`); ws.close();
}
