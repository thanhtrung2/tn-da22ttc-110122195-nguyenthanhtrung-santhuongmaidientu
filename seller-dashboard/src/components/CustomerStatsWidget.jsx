import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Users, UserPlus } from 'lucide-react';

const data = [
  { name: 'Khách hàng mới', value: 35 },
  { name: 'Khách quay lại', value: 65 },
];

const COLORS = ['#F59E0B', '#3B82F6'];

export default function CustomerStatsWidget() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Thống kê khách hàng</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Tỷ lệ khách hàng mua sắm</p>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Khách quay lại</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">65%</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Khách mới</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">35%</p>
          </div>
        </div>
      </div>

      <div className="h-48 w-full mt-4 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={5}
              dataKey="value"
              startAngle={180}
              endAngle={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              itemStyle={{ color: '#1F2937', fontWeight: 500 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center flex-col mt-10">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">1,500</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Tổng khách</span>
        </div>
      </div>
    </div>
  );
}
