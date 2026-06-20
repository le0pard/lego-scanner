export const scanResultState = $state({
  result: null
});

export const setScanResult = (result) => {
  if (scanResultState.result === result) {
    return false;
  }

  scanResultState.result = result;
  return true;
};
