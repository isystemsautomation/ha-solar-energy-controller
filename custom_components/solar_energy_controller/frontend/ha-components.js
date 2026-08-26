const REQUIRED = ["ha-textfield", "ha-select", "ha-switch", "mwc-list-item", "mwc-button"];

function allDefined() {
  return REQUIRED.every((tag) => customElements.get(tag));
}

let loadingPromise = null;

export async function ensureHaComponents(timeoutMs = 5000) {
  if (allDefined()) return true;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      if (window.loadCardHelpers) {
        const helpers = await window.loadCardHelpers();
        const card = await helpers.createCardElement({ type: "entities", entities: [] });
        if (card?.constructor?.getConfigElement) {
          await card.constructor.getConfigElement();
        }
      }
    } catch (err) {
      console.warn("Solar Energy Controller: loadCardHelpers failed", err);
    }

    await Promise.race([
      Promise.all(REQUIRED.map((tag) => customElements.whenDefined(tag))),
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);

    if (!allDefined()) {
      const missing = REQUIRED.filter((tag) => !customElements.get(tag));
      console.warn("Solar Energy Controller: HA components missing:", missing);
    }

    return allDefined();
  })();

  return loadingPromise;
}
