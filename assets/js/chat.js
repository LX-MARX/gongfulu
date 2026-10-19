/*
 * 屋顶上的共富路整村光伏服务平台软件 V2.0
 * Copyright (c) 2026 屋顶上的共富路项目组
 * 图纸答疑组件：图框右缘悬浮跟随批注签 → 滑出批注栏。
 * 双层问答：本地 FAQ 计分匹配（faq.js，63 条）→ 云端问答边缘函数（MG.chat）→ 放宽阈值本地再试。
 */
(function () {
  "use strict";
  if (window.__mgcLoaded) return;
  window.__mgcLoaded = true;

  var CONTACT = (window.MG_CONFIG && window.MG_CONFIG.CONTACT) || {};
  var FALLBACK = "在线问答暂不可用，请拨打项目组服务电话 " + (CONTACT.phone || "") + " 咨询。";
  var WELCOME = "可直接提问：农户出资、租金、电网容量、防骗识别、申报流程。内置 63 条常见问题解答（政府、企业、村集体、农户四类），未命中转在线问答。";
  var CHIPS = ["农户装光伏要出钱吗？", "租金怎么算？", "怎么识别光伏骗局？", "电网容量不够怎么办？"];

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
    return (it.g ? "【" + it.g + "】\n" : "") + it.a + tail;
  }

  var faqCbs = null;
  function ensureFaq(cb) {
    if (window.MGFAQ) { cb(); return; }
    if (faqCbs) { faqCbs.push(cb); return; }
    faqCbs = [cb];
    var s = document.createElement("script");
    s.src = "assets/js/faq.js";
    function done() { var cbs = faqCbs; faqCbs = null; cbs.forEach(function (f) { f(); }); }
    s.onload = done;
    s.onerror = function () { done(); };
    document.body.appendChild(s);
  }

  var tab = document.createElement("button");
  tab.className = "qa-tab";
  tab.setAttribute("aria-label", "答疑");
  tab.textContent = "答 疑";

  var mask = document.createElement("div");
  mask.className = "qa-mask";

  var panel = document.createElement("div");
  panel.className = "qa-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "图纸答疑");
  panel.innerHTML =
    '<div class="qa-head"><b>答 疑<i>ANNOTATION</i></b>' +
    '<button class="qa-close" aria-label="关闭">×</button></div>' +
    '<div class="qa-body"></div>' +
    '<div class="qa-foot"><input type="text" placeholder="请输入问题…" maxlength="500">' +
    '<button class="qa-send">提问</button></div>';
  document.body.appendChild(tab);
  document.body.appendChild(mask);
  document.body.appendChild(panel);

  var body = panel.querySelector(".qa-body");
  var input = panel.querySelector(".qa-foot input");
  var sendBtn = panel.querySelector(".qa-send");
  var hist = [];
  var welcomed = false;

  function scrollEnd() { body.scrollTop = body.scrollHeight; }
  function addQ(text) {
    var d = document.createElement("div");
    d.className = "qa-q";
    d.textContent = text;
    body.appendChild(d); scrollEnd();
  }
  function addA(text, tag) {
    var d = document.createElement("div");
    d.className = "qa-a";
    if (tag) {
      var t = document.createElement("span");
      t.className = "tag"; t.textContent = tag;
      d.appendChild(t);
    }
    d.appendChild(document.createTextNode(text));
    body.appendChild(d); scrollEnd();
  }
  function addChips() {
    var box = document.createElement("div");
    box.className = "qa-chips";
    CHIPS.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "qa-chip";
      b.textContent = c;
      b.addEventListener("click", function () { box.remove(); send(c); });
      box.appendChild(b);
    });
    body.appendChild(box); scrollEnd();
  }
  function welcome() {
    if (welcomed) return;
    welcomed = true;
    addA(WELCOME, "注记");
    addChips();
  }

  var thinkingEl = null;
  function showThinking() {
    thinkingEl = document.createElement("div");
    thinkingEl.className = "qa-thinking";
    thinkingEl.textContent = "在线问答检索中…";
    body.appendChild(thinkingEl); scrollEnd();
  }
  function hideThinking() {
    if (thinkingEl) { thinkingEl.remove(); thinkingEl = null; }
  }

  function send(text) {
    text = String(text || "").trim();
    if (!text) return;
    input.value = "";
    addQ(text);
    hist.push({ role: "user", content: text });
    hist = hist.slice(-10);
    sendBtn.disabled = true;
    showThinking();
    var finish = function (reply, tag) {
      hideThinking();
      sendBtn.disabled = false;
      reply = (reply && String(reply).trim()) ? String(reply) : FALLBACK;
      addA(reply, tag);
      hist.push({ role: "assistant", content: reply });
      hist = hist.slice(-10);
      input.focus();
    };
    var localOrFallback = function () {
      var hit = faqMatch(text, true);
      finish(hit ? faqReply(hit) : FALLBACK, hit ? "注记" : null);
    };
    try {
      ensureFaq(function () {
        var hit = faqMatch(text, false);
        if (hit) { finish(faqReply(hit), "注记"); return; }
        if (!window.MG || typeof MG.chat !== "function") { localOrFallback(); return; }
        Promise.resolve(MG.chat(hist.slice(-10))).then(function (r) {
          if (r && r.reply) finish(r.reply, "在线问答"); else localOrFallback();
        }, localOrFallback);
      });
    } catch (e) { finish(FALLBACK); }
  }

  function openPanel() {
    panel.classList.add("open"); mask.classList.add("open");
    welcome(); input.focus();
  }
  function closePanel() {
    panel.classList.remove("open"); mask.classList.remove("open");
  }
  tab.addEventListener("click", openPanel);
  mask.addEventListener("click", closePanel);
  panel.querySelector(".qa-close").addEventListener("click", closePanel);
  sendBtn.addEventListener("click", function () { send(input.value); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); send(input.value); }
  });

  var navEntry = document.getElementById("qaEntry");
  if (navEntry) navEntry.addEventListener("click", function (e) { e.preventDefault(); openPanel(); });

  ensureFaq(function () { });
})();
