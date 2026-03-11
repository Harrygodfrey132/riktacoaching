# Innehållsrevision: alla icke-bloggsidor (2026-03-11)

## Omfattning
- Granskade alla publicerade `index`-sidor i `public/`, exkluderat `/blogg/` och `/en/blog/`.
- Totalt granskade sidor: **270**.
- Metod: sektion-för-sektion per sidmall (för att täcka alla sidor utan duplicerad textmassa).

## Övergripande standard för “Apple-minimal”
- **Hero:** 30–60 ord + 1 primär CTA.
- **Informationssektion:** 70–120 ord (max ~150 om juridiskt/komplext).
- **Listor:** 3–5 punkter, 6+ punkter delas upp.
- **FAQ:** 3–5 frågor på landningssidor, övriga flyttas till dedikerad FAQ.
- **CTA:** en tydlig handling per sektion.

---

## 1) Grupp: `contact-form-section` (100 sidor)
**Omfattar:** alla `/platser/adhd-medicinering-*`.

### Sektion: `contact-form-section` (överst)
- **Keep:** formulär tidigt på sidan och frivilliga fält.
- **Cut:** lång introtext före formulär.
- **Rewrite:** håll intro till 1 mening: “Vi återkommer inom 1 vardag med förslag på nästa steg.”

### Sektion: `location-hero`
- **Keep:** lokal relevans + tydlig H1.
- **Cut:** en av de två upprepningarna av ortsparagrafen (samma text återkommer i `location-details`).
- **Rewrite:** 45–65 ord: problem → upplägg → resultat. Exempelstruktur:  
  “ADHD-medicinering i [Ort] med digital uppstart och tät uppföljning. Vi justerar dos och plan utifrån effekt, biverkningar och vardagsfunktion.”

### Sektion: `location-details`
- **Keep:** process i steg.
- **Cut:** duplicerad lokalkännedom som redan finns i hero.
- **Rewrite:** byt andra kolumnen till konkret “så följer vi upp” (intervall, vad som bedöms, när plan justeras).

### Sektion: `location-map`
- **Keep:** karta för lokal relevans.
- **Cut:** förklarande text som säger samma sak som rubriken.
- **Rewrite:** 1 kort rad: “Vi är verksamma digitalt i hela området kring [Ort].”

### Sektion: `location-cta`
- **Keep:** internlänk till hubb + eventuell relaterad utredningssida.
- **Cut:** generell CTA-text utan ny information.
- **Rewrite:** rubrik med värde: “Behöver du utredning innan medicinering?” + 2 tydliga val.

### Sektion: `contact-form-section` (nederst)
- **Keep:** sekundär konverteringspunkt.
- **Cut:** upprepad full introduktion.
- **Rewrite:** kort variant: “Skicka en rad – vi föreslår upplägg och kostnad.”

---

## 2) Grupp: `who-hero` (31 sidor)
**Omfattar:** `/adhd-utredning/*`, `/autism-utredning/*`, `/for-foretag/`, `/en/adhd-assessment/*`, `/en/autism-assessment/*`, `/en/about-us/`.

### Sektion: `who-hero`
- **Keep:** målgrupp + erbjudande + CTA.
- **Cut:** flera inledande påståenden i samma stycke.
- **Rewrite:** 2 meningar max: “för vem” + “vad du får inom vilken tidsram”.

### Sektion: `who-section`
- **Keep:** pedagogisk ordning (vad → hur → nästa steg).
- **Cut:** upprepade förtroendesignaler mellan sektioner.
- **Rewrite:** varje `who-section` till 90–130 ord och avsluta med 1 beslutspunkt: “När är detta rätt steg?”

### Sektion: `who-values` / `who-cta` / `adhd-final-cta`
- **Keep:** social proof och slut-CTA.
- **Cut:** dubbla CTA-sektioner på samma sida.
- **Rewrite:** slå ihop till 1 slutsektion:  
  “Redo att gå vidare?” + 1 primär CTA + 1 sekundär (pris eller kontakt).

