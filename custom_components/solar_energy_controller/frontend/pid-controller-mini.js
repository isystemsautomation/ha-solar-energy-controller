import { LitElement, html, css } from "./lit-core.min.js";
import "./pid-controller-popup.js";
import { normalizeRuntimeMode, runtimeModeLabel } from "./runtime-modes.js";

class PIDControllerMini extends LitElement {
  static properties = {
    hass: { type: Object },
    config: { type: Object },
    _data: { state: true },
  };

  static styles = css`
    :host {
      display: block;
    }

    ha-card {
      padding: 16px;
      cursor: pointer;
    }

    ha-card:hover {
      box-shadow: var(--ha-card-box-shadow, 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12), 0 3px 1px -2px rgba(0, 0, 0, 0.2));
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .title {
      font-size: 16px;
      font-weight: 500;
      color: var(--primary-text-color);
    }

    .compact-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }

    .metric {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .metric-label {
      font-size: 12px;
      color: var(--secondary-text-color);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .metric-value {
      font-size: 16px;
      font-weight: 500;
      color: var(--primary-text-color);
    }

    .metric-value.negative {
      color: var(--error-color);
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--divider-color);
    }

    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      background-color: var(--info-color, #039be5);
      color: var(--text-primary-color, #fff);
    }

    .status-badge.running {
      background-color: var(--success-color, #4caf50);
    }

    .status-badge.disabled {
      background-color: var(--disabled-color, #9e9e9e);
    }

    .graph-container {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--divider-color);
      min-height: 200px;
    }

    .graph-container ha-card {
      box-shadow: none;
      padding: 0;
    }

    .graph-container canvas {
      display: block;
      width: 100%;
      max-width: 100%;
      pointer-events: none;
    }

    .card-clickable {
      cursor: pointer;
    }

    .card-clickable:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
  `;

  constructor() {
    super();
    this._data = {};
    this._canvas = null;
    this._chart = null;
    this._graphInFlight = false;
    this._graphUpdateTimeout = null;
  }

