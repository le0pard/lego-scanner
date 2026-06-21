export const extractFieldsFromDataMatrix = (dataMatrix = '') => {
  const parts = dataMatrix.split(' ');
  // safety check
  if (parts.length < 2) {
    return null;
  }

  const productionCode = parts[1];
  // safety check
  if (productionCode.length < 5) {
    return null;
  }

  const code = parts[0];
  const factory = productionCode[3];
  const year = productionCode[4];

  return {
    code,
    factory,
    year,
    key: [code, factory, year].filter(Boolean).join('_')
  };
};
