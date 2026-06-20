export const cameraState = $state({
  // Permission Tracking: 'checking' | 'prompt' | 'granted' | 'denied' | 'no-camera'
  permission: 'checking',
  ready: false,
  selectedCameraId: null,
  cameras: [],
  isHaveFlash: false,
  isFlashOn: false,
  errorMessage: ''
});

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
export const supportFlashState = () => (cameraState.isHaveFlash = true);
export const toggleFlashState = () => (cameraState.isFlashOn = !cameraState.isFlashOn);
export const cameraResetState = () => {
  cameraState.cameras = [];
  cameraState.permission = 'checking';
  cameraState.ready = false;
  cameraState.selectedCameraId = null;
  cameraState.errorMessage = '';
};
