/* 沐光共富 · Kimi 智能问答悬浮组件（「屋顶上的共富路」站）
 * 左下角金色「问」按钮 → 聊天面板；由 main.js 动态加载，全站每页生效。
 * 依赖 auth.js 提供的 MG.chat(messages) → {reply}；缺失或异常时自动兜底。
 */
(function () {
  "use strict";
  if (window.__mgcLoaded) return;
  window.__mgcLoaded = true;

  var GOLD = "#a5832f", GOLD2 = "#c9a04c";
  var FALLBACK = "暂时无法连接智能助手，请稍后再试，或拨打 13721171245 咨询项目组。";
  var WELCOME = "您好！我是沐光共富智能助手。关于整村光伏共富模式、政策申报、防骗识别、驻村调研等问题，都可以直接问我。";
  var CHIPS = ["这个项目是干什么的？", "农户装光伏要出钱吗？", "怎么识别光伏骗局？", "怎么预约驻村调研？"];

  /* ---------- 样式注入（mgc- 前缀，避免冲突） ---------- */
  var css =
    ".mgc-fab{position:fixed;left:16px;bottom:16px;z-index:9990;width:56px;height:56px;border-radius:50%;border:1px solid rgba(255,255,255,.35);" +
    "background:linear-gradient(135deg," + GOLD2 + "," + GOLD + ");color:#1a1405;font-size:22px;font-weight:700;cursor:pointer;" +
    "box-shadow:0 8px 24px rgba(0,0,0,.4),0 0 0 4px rgba(197,160,76,.15);transition:transform .25s ease,box-shadow .25s ease;display:flex;align-items:center;justify-content:center;font-family:inherit}" +
    ".mgc-fab:hover{transform:scale(1.08);box-shadow:0 10px 30px rgba(0,0,0,.5),0 0 0 6px rgba(197,160,76,.22)}" +
    ".mgc-panel{position:fixed;left:16px;bottom:84px;z-index:9991;width:360px;height:480px;max-height:calc(100vh - 110px);" +
    "background:rgba(20,22,28,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid " + GOLD + ";" +
    "border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.55);display:none;flex-direction:column;overflow:hidden;font-family:inherit}" +
    ".mgc-panel.open{display:flex}" +
    ".mgc-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(197,160,76,.35);background:rgba(197,160,76,.08)}" +
    ".mgc-head b{display:block;font-size:15.5px;color:" + GOLD2 + ";letter-spacing:.04em}" +
    ".mgc-head span{display:block;font-size:12px;color:#b9b2a2;margin-top:3px}" +
    ".mgc-close{background:none;border:0;color:#b9b2a2;font-size:22px;line-height:1;cursor:pointer;padding:4px 8px;border-radius:8px;transition:all .2s}" +
    ".mgc-close:hover{color:#fff;background:rgba(255,255,255,.08)}" +
    ".mgc-body{flex:1;overflow-y:auto;padding:14px 14px 8px;display:flex;flex-direction:column;gap:10px}" +
    ".mgc-body::-webkit-scrollbar{width:6px}.mgc-body::-webkit-scrollbar-thumb{background:rgba(197,160,76,.4);border-radius:3px}" +
    ".mgc-msg{max-width:82%;padding:9px 13px;border-radius:14px;font-size:13.5px;line-height:1.65;word-break:break-word;white-space:pre-wrap}" +
    ".mgc-msg.user{align-self:flex-end;background:linear-gradient(135deg," + GOLD2 + "," + GOLD + ");color:#1a1405;border-bottom-right-radius:4px}" +
    ".mgc-msg.bot{align-self:flex-start;background:#efece4;color:#2a2a2a;border-bottom-left-radius:4px}" +
    ".mgc-chips{display:flex;flex-wrap:wrap;gap:8px;padding:2px 0 6px}" +
    ".mgc-chip{border:1px solid " + GOLD + ";color:" + GOLD2 + ";background:rgba(197,160,76,.08);border-radius:99px;padding:6px 13px;" +
    "font-size:12.5px;cursor:pointer;transition:all .2s;font-family:inherit;text-align:left}" +
    ".mgc-chip:hover{background:" + GOLD + ";color:#1a1405}" +
    ".mgc-thinking{display:inline-flex;align-items:center;gap:5px}" +
    ".mgc-thinking i{width:6px;height:6px;border-radius:50%;background:#8a8378;animation:mgc-blink 1.2s infinite}" +
    ".mgc-thinking i:nth-child(2){animation-delay:.2s}.mgc-thinking i:nth-child(3){animation-delay:.4s}" +
    "@keyframes mgc-blink{0%,80%,100%{opacity:.25}40%{opacity:1}}" +
    ".mgc-input{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(197,160,76,.35);background:rgba(0,0,0,.25)}" +
    ".mgc-input input{flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(197,160,76,.4);border-radius:10px;padding:9px 12px;" +
    "font-size:13.5px;color:#f0ece2;outline:none;font-family:inherit}" +
    ".mgc-input input:focus{border-color:" + GOLD2 + "}" +
    ".mgc-input input::placeholder{color:#8a8378}" +
    ".mgc-send{background:linear-gradient(135deg," + GOLD2 + "," + GOLD + ");border:0;color:#1a1405;font-size:13.5px;font-weight:700;" +
    "border-radius:10px;padding:0 18px;cursor:pointer;transition:filter .2s;font-family:inherit}" +
    ".mgc-send:hover{filter:brightness(1.1)}.mgc-send:disabled{opacity:.5;cursor:not-allowed}" +
    "@media (max-width:560px){.mgc-panel{left:0;right:0;bottom:0;width:100%;height:72vh;max-height:72vh;border-radius:18px 18px 0 0}" +
    ".mgc-fab{left:12px;bottom:12px}}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- 结构 ---------- */
  var fab = document.createElement("button");
  fab.className = "mgc-fab";
  fab.setAttribute("aria-label", "智能问答");
  fab.textContent = "问";

  var panel = document.createElement("div");
  panel.className = "mgc-panel";
  panel.innerHTML =
    '<div class="mgc-head"><div><b>沐光共富智能助手</b><span>政策、模式、申报、手册，有问必答</span></div>' +
    '<button class="mgc-close" aria-label="关闭">×</button></div>' +
    '<div class="mgc-body"></div>' +
    '<div class="mgc-input"><input type="text" placeholder="请输入您的问题…" maxlength="500">' +
    '<button class="mgc-send">发送</button></div>';
  document.body.appendChild(fab);
  document.body.appendChild(panel);

  var body = panel.querySelector(".mgc-body");
  var input = panel.querySelector(".mgc-input input");
  var sendBtn = panel.querySelector(".mgc-send");
  var hist = []; // {role, content}，保留最近 10 条
  var welcomed = false;

  function scrollEnd() { body.scrollTop = body.scrollHeight; }

  function addMsg(role, text) {
    var d = document.createElement("div");
    d.className = "mgc-msg " + (role === "user" ? "user" : "bot");
    d.textContent = text;
    body.appendChild(d);
    scrollEnd();
    return d;
  }

  function addChips() {
    var box = document.createElement("div");
    box.className = "mgc-chips";
    CHIPS.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "mgc-chip";
      b.textContent = c;
      b.addEventListener("click", function () { box.remove(); send(c); });
      box.appendChild(b);
    });
    body.appendChild(box);
    scrollEnd();
  }

  function welcome() {
    if (welcomed) return;
    welcomed = true;
    addMsg("bot", WELCOME);
    addChips();
  }

  var thinkingEl = null;
  function showThinking() {
    thinkingEl = document.createElement("div");
    thinkingEl.className = "mgc-msg bot";
    thinkingEl.innerHTML = '<span style="margin-right:6px">正在思考…</span><span class="mgc-thinking"><i></i><i></i><i></i></span>';
    body.appendChild(thinkingEl);
    scrollEnd();
  }
  function hideThinking() {
    if (thinkingEl) { thinkingEl.remove(); thinkingEl = null; }
  }

  function send(text) {
    text = String(text || "").trim();
    if (!text) return;
    input.value = "";
    addMsg("user", text);
    hist.push({ role: "user", content: text });
    hist = hist.slice(-10);
    sendBtn.disabled = true;
    showThinking();
    var finish = function (reply) {
      hideThinking();
      sendBtn.disabled = false;
      reply = (reply && String(reply).trim()) ? String(reply) : FALLBACK;
      addMsg("bot", reply);
      hist.push({ role: "assistant", content: reply });
      hist = hist.slice(-10);
      input.focus();
    };
    try {
      if (!window.MG || typeof MG.chat !== "function") { finish(FALLBACK); return; }
      Promise.resolve(MG.chat(hist.slice(-10))).then(function (r) {
        finish(r && r.reply);
      }, function () { finish(FALLBACK); });
    } catch (e) { finish(FALLBACK); }
  }

  fab.addEventListener("click", function () {
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) { welcome(); input.focus(); }
  });
  panel.querySelector(".mgc-close").addEventListener("click", function () {
    panel.classList.remove("open");
  });
  sendBtn.addEventListener("click", function () { send(input.value); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); send(input.value); }
  });
})();
