const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const IPSW_API = "https://api.ipsw.me/v4";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const cache = new Map();
const CACHE_MS = 5 * 60 * 1000;

async function ipswFetch(endpoint) {
  const now = Date.now();
  const cached = cache.get(endpoint);
  if (cached && now - cached.time < CACHE_MS) return cached.data;

  const response = await fetch(`${IPSW_API}/${endpoint}`);
  if (!response.ok) {
    throw new Error(`IPSW API returned HTTP ${response.status}`);
  }
  const data = await response.json();
  cache.set(endpoint, { time: now, data });
  return data;
}

// List Apple devices known by IPSW.me
app.get("/api/devices", async (_req, res) => {
  try {
    const data = await ipswFetch("devices");
    res.json(data);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

// Firmware for a specific Apple product identifier, e.g. iPhone14,5
app.get("/api/firmware/:identifier", async (req, res) => {
  const identifier = req.params.identifier;

  // Allow only Apple-style product identifiers; prevents arbitrary URL proxying.
  if (!/^[A-Za-z0-9,._-]+$/.test(identifier)) {
    return res.status(400).json({ error: "Invalid device identifier." });
  }

  try {
    const data = await ipswFetch(`device/${encodeURIComponent(identifier)}`);
    res.json(data);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`FallyTech running at http://localhost:${PORT}`);
});
