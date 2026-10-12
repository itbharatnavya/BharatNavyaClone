/* eslint-disable */
// @ts-nocheck
// Home hero background: "Trade Grid" (option 1 of frontend/docs/hero-living-scenes.html, picked by
// the owner on 12 Oct 2026). A live, perspective-tilted dot map of India: dots brighten where
// business is dense, freight moves along the national corridors, amber spikes are RFQs being
// posted with supplier quotes arcing in from other cities, green spikes are companies hiring.
// Ported from the board as-is (drawing code unchanged); only the host wiring differs: it draws
// into a canvas inside the hero, keeps clear of the headline and the product cards it is given,
// pauses off screen / in a background tab, and shows one still frame under reduced motion.
// Used by components/home/TradeGridBg.tsx.

export function startTradeGrid(cv, hero, h1, cardsEl) {
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
const CITY=[["Delhi",28.61,77.21,1],["Mumbai",19.08,72.88,1],["Bengaluru",12.97,77.59,1],["Chennai",13.08,80.27,1],["Kolkata",22.57,88.36,1],["Hyderabad",17.39,78.49,1],["Pune",18.52,73.86,1],["Ahmedabad",23.02,72.57,1],
["Surat",21.17,72.83,2],["Jaipur",26.91,75.79,2],["Lucknow",26.85,80.95,2],["Kanpur",26.45,80.33,2],["Nagpur",21.15,79.09,2],["Indore",22.72,75.86,2],["Bhopal",23.26,77.41,2],["Patna",25.59,85.14,2],["Ludhiana",30.90,75.85,2],["Coimbatore",11.02,76.96,2],["Kochi",9.93,76.27,2],["Visakhapatnam",17.69,83.22,2],["Rajkot",22.30,70.80,2],["Vadodara",22.31,73.18,2],["Guwahati",26.14,91.74,2],["Bhubaneswar",20.30,85.82,2],
["Moradabad",28.84,78.77,3],["Morbi",22.82,70.84,3],["Tiruppur",11.11,77.34,3],["Panipat",29.39,76.97,3],["Agra",27.18,78.01,3],["Varanasi",25.32,82.97,3],["Raipur",21.25,81.63,3],["Ranchi",23.34,85.31,3],["Dehradun",30.32,78.03,3],["Chandigarh",30.73,76.78,3],["Amritsar",31.63,74.87,3],["Srinagar",34.08,74.80,3],["Jammu",32.73,74.86,3],["Leh",34.15,77.58,3],["Kargil",34.55,76.13,3],["Jodhpur",26.24,73.02,3],["Udaipur",24.58,73.71,3],["Bikaner",28.02,73.31,3],["Jaisalmer",26.91,70.92,3],["Barmer",25.75,71.39,3],["Kota",25.21,75.86,3],["Ajmer",26.45,74.64,3],["Alwar",27.55,76.60,3],["Hisar",29.15,75.72,3],["Jalandhar",31.33,75.58,3],["Shimla",31.10,77.17,3],["Manali",32.24,77.19,3],["Haldwani",29.22,79.51,3],["Meerut",28.98,77.71,3],["Bareilly",28.37,79.43,3],["Gorakhpur",26.76,83.37,3],["Prayagraj",25.44,81.85,3],["Jhansi",25.45,78.57,3],["Gwalior",26.22,78.18,3],["Jabalpur",23.18,79.99,3],["Sagar",23.84,78.74,3],["Ujjain",23.18,75.78,3],["Rewa",24.53,81.30,3],["Bilaspur",22.08,82.15,3],["Jagdalpur",19.07,82.03,3],["Muzaffarpur",26.12,85.39,3],["Bhagalpur",25.24,86.98,3],["Gaya",24.80,85.00,3],["Dhanbad",23.80,86.43,3],["Jamshedpur",22.80,86.20,3],["Durgapur",23.52,87.31,3],["Siliguri",26.73,88.40,3],["Malda",25.00,88.14,3],["Shillong",25.58,91.89,3],["Silchar",24.83,92.80,3],["Imphal",24.82,93.94,3],["Kohima",25.67,94.11,3],["Aizawl",23.73,92.72,3],["Agartala",23.83,91.29,3],["Itanagar",27.08,93.60,3],["Dibrugarh",27.47,94.91,3],["Tezpur",26.63,92.80,3],["Rourkela",22.26,84.85,3],["Sambalpur",21.47,83.97,3],["Cuttack",20.46,85.88,3],["Berhampur",19.31,84.79,3],["Bhavnagar",21.76,72.15,3],["Jamnagar",22.47,70.06,3],["Bhuj",23.25,69.67,3],["Porbandar",21.64,69.60,3],["Junagadh",21.52,70.46,3],["Nashik",20.00,73.79,3],["Aurangabad",19.88,75.34,3],["Amravati",20.93,77.75,3],["Nanded",19.15,77.31,3],["Solapur",17.66,75.91,3],["Kolhapur",16.70,74.24,3],["Panaji",15.49,73.83,3],["Belagavi",15.85,74.50,3],["Hubballi",15.36,75.12,3],["Ballari",15.14,76.92,3],["Kurnool",15.83,78.04,3],["Anantapur",14.68,77.60,3],["Warangal",17.97,79.59,3],["Vijayawada",16.51,80.65,3],["Nellore",14.44,79.99,3],["Tirupati",13.63,79.42,3],["Shivamogga",13.93,75.57,3],["Mangaluru",12.91,74.86,3],["Mysuru",12.30,76.64,3],["Kozhikode",11.26,75.78,3],["Salem",11.66,78.15,3],["Tiruchirappalli",10.80,78.69,3],["Madurai",9.93,78.12,3],["Tirunelveli",8.71,77.76,3],["Thiruvananthapuram",8.52,76.94,3],["Kanyakumari",8.08,77.55,3],["Puducherry",11.94,79.81,3]];
// India's outline: the same simplified Natural Earth boundary (India's worldview, 1:10m) as the home page's "Built for all of India" card, in lon/lat
const INDIA=[[78.925,33.418],[79.471,33.297],[79.341,33.03],[79.627,32.763],[79.445,32.568],[79.315,32.641],[78.951,32.374],[78.743,32.665],[78.405,32.593],[78.457,32.277],[78.743,32.01],[78.743,31.33],[78.925,31.305],[79.133,31.475],[79.419,31.063],[79.861,30.99],[80.225,30.771],[80.173,30.577],[81.004,30.237],[80.38,29.776],[80.225,29.436],[80.251,29.217],[80.043,28.853],[80.329,28.659],[80.484,28.586],[80.562,28.707],[81.16,28.391],[81.29,28.149],[81.862,27.881],[82.018,27.93],[82.408,27.687],[82.667,27.712],[82.745,27.517],[83.265,27.347],[83.369,27.493],[83.837,27.372],[83.811,27.444],[84.097,27.542],[84.59,27.323],[84.616,27.056],[85.266,26.74],[85.578,26.862],[85.812,26.57],[86.254,26.619],[86.695,26.424],[87.007,26.594],[87.085,26.424],[87.267,26.352],[87.839,26.473],[87.969,26.376],[88.151,26.764],[87.943,27.129],[88.125,27.784],[88.073,27.954],[88.567,28.124],[88.826,27.881],[88.722,27.542],[88.852,27.323],[88.696,27.177],[89.06,26.837],[89.788,26.716],[90.308,26.91],[90.672,26.789],[91.243,26.789],[91.373,26.886],[91.841,26.813],[92.023,26.91],[91.945,27.129],[92.049,27.299],[91.945,27.493],[91.555,27.542],[91.529,27.881],[91.919,27.736],[92.205,27.881],[92.257,27.809],[92.517,27.857],[92.699,28.003],[92.621,28.149],[93.166,28.367],[93.27,28.634],[93.868,28.707],[93.946,28.877],[94.284,29.047],[94.232,29.169],[94.544,29.339],[94.726,29.193],[95.323,29.071],[95.739,29.387],[96.285,29.29],[96.103,29.144],[96.129,28.974],[96.389,29.023],[96.545,28.731],[96.233,28.44],[97.064,28.391],[97.272,28.246],[97.298,28.003],[96.805,27.614],[97.064,27.104],[96.649,27.372],[96.077,27.274],[95.349,26.716],[95.063,26.619],[94.985,26.303],[95.089,26.06],[94.933,25.939],[94.959,25.745],[94.544,25.405],[94.492,25.21],[94.648,25.04],[94.076,23.85],[93.27,24.069],[93.374,23.68],[93.322,23.122],[93.088,23.025],[93.036,22.685],[93.114,22.248],[92.829,21.956],[92.647,22.151],[92.543,21.981],[92.205,23.705],[91.971,23.632],[91.867,23.729],[91.893,23.486],[91.711,23.268],[91.763,23.098],[91.555,22.952],[91.347,23.268],[91.269,23.098],[91.087,23.632],[91.321,24.093],[91.529,24.093],[91.685,24.239],[91.841,24.166],[91.867,24.336],[92.075,24.409],[92.179,24.895],[92.335,24.846],[92.439,24.943],[91.997,25.186],[90.334,25.162],[89.788,25.283],[89.788,25.987],[89.606,26.23],[89.502,25.963],[89.294,26.012],[89.086,26.157],[89.008,26.4],[88.852,26.4],[88.982,26.254],[88.645,26.279],[88.619,26.424],[88.333,26.619],[88.281,26.473],[88.463,26.376],[88.125,26.157],[88.047,25.842],[88.956,25.283],[88.904,25.186],[88.411,25.21],[88.307,24.87],[88.099,24.919],[87.995,24.652],[88.437,24.312],[88.696,24.288],[88.696,23.923],[88.515,23.656],[88.748,23.486],[88.67,23.243],[88.93,23.195],[88.8,22.976],[89.034,22.151],[89.034,21.932],[88.878,21.956],[89.06,21.616],[88.826,21.762],[88.826,21.641],[88.67,21.568],[88.722,22.126],[88.593,21.932],[88.619,22.199],[88.541,21.543],[88.463,21.543],[88.463,21.956],[88.437,21.616],[88.307,21.713],[88.281,21.616],[88.229,21.786],[88.229,21.543],[88.177,22.175],[87.891,22.418],[88.125,22.078],[87.813,21.713],[87.189,21.543],[86.903,21.325],[86.825,21.082],[86.929,20.791],[86.851,20.766],[87.007,20.694],[86.721,20.475],[86.721,20.305],[86.462,20.184],[86.41,19.989],[86.124,20.135],[86.358,19.965],[86.254,19.892],[85.474,19.649],[85.552,19.868],[85.24,19.771],[85.11,19.455],[85.24,19.649],[85.37,19.674],[85.318,19.552],[85.552,19.674],[84.72,19.139],[84.097,18.289],[83.447,17.901],[83.239,17.561],[82.356,17.075],[82.252,16.905],[82.356,16.881],[82.304,16.565],[81.758,16.298],[81.264,16.298],[81.004,15.74],[80.9,16.007],[80.796,15.691],[80.666,15.885],[80.277,15.667],[80.069,15.06],[80.199,14.525],[80.043,14.161],[80.147,14.186],[80.329,13.408],[80.147,13.7],[80.069,13.578],[80.329,13.384],[80.329,13.166],[80.173,12.486],[79.783,11.733],[79.835,11.344],[79.679,11.247],[79.835,11.296],[79.861,10.252],[79.289,10.203],[79.289,9.984],[78.925,9.426],[79.081,9.256],[79.341,9.256],[79.471,9.11],[79.003,9.232],[78.431,9.037],[78.198,8.819],[78.068,8.309],[77.522,8.017],[77.002,8.309],[76.56,8.867],[76.69,8.94],[76.534,8.892],[76.378,9.28],[76.248,9.912],[76.352,9.644],[76.378,9.766],[76.378,9.474],[76.508,9.474],[76.196,10.057],[76.248,10.179],[76.17,10.179],[75.755,11.32],[75.339,11.854],[75.417,11.927],[75.209,11.976],[74.845,12.777],[74.975,12.85],[74.845,12.826],[74.767,13.627],[74.507,13.991],[74.455,14.453],[74.117,14.768],[74.273,14.841],[74.143,14.817],[73.936,15.06],[73.806,15.375],[73.988,15.351],[73.754,15.545],[73.858,15.643],[73.754,15.594],[73.468,16.031],[73.234,17.561],[72.948,18.217],[73.078,18.168],[73.104,18.265],[72.948,18.338],[72.948,18.508],[73.052,18.459],[72.896,18.654],[72.948,18.799],[73.026,18.702],[72.922,18.872],[73.078,18.994],[73.0,19.139],[72.792,18.921],[72.818,19.309],[73.078,19.212],[72.792,19.358],[72.922,19.528],[72.766,19.528],[72.688,19.844],[72.974,20.742],[72.844,21.131],[72.636,21.106],[72.766,21.203],[72.584,21.373],[73.156,21.762],[72.584,21.665],[72.766,21.981],[72.532,21.981],[72.61,22.199],[72.948,22.272],[72.506,22.223],[72.428,22.369],[72.35,22.248],[72.194,22.272],[72.35,22.223],[72.35,22.078],[72.142,22.005],[72.064,21.932],[72.194,21.835],[72.09,21.883],[72.038,21.786],[72.194,21.786],[72.324,21.616],[72.142,21.203],[71.181,20.766],[70.791,20.718],[70.089,21.155],[68.998,22.296],[69.128,22.491],[69.258,22.272],[69.57,22.442],[69.648,22.345],[69.778,22.466],[70.219,22.563],[70.531,23.098],[70.427,22.952],[70.167,23.0],[69.622,22.758],[68.92,23.025],[68.478,23.438],[68.452,23.632],[68.868,23.875],[68.374,23.583],[68.192,23.608],[68.322,23.68],[68.218,23.753],[68.322,23.948],[68.764,23.972],[68.79,24.336],[68.894,24.239],[68.946,24.336],[70.011,24.166],[70.453,24.409],[70.609,24.433],[70.609,24.288],[70.791,24.239],[71.129,24.409],[70.999,24.579],[71.103,24.7],[70.687,25.405],[70.687,25.696],[70.297,25.72],[70.115,25.987],[70.193,26.546],[69.544,26.74],[69.57,27.153],[70.375,28.027],[70.583,28.027],[70.869,27.712],[71.909,27.979],[72.376,28.78],[72.948,29.071],[73.39,29.946],[73.962,30.213],[73.884,30.407],[74.351,30.917],[74.689,31.111],[74.533,31.208],[74.637,31.5],[74.585,31.864],[75.391,32.301],[75.053,32.495],[74.715,32.52],[74.689,32.884],[74.377,32.811],[73.65,33.175],[73.468,34.559],[74.04,34.924],[74.143,35.142],[73.754,35.264],[73.806,35.579],[73.338,35.652],[73.13,35.919],[72.558,35.944],[72.61,36.308],[73.026,36.526],[73.104,36.745],[73.91,36.769],[73.728,36.939],[74.066,36.866],[74.689,37.109],[74.897,36.964],[75.131,37.061],[75.365,36.964],[75.443,36.769],[75.755,36.769],[75.989,36.502],[76.742,36.211],[76.846,35.919],[77.47,35.701],[77.522,35.531],[78.12,35.579],[78.665,35.895],[79.133,35.895],[79.289,36.017],[79.731,35.847],[80.017,35.895],[80.329,35.531],[80.043,34.729],[79.861,34.705],[79.705,34.462],[79.523,34.462],[79.549,34.244],[79.419,34.074],[78.899,34.025],[79.029,33.685],[78.899,33.661]];
const inPoly=(x,y,P)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,yi]=P[i],[xj,yj]=P[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c};
const LON0=82.5,LAT0=20,KX=.93;
const ROUTES=[["Delhi","Jaipur","Ajmer","Udaipur","Ahmedabad","Vadodara","Surat","Mumbai","Pune","Kolhapur","Belagavi","Hubballi","Bengaluru","Chennai","Nellore","Vijayawada","Visakhapatnam","Berhampur","Bhubaneswar","Cuttack","Kolkata","Dhanbad","Gaya","Varanasi","Prayagraj","Kanpur","Agra","Delhi"],
["Srinagar","Jammu","Jalandhar","Ludhiana","Panipat","Delhi","Agra","Gwalior","Jhansi","Sagar","Nagpur","Hyderabad","Kurnool","Anantapur","Bengaluru","Salem","Madurai","Tirunelveli","Kanyakumari"],
["Porbandar","Rajkot","Ahmedabad","Udaipur","Kota","Gwalior","Jhansi","Kanpur","Lucknow","Gorakhpur","Muzaffarpur","Siliguri","Guwahati","Silchar"],
["Mumbai","Nashik","Aurangabad","Amravati","Nagpur","Raipur","Sambalpur","Cuttack"]];
const ITEMS=['2,000 corrugated boxes','500 kg turmeric','CNC turned parts','Cotton yarn 40s','LED panel lights','PP woven sacks','Brass fittings','Vitrified tiles 600x600','TMT steel bars','Organic jaggery','Printed labels','Denim fabric'];
const ROLES=['CNC machinist','Sales executive','Quality inspector','Warehouse lead','Accounts executive','Textile designer'];

