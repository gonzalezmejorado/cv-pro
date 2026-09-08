const $=s=>document.querySelector(s);
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const ease=t=>t*t*(3-2*t);

/* Al recargar, el navegador devuelve el scroll donde estaba. Aquí eso deja al
   visitante en mitad de la galaxia, con la carga corriendo por detrás y sin
   haber visto la portada. Se empieza siempre por el principio.

   Hay que decírselo tres veces: `scrollRestoration` desactiva la restauración,
   pero Firefox la aplica igual después de `load`, y volver con el botón de
   atrás sirve la página desde la caché sin recargarla. */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
scrollTo(0, 0);
addEventListener('load', () => scrollTo(0, 0));
addEventListener('pageshow', (e) => { if (e.persisted) scrollTo(0, 0); });

/* ── Idioma ──────────────────────────────────────────────────── */
const raiz=document.documentElement, LLAVE='cv-pro-idioma';
function leerIdioma(){ try{return localStorage.getItem(LLAVE)}catch{return null} }
function guardarIdioma(v){ try{localStorage.setItem(LLAVE,v)}catch{/* modo privado */} }
function aplicarIdioma(lang){ raiz.dataset.lang=lang; raiz.lang=lang }
aplicarIdioma(leerIdioma() || ((navigator.language||'es').toLowerCase().startsWith('en') ? 'en' : 'es'));
$('#idioma')?.addEventListener('click',()=>{
  const nuevo=raiz.dataset.lang==='es' ? 'en' : 'es';
  aplicarIdioma(nuevo);
  guardarIdioma(nuevo);
});
/* Solo el botón de sonido escribe su propio texto por JS -el resto del sitio
   se traduce con pares <span lang="es">/<span lang="en">- así que necesita
   su propio pequeño diccionario. */
const t=(es,en)=>raiz.dataset.lang==='en' ? en : es;

const loader=$('#loader'), pct=$('#loadPct'), bar=$('#loadBar');
let load=0;
const boot=setInterval(()=>{
  load=Math.min(100,load+(load<70?Math.random()*5:Math.random()*1.8));
  pct.textContent=String(Math.round(load)).padStart(2,'0');
  bar.style.width=load+'%';
  if(load>=100){clearInterval(boot);setTimeout(()=>loader.classList.add('is-done'),450)}
},55);

/* ── UI motion ─────────────────────────────────────────────────────────── */
const sections=[...document.querySelectorAll('.section')];
const progress=$('#progress'), hudPct=$('#hudPct'), hudFrame=$('#hudFrame');
let scrollPos=window.scrollY||0, ticking=false, frame=0;

function reveal(){
  const max=document.documentElement.scrollHeight-innerHeight;
  const p=clamp(scrollPos/Math.max(1,max));
  progress.style.width=(p*100)+'%';
  hudPct.textContent=String(Math.round(p*100)).padStart(2,'0');
  hudFrame.textContent=String(frame++).padStart(3,'0');
  sections.forEach((s,i)=>{
    const r=s.getBoundingClientRect();
    const center=innerHeight*.52;
    const d=Math.abs((r.top+r.height*.5)-center)/(innerHeight*1.2);
    const active=clamp(1-d);
    s.style.setProperty('--focus',active.toFixed(3));
    if(r.top<innerHeight*.72&&r.bottom>innerHeight*.22)s.classList.add('is-active');
  });
  ticking=false;
}
addEventListener('scroll',()=>{scrollPos=window.scrollY;if(!ticking){requestAnimationFrame(reveal);ticking=true}},{passive:true});
addEventListener('resize',reveal,{passive:true}); reveal();

const cursor=$('#cursor');
if(cursor){
 let mx=innerWidth/2,my=innerHeight/2,cx=mx,cy=my;
 addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY},{passive:true});
 const tick=()=>{cx+=(mx-cx)*.16;cy+=(my-cy)*.16;cursor.style.left=cx+'px';cursor.style.top=cy+'px';requestAnimationFrame(tick)};tick();
 document.querySelectorAll('a,button,.capability__grid article,.node').forEach(el=>{
   el.addEventListener('mouseenter',()=>cursor.classList.add('is-link'));
   el.addEventListener('mouseleave',()=>cursor.classList.remove('is-link'));
 });
}

