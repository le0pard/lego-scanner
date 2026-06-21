const INITIAL_STATE = {
  result: null,
  errorMessage: ''
};

export const scanResultState = $state(INITIAL_STATE);

export const setScanResult = (result) => {
  if (scanResultState.result === result) {
    return false;
  }

  scanResultState.errorMessage = '';
  scanResultState.result = result;
  return true;
};

export const setScanError = (errorMessage) => {
  scanResultState.result = null;
  scanResultState.errorMessage = errorMessage;
};

export const resetScanState = () => {
  Object.keys(INITIAL_STATE).forEach((key) => {
    scanResultState[key] = INITIAL_STATE[key];
  });
};
