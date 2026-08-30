const MODULE_VERSION_QUERY = new URL(import.meta.url).search;

import { LitElement, html, css } from "./lit-core.min.js";
import { normalizeRuntimeMode, runtimeModeLabel, validatePidCardConfig } from "./runtime-modes.js";
import { ensureHaComponents } from "./ha-components.js";
import {
  fetchHistory,
  formatValue,
  getEntityIds,
  loadChartJS,
  buildChartMeta,
  createHistoryLineChartConfig,
  updateTraces,
} from "./chart-utils.js";

class PIDControllerMini extends LitElement {
  static properties = {
    hass: { type: Object },
    config: { type: Object },
    _data: { state: true },
    _configError: { state: true },
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

    .config-error {
      padding: 16px;
      color: var(--error-color, #db4437);
      font-size: 14px;
      line-height: 1.4;
    }

    .config-error-title {
      font-weight: 600;
      margin-bottom: 8px;
    }

    .config-error-hint {
      margin-top: 8px;
      font-size: 12px;
      color: var(--secondary-text-color);
    }
  `;

  constructor() {
    super();
    this._data = {};
    this._configError = null;
    this._canvas = null;
    this._chart = null;
    this._graphInFlight = false;
    this._graphUpdateTimeout = null;
    this._activePopupCard = null;
  }

  setConfig(config) {
    const validation = validatePidCardConfig(config);
    if (!validation.ok) {
      this._configError = validation.error;
      this.config = null;
      return;
    }

    this._configError = null;
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
      pid_entity: validation.pid_entity,
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "pid_entity",
          required: false,
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

  static getStubConfig() {
    return {
      pid_entity: "sensor.solar_energy_controller_status",
      title: "PID Controller",
    };
  }

  getCardSize() {
    return 6;
  }

  updated(changedProperties) {
    if (!this.config || this._configError) {
      return;
    }
    if (changedProperties.has("hass") || changedProperties.has("config")) {
      this._updateData();
      if (this.config.show_chart) {
        this._scheduleGraphUpdate(800);
      }
    }
    if (this._activePopupCard && changedProperties.has("hass") && this.hass) {
      this._activePopupCard.hass = this.hass;
    }
  }

  async firstUpdated() {
    if (!this.config?.show_chart) {
      return;
    }
    try {
      await loadChartJS(MODULE_VERSION_QUERY);
      if (!this.isConnected) return;
      setTimeout(() => this._updateGraph(), 200);
      this._graphInterval = setInterval(() => this._updateGraph(), 30000);
    } catch (err) {
      console.error("Solar Energy Controller: chart setup failed", err);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._graphInterval) {
      clearInterval(this._graphInterval);
      this._graphInterval = null;
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    if (this._graphUpdateTimeout) {
      clearTimeout(this._graphUpdateTimeout);
      this._graphUpdateTimeout = null;
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
    const entityIds = getEntityIds(this.hass, this.config?.pid_entity);
    const meta = buildChartMeta(this.hass, entityIds);
    try {
      this._chart = new window.Chart(ctx, createHistoryLineChartConfig(meta));
    } catch (err) {
      console.error("Solar Energy Controller: Chart.js init failed", err);
      return;
    }

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

      const entityIds = getEntityIds(this.hass, this.config.pid_entity);
      const points = await fetchHistory(this.hass, entityIds);

      if (points) {
        updateTraces(this._chart, points);
      }
    } catch (err) {
      console.error("Error updating graph:", err);
      const container = this.shadowRoot?.getElementById("graph-container");
      if (container && !this._chart) {
        const errorMsg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
        container.replaceChildren();
        const errEl = document.createElement("div");
        errEl.style.cssText = "padding:8px;color:var(--error-color,red);font-size:12px";
        errEl.textContent = `Graph error: ${errorMsg}`;
        container.appendChild(errEl);
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

  _formatMode(mode) {
    if (!mode) return "—";
    return runtimeModeLabel(mode);
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
        width: min(680px, 92vw);
        max-height: 85vh;
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
        padding: 12px 12px 0;
        position: sticky;
        top: 0;
        z-index: 1;
        background: var(--card-background-color, #1c1c1c);
      }
      .pid-controller-native-dialog-title {
        font-size: 18px;
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

    await import(`./pid-controller-popup.js${MODULE_VERSION_QUERY}`);
    await customElements.whenDefined("pid-controller-popup");
    await ensureHaComponents();
    return true;
  }

  _createPopupCard() {
    if (!customElements.get("pid-controller-popup")) {
      throw new Error("pid-controller-popup custom element is not registered");
    }

    const popupCard = document.createElement("pid-controller-popup");
    popupCard.setConfig({ pid_entity: this.config.pid_entity });
    popupCard.hass = this.hass;
    return popupCard;
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
      if (this._activePopupCard === popupCard) {
        this._activePopupCard = null;
      }
      if (dialog.parentNode) {
        dialog.parentNode.removeChild(dialog);
      }
    };
    dialog.addEventListener("closed", cleanup, { once: true });
    dialog.addEventListener("close", cleanup, { once: true });
  }

  _openNativeDialog(title, popupCard) {
    this._ensureNativeDialogStyles();
    this._activePopupCard = popupCard;

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
    if (this._configError) {
      return html`
        <ha-card>
          <div class="config-error">
            <div class="config-error-title">PID Controller Mini</div>
            ${this._configError}
            <div class="config-error-hint">
              Edit the card and set pid_entity to your Solar Energy Controller status sensor
              (sensor.&lt;name&gt;_status). If the card worked before an update, reload the
              integration and hard-refresh the dashboard (Ctrl+F5).
            </div>
          </div>
        </ha-card>
      `;
    }

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
            <div class="metric-value">${formatValue(d.pv_value)}</div>
          </div>
          ` : ""}

          ${this.config.show_sp ? html`
          <div class="metric">
            <div class="metric-label">SP</div>
            <div class="metric-value">${formatValue(d.effective_sp)}</div>
          </div>
          ` : ""}

          ${this.config.show_error ? html`
          <div class="metric">
            <div class="metric-label">Error</div>
            <div
              class="metric-value ${d.error && d.error < 0 ? "negative" : ""}"
            >
              ${formatValue(d.error)}
            </div>
          </div>
          ` : ""}

          ${this.config.show_output ? html`
          <div class="metric">
            <div class="metric-label">Output</div>
            <div class="metric-value">${formatValue(d.output)}</div>
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

if (!customElements.get("pid-controller-mini")) {
  customElements.define("pid-controller-mini", PIDControllerMini);

  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === "pid-controller-mini")) {
    window.customCards.push({
      type: "pid-controller-mini",
      name: "PID Controller Mini",
      description: "Compact dashboard card for PID controller with popup editor",
      preview: false,
    });
  }
}