/* ── Ambient sound: supplied local tracks ─────────────────────────────── */
const sound=$('#sound');
let audioCtx=null, master=null, bed=null, bedGain=null, buffers={};
const tracks={bed:'sonido/cama.mp3',whoosh:'sonido/barrido.mp3',birth:'sonido/nacimiento.mp3',impact:'sonido/golpe.mp3',click:'sonido/roce.mp3'};
async function initAudio(){
 audioCtx=new (window.AudioContext||window.webkitAudioContext)();
 master=audioCtx.createGain();master.gain.value=0;master.connect(audioCtx.destination);
 const entries=await Promise.all(Object.entries(tracks).map(async([n,url])=>{
   const r=await fetch(url);if(!r.ok)throw Error(url);
   return [n,await audioCtx.decodeAudioData(await r.arrayBuffer())];
 }));
 entries.forEach(([n,b])=>buffers[n]=b);
 bed=audioCtx.createBufferSource();bed.buffer=buffers.bed;bed.loop=true;
 bedGain=audioCtx.createGain();bedGain.gain.value=.26;bed.connect(bedGain).connect(master);bed.start();
}
function play(name,g=.45){
 if(!audioCtx||!buffers[name])return;
 const src=audioCtx.createBufferSource(),gain=audioCtx.createGain();
 src.buffer=buffers[name];gain.gain.value=g;src.connect(gain).connect(master);src.start();
}
function etiquetaSonido(estado){
 const textos={
   apagado:  t('AMBIENTE','AMBIENT'),
   encendido:t('AMBIENTE ON','AMBIENT ON'),
   cargando: t('CARGANDO…','LOADING…'),
   sinaudio: t('SIN AUDIO','NO AUDIO'),
 };
 return estado==='apagado' ? `<span>◉</span> ${textos.apagado}` : textos[estado];
}
async function encenderAudio(){
 if(sound.getAttribute('aria-pressed')==='true')return;
 if(!audioCtx){
   sound.textContent=etiquetaSonido('cargando');sound.disabled=true;
   try{await initAudio();await audioCtx.resume();master.gain.linearRampToValueAtTime(.95,audioCtx.currentTime+1.2);sound.setAttribute('aria-pressed','true');sound.innerHTML=`<span>◉</span> ${etiquetaSonido('encendido')}`}
   catch(e){console.warn(e);sound.textContent=etiquetaSonido('sinaudio')}
   sound.disabled=false;
 }else{
   await audioCtx.resume();master.gain.linearRampToValueAtTime(.95,audioCtx.currentTime+.8);sound.setAttribute('aria-pressed','true');sound.innerHTML=`<span>◉</span> ${etiquetaSonido('encendido')}`;
 }
}
sound.addEventListener('click',async()=>{
 const on=sound.getAttribute('aria-pressed')==='true';
 if(on){master.gain.linearRampToValueAtTime(0,audioCtx.currentTime+.5);sound.setAttribute('aria-pressed','false');sound.innerHTML=etiquetaSonido('apagado')}
 else await encenderAudio();
});
/* Ningún navegador deja iniciar audio sin gesto del usuario. Esto lo arranca
   con el primer clic, tecla o toque en cualquier parte de la página -no
   solo si se aprieta el botón- para que en la práctica se sienta automático. */
['pointerdown','keydown','touchstart'].forEach(ev=>addEventListener(ev,encenderAudio,{once:true,passive:true}));
document.querySelectorAll('a,button').forEach(el=>el.addEventListener('mouseenter',()=>{if(sound.getAttribute('aria-pressed')==='true')play('click',.16)}));

/* ── Three.js galaxy. It is deliberately treated as atmosphere, not decoration:
   the same field reacts to scroll, pointer and the final contact section. ── */
