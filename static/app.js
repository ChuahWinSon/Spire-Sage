// =============================================
//  SPIRE SAGE — app.js
//  Card search from JSON + Flask AI backend
// =============================================

// ─── State ───────────────────────────────────
let allCards = [];   // loaded from cards.json
let allRelics = [];  // loaded from relics.json
let allBosses = [];  // loaded from bosses.json
let deck = [];
let upcoming = [];
let relics = [];
let currentBoss = null;
let currentFloor = 1;

// ─── DOM ─────────────────────────────────────
const deckGrid       = document.getElementById("deck-grid");
const upcomingGrid   = document.getElementById("upcoming-grid");
const deckCount      = document.getElementById("deck-count");
const upcomingCount  = document.getElementById("upcoming-count");
const deckEmpty      = document.getElementById("deck-empty");
const upcomingEmpty  = document.getElementById("upcoming-empty");
const askAiBtn       = document.getElementById("ask-ai-btn");
const aiIdle         = document.getElementById("ai-idle");
const aiContent      = document.getElementById("ai-content");
const aiLoading      = document.getElementById("ai-loading");
const aiMessage      = document.getElementById("ai-message");

const deckSearch     = document.getElementById("deck-search");
const deckResults    = document.getElementById("deck-results");
const deckUpgraded   = document.getElementById("deck-upgraded-input");

const upcomingSearch   = document.getElementById("upcoming-search");
const upcomingResults  = document.getElementById("upcoming-results");
const upcomingUpgraded = document.getElementById("upcoming-upgraded-input");

const floorSlider     = document.getElementById("floor-slider");
const floorActBadge   = document.getElementById("floor-act-badge");
const floorNumberInput = document.getElementById("floor-number-input");

const relicAddBtn    = document.getElementById("relic-add-btn");
const relicPopup     = document.getElementById("relic-search-popup");
const relicInput     = document.getElementById("relic-search-input");
const relicResults   = document.getElementById("relic-search-results");
const relicItemsWrap = document.getElementById("relic-items-wrap");
const relicEmptyHint = document.getElementById("relic-empty-hint");

const bossSelectBtn  = document.getElementById("boss-select-btn");
const bossPopup      = document.getElementById("boss-search-popup");
const bossInput      = document.getElementById("boss-search-input");
const bossResults    = document.getElementById("boss-search-results");
const bossDisplay    = document.getElementById("boss-display");
const bossEmptyHint  = document.getElementById("boss-empty-hint");

// ─── Load card data ───────────────────────────
// cards.json should be placed in your static/ folder alongside this file.
async function loadCards() {
  try {
    const res = await fetch("cards.json");
    allCards = await res.json();
    console.log(`⚔ Loaded ${allCards.length} cards.`);
  } catch (e) {
    console.error("Could not load cards.json:", e);
  }
}

async function loadRelics() {
  try {
    const res = await fetch("relics.json");
    allRelics = await res.json();
    console.log(`⬡ Loaded ${allRelics.length} relics.`);
  } catch (e) {
    console.error("Could not load relics.json:", e);
  }
}

async function loadBosses() {
  try {
    const res = await fetch("bosses.json");
    allBosses = await res.json();
    console.log(`☠ Loaded ${allBosses.length} bosses.`);
  } catch (e) {
    console.error("Could not load bosses.json:", e);
  }
}

// ─── Search / Autocomplete ────────────────────
function setupSearch(inputEl, resultsEl, upgradedEl, targetList, onAdd) {
  inputEl.addEventListener("input", () => {
    const query = inputEl.value.trim().toLowerCase();
    if (!query) { resultsEl.hidden = true; resultsEl.innerHTML = ""; return; }

    const matches = allCards
      .filter(c => c.Name.toLowerCase().includes(query))
      .slice(0, 8);

    if (!matches.length) { resultsEl.hidden = true; return; }

    resultsEl.innerHTML = "";
    matches.forEach(card => {
      const row = document.createElement("div");
      row.className = "result-row";

      const img = document.createElement("img");
      img.className = "result-img";
      img.src = card.Image;
      img.alt = card.Name;
      img.onerror = () => { img.style.display = "none"; };

      const info = document.createElement("div");
      info.className = "result-info";
      info.innerHTML = `
        <span class="result-name">${card.Name}</span>
        <span class="result-meta">${card.Type} · ${card.Rarity} · Cost ${card.Cost}</span>
        <span class="result-desc">${card.Description || ""}</span>
      `;

      row.appendChild(img);
      row.appendChild(info);
      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const upgraded = upgradedEl.checked;
        onAdd({ ...card, id: generateId(), upgraded });
        inputEl.value = "";
        upgradedEl.checked = false;
        resultsEl.hidden = true;
        resultsEl.innerHTML = "";
      });

      resultsEl.appendChild(row);
    });

    resultsEl.hidden = false;
  });

  inputEl.addEventListener("blur", () => {
    setTimeout(() => { resultsEl.hidden = true; }, 150);
  });
  inputEl.addEventListener("focus", () => {
    if (inputEl.value.trim()) inputEl.dispatchEvent(new Event("input"));
  });
}

