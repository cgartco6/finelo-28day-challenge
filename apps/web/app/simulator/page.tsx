'use client';

import { useState, useEffect } from 'react';
import { SimulatorWidget } from '../../components/SimulatorWidget';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SimulatorPage() {
  const [portfolio, setPortfolio] = useState(null);
  const [assets, setAssets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState('AAPL');
  const [quantity, setQuantity] = useState(1);
  const userId = 'demo-user-123';
  const [portfolioHistory, setPortfolioHistory] = useState([]);

  useEffect(() => {
    fetchPortfolio();
    fetchAssets();
    fetchOrders();
  }, []);

  const fetchPortfolio = async () => {
    const res = await fetch(`/api/simulator/portfolio/${userId}`);
    const data = await res.json();
    setPortfolio(data);
    
    // Add to history
    setPortfolioHistory(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      value: data.totalValue
    }].slice(-20));
  };

  const fetchAssets = async () => {
    const res = await fetch('/api/simulator/assets');
    const data = await res.json();
    setAssets(data);
  };

  const fetchOrders = async () => {
    const res = await fetch(`/api/simulator/orders/${userId}`);
    const data = await res.json();
    setOrders(data);
  };

  const executeTrade = async (type: 'buy' | 'sell') => {
    const asset = assets.find(a => a.symbol === selectedAsset);
    if (!asset) return;

    try {
      const res = await fetch('/api/simulator/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          assetSymbol: selectedAsset,
          type,
          quantity,
          price: asset.currentPrice
        })
      });
      
      if (res.ok) {
        await fetchPortfolio();
        await fetchOrders();
        setQuantity(1);
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      alert('Trade failed: ' + error);
    }
  };

  const resetPortfolio = async () => {
    if (confirm('Reset your entire portfolio? This cannot be undone.')) {
      await fetch(`/api/simulator/reset/${userId}`, { method: 'POST' });
      await fetchPortfolio();
      await fetchOrders();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Trading Simulator</h1>
      
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Portfolio Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Portfolio Value</h2>
            <div className="text-3xl font-bold text-green-600">
              ${portfolio?.totalValue?.toFixed(2) || '0.00'}
            </div>
            <div className={`text-sm ${portfolio?.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              P/L: ${portfolio?.totalProfitLoss?.toFixed(2) || '0.00'} 
              ({portfolio?.totalProfitLossPercent?.toFixed(2)}%)
            </div>
            <div className="text-sm text-gray-600">
              Cash Balance: ${portfolio?.cashBalance?.toFixed(2) || '0.00'}
            </div>
          </div>
          
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Positions</h2>
            {portfolio?.positions && Array.from(portfolio.positions.values()).length > 0 ? (
              <div className="space-y-3">
                {Array.from(portfolio.positions.values()).map((pos: any) => (
                  <div key={pos.assetSymbol} className="border-b pb-2">
                    <div className="font-semibold">{pos.assetSymbol}</div>
                    <div className="text-sm">Quantity: {pos.quantity}</div>
                    <div className="text-sm">Avg Price: ${pos.averagePrice.toFixed(2)}</div>
                    <div className={`text-sm font-semibold ${pos.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      P/L: ${pos.profitLoss.toFixed(2)} ({pos.profitLossPercent.toFixed(2)}%)
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No open positions</p>
            )}
          </div>
          
          <button onClick={resetPortfolio} className="btn-danger w-full">
            Reset Portfolio
          </button>
        </div>
        
        {/* Trading Interface */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Place Order</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Asset</label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="input"
                >
                  {assets.map(asset => (
                    <option key={asset.symbol} value={asset.symbol}>
                      {asset.name} (${asset.currentPrice})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                  className="input"
                  min="1"
                />
              </div>
              
              <div className="flex gap-4">
                <button onClick={() => executeTrade('buy')} className="btn-primary flex-1">
                  Buy
                </button>
                <button onClick={() => executeTrade('sell')} className="btn-danger flex-1">
                  Sell
                </button>
              </div>
            </div>
          </div>
          
          {/* Portfolio History Chart */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Portfolio History</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={portfolioHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Order History */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Order History</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {orders.length > 0 ? (
                orders.map(order => (
                  <div key={order.id} className="border-b pb-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">{order.type.toUpperCase()}</span>
                      <span className={order.status === 'executed' ? 'text-green-600' : 'text-yellow-600'}>
                        {order.status}
                      </span>
                    </div>
                    <div className="text-sm">
                      {order.quantity} {order.assetSymbol} @ ${order.price.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(order.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No orders yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <SimulatorWidget userId={userId} compact />
    </div>
  );
}
