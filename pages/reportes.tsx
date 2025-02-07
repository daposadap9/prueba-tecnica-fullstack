import { useState, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Movement {
  id: string;
  concepto: string;
  monto: number;
  fecha: string;
  tipo: 'ingreso' | 'egreso';
}

const GET_MOVEMENTS = gql`
  query GetMovements {
    movements {
      id
      concepto
      monto
      fecha
      tipo
      user {
        id
        name
      }
    }
  }
`;

type TimeFrame = 'diario' | 'semanal' | 'mensual' | 'rango';

export default function Movimientos() {
  // Estados para el filtro y para el rango personalizado
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('diario');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [rangeError, setRangeError] = useState('');

  const { data: session, status } = useSession();
  const { data, loading, error } = useQuery<{ movements: Movement[] }>(GET_MOVEMENTS)

  const [chartData, setChartData] = useState<any>(null);
  const [average, setAverage] = useState<number>(0);

  useEffect(() => {
    if (data && data.movements) {
      const filteredData = filterMovementsByTimeFrame(data.movements);
      const chartInfo = prepareChartData(filteredData);
      setChartData(chartInfo.chartData);
      setAverage(chartInfo.average);
    }
  }, [data, timeFrame, customStartDate, customEndDate]);

  /**
   * Filtra los movimientos según el filtro seleccionado.
   */
  const filterMovementsByTimeFrame = (movements: Movement[]): Movement[] => {
    const today = new Date();

    return movements.filter((movement) => {
      const movementDate = parseDate(movement.fecha);
      if (!movementDate) return false;

      switch (timeFrame) {
        case 'diario':
          return (
            movementDate.getFullYear() === today.getFullYear() &&
            movementDate.getMonth() === today.getMonth() &&
            movementDate.getDate() === today.getDate()
          );
        case 'semanal': {
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          return movementDate >= startOfWeek && movementDate <= endOfWeek;
        }
        case 'mensual':
          return (
            movementDate.getFullYear() === today.getFullYear() &&
            movementDate.getMonth() === today.getMonth()
          );
        case 'rango': {
          if (!customStartDate || !customEndDate) return false;
          const [startYear, startMonth, startDay] = customStartDate.split('-').map(Number);
          const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
          const [endYear, endMonth, endDay] = customEndDate.split('-').map(Number);
          const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
          return movementDate >= startDate && movementDate <= endDate;
        }
        default:
          return false;
      }
    });
  };

  /**
   * Función para parsear la fecha.
   * - Si el string tiene el formato "YYYY-MM-DD" (10 caracteres), se convierte a fecha local.
   * - Si tiene el formato "YYYY-MM-DD HH:mm:ss", se le agrega el offset local.
   * - Si es un timestamp, se ajusta.
   */
  const parseDate = (fecha: string): Date | null => {
    // Si es "YYYY-MM-DD" (formato corto)
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const [year, month, day] = fecha.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    // Si es "YYYY-MM-DD HH:mm:ss"
    if (fecha.includes('-') && fecha.includes(':')) {
      const [datePart, timePart] = fecha.split(' ');
      const offset = -new Date().getTimezoneOffset();
      const sign = offset >= 0 ? '+' : '-';
      const pad = (num: number) => String(Math.floor(Math.abs(num))).padStart(2, '0');
      const offsetStr = sign + pad(offset / 60) + ':' + pad(offset % 60);
      return new Date(`${datePart}T${timePart}${offsetStr}`);
    }
    const timestamp = Number(fecha);
    if (!timestamp || isNaN(timestamp)) return null;
    const adjustedTimestamp = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    return new Date(adjustedTimestamp);
  };

  /**
   * Prepara los datos para el gráfico y calcula el promedio de neto diario.
   * Se agrupa por fecha (YYYY-MM-DD) y se calcula para cada día:
   *   neto = ingresos - egresos.
   * Luego se promedia entre los días con movimientos.
   */
  const prepareChartData = (filteredData: Movement[]) => {
    const dataMap: Record<string, { ingresos: number; egresos: number }> = {};

    filteredData.forEach((movement) => {
      const movementDate = parseDate(movement.fecha);
      if (!movementDate) return;

      // Se usa el formato YYYY-MM-DD para la etiqueta
      const dateLabel = movementDate.toISOString().split('T')[0];
      if (!dataMap[dateLabel]) {
        dataMap[dateLabel] = { ingresos: 0, egresos: 0 };
      }
      if (movement.tipo === 'ingreso') {
        dataMap[dateLabel].ingresos += movement.monto;
      } else {
        dataMap[dateLabel].egresos += movement.monto;
      }
    });

    // Etiquetas (fechas) ordenadas
    const labels = Object.keys(dataMap).sort();
    // Datos para el gráfico
    const ingresos = labels.map((label) => dataMap[label].ingresos);
    const egresos = labels.map((label) => dataMap[label].egresos);
    // Calcular el promedio: promedia el neto (ingresos - egresos) por día
    const dailyNets = labels.map((label) => dataMap[label].ingresos - dataMap[label].egresos);
    const totalNet = dailyNets.reduce((acc, net) => acc + net, 0);
    const avgDailyNet = labels.length ? totalNet / labels.length : 0;

    return {
      chartData: {
        labels,
        datasets: [
          {
            label: 'Ingresos',
            data: ingresos,
            backgroundColor: 'rgba(0, 128, 0, 0.7)',
            borderColor: 'green',
            borderWidth: 1,
          },
          {
            label: 'Egresos',
            data: egresos,
            backgroundColor: 'rgba(255, 0, 0, 0.7)',
            borderColor: 'red',
            borderWidth: 1,
          },
        ],
      },
      average: avgDailyNet,
    };
  };

  // Valida que el rango no supere 3 meses (~92 días)
  const validateCustomRange = (start: string, end: string) => {
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
      if (diffDays > 92) {
        setRangeError('El rango no debe ser mayor a 3 meses.');
      } else if (endDate < startDate) {
        setRangeError('La fecha final no puede ser anterior a la fecha inicial.');
      } else {
        setRangeError('');
      }
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomStartDate(e.target.value);
    validateCustomRange(e.target.value, customEndDate);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomEndDate(e.target.value);
    validateCustomRange(customStartDate, e.target.value);
  };

  // --- DESCARGAS BASADAS EN FILTRO SELECCIONADO ---
  const createSheetData = (movements: Movement[]) => {
    return movements.map((movement) => ({
      ID: movement.id,
      Concepto: movement.concepto,
      Monto: movement.monto,
      Fecha: (() => {
        const d = parseDate(movement.fecha);
        return d ? d.toLocaleDateString() : '';
      })(),
      Tipo: movement.tipo
    }));
  };

  const handleDownloadSelectedExcel = () => {
    if (!data || !data.movements) return;
    if (timeFrame === 'rango' && rangeError) {
      alert(rangeError);
      return;
    }
    const filteredMovements = filterMovementsByTimeFrame(data.movements);
    const sheetData = createSheetData(filteredMovements);
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Seleccionado');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    saveAs(blob, 'movimientos_seleccionado.xlsx');
  };

  const handleDownloadSelectedCSV = () => {
    if (!data || !data.movements) return;
    if (timeFrame === 'rango' && rangeError) {
      alert(rangeError);
      return;
    }
    const filteredMovements = filterMovementsByTimeFrame(data.movements);
    const csvData = createSheetData(filteredMovements);
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'movimientos_seleccionado.csv');
  };

  // --- DESCARGAS PARA DIARIO, SEMANAL Y MENSUAL (3 hojas) ---
  const isMovementInTimeFrame = (movement: Movement, tf: TimeFrame) => {
    const mDate = parseDate(movement.fecha);
    if (!mDate) return false;
    const today = new Date();
    switch (tf) {
      case 'diario':
        return (
          mDate.getFullYear() === today.getFullYear() &&
          mDate.getMonth() === today.getMonth() &&
          mDate.getDate() === today.getDate()
        );
      case 'semanal': {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return mDate >= startOfWeek && mDate <= endOfWeek;
      }
      case 'mensual':
        return (
          mDate.getFullYear() === today.getFullYear() &&
          mDate.getMonth() === today.getMonth()
        );
      default:
        return false;
    }
  };

  const handleDownloadAllExcel = () => {
    if (!data || !data.movements) return;
    const workbook = XLSX.utils.book_new();
    const dailyMovements = data.movements.filter((m) => isMovementInTimeFrame(m, 'diario'));
    const weeklyMovements = data.movements.filter((m) => isMovementInTimeFrame(m, 'semanal'));
    const monthlyMovements = data.movements.filter((m) => isMovementInTimeFrame(m, 'mensual'));

    if (dailyMovements.length) {
      const dailySheet = XLSX.utils.json_to_sheet(createSheetData(dailyMovements));
      XLSX.utils.book_append_sheet(workbook, dailySheet, 'Diario');
    }
    if (weeklyMovements.length) {
      const weeklySheet = XLSX.utils.json_to_sheet(createSheetData(weeklyMovements));
      XLSX.utils.book_append_sheet(workbook, weeklySheet, 'Semanal');
    }
    if (monthlyMovements.length) {
      const monthlySheet = XLSX.utils.json_to_sheet(createSheetData(monthlyMovements));
      XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Mensual');
    }
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    saveAs(blob, 'movimientos_tresHojas.xlsx');
  };

  const handleDownloadAllCSV = () => {
    if (!data || !data.movements) return;
    const dailyMovements = data.movements.filter((m) => isMovementInTimeFrame(m, 'diario'));
    const weeklyMovements = data.movements.filter((m) => isMovementInTimeFrame(m, 'semanal'));
    const monthlyMovements = data.movements.filter((m) => isMovementInTimeFrame(m, 'mensual'));

    const combinedData = [
      ...createSheetData(dailyMovements.map(m => ({ ...m, _timeFrame: 'Diario' }))),
      ...createSheetData(weeklyMovements.map(m => ({ ...m, _timeFrame: 'Semanal' }))),
      ...createSheetData(monthlyMovements.map(m => ({ ...m, _timeFrame: 'Mensual' }))),
    ];

    const csv = Papa.unparse(combinedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'movimientos_tresHojas.csv');
  };

  if (status === 'loading') return <p>Cargando sesión...</p>;
  if (!session) return <p>No estás autenticado.</p>;
  if (loading) return <p>Cargando movimientos...</p>;
  if (error) return <p>Error al cargar movimientos.</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gráfico de Movimientos</h1>

      <div className="mb-4">
        <label className="mr-2">Selecciona el rango de tiempo:</label>
        <select
          value={timeFrame}
          onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
          className="border p-2"
        >
          <option value="diario">Diario</option>
          <option value="semanal">Semanal</option>
          <option value="mensual">Mensual</option>
          <option value="rango">Rango</option>
        </select>
      </div>

      {timeFrame === 'rango' && (
        <div className="mb-4">
          <label className="mr-2">Fecha Inicial: </label>
          <input
            type="date"
            value={customStartDate}
            onChange={handleStartDateChange}
            className="border p-2 mr-4"
          />
          <label className="mr-2">Fecha Final: </label>
          <input
            type="date"
            value={customEndDate}
            onChange={handleEndDateChange}
            className="border p-2"
          />
          {rangeError && <p className="text-red-500 mt-2">{rangeError}</p>}
        </div>
      )}

      {chartData && (
        <Bar
          data={chartData}
          options={{
            responsive: true,
            plugins: { title: { display: true, text: 'Ingresos vs Egresos' } }
          }}
        />
      )}
      <h3 className="mt-4 text-lg font-bold">Promedio: ${average.toFixed(2)}</h3>

      <div className="mt-6">
        <h2 className="text-xl font-bold mb-2">Descargar según filtro seleccionado</h2>
        <button
          onClick={handleDownloadSelectedExcel}
          className="mr-4 px-4 py-2 bg-green-500 text-white rounded-md"
        >
          Descargar Seleccionado Excel
        </button>
        <button
          onClick={handleDownloadSelectedCSV}
          className="px-4 py-2 bg-blue-500 text-white rounded-md"
        >
          Descargar Seleccionado CSV
        </button>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-bold mb-2">Descargar Diario, Semanal y Mensual (3 hojas)</h2>
        <button
          onClick={handleDownloadAllExcel}
          className="mr-4 px-4 py-2 bg-green-700 text-white rounded-md"
        >
          Descargar 3 Hojas Excel
        </button>
        <button
          onClick={handleDownloadAllCSV}
          className="px-4 py-2 bg-blue-700 text-white rounded-md"
        >
          Descargar 3 Hojas CSV
        </button>
      </div>
    </div>
  );
}
