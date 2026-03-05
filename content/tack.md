---
title: "Tack"
url: "/tack"
noindex: true
sitemap:
  disable: true
meta_title: "Tack för din intresseanmälan | Rikta Psykiatri"
meta_keywords: "tack sida, intresseanmälan, Rikta Psykiatri, webbinarium, kontakt"
meta_description: "Tack för din intresseanmälan. Vi skickar webbinarieinformation inom kort och återkommer inom 24 timmar."
og_title: "Tack för din intresseanmälan"
og_description: "Vi skickar webbinarieinformation inom kort och återkommer inom 24 timmar."
---
<h2>Tack för din intresseanmälan!</h2>
<p>Tack för att du anmält ditt intresse hos Rikta Psykiatri.</p>
<p>Om du ska delta i ett webbinarium skickar vi informationen inom kort.</p>
<p>För inskickade formulär strävar vi efter att återkomma inom 24 timmar.</p>
<script>
  (function(){
    var leadKey = 'rk_lead_ts';
    var leadTtlMs = 5 * 60 * 1000;
    var pendingKey = 'rk_lead_pending';
    var pendingTsKey = 'rk_lead_pending_ts';
    var pendingTtlMs = 10 * 60 * 1000;
    var now = Date.now();
    try {
      var pending = sessionStorage.getItem(pendingKey);
      var pendingTs = Number(sessionStorage.getItem(pendingTsKey) || 0);
      if (!pending || (pendingTs && now - pendingTs > pendingTtlMs)) {
        return;
      }
      sessionStorage.removeItem(pendingKey);
      sessionStorage.removeItem(pendingTsKey);
      var last = Number(sessionStorage.getItem(leadKey) || 0);
      if (last && now - last < leadTtlMs) {
        return;
      }
      sessionStorage.setItem(leadKey, String(now));
    } catch (err) {}
    if (typeof fbq === 'function') {
      fbq('track', 'Lead');
    }
  })();
</script>
<p><a class="btn" href="/">Tillbaka till startsidan</a></p>