// ─── Utility ──────────────────────────────────
function generateId() {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function typeEmoji(type) {
  return { Attack: "⚔", Skill: "✦", Power: "◈", Status: "⚠", Curse: "☠" }[type] ?? "🂠";
}

// ─── Rendering ───────────────────────────────
function renderCard(card, onRemove, { draggable: isDraggable = false } = {}) {
  const item = document.createElement("div");
  item.className = "card-item" + (card.upgraded ? " card--upgraded" : "");

  const imageWrap = document.createElement("div");
  imageWrap.className = "card-image-wrap";

  if (card.Image) {
    const img = document.createElement("img");
    img.className = "card-image";
    img.src = card.Image;
    img.alt = card.Name;
    img.onerror = () => {
      imageWrap.innerHTML = `<div class="card-image-placeholder">${typeEmoji(card.Type)}</div>`;
    };
    imageWrap.appendChild(img);
  } else {
    const ph = document.createElement("div");
    ph.className = "card-image-placeholder";
    ph.textContent = typeEmoji(card.Type);
    imageWrap.appendChild(ph);
  }

  // Tooltip (kept — useful since there's no name label now)
  const tooltip = document.createElement("div");
  tooltip.className = "card-tooltip";
  tooltip.innerHTML = `
    <div class="card-tooltip-name">${card.Name}${card.upgraded ? " +" : ""}</div>
    <div class="card-tooltip-desc">${card.Description || ""}</div>
  `;
  imageWrap.appendChild(tooltip);

  item.appendChild(imageWrap);

  const removeBtn = document.createElement("button");
  removeBtn.className = "card-remove-btn";
  removeBtn.title = "Remove";
  removeBtn.textContent = "✕";
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    item.style.transition = "all 0.2s ease";
    item.style.opacity = "0";
    item.style.transform = "scale(0.9)";
    setTimeout(() => onRemove(card.id), 200);
  });
  item.appendChild(removeBtn);

  // ── Drag from upcoming → deck ──
  if (isDraggable) {
    item.draggable = true;
    item.classList.add("card--draggable");
    item.addEventListener("dragstart", (e) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", card.id);
      item.classList.add("card--dragging");
      // store reference globally so drop handler can find the card object
      window._draggedCard = { ...card };
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("card--dragging");
      window._draggedCard = null;
    });
  }

  return item;
}

function renderGrid(cards, gridEl, emptyEl, countEl, onRemove, { draggable: isDraggable = false } = {}) {
  Array.from(gridEl.children).forEach(c => { if (c !== emptyEl) gridEl.removeChild(c); });
  if (!cards.length) {
    emptyEl.style.display = "";
    countEl.textContent = "0 cards";
    return;
  }
  emptyEl.style.display = "none";
  countEl.textContent = `${cards.length} card${cards.length !== 1 ? "s" : ""}`;
  cards.forEach(card => gridEl.appendChild(renderCard(card, onRemove, { draggable: isDraggable })));
}

function refreshDeck() {
  renderGrid(deck, deckGrid, deckEmpty, deckCount, id => {
    deck = deck.filter(c => c.id !== id);
    refreshDeck();
  });
}

function refreshUpcoming() {
  renderGrid(upcoming, upcomingGrid, upcomingEmpty, upcomingCount, id => {
    upcoming = upcoming.filter(c => c.id !== id);
    refreshUpcoming();
  }, { draggable: true });
}