async function createSpace(){
 let THREE;
 try{THREE=await import('./lib/three.module.min.js')}
 catch(e){try{THREE=await import('https://unpkg.com/three@0.180.0/build/three.module.js')}catch(_){return}};
 const canvas=$('#space');
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight,false);
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,250);
 camera.position.set(0,2.2,15.5);

 const count=innerWidth<700?9000:18000;
 const pos=new Float32Array(count*3),seed=new Float32Array(count),size=new Float32Array(count);
 for(let i=0;i<count;i++){
   const r=Math.pow(Math.random(),.58)*10.5;
   const arm=i%4,theta=arm*Math.PI/2+r*.58+(Math.random()-.5)*(.22+r*.07);
   const scatter=(Math.random()-.5)*(.45+r*.11);
   pos[i*3]=Math.cos(theta)*r+scatter;
   pos[i*3+1]=(Math.random()-.5)*(1.05-r*.055);
   pos[i*3+2]=Math.sin(theta)*r+scatter;
   seed[i]=Math.random();size[i]=Math.random();
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
 geo.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));
 geo.setAttribute('aSize',new THREE.BufferAttribute(size,1));
 const vertex=`
  uniform float uTime,uScroll,uPulse,uPixel;
  attribute float aSeed,aSize;
  varying float vA,vHeat;
  void main(){
   vec3 p=position;
   float r=length(p.xz);
   float ang=atan(p.z,p.x);
   float spin=uTime*(.055/(.5+r*.16));
   ang+=spin;
   float vortex=smoothstep(.28,.82,uScroll);
   float pull=vortex*vortex;
   float nr=mix(r,.22+fract(aSeed*17.31)*.35,pull);
   ang+=pull*(2.2+7.0/(r+.8));
   p.x=cos(ang)*nr;p.z=sin(ang)*nr;
   p.y*=mix(1.,.25,pull);
   float burst=smoothstep(.68,1.,uScroll);
   float dir=fract(aSeed*31.7)*6.28318;
   vec3 outDir=normalize(vec3(cos(dir),aSeed-.5,sin(dir)));
   p=mix(p,p+outDir*(burst*burst)*(2.+fract(aSeed*9.1)*12.),burst);
   vec4 mv=modelViewMatrix*vec4(p,1.);
   float heat=clamp(pull*.9+(1.-smoothstep(0.,3.,nr))*.55+burst*.8,0.,1.);
   vHeat=heat;vA=(.12+.72*(1.-aSize))* (1.-.55*burst) + heat*.55;
   gl_PointSize=(.7+aSize*1.7+heat*2.5)*uPixel*(24./-mv.z);
   gl_Position=projectionMatrix*mv;
  }`;
 const frag=`
  precision highp float; varying float vA,vHeat;
  void main(){
   vec2 d=gl_PointCoord-.5;float r=dot(d,d);if(r>.25)discard;
   float edge=smoothstep(.25,.01,r);
   vec3 cool=vec3(.66,.74,1.);vec3 warm=vec3(1.,.77,.45);vec3 white=vec3(1.,.97,.9);
   vec3 c=mix(cool,warm,smoothstep(.18,.8,vHeat));c=mix(c,white,smoothstep(.7,1.,vHeat));
   gl_FragColor=vec4(c,edge*vA);
  }`;
 const mat=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:frag,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
 uniforms:{uTime:{value:0},uScroll:{value:0},uPulse:{value:0},uPixel:{value:Math.min(devicePixelRatio,1.75)}}});
 scene.add(new THREE.Points(geo,mat));

 // distant stars
 const starN=700,sp=new Float32Array(starN*3);
 for(let i=0;i<starN;i++){const r=65+Math.random()*80,t=Math.random()*6.28,p=Math.acos(2*Math.random()-1);sp[i*3]=r*Math.sin(p)*Math.cos(t);sp[i*3+1]=r*Math.cos(p);sp[i*3+2]=r*Math.sin(p)*Math.sin(t)}
 const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
 const sm=new THREE.PointsMaterial({color:0xb8c4e0,size:.55,transparent:true,opacity:.5,depthWrite:false});
 scene.add(new THREE.Points(sg,sm));

 /* Movimiento reducido: el campo deja de girar solo (uTime clavado en 0) y de
    seguir al puntero, pero sigue respondiendo al scroll -el vórtice sigue
    contando la misma historia- porque solo se redibuja cuando el scroll
    cambia, no en cada fotograma. */
 const quieto=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let px=0,py=0,tx=0,ty=0;
 if(!quieto)addEventListener('pointermove',e=>{tx=(e.clientX/innerWidth-.5);ty=(e.clientY/innerHeight-.5)},{passive:true});
 let lastBirth=false;
 function render(t){
   const scroll=clamp(window.scrollY/(document.documentElement.scrollHeight-innerHeight));
   if(!quieto){px+=(tx-px)*.035;py+=(ty-py)*.035}
   camera.position.x=px*2.4;camera.position.y=2.2-py*1.2;camera.position.z=15.5-scroll*1.4;
   camera.lookAt(0,0,0);
   mat.uniforms.uTime.value=quieto?0:t*.001;mat.uniforms.uScroll.value=scroll;
   const final=scroll>.88;
   if(final&&!lastBirth){mat.uniforms.uPulse.value=1; if(audioCtx)play('birth',.55); setTimeout(()=>{if(audioCtx)play('impact',.45)},1100)}
   lastBirth=final;
   renderer.render(scene,camera);
   if(!quieto)requestAnimationFrame(render);
 }
 addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(quieto)requestAnimationFrame(render)},{passive:true});
 if(quieto)addEventListener('scroll',()=>requestAnimationFrame(render),{passive:true});
 requestAnimationFrame(render);
}
createSpace();
