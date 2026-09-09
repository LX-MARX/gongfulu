/* 沐光共富 · 账号与扩展数据层（两站共用，依赖 api.js 先行加载）
 * 提供：邮箱注册/登录/退出、角色资料、在线表格存档、村庄评估提交、管理员数据维护、Kimi 智能问答代理。管理员采用申请审批制。
 * 会话保存在 localStorage「mg_session」；所有写操作携带用户令牌，权限由数据库行级安全策略裁决。
 */
(function () {
  var cfg = window.MG_CONFIG || {};
  var ready = !!(cfg.url && cfg.anonKey && cfg.url.indexOf("https://") === 0);
  var SKEY = "mg_session";

  function session() {
    try { return JSON.parse(localStorage.getItem(SKEY) || "null"); } catch (e) { return null; }
  }
  function saveSession(s) {
    if (s) localStorage.setItem(SKEY, JSON.stringify(s)); else localStorage.removeItem(SKEY);
    document.dispatchEvent(new CustomEvent("mg-auth-change"));
  }
  function token() { var s = session(); return s && s.access_token ? s.access_token : null; }

  function call(path, opts, useUser) {
    if (!ready) return Promise.resolve(null);
    opts = opts || {};
    var h = { apikey: cfg.anonKey, Authorization: "Bearer " + cfg.anonKey };
    if (useUser && token()) h.Authorization = "Bearer " + token();
    opts.headers = Object.assign(h, opts.headers || {});
    return fetch(cfg.url + path, opts).then(function (r) {
      if (r.status === 204) return {};
      return r.json().then(function (j) {
        if (!r.ok) { var err = new Error(j.message || j.error_description || j.error || ("HTTP " + r.status)); err.status = r.status; err.payload = j; throw err; }
        return j;
      });
    });
  }

  /* ---------- 账号 ---------- */
  // 角色不进注册请求：一律先落成普通用户，管理员走申请审批（profiles 表服务端裁决）
  function signUp(email, password, displayName) {
    return call("/auth/v1/signup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password, data: { display_name: displayName } })
    }).then(function (j) {
      if (j && j.access_token) saveSession(j);
      return j;
    });
  }
  function signIn(email, password) {
    return call("/auth/v1/token?grant_type=password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password })
    }).then(function (j) { if (j && j.access_token) saveSession(j); return j; });
  }
  function signOut() {
    var p = token() ? call("/auth/v1/logout", { method: "POST" }, true).catch(function () { }) : Promise.resolve();
    return p.then(function () { saveSession(null); });
  }
  function user() {
    if (!token()) return Promise.resolve(null);
    return call("/auth/v1/user", {}, true).catch(function () { return null; });
  }
  function profile() {
    var s = session();
    if (!s || !s.user) return Promise.resolve(null);
    return call("/rest/v1/profiles?id=eq." + s.user.id + "&select=*", {}, true)
      .then(function (rows) { return rows && rows[0] ? rows[0] : null; })
      .catch(function () { return null; });
  }
  function isAdmin() { return profile().then(function (p) { return !!(p && p.role === "admin"); }); }

  /* ---------- 在线表格存档 ---------- */
  function formSave(site, formNo, title, data, id) {
    var s = session(); if (!s || !s.user) return Promise.reject(new Error("not_logged_in"));
    var body = { user_id: s.user.id, site: site, form_no: formNo, title: title, data: data };
    if (id) {
      return call("/rest/v1/form_records?id=eq." + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: data, title: title }) }, true);
    }
    return call("/rest/v1/form_records", { method: "POST", headers: { "Content-Type": "application/json", "Prefer": "return=representation" }, body: JSON.stringify(body) }, true);
  }
  function formList(formNo) {
    var s = session(); if (!s || !s.user) return Promise.resolve([]);
    var q = "/rest/v1/form_records?user_id=eq." + s.user.id + "&select=*&order=created_at.desc";
    if (formNo) q += "&form_no=eq." + encodeURIComponent(formNo);
    return call(q, {}, true).catch(function () { return []; });
  }
  function formDelete(id) {
    return call("/rest/v1/form_records?id=eq." + id, { method: "DELETE" }, true);
  }

  /* ---------- 村庄评估提交（游客也可提交） ---------- */
  function evalSubmit(site, kind, village, contact, inputs, scores, verdict) {
    var s = session();
    var body = { site: site, kind: kind, village: village, contact: contact, inputs: inputs, scores: scores, verdict: verdict };
    if (s && s.user) body.user_id = s.user.id;
    return call("/rest/v1/eval_submissions", { method: "POST", headers: { "Content-Type": "application/json", "Prefer": "return=representation" }, body: JSON.stringify(body) }, !!token())
      .catch(function () { return null; });
  }

  /* ---------- 管理员申请审批 ---------- */
  function applyAdmin(reason) {
    var s = session(); if (!s || !s.user) return Promise.reject(new Error("not_logged_in"));
    var meta = s.user.user_metadata || {};
    var body = { user_id: s.user.id, email: s.user.email, display_name: meta.display_name || null, reason: reason };
    return call("/rest/v1/admin_applications", { method: "POST", headers: { "Content-Type": "application/json", "Prefer": "return=representation" }, body: JSON.stringify(body) }, true);
  }
  function myAdminApplication() {
    var s = session(); if (!s || !s.user) return Promise.resolve(null);
    return call("/rest/v1/admin_applications?user_id=eq." + s.user.id + "&select=*&order=created_at.desc&limit=1", {}, true)
      .then(function (rows) { return rows && rows[0] ? rows[0] : null; })
      .catch(function () { return null; });
  }
  function adminApplications() {
    return call("/rest/v1/admin_applications?select=*&order=created_at.desc", {}, true)
      .catch(function () { return null; });
  }
  function reviewAdminApplication(appId, approve) {
    return call("/rest/v1/rpc/review_admin_application", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: appId, approve: !!approve })
    }, true);
  }

  /* ---------- 管理员数据 ---------- */
  function adminList(table, order) {
    return call("/rest/v1/" + table + "?select=*&order=" + (order || "created_at.desc"), {}, true)
      .catch(function () { return null; });
  }
  function adminWrite(table, method, query, body) {
    return call("/rest/v1/" + table + (query || ""), {
      method: method, headers: { "Content-Type": "application/json", "Prefer": "return=representation" },
      body: body ? JSON.stringify(body) : undefined
    }, true);
  }

  /* ---------- Kimi 智能问答（边缘函数代理，密钥不落地浏览器） ---------- */
  function chat(messages) {
    if (!ready) return Promise.resolve({ reply: "当前为离线缓存模式，智能问答暂不可用。" });
    return fetch(cfg.url + "/functions/v1/kimi-chat", {
      method: "POST", headers: { "Content-Type": "application/json", apikey: cfg.anonKey },
      body: JSON.stringify({ messages: messages })
    }).then(function (r) { return r.json(); }).catch(function () {
      return { reply: "网络异常，请稍后再试；也可拨打 13721171245 直接咨询项目组。" };
    });
  }

  window.MG = Object.assign(window.MG || {}, {
    auth: {
      session: session, signUp: signUp, signIn: signIn, signOut: signOut,
      user: user, profile: profile, isAdmin: isAdmin,
      applyAdmin: applyAdmin, myAdminApplication: myAdminApplication,
      adminApplications: adminApplications, reviewAdminApplication: reviewAdminApplication
    },
    formSave: formSave, formList: formList, formDelete: formDelete,
    evalSubmit: evalSubmit,
    adminList: adminList, adminWrite: adminWrite,
    chat: chat
  });
})();
