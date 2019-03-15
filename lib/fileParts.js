function fileParts(src) {
  const filename = src.split('/')[src.split('/').length - 1];
  const ext = filename.split('.')[filename.split('.').length - 1];
  const fileWithoutExt = filename.substr(0, filename.length - ext.length - 1);
  return {
    filename, ext, fileWithoutExt
  };
}

module.exports = fileParts;
