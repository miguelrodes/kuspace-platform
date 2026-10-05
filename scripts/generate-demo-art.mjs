import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(readFileSync(path.join(root, "prisma/platform-demo-seed.json"), "utf8"));
const artDirectory = path.join(root, "public/demo/event-art");
const manifestPath = path.join(root, "lib/demo-event-art-manifest.json");

const families = {
  afterlife: { colors: ["#081222", "#274d83", "#65d9dd"], motif: "portal" },
  elrow: { colors: ["#2b1138", "#e94e93", "#f8d46d"], motif: "confetti" },
  sundays: { colors: ["#192d4c", "#ec8c62", "#ffe6a2"], motif: "horizon" },
  onyx: { colors: ["#0b1319", "#4d696d", "#a8df78"], motif: "facets" },
  glitterbox: { colors: ["#212245", "#ae78a9", "#eed3a5"], motif: "mirrors" },
  carlCox: { colors: ["#101c39", "#4868d3", "#ffae5b"], motif: "orbits" },
  brasilio: { colors: ["#34182e", "#ec7656", "#efc79b"], motif: "ribbons" },
  beach: { colors: ["#12334b", "#3ca6b6", "#b7e1bd"], motif: "waves" },
  circoloco: { colors: ["#1b2028", "#d8625b", "#f2bd80"], motif: "pulse" },
  paradise: { colors: ["#0c2f35", "#529d86", "#e8cf83"], motif: "grove" },
  paradiseClosing: { colors: ["#172b39", "#ad785f", "#f3cc88"], motif: "beams" },
  circolocoClosing: { colors: ["#271e31", "#d9576b", "#eed3a1"], motif: "pulse" },
};

function familyFor(event) {
  const title = event.cover.title.toLowerCase();
  if (title.includes("carl cox")) return "carlCox";
  if (title.includes("elrow")) return "elrow";
  if (title.includes("sundays at space")) return "sundays";
  if (title.includes("glitterbox")) return "glitterbox";
  if (title.includes("afterlife")) return "afterlife";
  if (title.includes("onyx")) return "onyx";
  if (title.includes("brasilio")) return "brasilio";
  if (title.includes("beach club")) return "beach";
  if (title.includes("paradise closing")) return "paradiseClosing";
  if (title.includes("paradise")) return "paradise";
  if (title.includes("circoloco closing")) return "circolocoClosing";
  if (title.includes("circoloco")) return "circoloco";
  throw new Error(`No original demo-art family for ${event.slug}`);
}

function hash(value) {
  let result = 2166136261;
  for (const character of value) {
    result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  }
  return result >>> 0;
}

function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function blendHex(first, second, weight) {
  const parts = [1, 3, 5].map((index) => {
    const a = Number.parseInt(first.slice(index, index + 2), 16);
    const b = Number.parseInt(second.slice(index, index + 2), 16);
    return Math.round(a * (1 - weight) + b * weight).toString(16).padStart(2, "0");
  });
  return `#${parts.join("")}`;
}

function titleLines(title) {
  if (title.includes("Carl Cox")) return ["CARL COX", "THE FINAL CHAPTER"];
  if (title.includes("Sundays At Space")) return ["SUNDAYS AT", "SPACE"];
  if (title.includes("Brasilio")) return ["BRASILIO", "PRESENTA LA TROYA"];
  if (title.includes("Beach Club")) return ["SPACE", "BEACH CLUB"];
  if (title.includes("Circoloco Closing")) return ["CIRCOLOCO", "CLOSING PARTY"];
  if (title.includes("Paradise Closing")) return ["PARADISE", "CLOSING"];
  return [title.toUpperCase()];
}

