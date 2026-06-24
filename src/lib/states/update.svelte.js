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
