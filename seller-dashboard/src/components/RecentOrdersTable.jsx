import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

const initialOrders = [
  { id: 'ORD-001', customer: 'Nguyễn Văn A', value: '₫1.250.000', status: 'Đang giao', date: '2026-06-13 10:30' },
  { id: 'ORD-002', customer: 'Trần Thị B', value: '₫450.000', status: 'Hoàn thành', date: '2026-06-13 09:15' },
  { id: 'ORD-003', customer: 'Lê Hoàng C', value: '₫2.100.000', status: 'Chờ xác nhận', date: '2026-06-13 08:45' },
  { id: 'ORD-004', customer: 'Phạm Minh D', value: '₫150.000', status: 'Hủy', date: '2026-06-12 21:20' },
  { id: 'ORD-005', customer: 'Hoàng Tú E', value: '₫890.000', status: 'Hoàn thành', date: '2026-06-12 18:05' },
  { id: 'ORD-006', customer: 'Đặng Thùy F', value: '₫1.500.000', status: 'Đang giao', date: '2026-06-12 15:30' },
  { id: 'ORD-007', customer: 'Bùi Anh G', value: '₫320.000', status: 'Chờ xác nhận', date: '2026-06-12 14:10' },
  { id: 'ORD-008', customer: 'Vũ Đức H', value: '₫750.000', status: 'Hoàn thành', date: '2026-06-11 11:25' },
];

const statusStyles = {
  'Chờ xác nhận': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500',
  'Đang giao': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Hoàn thành': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Hủy': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function RecentOrdersTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(initialOrders.length / itemsPerPage);

  const paginatedOrders = initialOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 col-span-1 lg:col-span-2 overflow-hidden">
      <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Đơn hàng mới nhất</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Danh sách các đơn hàng gần đây</p>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input 
            type="text" 
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white" 
            placeholder="Tìm mã đơn hàng..." 
          />
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-300">
            <tr>
              <th className="px-6 py-4 font-medium">Mã đơn</th>
              <th className="px-6 py-4 font-medium">Khách hàng</th>
              <th className="px-6 py-4 font-medium">Giá trị</th>
              <th className="px-6 py-4 font-medium">Trạng thái</th>
              <th className="px-6 py-4 font-medium">Thời gian</th>
              <th className="px-6 py-4 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order) => (
              <tr key={order.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{order.id}</td>
                <td className="px-6 py-4">{order.customer}</td>
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-300">{order.value}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-400">{order.date}</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors p-1">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Hiển thị <span className="font-medium text-gray-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> đến <span className="font-medium text-gray-900 dark:text-white">{Math.min(currentPage * itemsPerPage, initialOrders.length)}</span> trong <span className="font-medium text-gray-900 dark:text-white">{initialOrders.length}</span> đơn hàng
        </span>
        <div className="flex gap-1">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                currentPage === i + 1 
                  ? 'bg-blue-500 text-white border border-blue-500' 
                  : 'border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
