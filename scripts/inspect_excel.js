const XLSX = require('xlsx');
const path = require('path');

const file = path.resolve(__dirname, '..', 'CIERRE TELEFONICA 1.O.xlsx');
const wb = XLSX.readFile(file);
console.log('Sheets:', wb.SheetNames);
wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log('\nSheet:', name, 'Rows:', json.length);
  console.log(JSON.stringify(json.slice(0,5), null, 2));
});