### Sektion: `home-banner` (där den förekommer)
- **Keep:** kort trust-strip.
- **Cut:** dekorativ text utan beslutsvärde.
- **Rewrite:** max 12–18 ord.

---

## 3) Grupp: `location-hero` (30 sidor)
**Omfattar:** `/platser/adhd-autism-utredning-*` + `/en/locations/*`.

### Sektion: `location-hero`
- **Keep:** lokal kontext och upplägg.
- **Cut:** allmänna formuleringar som inte är ortspecifika.
- **Rewrite:** 60–90 ord med 1 lokal referens + 1 processutfall.

### Sektion: `location-journey`
- **Keep:** stegstruktur (mycket bra för skannbarhet).
- **Cut:** långa underlistor i varje steg.
- **Rewrite:** max 2 bullets per steg, 12–16 ord per punkt.

### Sektion: `location-details`
- **Keep:** praktiska användningsområden.
- **Cut:** upprepning av journey-innehåll.
- **Rewrite:** fokusera på “för vem detta passar” + “förväntad effekt i vardagen”.

### Sektion: `location-map` (där den finns)
- **Keep:** kartan.
- **Cut:** extra förklaringsstycken.
- **Rewrite:** en rad med täckning och digital leverans.

### Sektion: `location-cta` / `contact-form-section`
- **Keep:** tydligt nästa steg.
- **Cut:** två nästan identiska CTA-texter efter varandra.
- **Rewrite:** CTA-copy med friktionstänk: “Beskriv kort din situation – vi föreslår första steg inom 1 vardag.”

---

## 4) Grupp: `coachning-hero` (13 sidor)
**Omfattar:** `/coachning/*`, `/en/coaching/*`, `/en/executive-function-coaching/`.

### Sektion: `coachning-hero`
- **Keep:** tydlig målgrupp + resultat.
- **Cut:** långa problemuppräkningar i hero.
- **Rewrite:** 45–70 ord + 1 konkret outcome (“färre startstopp”, “stabilare planering”).

### Sektion: `coachning-section`
- **Keep:** struktur i block.
- **Cut:** överlapp mellan “hur det fungerar” och “vad vi jobbar med”.
- **Rewrite:** använd fast mall per sektion: “Mål”, “Arbetssätt”, “Resultat” (3 korta stycken).

### Sektion: `coachning-program` / `coachning-fit` / `coachning-quickwins`
- **Keep:** segmentering efter behov.
- **Cut:** fler än 5 programpunkter i samma vy.
- **Rewrite:** visa 3 huvudprogram, länka “se alla” istället för att lista allt direkt.

### Sektion: `coachning-cta-band`
- **Keep:** band-CTA.
- **Cut:** generell text.
- **Rewrite:** ge val: “Boka samtal” / “Se priser”.

---

## 5) Grupp: `guide-hero` (4 sidor)
**Omfattar:** `/kunskap/adhd-dygnet-runt/`, `/kunskap/autism-guide/`, `/en/knowledge/adhd-around-the-clock/`, `/en/knowledge/autism-guide/`.

### Sektion: `guide-hero`
- **Keep:** guideformat och orientering.
- **Cut:** för lång intro.
- **Rewrite:** 50–80 ord + “det här får du i guiden” med 3 punkter.

### Sektion: `guide-section`
- **Keep:** uppdelning i korta teman.
- **Cut:** undersektioner med över 120 ord.
- **Rewrite:** mål 60–90 ord/sektion, avsluta med 1 praktisk rekommendation.

### Sektion: `guide-cta`
- **Keep:** avslutande nästa steg.
- **Cut:** bred CTA utan kontext.
- **Rewrite:** kontext-CTA: “Vill du utreda detta vidare?” + länkar till rätt tjänster.

---

