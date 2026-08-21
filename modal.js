/*
 * modal.js — Modern Alert / Confirm / Prompt dialog (self-contained, no dependencies).
 * Injects its own CSS once (dark-glass card + gradient accent + float animation),
 * and exposes window.Modal.alert / confirm / prompt as async Promises.
 *
 * Usage (in async handlers):
 *   await Modal.alert('Berhasil disimpan!', 'Sukses');
 *   if (await Modal.confirm('Hapus data ini?', { danger:true, ok:'Hapus', cancel:'Batal' })) { ... }
 *   const val = await Modal.prompt({ title:'Nama', message:'Masukkan nama:', placeholder:'Nama lengkap' });
 *
 * Keyboard: Esc -> close/cancel   |  Enter -> ok/submit   |  Tab cycles buttons.
 * Backdrop click -> cancel (confirm/prompt) or close (alert).
 */
(function () {
  'use strict';
  if (window.Modal) return;

  var NS = 'tbmodal';

  /* ---------- self-inject CSS once ---------- */
  if (!document.getElementById(NS + '-style')) {
    var st = document.createElement('style');
    st.id = NS + '-style';
    st.textContent = [
      '.' + NS + '-backdrop{position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(9,9,26,.62);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);animation:' + NS + '-fade .2s ease}',
      '.' + NS + '-card{display:flex;flex-direction:column;gap:12px;max-width:402px;width:100%;padding:26px 24px;border-radius:20px;text-align:left;color:#fff;background:linear-gradient(150deg,rgba(26,34,62,.86),rgba(9,11,26,.94));border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 80px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.04);backdrop-filter:blur(26px);-webkit-backdrop-filter:blur(26px);animation:' + NS + '-scale .3s cubic-bezier(.2,.9,.3,1.15)}',
      '.' + NS + '-icon{width:64px;height:64px;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-size:34px;line-height:1;filter:drop-shadow(0 6px 20px rgba(99,102,241,.35))}',
      '.' + NS + '-title{font:700 17px/1.25 inherit;color:#fff;text-align:center}',
      '.' + NS + '-msg{font:400 14.5px/1.55 inherit;white-space:pre-wrap;word-break:break-word;color:rgba(236,240,245,.92)}',
      '.' + NS + '-input{width:100%;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;font:14px inherit;outline:none}',
      '.' + NS + '-input:focus{border-color:var(--primary,#6366f1);box-shadow:0 0 0 3px rgba(99,102,241,.28);background:rgba(255,255,255,.1)}',
      '.' + NS + '-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:4px}',
      '.' + NS + '-btn{min-width:96px;padding:10px 18px;border:none;border-radius:12px;cursor:pointer;font:600 14px/1 inherit;transition:transform .15s,box-shadow .15s,background .15s}',
      '.' + NS + '-ok{background:linear-gradient(135deg,var(--primary,#6366f1),var(--secondary,#a855f7));color:#fff;box-shadow:0 8px 22px rgba(99,102,241,.34)}',
      '.' + NS + '-ok:hover{transform:translateY(-1.5px);box-shadow:0 12px 28px rgba(99,102,241,.42)}',
      '.' + NS + '-cancel{background:rgba(255,255,255,.09);color:#eef2f7;border:1px solid rgba(255,255,255,.18)}',
      '.' + NS + '-cancel:hover{background:rgba(255,255,255,.15);transform:translateY(-1px)}',
      '.' + NS + '-danger{background:linear-gradient(135deg,#ef4444,#b91c1c);color:#fff;box-shadow:0 8px 22px rgba(239,68,68,.35)}',
      '.' + NS + '-danger:hover{transform:translateY(-1.5px);box-shadow:0 12px 28px rgba(239,68,68,.42)}',
      '@keyframes ' + NS + '-fade{from{opacity:0}to{opacity:1}}',
      '@keyframes ' + NS + '-scale{from{opacity:0;transform:scale(.86) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}',
      'button.' + NS + '-btn:focus-visible{outline:2px solid var(--primary,#fff)}'
    ].join('');
    (document.head || document.documentElement).appendChild(st);
  }
/* ---------- internal helpers ---------- */
  function elem(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  var _active = null; // { overlay, resolve }

  function build(kind, message, opts) {
    opts = opts || {};
    var overlay = elem('div', NS + '-backdrop');
    var card = elem('div', NS + '-card');

    var icon = elem('div', NS + '-icon');
    icon.textContent = opts.icon || (kind === 'alert' ? '\u26a0\ufe0f' : kind === 'confirm' ? '\u26a0\ufe0f' : '\u270d\ufe0f');

    var title = elem('div', NS + '-title');
    title.textContent = opts.title || (kind === 'alert' ? 'Peringatan' : kind === 'confirm' ? 'Konfirmasi' : 'Inputan');

    var msg = elem('div', NS + '-msg');
    msg.textContent = message == null ? '' : String(message);
    msg.style.whiteSpace = 'pre-wrap';
    msg.style.wordBreak = 'break-word';

    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(msg);

    var input = null;
    if (kind === 'prompt') {
      input = elem('input', NS + '-input');
      input.type = opts.inputType || 'text';
      input.placeholder = opts.placeholder || '';
      input.value = opts.defaultValue || '';
      input.autocomplete = 'off';
      card.appendChild(input);
    }

    var actions = elem('div', NS + '-actions');
    var okLabel = opts.ok || (kind === 'confirm' ? 'OK' : kind === 'prompt' ? 'OK' : 'Mengerti');
    var cancelLabel = opts.cancel || 'Batal';
    var okBtn = elem('button', NS + '-btn ' + (opts.danger ? NS + '-danger' : NS + '-ok'));
    okBtn.type = 'button'; okBtn.textContent = okLabel;
    actions.appendChild(okBtn);
    var cancelBtn = null;
    if (kind !== 'alert') {
      cancelBtn = elem('button', NS + '-btn ' + NS + '-cancel');
      cancelBtn.type = 'button'; cancelBtn.textContent = cancelLabel;
      actions.appendChild(cancelBtn);
    }
    card.appendChild(actions);
    overlay.appendChild(card);

    return { overlay: overlay, okBtn: okBtn, cancelBtn: cancelBtn, input: input };
  }
function show(kind, message, opts) {
    var built = build(kind, message, opts);
    var overlay = built.overlay, okBtn = built.okBtn, cancelBtn = built.cancelBtn, input = built.input;

    // close a previously-open modal (shouldn't normally stack)
    if (_active) {
      try { document.body.removeChild(_active.overlay); } catch (e) {}
      _active.resolve(null);
      _active = null;
    }

    document.body.appendChild(overlay);

    var _res = null, _closed = false;
    var promise = new Promise(function (res) { _res = res; });
    function finish(v) {
      if (_closed) return;
      _closed = true;
      try { document.body.removeChild(overlay); } catch (e) {}
      _active = null;
      _res(v);
    }
    _active = { overlay: overlay, resolve: finish };

    /* clicks */
    okBtn.addEventListener('click', function () {
      if (kind === 'prompt' && input) {
        var v = input.value.trim();
        if (!v) { input.select(); input.focus(); return; }
        finish(v);
      } else {
        finish(true);
      }
    });
    if (cancelBtn) cancelBtn.addEventListener('click', function () { finish(null); });
    overlay.addEventListener('pointerdown', function (e) { if (e.target === overlay) finish(null); });

    /* keyboard (Esc -> close/cancel, Enter -> ok/submit) */
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); finish(cancelBtn ? null : true); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        var t = e.target;
        if (kind === 'prompt' && input && t === input) {
          if (input.value.trim()) finish(input.value.trim()); else input.select();
        } else if (okBtn && (t === okBtn || t === cancelBtn)) t.click();
        else if (okBtn) okBtn.click();
      }
    });

    /* initial focus */
    try {
      if (input) { input.focus(); input.select(); }
      else if (cancelBtn) cancelBtn.focus(); else okBtn.focus();
    } catch (e) {}

    return promise;
  }

  window.Modal = {
    alert: function (message, titleOrOpts) {
      var o = (typeof titleOrOpts === 'object' && titleOrOpts) ? titleOrOpts : {};
      if (typeof titleOrOpts === 'string') o.title = titleOrOpts;
      return show('alert', message, o);
    },
    confirm: function (message, optsOrTitle, title) {
      var o = (typeof optsOrTitle === 'object' && optsOrTitle) ? optsOrTitle : {};
      if (typeof optsOrTitle === 'string') o.title = optsOrTitle;
      else if (typeof title === 'string') o.title = title;
      return show('confirm', message, o);
    },
    prompt: function (messageOrOpts, opts) {
      var o = (typeof messageOrOpts === 'object' && messageOrOpts) ? messageOrOpts : (opts || {});
      if (typeof messageOrOpts === 'string') o.message = messageOrOpts;
      return show('prompt', o.message || '', o);
    }
  };
})();