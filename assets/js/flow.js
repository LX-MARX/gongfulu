/*
 * 屋顶上的共富路整村光伏服务平台软件 V2.0
 * Copyright (c) 2026 屋顶上的共富路项目组
 * 中心件：收益流工艺管线图（Three.js 本地 vendor）。
 * 六站自左而右——阳光、组件、逆变、计量、并网、到户，管线内光点流动示意收益流转。
 * 与东高垣站「系统解剖台」同引擎、不同工艺拓扑，构成两个软件的差异化表达。
 */
import * as THREE from "../vendor/three.module.js";
import { OrbitControls } from "../vendor/OrbitControls.js";

var IVORY = 0xEFE7D3, AMBER = 0xD9A441, BLUE = 0x24405E, PANEL = 0x16283F;

var STATIONS = [
  { id: "01", name: "阳光", spec: "年等效利用 1350 h", w: 90, h: 90, d: 90, x: -560, kind: "sun" },
  { id: "02", name: "组件发电", spec: "805 万度/年 · 635 W/块", w: 260, h: 26, d: 170, x: -340, kind: "panel" },
  { id: "03", name: "组串逆变", spec: "直流变交流", w: 130, h: 60, d: 90, x: -140, kind: "box" },
  { id: "04", name: "双向计量", spec: "0.3545 元/度", w: 100, h: 66, d: 80, x: 40, kind: "meter" },
  { id: "05", name: "全额并网", spec: "电网结算约 286 万元/年", w: 150, h: 84, d: 110, x: 240, kind: "trans" },
  { id: "06", name: "农户账户", spec: "户均 1500—2000 元/年", w: 150, h: 74, d: 110, x: 470, kind: "acct" }
];

