import React from 'react';
import { DollarSign, ShoppingBag, Package, Users, RefreshCcw, TrendingUp } from 'lucide-react';

const kpis = [
  {
    title: 'Tổng doanh thu',
    value: '₫125.500.000',
    trend: '+15.2%',
    isPositive: true,
    icon: DollarSign,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  {
    title: 'Tổng đơn hàng',
    value: '1,245',
    trend: '+8.5%',
    isPositive: true,
    icon: ShoppingBag,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30'
  },
  {
    title: 'Sản phẩm đã bán',
    value: '3,820',
    trend: '+12.3%',
    isPositive: true,
    icon: Package,
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30'
  },
  {
    title: 'Khách hàng mới',
    value: '420',
    trend: '+5.7%',
    isPositive: true,
    icon: Users,
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30'
  },
  {
    title: 'Tỷ lệ hoàn hàng',
    value: '2.4%',
    trend: '-0.5%',
    isPositive: true, // A decrease in returns is positive
    icon: RefreshCcw,
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30'
  },
  {
    title: 'Lợi nhuận ước tính',
    value: '₫45.200.000',
    trend: '+18.1%',
    isPositive: true,
    icon: TrendingUp,
    color: 'text-teal-500',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30'
  }
];

export default function KPICards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <div 
            key={index} 
            className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-300"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <Icon className={`w-6 h-6 ${kpi.color}`} />
              </div>
              <div className={`text-sm font-medium px-2 py-1 rounded-full ${
                kpi.isPositive 
                  ? 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' 
                  : 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                {kpi.trend}
              </div>
            </div>
            <div>
              <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{kpi.title}</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
