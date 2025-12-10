import React, { useState, useMemo } from 'react';
import { Search, ArrowDownRight, ArrowUpRight, AlertTriangle, CheckCircle, MapPin, Calendar, FileText, X } from 'lucide-react';

// --- SIMULACIÓN DE DATOS (MOCK DATA) ---
// En la versión final, esto se cargaría directamente de tus CSV procesados.

// 1. Datos Maestros (Del archivo FON + FOT)
const summaryData = [
  { code: '10302520211', desc: 'KIT Retención D.13,6mm 120m span 200m', ingFot: 580, ingFon: 5679, outFot: 398, outFon: 3957, stockReal: 1800, diff: -104 },
  { code: '10302520212', desc: 'KIT retención Urbana D.13,6mm Span 70m', ingFot: 430, ingFon: 2883, outFot: 350, outFon: 1885, stockReal: 141, diff: -937 },
  { code: '10302520213', desc: 'KIT suspensión D.13,6mm 120m span 200m', ingFot: 750, ingFon: 4035, outFot: 1329, outFon: 2889, stockReal: 0, diff: -567 },
  { code: '10302530374', desc: 'Cable ADSS 48 fo con protección Roedor', ingFot: 240000, ingFon: 640000, outFot: 292919, outFon: 516850, stockReal: 52000, diff: -18230 },
  { code: '10303640051', desc: 'Extensión ARO proyecto FON', ingFot: 35, ingFon: 2679, outFot: 394, outFon: 3184, stockReal: 0, diff: 864 },
];

// 2. Datos de Detalle (Simulando REBAJAS SAP + MATERIALES FON/FOT)
// Esto conecta el Código de Material con los TRIOTs y Zonas
const detailData = {
  '10302520211': [
    { date: '2024-05-06', triot: 'TRIOTSUR09-17', zone: 'CARAHUE', qty: 150, type: 'FON' },
    { date: '2024-05-10', triot: 'TRIOTSUR09-19', zone: 'NUEVA IMPERIAL', qty: 200, type: 'FON' },
    { date: '2024-06-01', triot: 'TRIOT 01-01', zone: 'VALDIVIA', qty: 50, type: 'FOT' },
  ],
  '10302530374': [
    { date: '2024-02-15', triot: 'TRIOTSUR09-25', zone: 'LOS RIOS', qty: 56000, type: 'FON' },
    { date: '2024-03-10', triot: 'TRIOT 01-12', zone: 'PTO MONTT', qty: 12000, type: 'FOT' },
    { date: '2024-04-05', triot: 'TRIOTSUR14-04', zone: 'TEMUCO', qty: 8000, type: 'FON' },
  ]
};

// --- COMPONENTES ---

const StatusBadge = ({ value, isDiff = false }) => {
  if (isDiff) {
    if (value < 0) return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-800"><AlertTriangle size={12} className="mr-1"/> {value.toLocaleString('es-CL')}</span>;
    if (value > 0) return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-800"><CheckCircle size={12} className="mr-1"/> +{value.toLocaleString('es-CL')}</span>;
    return <span className="text-gray-400 font-medium">0</span>;
  }
  // Para saldos normales
  if (value < 0) return <span className="text-red-600 font-bold">{value.toLocaleString('es-CL')}</span>;
  return <span>{value.toLocaleString('es-CL')}</span>;
};

