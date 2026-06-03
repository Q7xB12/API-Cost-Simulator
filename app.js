const state = {
  assumptions: {
    users: 10000,
    actions: 40,
    units: 2,
    storage: 500,
    budget: 5000,
    margin: 70,
    best: 55,
    normal: 100,
    worst: 240
  },
  providers: [
    {
      name: "StreamAPI",
      baseFee: 49,
      unitPrice: 0.004,
      includedUnits: 100000,
      storagePrice: 0.08,
      freeStorage: 100,
      buffer: 12
    },
    {
      name: "ScaleCloud",
      baseFee: 199,
      unitPrice: 0.0028,
      includedUnits: 500000,
      storagePrice: 0.12,
      freeStorage: 250,
      buffer: 18
    },
    {
      name: "LaunchStack",
      baseFee: 0,
      unitPrice: 0.0065,
      includedUnits: 25000,
      storagePrice: 0.05,
      freeStorage: 50,
      buffer: 8
    }
  ]
};

const colors = ["#0f766e", "#3157a7", "#b7791f", "#b42318", "#5f6b7a", "#1d7c4d"];
const scenarioKeys = ["best", "normal", "worst"];

const inputs = {
  users: document.querySelector("#usersInput"),
  actions: document.querySelector("#actionsInput"),
  units: document.querySelector("#unitsInput"),
  storage: document.querySelector("#storageInput"),
  budget: document.querySelector("#budgetInput"),
  margin: document.querySelector("#marginInput"),
  best: document.querySelector("#bestInput"),
  normal: document.querySelector("#normalInput"),
  worst: document.querySelector("#worstInput")
};

const els = {
  normalCost: document.querySelector("#normalCost"),
  normalProvider: document.querySelector("#normalProvider"),
  worstCost: document.querySelector("#worstCost"),
  worstProvider: document.querySelector("#worstProvider"),
  dangerCard: document.querySelector("#dangerCard"),
  dangerLevel: document.querySelector("#dangerLevel"),
  dangerReason: document.querySelector("#dangerReason"),
  runwayCost: document.querySelector("#runwayCost"),
  providerGrid: document.querySelector("#providerGrid"),
  providerTemplate: document.querySelector("#providerTemplate"),
  comparisonBody: document.querySelector("#comparisonBody"),
  providerCount: document.querySelector("#providerCount"),
  chartLegend: document.querySelector("#chartLegend"),
  canvas: document.querySelector("#costChart"),
  bestValue: document.querySelector("#bestValue"),
  normalValue: document.querySelector("#normalValue"),
  worstValue: document.querySelector("#worstValue")
};

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 0 : 2
  }).format(Number.isFinite(value) ? value : 0);
}

function numberValue(input) {
  return Number.parseFloat(input.value) || 0;
}

function usageForScenario(key) {
  const multiplier = state.assumptions[key] / 100;
  return {
    users: state.assumptions.users * multiplier,
    billableUnits: state.assumptions.users * state.assumptions.actions * state.assumptions.units * multiplier,
    storage: state.assumptions.storage * multiplier
  };
}

function costFor(provider, key) {
  const usage = usageForScenario(key);
  const paidUnits = Math.max(0, usage.billableUnits - provider.includedUnits);
  const paidStorage = Math.max(0, usage.storage - provider.freeStorage);
  const rawCost = provider.baseFee + paidUnits * provider.unitPrice + paidStorage * provider.storagePrice;
  return rawCost * (1 + provider.buffer / 100);
}

function providerResults() {
  return state.providers.map((provider) => {
    const costs = Object.fromEntries(scenarioKeys.map((key) => [key, costFor(provider, key)]));
    const users = Math.max(1, state.assumptions.users);
    const requiredRevenue = costs.normal / Math.max(0.01, 1 - state.assumptions.margin / 100);
    return {
      provider,
      costs,
      breakEvenUserPrice: requiredRevenue / users,
      status: statusFor(costs.worst)
    };
  });
}

function statusFor(cost) {
  const budget = Math.max(1, state.assumptions.budget);
  if (cost > budget) return "danger";
  if (cost > budget * 0.75) return "warn";
  return "ok";
}

function syncInputsFromState() {
  Object.entries(inputs).forEach(([key, input]) => {
    input.value = state.assumptions[key];
  });
  syncRangeLabels();
}