## 6) Grupp: `hero` (3 sidor)
**Omfattar:** `/`, `/en/`, `/en/access-to-work-adhd-coach/`.

### Sektion: `hero`
- **Keep:** tydlig value proposition.
- **Cut:** fler än två budskapspåståenden i H1/lead.
- **Rewrite:** ett huvudlöfte + ett stödbevis.

### Sektioner: `antonia-reviews` / `home-pillars` (tunga)
- **Keep:** social proof / positionering.
- **Cut:** ~30–40% text (nu mycket hög densitet).
- **Rewrite:** visa 3 korta kort med “problem → lösning → effekt” istället för långa stycken.

### Sektion: `team-feature` / `home-contact`
- **Keep:** team + nästa steg.
- **Cut:** upprepning av samma CTA-formulering.
- **Rewrite:** teamsektion = trovärdighet, kontaktssektion = handling.

---

## 7) Grupp: `pricing-intro` (5 sidor)
**Omfattar:** `/priser/`, `/delbetalning/*`, `/en/pricing/`.

### Sektion: `pricing-intro`
- **Keep:** snabb orientering.
- **Cut:** generell säljkopia.
- **Rewrite:** “Prisöversikt i korthet” med 3 bullets: vad ingår, frånpris, nästa steg.

### Sektioner: `who-section` + `(no-class)` textblock
- **Keep:** saklig förklaring av finansiering och villkor.
- **Cut:** redundanta disclaimers i flera block.
- **Rewrite:** en tydlig “Viktigt att veta”-sektion + en “Så ansöker du” i 3 steg.

### Sektion: `contact-form-section` (där den finns)
- **Keep:** kontakt efter prisinformation.
- **Cut:** lång upprepning av finansieringstext.
- **Rewrite:** “Osäker på upplägg? Skicka budgetram så föreslår vi alternativ.”

---

## 8) Grupp: `pricing-service-hero` (3 sidor)
**Omfattar:** `/priser/adhd-medicinering/`, `/priser/adhd-utredning-coachning/`, `/priser/autism-utredning-coachning/`.

### Sektion: `pricing-service-hero`
- **Keep:** tydligt prisfokus.
- **Cut:** medicinska/processdetaljer som hör hemma längre ned.
- **Rewrite:** 60–80 ord + mini-tabell direkt i hero.

### Sektion: `pricing-service-section`
- **Keep:** FAQ-lik struktur.
- **Cut:** över 140 ord i enskilt block.
- **Rewrite:** max 90–120 ord/block och avsluta med “detta ingår/ingår inte”.

### Sektion: `pricing-service-cta` + `contact-form-section`
- **Keep:** dubbelt avslut (information + kontakt).
- **Cut:** dubbla rubriker med samma betydelse.
- **Rewrite:** CTA-rubrik med tydlig avsikt: “Få rekommenderat upplägg och kostnadsbild”.

---

## 9) Grupp: `adhd-screening` (19 sidor)
**Omfattar:** `/test/*` och `/en/test/*` enskilda frågeformulär.

### Sektion: `adhd-screening`
- **Keep:** själva frågebatteriet (inte korta ned frågor).
- **Cut:** långa introduktioner och extra text mellan frågedelar.
- **Rewrite:** intro till 35–50 ord: syfte, tidsåtgång, “ej diagnos”.

---

## 10) Grupp: `tests-hero` (2 sidor)
**Omfattar:** `/test/`, `/en/test/`.

### Sektion: `tests-hero`
- **Keep:** vägledning för val av test.
- **Cut:** generisk text.
- **Rewrite:** “Välj test efter situation” + 3 tydliga ingångar.

### Sektion: `tests-list`
- **Keep:** testkatalog.
- **Cut:** långa beskrivningar per kort.
- **Rewrite:** 1 rad per test + etiketter (tid, målgrupp, nivå).

---

