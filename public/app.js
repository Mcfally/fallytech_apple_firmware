const select = document.getElementById("deviceSelect");
const versionSelect = document.getElementById("versionSelect");
const versionLabel = document.getElementById("versionLabel");
const list = document.getElementById("firmwareList");
const message = document.getElementById("message");
const status = document.getElementById("apiStatus");
const deviceControls = document.getElementById("deviceControls");
const downloadSection = document.getElementById("downloadSection");
const downloadBtn = document.getElementById("downloadBtn");
const downloadInfo = document.getElementById("downloadInfo");
const productBtns = document.querySelectorAll(".product-btn");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = themeToggle.querySelector(".theme-icon");

let devices = [];
let selectedProduct = null;
let currentFirmwares = [];

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.dataset.theme = theme;
  themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeIcon.classList.remove("fa-sun", "fa-moon");
  themeIcon.classList.add(isDark ? "fa-moon" : "fa-sun");
  localStorage.setItem("theme", theme);
}

const savedTheme = localStorage.getItem("theme");
const preferredTheme = "dark";
applyTheme(savedTheme || preferredTheme);

themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
});

// Product type keywords for filtering
const productKeywords = {
  iPhone: ["iphone"],
  iPad: ["ipad"],
  Watch: ["watch", "sport", "edition"],
  Mac: ["macbook", "mac mini", "mac studio", "mac pro", "imac", "macbook pro", "macbook air", "mac mini"]
};

async function loadDevices() {
  try {
    const r = await fetch("/api/devices");
    if (!r.ok) throw new Error("API unavailable");
    devices = await r.json();
    status.textContent = "Live API connected";
    status.style.background = "#ecfdf3";
    status.style.color = "#027a48";
  } catch (e) {
    status.textContent = "API error";
    status.style.background = "#fef3f2";
    status.style.color = "#b42318";
    message.textContent = "The IPSW service could not be reached. Check your internet connection and restart the server.";
  }
}

function getProductType(deviceName) {
  const normalized = String(deviceName || "").toLowerCase();
  for (const [product, keywords] of Object.entries(productKeywords)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      return product;
    }
  }
  return null;
}

function getFilteredDevices(product) {
  return devices.filter(d => getProductType(d.name) === product);
}

function renderDeviceOptions(items) {
  select.innerHTML = '<option value="">Choose a device…</option>';
  items.forEach(d => {
    const o = document.createElement("option");
    o.value = d.identifier;
    o.textContent = `${d.name} (${d.identifier})`;
    select.appendChild(o);
  });
}

productBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    productBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedProduct = btn.dataset.product;
    
    const filtered = getFilteredDevices(selectedProduct);
    if (filtered.length === 0) {
      message.textContent = `No ${selectedProduct} devices found.`;
      deviceControls.style.display = "none";
      list.innerHTML = "";
      downloadSection.classList.remove("visible");
      return;
    }
    
    deviceControls.style.display = "grid";
    versionLabel.style.display = ["iPhone", "iPad", "Watch", "Mac"].includes(selectedProduct) ? "block" : "none";
    renderDeviceOptions(filtered);
    message.textContent = `Select a ${selectedProduct} to load firmware.`;
    list.innerHTML = "";
    downloadSection.classList.remove("visible");
    versionSelect.innerHTML = '<option value="">Loading versions…</option>';
    versionPreview.classList.add("hidden");
  });
});

select.addEventListener("change", async () => {
  const id = select.value;
  if (!id) {
    list.innerHTML = "";
    versionPreview.classList.add("hidden");
    message.textContent = `Select a ${selectedProduct} to load firmware.`;
    downloadSection.classList.remove("visible");
    return;
  }

  message.textContent = "Loading firmware from IPSW.me…";
  list.innerHTML = "";
  downloadSection.classList.remove("visible");
  versionPreview.classList.add("hidden");

  try {
    const r = await fetch(`/api/firmware/${encodeURIComponent(id)}`);
    if (!r.ok) throw new Error("Firmware lookup failed");
    const data = await r.json();
    
    currentFirmwares = (data.firmwares || []);
    
    if (!currentFirmwares.length) {
      message.textContent = "No IPSW firmware was returned for this device.";
      downloadSection.classList.remove("visible");
      return;
    }

    const uniqueVersions = [...new Set(currentFirmwares.map(f => f.version))].sort((a, b) => compareVersions(b, a));

    renderVersionOptions(uniqueVersions);
    message.textContent = `Select an iOS version to download.`;
    downloadSection.classList.remove("visible");
  } catch (e) {
    message.textContent = "Could not load firmware for this device.";
    downloadSection.classList.remove("visible");
  }
});