function syncRangeLabels() {
  els.bestValue.textContent = `${state.assumptions.best}%`;
  els.normalValue.textContent = `${state.assumptions.normal}%`;
  els.worstValue.textContent = `${state.assumptions.worst}%`;
}

function updateAssumptions() {
  Object.entries(inputs).forEach(([key, input]) => {
    state.assumptions[key] = numberValue(input);
  });
  syncRangeLabels();
  render();
}

function updateProvider(index, key, value) {
  if (key === "name") {
    state.providers[index][key] = value.trim() || "Untitled";
  } else {
    state.providers[index][key] = Number.parseFloat(value) || 0;
  }
  renderCalculations();
}

function addProvider() {
  state.providers.push({
    name: `Provider ${state.providers.length + 1}`,
    baseFee: 99,
    unitPrice: 0.0045,
    includedUnits: 100000,
    storagePrice: 0.09,
    freeStorage: 100,
    buffer: 10
  });
  render();
}

function removeProvider(index) {
  if (state.providers.length === 1) return;
  state.providers.splice(index, 1);
  render();
}

function renderProviders() {
  els.providerGrid.innerHTML = "";
  els.providerCount.textContent = `${state.providers.length} provider${state.providers.length === 1 ? "" : "s"}`;

  state.providers.forEach((provider, index) => {
    const node = els.providerTemplate.content.firstElementChild.cloneNode(true);
    const fields = {
      name: node.querySelector(".provider-name"),
      baseFee: node.querySelector(".base-fee"),
      unitPrice: node.querySelector(".unit-price"),
      includedUnits: node.querySelector(".included-units"),
      storagePrice: node.querySelector(".storage-price"),
      freeStorage: node.querySelector(".free-storage"),
      buffer: node.querySelector(".buffer")
    };

    Object.entries(fields).forEach(([key, input]) => {
      input.value = provider[key];
      input.addEventListener("input", () => updateProvider(index, key, input.value));
    });

    const removeButton = node.querySelector(".remove-provider");
    removeButton.disabled = state.providers.length === 1;
    removeButton.addEventListener("click", () => removeProvider(index));

    els.providerGrid.appendChild(node);
  });
}

function renderSummary(results) {
  const cheapestNormal = [...results].sort((a, b) => a.costs.normal - b.costs.normal)[0];
  const highestWorst = [...results].sort((a, b) => b.costs.worst - a.costs.worst)[0];
  const cheapestWorst = [...results].sort((a, b) => a.costs.worst - b.costs.worst)[0];
  const dangerStatus = statusFor(highestWorst.costs.worst);

  els.normalCost.textContent = currency(cheapestNormal.costs.normal);
  els.normalProvider.textContent = `${cheapestNormal.provider.name} is lowest`;
  els.worstCost.textContent = currency(highestWorst.costs.worst);
  els.worstProvider.textContent = `${highestWorst.provider.name} exposure`;
  els.runwayCost.textContent = currency(cheapestWorst.costs.worst);

  els.dangerCard.classList.remove("warn", "danger");
  if (dangerStatus !== "ok") els.dangerCard.classList.add(dangerStatus);
  els.dangerLevel.textContent = dangerStatus === "ok" ? "Clear" : dangerStatus === "warn" ? "Watch" : "Danger";
  els.dangerReason.textContent =
    dangerStatus === "ok"
      ? "Worst case under budget"
      : dangerStatus === "warn"
        ? "Worst case nearing cap"
        : "Worst case over budget";
}

