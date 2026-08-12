(async () => {
  const exceljs = await import('exceljs');
  console.log(exceljs.default ? 'Has default' : 'No default');
  console.log(Object.keys(exceljs));
})();
