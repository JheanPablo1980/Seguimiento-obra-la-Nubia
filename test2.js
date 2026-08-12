const text = `ITEM;DESCRIPCIN;UNID;CANTIDAD;ACTA1;ACTA 2;ACTA 3
0;CAMPAMENTO DE OBRA - TIPO CONTENEDOR 2 UNIDADES;MES;8,00;;;
0,2;2 UNIDAD SANITARA MOVIL - 2 ASEOS SEMANALES;MES;8,00;;;
2,2;"SEI ACOMETIDA 12#350 +4#350 + 1#3/0 THHN PARA TABLEROS
DISTRIBUCION TRAFO MANZANA 1";ML;7;;;`

const parseFullCsv = (text, delim) => {
  const result = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delim && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c)) { // Only add non-empty rows
         result.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  
  currentRow.push(currentCell.trim());
  if (currentRow.some(c => c)) {
    result.push(currentRow);
  }
  return result;
}

console.log(parseFullCsv(text, ';'));
