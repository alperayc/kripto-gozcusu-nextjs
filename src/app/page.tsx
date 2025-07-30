'use client'; // Bu satır, dosyanın istemci tarafında çalışacağını belirtir.

import React, { useState, useEffect, memo, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler, Chart
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { saveAs } from 'file-saver';

// Chart.js'in çalışması için gerekli modülleri kaydediyoruz.
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler, zoomPlugin
);

// --- TypeScript Arayüzleri (Interfaces) ---
interface Price {
  symbol: string;
  price: number;
  timestamp: number;
  change?: number;
}

interface Alert {
  id: number;
  SYMBOL?: string;
  LATESTPRICE?: number;
  PERCENTAGEINCREASE?: number;
  TIMESTAMP?: number;
}

interface PriceHistory {
  labels: string[];
  data: number[];
}

// --- İkon Bileşenleri ---
const BellIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>);
const TrendingUpIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>);

// --- Arayüz Bileşenleri ---
const LiveChart = memo(function LiveChart({ priceHistory, coin, latestPrice }: { priceHistory: PriceHistory, coin: string, latestPrice: number }) {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const chartData = priceHistory.data;
  let minPrice, maxPrice, padding;

  if (chartData && chartData.length > 1) {
    minPrice = Math.min(...chartData);
    maxPrice = Math.max(...chartData);
    padding = (maxPrice - minPrice) * 0.15 || minPrice * 0.01;
  } else {
    minPrice = latestPrice * 0.99; maxPrice = latestPrice * 1.01; padding = 0;
  }

  const lineChartOptions: any = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      x: { ticks: { color: '#888', font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
      y: { position: 'right', ticks: { color: '#888' }, grid: { color: 'rgba(255, 255, 255, 0.05)' }, min: minPrice - padding, max: maxPrice + padding }
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true, mode: 'index', intersect: false, backgroundColor: '#1f2937', titleColor: '#f59e0b', bodyColor: '#e5e7eb' },
      zoom: { pan: { enabled: true, mode: 'x' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' } }
    },
    elements: { point: { radius: 0 } }
  };

  const data = {
    labels: priceHistory.labels,
    datasets: [{
      label: 'Fiyat', data: chartData, borderColor: '#38bdf8',
      backgroundColor: (context: any) => {
        if (!context.chart.chartArea) return;
        const { ctx, chartArea: { top, bottom } } = context.chart;
        const gradient = ctx.createLinearGradient(0, top, 0, bottom);
        gradient.addColorStop(0, "rgba(56, 189, 248, 0.3)");
        gradient.addColorStop(1, "rgba(56, 189, 248, 0)");
        return gradient;
      },
      fill: true, tension: 0.4, borderWidth: 2,
    }],
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
          <h3 className="text-lg font-semibold text-gray-200">{coin.replace('/USD','')} Grafiği</h3>
          <p className="text-2xl font-bold text-white">${latestPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div>
          <button onClick={resetZoom} className="text-xs px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition mr-2">Sıfırla</button>
          <button onClick={downloadCSV} className="text-xs px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition">İndir</button>
        </div>
      </div>
      <div className="flex-grow relative">
        {priceHistory.data.length > 1 ? <Line ref={chartRef} options={lineChartOptions} data={data} /> : <div className="flex items-center justify-center h-full text-gray-500">Grafik için veri bekleniyor...</div>}
      </div>
    </div>
  );
});
LiveChart.displayName = 'LiveChart';

const Heatmap = memo(function Heatmap({ prices }: { prices: { [key: string]: Price } }) {
    const priceList = Object.values(prices).filter(p => p.change !== undefined && p.symbol.endsWith('/USD'));
    return (
        <div className="bg-gray-800/50 rounded-xl p-4 h-full backdrop-blur-sm border border-white/10">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Piyasa Isı Haritası (Anlık Değişim)</h3>
            <div className="grid grid-cols-4 grid-rows-3 gap-2 h-[calc(100%-2.5rem)]">
                {priceList.map(p => {
                    const change = p.change || 0;
                    let bgColor = 'bg-gray-700/50';
                    if (change > 0.1) bgColor = 'bg-emerald-500';
                    else if (change > 0) bgColor = 'bg-emerald-700';
                    else if (change < -0.1) bgColor = 'bg-red-500';
                    else if (change < 0) bgColor = 'bg-red-700';
                    return (
                        <div key={p.symbol} className={`p-2 rounded-lg text-center transition-all duration-300 flex flex-col justify-center ${bgColor}`}>
                            <p className="font-bold text-xs text-white">{p.symbol.replace('/USD', '')}</p>
                            <p className="font-mono text-[10px] mt-1 text-white">{change.toFixed(2)}%</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
Heatmap.displayName = 'Heatmap';

const LivePriceTable = memo(function LivePriceTable({ prices, onCoinSelect, selectedCoin }: { prices: { [key: string]: Price }, onCoinSelect: (symbol: string) => void, selectedCoin: string }) {
    const priceList = Object.values(prices).filter(p => p.symbol.endsWith('/USD')).sort((a, b) => b.price - a.price);
    return (
        <div className="bg-gray-800/50 rounded-xl p-4 h-full overflow-y-auto backdrop-blur-sm border border-white/10">
            <h3 className="text-lg font-semibold text-gray-200 mb-4 px-2">Dinamik Fiyat Listesi</h3>
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="border-b border-gray-700"><th className="p-2">Sembol</th><th className="p-2 text-right">Fiyat (USD)</th></tr>
                </thead>
                <tbody>
                    {priceList.map(p => (
                        <tr key={p.symbol} className={`border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50 cursor-pointer ${selectedCoin === p.symbol ? 'bg-sky-500/20' : ''}`} onClick={() => onCoinSelect(p.symbol)}>
                            <td className="p-2 font-mono">{p.symbol.replace('/USD', '')}</td>
                            <td className="p-2 text-right font-mono">${p.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});
LivePriceTable.displayName = 'LivePriceTable';

const AlertList = memo(function AlertList({ alerts }: { alerts: Alert[] }) {
    return (
    <div className="bg-gray-800/50 rounded-xl p-4 h-full flex flex-col backdrop-blur-sm border border-white/10">
        <h3 className="text-lg font-semibold text-gray-200 mb-4 flex-shrink-0">Anomali Bildirimleri</h3>
        <ul className="space-y-3 overflow-y-auto flex-grow pr-2">
            {alerts.length === 0 ? (
                <li className="text-center text-gray-500 py-8">Sistem dinlemede...</li>
            ) : (
                alerts.map(alert => (
                    <li key={alert.id} className="bg-gray-900/70 p-3 rounded-lg flex items-start animate-fade-in">
                        <div className="mt-1"><BellIcon /></div>
                        <div className="flex-1 ml-3">
                            <p className="font-bold text-white">{alert.SYMBOL || 'Bilinmeyen Sembol'}</p>
                            <div className="text-sm text-gray-400 mt-1 flex items-center">
                                <TrendingUpIcon />
                                <span className="ml-2">Fiyatta %<span className="font-mono text-amber-300">{(alert.PERCENTAGEINCREASE || 0).toFixed(2)}</span> artış</span>
                            </div>
                        </div>
                    </li>
                ))
            )}
        </ul>
    </div>
)});
AlertList.displayName = 'AlertList';

export default function Home() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [prices, setPrices] = useState<{ [key: string]: Price }>({});
    const [priceHistory, setPriceHistory] = useState<PriceHistory>({ labels: [], data: [] });
    const [selectedCoin, setSelectedCoin] = useState('BTC/USD');

    useEffect(() => {
        const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:8080/ws-alerts';
        const client = new Client({
            webSocketFactory: () => new SockJS(WEBSOCKET_URL),
            reconnectDelay: 5000,
            onConnect: () => {
                client.subscribe('/topic/alerts', (message) => {
                    const newAlert: Alert = JSON.parse(message.body);
                    setAlerts(prev => [{ ...newAlert, id: Date.now() }, ...prev].slice(0, 15));
                });
                client.subscribe('/topic/prices', (message) => {
                    const newPrice: Price = JSON.parse(message.body);
                    setPrices(prev => {
                        const existingPrice = prev[newPrice.symbol];
                        const change = existingPrice ? ((newPrice.price - existingPrice.price) / existingPrice.price) * 100 : 0;
                        return { ...prev, [newPrice.symbol]: { ...newPrice, change } };
                    });
                });
            },
        });

        client.activate();
        return () => { client.deactivate(); };
    }, []);

    useEffect(() => {
        const selectedPriceData = prices[selectedCoin];
        if (selectedPriceData) {
            setPriceHistory(prev => {
                const newLabels = [...prev.labels, new Date(selectedPriceData.timestamp).toLocaleTimeString()];
                const newData = [...prev.data, selectedPriceData.price];
                return {
                    labels: newLabels.length > 30 ? newLabels.slice(1) : newLabels,
                    data: newData.length > 30 ? newData.slice(1) : newData,
                };
            });
        }
    }, [prices, selectedCoin]);

    const handleCoinSelect = (symbol: string) => {
        setSelectedCoin(symbol);
        setPriceHistory({ labels: [], data: [] });
    };
    
    const latestPriceForChart = (prices[selectedCoin as keyof typeof prices] as any)?.price || 0;

    return (
        <main className="bg-gray-900 text-gray-200 min-h-screen font-sans p-4">
            <style>{`@keyframes fade-in { 0% { opacity: 0; transform: translateY(-10px); } 100% { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fade-in 0.5s ease-out; }`}</style>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-2rem)]">
                <div className="lg:col-span-3 grid grid-rows-5 gap-6">
                    <div className="row-span-3"><LiveChart priceHistory={priceHistory} coin={selectedCoin} latestPrice={latestPriceForChart} /></div>
                    <div className="row-span-2"><Heatmap prices={prices} /></div>
                </div>
                <div className="lg:col-span-1 grid grid-rows-2 gap-6">
                    <div className="row-span-1"><AlertList alerts={alerts} /></div>
                    <div className="row-span-1"><LivePriceTable prices={prices} onCoinSelect={handleCoinSelect} selectedCoin={selectedCoin} /></div>
                </div>
            </div>
        </main>
    );
}