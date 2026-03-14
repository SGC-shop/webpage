const CONFIG_URL = "./data/config.json";
const PRODUCTS_URL = "./data/products.json";
const OFFERS_URL = "./data/offers.json";

const THEME_KEY = "sgc-theme"; // "system" | "light" | "dark"

function qs(sel) {
  return document.querySelector(sel);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function waLink(phone, text) {
  const num = normalizePhone(phone).replace("+", "");
  const encoded = encodeURIComponent(text || "");
  return `https://wa.me/${num}?text=${encoded}`;
}

function telLink(phone) {
  const num = normalizePhone(phone);
  return `tel:${num}`;
}

function mailtoLink(email, subject) {
  const e = String(email || "").trim();
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return `mailto:${encodeURIComponent(e)}${suffix}`;
}

function unique(arr) {
  return [...new Set(arr)];
}

function getSystemPrefersDark() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getThemeMode() {
  const raw = localStorage.getItem(THEME_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

function setThemeMode(mode) {
  localStorage.setItem(THEME_KEY, mode);
  applyThemeMode(mode);
  syncThemeButtons(mode);
}

function applyThemeMode(mode) {
  const root = document.documentElement;
  const shouldDark = mode === "dark" || (mode === "system" && getSystemPrefersDark());
  root.classList.toggle("dark", shouldDark);
}

function syncThemeButtons(mode) {
  const buttons = [
    { id: "#theme-system", mode: "system" },
    { id: "#theme-light", mode: "light" },
    { id: "#theme-dark", mode: "dark" }
  ];

  for (const b of buttons) {
    const el = qs(b.id);
    if (!el) continue;
    const active = b.mode === mode;
    el.classList.toggle("bg-slate-100", active);
    el.classList.toggle("dark:bg-white/10", active);
  }
}

function initThemeToggle() {
  const mode = getThemeMode();
  applyThemeMode(mode);
  syncThemeButtons(mode);

  qs("#theme-system")?.addEventListener("click", () => setThemeMode("system"));
  qs("#theme-light")?.addEventListener("click", () => setThemeMode("light"));
  qs("#theme-dark")?.addEventListener("click", () => setThemeMode("dark"));

  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getThemeMode() === "system") applyThemeMode("system");
    };
    // Safari fallback
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", onChange);
    else if (typeof mq.addListener === "function") mq.addListener(onChange);
  }
}

function includesCI(haystack, needle) {
  return String(haystack).toLowerCase().includes(String(needle).toLowerCase());
}

const TAG_TONES = {
  slate:
    "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10",
  brand:
    "bg-brand-50 text-brand-800 ring-brand-200/60 dark:bg-brand-600/15 dark:text-brand-100 dark:ring-brand-500/25",
  emerald:
    "bg-emerald-50 text-emerald-800 ring-emerald-200/60 dark:bg-emerald-500/15 dark:text-emerald-100 dark:ring-emerald-400/25"
};

function renderTag(label, tone = "slate") {
  const klass = TAG_TONES[tone] || TAG_TONES.slate;
  return `<span class="inline-flex items-center rounded-full px-3 py-1 text-xs ring-1 ${klass}">${escapeHtml(
    label
  )}</span>`;
}

function renderTagLink(label, href, tone = "slate") {
  const base = TAG_TONES[tone] || TAG_TONES.slate;
  const interactive =
    "cursor-pointer hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-400";
  return `<a href="${escapeHtml(href)}" data-target="${escapeHtml(
    href
  )}" class="inline-flex items-center rounded-full px-3 py-1 text-xs ring-1 ${base} ${interactive}">${escapeHtml(
    label
  )}</a>`;
}

function offerThemeClasses(theme) {
  if (theme === "brand")
    return {
      badge:
        "bg-brand-600/10 text-brand-900 ring-brand-200/60 dark:bg-brand-600/20 dark:text-brand-100 dark:ring-brand-500/25",
      border: "ring-brand-200/70 dark:ring-brand-500/20"
    };
  if (theme === "emerald")
    return {
      badge:
        "bg-emerald-600/10 text-emerald-900 ring-emerald-200/60 dark:bg-emerald-500/20 dark:text-emerald-100 dark:ring-emerald-400/25",
      border: "ring-emerald-200/70 dark:ring-emerald-400/20"
    };
  return {
    badge:
      "bg-slate-100 text-slate-900 ring-slate-200 dark:bg-white/10 dark:text-slate-100 dark:ring-white/15",
    border: "ring-slate-200/70 dark:ring-white/10"
  };
}

