
(function(){
  'use strict';

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Nunca dejamos un loader bloqueando la página.
  const oldLoader = document.getElementById('siteLoader');
  if (oldLoader) oldLoader.remove();

  // Barra de progreso de scroll.
  const progress = $('.scroll-progress span');
  function updateProgress(){
    if(!progress) return;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
  }
  addEventListener('scroll', updateProgress, {passive:true});
  updateProgress();

  // Cursor glow.
  const glow = $('#cursorGlow');
  if(glow && !reduce){
    let gx = innerWidth/2, gy = innerHeight/2, tx = gx, ty = gy;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; }, {passive:true});
    function moveGlow(){
      gx += (tx - gx) * .12; gy += (ty - gy) * .12;
      glow.style.transform = `translate(${gx - 180}px, ${gy - 180}px)`;
      requestAnimationFrame(moveGlow);
    }
    moveGlow();
  }

  // Animación al entrar en pantalla.
  const reveal = $$('.hero__grid > div, .card, .split__content, .split__image, .testimonial, .faq__list details, .cta-band .container');
  reveal.forEach((el,i)=>{ el.classList.add('reveal-3d'); el.style.transitionDelay = Math.min(i*55, 360)+'ms'; });
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => { if(entry.isIntersecting){ entry.target.classList.add('is-visible'); io.unobserve(entry.target); } });
  }, {threshold:.14});
  reveal.forEach(el=>io.observe(el));

  // Efecto 3D tilt real en tarjetas.
  $$('.hero__card, .card, .testimonial, .split__image, .faq__list details').forEach(card=>{
    card.addEventListener('pointermove', e=>{
      if(innerWidth < 768 || reduce) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - .5;
      const py = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(1000px) rotateX(${-py*12}deg) rotateY(${px*14}deg) translateY(-10px) translateZ(22px)`;
    });
    card.addEventListener('pointerleave', ()=>{ card.style.transform=''; });
  });

  // Botones magnéticos.
  $$('.btn').forEach(btn=>{
    btn.addEventListener('pointermove', e=>{
      if(innerWidth < 768 || reduce) return;
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width/2;
      const y = e.clientY - r.top - r.height/2;
      btn.style.transform = `translate(${x*.10}px, ${y*.14}px) translateY(-4px)`;
    });
    btn.addEventListener('pointerleave', ()=> btn.style.transform = '');
  });

  // Fallback visible incluso si Three.js no carga.
  function createDomParticles(){
    if(reduce || document.querySelector('.dom-particle')) return;
    const total = innerWidth < 768 ? 24 : 48;
    for(let i=0;i<total;i++){
      const p = document.createElement('span');
      p.className = 'dom-particle';
      p.style.setProperty('--x', Math.random()*100 + 'vw');
      p.style.left = '0';
      p.style.top = '0';
      p.style.animationDuration = (7 + Math.random()*10) + 's';
      p.style.animationDelay = (-Math.random()*10) + 's';
      p.style.opacity = (.28 + Math.random()*.5).toFixed(2);
      document.body.appendChild(p);
    }
  }
  createDomParticles();

  function loadThree(cb){
    if(window.THREE) return cb();
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.164.1/three.min.js';
    s.onload = cb;
    s.onerror = () => console.warn('Three.js no cargó; queda activo el fallback CSS/DOM.');
    document.head.appendChild(s);
  }

  if(!reduce) loadThree(initThree);

  function initThree(){
    const THREE = window.THREE;
    const canvas = $('#three-world');
    if(!THREE || !canvas) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050914, .035);
    const camera = new THREE.PerspectiveCamera(66, innerWidth/innerHeight, .1, 150);
    camera.position.set(0, 0, 20);
    const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:'high-performance'});
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));

    const mouse = new THREE.Vector2(0,0), target = new THREE.Vector2(0,0);
    addEventListener('pointermove', e=>{ target.x=(e.clientX/innerWidth-.5)*2; target.y=(e.clientY/innerHeight-.5)*2; }, {passive:true});

    // Textura circular para partículas.
    const tc = document.createElement('canvas'); tc.width=128; tc.height=128;
    const ctx = tc.getContext('2d');
    const g = ctx.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,'rgba(255,230,160,1)'); g.addColorStop(.35,'rgba(240,74,0,.8)'); g.addColorStop(1,'rgba(240,74,0,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,128,128);
    const tex = new THREE.CanvasTexture(tc);

    const count = innerWidth < 768 ? 900 : 1900;
    const positions = new Float32Array(count*3);
    const colors = new Float32Array(count*3);
    const c1 = new THREE.Color('#ffd36a'), c2 = new THREE.Color('#f04a00'), c3 = new THREE.Color('#55c7ff');
    for(let i=0;i<count;i++){
      const i3=i*3;
      const arm = (i%6) * Math.PI*2/6;
      const radius = 3 + Math.random()*34;
      const angle = radius*.42 + arm + Math.random()*.62;
      positions[i3] = Math.cos(angle)*radius*.38 + (Math.random()-.5)*2;
      positions[i3+1] = (Math.random()-.5)*22;
      positions[i3+2] = Math.sin(angle)*radius*.58 - Math.random()*42;
      const mix = c1.clone().lerp(i%4===0 ? c3 : c2, Math.random()*.65);
      colors[i3]=mix.r; colors[i3+1]=mix.g; colors[i3+2]=mix.b;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(positions,3));
    pg.setAttribute('color', new THREE.BufferAttribute(colors,3));
    const pm = new THREE.PointsMaterial({size:.18, map:tex, transparent:true, opacity:.88, depthWrite:false, blending:THREE.AdditiveBlending, vertexColors:true});
    const points = new THREE.Points(pg, pm); scene.add(points);

    const group = new THREE.Group(); scene.add(group);
    const orangeMat = new THREE.MeshStandardMaterial({color:0xf04a00, metalness:.42, roughness:.22, emissive:0x461300, emissiveIntensity:.55});
    const goldMat = new THREE.MeshStandardMaterial({color:0xffd36a, metalness:.55, roughness:.18, emissive:0x4d3300, emissiveIntensity:.48});
    const blueMat = new THREE.MeshStandardMaterial({color:0x55c7ff, metalness:.35, roughness:.24, emissive:0x0a3055, emissiveIntensity:.38});

    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.6,.18,180,22), orangeMat);
    knot.position.set(6.6,2.6,-6); group.add(knot);
    for(let i=0;i<4;i++){
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.8+i*.55,.026,16,160), i%2 ? blueMat : goldMat);
      ring.position.set(-5.7,-1.2,-8-i*.7);
      ring.rotation.set(1.1+i*.12,.35+i*.08,.1);
      group.add(ring);
    }
    const cross = new THREE.Group();
    const v = new THREE.Mesh(new THREE.BoxGeometry(.28,2.9,.18), goldMat);
    const h = new THREE.Mesh(new THREE.BoxGeometry(1.55,.26,.18), goldMat); h.position.y=.55;
    cross.add(v,h); cross.position.set(.3,-2.9,-9.5); cross.rotation.set(.12,-.45,.08); group.add(cross);

    scene.add(new THREE.AmbientLight(0xffffff,.72));
    const l1 = new THREE.PointLight(0xffd36a,24,48); l1.position.set(4,4,8); scene.add(l1);
    const l2 = new THREE.PointLight(0x55c7ff,13,40); l2.position.set(-7,-4,6); scene.add(l2);
    const l3 = new THREE.PointLight(0xf04a00,16,42); l3.position.set(7,-3,4); scene.add(l3);

    const clock = new THREE.Clock();
    function resize(){
      camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
    }
    addEventListener('resize', resize);
    function animate(){
      const t = clock.getElapsedTime();
      mouse.lerp(target,.055);
      points.rotation.y = t*.035 + mouse.x*.12;
      points.rotation.x = -mouse.y*.055;
      group.rotation.y = Math.sin(t*.35)*.14 + mouse.x*.22;
      group.rotation.x = Math.cos(t*.28)*.08 - mouse.y*.12;
      knot.rotation.x += .008; knot.rotation.y += .011;
      cross.rotation.y = Math.sin(t*.9)*.42;
      cross.position.y = -2.9 + Math.sin(t*1.2)*.24;
      group.children.forEach((obj,i)=>{ if(obj.geometry && obj.geometry.type === 'TorusGeometry') obj.rotation.z += .003 + i*.0008; });
      camera.position.x += (mouse.x*1.05 - camera.position.x)*.035;
      camera.position.y += (-mouse.y*.72 - camera.position.y)*.035;
      camera.lookAt(0,0,-5);
      renderer.render(scene,camera);
      requestAnimationFrame(animate);
    }
    animate();
  }
})();
const menuToggle=document.getElementById("menuToggle");

const navLinks=document.getElementById("navLinks");

const overlay=document.getElementById("menuOverlay");

menuToggle.addEventListener("click",()=>{

navLinks.classList.toggle("active");

overlay.classList.toggle("active");

if(navLinks.classList.contains("active")){

menuToggle.innerHTML='<i class="fas fa-times"></i>';

}else{

menuToggle.innerHTML='<i class="fas fa-bars"></i>';

}

});

overlay.onclick=()=>{

navLinks.classList.remove("active");

overlay.classList.remove("active");

menuToggle.innerHTML='<i class="fas fa-bars"></i>';

};

document.querySelectorAll(".nav__links a").forEach(link=>{

link.onclick=()=>{

navLinks.classList.remove("active");

overlay.classList.remove("active");

menuToggle.innerHTML='<i class="fas fa-bars"></i>';

};

});
