(async () => {
  const exceljs = await import('exceljs');
  console.log(exceljs.default ? Object.keys(exceljs.default) : 'no default');
})();