## 11) Grupp: `combined-hero` (1 sida)
**Omfattar:** `/adhd-autism-utredning/`.

### Sektioner: `combined-hero`, `combined-proof`, `combined-journey`, `combined-benefits`, `combined-faq`
- **Keep:** helhetsflödet är bra.
- **Cut:** 15–25% text i hero + FAQ.
- **Rewrite:** flytta delar av “proof” till “journey” för mindre upprepning; behåll max 4 FAQ-frågor.

### Sektion: `combined-cta` + `contact-form-section`
- **Keep:** tydligt avslut.
- **Cut:** dubbel introduktion före formulär.
- **Rewrite:** en rak CTA-rad med tidslöfte för återkoppling.

---

## 12) Grupp: `legal-page` (5 sidor)
**Omfattar:** `/integritetspolicy/`, `/allmanna-villkor/`, `/en/privacy-policy/`, `/en/statutory-complaints-process/`, `/en/terms-and-conditions/`.

### Sektion: `legal-page`
- **Keep:** juridisk fulltext (inte korta ned juridiska krav).
- **Cut:** inga juridiska delar; korta istället visuell friktion.
- **Rewrite:** lägg till 6–10 rader “Kort version” överst + ankarlänkar till rubriker.

---

## 13) Grupp: `(none)` (30 sidor, blandat redirects + innehåll utan `<section>`)
**Omfattar:** alias/redirects och några innehållssidor utan sektionsmarkup.

### Redirect-sidor (`meta refresh`)
`/adhd-test/`, `/autism-test/`, `/coachning/prokrastinerings-test/`, `/en/add-test/`, `/en/adhd-guide/`, `/en/adhd-test/`, `/en/adult-adhd-test/`, `/en/autism-test/`, `/en/child-teen-adhd-test/`, `/en/coaching/procrastination-test/`, `/forsta-adhd-battre/`, `/npf-utredning/`, `/om-oss/`, `/sv/`, `/webbinarier/forsta-adhd-battre/`
- **Keep:** redirect-funktion.
- **Cut:** inget innehållsarbete behövs.
- **Rewrite:** ingen copy-rewrite; säkerställ bara korrekt mål-URL och noindex.

### Innehållssidor utan tydlig sektionslayout
`/resurser/`, `/recensioner/`, `/om-os/`, `/kunskap/anhorigstod/`, `/kunskap/nasta-steg/`, `/kunskap/arkiv/`, `/juridiskt/`, `/juridiskt/anvandarvillkor/`, `/juridiskt/klagomal/`, `/juridiskt/sekretesspolicy/`, `/en/adhd-assessment/coaching/`, `/en/join-our-team/`, `/en/legal/`, `/en/legal/privacy-policy/`, `/tack/`
- **Keep:** grundinnehåll och rubriker.
- **Cut:** auto-injekterad standard-CTA/testblock på juridik- och utilitysidor.
- **Rewrite:** lägg in riktig sektionsstruktur (`hero`, `content`, `cta`) så sidan blir skannbar.

---

## 14) Grupp: `(no-class)` (7 sidor)
**Omfattar:** `/vart-team/*`, `/en/partners/`, `/access-to-work-adhd-coach-2026/`.

### Sektioner utan konsekvent klassning
- **Keep:** expertprofiler och partnersignal.
- **Cut:** fri/inkonsekvent sektionstypografi (ger ojämn upplevelse).
- **Rewrite:** standardisera till återanvändbara block: `profile-hero`, `profile-proof`, `profile-cta`.

---

## 15) Grupp: `guide-hero` / `knowledge-page` / `news-section` (kunskapshubbar)
**Omfattar:** `/kunskap/`, `/en/knowledge/` samt guide-sidorna (redan adresserade ovan).

### Sektion: `knowledge-page` / `news-section`
- **Keep:** tydlig kunskapshubb.
- **Cut:** överlånga kortbeskrivningar i listningar.
- **Rewrite:** 1 rad sammanfattning + “läs mer”-länk per kort.

