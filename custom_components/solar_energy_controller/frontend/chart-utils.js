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

export function getEntityIds(hass, pidEntityId) {
  if (!pidEntityId) return null;

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

    return parseHistory(history, entityIds);
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

        allTimes.add(time.getTime());

        const value = parseFloat(state.state);
        if (isNaN(value)) return;

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
  const pvData = interpolateToTimeAxis(data.pv, sortedTimes);
  const spData = interpolateToTimeAxis(data.sp, sortedTimes);
  const outputData = interpolateToTimeAxis(data.output, sortedTimes);

  return {
    labels,
    datasets: [
      { label: "PV", data: pvData },
      { label: "SP", data: spData },
      { label: "OUTPUT", data: outputData },
    ],
  };
}

export function interpolateToTimeAxis(points, timeAxis) {
  if (points.length === 0) {
    return new Array(timeAxis.length).fill(null);
  }

  const result = [];
  let pointIndex = 0;

  for (const time of timeAxis) {
    while (pointIndex < points.length - 1 && points[pointIndex + 1].time < time) {
      pointIndex++;
    }

    if (pointIndex >= points.length) {
      result.push(points[points.length - 1]?.value ?? null);
    } else if (points[pointIndex].time === time) {
      result.push(points[pointIndex].value);
    } else if (pointIndex === 0) {
      result.push(points[0].value);
    } else {
      const prev = points[pointIndex - 1];
      const next = points[pointIndex];
      const ratio = (time - prev.time) / (next.time - prev.time);
      result.push(prev.value + (next.value - prev.value) * ratio);
    }
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
    }
  });

  chart.update("none");
}

export function formatValue(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return value.toFixed(1);
  }
  return String(value);
}
