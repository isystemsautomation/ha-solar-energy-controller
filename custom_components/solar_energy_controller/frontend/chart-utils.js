export const HISTORY_WINDOW_MS = 3600000;

export function loadChartJS(versionQuery) {
  return new Promise((resolve, reject) => {
    if (window.Chart) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `/solar_energy_controller/frontend/chart.umd.min.js${versionQuery}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Chart.js"));
    document.head.appendChild(script);
  });
}

export function getEntityIds(_hass, pidEntityId) {
  if (!pidEntityId || !pidEntityId.startsWith("sensor.")) {
    return null;
  }

  const deviceName = pidEntityId.replace(/^sensor\./, "").replace(/_status$/, "");

  return {
    pv: `sensor.${deviceName}_pv_value`,
    sp: `sensor.${deviceName}_effective_sp`,
    output: `sensor.${deviceName}_output`,
  };
}

export async function fetchHistory(hass, entityIds) {
  if (!entityIds || !hass) {
    return null;
  }

  const pvExists = hass.states[entityIds.pv];
  const spExists = hass.states[entityIds.sp];
  const outputExists = hass.states[entityIds.output];

  if (!pvExists || !spExists || !outputExists) {
    return null;
  }

  try {
    const startTime = new Date(Date.now() - HISTORY_WINDOW_MS);
    const entityList = `${entityIds.pv},${entityIds.sp},${entityIds.output}`;
    const url = `history/period/${startTime.toISOString()}?filter_entity_id=${encodeURIComponent(entityList)}&minimal_response=false&significant_changes_only=false`;

    const history = await hass.callApi("GET", url);

    if (!history || !Array.isArray(history)) {
      return null;
    }

    return applyChartMeta(parseHistory(history, entityIds), buildChartMeta(hass, entityIds));
  } catch (err) {
    console.error("Error fetching history:", err);
    return null;
  }
}

export function parseHistory(history, entityIds) {
  const data = { pv: [], sp: [], output: [] };
  const allTimes = new Set();

  if (Array.isArray(history)) {
    history.forEach((entityHistory) => {
      if (!Array.isArray(entityHistory) || entityHistory.length === 0) return;

      const firstState = entityHistory[0];
      if (!firstState?.entity_id) return;

      const entityId = firstState.entity_id;

      entityHistory.forEach((state) => {
        if (!state) return;

        const time = new Date(state.last_changed || state.last_updated);
        if (isNaN(time.getTime())) return;

        const value = parseFloat(state.state);
        if (isNaN(value)) return;

        allTimes.add(time.getTime());

        if (entityId === entityIds.pv) {
          data.pv.push({ time: time.getTime(), value });
        } else if (entityId === entityIds.sp) {
          data.sp.push({ time: time.getTime(), value });
        } else if (entityId === entityIds.output) {
          data.output.push({ time: time.getTime(), value });
        }
      });
    });
  }

  if (allTimes.size === 0) {
    return null;
  }

  const sortedTimes = Array.from(allTimes).sort((a, b) => a - b);
  const labels = sortedTimes.map((t) => new Date(t).toISOString());
  data.pv.sort((a, b) => a.time - b.time);
  data.sp.sort((a, b) => a.time - b.time);
  data.output.sort((a, b) => a.time - b.time);
  const pvData = alignSeriesToTimeAxis(data.pv, sortedTimes);
  const spData = alignSeriesToTimeAxis(data.sp, sortedTimes);
  const outputData = alignSeriesToTimeAxis(data.output, sortedTimes);

  return {
    labels,
    entityIds,
    datasets: [
      { label: "PV", data: pvData },
      { label: "SP", data: spData },
      { label: "OUTPUT", data: outputData },
    ],
  };
}

export function getEntityUnit(hass, entityId) {
  if (!hass?.states?.[entityId]) {
    return null;
  }
  const unit = hass.states[entityId].attributes?.unit_of_measurement;
  return typeof unit === "string" && unit ? unit : null;
}

export function buildChartMeta(hass, entityIds) {
  if (!entityIds) {
    return null;
  }

  const pvUnit = getEntityUnit(hass, entityIds.pv);
  const spUnit = getEntityUnit(hass, entityIds.sp);
  const outUnit = getEntityUnit(hass, entityIds.output) || "%";
  const leftUnit = pvUnit || spUnit || "";

  return {
    entityIds,
    pvUnit,
    spUnit,
    outUnit,
    leftUnit,
    rightUnit: outUnit,
    pvLabel: pvUnit ? `PV (${pvUnit})` : "PV",
    spLabel: spUnit ? `SP (${spUnit})` : "SP",
    outputLabel: outUnit ? `Output (${outUnit})` : "Output",
    leftAxisTitle: leftUnit ? `PV / SP, ${leftUnit}` : "PV / SP",
    rightAxisTitle: outUnit ? `Output, ${outUnit}` : "Output",
    caption: `${entityIds.pv} · ${entityIds.sp} · ${entityIds.output}`,
  };
}

export function applyChartMeta(points, meta) {
  if (!points || !meta) {
    return points;
  }

  const labels = [meta.pvLabel, meta.spLabel, meta.outputLabel];
  return {
    ...points,
    meta,
    datasets: points.datasets.map((dataset, index) => ({
      ...dataset,
      label: labels[index] || dataset.label,
    })),
  };
}

export function formatAxisTick(value, unit) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }

  const abs = Math.abs(value);
  let formatted;
  if (abs >= 1000) {
    formatted = value.toFixed(0);
  } else if (abs >= 100) {
    formatted = value.toFixed(0);
  } else if (abs >= 10) {
    formatted = value.toFixed(1);
  } else {
    formatted = value.toFixed(1);
  }

  if (formatted.endsWith(".0")) {
    formatted = formatted.slice(0, -2);
  }

  return unit ? `${formatted} ${unit}` : formatted;
}

export function axisTickCallback(scaleId) {
  return function axisTick(value) {
    const unit = this.chart?.options?.scales?.[scaleId]?.unit || "";
    return formatAxisTick(value, unit);
  };
}

export function updateChartAxisTitles(chart, meta) {
  if (!chart?.options?.scales || !meta) {
    return;
  }

  if (chart.options.scales.y_pv_sp) {
    if (chart.options.scales.y_pv_sp.title) {
      chart.options.scales.y_pv_sp.title.text = meta.leftAxisTitle;
    }
    chart.options.scales.y_pv_sp.unit = meta.leftUnit || "";
  }
  if (chart.options.scales.y_out) {
    if (chart.options.scales.y_out.title) {
      chart.options.scales.y_out.title.text = meta.rightAxisTitle;
    }
    chart.options.scales.y_out.unit = meta.rightUnit || "";
  }
  chart.update("none");
}

/**
 * Step-hold alignment like HA history: flat until the next recorded state.
 * No values before the first sample (null) — avoids synthetic back-fill.
 */
export function alignSeriesToTimeAxis(points, timeAxis) {
  if (!points || points.length === 0) {
    return new Array(timeAxis.length).fill(null);
  }

  const result = [];
  let i = 0;

  for (const time of timeAxis) {
    while (i < points.length - 1 && points[i + 1].time <= time) {
      i++;
    }

    if (time < points[0].time) {
      result.push(null);
      continue;
    }

    result.push(points[i].value);
  }

  return result;
}

export function interpolateToTimeAxis(points, timeAxis) {
  if (!points || points.length === 0) {
    return new Array(timeAxis.length).fill(null);
  }

  const result = [];
  let i = 0;

  for (const time of timeAxis) {
    while (i < points.length - 1 && points[i + 1].time <= time) {
      i++;
    }

    if (time <= points[0].time) {
      result.push(points[0].value);
      continue;
    }
    if (i === points.length - 1) {
      result.push(points[i].value);
      continue;
    }

    const current = points[i];
    const next = points[i + 1];
    const span = next.time - current.time;
    if (span <= 0) {
      result.push(next.value);
      continue;
    }

    const ratio = (time - current.time) / span;
    result.push(current.value + (next.value - current.value) * ratio);
  }

  return result;
}

export function updateTraces(chart, points) {
  if (!chart || !points) {
    return;
  }

  chart.data.labels = points.labels;
  points.datasets.forEach((dataset, index) => {
    if (chart.data.datasets[index]) {
      chart.data.datasets[index].data = dataset.data;
      if (dataset.label) {
        chart.data.datasets[index].label = dataset.label;
      }
    }
  });

  updateChartAxisTitles(chart, points.meta);
  chart.update("none");
}

export function createHistoryLineChartConfig(meta) {
  const pvLabel = meta?.pvLabel || "PV";
  const spLabel = meta?.spLabel || "SP";
  const outputLabel = meta?.outputLabel || "Output";
  const leftAxisTitle = meta?.leftAxisTitle || "PV / SP";
  const rightAxisTitle = meta?.rightAxisTitle || "Output";
  const leftUnit = meta?.leftUnit || "";
  const rightUnit = meta?.rightUnit || "";

  return {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: pvLabel,
          data: [],
          borderColor: "#2196F3",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0,
          spanGaps: false,
          yAxisID: "y_pv_sp",
        },
        {
          label: spLabel,
          data: [],
          borderColor: "#FF9800",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0,
          spanGaps: false,
          yAxisID: "y_pv_sp",
        },
        {
          label: outputLabel,
          data: [],
          borderColor: "#9C27B0",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0,
          spanGaps: false,
          yAxisID: "y_out",
        },
      ],
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            usePointStyle: true,
            padding: 10,
            font: { size: 11 },
          },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label(context) {
              const label = context.dataset.label || "";
              const value = context.parsed.y;
              if (value === null || value === undefined) {
                return `${label}: —`;
              }
              const unitMatch = label.match(/\(([^)]+)\)$/);
              const unit = unitMatch ? unitMatch[1] : "";
              const name = unit ? label.replace(` (${unit})`, "") : label;
              return `${name}: ${formatAxisTick(value, unit)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "var(--divider-color, #ddd)" },
          ticks: {
            color: "var(--secondary-text-color, #888)",
            font: { size: 10 },
            maxTicksLimit: 5,
            callback(value) {
              const label = this.getLabelForValue(value);
              if (!label) return "";
              const date = new Date(label);
              return date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
            },
          },
        },
        y_pv_sp: {
          position: "left",
          unit: leftUnit,
          title: {
            display: true,
            text: leftAxisTitle,
            color: "var(--primary-text-color, #333)",
            font: { size: 12, weight: "600" },
            padding: { top: 0, bottom: 4 },
          },
          grid: { color: "var(--divider-color, #ddd)" },
          ticks: {
            color: "var(--secondary-text-color, #888)",
            font: { size: 11 },
            maxTicksLimit: 5,
            callback: axisTickCallback("y_pv_sp"),
          },
        },
        y_out: {
          position: "right",
          unit: rightUnit,
          title: {
            display: true,
            text: rightAxisTitle,
            color: "var(--primary-text-color, #333)",
            font: { size: 12, weight: "600" },
            padding: { top: 0, bottom: 4 },
          },
          grid: { drawOnChartArea: false },
          ticks: {
            color: "var(--secondary-text-color, #888)",
            font: { size: 11 },
            maxTicksLimit: 5,
            callback: axisTickCallback("y_out"),
          },
        },
      },
    },
  };
}

export function formatValue(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "—";
    const rounded = value.toFixed(1);
    return rounded === "-0.0" ? "0.0" : rounded;
  }
  return String(value);
}
