(async () => {
  const htmlToImage = await import('html-to-image');
  console.log(htmlToImage.default ? 'Has default' : 'No default');
  console.log(Object.keys(htmlToImage));
})();
