(async () => {
  const mod = await import('file-saver');
  const fileSaver = mod.default || mod;
  console.log("fileSaver:", typeof fileSaver);
  console.log("fileSaver.saveAs:", typeof fileSaver.saveAs);
  const { saveAs } = fileSaver;
  console.log("saveAs:", typeof saveAs);
})();