const Grid={
  init(){const m=this.m=W<700,R=this.R=mulberry(31);
    this.o={cx:W/2,cy:FG.cardsBox.y+(m?14:92),s:m?W/19:W/31,tilt:.66,yaw:0,f:36};
    this.cities=CITY.map(([n,la,lo,t])=>({n,X:(lo-LON0)*KX,Z:la-LAT0,t}));
    this.outline=INDIA.map(([lo,la])=>[(lo-LON0)*KX,la-LAT0]);
    this.byName=Object.fromEntries(this.cities.map(c=>[c.n,c]));
    // an even dot grid clipped to the outline, brightened where business is dense
    const g=m?.42:.3,dots=[];
    for(let r=0,la=7.8;la<=37.3;la+=g*.866,r++)for(let lo=68;lo<=97.5;lo+=g){const l=lo+(r&1?g/2:0);if(!inPoly(l,la,INDIA))continue;const X=(l-LON0)*KX,Z=la-LAT0;let d=0;
      for(const c of this.cities){const dx=X-c.X,dz=Z-c.Z,q=dx*dx+dz*dz;if(q<9)d+=(c.t===1?1.6:c.t===2?1.25:1)*Math.exp(-q/2.6)}
      let e=1e9;for(let i=0,j=INDIA.length-1;i<INDIA.length;j=i++){const [x1,y1]=INDIA[j],[x2,y2]=INDIA[i],dx=x2-x1,dy=y2-y1,u=clamp(((l-x1)*dx+(la-y1)*dy)/(dx*dx+dy*dy),0,1);e=Math.min(e,Math.hypot(l-x1-u*dx,la-y1-u*dy))}
      dots.push({X,Z,d:Math.min(1,d/1.6),p:R(),edge:e<g*1.2})}
    this.dots=dots.sort((a,b)=>a.Z-b.Z);
    this.routes=ROUTES.map(names=>{const pts=names.map(n=>this.byName[n]),cum=[0];for(let k=1;k<pts.length;k++)cum.push(cum[k-1]+Math.hypot(pts[k].X-pts[k-1].X,pts[k].Z-pts[k-1].Z));return{pts,cum,len:cum[cum.length-1]}});
    this.freight=[];this.routes.forEach((r,ri)=>{const n=Math.round(r.len/(m?6:3.2));for(let k=0;k<n;k++)this.freight.push({r:ri,s:R()*r.len,v:(.35+R()*.35)*(R()<.5?1:-1),c:R()<.6?AMBER:LAV})});
    this.events=[];this.next=.4;this.base=this.buildBase();
    const hz=ctx.createLinearGradient(0,0,0,H*.42);hz.addColorStop(0,'rgba(9,26,84,.35)');hz.addColorStop(.2,'rgba(9,26,84,0)');this.haze=hz;
    const vg=ctx.createRadialGradient(W/2,H*.55,Math.min(W,H)*.35,W/2,H*.55,Math.max(W,H)*.8);vg.addColorStop(0,'rgba(8,22,70,0)');vg.addColorStop(1,'rgba(8,22,70,.55)');this.vig=vg},
  P(X,Z,Y){return persp(this.o,X,Z,Y)},
  buildBase(){const c=document.createElement('canvas');c.width=Math.round(W*DPR);c.height=Math.round(H*DPR);const g=c.getContext('2d');g.scale(DPR,DPR);
    g.fillStyle='#0F2A70';g.fillRect(0,0,W,H);
    const gl=g.createRadialGradient(W*.5,H*.62,0,W*.5,H*.62,Math.max(W,H)*.6);gl.addColorStop(0,'rgba(40,82,180,.5)');gl.addColorStop(1,'rgba(40,82,180,0)');g.fillStyle=gl;g.fillRect(0,0,W,H);
    // a hairline of the real outline, just enough to keep the silhouette honest
    g.beginPath();this.outline.forEach(([X,Z],k)=>{const p=this.P(X,Z,0);k?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])});g.closePath();
    g.lineJoin='round';g.strokeStyle='rgba(205,220,255,.16)';g.lineWidth=1;g.stroke();
    g.strokeStyle='rgba(220,228,251,.11)';g.lineWidth=1;g.beginPath();
    for(const r of this.routes||[])r.pts.forEach((c2,k)=>{const p=this.P(c2.X,c2.Z,0);k?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])});g.stroke();
    return c},
  along(r,s){s=mod(s,r.len);let k=1;while(k<r.cum.length-1&&r.cum[k]<s)k++;const a=r.pts[k-1],b=r.pts[k],u=(s-r.cum[k-1])/(r.cum[k]-r.cum[k-1]||1);return[lerp(a.X,b.X,u),lerp(a.Z,b.Z,u)]},
  spawn(t){const R=this.R,vis=this.cities.filter(c=>{const p=this.P(c.X,c.Z,0);return onScreen(p[0],p[1],20)&&!hidden(p[0],p[1],14)&&!hidden(p[0],p[1]-40,6)});
    const pool=vis.length&&R()<.9?vis:this.cities,b=pool[R()*pool.length|0],hire=R()<.3;
    const sup=this.cities.filter(c=>c!==b&&Math.hypot(c.X-b.X,c.Z-b.Z)>2.5&&Math.hypot(c.X-b.X,c.Z-b.Z)<(hire?6:14)).sort(()=>R()-.5).slice(0,2+(R()*3|0));
    if(!sup.length)return;
    const ev={b,sup,t0:t,hire,col:hire?GREEN:AMBER,label:hire?'Hiring · '+ROLES[R()*ROLES.length|0]:'RFQ · '+ITEMS[R()*ITEMS.length|0],chip:null};
    const p=this.P(b.X,b.Z,2.2),lines=[ev.label,b.n+' · 0 quotes received'],[w0,h]=chipSize(lines),w=w0+18;
    if(this.events.filter(e=>e.chip&&t-e.t0<6).length<(this.m?1:2))
    for(const [dx,dy] of [[16,-h/2],[-w-16,-h/2],[16,-h-10]]){const x=p[0]+dx,y=p[1]+dy;
      if(chipFits(x,y,w,h)&&!this.events.some(e=>e.chip&&x<e.chip.x+e.chip.w+10&&x+w+10>e.chip.x&&y<e.chip.y+e.chip.h+10&&y+h+10>e.chip.y)){ev.chip={x,y,w,h};break}}
    this.events.push(ev)},
  draw(dt,t){
    const o=this.o,m=this.m;
    ctx.drawImage(this.base,0,0,W,H);
    // dot field: business density, with a slow survey sweep
    const scan=-14+(t*2.6)%44,B=[[],[],[],[],[],[]];
    for(const d of this.dots){const [x,y,k]=this.P(d.X,d.Z,0);if(x<-4||x>W+4||y<-4||y>H+4)continue;
      const a=.06+(d.edge?.1:0)+.42*d.d+.1*Math.sin(t*1.3+d.p*40)+.4*Math.exp(-((d.Z-scan)**2)/1.1);B[clamp(a*6|0,0,5)].push(x,y,(.7+d.d*1.3)*k*(m?.9:1.15))}
    B.forEach((arr,bi)=>{ctx.fillStyle=`rgba(190,206,245,${(bi+.6)/6*.8})`;ctx.beginPath();for(let q=0;q<arr.length;q+=3){const s=arr[q+2];ctx.rect(arr[q]-s/2,arr[q+1]-s/2,s,s)}ctx.fill()});
    // events warm the dots around the buyer
    for(const e of this.events){const age=t-e.t0,a=bump(age,0,.6,4.6,6.2);if(a<=0)continue;ctx.fillStyle=`rgba(${e.col},${.75*a})`;ctx.beginPath();
      for(const d of this.dots){const q=(d.X-e.b.X)**2+(d.Z-e.b.Z)**2;if(q>2.2)continue;const [x,y,k]=this.P(d.X,d.Z,0),s=(1+d.d*1.4)*k*(1-q/2.2)*1.3;ctx.rect(x-s/2,y-s/2,s,s)}ctx.fill()}
    // corridors and freight
    for(const f of this.freight){const r=this.routes[f.r];f.s+=f.v*dt;const [X,Z]=this.along(r,f.s),p=this.P(X,Z,0);if(!onScreen(p[0],p[1],-6))continue;
      ctx.fillStyle=`rgba(${f.c},.22)`;ctx.beginPath();ctx.arc(p[0],p[1],4.5*p[2],0,TAU);ctx.fill();ctx.fillStyle=`rgba(${f.c},.95)`;ctx.beginPath();ctx.arc(p[0],p[1],1.6*p[2],0,TAU);ctx.fill()}
    // cities
    ctx.font='600 10.5px "Work Sans",sans-serif';if('letterSpacing' in ctx)ctx.letterSpacing='1.2px';ctx.textBaseline='middle';
    for(const c of this.cities){const [x,y,k]=this.P(c.X,c.Z,0);if(!onScreen(x,y,-10))continue;const r=(c.t===1?3.2:c.t===2?2.2:1.4)*k;
      ctx.fillStyle=c.t===1?'rgba(255,214,120,.95)':'rgba(236,241,253,.8)';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
      if(c.t===1){ctx.strokeStyle='rgba(255,214,120,.35)';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y,r*3.2,r*3.2*Math.sin(o.tilt),0,0,TAU);ctx.stroke();
        if(!m&&!hidden(x+10,y,6)){ctx.fillStyle='rgba(220,228,251,.6)';ctx.fillText(c.n.toUpperCase(),x+10,y)}}}
    if('letterSpacing' in ctx)ctx.letterSpacing='0px';
    // events: spike, incoming arcs, confirmation
    this.next-=dt;if(this.next<=0){this.spawn(t);this.next=m?1.6:1.05}
    this.events=this.events.filter(e=>{const age=t-e.t0;if(age>6.6)return false;const b=e.b,fade=1-clamp((age-5.4)/1.2,0,1),hgt=2.2*ease(age/.7);
      const g0=this.P(b.X,b.Z,0),gt=this.P(b.X,b.Z,hgt);
      const sg=ctx.createLinearGradient(g0[0],g0[1],gt[0],gt[1]);sg.addColorStop(0,`rgba(${e.col},${.95*fade})`);sg.addColorStop(1,`rgba(${e.col},0)`);
      ctx.strokeStyle=sg;ctx.lineWidth=3*g0[2];ctx.beginPath();ctx.moveTo(g0[0],g0[1]);ctx.lineTo(gt[0],gt[1]);ctx.stroke();
      const rg=ease(age/1.4);ctx.strokeStyle=`rgba(${e.col},${(1-rg)*.8})`;ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(g0[0],g0[1],(4+rg*40)*g0[2],(4+rg*40)*g0[2]*Math.sin(o.tilt),0,0,TAU);ctx.stroke();
      glowDot(g0[0],g0[1],14*g0[2],e.col,fade);
      let got=0;
      e.sup.forEach((s,k)=>{const st=.7+k*.4,u=(age-st)/1.7;if(u<0)return;if(u>=1){got++;if(u<1.5){const rr2=ease((u-1)*2);ctx.strokeStyle=`rgba(${LAV},${(1-rr2)*.7})`;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(g0[0],g0[1],(6+rr2*18)*g0[2],(6+rr2*18)*g0[2]*Math.sin(o.tilt),0,0,TAU);ctx.stroke()}}
        const lift=Math.hypot(s.X-b.X,s.Z-b.Z)*.32+.6,pt=v=>this.P(lerp(s.X,b.X,v),lerp(s.Z,b.Z,v),Math.sin(Math.PI*v)*lift);
        const uh=easeIO(Math.min(u,1)),u0=clamp(easeIO(u-.35),0,1);if(u0>=1)return;
        const h0=pt(u0),hd=pt(uh),ac=e.hire?GREEN:LAV,gr=ctx.createLinearGradient(h0[0],h0[1],hd[0],hd[1]);gr.addColorStop(0,`rgba(${ac},0)`);gr.addColorStop(1,`rgba(${ac},.85)`);
        ctx.strokeStyle=gr;ctx.lineWidth=1.7;ctx.beginPath();for(let q=0;q<=20;q++){const p=pt(lerp(u0,uh,q/20));q?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])}ctx.stroke();
        if(u<1)glowDot(hd[0],hd[1],12,ac);const sp=this.P(s.X,s.Z,0);if(u<.3){ctx.fillStyle=`rgba(${ac},${1-u/.3})`;ctx.beginPath();ctx.arc(sp[0],sp[1],3*sp[2],0,TAU);ctx.fill()}});
      if(e.chip){const n=e.sup.length,done=got>=n,unit=e.hire?'applicant':'quote',line2=b.n+' · '+got+' '+unit+(got===1?'':'s')+(done?(e.hire?' shortlisted':' in 2 min'):' received');
        const a=bump(age,.5,1,5.2,6.2);const c=e.chip;
        ctx.strokeStyle=`rgba(${LAV},${.35*a})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(gt[0],gt[1]);ctx.lineTo(c.x<gt[0]?c.x+c.w:c.x,c.y+c.h/2);ctx.stroke();
        drawChip(c.x,c.y,c.w,c.h,[e.label,line2],done?GREEN:e.col,a)}
      return true});
    ctx.fillStyle=this.haze;ctx.fillRect(0,0,W,H*.42);ctx.fillStyle=this.vig;ctx.fillRect(0,0,W,H);
  }
};

const cardEls=()=>[...cardsEl.children];
function measure(){const hr=hero.getBoundingClientRect(),rel=r=>({x:r.left-hr.left,y:r.top-hr.top,w:r.width,h:r.height});
  FG.h1=rel(h1.getBoundingClientRect());FG.cardsBox=rel(cardsEl.getBoundingClientRect());FG.cards=cardEls().map(c=>rel(c.getBoundingClientRect()))}
function resize(){const r=hero.getBoundingClientRect();if(!r.width||!r.height)return;W=r.width;H=r.height;DPR=Math.min(window.devicePixelRatio||1,2);
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);measure();Grid.init();Grid.draw(0,T)}
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function loop(now){raf=requestAnimationFrame(loop);const dt=Math.min(.05,last?(now-last)/1000:0);last=now;
  if(!running||document.hidden||!W)return;T+=dt;if(now-lastMeasure>500){measure();lastMeasure=now}Grid.draw(dt,T)}
let rt;const ro=new ResizeObserver(()=>{clearTimeout(rt);rt=setTimeout(resize,W?120:0)});ro.observe(hero);
const io=new IntersectionObserver(([e])=>{running=e.isIntersecting&&!reduced;last=0},{threshold:0});io.observe(hero);
if(document.fonts)document.fonts.ready.then(()=>{if(W){Grid.init();Grid.draw(0,T)}});
if(reduced){T=4}
raf=requestAnimationFrame(loop);
return ()=>{cancelAnimationFrame(raf);ro.disconnect();io.disconnect();clearTimeout(rt)};
}
