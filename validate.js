#!/usr/bin/env node
// ─────────────────────────────────────────────
// FitCoachPro — validate.js
// Gebruik: node validate.js index.html
// ─────────────────────────────────────────────

const fs = require("fs");
const path = require("path");

const file = process.argv[2];
if (!file) { console.error("Gebruik: node validate.js index.html"); process.exit(1); }

const html = fs.readFileSync(path.resolve(file), "utf8");
const errors = [], warnings = [], ok = [];

// ── 1. charset als eerste in <head> ──────────
const headContent = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] || "";
const charsetPos = headContent.indexOf("<meta charset");
const firstLinkPos = headContent.indexOf("<link");
if (charsetPos > firstLinkPos && firstLinkPos !== -1) {
  errors.push("<meta charset> moet VOOR de <link> tags staan in <head>");
} else ok.push("charset positie correct");

// ── 2. isDark dubbele ternary chains ─────────
const chains = (html.match(/isDark\?"[^"]+":isDark\?"[^"]+"/g) || []).length;
const nested = [...html.matchAll(/isDark\?\s*isDark\?/g)].length;
if (chains > 0) errors.push(`${chains}x dubbele isDark ternary chain (isDark?A:isDark?B:C)`);
else ok.push("geen dubbele isDark chains");
if (nested > 0) errors.push(`${nested}x geneste isDark (isDark?isDark?...)`);
else ok.push("geen geneste isDark");

// ── 3. S variabele in SettingsModal ──────────
const settingsBlock = html.match(/function SettingsModal[\s\S]*?^}/m)?.[0] || 
                      html.split("function SettingsModal")[1] || "";
if (settingsBlock && !settingsBlock.includes("const S=") && !settingsBlock.includes("const S =")) {
  errors.push("SettingsModal mist 'const S' — crash bij tab klik!");
} else ok.push("S variabele aanwezig in SettingsModal");

// ── 4. P_DEFAULT bevat biceps + triceps ──────
if (!html.includes('biceps:"') && !html.includes("biceps:'")) {
  errors.push("P_DEFAULT mist 'biceps' foto — geen afbeelding in training tab");
} else ok.push("P_DEFAULT heeft biceps foto");
if (!html.includes('triceps:"') && !html.includes("triceps:'")) {
  errors.push("P_DEFAULT mist 'triceps' foto — geen afbeelding in training tab");
} else ok.push("P_DEFAULT heeft triceps foto");

// ── 5. Supabase CDN versie ────────────────────
const sbVersion = html.match(/supabase-js@([\d.]+)/)?.[1];
if (!sbVersion) warnings.push("supabase-js CDN versie niet gevonden");
else if (sbVersion.startsWith("2")) ok.push(`supabase-js versie: ${sbVersion}`);
else warnings.push(`supabase-js versie ${sbVersion} — check of sb_publishable_ key werkt`);

// ── 6. React + ReactDOM aanwezig ─────────────
if (!html.includes("react.production.min.js")) errors.push("React CDN script ontbreekt");
else ok.push("React CDN aanwezig");
if (!html.includes("react-dom.production.min.js")) errors.push("ReactDOM CDN script ontbreekt");
else ok.push("ReactDOM CDN aanwezig");

// ── 7. Duplicate IDs ─────────────────────────
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) errors.push(`Duplicate IDs: ${[...new Set(dupes)].join(", ")}`);
else ok.push("geen duplicate IDs");

// ── 8. ServiceWorker registratie ─────────────
if (!html.includes("serviceWorker")) warnings.push("ServiceWorker registratie niet gevonden");
else ok.push("ServiceWorker aanwezig");

// ── 9. Installatie modal aanwezig ────────────
if (!html.includes("installModal")) errors.push("installModal ontbreekt — nieuwe gebruikers krijgen geen installatie-instructies!");
else if (!html.includes("fcp_installed")) errors.push("fcp_installed localStorage check ontbreekt — popup verschijnt altijd!");
else ok.push("installatie modal correct ingesteld");

// ── 10. Licht thema checks ───────────────────
if (!html.includes("isDark?\"#0D0D0D\":\"#F5F5F0\"") && !html.includes('isDark?"#0D0D0D":"#F5F5F0"')) {
  warnings.push("BG licht thema kleur niet gevonden — updateThemeVars mogelijk gewijzigd");
} else ok.push("licht thema BG variabele aanwezig");

// ── 11. Bestandsgrootte ──────────────────────
const kb = (html.length / 1024).toFixed(1);
const lines = html.split("\n").length;
if (html.length > 500 * 1024) warnings.push(`Bestand is ${kb}KB — overweeg code-splitting`);
else ok.push(`Bestandsgrootte: ${kb}KB (${lines} regels)`);

// ── RAPPORT ───────────────────────────────────
console.log("\n╔══════════════════════════════════════════╗");
console.log("║     FitCoachPro — Validatie Rapport      ║");
console.log("╚══════════════════════════════════════════╝\n");

if (ok.length) {
  console.log("✅  GESLAAGD");
  ok.forEach(m => console.log("   ✓", m));
}
if (warnings.length) {
  console.log("\n⚠️   WAARSCHUWINGEN");
  warnings.forEach(m => console.log("   ⚠", m));
}
if (errors.length) {
  console.log("\n❌  FOUTEN");
  errors.forEach(m => console.log("   ✗", m));
}

console.log("\n──────────────────────────────────────────");
if (errors.length === 0) {
  console.log(`✅  Klaar om te uploaden! (${warnings.length} waarschuwing${warnings.length !== 1 ? "en" : ""})\n`);
  process.exit(0);
} else {
  console.log(`❌  ${errors.length} fout${errors.length !== 1 ? "en" : ""} gevonden — upload uitgesteld!\n`);
  process.exit(1);
}
