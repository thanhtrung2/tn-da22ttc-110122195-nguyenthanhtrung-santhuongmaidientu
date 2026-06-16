import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { name: 'T2', revenue: 12.5, orders: 120 },
  { name: 'T3', revenue: 15.2, orders: 150 },
  { name: 'T4', revenue: 14.8, orders: 140 },
  { name: 'T5', revenue: 18.5, orders: 180 },
  { name: 'T6', revenue: 22.1, orders: 220 },
  { name: 'T7', revenue: 25.8, orders: 250 },
  { name: 'CN', revenue: 28.5, orders: 280 },
];

export default function RevenueChart() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 col-span-1 lg:col-span-2">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Doanh thu & Đơn hàng</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Thống kê trong 7 ngày qua</p>
        </div>
        <select className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2">
          <option>Hôm nay</option>
          <option selected>7 ngày qua</option>
          <option>30 ngày qua</option>
          <option>3 tháng qua</option>
          <option>1 năm qua</option>
        </select>
      </div>
      
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-700" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6B7280', fontSize: 12 }} 
              dy={10}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              dx={-10}
              tickFormatter={(value) => `${value}tr`}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              dx={10}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              itemStyle={{ color: '#1F2937', fontWeight: 500 }}
              labelStyle={{ color: '#6B7280', marginBottom: '4px' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="revenue" 
              name="Doanh thu (Triệu VNĐ)" 
              stroke="#3B82F6" 
              strokeWidth={3} 
              activeDot={{ r: 8, strokeWidth: 0, fill: '#3B82F6' }} 
              dot={{ r: 0 }}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="orders" 
              name="Số đơn hàng" 
              stroke="#10B981" 
              strokeWidth={3}
              activeDot={{ r: 8, strokeWidth: 0, fill: '#10B981' }} 
              dot={{ r: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