function motif(name, seed, accent, secondary) {
  const shift = seed % 140;
  const turn = (seed % 34) - 17;
  const composition = (seed >>> 5) % 4;
  const line = `stroke="${accent}" stroke-width="7" fill="none"`;

  switch (name) {
    case "portal":
      return `<g transform="translate(${shift - 70} 0) rotate(${turn / 3} 600 350)" ${line}>${[0, 1, 2, 3, 4].map((n) => `<rect x="${345 + n * 34}" y="${-130 + n * 38}" width="${620 - n * 68}" height="${720 - n * 65}" rx="${160 - n * 22}" opacity="${0.72 - n * 0.09}"/>`).join("")}</g><circle cx="${810 - shift}" cy="180" r="112" fill="${secondary}" opacity=".28"/>`;
    case "confetti":
      return `<g>${Array.from({ length: 24 }, (_, n) => { const x = 80 + ((seed + n * 193) % 1040); const y = 30 + ((seed * 3 + n * 127) % 490); return `<rect x="${x}" y="${y}" width="${24 + (n % 4) * 12}" height="${85 + (n % 3) * 25}" rx="6" fill="${n % 3 ? accent : secondary}" opacity="${0.45 + (n % 4) * 0.1}" transform="rotate(${(seed + n * 43) % 160} ${x} ${y})"/>`; }).join("")}</g>`;
    case "horizon":
      return `<circle cx="${520 + composition * 165}" cy="${250 + (seed % 3) * 52}" r="${195 + composition * 18}" fill="${secondary}" opacity=".72"/><g stroke="${accent}" stroke-width="25" opacity=".8">${Array.from({ length: 9 }, (_, n) => `<path d="M0 ${92 + n * 64}H1200"/>`).join("")}</g><path d="M0 470 Q350 ${340 + shift} 660 470 T1200 470 V750 H0Z" fill="${accent}" opacity=".4"/>`;
    case "facets":
      return `<g transform="rotate(${turn} 600 320)"><path d="M135 520 410 60 650 350 420 625Z" fill="${accent}" opacity=".58"/><path d="M430 590 720 -75 1080 300 790 660Z" fill="${secondary}" opacity=".35"/><path d="m230 530 390-430 390 380" ${line}/></g>`;
    case "mirrors":
      return `<g transform="rotate(${turn} 600 320)">${Array.from({ length: 5 }, (_, n) => `<rect x="${130 + n * 160}" y="${100 + ((n + shift) % 3) * 70}" width="220" height="220" fill="none" stroke="${n % 2 ? secondary : accent}" stroke-width="18" opacity=".6"/>`).join("")}</g><circle cx="905" cy="115" r="84" fill="${secondary}" opacity=".5"/>`;
    case "orbits":
      return `<g transform="rotate(${turn} ${470 + composition * 100} 320)" ${line}>${[130, 205, 285, 370].map((r, n) => `<circle cx="${470 + composition * 100}" cy="${285 + (seed % 3) * 25}" r="${r}" opacity="${0.85 - n * 0.13}"/>`).join("")}</g><circle cx="${470 + composition * 100}" cy="${285 + (seed % 3) * 25}" r="135" fill="${secondary}" opacity=".85"/><path d="M${90 + composition * 55} 585 ${970 - composition * 55} 48" stroke="${secondary}" stroke-width="12" opacity=".8"/>`;
    case "ribbons":
      return `<g ${line} opacity=".82">${[0, 1, 2, 3, 4].map((n) => `<path d="M${-110 + n * 220} -80 C${190 + n * 190} 125 ${-70 + n * 220} 335 ${280 + n * 205} 570" stroke-width="${30 + n * 3}"/>`).join("")}</g><circle cx="930" cy="150" r="125" fill="${secondary}" opacity=".45"/>`;
    case "waves":
      return `<circle cx="${920 - shift}" cy="135" r="135" fill="${secondary}" opacity=".58"/><g ${line}>${Array.from({ length: 8 }, (_, n) => `<path d="M-60 ${90 + n * 68} Q250 ${-40 + n * 68 + shift} 600 ${105 + n * 68} T1260 ${105 + n * 68}" opacity="${0.75 - n * 0.04}"/>`).join("")}</g>`;
    case "pulse":
      return `<g stroke="${accent}" stroke-width="2" opacity=".3">${Array.from({ length: 16 }, (_, n) => `<path d="M${n * 85} 0v750"/>`).join("")}${Array.from({ length: 10 }, (_, n) => `<path d="M0 ${n * 85}h1200"/>`).join("")}</g><path d="M-40 285 180 285 255 ${200 + shift} 350 420 440 160 535 285 650 285 725 120 815 440 900 285 1240 285" transform="translate(${composition * 45 - 70} ${composition * 30 - 50})" stroke="${secondary}" stroke-width="22" fill="none" stroke-linejoin="round" opacity=".85"/><circle cx="${825 + composition * 78}" cy="${130 + composition * 32}" r="${95 + composition * 18}" fill="${accent}" opacity=".55"/>`;
    case "grove":
      return `<g transform="rotate(${turn / 2} 660 300)">${[0, 1, 2, 3, 4, 5].map((n) => `<ellipse cx="${275 + n * 130}" cy="${240 + (n % 2) * 85}" rx="${90 + (n % 3) * 25}" ry="235" fill="none" stroke="${n % 2 ? accent : secondary}" stroke-width="16" opacity=".65"/>`).join("")}</g><circle cx="870" cy="170" r="125" fill="${secondary}" opacity=".48"/>`;
    case "beams":
      return `<g transform="rotate(${turn / 2} 600 300)">${Array.from({ length: 10 }, (_, n) => `<path d="M${-100 + n * 150} -80  ${110 + n * 150} -80 ${-100 + n * 150} 610 ${-310 + n * 150} 610Z" fill="${n % 2 ? accent : secondary}" opacity="${0.25 + (n % 3) * 0.12}"/>`).join("")}</g><circle cx="890" cy="180" r="145" fill="none" stroke="${secondary}" stroke-width="18" opacity=".7"/>`;
    default:
      throw new Error(`Unsupported art motif: ${name}`);
  }
}

