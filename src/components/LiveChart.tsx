'use client';

import React, { useRef, memo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ScriptableContext,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { saveAs } from 'file-saver';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

interface PriceHistory {
  labels: string[];
  data: number[];
}

interface LiveChartProps {
  priceHistory: PriceHistory;
  coin: string;
  latestPrice: number;
}

const LiveChart = memo(function LiveChart({ priceHistory, coin, latestPrice }: LiveChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const chartData = priceHistory.data;

  let minPrice: number;
  let maxPrice: number;
  let padding: number;

  if (chartData && chartData.length > 1) {
    minPrice = Math.min(...chartData);
    maxPrice = Math.max(...chartData);
    padding = (maxPrice - minPrice) * 0.15 || minPrice * 0.01;
  } else {
    minPrice = latestPrice * 0.99;
    maxPrice = latestPrice * 1.01;
    padding = 0;
  }

  const lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { color: '#888', font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
        grid: { display: false },
      },
      y: {
        position: 'right',
        ticks: { color: '#888' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        min: minPrice - padding,
        max: maxPrice + padding,
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: '#1f2937',
        titleColor: '#f59e0b',
        bodyColor: '#e5e7eb',
      },
      zoom: {
        pan: { enabled: true, mode: 'x' },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
      },
    },
    elements: { point: { radius: 0 } },
  };

  const data = {
    labels: priceHistory.labels,
    datasets: [
      {
        label: 'Fiyat',
        data: chartData,
        borderColor: '#38bdf8',
        backgroundColor: (context: ScriptableContext<'line'>) => {
          if (!context.chart.chartArea) return undefined;
          const {
            ctx,
            chartArea: { top, bottom },
          } = context.chart;
          const gradient = ctx.createLinearGradient(0, top, 0, bottom);
          gradient.addColorStop(0, 'rgba(56, 189, 248, 0.3)');
          gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  };

  const downloadCSV = () => {
    let csv = 'Zaman,Fiyat\n';
    priceHistory.labels.forEach((label, index) => {
      csv += `${label},${priceHistory.data[index]}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${coin.replace('/', '_')}_chart_data.csv`);
  };

  const resetZoom = () => {
    chartRef.current?.resetZoom();
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 h-full flex flex-col backdrop-blur-sm border border-white/10">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-200">{coin.replace('/USD', '')} Grafiği</h3>
          <p className="text-2xl font-bold text-white">
            ${latestPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <button
            onClick={resetZoom}
            className="text-xs px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition mr-2"
          >
            Sıfırla
          </button>
          <button
            onClick={downloadCSV}
            className="text-xs px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition"
          >
            İndir
          </button>
        </div>
      </div>
      <div className="flex-grow relative">
        {priceHistory.data.length > 1 ? (
          <Line ref={chartRef} options={lineChartOptions} data={data} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">Grafik için veri bekleniyor...</div>
        )}
      </div>
    </div>
  );
});

LiveChart.displayName = 'LiveChart';

export default LiveChart;