// ─── Relic Bar ───────────────────────────────
function setupRelicSearch() {
  relicAddBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const hidden = relicPopup.hidden;
    relicPopup.hidden = !hidden;
    if (!hidden) return;
    relicInput.value = "";
    relicResults.innerHTML = "";
    setTimeout(() => relicInput.focus(), 50);
  });

  document.addEventListener("click", (e) => {
    if (!relicPopup.hidden && !document.getElementById("relic-add-wrap").contains(e.target)) {
      relicPopup.hidden = true;
    }
  });

  relicInput.addEventListener("input", () => {
    const query = relicInput.value.trim().toLowerCase();
    relicResults.innerHTML = "";
    if (!query) return;
    const matches = allRelics.filter(r => r.Name.toLowerCase().includes(query)).slice(0, 8);
    matches.forEach(relic => {
      const row = document.createElement("div");
      row.className = "relic-result-row";
      const img = document.createElement("img");
      img.className = "relic-result-img";
      img.src = relic.Image;
      img.alt = relic.Name;
      img.onerror = () => { img.style.display = "none"; };
      const info = document.createElement("div");
      info.className = "relic-result-info";
      info.innerHTML = `<span class="relic-result-name">${relic.Name}</span><span class="relic-result-desc">${relic.Description || ""}</span>`;
      row.appendChild(img);
      row.appendChild(info);
      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        relics.push({ ...relic, id: generateId() });
        refreshRelics();
        relicInput.value = "";
        relicResults.innerHTML = "";
        relicPopup.hidden = true;
      });
      relicResults.appendChild(row);
    });
  });
}

function renderRelicItem(relic) {
  const item = document.createElement("div");
  item.className = "relic-item";

  const img = document.createElement("img");
  img.src = relic.Image;
  img.alt = relic.Name;
  img.onerror = () => {
    item.innerHTML = `<div class="relic-item-placeholder">⬡</div>`;
  };
  item.appendChild(img);

  const tooltip = document.createElement("div");
  tooltip.className = "relic-item-tooltip";
  tooltip.innerHTML = `<div class="relic-tooltip-name">${relic.Name}</div><div class="relic-tooltip-desc">${relic.Description || ""}</div>`;
  item.appendChild(tooltip);

  const removeBtn = document.createElement("button");
  removeBtn.className = "relic-item-remove";
  removeBtn.title = "Remove";
  removeBtn.textContent = "✕";
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    item.style.transition = "all 0.2s ease";
    item.style.opacity = "0";
    item.style.transform = "scale(0.8)";
    setTimeout(() => {
      relics = relics.filter(r => r.id !== relic.id);
      refreshRelics();
    }, 200);
  });
  item.appendChild(removeBtn);
  return item;
}

function refreshRelics() {
  Array.from(relicItemsWrap.children).forEach(c => {
    if (c !== relicEmptyHint) relicItemsWrap.removeChild(c);
  });
  if (!relics.length) {
    relicEmptyHint.style.display = "";
    return;
  }
  relicEmptyHint.style.display = "none";
  relics.forEach(r => relicItemsWrap.appendChild(renderRelicItem(r)));
}

// ─── Boss Selector ───────────────────────────
function setupBossSearch() {
  bossSelectBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const hidden = bossPopup.hidden;
    bossPopup.hidden = !hidden;
    if (!hidden) return;
    bossInput.value = "";
    bossResults.innerHTML = "";
    setTimeout(() => bossInput.focus(), 50);
  });

  document.addEventListener("click", (e) => {
    if (!bossPopup.hidden && !document.getElementById("boss-select-wrap").contains(e.target)) {
      bossPopup.hidden = true;
    }
  });

  bossInput.addEventListener("input", () => {
    const query = bossInput.value.trim().toLowerCase();
    bossResults.innerHTML = "";
    const pool = query
      ? allBosses.filter(b => b.Boss.toLowerCase().includes(query))
      : allBosses;
    pool.slice(0, 10).forEach(boss => {
      const row = document.createElement("div");
      row.className = "relic-result-row";

      const img = document.createElement("img");
      img.className = "relic-result-img";
      img.src = boss.Image;
      img.alt = boss.Boss;
      img.onerror = () => { img.style.display = "none"; };

      const info = document.createElement("div");
      info.className = "relic-result-info";
      info.innerHTML = `<span class="relic-result-name">${boss.Boss}</span>`;

      row.appendChild(img);
      row.appendChild(info);
      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        currentBoss = boss;
        refreshBoss();
        bossInput.value = "";
        bossResults.innerHTML = "";
        bossPopup.hidden = true;
      });
      bossResults.appendChild(row);
    });
  });

  // Show all on focus if empty
  bossInput.addEventListener("focus", () => {
    bossInput.dispatchEvent(new Event("input"));
  });
}

function refreshBoss() {
  // Clear existing boss content (keep empty hint)
  Array.from(bossDisplay.children).forEach(c => {
    if (c !== bossEmptyHint) bossDisplay.removeChild(c);
  });

  if (!currentBoss) {
    bossEmptyHint.style.display = "";
    bossSelectBtn.textContent = "+";
    return;
  }

  bossEmptyHint.style.display = "none";
  bossSelectBtn.textContent = "⟳";

  const item = document.createElement("div");
  item.className = "boss-item";

  const img = document.createElement("img");
  img.src = currentBoss.Image;
  img.alt = currentBoss.Boss;
  img.className = "boss-item-img";
  img.onerror = () => { img.replaceWith(document.createTextNode("☠")); };

  const name = document.createElement("span");
  name.className = "boss-item-name";
  name.textContent = currentBoss.Boss;

  const removeBtn = document.createElement("button");
  removeBtn.className = "relic-item-remove boss-item-remove";
  removeBtn.title = "Clear boss";
  removeBtn.textContent = "✕";
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    currentBoss = null;
    refreshBoss();
  });

  item.appendChild(img);
  item.appendChild(name);
  item.appendChild(removeBtn);
  bossDisplay.appendChild(item);
}


