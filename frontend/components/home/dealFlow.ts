/* eslint-disable */
// @ts-nocheck
// Home hero background: "Deal Flow" (option 4 of frontend/docs/hero-living-scenes.html; replaced
// Trade Grid on 12 Oct 2026 at the owner's request). The whole suite drifts in depth behind the
// hero: Ask Navya questions, Directory RFQs, quotes and verified suppliers, Recruitment posts,
// applicants and interviews, Growth OS previews and promoted listings, each tagged in its
// product's colour. Every card hands off to its next step (question to match, RFQ to quote, job
// to applicant, applicant to interview, promotion to RFQ) with a pulse that lights the
// receiving card. Ported from the board as-is; only the host wiring differs: it draws into a
// canvas inside the hero, keeps clear of the headline and the product cards it is given, pauses
// off screen / in a background tab, and shows one still frame under reduced motion. Card art
// uses the app's next/font families, read from their CSS variables.
// Used by components/home/DealFlowBg.tsx.

export function startDealFlow(cv, hero, h1, cardsEl) {
const ctx=cv.getContext('2d');
let W=0,H=0,DPR=1,T=0,last=0,lastMeasure=0,running=false,raf=0;
const TAU=Math.PI*2;
const lerp=(a,b,t)=>a+(b-a)*t, clamp=(v,a,b)=>v<a?a:v>b?b:v, mod=(a,n)=>((a%n)+n)%n;
const ease=t=>1-Math.pow(1-clamp(t,0,1),3);
const easeIO=t=>(t=clamp(t,0,1))<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const bump=(t,a,b,c,d)=>clamp((t-a)/(b-a),0,1)*clamp((d-t)/(d-c),0,1); // ramp in a..b, hold, ramp out c..d
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const hash=(i,j,k=0)=>{let h=Math.imul(i|0,374761393)+Math.imul(j|0,668265263)+Math.imul(k|0,1442695041)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296};
const SN=(()=>{const G=[1,1,0,-1,1,0,1,-1,0,-1,-1,0,1,0,1,-1,0,1,1,0,-1,-1,0,-1,0,1,1,0,-1,1,0,1,-1,0,-1,-1];
  const p=new Uint8Array(256),r=mulberry(7);for(let i=0;i<256;i++)p[i]=i;for(let i=255;i>0;i--){const j=(r()*(i+1))|0;const t=p[i];p[i]=p[j];p[j]=t}
  const P=new Uint8Array(512),M=new Uint8Array(512);for(let i=0;i<512;i++){P[i]=p[i&255];M[i]=P[i]%12}
  const F=1/3,g=1/6,c=(gi,x,y,z)=>{let t=.6-x*x-y*y-z*z;if(t<0)return 0;t*=t;const k=gi*3;return t*t*(G[k]*x+G[k+1]*y+G[k+2]*z)};
  return(x,y,z)=>{const s=(x+y+z)*F,i=Math.floor(x+s),j=Math.floor(y+s),k=Math.floor(z+s),t=(i+j+k)*g,x0=x-i+t,y0=y-j+t,z0=z-k+t;let i1,j1,k1,i2,j2,k2;
    if(x0>=y0){if(y0>=z0){i1=1;j1=0;k1=0;i2=1;j2=1;k2=0}else if(x0>=z0){i1=1;j1=0;k1=0;i2=1;j2=0;k2=1}else{i1=0;j1=0;k1=1;i2=1;j2=0;k2=1}}
    else{if(y0<z0){i1=0;j1=0;k1=1;i2=0;j2=1;k2=1}else if(x0<z0){i1=0;j1=1;k1=0;i2=0;j2=1;k2=1}else{i1=0;j1=1;k1=0;i2=1;j2=1;k2=0}}
    const ii=i&255,jj=j&255,kk=k&255;
    return 32*(c(M[ii+P[jj+P[kk]]],x0,y0,z0)+c(M[ii+i1+P[jj+j1+P[kk+k1]]],x0-i1+g,y0-j1+g,z0-k1+g)+c(M[ii+i2+P[jj+j2+P[kk+k2]]],x0-i2+2*g,y0-j2+2*g,z0-k2+2*g)+c(M[ii+1+P[jj+1+P[kk+1]]],x0-1+3*g,y0-1+3*g,z0-1+3*g))}})();





const FG={h1:{x:0,y:0,w:0,h:0},cardsBox:{x:0,y:0,w:0,h:0},cards:[]};
const inR=(r,x,y,p)=>x>r.x-p&&x<r.x+r.w+p&&y>r.y-p&&y<r.y+r.h+p;
const hidden=(x,y,p=0)=>inR(FG.h1,x,y,p)||FG.cards.some(r=>inR(r,x,y,p));
const onScreen=(x,y,p=0)=>x>p&&x<W-p&&y>p&&y<H-p;
function stageSpot(R,pad=10){const top=FG.cardsBox.y-pad;for(let k=0;k<60;k++){const x=R()*W,y=8+R()*Math.max(10,top-8);if(!hidden(x,y,pad))return{x,y}}return openSpot(R,pad)}
function openSpot(R,pad=10){for(let k=0;k<40;k++){const x=R()*W,y=R()*H;if(!hidden(x,y,pad))return{x,y}}return{x:R()*W,y:R()*H}}

// ---- shared drawing helpers
function rr(g,x,y,w,h,r){g.beginPath();g.roundRect?g.roundRect(x,y,w,h,r):g.rect(x,y,w,h)}
function poly(pts,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);ctx.fill()}
const F1='600 12.5px "Work Sans",sans-serif',F2='500 11.5px "Work Sans",sans-serif';
function chipSize(lines){ctx.font=F1;let w=ctx.measureText(lines[0]).width;if(lines[1]){ctx.font=F2;w=Math.max(w,ctx.measureText(lines[1]).width)}return[w+38,lines[1]?48:30]}
const chipFits=(x,y,w,h)=>x>6&&y>6&&x+w<W-6&&y+h<H-6&&![[x,y],[x+w,y],[x,y+h],[x+w,y+h],[x+w/2,y+h/2]].some(([a,b])=>hidden(a,b,8));
function drawChip(x,y,w,h,lines,accent,a){if(a<=.01)return;ctx.save();ctx.globalAlpha=a;
  ctx.shadowColor='rgba(2,8,32,.55)';ctx.shadowBlur=18;ctx.shadowOffsetY=6;rr(ctx,x,y,w,h,12);ctx.fillStyle='rgba(13,32,92,.92)';ctx.fill();ctx.shadowColor='transparent';
  ctx.strokeStyle='rgba(220,228,251,.24)';ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle=`rgb(${accent})`;ctx.beginPath();ctx.arc(x+16,y+(lines[1]?17:h/2),4,0,TAU);ctx.fill();
  ctx.fillStyle=`rgba(${accent},.25)`;ctx.beginPath();ctx.arc(x+16,y+(lines[1]?17:h/2),8,0,TAU);ctx.fill();
  ctx.textBaseline='middle';ctx.font=F1;ctx.fillStyle='#F4F7FF';ctx.fillText(lines[0],x+29,y+(lines[1]?17:h/2+.5));
  if(lines[1]){ctx.font=F2;ctx.fillStyle='rgba(220,228,251,.72)';ctx.fillText(lines[1],x+29,y+33)}ctx.restore()}
