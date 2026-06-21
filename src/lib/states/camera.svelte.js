const INITIAL_STATE = {
  // Permission Tracking: 'checking' | 'prompt' | 'granted' | 'denied' | 'no-camera'
  permission: 'checking',
  ready: false,
  selectedCameraId: null,
  cameras: [],
  haveFlash: false,
  isFlashOn: false,
  haveZoom: false,
  zoom: {
    min: 0,
    max: 0,
    step: 0.1,
    value: 0
  },
  errorMessage: ''
};

export const cameraState = $state(INITIAL_STATE);

export const noCameraPermission = (errorMessage) => {
  cameraState.permission = 'no-camera';
  cameraState.errorMessage = errorMessage;
};
export const needCameraPermission = () => (cameraState.permission = 'prompt');
export const grantedCameraPermission = () => {
  cameraState.permission = 'granted';
  cameraState.errorMessage = null;
};
export const deniedCameraPermission = (errorMessage) => {
  cameraState.permission = 'denied';
  cameraState.errorMessage = errorMessage;
};
export const cameraReasyState = () => {
  grantedCameraPermission();
  cameraState.ready = true;
};
export const cameraUnreadyState = (errorMessage) => {
  deniedCameraPermission(errorMessage);
  cameraState.ready = false;
};
export const cameraSetDeviceId = (explicitDeviceId) => {
  cameraState.selectedCameraId = explicitDeviceId;
};
export const cameraResetDeviceId = () => cameraSetDeviceId(null);
export const cameraSetList = (cameras = []) => {
  cameraState.cameras = cameras;
};
export const supportFlashState = () => (cameraState.haveFlash = true);
export const toggleFlashState = () => (cameraState.isFlashOn = !cameraState.isFlashOn);
export const setZoomSettings = (settings = {}) => {
  cameraState.zoom.min = settings.min;
  cameraState.zoom.max = settings.max;
  cameraState.zoom.step = settings.step;
  cameraState.zoom.value = settings.value;
  cameraState.haveZoom = true;
};
export const resetCameraCapabilities = () => {
  cameraState.haveZoom = false;
  cameraState.haveFlash = false;
  cameraState.isFlashOn = false;
};
export const resetCameraState = () => {
  Object.keys(INITIAL_STATE).forEach((key) => {
    cameraState[key] = INITIAL_STATE[key];
  });
};