function buildWhatsAppTextFromTemplate(template, vars) {
  let text = String(template || "");
  for (const [k, v] of Object.entries(vars || {})) {
    text = text.replaceAll(`{{${k}}}`, String(v ?? ""));
  }
  // The template may already include %0A; if so, decode first so we can re-encode reliably.
  try {
    text = decodeURIComponent(text);
  } catch {
    // ignore
  }
  return text;
}

function productMatchesFilters(p, { q, category, audience }) {
  const query = String(q || "").trim();
  const catOk = category === "all" ? true : p.category === category;
  const audienceOk = audience === "all" ? true : (p.audience || []).map(String).includes(audience);

  if (!catOk || !audienceOk) return false;
  if (!query) return true;

  const fields = [p.name, p.category, ...(p.tags || []), ...(p.highlights || []), p.priceNote]
    .filter(Boolean)
    .join(" • ");
  return includesCI(fields, query);
}

function productCardHtml(p, cfg) {
  const placeholder = `
    <div class="grid h-44 w-full place-items-center rounded-2xl bg-gradient-to-br from-brand-100 via-white to-emerald-100 ring-1 ring-slate-200/70 dark:from-brand-500/20 dark:via-white/5 dark:to-emerald-500/10 dark:ring-white/10">
      <div class="text-center">
        <div class="text-xs text-slate-600 dark:text-slate-300">SHREE GANESH COLLECTION</div>
        <div class="mt-1 text-lg font-black">${escapeHtml(p.category || "Apparel")}</div>
      </div>
    </div>
  `.trim();

  const img =
    p.image && typeof p.image === "string"
      ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(
          p.name
        )}" class="h-44 w-full rounded-2xl object-cover ring-1 ring-slate-200/70 dark:ring-white/10" loading="lazy" />`
      : placeholder;

  const waNumber = cfg?.store?.whatsapp || cfg?.store?.phone || "";
  const template = cfg?.order?.whatsappPrefillTemplate || "";
  const waText = buildWhatsAppTextFromTemplate(template, {
    item: p.name || "",
    category: p.category || "",
    size: "<size>",
    qty: "1"
  });
  const orderHref = waNumber ? waLink(waNumber, waText) : "#order";

  const audienceTags = unique((p.audience || []).map(String)).slice(0, 4);
  const tags = unique([...(p.tags || []), ...audienceTags]).slice(0, 6);
  const tagsHtml = tags.map((t) => renderTag(t)).join("");

  const highlightsHtml = (p.highlights || [])
    .slice(0, 3)
    .map((h) => `<li class="text-sm text-slate-700 dark:text-slate-200">• ${escapeHtml(h)}</li>`)
    .join("");

  return `
    <article class="rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-md shadow-slate-900/5 hover:shadow-lg hover:ring-slate-300 transition dark:bg-white/5 dark:ring-white/10 dark:shadow-none">
      ${img}
      <div class="mt-4 flex items-start justify-between gap-3">
        <div>
          <div class="text-xs text-slate-600 dark:text-slate-300">${escapeHtml(
            p.category || ""
          )}</div>
          <h3 class="mt-1 text-lg font-black leading-snug">${escapeHtml(p.name || "")}</h3>
        </div>
        <span class="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">Inquire</span>
      </div>

      <ul class="mt-3 space-y-1">
        ${highlightsHtml}
      </ul>

      ${
        p.priceNote
          ? `<div class="mt-3 text-sm text-slate-600 dark:text-slate-300"><span class="text-slate-900 font-semibold dark:text-slate-100">Price:</span> ${escapeHtml(
              p.priceNote
            )}</div>`
          : ""
      }

      <div class="mt-4 flex flex-wrap gap-2">${tagsHtml}</div>

      <div class="mt-5 flex gap-3">
        <a href="${orderHref}" target="_blank" rel="noreferrer"
          class="inline-flex flex-1 items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
          >Order</a
        >
        <a href="#contact"
          class="inline-flex flex-1 items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200/80 hover:bg-slate-50 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:hover:bg-white/10"
          >Ask</a
        >
      </div>
    </article>
  `.trim();
}

