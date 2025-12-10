import React, { useState, useMemo } from 'react';
import { Search, ArrowDownRight, AlertTriangle, CheckCircle, FileText, X, Filter, BarChart3, Calculator } from 'lucide-react';
import { parse as papaParse } from 'papaparse';
import * as XLSX from 'xlsx';

// --- DATOS SIMULADOS Y CORREGIDOS SEGÚN TU FEEDBACK ---

// 1. Maestro (Resumen Final)
// Ajusté 'outFon' del ADSS para que cuadre con la suma de los detalles de abajo (aprox 190k en vez de 516k)
const initialSummaryData = [
  { code: '10302520211', desc: 'KIT Retención D.13,6mm 120m span 200m', ingFot: 580, ingFon: 5679, outFot: 398, outFon: 3957, despuntesTotal: 0, stockReal: 1800, diff: -104 },
  { code: '10302520212', desc: 'KIT retención Urbana D.13,6mm Span 70m', ingFot: 430, ingFon: 2883, outFot: 350, outFon: 1885, despuntesTotal: 0, stockReal: 141, diff: -937 },
  { code: '10302530374', desc: 'Cable ADSS 48 fo con protección Roedor', ingFot: 240000, ingFon: 640000, outFot: 292919, outFon: 189769, despuntesTotal: 1200, stockReal: 52000, diff: -18230 }, 
  { code: '10303640049', desc: 'Amortiguador Amorfo para D.13,6mm FON', ingFot: 1724, ingFon: 1216, outFot: 1844, outFon: 571, despuntesTotal: 0, stockReal: 250, diff: -275 },
];

// 2. Detalle Estructurado por Proyecto
const initialDetailData = {
  '10302530374': {
    FON: [
      // Estructura: TRIOT | Cantidad Plano (Instalado) | Despuntes | SAP (Rebaja) | Dif (Real vs Sistema)
      { triot: 'TRIOTSUR09-19', plano: 12000, despuntes: 200, sap: 11500, dif: 700 },
      { triot: 'TRIOTSUR09-27', plano: 45000, despuntes: 500, sap: 45500, dif: 0 },
      // CORRECCIÓN AQUI: Valor real según tu Excel (22.919)
      { triot: 'TRIOTSUR14-04', plano: 22919, despuntes: 150, sap: 22919, dif: 0 }, 
      { triot: 'TRIOTSUR14-12', plano: 109850, despuntes: 1200, sap: 109850, dif: 1200 },
    ],
    FOT: [
      { triot: 'TRIOT 01-01', ingresos: 120000, instalado: 110000, sap: 110000, dif: 0 },
      { triot: 'TRIOT 01-12', ingresos: 120000, instalado: 182919, sap: 150000, dif: 32919 },
    ]
  },
  '10302520211': {
    FON: [
      { triot: 'TRIOTSUR09-19', plano: 500, despuntes: 0, sap: 500, dif: 0 },
      { triot: 'TRIOTSUR14-04', plano: 2500, despuntes: 0, sap: 2000, dif: 500 },
      { triot: 'TRIOTSUR09-25', plano: 957, despuntes: 0, sap: 957, dif: 0 },
    ],
    FOT: [
      { triot: 'TRIOT 01-01', ingresos: 480, instalado: 398, sap: 398, dif: 0 },
    ]
  }
};

// Helper to normalise CSV/XLS columns to our structure
const normalizeRow = (row) => {
  // Expecting common columns: code, desc, ingFot, ingFon, outFot, outFon, stockReal, diff
  return {
    code: String(row.code || row.Codigo || row.CODIGO || row['Material'] || row.material || '').trim(),
    desc: row.desc || row.Descripcion || row.DESCRIPCION || row['Descripción'] || row.descripcion || row['Desc'] || '',
    ingFot: Number(row.ingFot || row.IngFOT || row['Ingresos FOT'] || row['ing_fot'] || 0) || 0,
    ingFon: Number(row.ingFon || row.IngFON || row['Ingresos FON'] || row['ing_fon'] || 0) || 0,
    outFot: Number(row.outFot || row.OutFOT || row['Salidas FOT'] || row['out_fot'] || 0) || 0,
    outFon: Number(row.outFon || row.OutFON || row['Salidas FON'] || row['out_fon'] || 0) || 0,
    stockReal: Number(row.stockReal || row.Stock || row['Stock Real'] || row.stock_real || 0) || 0,
    diff: Number(row.diff || row.Dif || row['Diferencia'] || row.dif || 0) || 0,
  };
};

