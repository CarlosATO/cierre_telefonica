# Informe Inventario - Presentación (React)

Pequeño proyecto Vite + React que carga el componente `informe_inventario.jsx` transformado a `src/App.jsx` para poder ejecutarlo como una presentación/interfaz interactiva.

Pasos para ejecutar localmente:

1. Abrir una terminal en la carpeta del proyecto:

```bash
cd "/Users/carlosalegria/Desktop/informe Telefonica"
```

2. Instalar dependencias (requiere Node.js >= 16):

```bash
npm install
```

3. Ejecutar en modo desarrollo:

```bash
npm run dev
```

Esto lanzará Vite y te dará una URL (por defecto `http://localhost:5173`) donde podrás ver la interfaz.

Notas:
- El proyecto usa `lucide-react` para los íconos; si prefieres no instalar dependencias, puedo adaptar el componente para usar SVGs inline.
- Estilos son mínimos y replican clases tipo Tailwind sin requerir la configuración de Tailwind.

Si quieres, puedo:
- Generar un `build` estático (`npm run build`) y servirlo.
- Convertir la presentación a un `.pptx` o exportar la vista actual a PDF.
- Integrar la carga dinámica desde un CSV.

ejectutar
npm run dev --silent