---

## 16) Grupp: `locations-section` (1 sida)
**Omfattar:** `/platser/` (mycket hög densitet, ~1558 ord i en sektion).

### Sektion: `locations-section`
- **Keep:** ortsöversikten och kortformat.
- **Cut:** ~35–45% textmassa i samma vy.
- **Rewrite:** dela i 3 sektioner:
  1) “Välj tjänst” (utredning/medicinering),
  2) “Populära orter” (8–12 kort),
  3) “Alla orter A–Ö” (kompakt lista).

---

## 17) Grupp: övriga enskilda mallar

### `contact-form` (1 sida: `/kontakta-oss/`)
- **Keep:** enkel kontaktväg.
- **Cut:** sekundär text runt formuläret.
- **Rewrite:** rubrik + 1 trygghetsrad + formulär.

### `contact-booking` (1 sida: `/en/contact/`)
- **Keep:** bokningswidget + fallbackform.
- **Cut:** extra förklaring mellan dessa två block.
- **Rewrite:** “1) Pick a time 2) Or message us”.

### `screen` (3 sidor: `/en/thank-you/`, `/en/understand-adhd-better/`, `/webbinarier/adhd-tecken-barn-och-ungdomar/`)
- **Keep:** enkel fokuserad layout.
- **Cut:** onödiga sidospår.
- **Rewrite:** en huvudhandling per sida (registrera/tillbaka/boka).

### `careers-hero` (1 sida: `/bli-en-del-av-teamet/`)
- **Keep:** rekryterings-H1.
- **Cut:** allmän employer-branding text.
- **Rewrite:** kort EVP + 3 konkreta roller + CTA till ansökan.

### `content` (1 sida: `/utredning/`)
- **Keep:** saklig huvudtext.
- **Cut:** långa obrutna stycken.
- **Rewrite:** dela i 3 underrubriker: “När behövs utredning?”, “Så går det till”, “Nästa steg”.

### `webinar-hero` (1 sida: `/webbinarier/`)
- **Keep:** enkel hubb.
- **Cut:** mellantext.
- **Rewrite:** kort event-kort med datum, målgrupp, tidsåtgång, CTA.

### `coach-profile-layout` (4 sidor: `/en/about-us/*`)
- **Keep:** trovärdiga profiler.
- **Cut:** upprepad bakgrundstext mellan profiler.
- **Rewrite:** standardblock: “Focus areas”, “Who I work best with”, “Session style”, “Pricing”.

### `adhd-coaching-breakdown-hero` + `autism-coaching-breakdown-hero` (2 sidor)
- **Keep:** tydlig process + pris.
- **Cut:** överlapp mellan process och FAQ.
- **Rewrite:** process (6 steg) + FAQ (max 4 frågor) + en enda kontaktsektion.

---

## Prioriterad åtgärdsordning (högst effekt först)
1. `/platser/` (`locations-section`) – stor textmassa i en enda sektion.  
2. Alla `who-hero`-sidor (31 st) – många sektioner med hög redundans.  
3. Alla `contact-form-section`-sidor för ADHD-medicinering (100 st) – duplicerad ortstext och dubbla formulärintro.  
4. Startsidor (`/`, `/en/`) – tunga mittsektioner (`antonia-reviews`, `home-pillars`).  
5. Delbetalning/prissidor (`pricing-intro`, `pricing-service-hero`) – för mycket text före beslutspunkt.  

---

## Konkreta skrivregler att använda vid rewrite
- Byt “informationsstycke + informationsstycke” mot “informationsstycke + beslutspunkt”.
- Max 1 huvudbudskap per sektion.
- Korta meningar (10–18 ord) i hero/CTA.
- Aktiv svenska: “Du får”, “Vi gör”, “Nästa steg är”.
- Undvik upprepning av samma trust-argument i flera sektioner på samma sida.
