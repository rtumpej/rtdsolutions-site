// Sends a request form straight to info@rtdsolutions.si (FormSubmit, AJAX): no mail program opens.
// The site holds no keys and calls no AI service; requests are read and handled by us.
// Guards: a hidden honeypot field, and at most 3 requests per browser per hour. If sending fails,
// the visitor gets a ready email link instead, so no request is lost.
(function () {
  "use strict";
  var ENDPOINT = "https://formsubmit.co/ajax/info@rtdsolutions.si";
  var MAIL = "info@rtdsolutions.si";
  var T = {
    sl: { sending: "Pošiljam …", ok: "Hvala. Zahtevo smo prejeli in vam odgovorimo na ",
          fail: "Pošiljanje ni uspelo. Zahtevo nam lahko pošljete po e-pošti: ",
          limit: "Iz tega brskalnika ste v zadnji uri poslali že več zahtev. Pišite nam: ",
          email: "Vpišite e-naslov, na katerega pošljemo odgovor." },
    en: { sending: "Sending …", ok: "Thank you. We have your request and will reply to ",
          fail: "Sending failed. You can email your request instead: ",
          limit: "This browser sent several requests in the last hour. Please email us: ",
          email: "Enter the email address we should reply to." },
    de: { sending: "Wird gesendet …", ok: "Danke. Ihre Anfrage ist bei uns; wir antworten an ",
          fail: "Senden fehlgeschlagen. Sie können die Anfrage per E-Mail schicken: ",
          limit: "Aus diesem Browser kamen in der letzten Stunde bereits mehrere Anfragen. Bitte schreiben Sie uns: ",
          email: "Geben Sie die E-Mail-Adresse für unsere Antwort ein." },
    nl: { sending: "Versturen …", ok: "Dank u. We hebben uw aanvraag ontvangen en antwoorden aan ",
          fail: "Versturen is mislukt. U kunt uw aanvraag ook mailen: ",
          limit: "Vanuit deze browser zijn het afgelopen uur al meerdere aanvragen verstuurd. Mail ons: ",
          email: "Vul het e-mailadres in waarop we antwoorden." }
  };
  var t = T[(document.documentElement.lang || "en").slice(0, 2)] || T.en;
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

  function recent() {
    try {
      var now = Date.now();
      return JSON.parse(localStorage.getItem("rtd-sent") || "[]").filter(function (x) { return now - x < 3600e3; });
    } catch (_) { return []; }
  }
  function remember(list) {
    try { list.push(Date.now()); localStorage.setItem("rtd-sent", JSON.stringify(list)); } catch (_) {}
  }
  function asText(fields) {
    return Object.keys(fields).map(function (k) { return k + ": " + fields[k]; }).join("\n");
  }
  function say(el, before, subject, fields) {
    el.textContent = before;
    var a = document.createElement("a");
    a.href = "mailto:" + MAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(asText(fields));
    a.textContent = MAIL;
    el.appendChild(a);
  }

  // Checks the form's email field; returns the address or "" (and marks the field).
  window.rtdEmail = function (form) {
    var input = form.querySelector('input[type="email"]');
    var err = input && document.getElementById(input.getAttribute("aria-describedby") || "");
    var v = input ? input.value.trim() : "";
    if (!EMAIL_RE.test(v)) {
      if (err) err.textContent = t.email;
      if (input) { input.setAttribute("aria-invalid", "true"); input.focus(); }
      return "";
    }
    if (err) err.textContent = "";
    input.removeAttribute("aria-invalid");
    return v;
  };

  // Sends {fields} with the subject; on success replaces the form with a thank-you note.
  window.rtdSend = function (form, subject, fields) {
    var status = form.querySelector(".send-status");
    if (!status) {
      status = document.createElement("p");
      status.className = "send-status";
      status.setAttribute("role", "status");
      form.appendChild(status);
    }
    var honey = form.querySelector('[name="_honey"]');
    if (honey && honey.value) return;
    var sent = recent();
    if (sent.length >= 3) { say(status, t.limit, subject, fields); return; }
    var btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    status.textContent = t.sending;
    var payload = Object.assign({ _subject: subject, _template: "table", _captcha: "false" }, fields);
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || String(j.success) !== "true") throw new Error(j.message || String(r.status));
      });
    }).then(function () {
      remember(sent);
      var ok = document.createElement("p");
      ok.className = "send-ok";
      ok.tabIndex = -1;
      ok.textContent = t.ok + (fields.email || fields["E-mail"] || "") + ".";
      form.replaceChildren(ok);
      ok.focus();
    }).catch(function () {
      if (btn) btn.disabled = false;
      say(status, t.fail, subject, fields);
    });
  };
})();