const DetailModal = ({ isOpen, onClose, item, details }) => {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden animate-fade-in-up">
        {/* Modal Header */}
        <div className="bg-slate-800 text-white p-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText size={20} className="text-blue-400"/> 
              Detalle de Instalación
            </h2>
            <p className="text-slate-300 text-sm mt-1">{item.code} - {item.desc}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <span className="text-blue-600 text-xs font-bold uppercase">Total Instalado FON</span>
              <div className="text-2xl font-bold text-slate-800">{item.outFon.toLocaleString('es-CL')}</div>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
              <span className="text-indigo-600 text-xs font-bold uppercase">Total Instalado FOT</span>
              <div className="text-2xl font-bold text-slate-800">{item.outFot.toLocaleString('es-CL')}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <span className="text-gray-600 text-xs font-bold uppercase">Total General</span>
              <div className="text-2xl font-bold text-slate-800">{(item.outFon + item.outFot).toLocaleString('es-CL')}</div>
            </div>
          </div>

          <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
            <ArrowDownRight size={18} /> Desglose por Proyecto / Zona (Fuente: Rebajas SAP)
          </h3>
          
          {details && details.length > 0 ? (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm text-left text-gray-600">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Proyecto (TRIOT)</th>
                    <th className="px-4 py-3">Zona</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3 text-right">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((row, idx) => (
                    <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono flex items-center gap-2">
                         <Calendar size={14} className="text-gray-400"/> {row.date}
                      </td>
                      <td className="px-4 py-3 font-medium text-blue-600">{row.triot}</td>
                      <td className="px-4 py-3 flex items-center gap-1">
                        <MapPin size={14} className="text-red-400"/> {row.zone || 'Sin Zona'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.type === 'FON' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                          {row.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold">{row.qty.toLocaleString('es-CL')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500">
              No hay detalle de movimientos específicos cargados para este ítem en la demo.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end border-t">
          <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default function InventoryDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filtrado
  const filteredData = useMemo(() => {
    return summaryData.filter(item => 
      item.desc.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.code.includes(searchTerm)
    );
  }, [searchTerm]);

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  const calculateTotal = (fot, fon) => fot + fon;
  const calculateBalance = (ing, out) => ing - out;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Panel de Control de Inventarios</h1>
        <p className="text-slate-500 mt-1">Gestión Unificada FON + FOT | Asignaciones Telefónica</p>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out sm:text-sm"
            placeholder="Buscar por código o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 text-sm text-gray-600">
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> Déficit Crítico</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> Superávit</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              {/* Header Level 1 */}
              <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                <th colSpan="2" className="px-6 py-3 text-left border-r border-slate-700">Material</th>
                <th colSpan="3" className="px-6 py-3 text-center bg-blue-900 border-r border-blue-800">Asignación Telefónica</th>
                <th colSpan="3" className="px-6 py-3 text-center bg-indigo-900 border-r border-indigo-800">Salidas (Instalado + Despunte)</th>
                <th colSpan="3" className="px-6 py-3 text-center bg-purple-900 border-r border-purple-800">Saldo Teórico</th>
                <th colSpan="2" className="px-6 py-3 text-center bg-slate-800">Auditoría</th>
              </tr>
              {/* Header Level 2 */}
              <tr className="bg-slate-100 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">
                <th className="px-4 py-3 text-left w-24">Código</th>
                <th className="px-4 py-3 text-left">Descripción</th>
                
                <th className="px-4 py-3 bg-blue-50 text-blue-800">FOT</th>
                <th className="px-4 py-3 bg-orange-50 text-orange-800">FON</th>
                <th className="px-4 py-3 font-bold border-r">Total</th>

                <th className="px-4 py-3 bg-blue-50 text-blue-800">Cons. FOT</th>
                <th className="px-4 py-3 bg-orange-50 text-orange-800">Cons. FON</th>
                <th className="px-4 py-3 font-bold border-r">Total</th>

                <th className="px-4 py-3 bg-blue-50 text-blue-800">Saldo FOT</th>
                <th className="px-4 py-3 bg-orange-50 text-orange-800">Saldo FON</th>
                <th className="px-4 py-3 font-bold border-r">Total</th>

                <th className="px-4 py-3">Físico</th>
                <th className="px-4 py-3">Dif</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredData.map((item) => {
                const totalIng = calculateTotal(item.ingFot, item.ingFon);
                const totalOut = calculateTotal(item.outFot, item.outFon);
                const saldoFot = calculateBalance(item.ingFot, item.outFot);
                const saldoFon = calculateBalance(item.ingFon, item.outFon);
                const totalSaldo = saldoFot + saldoFon;

                return (
                  <tr key={item.code} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-slate-500">{item.code}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium max-w-xs truncate" title={item.desc}>
                      {item.desc}
                    </td>

                    {/* INGRESOS */}
                    <td className="px-4 py-3 text-sm text-right bg-blue-50/30 font-mono text-slate-600">{item.ingFot.toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3 text-sm text-right bg-orange-50/30 font-mono text-slate-600">{item.ingFon.toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold border-r font-mono text-slate-800">{totalIng.toLocaleString('es-CL')}</td>

                    {/* SALIDAS (Clickable) */}
                    <td className="px-4 py-3 text-sm text-right bg-blue-50/30 font-mono text-slate-600">{item.outFot.toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3 text-sm text-right bg-orange-50/30 font-mono text-slate-600">{item.outFon.toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3 text-sm text-right border-r font-mono">
                      <button 
                        onClick={() => handleRowClick(item)}
                        className="text-indigo-600 hover:text-indigo-900 hover:underline font-bold focus:outline-none"
                      >
                        {totalOut.toLocaleString('es-CL')}
                      </button>
                    </td>

                    {/* SALDOS */}
                    <td className="px-4 py-3 text-sm text-right bg-blue-50/30 font-mono">
                      <StatusBadge value={saldoFot} />
                    </td>
                    <td className="px-4 py-3 text-sm text-right bg-orange-50/30 font-mono">
                      <StatusBadge value={saldoFon} />
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold border-r font-mono">
                       <StatusBadge value={totalSaldo} />
                    </td>

                    {/* REALIDAD */}
                    <td className="px-4 py-3 text-sm text-right font-mono bg-slate-50">{item.stockReal.toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono font-bold">
                       <StatusBadge value={item.diff} isDiff={true} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <DetailModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        item={selectedItem}
        details={selectedItem ? detailData[selectedItem.code] : []}
      />

    </div>
  );
}