// Calls your Flask backend at /api/advise
// The Flask server holds your API key — it never touches the browser.

function setAiState(state) {
  aiIdle.style.display    = state === "idle"    ? "" : "none";
  aiLoading.hidden        = state !== "loading";
  aiContent.hidden        = state !== "result";
}

async function consultSage() {
  if (!deck.length && !upcoming.length) {
    showAiMessage("Add some cards to your deck and upcoming picks before consulting the Sage.");
    return;
  }

  setAiState("loading");
  askAiBtn.disabled = true;

  try {
    // POST to Flask — your API key stays on the server
    const res = await fetch("/api/advise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deck, upcoming, floor: currentFloor, relics, boss: currentBoss ? currentBoss.Boss : null }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    showAiMessage(formatAiResponse(data.advice));
  } catch (err) {
    showAiMessage(`⚠ The Sage is unavailable: ${err.message}`);
  } finally {
    askAiBtn.disabled = false;
  }
}

function formatAiResponse(raw) {
  return raw
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<span class="recommendation">$1</span>')
    .replace(/\n/g, "<br>");
}

function showAiMessage(html) {
  aiMessage.innerHTML = html;
  setAiState("result");
}

askAiBtn.addEventListener("click", consultSage);

// ─── Drag-and-Drop: Upcoming → Deck ──────────
function setupDeckDropZone() {
  const deckPanel = document.querySelector(".panel--deck");

  deckPanel.addEventListener("dragover", (e) => {
    if (!window._draggedCard) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    deckPanel.classList.add("deck--drop-active");
  });

  deckPanel.addEventListener("dragleave", (e) => {
    // Only remove highlight when truly leaving the panel
    if (!deckPanel.contains(e.relatedTarget)) {
      deckPanel.classList.remove("deck--drop-active");
    }
  });

  deckPanel.addEventListener("drop", (e) => {
    e.preventDefault();
    deckPanel.classList.remove("deck--drop-active");
    const card = window._draggedCard;
    if (!card) return;

    // Remove from upcoming, add to deck with a fresh id
    upcoming = upcoming.filter(c => c.id !== card.id);
    deck.push({ ...card, id: generateId() });
    refreshUpcoming();
    refreshDeck();
    window._draggedCard = null;
  });
}

// ─── Floor Selector ───────────────────────────
function getActLabel(floor) {
  if (floor <= 17) return "Act I";
  if (floor <= 34) return "Act II";
  if (floor <= 51) return "Act III";
  return "Act IV";
}

function updateFloorUI(floor) {
  currentFloor = floor;
  floorActBadge.textContent = getActLabel(floor);
  floorNumberInput.value = floor;
}

floorSlider.addEventListener("input", () => {
  updateFloorUI(parseInt(floorSlider.value, 10));
});

floorNumberInput.addEventListener("input", () => {
  let val = parseInt(floorNumberInput.value, 10);
  if (isNaN(val)) return;
  val = Math.min(55, Math.max(1, val));
  floorSlider.value = val;
  updateFloorUI(val);
});

floorNumberInput.addEventListener("blur", () => {
  let val = parseInt(floorNumberInput.value, 10);
  if (isNaN(val) || val < 1) val = 1;
  if (val > 55) val = 55;
  floorNumberInput.value = val;
  floorSlider.value = val;
  updateFloorUI(val);
});

// ─── Init ─────────────────────────────────────
(async () => {
  await loadCards();
  await loadRelics();
  await loadBosses();

  updateFloorUI(1);

  setupSearch(deckSearch, deckResults, deckUpgraded, deck, card => {
    deck.push(card);
    refreshDeck();
  });

  setupSearch(upcomingSearch, upcomingResults, upcomingUpgraded, upcoming, card => {
    upcoming.push(card);
    refreshUpcoming();
  });

  setupRelicSearch();
  setupBossSearch();
  setupDeckDropZone();
  refreshDeck();
  refreshUpcoming();
  refreshRelics();
  refreshBoss();
  setAiState("idle");

  console.log("⚔ Spire Sage loaded.");
})();
