export const scanResultState = $state({
  result: null,
  errorMessage: ''
});

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

export const resetScanResult = () => {
  scanResultState.result = null
}
