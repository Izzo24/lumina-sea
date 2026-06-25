/* 螢海 LUMINA — 深海生物發光沉浸式背景 + 互動
   橋序創研 BridgeSeq Lab */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Three.js bioluminescent particle sea ---------------- */
  function initScene() {
    if (typeof THREE === 'undefined') return;
    var canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03060f, 0.055);

    var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 18);

    // particle count scales with viewport
    var isSmall = window.innerWidth < 720;
    var COUNT = isSmall ? 2600 : 6000;

    var positions = new Float32Array(COUNT * 3);
    var colors = new Float32Array(COUNT * 3);
    var sizes = new Float32Array(COUNT);
    var speeds = new Float32Array(COUNT);
    var phases = new Float32Array(COUNT);

    var palette = [
      new THREE.Color(0x36e8d6), // cyan
      new THREE.Color(0x5ad1ff), // aqua
      new THREE.Color(0x9b88ff), // violet
      new THREE.Color(0xaef7ec)  // pale glow
    ];
    var SPREAD_X = 46, SPREAD_Y = 38, SPREAD_Z = 30;

    for (var i = 0; i < COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * SPREAD_X;
      positions[i * 3 + 1] = (Math.random() - 0.5) * SPREAD_Y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD_Z;
      var c = palette[Math.floor(Math.random() * palette.length)];
      var tint = 0.55 + Math.random() * 0.45;
      colors[i * 3]     = c.r * tint;
      colors[i * 3 + 1] = c.g * tint;
      colors[i * 3 + 2] = c.b * tint;
      sizes[i] = Math.random() * 1.8 + 0.4;
      speeds[i] = Math.random() * 0.6 + 0.2;
      phases[i] = Math.random() * Math.PI * 2;
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // soft round glowing sprite texture
    var sprite = (function () {
      var s = 64, cv = document.createElement('canvas');
      cv.width = cv.height = s;
      var ctx = cv.getContext('2d');
      var g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.25, 'rgba(220,255,250,0.85)');
      g.addColorStop(0.55, 'rgba(120,210,230,0.35)');
      g.addColorStop(1, 'rgba(80,160,200,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      var tex = new THREE.Texture(cv);
      tex.needsUpdate = true;
      return tex;
    })();

    var mat = new THREE.PointsMaterial({
      size: isSmall ? 0.7 : 0.55,
      map: sprite,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      opacity: 0.95
    });

    var points = new THREE.Points(geo, mat);
    scene.add(points);

    // a few larger soft "drifting lights"
    var orbs = [];
    var orbCount = isSmall ? 4 : 7;
    var orbMat = new THREE.SpriteMaterial({ map: sprite, color: 0x36e8d6, transparent: true, blending: THREE.AdditiveBlending, opacity: 0.35, depthWrite: false });
    for (var o = 0; o < orbCount; o++) {
      var sp = new THREE.Sprite(orbMat.clone());
      sp.material.color = palette[o % palette.length].clone();
      var sc = 4 + Math.random() * 6;
      sp.scale.set(sc, sc, 1);
      sp.position.set((Math.random() - 0.5) * 36, (Math.random() - 0.5) * 26, -4 - Math.random() * 14);
      sp.userData = { sp: Math.random() * 0.3 + 0.1, ph: Math.random() * 6.28, baseY: sp.position.y };
      scene.add(sp);
      orbs.push(sp);
    }

    var mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
    window.addEventListener('pointermove', function (e) {
      mouseX = (e.clientX / window.innerWidth - 0.5);
      mouseY = (e.clientY / window.innerHeight - 0.5);
    }, { passive: true });

    function resize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', resize);

    var clock = new THREE.Clock();
    var running = true;
    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      if (running && !prefersReduced) tick();
    });

    function update(t, dt) {
      var pos = geo.attributes.position.array;
      for (var i = 0; i < COUNT; i++) {
        var iy = i * 3 + 1;
        pos[iy] += speeds[i] * dt * 0.6;               // drift upward like marine snow rising
        var ix = i * 3;
        pos[ix] += Math.sin(t * 0.3 + phases[i]) * dt * 0.25; // gentle sway
        if (pos[iy] > SPREAD_Y / 2) pos[iy] = -SPREAD_Y / 2;   // wrap
      }
      geo.attributes.position.needsUpdate = true;

      for (var k = 0; k < orbs.length; k++) {
        var u = orbs[k].userData;
        orbs[k].position.y = u.baseY + Math.sin(t * u.sp + u.ph) * 2.2;
        orbs[k].material.opacity = 0.22 + (Math.sin(t * 0.8 + u.ph) * 0.5 + 0.5) * 0.22;
      }

      targetX += (mouseX - targetX) * 0.04;
      targetY += (mouseY - targetY) * 0.04;
      camera.position.x = targetX * 6;
      camera.position.y = -targetY * 4;
      camera.lookAt(0, 0, 0);
      points.rotation.z = t * 0.012;
    }

    function tick() {
      if (!running) return;
      var dt = Math.min(clock.getDelta(), 0.05);
      var t = clock.elapsedTime;
      update(t, dt);
      renderer.render(scene, camera);
      if (!prefersReduced) requestAnimationFrame(tick);
    }

    if (prefersReduced) {
      update(0, 0.016);
      renderer.render(scene, camera);
    } else {
      tick();
    }
  }

  /* ---------------- UI interactions ---------------- */
  function initUI() {
    var header = document.querySelector('.site-header');
    var toTop = document.getElementById('toTop');
    var navToggle = document.getElementById('navToggle');
    var navMenu = document.getElementById('navMenu');

    function onScroll() {
      var y = window.scrollY || window.pageYOffset;
      if (header) header.classList.toggle('scrolled', y > 40);
      if (toTop) toTop.classList.toggle('show', y > window.innerHeight * 0.9);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (toTop) {
      toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
      });
    }

    function closeMenu() {
      if (!navMenu) return;
      navMenu.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', '開啟選單');
    }
    if (navToggle && navMenu) {
      navToggle.addEventListener('click', function () {
        var open = navMenu.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        navToggle.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
      });
      navMenu.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', closeMenu);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeMenu();
      });
    }

    // contact form -> toast
    var form = document.getElementById('contactForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = (document.getElementById('name') || {}).value || '';
        var email = (document.getElementById('email') || {}).value || '';
        if (!name.trim() || !email.trim()) {
          showToast('請填寫稱呼與電子郵件，我們才好與您聯絡。');
          return;
        }
        showToast('已收到您的預約需求，我們會盡快與您聯絡。');
        form.reset();
      });
    }

    var toastEl;
    var toastTimer;
    function showToast(msg) {
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.className = 'toast';
        toastEl.setAttribute('role', 'status');
        document.body.appendChild(toastEl);
      }
      toastEl.textContent = msg;
      requestAnimationFrame(function () { toastEl.classList.add('show'); });
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 3600);
    }

    // reveal on scroll (transition-based, JS toggled) + safety fallback
    var reveals = [].slice.call(document.querySelectorAll('.container > *, .work, .service-card, .step, .stat'));
    reveals.forEach(function (el) { el.classList.add('reveal'); });
    if ('IntersectionObserver' in window && !prefersReduced) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      reveals.forEach(function (el) { io.observe(el); });
      // safety: ensure everything visible after 2.5s no matter what
      setTimeout(function () { reveals.forEach(function (el) { el.classList.add('in'); }); }, 2500);
    } else {
      reveals.forEach(function (el) { el.classList.add('in'); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initScene(); initUI(); });
  } else {
    initScene(); initUI();
  }
})();
