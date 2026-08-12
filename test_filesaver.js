(async () => {
  const fs = await import('file-saver');
  console.log(fs.default ? Object.keys(fs.default) : 'no default');
})();