function render(event, familyName) {
  const family = families[familyName];
  const seedValue = hash(event.slug);
  const [year, month, day] = event.cover.date.split("-");
  const monthLabel = new Date(`${year}-${month}-${day}T12:00:00Z`).toLocaleString("en", { month: "short", timeZone: "UTC" }).toUpperCase();
  const lines = titleLines(event.cover.title);
  const organization = event.organizationId === "organization-dc10-ibiza" ? "DC10 IBIZA" : "SPACE IBIZA";
  const [base, familyAccent, familySecondary] = family.colors;
  const variant = Number(day) % 3;
  const accent = variant === 0 ? familyAccent : blendHex(familyAccent, variant === 1 ? familySecondary : base, .38);
  const secondary = variant === 2 ? blendHex(familySecondary, familyAccent, .3) : familySecondary;
  const topColor = seedValue % 2 ? accent : secondary;
  const titleSize = lines.some((line) => line.length > 18) ? 60 : lines.length > 1 ? 76 : 96;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 750" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(event.cover.title)} — ${monthLabel} ${Number(day)}, ${year}</title>
  <desc id="desc">Original abstract artwork made for the KUSPACE public demo. Not a historical event poster.</desc>
  <defs>
    <linearGradient id="background" x1="0" y1="1" x2="1" y2="0"><stop stop-color="${base}"/><stop offset=".7" stop-color="${accent}"/><stop offset="1" stop-color="${base}"/></linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${base}" stop-opacity="0"/><stop offset="1" stop-color="${base}" stop-opacity=".96"/></linearGradient>
  </defs>
  <rect width="1200" height="750" fill="url(#background)"/>
  ${motif(family.motif, seedValue, accent, secondary)}
  <text x="60" y="68" fill="#f6f0e5" font-family="Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="7">KUSPACE / PUBLIC DEMO</text>
  <text x="1140" y="68" text-anchor="end" fill="${topColor}" font-family="Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="5">${escapeXml(organization)}</text>
  <text x="1140" y="112" text-anchor="end" fill="#fff7e9" font-family="Arial, sans-serif" font-size="25" font-weight="700" letter-spacing="5">${monthLabel} ${day} / ${year}</text>
  <text x="1125" y="232" text-anchor="end" fill="#ffffff" opacity=".13" font-family="Arial, sans-serif" font-size="210" font-weight="900">${Number(day)}</text>
  <rect y="330" width="1200" height="420" fill="url(#shade)"/>
  <path d="M60 405h1080" stroke="${topColor}" stroke-width="3" opacity=".85"/>
  ${lines.map((line, index) => `<text x="58" y="${lines.length > 1 ? 478 + index * 76 : 535}" fill="#fff7e9" font-family="Arial, sans-serif" font-size="${titleSize}" font-weight="900" letter-spacing="-2">${escapeXml(line)}</text>`).join("\n  ")}
</svg>\n`;
}

mkdirSync(artDirectory, { recursive: true });
const manifest = {};
for (const event of seed.events) {
  const family = familyFor(event);
  const filename = `${event.slug}.svg`;
  const imageUrl = `/demo/event-art/${filename}`;
  writeFileSync(path.join(artDirectory, filename), render(event, family));
  manifest[event.slug] = { imageUrl, imageAlt: `Original abstract public-demo artwork for ${event.cover.title} on ${event.cover.date}`, family };
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated ${Object.keys(manifest).length} original event artworks and the demo-art manifest.`);
