/*
 * 屋顶上的共富路整村光伏服务平台软件 V2.0
 * Copyright (c) 2026 屋顶上的共富路项目组
 * 共享脚本：顶带导航与图签页脚注入、面包屑、模块入场淡入、术语标注、打印与导出、账号面板。
 */
(function () {
  "use strict";
  var STATIC = /[?&]static=1/.test(location.search) ||
    (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (STATIC) document.documentElement.classList.add("static");

  var PAGES = [
    ["index", "首页"], ["model", "通用范式"], ["gov", "政府工作台"], ["ent", "企业工作台"],
    ["village", "村干部工作台"], ["farmer", "农户工作台"], ["tools", "数智工具箱"],
    ["forms", "工作表"],
    ["pension", "光伏养老"], ["eval", "五维评估"], ["cases", "东高垣标杆"],
    ["trust", "背书与成果"]
  ];
  var cur = (location.pathname.split("/").pop() || "index.html").replace(".html", "") || "index";

  var NAVGROUPS = [
    { name: "四方工作台", keys: ["gov", "ent", "village", "farmer"] },
    { name: "数智工具", keys: ["tools", "forms", "eval"] }
  ];

  function buildNav() {
    var nav = document.createElement("nav");
    nav.id = "nav";
    var grouped = {};
    NAVGROUPS.forEach(function (g) { g.keys.forEach(function (k) { grouped[k] = g; }); });
    var links = PAGES.map(function (p) {
      var g = grouped[p[0]];
      if (!g) {
        return '<a href="' + p[0] + '.html"' + (p[0] === cur ? ' class="on"' : "") + ">" + p[1] + "</a>";
      }
      if (g.keys[0] !== p[0]) return "";
      var sub = g.keys.map(function (k) {
        var it = PAGES.filter(function (q) { return q[0] === k; })[0];
        return '<a href="' + it[0] + '.html"' + (it[0] === cur ? ' class="on"' : "") + ">" + it[1] + "</a>";
      }).join("");
      return '<div class="grp' + (g.keys.indexOf(cur) > -1 ? " on" : "") + '">' +
        '<button type="button" aria-haspopup="true">' + g.name + "<i>▾</i></button>" +
        '<div class="sub">' + sub + "</div></div>";
    }).join("");
    nav.innerHTML =
      '<div class="bar">' +
      '<a class="brand" href="index.html"><img src="assets/img/logo.png" alt="项目标识">屋顶上的共富路</a>' +
      '<div class="links" id="navLinks">' + links + "</div>" +
      '<a class="cta" href="#" id="legendEntry">图例</a>' +
      '<a class="cta" href="#" id="qaEntry" style="border-color:rgba(239,231,211,.35);color:#EFE7D3">答疑</a>' +
      '<a class="cta" href="booking.html">预约调研</a>' +
      '<div id="mgNavAcct" hidden></div>' +
      '<button id="navToggle" aria-label="菜单">☰</button>' +
      "</div>";
    document.body.prepend(nav);
    var t = nav.querySelector("#navToggle"), l = nav.querySelector("#navLinks");
    t.addEventListener("click", function () { l.classList.toggle("open"); });
    l.addEventListener("click", function (e) { if (e.target.tagName === "A") l.classList.remove("open"); });
    l.querySelectorAll(".grp > button").forEach(function (b) {
      b.addEventListener("click", function () {
        var g = b.parentElement, was = g.classList.contains("exp");
        l.querySelectorAll(".grp.exp").forEach(function (x) { x.classList.remove("exp"); });
        if (!was) g.classList.add("exp");
      });
    });
  }

  /* —— 图签式页脚 —— */
  function buildFooter() {
    var f = document.createElement("footer");
    f.id = "footer";
    f.innerHTML =
      '<div class="wrap"><div class="cols">' +
      "<div><h4>屋顶上的共富路</h4>" +
      "<p>屋顶上的共富路——整村光伏建设全周期操作方案与数智治理研究</p>" +
      "<p>出品方：屋顶上的共富路项目组丨首个标杆案例：陕西省渭南市大荔县段家镇东高垣村</p></div>" +
      '<div><h4>通用方案</h4><a href="model.html">通用范式</a><a href="gov.html">政府工作台</a><a href="ent.html">企业工作台</a><a href="village.html">村干部工作台</a><a href="farmer.html">农户工作台</a></div>' +
      '<div><h4>工具与评估</h4><a href="tools.html">数智工具箱</a><a href="pension.html">光伏养老</a><a href="eval.html">五维评估</a><a href="booking.html">预约调研</a></div>' +
      '<div><h4>实证与背书</h4><a href="cases.html">东高垣标杆</a><a href="trust.html">背书与成果</a><a href="https://lx-marx.github.io/donggaoyuan-workstation/">相关工具：东高垣数字治理工作站</a><a href="account.html" style="margin-top:10px;opacity:.7">管理入口</a></div>' +
      "</div>" +
      '<div class="bottom"><span>© 2026 屋顶上的共富路项目组</span><span>云端数据库＋离线缓存双模运行</span></div>' +
      "</div>";
    document.body.appendChild(f);
  }

  /* ---------- 面包屑 ---------- */
  function buildCrumb() {
    if (cur === "index") return;
    var name = "";
    PAGES.concat([["booking", "预约调研"]]).forEach(function (p) { if (p[0] === cur) name = p[1]; });
    var host = document.querySelector("[data-crumb]");
    if (!host) return;
    host.innerHTML = '<div class="wrap crumb">首页 &gt; ' + name + "</div>";
  }

  /* ---------- 数字直显 ---------- */
  function counters() {
    var els = document.querySelectorAll("[data-count]");
    els.forEach(function (el) {
      var raw = el.getAttribute("data-count");
      var target = parseFloat(raw);
      if (raw == null || isNaN(target)) return;
      var dec = (raw.split(".")[1] || "").length;
      var suf = el.getAttribute("data-suffix") || "";
      el.textContent = target.toFixed(dec) + suf;
    });
  }

  /* ---------- 模块入场淡入 ---------- */
  function reveal() {
    var els = document.querySelectorAll(".rv");
    if (STATIC) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: .12 });
    function watchRv(root) {
      if (root.nodeType !== 1) return;
      if (root.classList && root.classList.contains("rv")) io.observe(root);
      root.querySelectorAll(".rv").forEach(function (el) { io.observe(el); });
    }
    els.forEach(function (e) { io.observe(e); });
    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (m) { m.addedNodes.forEach(watchRv); });
    });
    var moRoots = document.querySelectorAll("main, #polList, #mList, #steps7, #termList, #formGroups, #guideList, #dspList");
    if (moRoots.length) moRoots.forEach(function (n) { mo.observe(n, { childList: true, subtree: true }); });
    else mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- 术语悬浮释义（点击触发） ---------- */
  function termTips() {
    if (!window.PVDATA || !PVDATA.terms) return;
    annotateTerms();
    var tip = document.createElement("div");
    tip.style.cssText = "position:fixed;z-index:200;max-width:300px;background:rgba(18,40,63,.97);border:1px solid var(--amber);border-radius:0;padding:12px 16px;font-size:13.5px;line-height:1.8;color:var(--ivory);display:none;pointer-events:none";
    document.body.appendChild(tip);
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-term]");
      if (!t) { tip.style.display = "none"; return; }
      var name = t.getAttribute("data-term");
      var hit = PVDATA.terms.find(function (x) { return x.t === name; });
      if (!hit) return;
      tip.innerHTML = "<b style='color:var(--amber)'>" + hit.t + "</b><br>" + hit.d;
      tip.style.display = "block";
      var r = t.getBoundingClientRect();
      tip.style.left = Math.min(innerWidth - 320, r.left) + "px";
      tip.style.top = (r.bottom + 8) + "px";
    });
  }

  function annotateTerms() {
    var aliasTo = {};
    PVDATA.terms.forEach(function (x) {
      x.t.split(/[\/、]/).forEach(function (s) {
        s = s.trim();
        var parts = [s];
        var m = s.match(/^([^（(]+)[（(]([^）)]+)[）)]$/);
        if (m) { parts.push(m[1].trim(), m[2].trim()); }
        parts.forEach(function (a) {
          if (a.length < 2) return;
          if (!aliasTo[a]) aliasTo[a] = x.t;
          var nospace = a.replace(/\s+/g, "");
          if (nospace !== a && nospace.length >= 2 && !aliasTo[nospace]) aliasTo[nospace] = x.t;
        });
      });
    });
    var aliases = Object.keys(aliasTo).sort(function (a, b) { return b.length - a.length; });
    if (!aliases.length) return;
    var re = new RegExp("(" + aliases.map(function (a) {
      return a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("|") + ")");
    var tagged = {};
    var SKIP = { SCRIPT: 1, STYLE: 1, NAV: 1, FOOTER: 1, BUTTON: 1, A: 1, SELECT: 1, INPUT: 1, TEXTAREA: 1, SUMMARY: 1, LABEL: 1, OPTION: 1 };
    var CELL = { P: 1, LI: 1, TD: 1 };
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var el = n.parentElement;
        if (!el || !CELL[el.tagName]) return NodeFilter.FILTER_REJECT;
        for (var p = el; p; p = p.parentElement) {
          if (SKIP[p.tagName] || p.id === "nav" || p.id === "footer" || p.hasAttribute("data-term")) return NodeFilter.FILTER_REJECT;
        }
        return re.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment(), rest = node.nodeValue, m;
      while ((m = re.exec(rest))) {
        var term = aliasTo[m[1]];
        if (tagged[term]) {
          if (m.index > 0) { frag.appendChild(document.createTextNode(rest.slice(0, m.index))); }
          frag.appendChild(document.createTextNode(m[0]));
          rest = rest.slice(m.index + m[0].length);
          continue;
        }
        tagged[term] = 1;
        if (m.index > 0) frag.appendChild(document.createTextNode(rest.slice(0, m.index)));
        var sp = document.createElement("span");
        sp.className = "term-mark";
        sp.setAttribute("data-term", term);
        sp.textContent = m[0];
        frag.appendChild(sp);
        rest = rest.slice(m.index + m[0].length);
      }
      frag.appendChild(document.createTextNode(rest));
      node.parentNode.replaceChild(frag, node);
    });
  }

  /* ---------- 打印隔离与导出 ---------- */
  function unmarkPrintZone() {
    document.body.classList.remove("pz-on");
    document.querySelectorAll(".pz-path,.pz-live").forEach(function (n) {
      n.classList.remove("pz-path", "pz-live");
      n.removeAttribute("data-pz-title");
    });
  }
  window.addEventListener("afterprint", unmarkPrintZone);
  window.PV = {
    print: function () { window.print(); },
    printZone: function (target, title) {
      var el = typeof target === "string" ? document.querySelector(target) : target;
      if (!el) { window.print(); return; }
      unmarkPrintZone();
      el.classList.add("pz-live");
      if (title) el.setAttribute("data-pz-title", title);
      for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) p.classList.add("pz-path");
      document.body.classList.add("pz-on");
      window.print();
      setTimeout(unmarkPrintZone, 60000);
    },
    cmpBars: function (svg, items) {
      var W = 520, H = 150, vb = svg.getAttribute("viewBox");
      if (vb) { var m = vb.trim().split(/[ ,]+/); W = +m[2]; H = +m[3]; }
      var n = items.length, max = Math.max.apply(null, items.map(function (i) { return i.v; })) * 1.2 || 1;
      var barW = Math.min(120, W / (n * 2.2)), floor = H - 20;
      var vFont = n > 2 ? 13.5 : 15, nFont = n > 2 ? 12 : 12.5;
      svg.innerHTML = items.map(function (it, i) {
        var h = it.v / max * (floor - 30), cx = W * (i + .5) / n;
        return '<rect x="' + (cx - barW / 2) + '" y="' + (floor - h) + '" width="' + barW + '" height="' + h + '" fill="' + (it.color || "#D9A441") + '"/>' +
          '<text x="' + cx + '" y="' + (floor - h - 8) + '" text-anchor="middle" fill="#22303f" font-size="' + vFont + '" font-weight="700">' + (it.text != null ? it.text : Math.round(it.v)) + "</text>" +
          '<text x="' + cx + '" y="' + (floor + 16) + '" text-anchor="middle" fill="#5a6b7c" font-size="' + nFont + '">' + it.name + "</text>";
      }).join("");
    },
    csv: function (name, rows) {
      var s = rows.map(function (r) {
        return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(",");
      }).join("\r\n");
      var blob = new Blob(["﻿" + s], { type: "text/csv;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name + ".csv";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }
  };

  /* ---------- 账号面板（入口仅页脚「管理入口」） ---------- */
  function mgLoadJs(src, cb) {
    var s = document.createElement("script");
    s.src = src;
    s.onload = function () { cb(); };
    s.onerror = function () { console.warn("[共富路] 脚本加载失败，已跳过：" + src); cb(); };
    document.body.appendChild(s);
  }
  function mgLoadChain(list, done) {
    var i = 0;
    (function next() {
      if (i >= list.length) { done(); return; }
      mgLoadJs(list[i++], next);
    })();
  }
  function mgEsc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  window.mgEsc = mgEsc;

  function mgBootAddons() {
    var base = "assets/js/", chain = [];
    if (!(window.MG && MG.auth)) {
      if (!window.MG_CONFIG) chain.push(base + "config.js");
      if (!(window.MG && MG.book)) chain.push(base + "api.js");
      chain.push(base + "auth.js");
    }
    chain.push(base + "chat.js", base + "legend.js");
    mgLoadChain(chain, function () {});
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildNav(); buildFooter(); buildCrumb();
    counters(); reveal(); termTips();
    mgBootAddons();
  });
})();
