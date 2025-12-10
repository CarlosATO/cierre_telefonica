import React from 'react'
import { createRoot } from 'react-dom/client'
// Usamos el `informe_inventario.jsx` en la raíz para que puedas editar ese archivo directamente.
import InventoryDashboard from '../informe_inventario.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <InventoryDashboard />
  </React.StrictMode>
)
