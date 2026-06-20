export const tabsState = $state({
  state: 'camera'
});
export const cameraTabState = () => tabsState.state === 'camera';
export const uploadTabState = () => tabsState.state === 'upload';
export const activateCameraTabState = () => (tabsState.state = 'camera');
export const activateUploadTabState = () => (tabsState.state = 'upload');
