/* 「屋顶上的共富路」左侧锚点导航
 * 自动扫描 main 内带 id 的 section，生成吸顶的窄条导航：
 * 平时只露一列小点，悬停/聚焦时展开出栏目名，当前 section 金色高亮。
 * 之所以做成窄条而不是固定宽栏：各工作台页面的 .wrap 是按满宽设计的，
 * 给 body 硬加 padding-left 会把居中内容顶偏，窄条只借左缘 46px，
 * 1100px 以下干脆不出现，绝不遮挡正文。
 * 页面一个带 id 的 section 都没有时直接不渲染——宁可缺省，不挂空壳。
 * 样式全部从这里注入，不依赖页面额外引 CSS，丢进哪个页面都能用。
 */
(function () {
  "use strict";
  if (window.__pvSideNavLoaded) return; // defer 双引或同事重复引入时别挂两遍
  window.__pvSideNavLoaded = true;

  var CSS =
    "#sideNav{position:fixed;left:14px;top:50%;transform:translateY(-50%);z-index:90;" +
    "width:46px;padding:12px 0;border-radius:14px;overflow:hidden;" +
    "background:rgba(12,25,44,.82);border:1px solid rgba(212,168,75,.28);" +
    "-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);" +
    "box-shadow:0 10px 30px rgba(0,0,0,.35);" +
    "transition:width .3s cubic-bezier(.16,1,.3,1)}" +
    "#sideNav:hover,#sideNav:focus-within{width:172px}" +
    "#sideNav a{display:flex;align-items:center;gap:12px;padding:7px 14px 7px 17px;" +
    "white-space:nowrap;text-decoration:none;color:#b8c4d0;font-size:13px;line-height:1.4;" +
    "transition:color .25s,background .25s}" +
    "#sideNav a i{flex:none;width:8px;height:8px;border-radius:50%;" +
    "background:#7A93AA;transition:background .25s,box-shadow .25s,transform .25s}" +
    "#sideNav a span{opacity:0;transition:opacity .25s;overflow:hidden;text-overflow:ellipsis}" +
    "#sideNav:hover a span,#sideNav:focus-within a span{opacity:1}" +
    "#sideNav a:hover{color:#F0D78C;background:rgba(212,168,75,.08)}" +
    "#sideNav a.on{color:#F0D78C}" +
    "#sideNav a.on i{background:#F0D78C;box-shadow:0 0 10px rgba(240,215,140,.8);transform:scale(1.35)}" +
    "@media(max-width:1099px){#sideNav{display:none}}" +
    "@media print{#sideNav{display:none}}";

  function labelOf(sec) {
    // 页面可以在 section 上写 data-nav 指定短名；否则取第一个标题的文字
    var nav = sec.getAttribute("data-nav");
    if (nav) return nav.trim();
    var h = sec.querySelector("h1,h2,h3");
    if (h && h.textContent.trim()) return h.textContent.trim();
    return sec.id;
  }

  function init() {
    var secs = document.querySelectorAll("main section[id]");
    if (!secs.length) secs = document.querySelectorAll("section[id]");
    var list = [];
    secs.forEach(function (s) {
      // 导航、页脚、公文打印区里的 section 不算正文锚点
      if (s.closest("#nav,#footer,.gov-doc,#sideNav")) return;
      if (list.some(function (x) { return x.id === s.id; })) return;
      list.push(s);
    });
    if (!list.length) return;

    var st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);

    var nav = document.createElement("aside");
    nav.id = "sideNav";
    nav.setAttribute("aria-label", "页内导航");
    var links = list.map(function (sec) {
      var a = document.createElement("a");
      a.href = "#" + sec.id;
      a.innerHTML = "<i></i><span></span>";
      a.querySelector("span").textContent = labelOf(sec);
      a.addEventListener("click", function (e) {
        e.preventDefault();
        sec.scrollIntoView({ behavior: "smooth", block: "start" });
        setActive(a);
        if (history.replaceState) history.replaceState(null, "", "#" + sec.id);
      });
      nav.appendChild(a);
      return a;
    });
    document.body.appendChild(nav);

    function setActive(a) {
      links.forEach(function (x) { x.classList.toggle("on", x === a); });
    }

    /* 用一条中间偏上的「阅读线」判定当前 section：视口顶部 40% 到
       底部 55% 之间的那个算在读，比 threshold 数更贴合长页面的体感 */
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        var i = list.indexOf(en.target);
        if (i > -1) setActive(links[i]);
      });
    }, { rootMargin: "-40% 0px -55% 0px", threshold: 0 });
    list.forEach(function (s) { io.observe(s); });
    setActive(links[0]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