function offerCardHtml(o) {
  const cls = offerThemeClasses(o.theme);
  const details = (o.details || [])
    .slice(0, 6)
    .map((d) => `<li class="text-sm text-slate-700 dark:text-slate-200">• ${escapeHtml(d)}</li>`)
    .join("");

  const idAttr = o.id ? `id="offer-${escapeHtml(o.id)}"` : "";

  return `
    <article ${idAttr} class="rounded-2xl bg-white p-6 ring-1 ${
    cls.border
  } shadow-md shadow-slate-900/5 hover:shadow-lg transition dark:bg-white/5 dark:shadow-none">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-lg font-black">${escapeHtml(o.title || "")}</h3>
          ${
            o.subtitle
              ? `<div class="mt-1 text-sm text-slate-600 dark:text-slate-300">${escapeHtml(
                  o.subtitle
                )}</div>`
              : ""
          }
        </div>
        ${
          o.badge
            ? `<span class="rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                cls.badge
              }">${escapeHtml(o.badge)}</span>`
            : ""
        }
      </div>
      <ul class="mt-4 space-y-1">
        ${details}
      </ul>
      <div class="mt-5">
        <a href="#order" class="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
          >Order / Enquire</a
        >
      </div>
    </article>
  `.trim();
}

function orderLinkButtonHtml(link, cfg) {
  const label = link.label || "Open";
  const note = link.note || "";
  const type = link.type || "url";
  const value = link.value || "";

  let href = "#";
  let target = 'target="_blank" rel="noreferrer"';

  if (type === "whatsapp") {
    const template = cfg?.order?.quickTemplatePlainText || "";
    href = waLink(value, template);
  } else if (type === "phone") {
    href = telLink(value);
    target = "";
  } else if (type === "email") {
    href = mailtoLink(value, `Order enquiry - ${cfg?.store?.name || "Store"}`);
    target = "";
  } else {
    href = value;
  }

  const tone =
    type === "whatsapp"
      ? "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
      : "bg-white text-slate-900 ring-1 ring-slate-200/80 hover:bg-slate-50 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:hover:bg-white/10";

  return `
    <a href="${escapeHtml(href)}" ${target}
      class="rounded-2xl p-5 ${tone}">
      <div class="text-sm font-semibold">${escapeHtml(label)}</div>
      ${note ? `<div class="mt-1 text-xs opacity-90">${escapeHtml(note)}</div>` : ""}
    </a>
  `.trim();
}

async function loadJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

function setText(id, text) {
  const el = qs(id);
  if (el) el.textContent = text;
}

function setHref(id, href) {
  const el = qs(id);
  if (el) el.setAttribute("href", href);
}

function setHtml(id, html) {
  const el = qs(id);
  if (el) el.innerHTML = html;
}

function wireCopyTemplate() {
  const btn = qs("#copy-template");
  const pre = qs("#order-template");
  const status = qs("#copy-status");
  if (!btn || !pre || !status) return;

  btn.addEventListener("click", async () => {
    status.textContent = "";
    try {
      await navigator.clipboard.writeText(pre.textContent || "");
      status.textContent = "Copied.";
    } catch {
      status.textContent = "Copy failed. Please select the text and copy manually.";
    }
  });
}

function wireFilters(state, render) {
  const search = qs("#search");
  const category = qs("#category");
  const audience = qs("#audience");
  const reset = qs("#reset-filters");

  const update = () => {
    state.q = search?.value || "";
    state.category = category?.value || "all";
    state.audience = audience?.value || "all";
    render();
  };

  search?.addEventListener("input", update);
  category?.addEventListener("change", update);
  audience?.addEventListener("change", update);

  reset?.addEventListener("click", () => {
    if (search) search.value = "";
    if (category) category.value = "all";
    if (audience) audience.value = "all";
    update();
  });
}

function applyConfig(cfg) {
  const year = new Date().getFullYear();
  setText("#year", String(year));

  setText("#topbar-line", cfg?.store?.tagline || "Ready-made clothing • Bulk orders available");

  const phones = Array.isArray(cfg?.store?.phoneNumbers)
    ? cfg.store.phoneNumbers.filter(Boolean)
    : [];
  const phone = cfg?.store?.phone || phones[0] || "";
  const wa = cfg?.store?.whatsapp || phone || "";
  const mapsUrl = cfg?.store?.mapsUrl || "#";
  const email = cfg?.store?.email || "";

  const phoneHref = phone ? telLink(phone) : "#contact";
  const waHref = wa ? waLink(wa, cfg?.order?.quickTemplatePlainText || "") : "#order";

  ["#topbar-phone", "#store-phone", "#contact-phone"].forEach((id) => setHref(id, phoneHref));
  [
    "#topbar-whatsapp",
    "#store-whatsapp",
    "#contact-whatsapp",
    "#hero-whatsapp",
    "#bulk-whatsapp"
  ].forEach((id) => setHref(id, waHref));
  ["#topbar-maps", "#about-directions", "#contact-maps"].forEach((id) => setHref(id, mapsUrl));

  if (qs("#store-phone")) qs("#store-phone").textContent = phone || "—";
  if (qs("#store-whatsapp")) qs("#store-whatsapp").textContent = wa ? normalizePhone(wa) : "—";

  const contactPhoneList = qs("#contact-phone-list");
  if (contactPhoneList) {
    const all = [phone, ...phones.filter((p) => p && p !== phone)];
    if (all.length) {
      contactPhoneList.innerHTML = all
        .map((p) => {
          const href = telLink(p);
          return `<a href="${escapeHtml(
            href
          )}" class="block rounded-lg bg-white/80 px-3 py-1 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:hover:bg-white/10">${escapeHtml(
            p
          )}</a>`;
        })
        .join("");
    } else {
      contactPhoneList.textContent = phone || "";
    }
  }

  setText("#store-address", cfg?.store?.address || "—");
  setText("#store-hours", cfg?.store?.hours || "—");

  setHref(
    "#contact-email",
    email ? mailtoLink(email, `Enquiry - ${cfg?.store?.name || "Store"}`) : "#contact"
  );

  setText("#about-text", cfg?.about?.text || "");

  // Order links section
  const links = Array.isArray(cfg?.thirdPartyOrderLinks) ? cfg.thirdPartyOrderLinks : [];
  setHtml("#order-links", links.map((l) => orderLinkButtonHtml(l, cfg)).join(""));

  setText("#order-template", cfg?.order?.quickTemplatePlainText || "");
}

function applyOffers(offersJson) {
  if (offersJson?.lastUpdated) {
    setText("#offers-updated", `Updated: ${offersJson.lastUpdated}`);
  }
  const offers = Array.isArray(offersJson?.offers) ? offersJson.offers : [];
  setHtml("#offers-grid", offers.map(offerCardHtml).join(""));

  // Hero highlight uses first offer if present.
  if (offers.length) {
    const o = offers[0];
    setText("#highlight-title", o.title || "Offers");
    setText("#highlight-desc", o.subtitle || "Check our latest deals and seasonal discounts.");
    const tags = [o.badge, ...(o.details || []).slice(0, 2)].filter(Boolean);
    const tagsHtml = tags
      .map((t, i) => {
        const tone = i === 0 ? (o.theme === "emerald" ? "emerald" : "brand") : "slate";
        const target = o.id ? `#offer-${o.id}` : "#offers";
        return renderTagLink(t, target, tone);
      })
      .join("");
    setHtml("#highlight-tags", tagsHtml);

    const tagsEl = qs("#highlight-tags");
    if (tagsEl && !tagsEl.dataset.wired) {
      tagsEl.addEventListener("click", (event) => {
        const targetEl = event.target.closest("a[data-target]");
        if (!targetEl) return;
        const targetSel = targetEl.getAttribute("data-target") || "";
        if (!targetSel) return;
        const dest = document.querySelector(targetSel);
        if (dest) {
          event.preventDefault();
          dest.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
      tagsEl.dataset.wired = "true";
    }
  } else {
    setText("#highlight-title", "New arrivals & offers");
    setText("#highlight-desc", "Message us for today’s availability and best deals.");
    setHtml(
      "#highlight-tags",
      [renderTag("Casual wear"), renderTag("Uniforms"), renderTag("Bulk orders", "emerald")].join(
        ""
      )
    );
  }
}

function initProducts(productsJson, cfg) {
  const products = Array.isArray(productsJson?.products) ? productsJson.products : [];
  const categories = unique(products.map((p) => p.category).filter(Boolean)).sort((a, b) =>
    a.localeCompare(b)
  );

  // Stats
  setText("#stat-products", String(products.length));
  setText("#stat-categories", String(categories.length));

  // Category dropdown
  const sel = qs("#category");
  if (sel) {
    const existing = new Set(Array.from(sel.querySelectorAll("option")).map((o) => o.value));
    for (const c of categories) {
      if (existing.has(c)) continue;
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    }
  }

  const state = { q: "", category: "all", audience: "all" };
  const render = () => {
    const filtered = products.filter((p) => productMatchesFilters(p, state));
    setText("#results-count", String(filtered.length));
    setHtml("#products-grid", filtered.map((p) => productCardHtml(p, cfg)).join(""));
  };

  wireFilters(state, render);
  render();
}

async function main() {
  try {
    initThemeToggle();
    const [cfg, productsJson, offersJson] = await Promise.all([
      loadJson(CONFIG_URL),
      loadJson(PRODUCTS_URL),
      loadJson(OFFERS_URL)
    ]);

    applyConfig(cfg);
    applyOffers(offersJson);
    initProducts(productsJson, cfg);
    wireCopyTemplate();
  } catch (err) {
    console.error(err);
    setText("#highlight-title", "Setup needed");
    setText(
      "#highlight-desc",
      "We couldn’t load the product/offer data files. If you opened this file directly, please run a local server (see README)."
    );
  }
}

main();