function glowDot(x,y,r,col,a=1){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,255,255,${.95*a})`);g.addColorStop(.22,`rgba(${col},${.75*a})`);g.addColorStop(1,`rgba(${col},0)`);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r)}
function persp(o,X,Z,Y=0){const c=Math.cos(o.yaw),s=Math.sin(o.yaw),x=X*c-Z*s,z=X*s+Z*c,ct=Math.cos(o.tilt),st=Math.sin(o.tilt),yv=z*st+Y*ct,d=z*ct-Y*st,k=o.f/(o.f+d);return[o.cx+x*k*o.s,o.cy-yv*k*o.s,k]}
const AMBER='255,190,46',LAV='220,228,251',SKY='156,196,255',GREEN='47,191,134';
const css=getComputedStyle(document.documentElement);
const FA=css.getPropertyValue('--font-anek-latin').trim()||'sans-serif',FW=css.getPropertyValue('--font-work-sans').trim()||'sans-serif';

function txt(g,s,x,y,font,col,al='left'){g.font=font;g.fillStyle=col;g.textAlign=al;g.textBaseline='middle';g.fillText(s,x,y);g.textAlign='left'}
function pill(g,x,y,s,bg,fg){g.font='600 11px '+FW+'';const w=g.measureText(s).width+18;rr(g,x,y,w,22,11);g.fillStyle=bg;g.fill();txt(g,s,x+9,y+11.5,'600 11px '+FW+'',fg);return w}
function avatar(g,x,y,r,l,bg){g.fillStyle=bg;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();txt(g,l,x,y+.5,`700 ${r}px ${FW}`,'#0F2A70','center')}
function star(g,x,y,r,fill){g.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,rr2=k&1?r*.45:r;g.lineTo(x+Math.cos(a)*rr2,y+Math.sin(a)*rr2)}g.closePath();g.fillStyle=fill;g.fill()}
function bubble(g,x,y,w,h,fill){rr(g,x,y,w,h,12);g.fillStyle=fill;g.fill()}
const WH='#F4F7FF',SUB='rgba(220,228,251,.68)',FAINT='rgba(220,228,251,.5)',AMB=['rgba(255,190,46,.18)','#FFD27A'],GRN=['rgba(47,191,134,.2)','#86E3BC'],BLU=['rgba(156,196,255,.18)','#C3D8FF'];
const TF='700 17px '+FA+'',SF='500 12.5px '+FW+'',BF='600 12px '+FW+'';
// one colour per suite product, matching the foreground cards
const PROD={dir:['Directory','47,191,134'],rec:['Recruitment','255,190,46'],ask:['Ask Navya','156,196,255'],gro:['Growth OS','200,212,248'],ads:['Promoted','245,137,42']};
const B0=44; // body starts below the product header
const rfq=(item,meta,n,ago)=>({type:'rfq',p:'dir',meta:ago,w:262,h:152,to:['quote','match'],d:(g,w)=>{
  pill(g,16,B0,'RFQ',...AMB);txt(g,item,16,B0+42,TF,WH);txt(g,meta,16,B0+63,SF,SUB);
  ['S','K','P'].slice(0,n).forEach((l,k)=>{g.strokeStyle='#1C3789';g.lineWidth=2;g.beginPath();g.arc(26+k*15,B0+92,10,0,TAU);g.stroke();avatar(g,26+k*15,B0+92,9.5,l,['#FFBE2E','#DCE4FB','#2FBF86'][k])});
  txt(g,n+' quotes received',26+n*15+4,B0+92,BF,WH)}});
const quote=(co,price,unit,meta,l)=>({type:'quote',p:'dir',meta:'Quote',w:246,h:138,d:(g,w)=>{
  avatar(g,30,B0+14,14,l,'#DCE4FB');txt(g,co,52,B0+8,'600 13px '+FW+'',WH);g.fillStyle='#2FBF86';g.beginPath();g.arc(56,B0+25,3.5,0,TAU);g.fill();txt(g,'Verified supplier',64,B0+25,'500 11px '+FW+'','#86E3BC');
  txt(g,price,16,B0+58,'800 27px '+FA+'',WH);g.font='800 27px '+FA+'';txt(g,unit,22+g.measureText(price).width,B0+61,SF,SUB);txt(g,meta,16,B0+84,SF,SUB)}});
const ask=(q,a,b)=>({type:'ask',p:'ask',meta:'Just now',w:262,h:150,to:b,d:(g,w)=>{
  g.font=SF;const qw=Math.min(w-60,g.measureText(q).width+24);bubble(g,w-16-qw,B0,qw,30,'rgba(220,228,251,.92)');txt(g,q,w-16-qw+12,B0+15.5,'500 12.5px '+FW+'','#12307E');
  rr(g,16,B0+44,26,26,8);g.fillStyle='#12307E';g.fill();g.strokeStyle='rgba(156,196,255,.6)';g.lineWidth=1;g.stroke();
  g.strokeStyle='#C3D8FF';g.lineWidth=1.4;g.beginPath();g.moveTo(23,B0+60);g.lineTo(26,B0+51);g.lineTo(29,B0+60);g.moveTo(31,B0+51);g.lineTo(35,B0+60);g.stroke();
  bubble(g,50,B0+40,w-66,52,'rgba(156,196,255,.14)');txt(g,a[0],62,B0+56,BF,WH);txt(g,a[1],62,B0+75,'500 11.5px '+FW+'',SUB)}});
const DEALS=[
  rfq('2,000 corrugated boxes','Pune · needed in 7 days',3,'2 min ago'),
  ask('Packaging suppliers in Pune?',['3 verified matches','2 can deliver this week'],['match','supplier']),
  {type:'job',p:'rec',meta:'Posted today',w:248,h:142,to:['candidate'],d:(g,w)=>{txt(g,'Sales executive',16,B0+12,TF,WH);txt(g,'Indore · ₹3 to 4 LPA · Full time',16,B0+33,SF,SUB);
    const v=[.3,.5,.4,.7,.9,.6,.8];v.forEach((y,k)=>{rr(g,16+k*12,B0+80-y*26,8,y*26,2);g.fillStyle=k===4?'#FFBE2E':'rgba(255,190,46,.35)';g.fill()});txt(g,'12 applicants',112,B0+70,BF,WH);txt(g,'4 shortlisted',112,B0+88,'500 11.5px '+FW+'',SUB)}},
  quote('Shree Packaging','₹38','/ unit','Delivery 5 days · MOQ 1,000','S'),
  {type:'growth',p:'gro',meta:'Preview',w:240,h:140,d:(g,w)=>{txt(g,'Enquiries · Packaging',16,B0+6,BF,SUB);txt(g,'+18%',16,B0+34,'800 26px '+FA+'','#86E3BC');g.font='800 26px '+FA+'';txt(g,'this week',24+g.measureText('+18%').width,B0+37,SF,SUB);
    const v=[.3,.35,.32,.45,.42,.55,.5,.66,.62,.8,.92];g.beginPath();v.forEach((y,k)=>{const x=16+k*(w-32)/10,yy=B0+86-y*32;k?g.lineTo(x,yy):g.moveTo(x,yy)});g.strokeStyle='#2FBF86';g.lineWidth=2;g.stroke();g.lineTo(w-16,B0+86);g.lineTo(16,B0+86);g.fillStyle='rgba(47,191,134,.12)';g.fill()}},
  {type:'candidate',p:'rec',meta:'Applied 1h ago',w:248,h:126,to:['interview'],d:(g,w)=>{avatar(g,34,B0+18,17,'A','#FFBE2E');txt(g,'Arjun Mehta',60,B0+10,'600 14px '+FW+'',WH);txt(g,'CNC machinist · 6 yrs · Rajkot',60,B0+29,'500 12px '+FW+'',SUB);
    const a=pill(g,16,B0+50,'Résumé',...BLU);pill(g,22+a,B0+50,'Shortlisted',...AMB)}},
  {type:'supplier',p:'dir',meta:'Verified',w:252,h:138,d:(g,w)=>{txt(g,'Kaveri Spices',16,B0+8,TF,WH);txt(g,'Unjha, Gujarat · 14 yrs',16,B0+29,SF,SUB);
    for(let k=0;k<5;k++)star(g,22+k*17,B0+54,6.5,k<4?'#FFBE2E':'rgba(255,190,46,.45)');txt(g,'4.8 · 212 reviews',112,B0+55,BF,WH);const a=pill(g,16,B0+70,'GST verified',...GRN);pill(g,22+a,B0+70,'Exporter',...BLU)}},
  {type:'promo',p:'ads',meta:'Featured',w:248,h:136,to:['rfq'],d:(g,w)=>{txt(g,'Brass fittings · Jamnagar',16,B0+8,'600 13px '+FW+'',WH);
    txt(g,'2,400',16,B0+40,'800 26px '+FA+'',WH);g.font='800 26px '+FA+'';txt(g,'buyers reached',24+g.measureText('2,400').width,B0+43,SF,SUB);rr(g,16,B0+64,w-32,6,3);g.fillStyle='rgba(220,228,251,.14)';g.fill();rr(g,16,B0+64,(w-32)*.68,6,3);g.fillStyle='#F5892A';g.fill();txt(g,'38 enquiries this week',16,B0+84,'500 11.5px '+FW+'',SUB)}},
  {type:'interview',p:'rec',meta:'Upcoming',w:248,h:124,d:(g,w)=>{rr(g,16,B0,48,52,10);g.fillStyle='rgba(255,190,46,.16)';g.fill();rr(g,16,B0,48,16,[10,10,0,0]);g.fillStyle='#FFBE2E';g.fill();
    txt(g,'THU',40,B0+8.5,'700 10px '+FW+'','#12307E','center');txt(g,'16',40,B0+34,'800 20px '+FA+'',WH,'center');
    txt(g,'Interview scheduled',76,B0+10,'600 13px '+FW+'',WH);txt(g,'Priya Nair · QA lead',76,B0+29,'500 12px '+FW+'',SUB);txt(g,'11:00 AM · video call',76,B0+46,'500 11.5px '+FW+'',FAINT)}},
  {type:'match',p:'dir',meta:'Matched',w:252,h:142,d:(g,w)=>{txt(g,'3 suppliers matched',16,B0+8,'600 14px '+FW+'',WH);
    [['Surat','2.1 km'],['Vapi','118 km'],['Ahmedabad','264 km']].forEach(([c,d],k)=>{const y=B0+36+k*24;g.fillStyle='#2FBF86';g.beginPath();g.arc(21,y,3.5,0,TAU);g.fill();txt(g,c,32,y,SF,WH);txt(g,d,w-16,y,SF,SUB,'right')})}},
  ask('Who is hiring machinists in Rajkot?',['6 employers hiring now','2 posted today'],['job']),
  {type:'demand',p:'gro',meta:'Preview',w:240,h:138,d:(g,w)=>{txt(g,'Demand by region',16,B0+6,BF,SUB);const L=['N','W','C','S','E'],v=[.55,.92,.4,.7,.5];
    v.forEach((y,k)=>{const x=20+k*42,hh=y*52;rr(g,x,B0+76-hh,24,hh,4);g.fillStyle=k===1?'#FFBE2E':'rgba(200,212,248,.35)';g.fill();txt(g,L[k],x+12,B0+86,'600 10.5px '+FW+'',SUB,'center')});
    txt(g,'West +12%',w-16,B0+6,BF,'#FFD27A','right')}},
  rfq('LED panel lights','Delhi · 300 units',2,'8 min ago'),
  quote('Lumina Electricals','₹410','/ unit','BIS certified · 7 days','L'),
];
const Deal={
  init(){const m=this.m=W<700,R=this.R=mulberry(51);
    const S=Math.min(2,DPR)*1.25;this.imgs=DEALS.map(def=>{const pad=26,c=document.createElement('canvas');c.width=Math.ceil((def.w+pad*2)*S);c.height=Math.ceil((def.h+pad*2)*S);const g=c.getContext('2d');g.scale(S,S);g.translate(pad,pad);
      const [pn,pc]=PROD[def.p],w=def.w,h=def.h;
      g.shadowColor='rgba(2,8,30,.55)';g.shadowBlur=24;g.shadowOffsetY=12;rr(g,0,0,w,h,16);const bgG=g.createLinearGradient(0,0,0,h);bgG.addColorStop(0,'#213E95');bgG.addColorStop(1,'#19347F');g.fillStyle=bgG;g.fill();g.shadowColor='transparent';
      g.save();rr(g,0,0,w,h,16);g.clip();const glow=g.createRadialGradient(w*.15,0,0,w*.15,0,w*.8);glow.addColorStop(0,`rgba(${pc},.16)`);glow.addColorStop(1,`rgba(${pc},0)`);g.fillStyle=glow;g.fillRect(0,0,w,h);
      const ac=g.createLinearGradient(0,0,w*.7,0);ac.addColorStop(0,`rgba(${pc},.95)`);ac.addColorStop(1,`rgba(${pc},0)`);g.fillStyle=ac;g.fillRect(0,0,w,2.5);g.restore();
      g.strokeStyle='rgba(220,228,251,.2)';g.lineWidth=1;rr(g,.5,.5,w-1,h-1,16);g.stroke();
      g.fillStyle=`rgb(${pc})`;g.beginPath();g.arc(20,22,3.5,0,TAU);g.fill();
      if('letterSpacing' in g)g.letterSpacing='1.3px';txt(g,pn.toUpperCase(),30,22.5,'700 10px '+FW+'',`rgba(${pc},.95)`);if('letterSpacing' in g)g.letterSpacing='0px';
      if(def.meta)txt(g,def.meta,w-16,22.5,'500 11px '+FW+'',FAINT,'right');
      def.d(g,w,h);
      const b=document.createElement('canvas');b.width=c.width;b.height=c.height;const bg=b.getContext('2d');bg.filter='blur(5px)';bg.drawImage(c,0,0);
      return{c,b,w,h,pad,S,type:def.type,to:def.to||[],col:pc}});
    const n=m?7:15;this.cards=[];
    for(let k=0;k<n;k++){const c={img:this.imgs[k%this.imgs.length],z:.62+((k*.618)%1)*1.0,x:R()*(W+400)-200,ph:R()*TAU,seed:R()*3,flash:-9,fc:AMBER,pu:0};c.y=this.ry(c);this.cards.push(c)}
    this.cards.sort((a,b)=>b.z-a.z);
    this.o={cx:W/2,cy:H*.55,s:m?W/14:W/30,tilt:.35,yaw:0,f:30}},
  // pick a height in the visible band that overlaps the fewest cards nearby
  ry(c){const R=this.R,top=Math.max(60,FG.cardsBox.y-40);let best=0,bo=1e9;
    for(let k=0;k<8;k++){const y=R()<.88?8+R()*(top-8):R()*H;let o=0;
      if(c)for(const d of this.cards){if(d===c)continue;const sc=(this.m?.5:.74)/d.z;if(Math.abs(d.x-c.x)<d.img.w*sc*1.2)o+=Math.max(0,d.img.h*sc-Math.abs(d.y-y))}
      if(o<bo){bo=o;best=y}}return best},
  geo(c,t){const sc=(this.m?.5:.74)/c.z,w=c.img.w*sc,h=c.img.h*sc;return{x:c.x,y:c.y+Math.sin(t*.5+c.ph)*7,w,h,sc}},
  draw(dt,t){const m=this.m;
    ctx.fillStyle='#0F2A70';ctx.fillRect(0,0,W,H);
    for(let q=0;q<2;q++){const x=W*(.25+.5*q)+Math.sin(t*.06+q*2)*W*.12,y=H*(.35+.25*q),r=Math.max(W,H)*.5,gr=ctx.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(44,88,190,.45)');gr.addColorStop(1,'rgba(44,88,190,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,W,H)}
    ctx.fillStyle='rgba(220,228,251,.16)';ctx.beginPath();for(let i=-20;i<=20;i++)for(let j=0;j<24;j++){const Z=mod(j-t*.25,24)-14,p=persp(this.o,i,Z,-6);if(!onScreen(p[0],p[1]))continue;const s=1.6*p[2];ctx.rect(p[0]-s/2,p[1]-s/2,s,s)}ctx.fill();
    for(const c of this.cards){c.x+=24/c.z*dt;const g=this.geo(c,t);if(g.x>W+20){c.x=-g.w-40-this.R()*240;c.y=this.ry(c)}}
    const geos=new Map(this.cards.map(c=>[c,this.geo(c,t)])),vis=c=>{const g=geos.get(c);return c.z<=1.3&&onScreen(g.x+g.w/2,g.y+g.h/2)};
    // each card hands off to the nearest next step on screen: question to match, RFQ to quote, job to candidate, candidate to interview
    const links=[];for(const c of this.cards){if(!c.img.to.length||!vis(c))continue;const a=geos.get(c);let best=null,bd=m?340:600;
      for(const d of this.cards){if(d===c||!c.img.to.includes(d.img.type)||!vis(d))continue;const b=geos.get(d),dd=Math.hypot(b.x-a.x,b.y-a.y);if(dd<bd){bd=dd;best=d}}
      if(best)links.push([c,best])}
    for(const [c,d] of links){const a=geos.get(c),b=geos.get(d),col=c.img.col;let p0=[a.x+a.w,a.y+a.h/2],p1=[b.x,b.y+b.h/2];if(b.x+b.w/2<a.x+a.w/2){p0=[a.x,a.y+a.h/2];p1=[b.x+b.w,b.y+b.h/2]}
      const mx=(p0[0]+p1[0])/2,bz=u=>[(1-u)**3*p0[0]+3*(1-u)**2*u*mx+3*(1-u)*u*u*mx+u**3*p1[0],(1-u)**3*p0[1]+3*(1-u)**2*u*p0[1]+3*(1-u)*u*u*p1[1]+u**3*p1[1]];
      const lg=ctx.createLinearGradient(p0[0],p0[1],p1[0],p1[1]);lg.addColorStop(0,`rgba(${col},.45)`);lg.addColorStop(1,`rgba(${col},.12)`);
      ctx.strokeStyle=lg;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.bezierCurveTo(mx,p0[1],mx,p1[1],p1[0],p1[1]);ctx.stroke();
      for(const p of [p0,p1]){ctx.fillStyle=`rgba(${col},.8)`;ctx.beginPath();ctx.arc(p[0],p[1],2.5,0,TAU);ctx.fill()}
      const u=((t+c.seed)%2.8)/2.8;if(u<c.pu){d.flash=t;d.fc=col}c.pu=u;const hd=bz(easeIO(u));glowDot(hd[0],hd[1],13,col)}
    for(const c of this.cards){const g=geos.get(c),im=c.img;if(g.x>W||g.x+g.w<0)continue;
      let a=clamp(1.32-c.z*.6,.3,.95);const r=FG.h1;if(g.x<r.x+r.w+20&&g.x+g.w>r.x-20&&g.y<r.y+r.h+20&&g.y+g.h>r.y-20)a*=.1;
      ctx.globalAlpha=a;const pd=im.pad*g.sc;ctx.drawImage(c.z>1.15?im.b:im.c,g.x-pd,g.y-pd,g.w+2*pd,g.h+2*pd);
      const fa=1-(t-c.flash)/1.4;if(fa>0){ctx.globalAlpha=a*fa;ctx.strokeStyle=`rgb(${c.fc})`;ctx.lineWidth=2;rr(ctx,g.x-1,g.y-1,g.w+2,g.h+2,16*g.sc);ctx.stroke();
        ctx.globalAlpha=a*fa*.5;ctx.lineWidth=1;rr(ctx,g.x-6*(1-fa)-1,g.y-6*(1-fa)-1,g.w+12*(1-fa)+2,g.h+12*(1-fa)+2,18*g.sc);ctx.stroke()}
      ctx.globalAlpha=1}
  }
};

const cardEls=()=>[...cardsEl.children];
function measure(){const hr=hero.getBoundingClientRect(),rel=r=>({x:r.left-hr.left,y:r.top-hr.top,w:r.width,h:r.height});
  FG.h1=rel(h1.getBoundingClientRect());FG.cardsBox=rel(cardsEl.getBoundingClientRect());FG.cards=cardEls().map(c=>rel(c.getBoundingClientRect()))}
function resize(){const r=hero.getBoundingClientRect();if(!r.width||!r.height)return;W=r.width;H=r.height;DPR=Math.min(window.devicePixelRatio||1,2);
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);measure();Deal.init();Deal.draw(0,T)}
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function loop(now){raf=requestAnimationFrame(loop);const dt=Math.min(.05,last?(now-last)/1000:0);last=now;
  if(!running||document.hidden||!W)return;T+=dt;if(now-lastMeasure>500){measure();lastMeasure=now}Deal.draw(dt,T)}
let rt;const ro=new ResizeObserver(()=>{clearTimeout(rt);rt=setTimeout(resize,W?120:0)});ro.observe(hero);
const io=new IntersectionObserver(([e])=>{running=e.isIntersecting&&!reduced;last=0},{threshold:0});io.observe(hero);
if(document.fonts)document.fonts.ready.then(()=>{if(W){Deal.init();Deal.draw(0,T)}});
if(reduced){T=4}
raf=requestAnimationFrame(loop);
return ()=>{cancelAnimationFrame(raf);ro.disconnect();io.disconnect();clearTimeout(rt)};
}
