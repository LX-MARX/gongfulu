/*
 * 公文打印引擎（GB/T 9704 版式）· 两站共用
 * GovDoc.print({org, docNo, title, body}) —— 包红头公文版式并走打印隔离
 * GovDoc.cnDate(d) —— 汉字数字成文日期
 */
window.GovDoc = (function () {
  "use strict";
  var CN = "〇一二三四五六七八九";
  function cnNum(n) { return String(n).split("").map(function (c) { return CN[+c]; }).join(""); }
  function cnDate(d) {
    d = d || new Date();
    return cnNum(d.getFullYear()) + "年" + cnNum(d.getMonth() + 1) + "月" + cnNum(d.getDate()) + "日";
  }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  /* body 传 HTML 字符串（调用方负责内容转义） */
  function wrap(o) {
    return '<div class="gdoc">' +
      '<div class="gd-org">' + esc(o.org) + '</div>' +
      (o.docNo ? '<div class="gd-no">' + esc(o.docNo) + '</div>' : '') +
      '<hr class="gd-redline">' +
      '<div class="gd-title">' + esc(o.title) + '</div>' +
      '<div class="gd-body">' + o.body + '</div>' +
      '<div class="gd-sign"><div class="o">' + esc(o.signOrg || o.org) + '</div><div class="d">' + cnDate(o.date) + '</div></div>' +
      '</div>';
  }
  function ensureZone() {
    var z = document.getElementById("govdocPrint");
    if (!z) {
      z = document.createElement("div");
      z.id = "govdocPrint";
      z.style.display = "none";
      document.body.appendChild(z);
    }
    return z;
  }
  /* o: {org, docNo, title, body(HTML 字符串) | el(选择器，取其 innerHTML)} */
  function print(o) {
    var z = ensureZone();
    var bodyHtml = o.body != null ? o.body : (document.querySelector(o.el) || { innerHTML: "" }).innerHTML;
    z.innerHTML = wrap({ org: o.org, docNo: o.docNo, title: o.title, body: bodyHtml, signOrg: o.signOrg, date: o.date });
    if (window.PV && PV.printZone) { PV.printZone("#govdocPrint"); }
    else {
      z.style.display = "block";
      var all = document.body.children;
      for (var i = 0; i < all.length; i++) { if (all[i] !== z) all[i].style.display = "none"; }
      window.print();
      setTimeout(function () {
        z.style.display = "none";
        for (var i = 0; i < all.length; i++) { if (all[i] !== z) all[i].style.display = ""; }
      }, 600);
    }
  }
  return { wrap: wrap, print: print, cnDate: cnDate };
})();
