/* 沐光共富 · 新手引导（「屋顶上的共富路」站）
 * 首访自动弹出一次（localStorage: mg_tour_done_gongfulu）；
 * 导航账号区左侧常驻「使用指南」按钮，点击可随时重播。
 * 遮罩点击不关闭，必须点按钮操作，防止误触。
 */
(function () {
  "use strict";
  if (window.__mgtLoaded) return;
  window.__mgtLoaded = true;

  var SITE = "gongfulu";
  var KEY = "mg_tour_done_" + SITE;
  var GOLD = "#a5832f", GOLD2 = "#c9a04c";

  var STEPS = [
    {
      t: "欢迎来到「屋顶上的共富路」",
      d: "第一次来，建议先看「通用范式」：一页看懂「政府引导、企业投资、村集体组织、农户参与」的四方协同机制，以及东高垣村 185 户、5.963 MW 的真实数据——后面所有工具都是围绕这套机制设计的。"
    },
    {
      t: "对号入座：四方工作台",
      d: "点顶部导航「四方工作台」下拉菜单：政府看整县推进的政策抓手与流程；企业看投资测算与开发步骤；村干部看 7 步建设法、合同要点与分配方案；农户看自己掏不掏钱、每年拿多少、坏了谁来修。"
    },
    {
      t: "村干部最快上手路径",
      d: "先打开「四方工作台 → 村干部工作台」的 7 步建设法向导，再到「数智工具 → 工作表」在线填写 23 张表（资源摸排、意愿征询、收益分配等），填完可直接按公文格式打印，拿回村里就能用。"
    },
    {
      t: "村庄能不能干：先自评",
      d: "打开「数智工具 → 五维评估」，按提示提交村庄基本情况，系统自动从资源、电网、主体、政策、意愿 5 个维度打分并给出建议；农户还可在「农户工作台」做 4 项门槛自查，同样是填情况后系统自动判定。"
    },
    {
      t: "光伏养老专题",
      d: "「光伏养老」页讲清屋顶租金如何直达老人账户、与城乡居民养老保险如何衔接，内容按宣讲口径编写，给村里老人开会时可以直接照着用。"
    },
    {
      t: "智能助手与账号",
      d: "左下角金色「问」字按钮是智能助手，政策、模式、申报问题直接问；点右上角「登录 / 注册」，登录后填表记录云端存档，换台电脑也能接着填。"
    },
    {
      t: "看实证、约调研",
      d: "「东高垣标杆」看第一个样板村从动员到并网的全过程；想让我们到你村里实地测算，点右上角金色「预约调研」，提交后项目组会电话联系你。"
    }
  ];

  /* ---------- 样式注入（mgt- 前缀） ---------- */
  var css =
    ".mgt-guide{border:1px solid " + GOLD + ";color:" + GOLD2 + ";background:transparent;border-radius:99px;" +
    "padding:6px 14px;font-size:13px;letter-spacing:.04em;cursor:pointer;white-space:nowrap;transition:all .25s;font-family:inherit}" +
    ".mgt-guide:hover{background:" + GOLD + ";color:#1a1405}" +
    ".mgt-mask{position:fixed;inset:0;z-index:10020;background:rgba(8,8,12,.62);backdrop-filter:blur(3px);" +
    "display:flex;align-items:center;justify-content:center;font-family:inherit}" +
    ".mgt-card{width:420px;max-width:92vw;background:rgba(20,22,28,.96);border:1px solid " + GOLD + ";border-radius:18px;" +
    "box-shadow:0 24px 70px rgba(0,0,0,.6);padding:28px 28px 20px;animation:mgt-in .35s ease}" +
    "@keyframes mgt-in{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}" +
    ".mgt-step-no{font-size:12px;color:" + GOLD2 + ";letter-spacing:.15em;margin-bottom:10px}" +
    ".mgt-title{font-size:20px;font-weight:700;color:#f0ece2;margin:0 0 12px;letter-spacing:.02em}" +
    ".mgt-desc{font-size:14px;line-height:1.85;color:#c9c2b2;margin:0 0 22px;min-height:78px}" +
    ".mgt-foot{display:flex;align-items:center;justify-content:space-between;gap:10px}" +
    ".mgt-dots{display:flex;gap:7px}" +
    ".mgt-dots i{width:8px;height:8px;border-radius:50%;background:rgba(197,160,76,.3);transition:all .25s}" +
    ".mgt-dots i.on{background:" + GOLD2 + ";transform:scale(1.25)}" +
    ".mgt-btns{display:flex;gap:8px;align-items:center}" +
    ".mgt-btn{border-radius:99px;padding:8px 18px;font-size:13.5px;cursor:pointer;transition:all .25s;font-family:inherit}" +
    ".mgt-btn.skip{background:none;border:0;color:#8a8378;padding:8px 10px}" +
    ".mgt-btn.skip:hover{color:#c9c2b2}" +
    ".mgt-btn.prev{background:none;border:1px solid rgba(197,160,76,.5);color:#c9c2b2}" +
    ".mgt-btn.prev:hover{border-color:" + GOLD2 + ";color:" + GOLD2 + "}" +
    ".mgt-btn.next{background:linear-gradient(135deg," + GOLD2 + "," + GOLD + ");border:0;color:#1a1405;font-weight:700}" +
    ".mgt-btn.next:hover{filter:brightness(1.1)}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var mask = null, cur = 0;

  function close(markDone) {
    if (mask) { mask.remove(); mask = null; }
    if (markDone) { try { localStorage.setItem(KEY, "1"); } catch (e) { } }
  }

  function render() {
    var s = STEPS[cur], last = cur === STEPS.length - 1;
    mask.querySelector(".mgt-step-no").textContent = "第 " + (cur + 1) + " 步 · 共 " + STEPS.length + " 步";
    mask.querySelector(".mgt-title").textContent = s.t;
    mask.querySelector(".mgt-desc").textContent = s.d;
    var dots = mask.querySelectorAll(".mgt-dots i");
    dots.forEach(function (d, i) { d.classList.toggle("on", i === cur); });
    mask.querySelector(".mgt-btn.prev").style.visibility = cur === 0 ? "hidden" : "visible";
    mask.querySelector(".mgt-btn.next").textContent = last ? "完成" : "下一步";
  }

  function play() {
    if (mask) return;
    cur = 0;
    mask = document.createElement("div");
    mask.className = "mgt-mask";
    mask.innerHTML =
      '<div class="mgt-card" role="dialog" aria-label="使用指南">' +
      '<div class="mgt-step-no"></div>' +
      '<h3 class="mgt-title"></h3>' +
      '<p class="mgt-desc"></p>' +
      '<div class="mgt-foot">' +
      '<button class="mgt-btn skip">跳过</button>' +
      '<div class="mgt-dots">' + STEPS.map(function () { return "<i></i>"; }).join("") + "</div>" +
      '<div class="mgt-btns">' +
      '<button class="mgt-btn prev">上一步</button>' +
      '<button class="mgt-btn next">下一步</button>' +
      "</div></div></div>";
    document.body.appendChild(mask);
    mask.querySelector(".mgt-btn.skip").addEventListener("click", function () { close(true); });
    mask.querySelector(".mgt-btn.prev").addEventListener("click", function () {
      if (cur > 0) { cur--; render(); }
    });
    mask.querySelector(".mgt-btn.next").addEventListener("click", function () {
      if (cur < STEPS.length - 1) { cur++; render(); } else close(true);
    });
    render();
  }

  /* ---------- 常驻入口：导航账号区左侧「使用指南」 ---------- */
  function mountGuide() {
    var acct = document.getElementById("mgNavAcct");
    if (!acct || document.querySelector(".mgt-guide")) return;
    var b = document.createElement("button");
    b.className = "mgt-guide";
    b.type = "button";
    b.textContent = "使用指南";
    b.addEventListener("click", function (e) { e.preventDefault(); play(); });
    acct.parentNode.insertBefore(b, acct);
  }

  window.MGTour = { play: play };

  mountGuide();
  /* 首访自动弹出（只弹一次） */
  var done = null;
  try { done = localStorage.getItem(KEY); } catch (e) { }
  if (!done) setTimeout(play, 800);
})();
