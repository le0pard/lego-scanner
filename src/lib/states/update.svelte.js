export const updateState = $state({
  available: false
});

/**
 * Activates the application update notification flag.
 * @param {boolean} isAvailable
 */
export function setUpdateAvailable(isAvailable) {
  updateState.available = isAvailable;
}

/**
 * Triggers a full browser window refresh to load the latest active cached assets.
 */
export function reloadApp() {
  window.location.reload();
}
