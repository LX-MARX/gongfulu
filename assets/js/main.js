/* 「屋顶上的共富路」v3.2 共享脚本：导航/页脚注入 + 全局动效 */
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

  /* ---------- 导航 ---------- */
  // 页面多了以后顶栏放不下，把四个角色工作台和数智工具各收进一个下拉；
  // 这里按「用户找入口」的思路分组，PAGES 本身不动，面包屑还按原表查名字
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
      if (g.keys[0] !== p[0]) return ""; // 整组只在组内第一个页面处渲染一次
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
      '<a class="cta" href="booking.html">预约调研</a>' +
      '<div id="mgNavAcct"><a class="mga-login" href="account.html">登录 / 注册</a></div>' +
      '<button id="navToggle" aria-label="菜单">☰</button>' +
      "</div>";
    document.body.prepend(nav);
    var t = nav.querySelector("#navToggle"), l = nav.querySelector("#navLinks");
    t.addEventListener("click", function () { l.classList.toggle("open"); });
    l.addEventListener("click", function (e) { if (e.target.tagName === "A") l.classList.remove("open"); });
    // 触屏没有 hover，下拉改成点按展开；桌面端靠 CSS :hover，两者不冲突
    l.querySelectorAll(".grp > button").forEach(function (b) {
      b.addEventListener("click", function () {
        var g = b.parentElement, was = g.classList.contains("exp");
        l.querySelectorAll(".grp.exp").forEach(function (x) { x.classList.remove("exp"); });
        if (!was) g.classList.add("exp");
      });
    });
  }

  /* —— 页脚 —— */
  function buildFooter() {
    var f = document.createElement("footer");
    f.id = "footer";
    f.innerHTML =
      '<div class="wrap"><div class="cols">' +
      "<div><h4>沐光共富 Solar Common</h4>" +
      "<p>屋顶上的共富路——整村光伏建设全周期操作方案与数智治理研究</p>" +
      "<p>出品方：屋顶上的共富路项目组丨首个标杆案例：陕西省渭南市大荔县段家镇东高垣村</p></div>" +
      '<div><h4>通用方案</h4><a href="model.html">通用范式</a><a href="gov.html">政府工作台</a><a href="ent.html">企业工作台</a><a href="village.html">村干部工作台</a><a href="farmer.html">农户工作台</a></div>' +
      '<div><h4>工具与评估</h4><a href="tools.html">数智工具箱</a><a href="pension.html">光伏养老</a><a href="eval.html">五维评估</a><a href="booking.html">预约调研</a></div>' +
      '<div><h4>实证与背书</h4><a href="cases.html">东高垣标杆</a><a href="trust.html">背书与成果</a><a href="https://lx-marx.github.io/donggaoyuan-workstation/">相关工具：东高垣数字治理工作站</a></div>' +
      "</div>" +
      '<div class="bottom">© 2026 沐光共富 Solar Common丨屋顶上的共富路项目组丨云端数据库＋离线缓存双模运行</div>' +
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

  /* ---------- 鼠标聚光灯 ---------- */
  function spotlight() {
    var el = document.createElement("div");
    el.id = "spot";
    document.body.appendChild(el);
    document.addEventListener("mousemove", function (e) {
      el.style.setProperty("--sx", e.clientX + "px");
      el.style.setProperty("--sy", e.clientY + "px");
    }, { passive: true });
  }

  /* ---------- 数字滚动 1.8s ease-out-expo ---------- */
  function counters() {
    var els = document.querySelectorAll("[data-count]");
    if (!els.length) return;
    function run(el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var dec = (el.getAttribute("data-count").split(".")[1] || "").length;
      var suf = el.getAttribute("data-suffix") || "";
      if (STATIC) { el.textContent = target.toFixed(dec) + suf; return; }
      var t0 = null;
      function frame(t) {
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / 1800);
        var e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p); // ease-out-expo
        el.textContent = (target * e).toFixed(dec) + suf;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: .4 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 模块入场 ---------- */
  function reveal() {
    var els = document.querySelectorAll(".rv");
    if (STATIC) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: .12 });
    /* 动态注入的 .rv 元素也要纳入观察，否则永远透明不可见 */
    function watchRv(root) {
      if (root.nodeType !== 1) return;
      if (root.classList && root.classList.contains("rv")) io.observe(root);
      root.querySelectorAll(".rv").forEach(function (el) { io.observe(el); });
    }
    els.forEach(function (e) { io.observe(e); });
    new MutationObserver(function (muts) {
      muts.forEach(function (m) { m.addedNodes.forEach(watchRv); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- 液态金属按钮高光 ---------- */
  function liquid() {
    document.querySelectorAll(".btn").forEach(function (b) {
      if (!b.querySelector(".shine")) {
        var s = document.createElement("span"); s.className = "shine"; b.appendChild(s);
      }
      b.addEventListener("mousemove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
        b.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
        b.style.backgroundPosition = ((e.clientX - r.left) / r.width * 60) + "% 50%";
      });
    });
  }

  // === 磁吸按钮
  function magnet() {
    if (STATIC) return;
    document.querySelectorAll(".magnet").forEach(function (b) {
      b.addEventListener("mousemove", function (e) {
        var r = b.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        var d = Math.hypot(dx, dy);
        if (d < Math.max(r.width, r.height) / 2 + 50) {
          b.style.transform = "translate(" + dx * .12 + "px," + dy * .12 + "px)";
        }
      });
      b.addEventListener("mouseleave", function () { b.style.transform = ""; });
    });
  }

  /* ---------- 3D Tilt 卡片 ---------- */
  function tilt() {
    if (STATIC) return;
    document.querySelectorAll(".tilt").forEach(function (c) {
      c.style.transition = "transform .25s ease-out";
      c.addEventListener("mousemove", function (e) {
        var r = c.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        c.style.transform = "perspective(900px) rotateY(" + x * 16 + "deg) rotateX(" + (-y * 16) + "deg) translateY(-6px)";
        var inner = c.querySelector(".tilt-inner");
        if (inner) inner.style.transform = "translate(" + (-x * 8) + "px," + (-y * 8) + "px)";
      });
      c.addEventListener("mouseleave", function () {
        c.style.transform = "";
        var inner = c.querySelector(".tilt-inner");
        if (inner) inner.style.transform = "";
      });
    });
  }

  /* ---------- 页面切换淡出 ---------- */
  function pageFade() {
    if (STATIC) return;
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a[href$='.html'], a[href*='.html#']");
      if (!a || a.target === "_blank" || a.href.indexOf("file:") !== 0 && a.origin !== location.origin) return;
      var url = new URL(a.href);
      if (url.pathname === location.pathname) return;
      e.preventDefault();
      document.body.classList.add("leaving");
      setTimeout(function () { location.href = a.href; }, 300);
    });
  }

  /* ---------- 术语悬浮释义（正文自动标注 + 悬停查看） ---------- */
  function termTips() {
    if (!window.PVDATA || !PVDATA.terms) return;
    annotateTerms();
    var tip = document.createElement("div");
    tip.style.cssText = "position:fixed;z-index:200;max-width:300px;background:rgba(18,35,58,.95);border:1px solid var(--gold);border-radius:10px;padding:12px 16px;font-size:13.5px;line-height:1.7;color:#dfe6ec;display:none;pointer-events:none;box-shadow:0 10px 30px rgba(0,0,0,.5)";
    document.body.appendChild(tip);
    document.addEventListener("mouseover", function (e) {
      var t = e.target.closest("[data-term]");
      if (!t) { tip.style.display = "none"; return; }
      var name = t.getAttribute("data-term");
      var hit = PVDATA.terms.find(function (x) { return x.t === name; });
      if (!hit) return;
      tip.innerHTML = "<b style='color:var(--gold2)'>" + hit.t + "</b><br>" + hit.d;
      tip.style.display = "block";
      var r = t.getBoundingClientRect();
      tip.style.left = Math.min(innerWidth - 320, r.left) + "px";
      tip.style.top = (r.bottom + 8) + "px";
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest("[data-term]")) tip.style.display = "none";
    });
  }

  /* 在正文段落/列表/表格文本中自动标注术语：只处理静态内容，
     排除导航/页脚/按钮/控件，每个术语每页只标注首次出现处 */
  function annotateTerms() {
    var aliasTo = {}; // 别名 → 规范术语名（组合术语拆分为多个别名）
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
        if (tagged[term]) { // 该术语已标注过，跳过一次出现
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

  /* ---------- 导出工具 ---------- */
  /* 打印隔离：pz-on 期间只输出目标节点（祖先链标记 pz-path），配合 main.css @media print */
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
      if (!el) { window.print(); return; } // 目标不存在时回退整页打印
      unmarkPrintZone();
      el.classList.add("pz-live");
      if (title) el.setAttribute("data-pz-title", title);
      for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) p.classList.add("pz-path");
      document.body.classList.add("pz-on");
      window.print();
      setTimeout(unmarkPrintZone, 60000); // afterprint 未触发时的兜底清理
    },
    /* 双色/多色对比柱：pension、farmer、ent 三页共用 */
    cmpBars: function (svg, items) {
      var W = 520, H = 150, vb = svg.getAttribute("viewBox");
      if (vb) { var m = vb.trim().split(/[ ,]+/); W = +m[2]; H = +m[3]; }
      var n = items.length, max = Math.max.apply(null, items.map(function (i) { return i.v; })) * 1.2 || 1;
      var barW = Math.min(120, W / (n * 2.2)), floor = H - 20;
      var vFont = n > 2 ? 13.5 : 15, nFont = n > 2 ? 12 : 12.5;
      svg.innerHTML = items.map(function (it, i) {
        var h = it.v / max * (floor - 30), cx = W * (i + .5) / n;
        return '<rect x="' + (cx - barW / 2) + '" y="' + (floor - h) + '" width="' + barW + '" height="' + h + '" rx="6" fill="' + (it.color || "#D4A84B") + '"/>' +
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

  /* ---------- 账号区样式（mga- 前缀） ---------- */
  function mgNavStyle() {
    var st = document.createElement("style");
    st.textContent =
      "#mgNavAcct{display:flex;align-items:center;gap:10px;margin-left:14px;white-space:nowrap}" +
      ".mga-login{display:inline-block;padding:7px 18px;border:1px solid var(--gold);color:var(--gold);" +
      "border-radius:99px;font-size:14px;letter-spacing:.04em;text-decoration:none;transition:all .25s}" +
      ".mga-login:hover{background:var(--gold);color:#1a1405}" +
      ".mga-user{position:relative}" +
      ".mga-name{background:none;border:1px solid rgba(165,131,47,.55);color:var(--gold);border-radius:99px;" +
      "padding:7px 16px;font-size:14px;cursor:pointer;font-family:inherit;transition:all .25s}" +
      ".mga-name:hover{background:rgba(165,131,47,.15)}" +
      ".mga-menu{position:absolute;top:calc(100% + 8px);right:0;min-width:150px;background:rgba(22,24,30,.97);" +
      "border:1px solid var(--gold);border-radius:12px;padding:6px;display:none;flex-direction:column;" +
      "box-shadow:0 12px 32px rgba(0,0,0,.5);z-index:1200}" +
      ".mga-menu.open{display:flex}" +
      ".mga-menu [hidden]{display:none!important}" +
      ".mga-menu a,.mga-menu button{display:block;text-align:left;padding:9px 14px;font-size:13.5px;" +
      "color:#e8e4da;text-decoration:none;background:none;border:0;border-radius:8px;cursor:pointer;font-family:inherit}" +
      ".mga-menu a:hover,.mga-menu button:hover{background:rgba(165,131,47,.18);color:var(--gold2,var(--gold))}";
    document.head.appendChild(st);
  }

  /* ---------- 动态脚本加载器：缺什么补什么，最后挂 chat.js / tour.js ---------- */
  function mgLoadJs(src, cb) {
    var s = document.createElement("script");
    s.src = src;
    s.onload = function () { cb(); };
    /* 失败也得继续链条，不然挂在后面的 chat.js / tour.js 一起不加载 */
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

  /* ---------- 导航账号区：未登录→登录/注册；已登录→显示名＋下拉 ---------- */
  function mgRenderAccount() {
    var host = document.getElementById("mgNavAcct");
    if (!host || !window.MG || !MG.auth) return;
    var s = MG.auth.session();
    if (!s || !s.user) {
      host.innerHTML = '<a class="mga-login" href="account.html">登录 / 注册</a>';
      return;
    }
    var name = (s.user.user_metadata && s.user.user_metadata.display_name) ||
      String(s.user.email || "").split("@")[0] || "用户";
    host.innerHTML =
      '<div class="mga-user">' +
      '<button type="button" class="mga-name">' + mgEsc(name) + ' ▾</button>' +
      '<div class="mga-menu">' +
      '<a href="account.html">个人中心</a>' +
      '<a href="admin.html" class="mga-admin" hidden>管理台</a>' +
      '<button type="button" class="mga-out">退出登录</button>' +
      "</div></div>";
    var nameBtn = host.querySelector(".mga-name"), menu = host.querySelector(".mga-menu");
    nameBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      menu.classList.toggle("open");
    });
    document.addEventListener("click", function () { menu.classList.remove("open"); });
    MG.auth.profile().then(function (p) {
      if (p && p.role === "admin") {
        var a = host.querySelector(".mga-admin");
        if (a) a.hidden = false;
      }
    });
    host.querySelector(".mga-out").addEventListener("click", function () {
      MG.auth.signOut().then(function () { location.reload(); });
    });
  }

  /* 已引入 config/api/auth 的页面（account/admin/forms 等）直接复用；
     未引入的页面按需串行补齐，再加载 chat.js / tour.js（全站每页生效）。 */
  function mgBootAddons() {
    var base = "assets/js/", chain = [];
    if (!(window.MG && MG.auth)) {
      if (!window.MG_CONFIG) chain.push(base + "config.js" + "?v=20260910b");
      if (!(window.MG && MG.book)) chain.push(base + "api.js" + "?v=20260910b");
      chain.push(base + "auth.js" + "?v=20260910b");
    }
    chain.push(base + "chat.js" + "?v=20260910b", base + "tour.js" + "?v=20260910b");
    mgLoadChain(chain, mgRenderAccount);
    document.addEventListener("mg-auth-change", mgRenderAccount);
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildNav(); buildFooter(); buildCrumb();
    spotlight(); counters(); reveal(); liquid(); magnet(); tilt(); pageFade(); termTips();
    mgNavStyle(); mgBootAddons();
  });
})();