function renderTable(results) {
  els.comparisonBody.innerHTML = "";
  results
    .sort((a, b) => a.costs.normal - b.costs.normal)
    .forEach((result) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${escapeHtml(result.provider.name)}</strong></td>
        <td>${currency(result.costs.best)}</td>
        <td>${currency(result.costs.normal)}</td>
        <td>${currency(result.costs.worst)}</td>
        <td>${currency(result.breakEvenUserPrice)}</td>
        <td><span class="status ${result.status}">${result.status.toUpperCase()}</span></td>
      `;
      els.comparisonBody.appendChild(row);
    });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function drawChart(results) {
  const canvas = els.canvas;
  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(600, Math.floor(rect.width * ratio));
  canvas.height = Math.max(300, Math.floor(rect.height * ratio));
  context.setTransform(ratio, 0, 0, ratio, 0, 0);

  const width = rect.width;
  const height = rect.height;
  const padding = { top: 28, right: 28, bottom: 56, left: 72 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxCost = Math.max(...results.flatMap((result) => scenarioKeys.map((key) => result.costs[key])), state.assumptions.budget, 1);
  const yMax = Math.ceil(maxCost / 1000) * 1000 || 1000;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#f9fbfc";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "#d9e0e6";
  context.lineWidth = 1;
  context.fillStyle = "#66717d";
  context.font = "12px Inter, system-ui, sans-serif";
  context.textAlign = "right";
  context.textBaseline = "middle";

  for (let i = 0; i <= 4; i += 1) {
    const value = (yMax / 4) * i;
    const y = padding.top + chartHeight - (value / yMax) * chartHeight;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
    context.fillText(currency(value), padding.left - 10, y);
  }

  const budgetY = padding.top + chartHeight - (state.assumptions.budget / yMax) * chartHeight;
  context.strokeStyle = "#b42318";
  context.setLineDash([6, 6]);
  context.beginPath();
  context.moveTo(padding.left, budgetY);
  context.lineTo(width - padding.right, budgetY);
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = "#b42318";
  context.textAlign = "left";
  context.fillText("Budget", padding.left + 6, budgetY - 12);

  const xFor = (index) => padding.left + (chartWidth / (scenarioKeys.length - 1)) * index;
  context.fillStyle = "#66717d";
  context.textAlign = "center";
  context.textBaseline = "top";
  scenarioKeys.forEach((key, index) => {
    const label = `${key[0].toUpperCase()}${key.slice(1)}`;
    context.fillText(label, xFor(index), height - padding.bottom + 26);
  });

  results.forEach((result, resultIndex) => {
    const color = colors[resultIndex % colors.length];
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.beginPath();
    scenarioKeys.forEach((key, index) => {
      const x = xFor(index);
      const y = padding.top + chartHeight - (result.costs[key] / yMax) * chartHeight;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();

    scenarioKeys.forEach((key, index) => {
      const x = xFor(index);
      const y = padding.top + chartHeight - (result.costs[key] / yMax) * chartHeight;
      context.fillStyle = "#ffffff";
      context.beginPath();
      context.arc(x, y, 5, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.stroke();
    });
  });

  renderLegend(results);
}

function renderLegend(results) {
  els.chartLegend.innerHTML = "";
  results.forEach((result, index) => {
    const item = document.createElement("span");
    item.className = "legend-item";
    item.innerHTML = `<span class="legend-swatch" style="background:${colors[index % colors.length]}"></span>${escapeHtml(result.provider.name)}`;
    els.chartLegend.appendChild(item);
  });
}

function exportCsv() {
  const rows = [
    ["Provider", "Best", "Normal", "Worst", "Break-even price/user", "Status"],
    ...providerResults().map((result) => [
      result.provider.name,
      result.costs.best.toFixed(2),
      result.costs.normal.toFixed(2),
      result.costs.worst.toFixed(2),
      result.breakEvenUserPrice.toFixed(2),
      result.status
    ])
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "api-cost-simulation.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function resetDemo() {
  state.assumptions = {
    users: 10000,
    actions: 40,
    units: 2,
    storage: 500,
    budget: 5000,
    margin: 70,
    best: 55,
    normal: 100,
    worst: 240
  };
  state.providers = [
    { name: "StreamAPI", baseFee: 49, unitPrice: 0.004, includedUnits: 100000, storagePrice: 0.08, freeStorage: 100, buffer: 12 },
    { name: "ScaleCloud", baseFee: 199, unitPrice: 0.0028, includedUnits: 500000, storagePrice: 0.12, freeStorage: 250, buffer: 18 },
    { name: "LaunchStack", baseFee: 0, unitPrice: 0.0065, includedUnits: 25000, storagePrice: 0.05, freeStorage: 50, buffer: 8 }
  ];
  syncInputsFromState();
  render();
}

function render() {
  const results = providerResults();
  renderProviders();
  renderCalculations(results);
}

function renderCalculations(existingResults) {
  const results = existingResults || providerResults();
  renderSummary(results);
  renderTable(results);
  drawChart(results);
}

Object.values(inputs).forEach((input) => input.addEventListener("input", updateAssumptions));
document.querySelector("#addProviderButton").addEventListener("click", addProvider);
document.querySelector("#resetButton").addEventListener("click", resetDemo);
document.querySelector("#exportButton").addEventListener("click", exportCsv);
window.addEventListener("resize", () => drawChart(providerResults()));

syncInputsFromState();
render();
