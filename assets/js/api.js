/* 沐光共富 · 数据接入层（两站共用）
 * 通过 Supabase PostgREST 直连 PostgreSQL：政策库、项目库、看板指标实时读取，预约登记实时写入。
 * 连接失败或未配置时返回 null，由调用方回退到本地缓存数据，保证演示永不中断。
 * 页面底部自动显示连接状态徽标（实时数据库 / 离线缓存）。
 */
window.MG = (function () {
  var cfg = window.MG_CONFIG || {};
  var ready = !!(cfg.url && cfg.anonKey && cfg.url.indexOf("https://") === 0);
  var state = { online: false, mode: "检测中" };

  function request(path, options) {
    if (!ready) return Promise.resolve(null);
    var opts = options || {};
    opts.headers = Object.assign({ apikey: cfg.anonKey, Authorization: "Bearer " + cfg.anonKey }, opts.headers || {});
    /* 10 秒超时：网络挂起时及时回退本地缓存，避免页面停留在「正在连接」 */
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 10000) : null;
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(cfg.url + "/rest/v1/" + path, opts).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error("HTTP " + r.status);
      state.online = true; state.mode = "实时数据库";
      badge();
      return opts.raw ? r : r.json();
    }).catch(function () {
      if (timer) clearTimeout(timer);
      state.mode = "离线缓存";
      badge();
      return null;
    });
  }

  function qs(params) {
    var s = [];
    for (var k in params) if (params[k] !== undefined && params[k] !== null && params[k] !== "") s.push(k + "=" + encodeURIComponent(params[k]));
    return s.length ? "?" + s.join("&") : "";
  }

  function badge() {
    var el = document.getElementById("mgBadge");
    if (!el) {
      el = document.createElement("div");
      el.id = "mgBadge";
      el.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:9999;font-size:12px;letter-spacing:.06em;padding:6px 14px;border-radius:99px;backdrop-filter:blur(6px);transition:all .4s";
      document.body.appendChild(el);
    }
    if (state.online) {
      el.textContent = "● 实时数据库已连接";
      el.style.background = "rgba(22,101,52,.85)"; el.style.color = "#d1fae5"; el.style.border = "1px solid rgba(110,231,183,.5)";
    } else if (state.mode === "检测中") {
      el.textContent = "● 正在连接数据库……";
      el.style.background = "rgba(120,90,20,.85)"; el.style.color = "#fdeac8"; el.style.border = "1px solid rgba(240,215,140,.4)";
    } else {
      el.textContent = "○ 离线缓存模式";
      el.style.background = "rgba(69,72,80,.85)"; el.style.color = "#e5e7eb"; el.style.border = "1px solid rgba(209,213,219,.35)";
    }
  }

  /* —— 读取接口（失败返回 null） —— */
  function gfPolicies(f) { f = f || {}; return request("gf_policies" + qs({ select: "*", level: f.level ? "eq." + f.level : "", order: "id.asc" })); }
  function gfProjects(f) { f = f || {}; return request("gf_projects" + qs({ select: "*", level: f.level ? "eq." + f.level : "", type: f.type ? "eq." + f.type : "", order: "no.asc" })); }
  function wsPolicies(f) { f = f || {}; return request("ws_policies" + qs({ select: "*", level: f.level ? "eq." + f.level : "", year: f.year ? "eq." + f.year : "", order: "id.asc" })); }
  function wsProjects(f) {
    f = f || {};
    return request("ws_projects" + qs({
      select: "*",
      type5: f.type5 ? "eq." + f.type5 : "",
      level: f.level ? "eq." + f.level : "",
      '"window"': f.window ? "eq." + f.window : "",
      fund_tier: f.fundTier ? "eq." + f.fundTier : "",
      expired: "eq.false",
      order: "no.asc"
    }));
  }
  function metrics(grp) { return request("dashboard_metrics" + qs({ select: "*", grp: grp ? "eq." + grp : "", order: "sort.asc" })); }

  /* —— 写入接口：预约登记（成功返回记录数组，失败返回 null） —— */
  function book(rec) {
    /* 经安全函数写入：匿名角色对预约表无任何读权限，函数仅返回新编号 */
    return request("rpc/submit_booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_site: rec.site, p_village: rec.village, p_contact: rec.contact, p_phone: rec.phone, p_households: rec.households || null, p_needs: rec.needs || null })
    }).then(function (id) { return (typeof id === "number") ? [{ id: id }] : null; });
  }

  /* 初始徽标先显示「检测中」，随后发一次轻量探测请求，让徽标反映真实连接状态；
     不做探测时若页面恰好没有数据请求，徽标会长期误报「离线缓存」。 */
  function init() {
    state.mode = "检测中";
    badge();
    request("gf_policies" + qs({ select: "id", limit: 1 }));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  return { gfPolicies: gfPolicies, gfProjects: gfProjects, wsPolicies: wsPolicies, wsProjects: wsProjects, metrics: metrics, book: book, state: state };
})();
