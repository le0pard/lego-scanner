const createInitialState = () => ({
  result: null,
  errorMessage: ''
});

export const scanResultState = $state(createInitialState());

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
  const freshState = createInitialState();
  Object.keys(freshState).forEach((key) => {
    scanResultState[key] = freshState[key];
  });
};
