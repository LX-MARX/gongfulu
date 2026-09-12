/* 沐光共富 · Kimi 智能问答悬浮组件（「屋顶上的共富路」站）
 * 左下角金色「问」按钮 → 聊天面板；由 main.js 动态加载，全站每页生效。
 * 回答分两层：先在本地 FAQ 语料（faq.js，63 条常见问题）里做关键词计分匹配，
 * 命中就直接答，省一次云端往返、断网也能用；不命中再走 auth.js 的 MG.chat
 * （Kimi 边缘函数代理）。云端失败时再做一次放宽阈值的本地尝试，最后才兜底话术。
 */
(function () {
  "use strict";
  if (window.__mgcLoaded) return;
  window.__mgcLoaded = true;

  var GOLD = "#a5832f", GOLD2 = "#c9a04c";
  var FALLBACK = "暂时无法连接智能助手，请稍后再试，或拨打 13721171245 咨询项目组。";
  var WELCOME = "您好！我是沐光共富智能助手，已内置 63 条常见问题（政府、企业、村集体、农户四类），租金、电网容量、防骗识别、申报流程等都能直接答；答不了的会转云端 Kimi 接着答，也可直接向我提问。";
  var CHIPS = ["农户装光伏要出钱吗？", "租金怎么算？", "怎么识别光伏骗局？", "电网容量不够怎么办？"];

  /* ---------- 本地 FAQ 匹配 ----------
   * 计分思路：命中的关键词按字数加权（词越长越特异，权重越高）×3，
   * 再加上用户问句与候选问题之间的二字重合数（捕捉语序相近的问法）。
   * 要求至少命中一个真实关键词（kw>=2）且总分过线，避免「怎么办」这类
   * 万能碎片造成误命中——宁可转给 Kimi，也不要答非所问。 */
  var FAQ_MIN_KW = 2, FAQ_MIN_SCORE = 9;

  function faqNorm(t) {
    return String(t || "").replace(/[？?！!，,。．.、；;：:\s「」『』"'“”‘’（）()]/g, "");
  }
  function faqScore(it, t) {
    var kw = 0;
    for (var j = 0; j < it.k.length; j++) {
      var w = it.k[j];
      if (w && t.indexOf(w) > -1) kw += w.length;
    }
    var q = faqNorm(it.q), bi = 0;
    for (var p = 0; p < q.length - 1; p++) {
      if (t.indexOf(q.substr(p, 2)) > -1) bi++;
    }
    return { kw: kw, score: kw * 3 + bi };
  }
  /* relaxed=true 用于云端失败后的最后一搏：阈值放低，但仍要求有真实关键词命中 */
  function faqMatch(text, relaxed) {
    var list = window.MGFAQ;
    if (!list || !list.length) return null;
    var t = faqNorm(text);
    if (!t) return null;
    var best = null, bestKw = 0, bestScore = 0;
    for (var i = 0; i < list.length; i++) {
      var r = faqScore(list[i], t);
      if (r.score > bestScore) { best = list[i]; bestKw = r.kw; bestScore = r.score; }
    }
    var needScore = relaxed ? 6 : FAQ_MIN_SCORE;
    if (best && bestKw >= FAQ_MIN_KW && bestScore >= needScore) return best;
    return null;
  }
  function faqReply(it) {
    var tail = "";
    if (it.ref) tail = it.ref.indexOf("第") === 0 ? "\n（详见手册 " + it.ref + "）" : "\n（来源：" + it.ref + "）";
    return "【常见问题解答 · " + it.g + "】\n" + it.a + tail;
  }

  /* faq.js 未必已加载（本组件由 main.js 动态挂，各页脚本清单不一），
   * 缺了就在第一次提问前补上；并发调用挂队列，脚本只插一次 */
  var faqCbs = null;
  function ensureFaq(cb) {
    if (window.MGFAQ) { cb(); return; }
    if (faqCbs) { faqCbs.push(cb); return; }
    faqCbs = [cb];
    var s = document.createElement("script");
    s.src = "assets/js/faq.js?v=20260912";
    function done() {
      var cbs = faqCbs; faqCbs = null;
      cbs.forEach(function (f) { f(); });
    }
    s.onload = done;
    s.onerror = function () { console.warn("[共富路] faq.js 加载失败，本地问答不可用"); done(); };
    document.body.appendChild(s);
  }

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
    '<div class="mgc-head"><div><b>沐光共富智能助手</b><span>已内置 63 条常见问题，也可直接向我提问</span></div>' +
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
    /* 云端不通时的最后一步：放宽阈值再捞一次本地语料，捞不到才亮兜底话术 */
    var localOrFallback = function () {
      var hit = faqMatch(text, true);
      finish(hit ? faqReply(hit) : FALLBACK);
    };
    try {
      ensureFaq(function () {
        var hit = faqMatch(text, false);
        if (hit) { finish(faqReply(hit)); return; }
        if (!window.MG || typeof MG.chat !== "function") { localOrFallback(); return; }
        Promise.resolve(MG.chat(hist.slice(-10))).then(function (r) {
          if (r && r.reply) finish(r.reply); else localOrFallback();
        }, localOrFallback);
      });
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

  /* 语料提前预热：首次提问时不用等网络往返 */
  ensureFaq(function () { });
})();