function compareVersions(a, b) {
  const aParts = String(a).split('.').map(Number);
  const bParts = String(b).split('.').map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;
    if (aVal !== bVal) return aVal - bVal;
  }

  return 0;
}

const versionPreview = document.getElementById("versionPreview");
const versionPreviewText = document.getElementById("versionPreviewText");

function renderVersionOptions(versions) {
  versionSelect.innerHTML = '<option value="">Choose a version…</option>';
  const sortedVersions = [...new Set(versions)].sort((a, b) => compareVersions(b, a));

  sortedVersions.forEach((v, index) => {
    const o = document.createElement("option");
    const isLatest = index === 0;
    o.value = v;
    o.textContent = isLatest ? `✓ Latest — ${v}` : `✕ ${v}`;
    o.style.color = isLatest ? "#027a48" : "#b42318";
    o.style.fontWeight = isLatest ? "700" : "500";
    versionSelect.appendChild(o);
  });

  const latestVersion = sortedVersions[0];
  if (latestVersion) {
    versionSelect.value = "";
    versionPreview.classList.remove("hidden");
    versionPreviewText.textContent = `Recommended iOS: ${latestVersion}`;
  } else {
    versionSelect.value = "";
    versionPreview.classList.add("hidden");
    downloadSection.style.display = "none";
  }
}

versionSelect.addEventListener("change", () => {
  const selectedVersion = versionSelect.value;
  if (!selectedVersion) {
    downloadSection.classList.remove("visible");
    return;
  }

  const firmwareForVersion = currentFirmwares.find(f => f.version === selectedVersion);
  if (!firmwareForVersion || !firmwareForVersion.url) {
    message.textContent = "Download link not available for this version.";
    downloadSection.classList.remove("visible");
    return;
  }

  const size = firmwareForVersion.filesize ? formatBytes(firmwareForVersion.filesize) : "Size unavailable";
  const date = firmwareForVersion.releasedate ? new Date(firmwareForVersion.releasedate).toLocaleDateString() : "—";
  const buildId = firmwareForVersion.buildid || "N/A";
  const signed = firmwareForVersion.signed ? "✅ Signed" : "⚠️ Unsigned";

  downloadInfo.innerHTML = `
    <div style="font-size: 14px; color: #344054;">
      <p style="margin: 0 0 8px 0;"><b>Version:</b> ${escapeHtml(selectedVersion)}</p>
      <p style="margin: 0 0 8px 0;"><b>Build ID:</b> ${escapeHtml(buildId)}</p>
      <p style="margin: 0 0 8px 0;"><b>Released:</b> ${escapeHtml(date)}</p>
      <p style="margin: 0 0 8px 0;"><b>Size:</b> ${escapeHtml(size)}</p>
      <p style="margin: 0;"><b>Status:</b> ${signed}</p>
    </div>
  `;

  downloadBtn.href = firmwareForVersion.url;
  downloadSection.classList.add("visible");
  message.textContent = `Ready to download iOS ${selectedVersion}`;
});

function formatBytes(bytes) {
  if (!bytes) return "—";
  const units = ["B","KB","MB","GB","TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

function escapeHtml(v) {
  return String(v).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', event => {
    const targetId = link.getAttribute('href');
    if (!targetId || targetId === '#') return;

    const target = document.querySelector(targetId);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.pushState(null, '', targetId);
  });
});

const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach((el) => revealObserver.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('visible'));
}

loadDevices();
