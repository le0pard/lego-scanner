const createInitialState = () => ({
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
});

export const cameraState = $state(createInitialState());

export const noCameraPermission = (errorMessage) => {
  cameraState.permission = 'no-camera';
  cameraState.errorMessage = errorMessage;
};

export const needCameraPermission = () => {
  cameraState.permission = 'prompt';
};

export const grantedCameraPermission = () => {
  cameraState.permission = 'granted';
  cameraState.errorMessage = '';
};

export const deniedCameraPermission = (errorMessage) => {
  cameraState.permission = 'denied';
  cameraState.errorMessage = errorMessage;
};

export const cameraReadyState = () => {
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

export const cameraResetDeviceId = () => {
  cameraState.selectedCameraId = null;
};

export const cameraSetList = (cameras = []) => {
  cameraState.cameras = cameras;
};

export const supportFlashState = () => {
  cameraState.haveFlash = true;
};

export const toggleFlashState = () => {
  cameraState.isFlashOn = !cameraState.isFlashOn;
};

export const setZoomSettings = (settings = {}) => {
  cameraState.zoom.min = settings.min;
  cameraState.zoom.max = settings.max;
  cameraState.zoom.step = settings.step || 0.1;
  cameraState.zoom.value = settings.value;
  cameraState.haveZoom = true;
};

export const resetCameraCapabilities = () => {
  cameraState.haveZoom = false;
  cameraState.haveFlash = false;
  cameraState.isFlashOn = false;
};

export const resetCameraState = () => {
  const freshState = createInitialState();
  Object.keys(freshState).forEach((key) => {
    cameraState[key] = freshState[key];
  });
};
