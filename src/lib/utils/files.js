export const extractJsonFileName = (filePath = '') => {
  const filename = filePath.split('/').pop();
  const name = filename?.replace('.json', '');
  return {
    filename,
    name
  };
};