// --- COMPONENTES AUXILIARES ---

const StatusBadge = ({ value, isDiff = false, reverse = false }) => {
  if (value === 0 || value === undefined) return <span className="text-gray-300 font-mono">-</span>;
  
  if (isDiff) {
    if (reverse) {
        // For "Pendiente de rebaja" column in FON modal
        if (value > 0) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">Rebajar: {value.toLocaleString('es-CL')}</span>;
        if (value < 0) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">Ajustar: {Math.abs(value).toLocaleString('es-CL')}</span>;
        return <span className="text-green-600 font-bold"><CheckCircle size={12}/> OK</span>;
    }
    if (value < 0) return <span className="font-bold text-red-600">{value.toLocaleString('es-CL')}</span>;
    return <span className="font-bold text-green-600">+{value.toLocaleString('es-CL')}</span>;
  }
  return <span className="font-mono text-slate-700">{value.toLocaleString('es-CL')}</span>;
};

// --- MODAL DE DETALLE ---

const DetailModal = ({ isOpen, onClose, item, data, type }) => {
  if (!isOpen || !item) return null;

  const projectData = data && data[type] ? data[type] : [];
  
  const totalInstalado = projectData.reduce((acc, curr) => acc + (type === 'FON' ? curr.plano : curr.instalado), 0);
  const totalSap = projectData.reduce((acc, curr) => acc + curr.sap, 0);
  const totalDif = projectData.reduce((acc, curr) => acc + curr.dif, 0);

  const headerColor = type === 'FON' ? 'bg-orange-600' : (type === 'FOT' ? 'bg-blue-600' : 'bg-slate-800');

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className={`${headerColor} text-white p-5 flex justify-between items-center shrink-0 shadow-md`}>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 size={24} className="text-white/90"/> 
              Análisis de Instalación: Proyecto {type}
            </h2>
            <div className="flex items-center gap-2 mt-1 opacity-90">
                <span className="font-mono bg-white/20 px-2 py-0.5 rounded text-sm">{item.code}</span>
                <span className="text-sm font-medium truncate max-w-md">{item.desc}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto bg-slate-50/50">
          
          {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Instalado</p>
                <p className="text-2xl font-bold text-slate-800">{totalInstalado.toLocaleString('es-CL')}</p>
              </div>
              <FileText className="text-slate-300" size={32}/>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Rebajado SAP</p>
                <p className="text-2xl font-bold text-blue-600">{totalSap.toLocaleString('es-CL')}</p>
              </div>
              <CheckCircle className="text-blue-200" size={32}/>
            </div>
            </div>

          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide border-b pb-2 border-slate-200">
            <ArrowDownRight size={18} className="text-slate-400"/> 
            Desglose por Zona (TRIOT)
          </h3>
          
          {projectData.length > 0 ? (
            <div className="overflow-hidden bg-white border border-slate-200 rounded-lg shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-xs text-slate-600 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Zona / TRIOT</th>
                    {type === 'FON' ? (
                      <>
                        <th className="px-6 py-4 text-right text-slate-700 bg-slate-200/50">Instalado</th>
                        <th className="px-6 py-4 text-right text-orange-700 bg-orange-50">Despuntes</th>
                        <th className="px-6 py-4 text-right text-blue-700 bg-blue-50">SAP (Rebajado)</th>
                        <th className="px-6 py-4 text-right text-red-700 bg-red-50 border-l border-red-100">Pendiente de rebaja</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-4 text-right text-slate-700 bg-slate-200/50">Instalado</th>
                        <th className="px-6 py-4 text-right text-blue-700 bg-blue-50">Rebajas SAP</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800 border-r border-slate-100">
                         {row.triot}
                      </td>
                      
                        {type === 'FON' ? (
                        <>
                          <td className="px-6 py-4 text-right font-mono bg-slate-50/50">{Math.round(row.plano).toLocaleString('es-CL')}</td>
                          <td className="px-6 py-4 text-right font-mono text-orange-600">{row.despuntes > 0 ? Math.round(row.despuntes).toLocaleString('es-CL') : '-'}</td>
                          <td className="px-6 py-4 text-right font-mono text-blue-600 font-bold">{Math.round(row.sap).toLocaleString('es-CL')}</td>
                          <td className="px-6 py-4 text-right font-mono border-l border-slate-100">
                            <StatusBadge value={Math.round(row.dif)} isDiff={true} reverse={true} />
                          </td>
                        </>
                        ) : (
                        <>
                          <td className="px-6 py-4 text-right font-mono font-bold">{Math.round(row.instalado).toLocaleString('es-CL')}</td>
                          <td className="px-6 py-4 text-right font-mono text-blue-600">{Math.round(row.sap).toLocaleString('es-CL')}</td>
                        </>
                        )}
                    </tr>
                  ))}
                </tbody>
                    <tfoot className="bg-slate-50 font-bold text-slate-800 border-t border-slate-300">
                      <tr>
                        <td className="px-6 py-3 text-right uppercase text-xs tracking-wider">Totales</td>
                        {type === 'FON' ? (
                          <>
                            <td className="px-6 py-3 text-right font-mono">{Math.round(totalInstalado).toLocaleString('es-CL')}</td>
                            <td className="px-6 py-3 text-right font-mono text-orange-700">{Math.round(projectData.reduce((a,b)=>a+b.despuntes,0)).toLocaleString('es-CL')}</td>
                            <td className="px-6 py-3 text-right font-mono text-blue-700">{Math.round(totalSap).toLocaleString('es-CL')}</td>
                            <td className="px-6 py-3 text-right font-mono text-red-700 border-l border-slate-300">{Math.round(totalDif).toLocaleString('es-CL')}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-3 text-right font-mono">{Math.round(totalInstalado).toLocaleString('es-CL')}</td>
                            <td className="px-6 py-3 text-right font-mono text-blue-700">{Math.round(totalSap).toLocaleString('es-CL')}</td>
                          </>
                        )}
                      </tr>
                    </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center p-12 bg-white rounded-lg border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-medium">No hay detalles cargados para este proyecto.</p>
            </div>
          )}
          
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-100 text-yellow-800 text-sm flex items-start gap-2">
            <Calculator className="shrink-0 mt-0.5" size={16}/>
            <p>
                <strong>Nota sobre Pendientes de Rebaja:</strong> La columna "Pendiente de rebaja" (FON) muestra la resta: <em className="font-mono bg-yellow-100 px-1 rounded">Cantidad Instalada - Rebajado SAP</em>. 
                <br/>Un valor de <strong>"Rebajar"</strong> indica que el sistema aún no ha procesado toda la rebaja del material instalado.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---

export default function InventoryDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [summaryData, setSummaryData] = useState(initialSummaryData);
  const [detailData, setDetailData] = useState(initialDetailData);

  const filteredData = useMemo(() => {
    return summaryData.filter(item => 
      (item.desc || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (item.code || '').includes(searchTerm)
    );
  }, [searchTerm, summaryData]);

  const handleCellClick = (item, type) => {
    if (type === 'ALL') return;
    setSelectedItem(item);
    setFilterType(type);
    setModalOpen(true);
  };

  const calculateTotal = (fot, fon) => fot + fon;
  const calculateBalance = (ing, out) => ing - out;

  // File parsing handlers
  const handleCSV = (file) => {
    papaParse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.map(normalizeRow);
        // Build summary and detail maps naive: group by code
        const byCode = {};
        rows.forEach(r => {
          if (!r.code) return;
          if (!byCode[r.code]) byCode[r.code] = { ...r };
          else {
            byCode[r.code].ingFot += r.ingFot || 0;
            byCode[r.code].ingFon += r.ingFon || 0;
            byCode[r.code].outFot += r.outFot || 0;
            byCode[r.code].outFon += r.outFon || 0;
            byCode[r.code].stockReal = r.stockReal || byCode[r.code].stockReal;
            byCode[r.code].diff = r.diff || byCode[r.code].diff;
          }
        });
        setSummaryData(Object.values(byCode));
      }
    });
  };

  const handleXLSX = async (file) => {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const rows = json.map(normalizeRow);
    const byCode = {};
    rows.forEach(r => {
      if (!r.code) return;
      if (!byCode[r.code]) byCode[r.code] = { ...r };
      else {
        byCode[r.code].ingFot += r.ingFot || 0;
        byCode[r.code].ingFon += r.ingFon || 0;
        byCode[r.code].outFot += r.outFot || 0;
        byCode[r.code].outFon += r.outFon || 0;
        byCode[r.code].stockReal = r.stockReal || byCode[r.code].stockReal;
        byCode[r.code].diff = r.diff || byCode[r.code].diff;
      }
    });
    setSummaryData(Object.values(byCode));
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv') return handleCSV(file);
    if (ext === 'xlsx' || ext === 'xls') return handleXLSX(file);
    alert('Formato no soportado. Subir CSV o XLSX.');
  };

  // Specific parser for the provided Excel format (sheet 'MAESTRO')
  const parseMasterSheet = (rows) => {
    const summaryMap = {};
    const detailMap = {};

    rows.forEach(r => {
      const project = (r.proyecto || '').toString().trim().toUpperCase();
      const code = String(r.Catalogo || r['Catalogo'] || r.Catalogo).trim();
      if (!code) return;
      const desc = (r['Catalogo - Descripcion'] || r['Catalogo - Descripcion'] || r['Catalogo - DescripciÃ³n'] || '').toString().trim();
      const triot = (r.Triot || r.TRIOT || r['Triot'] || r['TRIOT'] || '').toString().trim();
      const instalado = Math.round(Number(r[' INSTALADO '] || r['INSTALADO'] || r['INSTALADO'] || r[' Instalado '] || 0) || 0);
      const despunte = Math.round(Number(r[' DESPUNTE '] || r['DESPUNTE'] || 0) || 0);
      const rebajado = Math.round(Number(r[' REBAJADO '] || r['REBAJADO'] || 0) || 0);
      const ingresosSap = Math.round(Number(r[' INGRESOS SAP '] || r['INGRESOS SAP'] || r['INGRESOS_SAP'] || r.ingresos || 0) || 0);
      const stockReal = Math.round(Number(r[' STOCK  REAL  '] || r['STOCK  REAL '] || r['STOCK REAL'] || r['Stock Real'] || 0) || 0);

      // init maps
      if (!summaryMap[code]) summaryMap[code] = { code, desc, ingFot: 0, ingFon: 0, outFot: 0, outFon: 0, despuntesTotal: 0, stockReal: 0, diff: 0 };
      if (!detailMap[code]) detailMap[code] = { FON: [], FOT: [] };

      // Update stock real (take the last non-zero value found)
      if (stockReal > 0) {
        summaryMap[code].stockReal = stockReal;
      }

      // Accumulate despuntes
      summaryMap[code].despuntesTotal += despunte;

      if (project === 'FON') {
        summaryMap[code].outFon += instalado;
        summaryMap[code].ingFon += ingresosSap;
        detailMap[code].FON.push({ triot, plano: instalado, despuntes: despunte, sap: rebajado, dif: instalado - rebajado });
      } else {
        // assume FOT or others go to FOT
        summaryMap[code].outFot += instalado;
        summaryMap[code].ingFot += ingresosSap;
        detailMap[code].FOT.push({ triot, ingresos: ingresosSap, instalado, sap: rebajado, dif: instalado - rebajado });
      }
    });

    // Calculate diff as: stockReal - saldoTeorico (ingresos - salidas - despuntes)
    const summary = Object.values(summaryMap).map(item => {
      const totalSalidas = item.outFot + item.outFon + item.despuntesTotal;
      const saldoTeorico = (item.ingFot + item.ingFon) - totalSalidas;
      item.diff = item.stockReal - saldoTeorico;
      return item;
    });
    
    return { summary, detailMap };
  };

  // Load the Excel file that is already in the project root (served by Vite)
  const loadLocalMasterExcel = async () => {
    try {
      const res = await fetch('/CIERRE TELEFONICA 1.O.xlsx');
      if (!res.ok) throw new Error('No se pudo descargar el archivo desde el servidor');
      const data = await res.arrayBuffer();
      const wb = XLSX.read(data);
      const sheet = wb.Sheets['MAESTRO'] || wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const { summary, detailMap } = parseMasterSheet(json);
      setSummaryData(summary);
      setDetailData(detailMap);
      alert('Datos cargados desde CIERRE TELEFONICA 1.O.xlsx — ' + summary.length + ' materiales');
    } catch (err) {
      console.error(err);
      alert('Error cargando Excel: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-800">
      
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-3 h-8 bg-blue-600 rounded-sm"></div>
            Control de Inventarios
          </h1>
          <p className="text-slate-500 mt-1 font-medium ml-6">Gestión Unificada FON + FOT | Validación SAP vs Terreno</p>
        </div>
        <div className="text-right">
             <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white text-slate-500 shadow-sm border border-slate-200">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                Sistema en Línea
             </span>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 sticky top-4 z-10">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-300" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-150 ease-in-out font-medium"
            placeholder="Buscar material (Código o Nombre)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
            <button className="button">Cargar datos (CSV / XLSX)</button>
          </label>
          <button onClick={loadLocalMasterExcel} className="button bg-white text-slate-800 border">Cargar `CIERRE TELEFONICA 1.O.xlsx`</button>
          <span className="text-sm text-slate-500">O arrastra el archivo aquí</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto table-container">
          <table className="min-w-full divide-y divide-slate-200 sticky-table compact-table">
            <thead>
              <tr className="bg-slate-900 text-white uppercase tracking-wider font-bold">
                <th colSpan="2" className="text-left border-r border-slate-700/50">Maestro de Materiales</th>
                <th colSpan="3" className="text-center bg-blue-900 border-r border-blue-800/50">Asignación (Ingresos)</th>
                <th colSpan="4" className="text-center bg-indigo-900 border-r border-indigo-800/50">Instalación (más despuntes)</th>
                <th colSpan="3" className="text-center bg-purple-900 border-r border-purple-800/50">Saldos Teóricos</th>
                <th colSpan="2" className="text-center bg-slate-800">Validación Física</th>
              </tr>
              <tr className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wide text-right border-b border-slate-200">
                <th className="text-left w-24">Código</th>
                <th className="text-left">Descripción</th>
                
                <th className="bg-blue-50/50 text-blue-900">FOT</th>
                <th className="bg-orange-50/50 text-orange-900">FON</th>
                <th className="font-extrabold border-r border-slate-200 text-slate-700">Total</th>

                <th className="bg-blue-50/50 text-blue-900">FOT</th>
                <th className="bg-orange-50/50 text-orange-900">FON</th>
                <th className="bg-yellow-50/50 text-yellow-900">Despuntes</th>
                <th className="font-extrabold border-r border-slate-200 text-slate-700">Total</th>

                <th className="bg-blue-50/50 text-blue-900">Saldo FOT</th>
                <th className="bg-orange-50/50 text-orange-900">Saldo FON</th>
                <th className="font-extrabold border-r border-slate-200 text-slate-700">Total</th>

                <th className="bg-slate-100">Físico</th>
                <th className="bg-slate-100">Dif.</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredData.map((item) => {
                const totalIng = calculateTotal(item.ingFot, item.ingFon);
                const totalOut = calculateTotal(item.outFot, item.outFon) + (item.despuntesTotal || 0);
                const saldoFot = calculateBalance(item.ingFot, item.outFot);
                const saldoFon = calculateBalance(item.ingFon, item.outFon);
                const totalSaldo = saldoFot + saldoFon - (item.despuntesTotal || 0);

                return (
                  <tr key={item.code} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="whitespace-nowrap font-mono text-slate-500 font-bold border-r border-transparent group-hover:border-blue-200">{item.code}</td>
                    <td className="text-slate-700 font-medium max-w-xs truncate border-r border-slate-100" title={item.desc}>
                      {item.desc}
                    </td>

                    {/* INGRESOS */}
                    <td className="text-right bg-blue-50/20 font-mono text-slate-600">{Math.round(item.ingFot).toLocaleString('es-CL')}</td>
                    <td className="text-right bg-orange-50/20 font-mono text-slate-600">{Math.round(item.ingFon).toLocaleString('es-CL')}</td>
                    <td className="text-right font-bold border-r border-slate-200 font-mono text-slate-800 bg-slate-50/50">{Math.round(totalIng).toLocaleString('es-CL')}</td>

                    {/* SALIDAS (Botones Interactivos) */}
                    <td className="text-right bg-blue-50/20 font-mono p-0 relative group-hover:bg-blue-100/30 transition-colors">
                      <button 
                        onClick={() => handleCellClick(item, 'FOT')}
                        className="w-full h-full block px-2 py-1.5 text-right hover:text-blue-700 hover:font-extrabold text-blue-600 underline decoration-dotted hover:decoration-solid underline-offset-2 decoration-blue-300"
                        title="Ver detalle TRIOT FOT"
                      >
                        {Math.round(item.outFot).toLocaleString('es-CL')}
                      </button>
                    </td>
                    <td className="text-right bg-orange-50/20 font-mono p-0 relative group-hover:bg-orange-100/30 transition-colors">
                      <button 
                        onClick={() => handleCellClick(item, 'FON')}
                        className="w-full h-full block px-2 py-1.5 text-right hover:text-orange-700 hover:font-extrabold text-orange-600 underline decoration-dotted hover:decoration-solid underline-offset-2 decoration-orange-300"
                        title="Ver detalle TRIOT FON (Plano vs SAP)"
                      >
                         {Math.round(item.outFon).toLocaleString('es-CL')}
                      </button>
                    </td>
                    <td className="text-right bg-yellow-50/20 font-mono text-yellow-700 font-semibold">{Math.round(item.despuntesTotal || 0).toLocaleString('es-CL')}</td>
                    <td className="text-right border-r border-slate-200 font-mono font-bold text-slate-800 bg-slate-50/50">
                       {Math.round(totalOut).toLocaleString('es-CL')}
                    </td>

                    {/* SALDOS */}
                    <td className="text-right bg-blue-50/20 font-mono">
                      <StatusBadge value={Math.round(saldoFot)} />
                    </td>
                    <td className="text-right bg-orange-50/20 font-mono">
                      <StatusBadge value={Math.round(saldoFon)} />
                    </td>
                    <td className="text-right font-bold border-r border-slate-200 font-mono bg-slate-50/50">
                       <StatusBadge value={Math.round(totalSaldo)} />
                    </td>

                    {/* REALIDAD */}
                    <td className="text-right font-mono bg-slate-100 text-slate-700 font-bold border-l border-white">{Math.round(item.stockReal).toLocaleString('es-CL')}</td>
                    <td className="text-right font-mono font-bold bg-slate-100 border-l border-slate-200">
                       <StatusBadge value={Math.round(item.diff)} isDiff={true} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Reutilizable */}
      <DetailModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        item={selectedItem}
        data={selectedItem ? detailData[selectedItem.code] : null}
        type={filterType}
      />

    </div>
  );
}