  setConfig(config) {
    if (!config.pid_entity) {
      throw new Error("pid_entity is required");
    }
    this.config = {
      title: "PID Controller",
      show_status: true,
      show_mode: true,
      show_pv: true,
      show_sp: true,
      show_error: true,
      show_output: true,
      show_chart: true,
      ...config,
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "pid_entity",
          required: true,
          selector: {
            entity: {
              domain: "sensor",
            },
          },
        },
        {
          name: "title",
          default: "PID Controller",
          selector: {
            text: {},
          },
        },
        {
          name: "show_status",
          label: "Show Status",
          default: true,
          selector: {
            boolean: {},
          },
        },
        {
          name: "show_mode",
          label: "Show Mode",
          default: true,
          selector: {
            boolean: {},
          },
        },
        {
          name: "show_pv",
          label: "Show PV",
          default: true,
          selector: {
            boolean: {},
          },
        },
        {
          name: "show_sp",
          label: "Show SP",
          default: true,
          selector: {
            boolean: {},
          },
        },
        {
          name: "show_error",
          label: "Show Error",
          default: true,
          selector: {
            boolean: {},
          },
        },
        {
          name: "show_output",
          label: "Show Output",
          default: true,
          selector: {
            boolean: {},
          },
        },
        {
          name: "show_chart",
          label: "Show Chart",
          default: true,
          selector: {
            boolean: {},
          },
        },
      ],
    };
  }

  getCardSize() {
    return 6;
  }

  updated(changedProperties) {
    if (changedProperties.has("hass") || changedProperties.has("config")) {
      this._updateData();
      if (this.config.show_chart) {
        this._scheduleGraphUpdate(800);
      }
    }
  }

  async firstUpdated() {
    if (this.config.show_chart) {
      await this._loadChartJS();
      setTimeout(() => this._updateGraph(), 200);
      this._graphInterval = setInterval(() => this._updateGraph(), 30000);
    }
  }

  _loadChartJS() {
    return new Promise((resolve, reject) => {
      if (window.Chart) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      // Load Chart.js from the local integration static path so it works offline
      script.src = "/solar_energy_controller/frontend/chart.umd.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Chart.js"));
      document.head.appendChild(script);
    });
  }

  disconnectedCallback() {
    if (this._graphInterval) {
      clearInterval(this._graphInterval);
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    if (this._graphUpdateTimeout) {
      clearTimeout(this._graphUpdateTimeout);
    }
    if (this._chart) {
      this._chart.destroy();
      this._chart = null;
    }
  }

  _scheduleGraphUpdate(delayMs = 800) {
    if (this._graphUpdateTimeout) {
      clearTimeout(this._graphUpdateTimeout);
    }
    this._graphUpdateTimeout = setTimeout(() => {
      this._updateGraph();
    }, delayMs);
  }

  async _ensureChart() {
    if (this._chart) {
      return;
    }

    const container = this.shadowRoot?.getElementById("graph-container");
    if (!container) {
      return;
    }

    // Create canvas once
    if (!this._canvas) {
      this._canvas = document.createElement("canvas");
      this._canvas.style.width = "100%";
      this._canvas.style.height = "200px";
      this._canvas.style.display = "block";
      container.appendChild(this._canvas);
    }

    // Create Chart.js instance once
    const ctx = this._canvas.getContext("2d");
    this._chart = new window.Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "PV",
            data: [],
            borderColor: "#2196F3",
            backgroundColor: "transparent",
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.1,
            yAxisID: "y_pv_sp",
          },
          {
            label: "SP",
            data: [],
            borderColor: "#FF9800",
            backgroundColor: "transparent",
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.1,
            yAxisID: "y_pv_sp",
          },
          {
            label: "OUTPUT",
            data: [],
            borderColor: "#9C27B0",
            backgroundColor: "transparent",
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.1,
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
              font: {
                size: 11,
              },
            },
          },
          tooltip: {
            enabled: true,
          },
        },
        scales: {
          x: {
            grid: {
              color: "var(--divider-color, #ddd)",
            },
            ticks: {
              color: "var(--secondary-text-color, #888)",
              font: {
                size: 10,
              },
              maxTicksLimit: 5,
              callback: function (value) {
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
            grid: {
              color: "var(--divider-color, #ddd)",
            },
            ticks: {
              color: "var(--secondary-text-color, #888)",
              font: {
                size: 10,
              },
              callback: function (value) {
                return value.toFixed(0);
              },
            },
          },
          y_out: {
            position: "right",
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              color: "var(--secondary-text-color, #888)",
              font: {
                size: 10,
              },
              callback: function (value) {
                return value.toFixed(0);
              },
            },
          },
        },
      },
    });

    // Setup resize observer
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(() => {
        if (this._chart) {
          this._chart.resize();
          this._chart.update("none");
        }
      });
      this._resizeObserver.observe(container);
    }
  }

  async _fetchHistory() {
    const entityIds = this._getEntityIds();
    if (!entityIds || !this.hass) {
      return null;
    }

    const pvExists = this.hass.states[entityIds.pv];
    const spExists = this.hass.states[entityIds.sp];
    const outputExists = this.hass.states[entityIds.output];
    
    if (!pvExists || !spExists || !outputExists) {
      return null;
    }

    try {
      const startTime = new Date(Date.now() - 3600000);
      const entityList = `${entityIds.pv},${entityIds.sp},${entityIds.output}`;
      const url = `history/period/${startTime.toISOString()}?filter_entity_id=${encodeURIComponent(entityList)}&minimal_response=false&significant_changes_only=false`;
      
      const history = await this.hass.callApi("GET", url);

      if (!history || !Array.isArray(history)) {
        return null;
      }

      return this._parseHistory(history, entityIds);
    } catch (err) {
      console.error("Error fetching history:", err);
      return null;
    }
  }

  _parseHistory(history, entityIds) {
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
    
    // Interpolate data points to common time axis
    const labels = sortedTimes.map(t => new Date(t).toISOString());
    const pvData = this._interpolateToTimeAxis(data.pv, sortedTimes);
    const spData = this._interpolateToTimeAxis(data.sp, sortedTimes);
    const outputData = this._interpolateToTimeAxis(data.output, sortedTimes);

    return {
      labels,
      datasets: [
        { label: "PV", data: pvData },
        { label: "SP", data: spData },
        { label: "OUTPUT", data: outputData },
      ],
    };
  }

  _interpolateToTimeAxis(points, timeAxis) {
    if (points.length === 0) {
      return new Array(timeAxis.length).fill(null);
    }

    const result = [];
    let pointIndex = 0;

    for (const time of timeAxis) {
      // Find the closest point or interpolate
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
        // Interpolate between two points
        const prev = points[pointIndex - 1];
        const next = points[pointIndex];
        const ratio = (time - prev.time) / (next.time - prev.time);
        result.push(prev.value + (next.value - prev.value) * ratio);
      }
    }

    return result;
  }

  _updateTraces(points) {
    if (!this._chart || !points) {
      return;
    }

    this._chart.data.labels = points.labels;
    points.datasets.forEach((dataset, index) => {
      if (this._chart.data.datasets[index]) {
        this._chart.data.datasets[index].data = dataset.data;
      }
    });

    this._chart.update("none");
  }

  async _updateGraph() {
    if (this._graphInFlight) {
      return;
    }

    this._graphInFlight = true;

    try {
      await this._ensureChart();
      
      if (!this._chart) {
        this._graphInFlight = false;
        return;
      }

      const points = await this._fetchHistory();
      
      if (points) {
        this._updateTraces(points);
      }
    } catch (err) {
      console.error("Error updating graph:", err);
      const container = this.shadowRoot?.getElementById("graph-container");
      if (container && !this._chart) {
        const errorMsg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
        container.innerHTML = `<div style='padding: 8px; color: var(--error-color, red); font-size: 12px;'>Graph error: ${errorMsg}</div>`;
      }
    } finally {
      this._graphInFlight = false;
    }
  }

  _updateData() {
    if (!this.hass || !this.config) return;

    const state = this.hass.states[this.config.pid_entity];
    const data = {};

    if (state && state.attributes) {
      const attrs = state.attributes;
      data.enabled = attrs.enabled ?? false;
      data.runtime_mode = normalizeRuntimeMode(attrs.runtime_mode);
      data.pv_value = attrs.pv_value ?? null;
      data.effective_sp = attrs.effective_sp ?? null;
      data.error = attrs.error ?? null;
      data.output = attrs.output ?? null;
      data.status = attrs.status || "unknown";
    }

    this._data = data;
  }

  _formatValue(value) {
    if (value === null || value === undefined) return "—";
    if (typeof value === "number") {
      return value.toFixed(1);
    }
    return String(value);
  }

  _formatMode(mode) {
    if (!mode) return "—";
    return runtimeModeLabel(mode);
  }

  _getEntityIds() {
    if (!this.config || !this.config.pid_entity) return null;
    
    const statusEntity = this.config.pid_entity;
    const deviceName = statusEntity.replace(/^sensor\./, "").replace(/_status$/, "");
    
    return {
      pv: `sensor.${deviceName}_pv_value`,
      sp: `sensor.${deviceName}_effective_sp`,
      output: `sensor.${deviceName}_output`,
    };
  }

  _ensureNativeDialogStyles() {
    if (document.getElementById("pid-controller-native-dialog-styles")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "pid-controller-native-dialog-styles";
    style.textContent = `
      dialog.pid-controller-native-dialog {
        border: none;
        padding: 0;
        margin: auto;
        width: min(920px, 95vw);
        max-height: 90vh;
        overflow: auto;
        background: var(--card-background-color, #1c1c1c);
        color: var(--primary-text-color, #fff);
        border-radius: var(--ha-card-border-radius, 12px);
        box-shadow: var(--ha-card-box-shadow, 0 8px 24px rgba(0, 0, 0, 0.35));
      }
      dialog.pid-controller-native-dialog::backdrop {
        background: rgba(0, 0, 0, 0.55);
      }
      .pid-controller-native-dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 16px 16px 0;
        position: sticky;
        top: 0;
        z-index: 1;
        background: var(--card-background-color, #1c1c1c);
      }
      .pid-controller-native-dialog-title {
        font-size: 20px;
        font-weight: 500;
      }
      .pid-controller-native-dialog-close {
        border: none;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 24px;
        line-height: 1;
        padding: 4px 8px;
      }
    `;
    document.head.appendChild(style);
  }

  async _ensurePopupElementReady() {
    if (customElements.get("pid-controller-popup")) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
    if (customElements.get("pid-controller-popup")) {
      return true;
    }

    throw new Error("pid-controller-popup custom element is not registered");
  }

  _createPopupCard() {
    if (!customElements.get("pid-controller-popup")) {
      throw new Error("pid-controller-popup custom element is not registered");
    }

    const popupCard = document.createElement("pid-controller-popup");
    popupCard.setConfig({ pid_entity: this.config.pid_entity });
    popupCard.hass = this.hass;
    popupCard._hassInterval = setInterval(() => {
      if (this.hass) {
        popupCard.hass = this.hass;
      }
    }, 1000);
    return popupCard;
  }

  _cleanupPopupCard(popupCard) {
    if (popupCard?._hassInterval) {
      clearInterval(popupCard._hassInterval);
      popupCard._hassInterval = null;
    }
  }

  _closeDialogElement(dialog) {
    if (!dialog) {
      return;
    }
    if (typeof dialog.close === "function") {
      try {
        dialog.close();
      } catch (err) {
        dialog.open = false;
      }
      return;
    }
    if ("open" in dialog) {
      dialog.open = false;
    }
  }

  _attachDialogCleanup(dialog, popupCard) {
    const cleanup = () => {
      this._cleanupPopupCard(popupCard);
      if (dialog.parentNode) {
        dialog.parentNode.removeChild(dialog);
      }
    };
    dialog.addEventListener("closed", cleanup, { once: true });
    dialog.addEventListener("close", cleanup, { once: true });
  }

  _openNativeDialog(title, popupCard) {
    this._ensureNativeDialogStyles();

    const dialog = document.createElement("dialog");
    dialog.className = "pid-controller-native-dialog";

    const header = document.createElement("div");
    header.className = "pid-controller-native-dialog-header";

    const heading = document.createElement("div");
    heading.className = "pid-controller-native-dialog-title";
    heading.textContent = title;

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "pid-controller-native-dialog-close";
    closeButton.setAttribute("aria-label", "Close");
    closeButton.textContent = "×";
    closeButton.addEventListener("click", () => this._closeDialogElement(dialog));

    header.appendChild(heading);
    header.appendChild(closeButton);
    dialog.appendChild(header);
    dialog.appendChild(popupCard);

    this._attachDialogCleanup(dialog, popupCard);
    document.body.appendChild(dialog);

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        this._closeDialogElement(dialog);
      }
    });

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else if (typeof dialog.show === "function") {
      dialog.show();
    } else {
      dialog.open = true;
    }
  }

  _openPopup(ev) {
    void this._openPopupAsync(ev);
  }

  async _openPopupAsync(ev) {
    if (ev) {
      ev.stopPropagation();
      ev.preventDefault();
    }

    const title = this.config.title || "PID Controller";

    if (this.hass?.services?.browser_mod?.popup) {
      this.hass.callService("browser_mod", "popup", {
        title,
        card: {
          type: "custom:pid-controller-popup",
          pid_entity: this.config.pid_entity,
        },
        size: "large",
      });
      return;
    }

    try {
      await this._ensurePopupElementReady();
    } catch (err) {
      console.error("Solar Energy Controller: could not load popup editor", err);
      return;
    }

    let popupCard;
    try {
      popupCard = this._createPopupCard();
    } catch (err) {
      console.error("Solar Energy Controller: popup editor element missing", err);
      return;
    }

    // Prefer the native <dialog> element. ha-dialog on HA 2026.3+ often accepts
    // open=true but renders nothing, which blocked the fallback in earlier builds.
    this._openNativeDialog(title, popupCard);
  }

  _onCardKeydown(ev) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this._openPopup(ev);
    }
  }

  render() {
    if (!this.hass || !this.config) {
      return html``;
    }

    const d = this._data;
    const statusClass =
      d.status === "running" ? "running" : d.enabled === false ? "disabled" : "";

    return html`
      <ha-card>
        <div
          class="card-clickable"
          role="button"
          tabindex="0"
          aria-label="Open PID controller editor"
          @click=${this._openPopup}
          @keydown=${this._onCardKeydown}
        >
        <div class="header">
          <div class="title">${this.config.title}</div>
        </div>

        <div class="compact-grid">
          ${this.config.show_status ? html`
          <div class="metric">
            <div class="metric-label">Status</div>
            <div class="metric-value">
              <span class="status-badge ${statusClass}">${d.status || "—"}</span>
            </div>
          </div>
          ` : ""}

          ${this.config.show_mode ? html`
          <div class="metric">
            <div class="metric-label">Mode</div>
            <div class="metric-value">${this._formatMode(d.runtime_mode)}</div>
          </div>
          ` : ""}

          ${this.config.show_pv ? html`
          <div class="metric">
            <div class="metric-label">PV</div>
            <div class="metric-value">${this._formatValue(d.pv_value)}</div>
          </div>
          ` : ""}

          ${this.config.show_sp ? html`
          <div class="metric">
            <div class="metric-label">SP</div>
            <div class="metric-value">${this._formatValue(d.effective_sp)}</div>
          </div>
          ` : ""}

          ${this.config.show_error ? html`
          <div class="metric">
            <div class="metric-label">Error</div>
            <div
              class="metric-value ${d.error && d.error < 0 ? "negative" : ""}"
            >
              ${this._formatValue(d.error)}
            </div>
          </div>
          ` : ""}

          ${this.config.show_output ? html`
          <div class="metric">
            <div class="metric-label">Output</div>
            <div class="metric-value">${this._formatValue(d.output)}</div>
          </div>
          ` : ""}
        </div>

        ${this.config.show_chart ? html`
          <div class="graph-container" id="graph-container"></div>
        ` : ""}

        <div class="actions">
          <mwc-button outlined label="Open Editor" @click=${this._openPopup}></mwc-button>
        </div>
        </div>
      </ha-card>
    `;
  }
}

customElements.define("pid-controller-mini", PIDControllerMini);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "pid-controller-mini",
  name: "PID Controller Mini",
  description: "Compact dashboard card for PID controller with popup editor",
  preview: false,
});

