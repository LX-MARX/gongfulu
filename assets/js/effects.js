/* 「屋顶上的共富路」v3.2 八处核心 3D/高级动效：原生 Canvas 2D + CSS 3D，零框架 */
(function () {
  "use strict";
  var STATIC = /[?&]static=1/.test(location.search) ||
    (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var FX = window.FX = {};

  function fit(cv) {
    var r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.max(2, r.width * d); cv.height = Math.max(2, r.height * d);
    var ctx = cv.getContext("2d"); ctx.setTransform(d, 0, 0, d, 0, 0);
    return { ctx: ctx, w: r.width, h: r.height };
  }

  FX.village = function (cv) {
    var o = fit(cv), ctx = o.ctx;
    var houses = [];
    var R = 9, C = 13, TW = 46, TH = 23;
    for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
      if (Math.random() < .16) continue;
      houses.push({ r: r, c: c, hh: 14 + Math.random() * 20, tw: Math.random() * 6.28 });
    }
    var mx = 0, my = 0, tmx = 0, tmy = 0, sink = 0;
    addEventListener("mousemove", function (e) {
      tmx = (e.clientX / innerWidth - .5) * 40; tmy = (e.clientY / innerHeight - .5) * 40;
    }, { passive: true });
    addEventListener("scroll", function () {
      sink = Math.min(1, scrollY / (innerHeight * .9));
    }, { passive: true });
    function iso(r, c) {
      var cx = o.w / 2, cy = o.h * .34;
      return [cx + (c - r) * TW * .5, cy + (c + r) * TH * .5];
    }
    var t = 0;
    function draw() {
      t += .016;
      mx += (tmx - mx) * .05; my += (tmy - my) * .05;
      ctx.clearRect(0, 0, o.w, o.h);
      var fog = sink * .55, drop = sink * 120;
      ctx.save();
      ctx.translate(mx, my + drop);
      ctx.globalAlpha = 1 - fog * .8;
      ctx.fillStyle = "rgba(18,35,58,.55)";
      var g0 = iso(0, 0), g1 = iso(0, C), g2 = iso(R, C), g3 = iso(R, 0);
      ctx.beginPath(); ctx.moveTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1]); ctx.lineTo(g2[0], g2[1]); ctx.lineTo(g3[0], g3[1]); ctx.closePath(); ctx.fill();
      houses.sort(function (a, b) { return (a.r + a.c) - (b.r + b.c); });
      houses.forEach(function (h) {
        var p = iso(h.r, h.c), x = p[0], y = p[1], hw = TW * .34, hh = h.hh;
        ctx.fillStyle = "#16293f";
        ctx.beginPath(); ctx.moveTo(x - hw, y); ctx.lineTo(x, y + hw * .5); ctx.lineTo(x, y + hw * .5 - hh); ctx.lineTo(x - hw, y - hh); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#101f31";
        ctx.beginPath(); ctx.moveTo(x + hw, y); ctx.lineTo(x, y + hw * .5); ctx.lineTo(x, y + hw * .5 - hh); ctx.lineTo(x + hw, y - hh); ctx.closePath(); ctx.fill();
        var tw = (Math.sin(t * 1.6 + h.tw) + 1) / 2;
        var grd = ctx.createLinearGradient(x - hw, y - hh, x + hw, y - hh);
        grd.addColorStop(0, "rgba(138,106,42,.95)");
        grd.addColorStop(.5, "rgba(" + (212 + tw * 28 | 0) + "," + (168 + tw * 47 | 0) + ",75,.95)");
        grd.addColorStop(1, "rgba(138,106,42,.95)");
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.moveTo(x - hw, y - hh); ctx.lineTo(x, y - hh + hw * .5); ctx.lineTo(x + hw, y - hh); ctx.lineTo(x, y - hh - hw * .5); ctx.closePath(); ctx.fill();
        if (tw > .92) {
          ctx.fillStyle = "rgba(240,215,140," + (tw - .9) * 8 + ")";
          ctx.beginPath(); ctx.arc(x + Math.sin(h.tw * 9) * hw * .4, y - hh - hw * .2, 2.2, 0, 6.28); ctx.fill();
        }
      });
      ctx.restore();
      if (fog > 0) {
        var fg = ctx.createLinearGradient(0, o.h * .3, 0, o.h);
        fg.addColorStop(0, "rgba(10,22,40,0)"); fg.addColorStop(1, "rgba(10,22,40," + fog + ")");
        ctx.fillStyle = fg; ctx.fillRect(0, 0, o.w, o.h);
      }
      if (!STATIC) requestAnimationFrame(draw);
    }
    draw();
  };

  FX.particles = function (cv) {
    var o = fit(cv), ctx = o.ctx, N = 800;
    /* 屋顶轮廓取点：约四成撒左坡、四成撒右坡、两成撒檐线，
       粒子被各自目标点吸住后自然拼出三角屋顶的剪影 */
    var targets = [];
    function roofTargets() {
      targets = [];
      var cx = o.w / 2, cy = o.h * .42, W = o.w * .36, H = o.h * .3;
      for (var i = 0; i < N; i++) {
        var u = Math.random(), side = Math.random();
        var x, y;
        if (side < .4) { x = cx - W / 2 + u * W / 2; y = cy - u * H; }
        else if (side < .8) { x = cx + u * W / 2; y = cy - H + u * H; }
        else { x = cx - W / 2 + u * W; y = cy + Math.random() * 6; }
        targets.push([x, y]);
      }
    }
    roofTargets();
    var ps = [];
    for (var i = 0; i < N; i++) ps.push({ x: Math.random() * o.w, y: Math.random() * o.h, vx: 0, vy: 0 });
    var mx = -9999, my = -9999;
    cv.addEventListener("mousemove", function (e) {
      var r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top;
    }, { passive: true });
    cv.addEventListener("mouseleave", function () { mx = my = -9999; });
    function step() {
      ctx.fillStyle = "rgba(10,22,40,.18)"; ctx.fillRect(0, 0, o.w, o.h); // 尾迹
      ctx.shadowBlur = 5; ctx.shadowColor = "rgba(240,215,140,.9)";
      ctx.fillStyle = "rgba(240,215,140,.85)";
      for (var i = 0; i < N; i++) {
        var p = ps[i], tg = targets[i];
        var ax = (tg[0] - p.x) * .012, ay = (tg[1] - p.y) * .012;
        var dx = mx - p.x, dy = my - p.y, d2 = dx * dx + dy * dy;
        if (d2 < 32400) { var f = 180 / (d2 + 400); ax += dx * f * .05; ay += dy * f * .05; }
        p.vx = (p.vx + ax) * .92; p.vy = (p.vy + ay) * .92;
        p.x += p.vx; p.y += p.vy;
        ctx.fillRect(p.x, p.y, 1.6, 1.6);
      }
      ctx.shadowBlur = 0;
      if (!STATIC) requestAnimationFrame(step);
    }
    step();
  };

  FX.cosmos = function (el, faces, onPick) {
    var inner = document.createElement("div");
    inner.className = "cosmos-inner";
    el.appendChild(inner);
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "cosmos-svg");
    el.appendChild(svg);
    var core = document.createElement("div");
    core.className = "cosmos-core";
    core.innerHTML = "四方<br>协同";
    inner.appendChild(core);
    var R = 250, nodes = [];
    var sel = -1, rx = -14, ry = 0, drag = false, lx = 0, ly = 0, auto = !STATIC;
    faces.forEach(function (f, i) {
      var d = document.createElement("div");
      d.className = "cosmos-face";
      d.innerHTML = "<h3>" + f.name + "</h3><p>" + f.brief + "</p>";
      inner.appendChild(d);
      nodes.push({ el: d, ang: i * Math.PI / 2 });
      d.addEventListener("click", function () {
        nodes.forEach(function (n) { n.el.classList.toggle("dimmed", n.el !== d && sel === i); });
        if (sel === i) { sel = -1; d.classList.remove("dimmed"); nodes.forEach(function (n) { n.el.classList.remove("dimmed"); }); if (onPick) onPick(-1); }
        else { sel = i; nodes.forEach(function (n) { n.el.classList.toggle("dimmed", n.el !== d); }); if (onPick) onPick(i); }
      });
    });
    function layout() {
      var w = el.clientWidth, h = el.clientHeight;
      nodes.forEach(function (n, i) {
        var a = n.ang;
        var x = w / 2 + Math.cos(a) * R - 125;
        var y = h / 2 + Math.sin(a) * R * .42 - 60;
        var z = Math.sin(a) * 120 + (sel === i ? 200 : 0);
        n.el.style.transform = "translate3d(" + x + "px," + y + "px," + z + "px) rotateZ(-2deg)";
        var path = svg.childNodes[i];
        if (!path) {
          path = document.createElementNS(svgNS, "path");
          svg.appendChild(path);
        }
        var x2 = x + 125, y2 = y + 60, cx = w / 2, cy = h / 2;
        path.setAttribute("d", "M" + cx + " " + cy + " Q" + ((cx + x2) / 2 + (y2 - cy) * .3) + " " + ((cy + y2) / 2 - (x2 - cx) * .3) + " " + x2 + " " + y2);
      });
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    }
    function tick() {
      if (auto) ry += .15;
      inner.style.transform = "rotateX(" + rx + "deg) rotateY(" + ry + "deg)";
      requestAnimationFrame(tick);
    }
    layout();
    addEventListener("resize", layout);
    if (!STATIC) tick(); else inner.style.transform = "rotateX(-14deg) rotateY(24deg)";
    el.addEventListener("pointerdown", function (e) { drag = true; auto = false; lx = e.clientX; ly = e.clientY; });
    addEventListener("pointermove", function (e) {
      if (!drag) return;
      ry += (e.clientX - lx) * .4; rx -= (e.clientY - ly) * .3;
      rx = Math.max(-60, Math.min(60, rx));
      lx = e.clientX; ly = e.clientY;
      if (STATIC) inner.style.transform = "rotateX(" + rx + "deg) rotateY(" + ry + "deg)";
    });
    addEventListener("pointerup", function () { drag = false; });
  };

  FX.terrain = function (cv, cells) {
    var o = fit(cv), ctx = o.ctx;
    var rot = 0, trot = .6, drag = false, lx = 0, hover = null;
    cv.addEventListener("pointerdown", function (e) { drag = true; lx = e.clientX; });
    addEventListener("pointermove", function (e) { if (drag) { trot += (e.clientX - lx) * .008; lx = e.clientX; } });
    addEventListener("pointerup", function () { drag = false; });
    cv.addEventListener("mousemove", function (e) {
      var r = cv.getBoundingClientRect();
      hover = { x: e.clientX - r.left, y: e.clientY - r.top };
    }, { passive: true });
    cv.addEventListener("mouseleave", function () { hover = null; });
    var t = 0;
    function draw() {
      t += .016; rot += (trot - rot) * .06;
      ctx.clearRect(0, 0, o.w, o.h);
      var n = Math.sqrt(cells.length) | 0;
      var TW = Math.min(150, (o.w * .72) / Math.max(1, n)), TH = TW * .5;
      var BW = TW * .4, UH = TH * 1.15;
      var cx = o.w / 2, cy = o.h * .6;
      var cos = Math.cos(rot), sin = Math.sin(rot);
      var hoverCell = null, hoverDist = 1e9;
      /* 等距投影：格子坐标绕 Y 轴转 rot，x0 横向铺开、z0 当纵深——
         既决定纵向偏移，也当画家算法的排序键（远的先画） */
      var proj = cells.map(function (cell, i) {
        var r = (i / n) | 0, c = i % n;
        var gx = c - (n - 1) / 2, gz = r - (n - 1) / 2;
        var x0 = gx * cos - gz * sin, z0 = gx * sin + gz * cos;
        return { cell: cell, x: cx + x0 * TW, y: cy + z0 * TH - cell.v * UH, depth: z0, bx: cx + x0 * TW, by: cy + z0 * TH };
      });
      proj.sort(function (a, b) { return a.depth - b.depth; });
      proj.forEach(function (p) {
        var v = p.cell.v;
        var k = v / 5;
        var col = "rgba(" + (18 + k * 194 | 0) + "," + (35 + k * 133 | 0) + "," + (58 + k * 17 | 0) + ",";
        var hgt = v * UH;
        ctx.fillStyle = col + ".9)";
        ctx.fillRect(p.bx - BW / 2, p.by - hgt, BW, hgt);
        ctx.fillStyle = "rgba(" + (180 + k * 60 | 0) + "," + (140 + k * 75 | 0) + "," + (60 + k * 15 | 0) + ",.95)";
        ctx.beginPath();
        ctx.moveTo(p.bx, p.by - hgt - BW * .4); ctx.lineTo(p.bx + BW / 2, p.by - hgt); ctx.lineTo(p.bx, p.by - hgt + BW * .4); ctx.lineTo(p.bx - BW / 2, p.by - hgt);
        ctx.closePath(); ctx.fill();
        if (hover) {
          var d = Math.hypot(hover.x - p.bx, hover.y - (p.by - hgt));
          if (d < hoverDist) { hoverDist = d; hoverCell = p; }
        }
      });
      if (hoverCell && hoverDist < 80) {
        var p = hoverCell, hgt = p.cell.v * UH;
        ctx.strokeStyle = "rgba(240,215,140,.9)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.bx, p.by - hgt, 22 + Math.sin(t * 4) * 3, 0, 6.28); ctx.stroke();
        var cw = 190, chh = 76, px = Math.min(o.w - cw - 12, p.bx + 26), py = Math.max(10, p.by - hgt - 90);
        ctx.fillStyle = "rgba(18,35,58,.85)"; ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(px, py, cw, chh, 10); // 旧内核无 roundRect 时降级为直角矩形
        else ctx.rect(px, py, cw, chh);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#F0D78C"; ctx.font = "600 14px sans-serif";
        ctx.fillText(p.cell.name, px + 12, py + 24);
        ctx.fillStyle = "#cfd8e0"; ctx.font = "12.5px sans-serif";
        ctx.fillText(p.cell.label + "：" + p.cell.text, px + 12, py + 46);
        ctx.fillStyle = "#8fa3b5";
        ctx.fillText("拖拽可旋转地形", px + 12, py + 64);
      }
      if (!STATIC) requestAnimationFrame(draw);
    }
    draw();
  };

  FX.ring = function (stage, pct, centerHTML) {
    var ring = document.createElement("div");
    ring.className = "ring3d";
    var deg = 360 * pct;
    ring.innerHTML =
      '<div class="track"></div>' +
      '<div class="fill"></div>';
    var center = document.createElement("div");
    center.className = "ring3d-center";
    center.innerHTML = centerHTML;
    stage.appendChild(ring); stage.appendChild(center);
    var fill = ring.querySelector(".fill");
    /* conic-gradient 按实际度数截断，内圈用 mask 挖空成 22px 环。
       旧版拿四条边框拼四象限再整体旋转，余数角度会被吃掉（108° 只画到 90°） */
    fill.style.border = "none";
    fill.style.background = "conic-gradient(var(--gold2) 0deg, var(--gold) " + deg + "deg, transparent " + deg + "deg)";
    var ringMask = "radial-gradient(farthest-side, transparent calc(100% - 22px), #000 calc(100% - 22px))";
    fill.style.webkitMask = ringMask;
    fill.style.mask = ringMask;
    if (!STATIC) {
      ring.style.transition = "transform 1.4s cubic-bezier(.34,1.56,.64,1)";
      ring.style.transform = "rotateX(60deg) rotateY(-15deg) scale(.6)";
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { ring.style.transform = "rotateX(60deg) rotateY(-15deg) scale(1)"; });
      });
      stage.addEventListener("mousemove", function (e) {
        var r = stage.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        center.style.transform = "translate(calc(-50% + " + x * 14 + "px), calc(-50% + " + y * 10 + "px))";
        ring.style.transform = "rotateX(" + (60 + y * 6) + "deg) rotateY(" + (-15 + x * 8) + "deg) scale(1)";
      });
      stage.addEventListener("mouseleave", function () {
        ring.style.transform = "rotateX(60deg) rotateY(-15deg) scale(1)";
        center.style.transform = "translate(-50%,-50%)";
      });
    }
  };

  FX.radarBall = function (cv, dims, onHover) {
    var o = fit(cv), ctx = o.ctx;
    var ry = 0, rx = .35, auto = !STATIC, drag = false, lx = 0, ly = 0;
    var stars = [];
    for (var i = 0; i < 50; i++) stars.push([Math.random() * o.w, Math.random() * o.h, Math.random() * 6.28]);
    var verts = dims.map(function (d, i) {
      var phi = -Math.PI / 2 + i * 2 * Math.PI / 5;
      return { name: d.name, score: d.score, phi: phi };
    });
    var hoverV = -1, t = 0;
    cv.addEventListener("pointerdown", function (e) { drag = true; auto = false; lx = e.clientX; ly = e.clientY; });
    addEventListener("pointermove", function (e) {
      if (!drag) return;
      ry += (e.clientX - lx) * .008; rx += (e.clientY - ly) * .006;
      rx = Math.max(-1.2, Math.min(1.2, rx)); lx = e.clientX; ly = e.clientY;
    });
    addEventListener("pointerup", function () { drag = false; });
    var hoverPt = null;
    cv.addEventListener("mousemove", function (e) {
      var r = cv.getBoundingClientRect(); hoverPt = { x: e.clientX - r.left, y: e.clientY - r.top };
    }, { passive: true });
    cv.addEventListener("mouseleave", function () { hoverPt = null; hoverV = -1; if (onHover) onHover(-1); });
    /* 投影：先绕 Y（拖拽自转）再绕 X（俯仰），z2 经弱透视缩放后返回，
       调用方拿 z2 判断顶点在球面前侧还是背侧 */
    function project(phi, rad, score) {
      var R = Math.min(o.w, o.h) * .32 * (0.45 + score / 5 * .55) * (rad || 1);
      var x3 = Math.cos(phi) * R, z3 = Math.sin(phi) * R, y3 = 0;
      var x1 = x3 * Math.cos(ry) + z3 * Math.sin(ry);
      var z1 = -x3 * Math.sin(ry) + z3 * Math.cos(ry);
      var y2 = y3 * Math.cos(rx) - z1 * Math.sin(rx) * .8;
      var z2 = z1 * Math.cos(rx);
      var per = 1 + z2 / (R * 6);
      return [o.w / 2 + x1 * per, o.h / 2 + y2 * per - 10, z2];
    }
    function draw() {
      t += .016;
      if (auto) ry += .004;
      ctx.clearRect(0, 0, o.w, o.h);
      stars.forEach(function (s) {
        var a = .25 + .35 * (Math.sin(t + s[2]) + 1) / 2;
        ctx.fillStyle = "rgba(240,215,140," + a * .5 + ")";
        ctx.fillRect(s[0], s[1], 1.5, 1.5);
      });
      ctx.strokeStyle = "rgba(61,90,117,.4)"; ctx.lineWidth = 1;
      for (var lat = -2; lat <= 2; lat++) {
        ctx.beginPath();
        for (var a = 0; a <= 6.3; a += .2) {
          var RR = Math.min(o.w, o.h) * .32;
          var yy = lat / 3 * RR * .8;
          var rr = Math.sqrt(Math.max(0, RR * RR - yy * yy));
          var x1 = Math.cos(a + ry) * rr, z1 = Math.sin(a + ry) * rr;
          var per = 1 + z1 / (RR * 6);
          var px = o.w / 2 + x1 * per, py = o.h / 2 + (yy - z1 * Math.sin(rx) * .6) * per - 10;
          if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      var pts = verts.map(function (v) { return project(v.phi, 1, v.score); });
      ctx.beginPath();
      pts.forEach(function (p, i) { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
      ctx.closePath();
      ctx.fillStyle = "rgba(212,168,75,.28)"; ctx.fill();
      ctx.strokeStyle = "rgba(240,215,140,.95)"; ctx.lineWidth = 2; ctx.stroke();
      hoverV = -1;
      pts.forEach(function (p, i) {
        var front = p[2] > -10;
        var bulge = hoverPt && Math.hypot(hoverPt.x - p[0], hoverPt.y - p[1]) < 26;
        if (bulge) hoverV = i;
        var rr = bulge ? 12 : 7;
        var g = ctx.createRadialGradient(p[0], p[1], 1, p[0], p[1], rr * 2.4);
        g.addColorStop(0, "rgba(240,215,140,1)"); g.addColorStop(1, "rgba(240,215,140,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p[0], p[1], rr * 2.4, 0, 6.28); ctx.fill();
        ctx.fillStyle = front ? "#F0D78C" : "rgba(240,215,140,.4)";
        ctx.beginPath(); ctx.arc(p[0], p[1], rr * (bulge ? 1.3 : 1), 0, 6.28); ctx.fill();
        if (front || bulge) {
          ctx.fillStyle = "#F0F2F5"; ctx.font = "600 14px sans-serif"; ctx.textAlign = "center";
          ctx.fillText(verts[i].name + " " + verts[i].score, p[0], p[1] - 18 - (bulge ? 8 : 0));
        }
      });
      if (onHover) onHover(hoverV);
      if (!STATIC) requestAnimationFrame(draw);
    }
    draw();
  };

  FX.pipeline = function (host) {
    var NS = "http://www.w3.org/2000/svg";
    host.innerHTML =
      '<svg viewBox="0 0 900 240" style="width:100%;height:auto;display:block">' +
      '<defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#3D5A75" stop-opacity=".5"/><stop offset=".5" stop-color="#12233A" stop-opacity=".9"/><stop offset="1" stop-color="#3D5A75" stop-opacity=".5"/>' +
      '</linearGradient></defs>' +
      '<path id="pipePath" d="M60 120 C 260 40, 420 200, 560 120 S 800 60, 850 120" fill="none" stroke="url(#pg)" stroke-width="46" stroke-linecap="round"/>' +
      '<path d="M60 120 C 260 40, 420 200, 560 120 S 800 60, 850 120" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.5"/>' +
      "</svg>";
    var svg = host.querySelector("svg");
    var nodesDef = [[60, "屋顶", "农户出租屋顶，零成本"], [340, "电站", "企业全额投资建设运营"], [620, "电网", "全额上网，0.3545 元/kWh"], [850, "农户", "25 年固定租金现金流"]];
    var nodeEls = [];
    nodesDef.forEach(function (nd, i) {
      var g = document.createElementNS(NS, "g");
      g.style.cursor = "pointer";
      var cx = nd[0], cy = 120;
      if (i === 1) cy = 105; if (i === 2) cy = 135;
      g.innerHTML =
        '<circle cx="' + cx + '" cy="' + cy + '" r="26" fill="rgba(212,168,75,.18)">' +
        '<animate attributeName="r" values="26;34;26" dur="2.6s" repeatCount="indefinite"/></circle>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="13" fill="#D4A84B" stroke="#F0D78C" stroke-width="2"/>' +
        '<text x="' + cx + '" y="' + (cy + 52) + '" text-anchor="middle" fill="#F0D78C" font-size="17" font-weight="700">' + nd[1] + "</text>" +
        '<text x="' + cx + '" y="' + (cy + 74) + '" text-anchor="middle" fill="#a9bccf" font-size="12.5">' + nd[2] + "</text>";
      svg.appendChild(g);
      nodeEls.push(g);
      g.addEventListener("click", function () {
        nodeEls.forEach(function (n2) { n2.classList.remove("pulse"); });
        g.classList.add("pulse");
        var c = g.querySelectorAll("circle")[1];
        c.setAttribute("r", "13");
        var an = document.createElementNS(NS, "animate");
        an.setAttribute("attributeName", "r"); an.setAttribute("values", "13;22;13");
        an.setAttribute("dur", ".8s"); an.setAttribute("repeatCount", "2");
        c.appendChild(an); an.beginElement();
      });
    });
    var orbs = [];
    for (var i = 0; i < 6; i++) {
      var orb = document.createElementNS(NS, "circle");
      orb.setAttribute("r", "7");
      orb.setAttribute("fill", "#F0D78C");
      orb.style.filter = "drop-shadow(0 0 8px rgba(240,215,140,.9))";
      var am = document.createElementNS(NS, "animateMotion");
      am.setAttribute("dur", "9s");
      am.setAttribute("repeatCount", "indefinite");
      am.setAttribute("begin", (-i * 1.5) + "s");
      am.setAttribute("path", "M60 120 C 260 40, 420 200, 560 120 S 800 60, 850 120");
      orb.appendChild(am);
      svg.appendChild(orb);
      orbs.push(am);
    }
    return {
      setSpeed: function (k) { orbs.forEach(function (am) { am.setAttribute("dur", (9 / k) + "s"); }); }
    };
  };

  FX.bars = function (host, items) {
    host.innerHTML = "";
    var max = Math.max.apply(null, items.map(function (i) { return i.v; })) || 1;
    var stage = document.createElement("div");
    stage.className = "bars3d";
    items.forEach(function (it) {
      var h = Math.max(14, it.v / max * 210);
      var b = document.createElement("div");
      b.className = "bar3d";
      b.style.height = h + "px";
      b.innerHTML = '<div class="face" style="height:' + h + 'px"></div>' +
        '<div class="top" style="top:-14px"></div>' +
        '<div class="val">' + it.text + "</div>" +
        '<div class="cap">' + it.name + "</div>";
      stage.appendChild(b);
    });
    host.appendChild(stage);
    if (!STATIC) {
      host.classList.add("bars3d-stage");
      stage.querySelectorAll(".bar3d").forEach(function (b) {
        b.addEventListener("mouseenter", function () { stage.style.transform = "rotateX(0deg)"; });
        b.addEventListener("mouseleave", function () { stage.style.transform = "rotateX(60deg)"; });
      });
    }
  };
})();
