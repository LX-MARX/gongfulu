/*
 * 屋顶上的共富路整村光伏服务平台软件 V2.0
 * Copyright (c) 2026 屋顶上的共富路项目组
 * 图例组件：工程图纸的图例栏——首次访问自动弹出一次（localStorage 标记），
 * 顶带「图例」入口可随时重看；点遮罩或「知道了」均可关闭。
 */
(function () {
  "use strict";
  if (window.__mglLoaded) return;
  window.__mglLoaded = true;

  var KEY = "mg_legend_done_gongfulu";

  var ITEMS = [
    ["首页工艺图", "收益流工艺管线：自左而右为阳光到户的流转方向"],
    ["悬停工位", "对应注解与引出虚线同步发亮；点击锁定"],
    ["拖拽图面", "旋转视角；滚轮缩放"],
    ["四方工作台", "顶带下拉：政府 / 企业 / 村干部 / 农户"],
    ["数智工具箱", "收益测算、项目匹配、合同要点、明白纸生成"],
    ["工作表", "23 张建设表格在线填写，公文格式打印"],
    ["答疑", "右缘批注签：内置常见问题解答，未命中转在线问答"]
  ];

  var mask = document.createElement("div");
  mask.className = "legend-mask";
  var listHtml = ITEMS.map(function (it) {
    return '<li><span class="sym">' + it[0] + '</span><span>' + it[1] + "</span></li>";
  }).join("");
  mask.innerHTML =
    '<div class="legend-card" role="dialog" aria-label="图例">' +
    '<div class="lg-t">图 例</div>' +
    '<div class="lg-en">LEGEND · HOW TO READ THIS SHEET</div>' +
    '<div class="lg-rule"></div>' +
    "<ul>" + listHtml + "</ul>" +
    '<div class="lg-foot"><button class="lg-ok" type="button">知道了</button></div>' +
    "</div>";
  document.body.appendChild(mask);

  function close() {
    mask.classList.remove("open");
    try { localStorage.setItem(KEY, "1"); } catch (e) { }
  }
  function play() { mask.classList.add("open"); }

  mask.addEventListener("click", function (e) { if (e.target === mask) close(); });
  mask.querySelector(".lg-ok").addEventListener("click", close);

  var entry = document.getElementById("legendEntry");
  if (entry) entry.addEventListener("click", function (e) { e.preventDefault(); play(); });

  window.MGLegend = { play: play };

  var done = null;
  try { done = localStorage.getItem(KEY); } catch (e) { }
  if (!done) setTimeout(play, 900);
})();
