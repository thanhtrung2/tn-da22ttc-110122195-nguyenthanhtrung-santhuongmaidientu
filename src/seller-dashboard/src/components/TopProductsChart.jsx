import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { name: 'Áo thun', sales: 400, revenue: 24 },
  { name: 'Quần Jean', sales: 300, revenue: 30 },
  { name: 'Giày Sneaker', sales: 200, revenue: 50 },
  { name: 'Túi xách', sales: 150, revenue: 45 },
  { name: 'Đồng hồ', sales: 100, revenue: 80 },
];

export default function TopProductsChart() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Top sản phẩm bán chạy</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Theo số lượng & doanh thu</p>
      
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-700" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#4B5563', fontSize: 12, fontWeight: 500 }} 
              width={80}
            />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
            <Bar dataKey="sales" name="Số lượng bán" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={12} />
            <Bar dataKey="revenue" name="Doanh thu (Triệu VNĐ)" fill="#10B981" radius={[0, 4, 4, 0]} barSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
