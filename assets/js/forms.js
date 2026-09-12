/* 「屋顶上的共富路」手册第八篇 23 张工作表 · 在线填写→生成→打印引擎
 * 数据：assets/forms_schema.json；存档：MG.formSave / MG.formList（Supabase，登录可用）；
 * 打印：渲染公文格式到 #printZone 隔离区，调用全局 PV.printZone 输出 A4。
 */
(function () {
  "use strict";

  var schema = null, cur = null, curId = null, archives = [];
  var qText = "", qStage = "";

  function $(id) { return document.getElementById(id); }
  var esc = window.mgEsc;
  function todayCN() {
    var d = new Date();
    return d.getFullYear() + " 年 " + (d.getMonth() + 1) + " 月 " + d.getDate() + " 日";
  }
  function starCount(f) {
    var arr = f.kind === "single" ? f.fields : f.columns;
    return arr.filter(function (x) { return x.star; }).length;
  }
  function loggedIn() {
    return !!(window.MG && MG.auth && MG.auth.session());
  }
  function toast(el, html, warn) {
    el.className = warn ? "warn-box" : "note-box";
    el.style.marginTop = "14px";
    el.innerHTML = html;
    el.style.display = "block";
  }

  /* ================= 列表视图 ================= */
  function stageList() {
    var seen = [], out = [];
    schema.forEach(function (f) { if (seen.indexOf(f.stage) < 0) { seen.push(f.stage); out.push(f.stage); } });
    return out;
  }
  function renderStageTags() {
    var tags = [""].concat(stageList());
    $("stageTags").innerHTML = tags.map(function (s) {
      return '<button class="tag' + (qStage === s ? " on" : "") + '" data-stage="' + esc(s) + '">' + (s || "全部阶段") + "</button>";
    }).join("");
  }
  function renderList() {
    var kw = qText.trim().toLowerCase();
    var groups = [];
    schema.forEach(function (f) {
      if (qStage && f.stage !== qStage) return;
      if (kw && (f.no + " " + f.name).toLowerCase().indexOf(kw) < 0) return;
      var g = groups.filter(function (x) { return x.stage === f.stage; })[0];
      if (!g) { g = { stage: f.stage, items: [] }; groups.push(g); }
      g.items.push(f);
    });
    if (!groups.length) {
      $("formGroups").innerHTML = '<div class="note-box">没有匹配的工作表，请调整搜索词或阶段筛选。</div>';
      return;
    }
    $("formGroups").innerHTML = groups.map(function (g) {
      return '<h3 class="rv" style="margin:34px 0 6px; color:#7a6420">使用阶段：' + esc(g.stage) + "</h3>" +
        '<div class="grid3">' + g.items.map(function (f) {
          return '<div class="card hover-line rv">' +
            '<div style="display:flex; align-items:center; gap:12px">' +
            '<span style="font-family:var(--mono); font-size:20px; font-weight:700; color:#a5832f; border:1px solid var(--gold); border-radius:8px; padding:4px 10px">M-' + esc(f.no.split("-")[1]) + '</span>' +
            '<h3 style="font-size:18px; margin:0">' + esc(f.name) + "</h3></div>" +
            '<p style="font-size:13px; color:#5a6b7c; margin:10px 0 4px">阶段：' + esc(f.stage) + "　丨　填制：" + esc(f.filler) + "</p>" +
            '<p style="font-size:13px; color:#5a6b7c; margin:0 0 4px">保存期限：' + esc(f.keep) + "　丨　必填栏目：<b style='color:#c0392b'>" + starCount(f) + " 项</b></p>" +
            '<p style="font-size:12.5px; color:#8a95a1; margin:0 0 14px">' + (f.kind === "single" ? "一户一表 · 逐栏目填写" : "台账表格 · 行可增删") + "</p>" +
            '<button class="btn btn-gold" style="padding:9px 22px; font-size:14px" data-open="' + esc(f.no) + '">在线填写</button></div>';
        }).join("") + "</div>";
    }).join("");
  }

  /* ================= 填写视图 ================= */
  function openForm(no) {
    cur = schema.filter(function (f) { return f.no === no; })[0];
    if (!cur) return;
    curId = null;
    $("viewList").style.display = "none";
    $("viewFill").style.display = "block";
    renderFill(null);
    loadArchives();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function backList() {
    cur = null; curId = null;
    $("viewFill").style.display = "none";
    $("viewList").style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fieldControl(fd, val) {
    var id = "f_" + fd.key;
    if (fd.type === "select") {
      return '<select id="' + id + '"><option value="">（请选择）</option>' +
        (fd.options || []).map(function (o) {
          return '<option' + (val === o ? " selected" : "") + ">" + esc(o) + "</option>";
        }).join("") + "</select>";
    }
    if (fd.type === "checkboxes") {
      var arr = Array.isArray(val) ? val : [];
      return '<div style="display:flex; flex-wrap:wrap; gap:8px 22px; padding-top:8px">' +
        (fd.options || []).map(function (o) {
          return '<label style="margin:0; font-size:14.5px; display:flex; align-items:center; gap:7px; color:#33414f">' +
            '<input type="checkbox" name="' + id + '" value="' + esc(o) + '"' + (arr.indexOf(o) >= 0 ? " checked" : "") +
            ' style="width:auto; accent-color:#a5832f">' + esc(o) + "</label>";
        }).join("") + "</div>";
    }
    if (fd.type === "textarea") {
      return '<textarea id="' + id + '" rows="3">' + esc(val || "") + "</textarea>";
    }
    if (fd.type === "number") {
      return '<input type="number" id="' + id + '" value="' + esc(val != null ? val : "") + '">';
    }
    if (fd.type === "date") {
      return '<input type="date" id="' + id + '" value="' + esc(val || "") + '">';
    }
    return '<input type="text" id="' + id + '" value="' + esc(val || "") + '">';
  }

  function colControl(cd, val) {
    if (cd.type === "select") {
      return '<select data-k="' + cd.key + '" style="min-width:' + (cd.width || 110) + 'px"><option value="">（请选择）</option>' +
        (cd.options || []).map(function (o) {
          return '<option' + (val === o ? " selected" : "") + ">" + esc(o) + "</option>";
        }).join("") + "</select>";
    }
    var t = cd.type === "number" ? "number" : cd.type === "date" ? "date" : "text";
    return '<input type="' + t + '" data-k="' + cd.key + '" value="' + esc(val != null ? val : "") + '"' +
      ' style="min-width:' + (cd.width || 110) + 'px">';
  }

  function rowHTML(row) {
    return "<tr>" + cur.columns.map(function (cd) {
      return "<td>" + colControl(cd, row ? row[cd.key] : "") + "</td>";
    }).join("") +
      '<td style="white-space:nowrap"><button type="button" class="btn btn-line rowDel" style="padding:6px 14px; font-size:13px; border-color:#c8cdd4; color:#8a5a50">删除</button></td></tr>';
  }

  function renderFill(data) {
    var f = cur;
    var meta = (data && data.meta) || {};
    var starN = starCount(f);
    $("fillHead").innerHTML =
      '<div class="kicker">手册第八篇 · 工作表格</div>' +
      '<h2 style="margin:0">表 ' + esc(f.no) + "　" + esc(f.name) + "</h2>" +
      '<p class="lead" style="margin-top:10px">使用阶段：' + esc(f.stage) + "　丨　填制人：" + esc(f.filler) + "　丨　保存期限：" + esc(f.keep) +
      "　丨　必填栏目（<b style='color:#c0392b'>★</b>）：" + starN + " 项</p>";

    $("fillNote").innerHTML = "<b>填表说明：</b>" + esc(f.note || "无");

    $("fillMeta").innerHTML =
      '<div class="grid3">' +
      '<div><label>村庄名称</label><input type="text" id="mVillage" placeholder="如：东高垣村" value="' + esc(meta.village || "") + '"></div>' +
      '<div><label>填表人</label><input type="text" id="mPerson" placeholder="如：村光伏协管员 ××" value="' + esc(meta.person || "") + '"></div>' +
      '<div><label>填表日期（自动取当天）</label><input type="text" id="mDate" value="' + todayCN() + '" readonly style="opacity:.7"></div>' +
      "</div>";

    if (f.kind === "single") {
      $("fillBody").innerHTML = '<div class="card" style="margin-top:20px"><div class="grid2">' +
        f.fields.map(function (fd) {
          return '<div><label>' + (fd.star ? '<b style="color:#c0392b">★ </b>' : "") + esc(fd.label) + "</label>" +
            fieldControl(fd, data && data.values ? data.values[fd.key] : "") + "</div>";
        }).join("") + "</div></div>";
    } else {
      var rows = (data && Array.isArray(data.rows) && data.rows.length) ? data.rows : [null, null, null];
      $("fillBody").innerHTML =
        '<div class="card" style="margin-top:20px; overflow-x:auto"><table class="tbl" id="mtbl"><thead><tr>' +
        f.columns.map(function (cd) {
          return "<th>" + (cd.star ? '<b style="color:#c0392b">★ </b>' : "") + esc(cd.label) + "</th>";
        }).join("") + "<th>操作</th></tr></thead><tbody>" +
        rows.map(rowHTML).join("") +
        '</tbody></table>' +
        '<button type="button" class="btn btn-line" id="rowAdd" style="margin-top:14px; padding:8px 20px; font-size:13.5px">＋ 添加一行</button></div>';
      $("rowAdd").addEventListener("click", function () {
        $("mtbl").querySelector("tbody").insertAdjacentHTML("beforeend", rowHTML(null));
      });
      $("mtbl").addEventListener("click", function (e) {
        var b = e.target.closest(".rowDel");
        if (b) b.closest("tr").remove();
      });
    }
    $("fillMsg").style.display = "none";
  }

  /* ================= 采集与校验 ================= */
  function collect() {
    var meta = {
      village: $("mVillage").value.trim(),
      person: $("mPerson").value.trim()
    };
    if (cur.kind === "single") {
      var values = {};
      cur.fields.forEach(function (fd) {
        if (fd.type === "checkboxes") {
          values[fd.key] = Array.prototype.slice.call(document.querySelectorAll('input[name="f_' + fd.key + '"]:checked'))
            .map(function (x) { return x.value; });
        } else {
          var el = $("f_" + fd.key);
          values[fd.key] = el ? el.value.trim() : "";
        }
      });
      return { meta: meta, values: values };
    }
    var rows = [];
    $("mtbl").querySelectorAll("tbody tr").forEach(function (tr) {
      var r = {}, empty = true;
      cur.columns.forEach(function (cd) {
        var el = tr.querySelector("[data-k='" + cd.key + "']");
        var v = el ? el.value.trim() : "";
        r[cd.key] = v;
        if (v) empty = false;
      });
      if (!empty) rows.push(r);
    });
    return { meta: meta, rows: rows };
  }

  /* 必填栏目判定：返回缺失项描述数组 */
  function missingStar(data) {
    var miss = [];
    if (cur.kind === "single") {
      cur.fields.forEach(function (fd) {
        if (!fd.star) return;
        var v = data.values[fd.key];
        if (fd.type === "checkboxes" ? !(Array.isArray(v) && v.length) : !v) miss.push(fd.label);
      });
    } else {
      if (!data.rows.length) {
        miss.push("（整表）至少填写 1 行记录");
      } else {
        data.rows.forEach(function (r, i) {
          cur.columns.forEach(function (cd) {
            if (cd.star && !r[cd.key]) miss.push("第 " + (i + 1) + " 行「" + cd.label + "」");
          });
        });
      }
    }
    return miss;
  }

  /* ================= 存档 ================= */
  function loadArchives() {
    var sel = $("archSel");
    sel.innerHTML = "<option value=''>（读取中……）</option>";
    if (!loggedIn()) {
      sel.innerHTML = "<option value=''>登录后可读取存档</option>";
      return;
    }
    MG.formList(cur.no).then(function (rows) {
      archives = rows || [];
      if (!archives.length) {
        sel.innerHTML = "<option value=''>暂无该表存档</option>";
        return;
      }
      sel.innerHTML = "<option value=''>选择历史存档回填……</option>" + archives.map(function (r) {
        var d = r.created_at ? new Date(r.created_at) : null;
        var ds = d ? d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) : "";
        return '<option value="' + esc(r.id) + '">' + esc(r.title || cur.name) + "（" + ds + "）</option>";
      }).join("");
    });
  }

  function saveArchive() {
    var msg = $("fillMsg");
    if (!loggedIn()) {
      toast(msg, '<b>登录后可保存存档。</b>当前填写内容仅保留在本页面，生成打印版不受影响。<a href="account.html" style="font-weight:600">去登录 / 注册 →</a>', true);
      return;
    }
    var data = collect();
    var title = "表 " + cur.no + " " + cur.name + " · " + (data.meta.village || "未填村名");
    toast(msg, "正在暂存……", false);
    MG.formSave("gongfulu", cur.no, title, data, curId || undefined).then(function (res) {
      if (!curId && Array.isArray(res) && res[0] && res[0].id) curId = res[0].id;
      toast(msg, "<b>已暂存到您的账号。</b>可在「读取我的存档」下拉中随时回填；重复暂存将覆盖同一条存档。", false);
      loadArchives();
    }).catch(function (e) {
      if (e && e.message === "not_logged_in") {
        toast(msg, '<b>登录后可保存存档。</b><a href="account.html" style="font-weight:600">去登录 / 注册 →</a>', true);
      } else {
        toast(msg, "<b>暂存失败：</b>" + esc(e && e.message || "网络异常") + "，请稍后重试；填写内容仍在本页面，可直接生成打印版。", true);
      }
    });
  }

  /* ================= 公文打印版 ================= */
  function printVal(v) {
    if (Array.isArray(v)) return "——";
    return v ? esc(v) : "——";
  }
  /* 红描边定位未填的必填控件；用户一动手补填就当场撤掉，不用等下次点生成 */
  function markEl(el) {
    if (!el) return;
    el.setAttribute("data-miss", "1");
    el.style.boxShadow = "0 0 0 2px #C0392B";
    el.style.borderColor = "#C0392B";
    el.addEventListener("input", function h() {
      el.style.boxShadow = "";
      el.style.borderColor = "";
      el.removeAttribute("data-miss");
      el.removeEventListener("input", h);
    });
  }
  function clearMarks() {
    document.querySelectorAll("#viewFill [data-miss]").forEach(function (el) {
      el.style.boxShadow = "";
      el.style.borderColor = "";
      el.removeAttribute("data-miss");
    });
  }
  function markMissing(data) {
    if (cur.kind === "single") {
      cur.fields.forEach(function (fd) {
        if (!fd.star) return;
        var v = data.values[fd.key];
        var empty = fd.type === "checkboxes" ? !(Array.isArray(v) && v.length) : !v;
        if (!empty) return;
        if (fd.type === "checkboxes") {
          /* 复选组没有单一输入框，描边框住整个选项容器 */
          var any = document.querySelector('input[name="f_' + fd.key + '"]');
          if (any) markEl(any.parentElement.parentElement);
        } else {
          markEl($("f_" + fd.key));
        }
      });
      return;
    }
    /* 台账表：逐行找出空着的必填格描边 */
    $("mtbl").querySelectorAll("tbody tr").forEach(function (tr) {
      cur.columns.forEach(function (cd) {
        if (!cd.star) return;
        var el = tr.querySelector("[data-k='" + cd.key + "']");
        if (el && !el.value.trim()) markEl(el);
      });
    });
  }
  function genPrint() {
    var msg = $("fillMsg");
    var data = collect();
    clearMarks();
    var miss = missingStar(data);
    if (miss.length) {
      /* 拦截逻辑不变（必填未齐不能出打印版），但提示要醒目到没法忽略：
         加大字号、加粗红框、脉冲光圈，并把缺失的必填框逐个描红定位 */
      markMissing(data);
      toast(msg, '<b style="font-size:19px">⚠ 必填栏目（★）尚未填齐，无法生成打印版。</b><br>' +
        '<span style="font-size:15.5px">请先补填：' + miss.map(esc).join("；") +
        "。确无内容的栏目请按手册要求填「无」。缺失栏目已用红框标出。</span>", true);
      msg.classList.remove("miss-pulse");
      void msg.offsetWidth; /* 重新触发动画，连续点生成也会再次脉冲 */
      msg.classList.add("miss-pulse");
      msg.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    msg.classList.remove("miss-pulse");
    var f = cur, date = todayCN();
    var html = '<div class="gov-doc">' +
      '<h1 class="gov-title">表 ' + esc(f.no) + "　" + esc(f.name) + "</h1>" +
      '<p class="gov-meta"><span>村庄名称：' + esc(data.meta.village || "＿＿＿＿＿＿") + "</span>" +
      "<span>填表人：" + esc(data.meta.person || "＿＿＿＿") + "</span>" +
      "<span>填表日期：" + date + "</span></p>";

    if (f.kind === "single") {
      html += '<table class="gov-tbl"><thead><tr><th style="width:32%">栏目</th><th>填写内容</th></tr></thead><tbody>' +
        f.fields.map(function (fd) {
          var v = data.values[fd.key], out;
          if (fd.type === "checkboxes") {
            var sel = Array.isArray(v) ? v : [];
            out = (fd.options || []).map(function (o) {
              return (sel.indexOf(o) >= 0 ? "■ " : "□ ") + esc(o);
            }).join("　　") || "——";
          } else {
            out = printVal(v);
          }
          return '<tr><td class="gov-k">' + esc(fd.label) + '</td><td>' + out + "</td></tr>";
        }).join("") + "</tbody></table>";
    } else {
      html += '<table class="gov-tbl"><thead><tr><th style="width:6%">序号</th>' +
        f.columns.map(function (cd) { return "<th>" + esc(cd.label) + "</th>"; }).join("") +
        "</tr></thead><tbody>";
      if (data.rows.length) {
        html += data.rows.map(function (r, i) {
          return '<tr><td class="gov-c">' + (i + 1) + "</td>" +
            f.columns.map(function (cd) { return "<td>" + printVal(r[cd.key]) + "</td>"; }).join("") + "</tr>";
        }).join("");
      } else {
        html += '<tr><td class="gov-c">——</td>' + f.columns.map(function () { return "<td>——</td>"; }).join("") + "</tr>";
      }
      html += "</tbody></table>";
    }

    html += '<p class="gov-note">' + esc(f.note || "") + "</p>" +
      '<div class="gov-sign"><p>屋顶上的共富路项目组</p><p>' + date + "</p></div></div>";

    $("printZone").innerHTML = html;
    toast(msg, "<b>公文打印版已生成（A4 · 三线表 · 公文格式），正在调起打印对话框。</b>如需留存电子档，可在打印对话框中选择「另存为 PDF」。", false);
    setTimeout(function () { PV.printZone("#printZone"); }, 60);
  }

  /* ================= 启动 ================= */
  document.addEventListener("DOMContentLoaded", function () {
    fetch("assets/forms_schema.json").then(function (r) { return r.json(); }).then(function (j) {
      schema = j;
      renderStageTags();
      renderList();
    }).catch(function () {
      $("formGroups").innerHTML = '<div class="warn-box">表格结构数据加载失败（assets/forms_schema.json），请刷新重试。</div>';
    });

    $("formSearch").addEventListener("input", function () {
      qText = this.value; renderList();
    });
    $("stageTags").addEventListener("click", function (e) {
      var b = e.target.closest("[data-stage]"); if (!b) return;
      qStage = b.dataset.stage; renderStageTags(); renderList();
    });
    $("formGroups").addEventListener("click", function (e) {
      var b = e.target.closest("[data-open]"); if (!b) return;
      openForm(b.dataset.open);
    });

    $("btnBack").addEventListener("click", backList);
    $("btnBack2").addEventListener("click", backList);
    $("btnSave").addEventListener("click", saveArchive);
    $("btnPrint").addEventListener("click", genPrint);
    $("btnClear").addEventListener("click", function () {
      if (!confirm("确定清空当前填写内容、重新填写吗？（已暂存的存档不受影响）")) return;
      curId = null;
      renderFill(null);
    });
    $("archSel").addEventListener("change", function () {
      var id = this.value; if (!id) return;
      var rec = archives.filter(function (r) { return String(r.id) === id; })[0];
      if (!rec) return;
      curId = rec.id;
      renderFill(rec.data || null);
      toast($("fillMsg"), "<b>已回填存档：</b>" + esc(rec.title || "") + "。再次「暂存」将覆盖该条存档。", false);
    });
  });
})();
