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

let devices = [];
let selectedProduct = null;
let currentFirmwares = [];

// Product type keywords for filtering
const productKeywords = {
  iPhone: ["iPhone"],
  iPad: ["iPad"],
  Watch: ["Watch", "Sport", "Edition"],
  Mac: ["MacBook", "Mac mini", "Mac Studio", "Mac Pro", "iMac"]
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
  for (const [product, keywords] of Object.entries(productKeywords)) {
    if (keywords.some(kw => deviceName.includes(kw))) {
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
      downloadSection.style.display = "none";
      return;
    }
    
    deviceControls.style.display = "grid";
    versionLabel.style.display = selectedProduct === "iPhone" || selectedProduct === "iPad" ? "block" : "none";
    renderDeviceOptions(filtered);
    message.textContent = `Select a ${selectedProduct} to load firmware.`;
    list.innerHTML = "";
    downloadSection.style.display = "none";
    versionSelect.innerHTML = '<option value="">Loading versions…</option>';
  });
});

select.addEventListener("change", async () => {
  const id = select.value;
  if (!id) {
    list.innerHTML = "";
    message.textContent = `Select a ${selectedProduct} to load firmware.`;
    downloadSection.style.display = "none";
    return;
  }

  message.textContent = "Loading firmware from IPSW.me…";
  list.innerHTML = "";
  downloadSection.style.display = "none";

  try {
    const r = await fetch(`/api/firmware/${encodeURIComponent(id)}`);
    if (!r.ok) throw new Error("Firmware lookup failed");
    const data = await r.json();
    
    currentFirmwares = (data.firmwares || []);
    
    if (!currentFirmwares.length) {
      message.textContent = "No IPSW firmware was returned for this device.";
      downloadSection.style.display = "none";
      return;
    }

    // Sort by version (newest first)
    const uniqueVersions = [...new Set(currentFirmwares.map(f => f.version))].sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (bVal !== aVal) return bVal - aVal;
      }
      return 0;
    });

    renderVersionOptions(uniqueVersions);
    message.textContent = `Select an iOS version to download.`;
    downloadSection.style.display = "none";
  } catch (e) {
    message.textContent = "Could not load firmware for this device.";
    downloadSection.style.display = "none";
  }
});

function renderVersionOptions(versions) {
  versionSelect.innerHTML = '<option value="">Choose a version…</option>';
  versions.forEach(v => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    versionSelect.appendChild(o);
  });
}

versionSelect.addEventListener("change", () => {
  const selectedVersion = versionSelect.value;
  if (!selectedVersion) {
    downloadSection.style.display = "none";
    return;
  }

  const firmwareForVersion = currentFirmwares.find(f => f.version === selectedVersion);
  if (!firmwareForVersion || !firmwareForVersion.url) {
    message.textContent = "Download link not available for this version.";
    downloadSection.style.display = "none";
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
  downloadSection.style.display = "block";
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

loadDevices();