export function initFlow(opts) {
  var stage = document.getElementById(opts.stageId);
  var canvas = document.getElementById(opts.canvasId);
  var railR = document.getElementById(opts.railId);
  var readout = document.getElementById(opts.readoutId);
  var wires = document.getElementById(opts.wiresId);
  var scope = document.getElementById(opts.scopeId);
  if (!stage || !canvas) return;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(34, 1, 1, 6000);
  camera.position.set(180, 420, 780);

  var controls = new OrbitControls(camera, canvas);
  controls.target.set(-40, 60, 0);
  controls.enableDamping = true; controls.dampingFactor = .08;
  controls.minDistance = 420; controls.maxDistance = 1600;
  controls.minPolarAngle = .55; controls.maxPolarAngle = 1.45;
  controls.enablePan = false;
  controls.autoRotate = false; /* 工艺管线为正向阅读，默认不自旋 */

  scene.add(new THREE.HemisphereLight(0xEAF1F8, 0x0A1420, .9));
  var key = new THREE.DirectionalLight(0xFFF4E0, 1.5);
  key.position.set(300, 700, 400);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -700; key.shadow.camera.right = 700;
  key.shadow.camera.top = 500; key.shadow.camera.bottom = -300;
  key.shadow.bias = -0.0004;
  scene.add(key);
  var rim = new THREE.DirectionalLight(0x9FB8D8, .45);
  rim.position.set(-500, 300, -400);
  scene.add(rim);

  var ground = new THREE.Mesh(new THREE.CircleGeometry(1100, 64), new THREE.ShadowMaterial({ opacity: .34 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);
  var grid = new THREE.GridHelper(1800, 40, 0x3A5373, 0x2A4160);
  grid.material.transparent = true; grid.material.opacity = .5;
  scene.add(grid);

  function edged(geo, color) {
    var g = new THREE.Group();
    var mat = new THREE.MeshStandardMaterial({ color: color, roughness: .62, metalness: .25 });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    var eg = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20),
      new THREE.LineBasicMaterial({ color: IVORY, transparent: true, opacity: .8 }));
    g.add(mesh); g.add(eg);
    g.userData.mat = mat; g.userData.edge = eg.material;
    return g;
  }

  var stations = [];

  STATIONS.forEach(function (st, idx) {
    var G = new THREE.Group();
    var w = st.w, h = st.h, d = st.d;

    if (st.kind === "sun") {
      /* 阳光：线框球＋光芒 */
      var core = edged(new THREE.IcosahedronGeometry(46, 1), 0xD9A441);
      core.userData.mat.emissive = new THREE.Color(0x6B4E10);
      G.add(core);
      for (var r = 0; r < 8; r++) {
        var a = r / 8 * Math.PI * 2;
        var rayG = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(Math.cos(a) * 58, Math.sin(a) * 58, 0),
          new THREE.Vector3(Math.cos(a) * 76, Math.sin(a) * 76, 0)
        ]);
        G.add(new THREE.Line(rayG, new THREE.LineBasicMaterial({ color: AMBER, transparent: true, opacity: .7 })));
      }
      G.position.set(st.x, 180, 0);
    } else if (st.kind === "panel") {
      /* 组件：3×2 小板＋支腿 */
      for (var px = 0; px < 3; px++) for (var pz = 0; pz < 2; pz++) {
        var pw = w / 3 - 12, pd = d / 2 - 12;
        var pan = edged(new THREE.BoxGeometry(pw, 6, pd), PANEL);
        pan.position.set(-w / 2 + pw / 2 + 6 + px * (pw + 12), h + 26, -d / 2 + pd / 2 + 6 + pz * (pd + 12));
        pan.rotation.x = -.32;
        G.add(pan);
      }
      for (var leg = -1; leg <= 1; leg++) {
        var lg = edged(new THREE.BoxGeometry(8, h + 22, 8), 0x2E4A6B);
        lg.position.set(leg * (w / 2 - 20), (h + 22) / 2, 0);
        G.add(lg);
      }
      G.position.set(st.x, 0, 0);
    } else if (st.kind === "meter") {
      G.add(edged(new THREE.BoxGeometry(w, h, d), BLUE));
      var dial = edged(new THREE.CylinderGeometry(18, 18, 6, 32), 0xEFE7D3);
      dial.position.set(0, h / 2 + 3, 0); G.add(dial);
      var needle = new THREE.Mesh(new THREE.BoxGeometry(13, 1.6, 1.6), new THREE.MeshStandardMaterial({ color: AMBER }));
      needle.position.set(4, h / 2 + 6.5, 0); needle.rotation.y = .5; G.add(needle);
      G.position.set(st.x, h / 2, 0);
    } else if (st.kind === "trans") {
      G.add(edged(new THREE.BoxGeometry(w, h, d), BLUE));
      var tank = edged(new THREE.CylinderGeometry(20, 20, w * .7, 24), 0x2E4A6B);
      tank.rotation.z = Math.PI / 2; tank.position.set(0, h / 2 + 20, -d / 4); G.add(tank);
      for (var b = -1; b <= 1; b++) {
        var bushing = edged(new THREE.CylinderGeometry(4, 6, 26, 12), 0x3A5373);
        bushing.position.set(b * 30, h / 2 + 13, d / 4); G.add(bushing);
      }
      G.position.set(st.x, h / 2, 0);
    } else if (st.kind === "acct") {
      /* 农户账户：账台式小盒＋顶部钱币槽 */
      G.add(edged(new THREE.BoxGeometry(w, h, d), 0x2E4A6B));
      var slot = edged(new THREE.BoxGeometry(w * .5, 8, 14), 0xD9A441);
      slot.position.set(0, h / 2 + 4, 0); G.add(slot);
      G.position.set(st.x, h / 2, 0);
    } else {
      G.add(edged(new THREE.BoxGeometry(w, h, d), BLUE));
      G.position.set(st.x, h / 2, 0);
    }

    G.traverse(function (o) { o.userData.stIdx = idx; });
    scene.add(G);
    stations.push({ g: G, st: st });
  });

  /* ---------- 管线：站间导管 ---------- */
  var pipeY = 36;
  for (var i = 0; i < STATIONS.length - 1; i++) {
    var x1 = STATIONS[i].x + STATIONS[i].w / 2, x2 = STATIONS[i + 1].x - STATIONS[i + 1].w / 2;
    var len = x2 - x1;
    if (len <= 0) continue;
    var pipe = edged(new THREE.CylinderGeometry(5, 5, len, 14), 0x2E4A6B);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set((x1 + x2) / 2, pipeY, 0);
    scene.add(pipe);
  }
  /* 阳光到组件的光路：斜线 */
  var beamG = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(STATIONS[0].x + 50, 150, 0),
    new THREE.Vector3(STATIONS[1].x - 80, 90, 0)
  ]);
  scene.add(new THREE.Line(beamG, new THREE.LineBasicMaterial({ color: AMBER, transparent: true, opacity: .8 })));

  /* ---------- 流动光点 ---------- */
  var pulses = [];
  var pulseMat = new THREE.MeshBasicMaterial({ color: AMBER });
  for (var p = 0; p < 7; p++) {
    var s = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 10), pulseMat);
    s.userData.t = p / 7;
    scene.add(s); pulses.push(s);
  }
  function pulsePos(t) {
    /* 沿管线自左而右；起点经光束斜线 */
    var total = STATIONS[5].x - STATIONS[0].x;
    var x = STATIONS[0].x + t * total;
    if (x < STATIONS[1].x - 80) {
      var k = (x - STATIONS[0].x) / ((STATIONS[1].x - 80) - STATIONS[0].x);
      return [x, 150 + (90 - 150) * k, 0];
    }
    return [x, pipeY + 5 + Math.sin(t * Math.PI * 2) * 2, 0];
  }

  /* ---------- 注解栏 ---------- */
  if (railR) {
    STATIONS.forEach(function (st, idx) {
      var an = document.createElement("div");
      an.className = "an"; an.dataset.i = idx;
      an.innerHTML = '<span class="no">' + st.id + '</span><span><span class="nm">' + st.name + '</span><span class="sp" style="display:block">' + st.spec + '</span></span>';
      an.addEventListener("mouseenter", function () { hot(idx, true); });
      an.addEventListener("mouseleave", function () { hot(idx, false); });
      an.addEventListener("click", function () { select(idx); });
      railR.appendChild(an);
    });
  }

  var locked = -1;
  function setStationHot(i, on) {
    stations[i].g.traverse(function (o) {
      if (o.userData.edge) o.userData.edge.color.setHex(on ? AMBER : IVORY);
      if (o.userData.mat) o.userData.mat.emissive.setHex(on ? 0x6B4E10 : 0x000000);
    });
  }
  function hot(i, on) {
    setStationHot(i, on || locked === i);
    if (railR && railR.children[i]) railR.children[i].classList.toggle("hot", on || locked === i);
    if (readout) {
      if (on) readout.innerHTML = "NODE <b>" + STATIONS[i].id + "</b> · " + STATIONS[i].name;
      else if (locked < 0) readout.textContent = "NODE —— · 待机";
    }
  }
  function select(i) {
    if (locked >= 0) { setStationHot(locked, false); if (railR) railR.children[locked].classList.remove("hot"); }
    locked = locked === i ? -1 : i;
    if (locked >= 0) {
      setStationHot(locked, true);
      if (railR) railR.children[locked].classList.add("hot");
      if (readout) readout.innerHTML = "NODE <b>" + STATIONS[locked].id + "</b> · " + STATIONS[locked].name + " · 已锁定";
    } else if (readout) readout.textContent = "NODE —— · 待机";
  }

  var ray = new THREE.Raycaster(), mv = new THREE.Vector2(), hovered = -1;
  canvas.addEventListener("pointermove", function (e) {
    var r = canvas.getBoundingClientRect();
    mv.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mv.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  });
  canvas.addEventListener("click", function () { if (hovered >= 0) select(hovered); });

  /* ---------- 引出虚线 ---------- */
  var wireEls = [];
  if (wires && railR) {
    STATIONS.forEach(function () {
      var pl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      pl.setAttribute("fill", "none"); pl.setAttribute("stroke", "rgba(239,231,211,.5)");
      pl.setAttribute("stroke-width", "1"); pl.setAttribute("stroke-dasharray", "5 4");
      wires.appendChild(pl);
      var tri = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      tri.setAttribute("fill", "rgba(239,231,211,.9)");
      wires.appendChild(tri);
      wireEls.push({ pl: pl, tri: tri });
    });
  }
  var anchorV = new THREE.Vector3();
  function updateWires() {
    if (!wires || !railR || !scope) return;
    var mr = scope.getBoundingClientRect();
    var cr = canvas.getBoundingClientRect();
    stations.forEach(function (S, i) {
      var el = wireEls[i], an = railR.children[i];
      if (!el || !an) return;
      anchorV.set(S.st.w / 2, S.st.kind === "sun" ? 200 : S.st.h + 34, 0);
      S.g.localToWorld(anchorV);
      var v = anchorV.clone().project(camera);
      var x = (v.x * .5 + .5) * cr.width + (cr.left - mr.left);
      var y = (-v.y * .5 + .5) * cr.height + (cr.top - mr.top);
      if (v.z > 1) { el.pl.setAttribute("opacity", "0"); el.tri.setAttribute("opacity", "0"); return; }
      var ar = an.getBoundingClientRect();
      var tx = ar.left - mr.left - 12, ty = ar.top - mr.top + ar.height / 2;
      var midx = (x + tx) / 2 + 16;
      el.pl.setAttribute("points", x.toFixed(1) + "," + y.toFixed(1) + " " + midx.toFixed(1) + "," + ty.toFixed(1) + " " + tx.toFixed(1) + "," + ty.toFixed(1));
      el.pl.setAttribute("opacity", "1");
      var ang = Math.atan2(ty - y, tx - x), sz = 7;
      var p1 = [x + 9 * Math.cos(ang), y + 9 * Math.sin(ang)];
      var p2 = [x - sz * Math.cos(ang - .5), y - sz * Math.sin(ang - .5)];
      var p3 = [x - sz * Math.cos(ang + .5), y - sz * Math.sin(ang + .5)];
      el.tri.setAttribute("points",
        p1.map(function (n) { return n.toFixed(1); }).join(",") + " " +
        p2.map(function (n) { return n.toFixed(1); }).join(",") + " " +
        p3.map(function (n) { return n.toFixed(1); }).join(","));
      el.tri.setAttribute("opacity", "1");
      var on = locked === i || hovered === i;
      el.pl.setAttribute("stroke", on ? "#D9A441" : "rgba(239,231,211,.5)");
      el.tri.setAttribute("fill", on ? "#D9A441" : "rgba(239,231,211,.9)");
    });
  }

  function resize() {
    var w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (wires && scope) wires.setAttribute("viewBox", "0 0 " + scope.clientWidth + " " + scope.clientHeight);
  }
  addEventListener("resize", resize);
  resize();

  var t0 = 0;
  function tick() {
    requestAnimationFrame(tick);
    t0 += .004;
    pulses.forEach(function (s) {
      s.userData.t += .0016;
      if (s.userData.t > 1) s.userData.t = 0;
      var pos = pulsePos(s.userData.t);
      s.position.set(pos[0], pos[1], pos[2]);
    });
    /* 阳光缓旋 */
    stations[0].g.rotation.y += .004;

    ray.setFromCamera(mv, camera);
    var hits = ray.intersectObjects(scene.children, true);
    var found = -1;
    for (var k = 0; k < hits.length; k++) {
      var li = hits[k].object.userData.stIdx;
      if (li !== undefined) { found = li; break; }
    }
    if (found !== hovered) {
      if (hovered >= 0 && locked !== hovered) {
        setStationHot(hovered, false);
        if (railR && railR.children[hovered]) railR.children[hovered].classList.remove("hot");
      }
      hovered = found;
      if (hovered >= 0) hot(hovered, true);
      else if (locked < 0 && readout) readout.textContent = "NODE —— · 待机";
      canvas.style.cursor = hovered >= 0 ? "pointer" : "grab";
    }
    controls.update();
    renderer.render(scene, camera);
    updateWires();
  }
  tick();

  return { select: select };
}
