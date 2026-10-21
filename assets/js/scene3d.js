/* ================================================================
 * V13 共享场景模块：东高垣村黄昏实景可交互模型
 * 两站共用骨架；镜头叙事由页面层注入。
 * 规格：V13 重设计规格 2.1 准确层 / 2.2 真实层 / 2.3 互动层 / 2.4 流畅层
 * ================================================================ */
import * as THREE from "../vendor/three.module.js";
import { OrbitControls } from "../vendor/OrbitControls.js";

export function createVillage(canvas, opts) {
  const svg = opts.wires;                       /* SVG 引出线层 */
  const NS = "http://www.w3.org/2000/svg";

  /* ---------- 渲染器 ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1);  /* 流畅层硬预算：DPR=1，分辨率换帧率 */
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;          /* 静态场景：阴影只烘一次，拖动时间滑杆时再更新 */
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x24344A, 60, 260);
  const camera = new THREE.PerspectiveCamera(42, 2, 0.1, 600);

  /* ---------- 天空穹顶（时间参数化渐变） ---------- */
  const skyTex = document.createElement("canvas");
  skyTex.width = 16; skyTex.height = 512;
  const skyCtx = skyTex.getContext("2d");
  const skyTexture = new THREE.CanvasTexture(skyTex);
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  function paintSky(t) {                        /* t: 0=正午 1=黄昏 */
    const g = skyCtx.createLinearGradient(0, 0, 0, 512);
    const mix = (a, b) => lerpColor(a, b, t);
    g.addColorStop(0, "#1E3A5C");
    g.addColorStop(0.42, mix("#7A9BBD", "#7A8BA8"));
    g.addColorStop(0.72, mix("#C8D4E0", "#E8A85C"));
    g.addColorStop(1, mix("#E8E2D2", "#F0A04C"));
    skyCtx.fillStyle = g; skyCtx.fillRect(0, 0, 16, 512);
    skyTexture.needsUpdate = true;
  }
  function lerpColor(a, b, t) {
    const pa = [1, 3, 5].map(i => parseInt(a.substr(i, 2), 16));
    const pb = [1, 3, 5].map(i => parseInt(b.substr(i, 2), 16));
    return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }
  paintSky(1);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(380, 32, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, fog: false })
  );
  scene.add(sky);

  /* 太阳：发光圆盘 + 径向辉光 */
  const sunTexC = document.createElement("canvas");
  sunTexC.width = sunTexC.height = 128;
  const sg = sunTexC.getContext("2d");
  const rg = sg.createRadialGradient(64, 64, 4, 64, 64, 64);
  rg.addColorStop(0, "rgba(255,240,214,1)");
  rg.addColorStop(0.25, "rgba(255,208,138,.9)");
  rg.addColorStop(1, "rgba(255,180,100,0)");
  sg.fillStyle = rg; sg.fillRect(0, 0, 128, 128);
  const sunTex = new THREE.CanvasTexture(sunTexC);
  sunTex.colorSpace = THREE.SRGBColorSpace;
  const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, fog: false, depthWrite: false }));
  sunDisc.scale.set(70, 70, 1);
  scene.add(sunDisc);

  /* 云带 3 条（被夕阳染边） */
  const cloudTex = makeTex(256, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 22; i++) {
      const y = 12 + Math.random() * (h - 24), r = 8 + Math.random() * 22;
      const cg = g.createRadialGradient(0, 0, 0, 0, 0, r);
      cg.addColorStop(0, "rgba(232,220,200,.30)"); cg.addColorStop(1, "rgba(232,220,200,0)");
      g.save(); g.translate(Math.random() * w, y); g.fillStyle = cg;
      g.beginPath(); g.ellipse(0, 0, r * 2.2, r * 0.5, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
  });
  const cloudMat = new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.8 });
  [[-140, 66, -180, 0.4], [60, 78, -200, -0.2], [-30, 58, -170, 0.9]].forEach(p => {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(150, 26), cloudMat);
    c.position.set(p[0], p[1], p[2]); c.rotation.y = p[3];
    scene.add(c);
  });

  /* ---------- 光照 ---------- */
  scene.add(new THREE.HemisphereLight(0x9DB8D8, 0x4A3A24, 0.7));
  const sun = new THREE.DirectionalLight(0xFFC98A, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -34; sun.shadow.camera.right = 34;
  sun.shadow.camera.top = 34; sun.shadow.camera.bottom = -34;   /* 阴影限主角院 */
  sun.shadow.bias = -0.0004;
  scene.add(sun); scene.add(sun.target);
  const rim = new THREE.DirectionalLight(0x7A98BC, 0.5);
  rim.position.set(50, 20, -50); scene.add(rim);

  /* ---------- 环境反射（PMREM from 天空） ---------- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const skyScene = new THREE.Scene();
  skyScene.add(new THREE.Mesh(sky.geometry, sky.material));
  scene.environment = pmrem.fromScene(skyScene, 0.04).texture;

  /* ---------- 程序化贴图 ---------- */
  function makeTex(w, h, draw, repeat) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = 8;
    return t;
  }
  /* 光伏板 512×340：6×10 电池片 + 细栅线 + 主栅线 */
  const pvTex = makeTex(512, 340, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#17406E"); grad.addColorStop(0.5, "#1E4E86"); grad.addColorStop(1, "#122F55");
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(150,195,238,.55)"; g.lineWidth = 2;
    for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo(i * w / 10, 0); g.lineTo(i * w / 10, h); g.stroke(); }
    for (let j = 1; j < 6; j++) { g.beginPath(); g.moveTo(0, j * h / 6); g.lineTo(w, j * h / 6); g.stroke(); }
    g.strokeStyle = "rgba(150,195,238,.2)"; g.lineWidth = 1;
    for (let i = 0; i < 10; i++) for (let k = 1; k < 3; k++) {
      const x = i * w / 10 + k * w / 30;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
    }
    g.strokeStyle = "rgba(225,238,252,.8)"; g.lineWidth = 3;
    [w / 3, 2 * w / 3].forEach(x => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); });
  });
  /* 夯土墙：横纹层线 + 剥落 + 青砖裙脚 */
  const earthTex = makeTex(256, 256, (g, w, h) => {
    g.fillStyle = "#B59A72"; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(90,70,45,.25)";
    for (let y = 20; y < h - 46; y += 34) g.fillRect(0, y, w, 2);      /* 夯土层线 */
    for (let i = 0; i < 26; i++) {                                     /* 剥落斑 */
      g.fillStyle = "rgba(140,112,74," + (0.1 + Math.random() * 0.2) + ")";
      g.beginPath(); g.ellipse(Math.random() * w, Math.random() * (h - 50), 3 + Math.random() * 9, 2 + Math.random() * 5, 0, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = "#5A5F66"; g.fillRect(0, h - 44, w, 44);             /* 裙脚 */
    g.strokeStyle = "rgba(30,32,36,.4)"; g.lineWidth = 1;
    for (let x = 0; x < w; x += 18) { g.beginPath(); g.moveTo(x, h - 44); g.lineTo(x, h); g.stroke(); }
  }, [2, 1]);
  /* 板瓦垄纹 */
  const tileTex = makeTex(128, 128, (g, w, h) => {
    g.fillStyle = "#5E5248"; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 12) {                                   /* 半圆垄 */
      const lg = g.createLinearGradient(x, 0, x + 12, 0);
      lg.addColorStop(0, "rgba(20,16,12,.55)"); lg.addColorStop(0.5, "rgba(150,138,120,.35)"); lg.addColorStop(1, "rgba(20,16,12,.55)");
      g.fillStyle = lg; g.fillRect(x, 0, 12, h);
    }
    g.fillStyle = "rgba(30,24,18,.6)";                                  /* 檐口深边 */
    for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 3);
  }, [3, 2]);
  /* 地面：黄土 + 水泥主巷车辙 */
  const groundTex = makeTex(256, 256, (g, w, h) => {
    g.fillStyle = "#6E5B40"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
      g.fillStyle = "rgba(50,38,22," + (Math.random() * 0.2) + ")";
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }, [16, 16]);
  const laneTex = makeTex(128, 128, (g, w, h) => {
    g.fillStyle = "#8E8E88"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = "rgba(60,60,56," + (Math.random() * 0.2) + ")";
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    g.fillStyle = "rgba(70,70,64,.5)";                                   /* 车辙 */
    g.fillRect(w * 0.28, 0, 7, h); g.fillRect(w * 0.68, 0, 7, h);
  }, [1, 24]);

  /* ---------- 地面 / 主巷 / 支巷 / 崖壁 ---------- */
  const ground = new THREE.Mesh(new THREE.CircleGeometry(260, 48),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  const lane = new THREE.Mesh(new THREE.PlaneGeometry(8, 190),
    new THREE.MeshStandardMaterial({ map: laneTex, roughness: 0.9 }));
  lane.rotation.x = -Math.PI / 2; lane.rotation.z = Math.PI / 2;
  lane.position.set(0, 0.03, 16); lane.receiveShadow = true; scene.add(lane);

  const cliffMat = new THREE.MeshStandardMaterial({ color: 0x7A6544, roughness: 1 });
  function cliff(x, z, w, h, d, ry) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cliffMat);
    m.position.set(x, h / 2 - 0.2, z); m.rotation.y = ry;
    m.castShadow = m.receiveShadow = true; scene.add(m);
    /* 垂直节理 */
    const joint = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.96, h * 0.9),
      new THREE.MeshStandardMaterial({ map: makeTex(128, 128, (g, ww, hh) => {
        g.clearRect(0, 0, ww, hh);
        g.fillStyle = "rgba(60,46,28,.35)";
        for (let i = 0; i < 12; i++) g.fillRect(Math.random() * ww, 0, 2 + Math.random() * 3, hh);
      }), transparent: true, roughness: 1 }));
    joint.position.set(0, 0, d / 2 + 0.05); m.add(joint);
  }
  cliff(-70, -66, 90, 20, 18, 0.28);
  cliff(-20, -88, 110, 27, 20, 0.05);
  cliff(70, -80, 90, 24, 16, -0.2);

  /* ---------- 材质 ---------- */
  const wallMat = new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.95 });
  const tileMat = new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.9 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x9AA2AC, metalness: 0.78, roughness: 0.4 });
  const pvMat = new THREE.MeshStandardMaterial({ map: pvTex, roughness: 0.15, metalness: 0.4, envMapIntensity: 1.2, emissive: 0x0A1E38, emissiveIntensity: 0.18 });
  const aluMat = new THREE.MeshStandardMaterial({ color: 0xB9BFC7, metalness: 0.82, roughness: 0.32 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x9A9A92, roughness: 0.9 });
  const brickMat = new THREE.MeshStandardMaterial({ color: 0x8A5A48, roughness: 0.9 });

  /* ---------- 院落构件 ---------- */
  /* 门楼：砖砌 + 门匾 */
  function gatehouse() {
    const g = new THREE.Group();
    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.8, 0.5), brickMat);
    pillarL.position.set(-1.2, 1.4, 0); pillarL.castShadow = true; g.add(pillarL);
    const pillarR = pillarL.clone(); pillarR.position.x = 1.2; g.add(pillarR);
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 0.9), brickMat);
    top.position.y = 3.0; top.castShadow = true; g.add(top);
    const topRoof = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 1, 0.5, 4, 1), tileMat);
    topRoof.rotation.y = Math.PI / 4; topRoof.scale.set(2.1, 1, 0.85);
    topRoof.position.y = 3.5; topRoof.castShadow = true; g.add(topRoof);
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x1C2A38, roughness: 0.6 }));
    plaque.position.set(0, 2.95, 0.48); g.add(plaque);
    return g;
  }
  /* 院墙（土墙 + 瓦帽） */
  function wallRun(len) {
    const g = new THREE.Group();
    const w = new THREE.Mesh(new THREE.BoxGeometry(len, 2, 0.4), wallMat);
    w.position.y = 1; w.castShadow = w.receiveShadow = true; g.add(w);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.62), tileMat);
    cap.position.y = 2.06; cap.castShadow = true; g.add(cap);
    return g;
  }
  /* 柴堆 */
  function firewood(x, z) {
    const g = new THREE.Group();
    const logMat = new THREE.MeshStandardMaterial({ color: 0x6B4E32, roughness: 1 });
    for (let i = 0; i < 9; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.2, 6), logMat);
      log.rotation.z = Math.PI / 2;
      log.position.set((i % 3 - 1) * 0.22, 0.12 + Math.floor(i / 3) * 0.2, (Math.floor(i / 3) % 2) * 0.1);
      log.castShadow = true; g.add(log);
    }
    g.position.set(x, 0, z); return g;
  }
  /* 玉米串（檐下） */
  function cornStrings(x, y, z) {
    const g = new THREE.Group();
    const cornMat = new THREE.MeshStandardMaterial({ color: 0xD8A83E, roughness: 0.85 });
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.34, 3, 6), cornMat);
      c.position.set(x + i * 0.26, y, z); c.castShadow = true; g.add(c);
    }
    return g;
  }
  /* 三轮车（巷中停放） */
  function trike(x, z, ry) {
    const g = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color: 0x2E5E8E, metalness: 0.4, roughness: 0.5 });
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.32, 1.05), paint);
    bed.position.y = 0.82; bed.castShadow = true; g.add(bed);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.72, 0.9), paint);
    cab.position.set(0, 0.75, 1.0); cab.castShadow = true; g.add(cab);
    const wheelG = new THREE.CylinderGeometry(0.28, 0.28, 0.14, 12);
    wheelG.rotateZ(Math.PI / 2);
    const wheelM = new THREE.MeshStandardMaterial({ color: 0x22262E, roughness: 0.9 });
    [[-0.55, -0.4], [0.55, -0.4], [0, 1.35]].forEach(p => {
      const wh = new THREE.Mesh(wheelG, wheelM);
      wh.position.set(p[0], 0.28, p[1]); wh.castShadow = true; g.add(wh);
    });
    g.position.set(x, 0, z); g.rotation.y = ry; return g;
  }
  /* 晾衣绳 */
  function clothesline(x1, z1, x2, z2, y) {
    const g = new THREE.Group();
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012,
      Math.hypot(x2 - x1, z2 - z1), 4), steelMat);
    line.rotation.z = Math.PI / 2; line.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    line.position.set((x1 + x2) / 2, y, (z1 + z2) / 2); g.add(line);
    const clothM = [0xB8452E, 0xD8DDE4, 0x3E6FA8].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, side: THREE.DoubleSide }));
    for (let i = 0; i < 3; i++) {
      const t = 0.25 + i * 0.25;
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.65), clothM[i]);
      cl.position.set(x1 + (x2 - x1) * t, y - 0.36, z1 + (z2 - z1) * t);
      cl.rotation.y = line.rotation.y + Math.PI / 2; cl.castShadow = true; g.add(cl);
    }
    return g;
  }
  /* 标语墙（老墙褪红残迹 + 新标语鲜红，时代并置） */
  function sloganWall(x, z, ry, text, fresh) {
    const tex = makeTex(512, 96, (g, w, h) => {
      g.fillStyle = "#B59A72"; g.fillRect(0, 0, w, h);
      g.fillStyle = fresh ? "rgba(158,32,24,.92)" : "rgba(176,58,46,.38)";
      g.font = "900 52px SimSun,serif";
      g.fillText(text, 26, 66);
      for (let i = 0; i < (fresh ? 120 : 260); i++) {
        g.fillStyle = "rgba(181,154,114," + Math.random() * (fresh ? 0.25 : 0.55) + ")";
        g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
      }
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.85),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
    m.position.set(x, 1.5, z); m.rotation.y = ry; scene.add(m);
    /* 衬墙：标语不再悬浮 */
    const bw = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.4, 0.22), wallMat);
    bw.position.set(x - Math.sin(ry) * 0.13, 1.2, z - Math.cos(ry) * 0.13);
    bw.rotation.y = ry; bw.castShadow = bw.receiveShadow = true; scene.add(bw);
  }

  /* ---------- 主角院（平顶房 + 一字坡支架板阵） ---------- */
  const hero = new THREE.Group();
  /* 主房：平顶 + 女儿墙 */
  const mainH = new THREE.Mesh(new THREE.BoxGeometry(9.6, 3.6, 6.4), wallMat);
  mainH.position.y = 1.8; mainH.castShadow = mainH.receiveShadow = true; hero.add(mainH);
  [[9.9, 0.42, 0.3, 0, 3.85, 3.25], [9.9, 0.42, 0.3, 0, 3.85, -3.25],
   [0.3, 0.42, 6.4, 4.85, 3.85, 0], [0.3, 0.42, 6.4, -4.85, 3.85, 0]].forEach(p => {
    const pDesk = new THREE.Mesh(new THREE.BoxGeometry(p[0], p[1], p[2]), wallMat);
    pDesk.position.set(p[3], p[4], p[5]); pDesk.castShadow = true; hero.add(pDesk);
  });
  /* 门窗 */
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.3, 0.12), new THREE.MeshStandardMaterial({ color: 0x5A3A28, roughness: 0.8 }));
  door.position.set(-1.8, 1.35, 3.26); hero.add(door);
  const winMat = new THREE.MeshStandardMaterial({ color: 0xE8CF9A, emissive: 0xC8AA6E, emissiveIntensity: 0.5, roughness: 0.4 });
  [[-3.6, 2.2], [0.4, 2.2], [3.4, 2.2]].forEach(p => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.25, 0.12), winMat);
    w.position.set(p[0], p[1], 3.26); hero.add(w);
  });
  hero.add(cornStrings(1.4, 2.9, 3.34));

  /* 一字坡支架（贴屋面起坡：后排立柱在屋顶，前排在檐口） */
  const canopy = new THREE.Group();
  const SLOPE = 18 * Math.PI / 180;                        /* 坡角 18° */
  const PN_X = 10, PN_Z = 7;                               /* 10×7 铺满屋面并出檐（一字坡支架出檐为真实工艺） */
  const PW = 1.06, PH = 0.7;                               /* 单块占地 ≈2.3×1.1m 缩比 */
  const arrW = PN_X * PW, arrD = PN_Z * PH;
  /* 支架：后排高立柱 + 前排矮立柱 + 斜梁 + 檩条 */
  const postGeo = new THREE.CylinderGeometry(0.07, 0.07, 1, 8);
  const baseGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);    /* 混凝土墩 */
  const zEdge = 3.0, zBack = zEdge - Math.cos(SLOPE) * arrD;
  const hLow = 4.15, hHigh = hLow + Math.sin(SLOPE) * arrD;
  for (let i = 0; i < 6; i++) {
    const x = -arrW / 2 + i * (arrW / 5);
    [[zEdge, hLow], [zBack, hHigh]].forEach(pair => {
      const legH = pair[1] - 3.62;                          /* 自屋面起 */
      const post = new THREE.Mesh(postGeo, steelMat);
      post.scale.y = Math.max(legH, 0.18);
      post.position.set(x, 3.62 + post.scale.y / 2, pair[0]);
      post.castShadow = true; canopy.add(post);
      const base = new THREE.Mesh(baseGeo, concreteMat);
      base.position.set(x, 3.85, pair[0]); base.scale.y = 0.4; canopy.add(base);
    });
    const rb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, Math.hypot(arrD * Math.cos(SLOPE), arrD * Math.sin(SLOPE)) + 0.3), steelMat);
    rb.position.set(x, (hLow + hHigh) / 2, (zEdge + zBack) / 2);
    rb.rotation.x = SLOPE; rb.castShadow = true; canopy.add(rb);
  }
  for (let j = 0; j < 6; j++) {
    const t = j / 5;
    const purlin = new THREE.Mesh(new THREE.BoxGeometry(arrW + 0.3, 0.06, 0.06), steelMat);
    purlin.position.set(0, hLow + (hHigh - hLow) * t + 0.1, zEdge + (zBack - zEdge) * t);
    canopy.add(purlin);
  }
  /* 板阵：贴坡满铺（板面倾角与支架坡向一致：南低北高 = rotation.x 取 +SLOPE） */
  const panelGeo = new THREE.BoxGeometry(1.04, 0.05, 0.68);
  const frameGeo = new THREE.BoxGeometry(1.06, 0.035, 0.7);
  const heroPanels = new THREE.InstancedMesh(panelGeo, pvMat, PN_X * PN_Z);
  const heroFrames = new THREE.InstancedMesh(frameGeo, aluMat, PN_X * PN_Z);
  heroPanels.castShadow = heroFrames.castShadow = true;
  const dummy = new THREE.Object3D();
  let pi = 0;
  for (let r = 0; r < PN_Z; r++) for (let c = 0; c < PN_X; c++) {
    const t = (r + 0.5) / PN_Z;
    dummy.position.set(-arrW / 2 + (c + 0.5) * PW, hLow + (hHigh - hLow) * t + 0.17, zEdge + (zBack - zEdge) * t);
    dummy.rotation.set(SLOPE, 0, 0);
    dummy.updateMatrix();
    heroPanels.setMatrixAt(pi, dummy.matrix);
    dummy.position.y -= 0.04; dummy.updateMatrix();
    heroFrames.setMatrixAt(pi, dummy.matrix);
    pi++;
  }
  canopy.add(heroPanels); canopy.add(heroFrames);
  hero.add(canopy);

  /* 逆变器（挂南墙，散热鳍片+指示屏） */
  const inverter = new THREE.Group();
  const invBox = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.9, 0.26), new THREE.MeshStandardMaterial({ color: 0xD8DDE4, metalness: 0.4, roughness: 0.5 }));
  invBox.castShadow = true; inverter.add(invBox);
  for (let i = 0; i < 7; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.1), aluMat);
    fin.position.set(-0.26 + i * 0.086, 0, -0.16); inverter.add(fin);
  }
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: 0x7FBF8E }));
  led.position.set(0.2, 0.3, 0.14); inverter.add(led);
  const invScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.14),
    new THREE.MeshBasicMaterial({ color: 0x9ADCB4 }));
  invScreen.position.set(-0.06, 0.28, 0.14); inverter.add(invScreen);
  inverter.position.set(4.9, 1.5, 3.0);
  inverter.rotation.y = -Math.PI / 2; hero.add(inverter);

  /* 电表箱（门侧，表盘读数） */
  const meterBox = new THREE.Group();
  const mbody = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.35, 0.4), new THREE.MeshStandardMaterial({ color: 0xEDEFF2, metalness: 0.3, roughness: 0.5 }));
  mbody.castShadow = true; meterBox.add(mbody);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24), new THREE.MeshStandardMaterial({ color: 0x14273E, emissive: 0x2A4A6E, emissiveIntensity: 0.9 }));
  dial.position.set(0, 0.16, 0.15); meterBox.add(dial);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.13, 0.012), new THREE.MeshBasicMaterial({ color: 0xE8CF9A }));
  needle.scale.set(1.6, 1.8, 1); needle.position.set(0.03, 0.29, 0.22); needle.rotation.z = -0.7; meterBox.add(needle);
  dial.position.set(0, 0.24, 0.21);
  meterBox.position.set(2.6, 1.55, 3.28); hero.add(meterBox);

  /* 院墙 + 门楼 + 生活痕迹 */
  const wallL = wallRun(12); wallL.position.set(-1, 0, 10.6); hero.add(wallL);
  const wallR = wallRun(6); wallR.position.set(5, 0, 10.6); hero.add(wallR);
  const gate = gatehouse(); gate.position.set(-5.6, 0, 10.6); hero.add(gate);
  hero.add(firewood(-5.4, 6.8));
  hero.add(clothesline(-4.6, 7.6, -0.5, 8.6, 2.3));
  hero.position.set(0, 0, -4);
  scene.add(hero);

  /* ---------- 邻院（两坡瓦顶 + 人字坡顺坡满铺） ---------- */
  const neighbor = new THREE.Group();
  const nb = new THREE.Mesh(new THREE.BoxGeometry(8, 3.2, 5.6), wallMat);
  nb.position.y = 1.6; nb.castShadow = nb.receiveShadow = true; neighbor.add(nb);
  /* 两坡屋顶：正脊 + 双坡面 */
  const N_SLOPE = 30 * Math.PI / 180;
  const roofHalfW = 3.1, roofH = Math.tan(N_SLOPE) * roofHalfW;
  function slopeRoof(sign) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.1, Math.hypot(roofHalfW, roofH)), tileMat);
    m.position.set(0, 3.2 + roofH / 2, sign * roofHalfW / 2);
    m.rotation.x = sign * N_SLOPE;
    m.castShadow = true; neighbor.add(m);
    return m;
  }
  slopeRoof(1); slopeRoof(-1);
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 8.7, 8), tileMat);
  ridge.rotation.z = Math.PI / 2; ridge.position.set(0, 3.2 + roofH + 0.05, 0); neighbor.add(ridge);
  /* 人字坡板：南坡满铺 5×3=15，北坡 2/3 铺 5×2=10（共 25 块） */
  const NB_COUNT = 25;
  const nbPanels = new THREE.InstancedMesh(panelGeo, pvMat, NB_COUNT);
  const nbFrames = new THREE.InstancedMesh(frameGeo, aluMat, NB_COUNT);
  nbPanels.castShadow = nbFrames.castShadow = true;
  let ni = 0;
  function laySlopePanels(sign, rows) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < 5; c++) {
      const t = (r + 0.5) / 3;
      const zz = sign * (t * roofHalfW * 0.9);
      dummy.position.set(-3.2 + c * 1.6, 3.2 + roofH - Math.tan(N_SLOPE) * Math.abs(zz) + 0.14, zz);
      dummy.rotation.set(sign * N_SLOPE, 0, 0);
      dummy.updateMatrix();
      nbPanels.setMatrixAt(ni, dummy.matrix);
      dummy.position.y -= 0.04; dummy.updateMatrix();
      nbFrames.setMatrixAt(ni, dummy.matrix);
      ni++;
    }
  }
  laySlopePanels(1, 3); laySlopePanels(-1, 2);
  neighbor.add(nbPanels); neighbor.add(nbFrames);
  /* 邻院墙与厢房 */
  const nWall = wallRun(9); nWall.position.set(0, 0, 5.6); neighbor.add(nWall);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(3, 2.4, 3.6), wallMat);
  wing.position.set(-4.6, 1.2, 1.4); wing.castShadow = true; neighbor.add(wing);
  neighbor.add(firewood(4.4, 4.2));
  neighbor.position.set(-19, 0, -1); neighbor.rotation.y = 0.06;
  scene.add(neighbor);

  /* ---------- 巷道两侧中保真院落 14 座：房型与装法解耦 ---------- */
  let seed = 20261019;
  function rnd() { seed = (seed * 48271) % 2147483647; return seed / 2147483647; }
  const G_SLOPE = 28 * Math.PI / 180;
  const midLots = [];
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 7; i++) {
      midLots.push({
        x: -52 + i * 16 + (rnd() - 0.5) * 3, z: 16 + side * (12 + rnd() * 3),
        ry: (rnd() - 0.5) * 0.12, pv: rnd() < 0.8,
        flat: rnd() < 0.55,                          /* 房型：平顶 / 两坡瓦顶 */
        mount: rnd() < 0.5 ? "canopy" : "aframe",    /* 装法：一字坡支架 / 人字坡架（平房两种都能装） */
        w: 8 + rnd() * 2.5, d: 5.4 + rnd() * 1.2, h: 3 + rnd() * 0.8
      });
    }
  }
  const flatLots = midLots.filter(L => L.flat), gableLots = midLots.filter(L => !L.flat);
  const midWallMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.95 });
  midWallMat.map = wallMat.map || null;
  const midBodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), midWallMat, midLots.length);
  midBodies.castShadow = midBodies.receiveShadow = true;
  const flatSlabs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.22, 1), concreteMat, flatLots.length);
  flatSlabs.castShadow = true;
  const flatPara = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.34, 0.14), wallMat, flatLots.length * 2);
  const midTileMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.85 });
  midTileMat.map = tileMat.map || null;
  const gableA = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.09, 1), midTileMat, gableLots.length);
  const gableB = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.09, 1), tileMat, gableLots.length);
  gableA.castShadow = gableB.castShadow = true;
  const gableRidge = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 6), tileMat, gableLots.length);
  const midPosts = new THREE.InstancedMesh(postGeo, steelMat, flatLots.length * 8);
  midPosts.castShadow = true;
  const midPanels = new THREE.InstancedMesh(panelGeo, pvMat, midLots.length * 48);
  const midFrames = new THREE.InstancedMesh(frameGeo, aluMat, midLots.length * 48);
  let mi = 0, fi = 0, pi4 = 0, gi = 0, ti = 0;
  midLots.forEach(function (L, idx) {
    const cos = Math.cos(L.ry), sin = Math.sin(L.ry);
    dummy.position.set(L.x, L.h / 2, L.z); dummy.rotation.set(0, L.ry, 0); dummy.scale.set(L.w, L.h, L.d);
    dummy.updateMatrix(); midBodies.setMatrixAt(idx, dummy.matrix);
    /* 墙面多样性：夯土黄 / 刷白 / 红砖 三色随机 */
    const wallTint = [0xB59A72, 0xD8D2C2, 0xB98A6A][idx % 3];
    midBodies.setColorAt(idx, new THREE.Color(wallTint));
    function local(lx, lz) { return [L.x + lx * cos - lz * sin, L.z + lx * sin + lz * cos]; }
    function placePanel(lx, ly, lz, rx) {
      const p = local(lx, lz);
      dummy.position.set(p[0], ly, p[1]);
      dummy.rotation.set(rx, L.ry, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      midPanels.setMatrixAt(mi, dummy.matrix);
      dummy.position.y -= 0.05; dummy.updateMatrix();
      midFrames.setMatrixAt(mi, dummy.matrix); mi++;
    }
    function placePost(lx, lz, top) {
      const p = local(lx, lz);
      const hh = top - (L.h + 0.22);                 /* 自屋面板起 */
      dummy.position.set(p[0], L.h + 0.22 + hh / 2, p[1]);
      dummy.rotation.set(0, 0, 0); dummy.scale.set(1, Math.max(hh, 0.12), 1); dummy.updateMatrix();
      midPosts.setMatrixAt(ti++, dummy.matrix);
    }
    if (L.flat) {
      /* 平屋顶：屋面板 + 女儿墙 */
      dummy.position.set(L.x, L.h + 0.11, L.z); dummy.rotation.set(0, L.ry, 0); dummy.scale.set(L.w * 1.04, 1, L.d * 1.04);
      dummy.updateMatrix(); flatSlabs.setMatrixAt(fi, dummy.matrix);
      [-1, 1].forEach(s => {
        const lz = s * L.d * 0.52, p = local(0, lz);
        dummy.position.set(p[0], L.h + 0.4, p[1]);
        dummy.rotation.set(0, L.ry, 0); dummy.scale.set(L.w * 1.06, 1, 1);
        dummy.updateMatrix(); flatPara.setMatrixAt(pi4++, dummy.matrix);
      });
      if (L.pv && L.mount === "canopy") {
        /* 平房 × 一字坡支架：前排矮柱 + 后排高柱 + 18° 板面 */
        const zF = L.d * 0.42, zB = -L.d * 0.42, y0 = L.h + 0.85;
        const colX = i => (i - 3.5) * (L.w * 0.88 / 8);
        [-3, -1, 1, 3].forEach(i => {
          placePost(colX(i) * 0.55, zF, y0);
          placePost(colX(i) * 0.55, zB, y0 + Math.tan(SLOPE) * (zF - zB));
        });
        for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
          const lz = zF + (zB - zF) * (r + 0.5) / 4;
          placePanel(colX(c), y0 + Math.tan(SLOPE) * (zF - lz), lz, SLOPE);
        }
      } else if (L.pv) {
        /* 平房 × 人字坡 A 字架：双坡对脊，板随两坡 */
        const span = 1.35, y0 = L.h + 0.6;
        [-1.6, -0.55, 0.55, 1.6].forEach(lx => {
          placePost(lx * (L.w / 6.4), span, y0);
          placePost(lx * (L.w / 6.4), -span, y0);
        });
        [1, -1].forEach(s => {
          for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) {
            const lz = s * (0.35 + r * 0.62);
            const ly = y0 + (span + 0.5 - Math.abs(lz)) * Math.tan(G_SLOPE) + 0.1;
            placePanel((c - 3.5) * (L.w * 0.88 / 8), ly, lz, s * G_SLOPE);
          }
        });
      }
    } else {
      /* 两坡瓦顶：双坡面 + 正脊，人字坡顺坡贴南坡 */
      const halfD = L.d / 2, roofH = Math.tan(G_SLOPE) * halfD, slopeLen = Math.hypot(halfD, roofH) + 0.2;
      [1, -1].forEach(s => {
        const lz = s * halfD / 2, p = local(0, lz);
        dummy.position.set(p[0], L.h + roofH / 2 + 0.05, p[1]);
        dummy.rotation.set(s * G_SLOPE, L.ry, 0); dummy.scale.set(L.w * 1.06, 1, slopeLen);
        dummy.updateMatrix(); (s > 0 ? gableA : gableB).setMatrixAt(gi, dummy.matrix);
        const tileTint = [0x5A5F66, 0x6E6E6E, 0x8E4B3A][gi % 3];
        (s > 0 ? gableA : gableB).setColorAt(gi, new THREE.Color(tileTint));
      });
      dummy.position.set(L.x, L.h + roofH + 0.06, L.z);
      dummy.rotation.set(0, L.ry, Math.PI / 2); dummy.scale.set(1, L.w * 1.08, 1);
      dummy.updateMatrix(); gableRidge.setMatrixAt(gi, dummy.matrix);
      gi++;
      if (L.pv) {
        for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) {
          const lz = ((r + 0.5) / 3) * halfD * 0.86 + 0.08;
          placePanel((c - 3.5) * (L.w * 0.88 / 8), L.h + roofH - Math.tan(G_SLOPE) * lz + 0.13, lz, G_SLOPE);
        }
      }
    }
  });
  midPanels.count = mi; midFrames.count = mi; midPosts.count = ti;
  scene.add(midBodies); scene.add(flatSlabs); scene.add(flatPara);
  scene.add(gableA); scene.add(gableB); scene.add(gableRidge); scene.add(midPosts);
  scene.add(midPanels); scene.add(midFrames);

  /* 远景低模 30 座（雾中剪影，合并几何） */
  const farGeos = [];
  for (let i = 0; i < 20; i++) {
    const g = new THREE.BoxGeometry(7 + rnd() * 4, 3 + rnd() * 1.6, 5 + rnd() * 2);
    const a = rnd() * Math.PI * 2, r = 95 + rnd() * 70;
    g.translate(Math.cos(a) * r, 1.6, Math.sin(a) * r * 0.55 - 30);
    farGeos.push(g);
  }
  const farMerged = mergeGeos(farGeos);
  const farMesh = new THREE.Mesh(farMerged, new THREE.MeshStandardMaterial({ color: 0x4A4234, roughness: 1 }));
  scene.add(farMesh);

  /* ---------- 村史馆广场 + 光伏车棚（巷东头，对应图 04） ---------- */
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(10, 28),
    new THREE.MeshStandardMaterial({ color: 0x8E8E88, roughness: 0.9 }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(66, 0.05, 16); plaza.receiveShadow = true; scene.add(plaza);
  const carport = new THREE.Group();
  const cpPosts = new THREE.InstancedMesh(postGeo, steelMat, 6);
  for (let i = 0; i < 6; i++) {
    dummy.position.set(66 - 4 + (i % 3) * 4, 1.5, 16 + (i < 3 ? -2.2 : 2.2));
    dummy.scale.set(1, 3, 1); dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix(); cpPosts.setMatrixAt(i, dummy.matrix);
  }
  carport.add(cpPosts);
  const cpRoof = new THREE.InstancedMesh(panelGeo, pvMat, 24);
  const cpFrame = new THREE.InstancedMesh(frameGeo, aluMat, 24);
  let ci = 0;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    dummy.position.set(66 - 2.65 + c * 1.06, 3.15 + r * 0.12, 16 - 1.05 + r * 0.7);
    dummy.rotation.set(-0.17, 0, 0); dummy.scale.set(1, 1, 1);
    dummy.updateMatrix(); cpRoof.setMatrixAt(ci, dummy.matrix);
    dummy.position.y -= 0.04; dummy.updateMatrix();
    cpFrame.setMatrixAt(ci, dummy.matrix); ci++;
  }
  carport.add(cpRoof); carport.add(cpFrame);
  scene.add(carport);
  /* 村史馆小屋 */
  const hall = new THREE.Mesh(new THREE.BoxGeometry(7, 3.4, 5), wallMat);
  hall.position.set(66, 1.7, 7); hall.castShadow = hall.receiveShadow = true; scene.add(hall);
  const hallRoof = new THREE.Mesh(roofGeometry(8, 1.6, 6), tileMat);
  hallRoof.position.set(66, 4.1, 7); hallRoof.castShadow = true; scene.add(hallRoof);

  function roofGeometry(w, h, d) {
    const g = new THREE.CylinderGeometry(0.03, 1, h, 4, 1);
    g.rotateY(Math.PI / 4); g.scale(w * 0.72, 1, d * 0.78);
    return g;
  }

  /* ---------- 电杆 + 台区变压器（巷口） ---------- */
  const poleG = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x5A6472, roughness: 0.9 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 9.5, 8), poleMat);
  pole.position.y = 4.75; pole.castShadow = true; poleG.add(pole);
  const cross = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.1), poleMat);
  cross.position.y = 8.6; poleG.add(cross);
  /* 绝缘瓷瓶 */
  [-1.05, 0, 1.05].forEach(x => {
    const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.22, 8),
      new THREE.MeshStandardMaterial({ color: 0xD8DDE4, roughness: 0.4 }));
    ins.position.set(x, 8.75, 0); poleG.add(ins);
  });
  /* 杆上变压器（油箱式 + 散热片） */
  const trans = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.7, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x4E5866, metalness: 0.5, roughness: 0.6 }));
  trans.position.set(0.62, 6.6, 0); trans.castShadow = true; poleG.add(trans);
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.3, 0.9), poleMat);
    f.position.set(0.62 - 0.62 + i * 0.25, 6.6, 0.56); poleG.add(f);
  }
  poleG.position.set(14, 0, 13);
  scene.add(poleG);

  /* ---------- 电气链路线缆 ---------- */
  function cable(p1, p2, sag, r) {
    const mid = p1.clone().lerp(p2, 0.5); mid.y -= sag;
    const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, r || 0.025, 6),
      new THREE.MeshStandardMaterial({ color: 0x22262E, roughness: 0.7 }));
    scene.add(m); return curve;
  }
  /* 板阵→逆变器→电表→电杆→远去 */
  cable(new THREE.Vector3(3.2, 4.9, -0.5), new THREE.Vector3(4.9, 2.1, -1), 0.4);
  cable(new THREE.Vector3(4.9, 1.5, -0.9), new THREE.Vector3(2.6, 1.55, -0.76), 0.08);
  const feedCurve = cable(new THREE.Vector3(2.6, 2.0, -0.72), new THREE.Vector3(13.4, 8.6, 13), 1.4);
  cable(new THREE.Vector3(14.6, 8.6, 13), new THREE.Vector3(34, 7.8, 20), 1.8);
  cable(new THREE.Vector3(14.6, 8.6, 13), new THREE.Vector3(-6, 7.9, 22), 1.6);

  /* ---------- 树（多面体低冠） ---------- */
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x46583C, roughness: 1 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4E3A26, roughness: 1 });
  for (let i = 0; i < 10; i++) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.4, 6), trunkMat);
    trunk.position.y = 0.7; t.add(trunk);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1 + rnd() * 0.6, 0), treeMat);
    crown.position.y = 2 + rnd() * 0.5; crown.castShadow = true; t.add(crown);
    const a = rnd() * Math.PI * 2, r = 34 + rnd() * 80;
    let x = Math.cos(a) * r, z = Math.sin(a) * r * 0.6 - 10;
    if (Math.abs(x) < 17 && z > -16 && z < 14) x += x > 0 ? 22 : -22;
    t.position.set(x, 0, z);
    scene.add(t);
  }
  /* 三轮车 + 标语墙（按主题分配时代表述） */
  scene.add(trike(8, 18.5, 0.4));
  sloganWall(-9.5, 10.2, 0, "乡村全面振兴", true);            /* 主巷口新标语 */
  sloganWall(62, 8.2, -0.35, "清洁能源进村入户", true);        /* 村史馆广场·光伏车棚旁 */
  sloganWall(11.5, 17.6, 0.1, "发展新质生产力", true);          /* 台区变压器巷口 */
  sloganWall(-24, 9.8, 0.05, "乡村振兴", false);               /* 老墙褪红残迹（新旧并置） */

  /* 巷口电杆 ×3 + 光伏院落入户线 */
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.11, 7, 8);
  const POLES = [[-26, 16], [2, 16], [30, 16]];
  const wireMat = new THREE.LineBasicMaterial({ color: 0x1A1C1E });
  POLES.forEach(p => {
    const pole = new THREE.Mesh(poleGeo, concreteMat);
    pole.position.set(p[0], 3.5, p[1]); pole.castShadow = true; scene.add(pole);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), steelMat);
    cross.position.set(p[0], 6.3, p[1]); scene.add(cross);
  });
  midLots.forEach(L => {
    if (!L.pv) return;
    let best = POLES[0], bd = 1e9;
    POLES.forEach(p => { const d = Math.abs(L.x - p[0]); if (d < bd) { bd = d; best = p; } });
    const from = new THREE.Vector3(L.x, L.h + 1.0, L.z + (L.z > 16 ? -L.d / 2 : L.d / 2));
    const to = new THREE.Vector3(best[0], 6.2, best[1]);
    const midP = from.clone().lerp(to, 0.5); midP.y = Math.min(from.y, to.y) - from.distanceTo(to) * 0.06;
    const curve = new THREE.QuadraticBezierCurve3(from, midP, to);
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(14)), wireMat));
  });

  /* ---------- 扬尘微粒 ---------- */
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(80 * 3);
  for (let i = 0; i < 80; i++) {
    dustPos[i * 3] = (rnd() - 0.5) * 130;
    dustPos[i * 3 + 1] = rnd() * 16 + 0.5;
    dustPos[i * 3 + 2] = (rnd() - 0.5) * 100;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xE8CF9A, size: 0.13, transparent: true, opacity: 0.35 }));
  scene.add(dust);

  /* ---------- 收益流：实体线缆 + 光点（板→逆变器→表→杆，3 段共 12 点） ---------- */
  const flowCurves = [
    new THREE.QuadraticBezierCurve3(new THREE.Vector3(2.2, 4.9, -0.6), new THREE.Vector3(4.2, 3.4, -1.2), new THREE.Vector3(4.9, 2.0, -1)),
    new THREE.QuadraticBezierCurve3(new THREE.Vector3(4.9, 1.5, -0.9), new THREE.Vector3(3.7, 1.2, -0.8), new THREE.Vector3(2.6, 1.55, -0.72)),
    feedCurve,
  ];
  /* 实体线缆（沿流光路径的深色导管） */
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x2A2D31, roughness: 0.75 });
  flowCurves.forEach(c => {
    const tube = new THREE.Mesh(new THREE.TubeGeometry(c, 20, 0.028, 5), cableMat);
    tube.castShadow = true; scene.add(tube);
  });
  const dotGeo = new THREE.SphereGeometry(0.09, 8, 8);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xFFD98A });
  const dots = [];
  for (let i = 0; i < 12; i++) { const d = new THREE.Mesh(dotGeo, dotMat); scene.add(d); dots.push(d); }

  /* ---------- 可交互部件表 ---------- */
  const PARTS = [
    { key: "panels", targets: [heroPanels, heroFrames], anchor: new THREE.Vector3(0, 5.9, -2.2) },
    { key: "panels2", targets: [nbPanels], anchor: new THREE.Vector3(-19, 4.6, -0.5) },
    { key: "inverter", targets: [invBox], anchor: new THREE.Vector3(4.9, 2.2, -1) },
    { key: "meter", targets: [mbody], anchor: new THREE.Vector3(2.6, 2.1, -0.72) },
    { key: "transformer", targets: [trans], anchor: new THREE.Vector3(14.6, 7.4, 13) },
    { key: "carport", targets: [cpRoof], anchor: new THREE.Vector3(66, 3.6, 16) },
  ];
  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-2, -2);
  let hover = -1, locked = -1;
  const HI_E = new THREE.Color(0xC8933A);
  const pvBase = new THREE.Color(0x0A1E38);

  /* 引出线（SVG overlay） */
  const wirePath = document.createElementNS(NS, "path");
  wirePath.setAttribute("fill", "none"); wirePath.setAttribute("stroke", "#E8CF9A");
  wirePath.setAttribute("stroke-width", "1"); wirePath.setAttribute("stroke-dasharray", "4 4");
  wirePath.style.display = "none"; svg.appendChild(wirePath);
  const wireDot = document.createElementNS(NS, "circle");
  wireDot.setAttribute("r", "3"); wireDot.setAttribute("fill", "#E8CF9A");
  wireDot.style.display = "none"; svg.appendChild(wireDot);

  /* ---------- 时间滑杆 ---------- */
  let dayT = 1;                                  /* 0=正午 1=黄昏 */
  function setTime(t) {
    dayT = t;
    const az = -0.9 + t * 0.55;                  /* 太阳方位滑动 */
    const el = 0.62 - t * 0.5;                   /* 高度角：正午高→黄昏低 */
    sun.position.set(Math.sin(az) * 80, Math.sin(el) * 60 + 4, Math.cos(az) * 60 + 10);
    sun.target.position.set(0, 0, 0);
    sun.color.set(lerpColor("#FFF2DC", "#FFC98A", t));
    sun.intensity = 1.5 + t * 1.1;
    paintSky(t);
    const sunDir = sun.position.clone().normalize();
    sunDisc.position.copy(sunDir.multiplyScalar(330));
    sunDisc.material.opacity = 0.35 + t * 0.65;
    renderer.shadowMap.needsUpdate = true;        /* 太阳移动后重烘一次阴影 */
  }
  setTime(1);

  /* ---------- 屋顶装法切换（平房顶上：一字坡支架 ⇄ 人字坡 A 字架） ---------- */
  let roofType = "flat";
  const aframeGroup = new THREE.Group();         /* 主宅平房顶上的人字坡 A 字架 */
  function buildAframe() {
    const G = 28 * Math.PI / 180, span = 1.5, y0 = 3.62 + 0.62, ridgeZ = 1.2;
    const afP = new THREE.InstancedMesh(panelGeo, pvMat, 40);
    const afF = new THREE.InstancedMesh(frameGeo, aluMat, 40);
    afP.castShadow = afF.castShadow = true;
    let ai = 0;
    [1, -1].forEach(s => {
      for (let r = 0; r < 2; r++) for (let c = 0; c < 10; c++) {
        const lz = ridgeZ + s * (0.45 + r * 0.68);
        const ly = y0 + (span - (0.45 + r * 0.68)) * Math.tan(G) + 0.12;
        dummy.position.set(-4.77 + c * 1.06, ly, lz);
        dummy.rotation.set(s * G, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
        afP.setMatrixAt(ai, dummy.matrix);
        dummy.position.y -= 0.05; dummy.updateMatrix();
        afF.setMatrixAt(ai, dummy.matrix); ai++;
      }
    });
    afP.count = afF.count = ai;
    aframeGroup.add(afP); aframeGroup.add(afF);
    /* 支架柱：前后两排 */
    for (let i = 0; i < 5; i++) {
      const x = -4.3 + i * 2.15;
      [ridgeZ + span, ridgeZ - span].forEach(z => {
        const post = new THREE.Mesh(postGeo, steelMat);
        post.scale.y = y0 - 3.62; post.position.set(x, 3.62 + post.scale.y / 2, z);
        post.castShadow = true; aframeGroup.add(post);
      });
    }
    /* 脊梁 */
    const rg = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.08, 0.08), steelMat);
    rg.position.set(0, y0 + span * Math.tan(G) + 0.06, ridgeZ); aframeGroup.add(rg);
    aframeGroup.visible = false;
    hero.add(aframeGroup);
    /* 纳入悬停拾取 */
    PARTS[0].targets.push(afP, afF);
  }
  buildAframe();
  function setRoofType(type) {
    roofType = type;
    canopy.visible = type === "flat";      /* 一字坡支架 */
    aframeGroup.visible = type === "gable"; /* 人字坡 A 字架（同在平房顶上） */
  }

  /* ---------- 控制器与观察位 ---------- */
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.06;
  controls.minDistance = 4; controls.maxDistance = 90;
  controls.minPolarAngle = 0.35; controls.maxPolarAngle = 1.35;
  const VIEWPOINTS = {
    panels: { pos: new THREE.Vector3(-6, 6.4, 10), look: new THREE.Vector3(0, 5, -0.4) },
    panels2: { pos: new THREE.Vector3(-13, 6, 7), look: new THREE.Vector3(-19, 4.4, -0.6) },
    inverter: { pos: new THREE.Vector3(8.2, 2.4, 2.4), look: new THREE.Vector3(4.9, 1.7, -1) },
    meter: { pos: new THREE.Vector3(6.4, 2.2, 3.4), look: new THREE.Vector3(2.6, 1.7, -0.72) },
    transformer: { pos: new THREE.Vector3(8, 6.4, 20), look: new THREE.Vector3(14.4, 7.2, 13) },
    carport: { pos: new THREE.Vector3(56, 5.5, 22), look: new THREE.Vector3(66, 2.8, 14) },
    village: { pos: new THREE.Vector3(52, 40, 72), look: new THREE.Vector3(0, 3, 0) },
    lane: { pos: new THREE.Vector3(-20, 5.5, 24), look: new THREE.Vector3(10, 3, 14) },
  };

  canvas.addEventListener("pointermove", e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }, { passive: true });
  canvas.addEventListener("pointerleave", () => { mouse.set(-2, -2); });
  canvas.addEventListener("click", () => {
    if (hover >= 0) { locked = locked === hover ? -1 : hover; return; }
    /* 点击中景院落：弹出该户台账卡 */
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObject(midBodies, false)[0];
    if (hit && hit.instanceId != null && opts.onHousehold) {
      const L = midLots[hit.instanceId];
      const blocks = L.pv ? (L.flat ? 32 : 24) : 0;
      const rate = L.flat ? 30 : 15;
      const mount = !L.pv ? "未安装" : L.flat ? (L.mount === "canopy" ? "一字坡支架" : "人字坡 A 字架") : "人字坡顺坡";
      opts.onHousehold("该院落 · <b>" + mount + "</b>" + (L.pv
        ? " · <b>" + blocks + "</b> 块 × " + rate + " 元 = 年租金约 <b>" + (blocks * rate) + " 元</b>"
        : ""));
      return;
    }
    locked = -1;
  });

  /* ---------- 帧循环 ---------- */
  let running = true, visible = true;
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; });
  const stageIo = new IntersectionObserver(es => { running = es[0].isIntersecting; }, { threshold: 0.02 });
  stageIo.observe(canvas);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
  }
  addEventListener("resize", resize);

  const v3 = new THREE.Vector3();
  let lastT = 0, fpsE = 60, degraded = false;
  function tick(t) {
    requestAnimationFrame(tick);
    if (!running || !visible) return;
    resize();
    const dt = Math.min((t - lastT) / 1000, 0.05); lastT = t;
    /* 帧率守卫：持续低帧自动降载（关扬尘、减半光点） */
    fpsE = fpsE * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05;
    if (!degraded && t > 4000 && fpsE < 42) {
      degraded = true;
      dust.visible = false;
      dots.forEach((d, i) => { if (i % 2) d.visible = false; });
    }
    controls.update();
    if (opts.onFrame) opts.onFrame(dt);
    /* 悬停拾取 */
    ray.setFromCamera(mouse, camera);
    let found = -1;
    for (let i = 0; i < PARTS.length; i++) {
      if (ray.intersectObjects(PARTS[i].targets, false).length) { found = i; break; }
    }
    if (found !== hover) {
      /* 边缘发光：emissive 提亮，不换本色 */
      pvMat.emissive.copy(found >= 0 && (found <= 1) ? HI_E : pvBase);
      pvMat.emissiveIntensity = (found >= 0 && found <= 1) ? 0.5 : 0.18;
      hover = found;
      canvas.style.cursor = hover >= 0 ? "pointer" : "grab";
      if (opts.onHover) opts.onHover(hover >= 0 ? PARTS[hover].key : null);
    }
    /* 引出线：当前悬停或锁定部件 */
    const active = hover >= 0 ? hover : locked;
    if (active >= 0 && opts.cardEl) {
      v3.copy(PARTS[active].anchor).applyMatrix4(new THREE.Matrix4());
      /* 主角院部件的 anchor 已含 hero.position 偏移（hero 位于 (0,0,-4)，邻院 (-19,0,-1)）——锚点定义时已含 */
      v3.copy(PARTS[active].anchor).project(camera);
      const r = canvas.getBoundingClientRect();
      const sx = (v3.x + 1) / 2 * r.width, sy = (-v3.y + 1) / 2 * r.height;
      if (v3.z < 1) {
        const cardR = opts.cardEl.getBoundingClientRect();
        const tx = cardR.left - r.left, ty = cardR.top - r.top + 30;
        const mx = (sx + tx) / 2;
        wirePath.setAttribute("d", "M " + sx.toFixed(1) + " " + sy.toFixed(1) + " L " + mx.toFixed(1) + " " + sy.toFixed(1) + " L " + mx.toFixed(1) + " " + ty.toFixed(1) + " L " + tx.toFixed(1) + " " + ty.toFixed(1));
        wireDot.setAttribute("cx", sx); wireDot.setAttribute("cy", sy);
        wirePath.style.display = ""; wireDot.style.display = "";
      } else { wirePath.style.display = "none"; wireDot.style.display = "none"; }
    } else { wirePath.style.display = "none"; wireDot.style.display = "none"; }
    /* 光点：速度随日照 */
    const speed = (0.25 + dayT * 0.75) * 0.00022;
    dots.forEach((d, i) => {
      const seg = Math.floor(i / 4), u = (t * speed + (i % 4) / 4) % 1;
      d.position.copy(flowCurves[seg].getPoint(u));
    });
    dust.rotation.y = t * 0.00004;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);

  /* ---------- 对外 API ---------- */
  return {
    camera, controls, renderer, scene,
    setTime, setRoofType,
    flyTo(key, immediate) {
      const v = VIEWPOINTS[key];
      if (!v) return;
      camera.position.copy(v.pos);
      controls.target.copy(v.look);
      controls.update();
    },
    getState() { return { hover: hover >= 0 ? PARTS[hover].key : null, locked: locked >= 0 ? PARTS[locked].key : null, roofType }; },
    viewpoints: VIEWPOINTS,
  };
}

/* 简易几何合并（替代 BufferGeometryUtils，零新增依赖） */
function mergeGeos(geos) {
  let vCount = 0, iCount = 0;
  geos.forEach(g => { vCount += g.attributes.position.count; iCount += g.index ? g.index.count : 0; });
  const pos = new Float32Array(vCount * 3);
  const norm = new Float32Array(vCount * 3);
  const idx = new Uint32Array(iCount);
  let vo = 0, io = 0;
  geos.forEach(g => {
    pos.set(g.attributes.position.array, vo * 3);
    norm.set(g.attributes.normal.array, vo * 3);
    const gi = g.index.array;
    for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + vo;
    vo += g.attributes.position.count; io += gi.length;
  });
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(norm, 3));
  merged.setIndex(new THREE.BufferAttribute(idx, 1));
  return merged;
}

/* 贴图工具（模块内复用） */
function makeTex(w, h, draw, repeat) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}
