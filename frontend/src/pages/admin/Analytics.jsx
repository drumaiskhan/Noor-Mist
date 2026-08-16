import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '../../services/api';
import {
  HiCurrencyDollar,
  HiShoppingBag,
  HiUsers,
  HiTrendingUp
} from 'react-icons/hi';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { formatPrice } from '../../utils/helpers';

export default function Analytics() {

  const [period, setPeriod] = useState('weekly');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', period],
    queryFn: async () => {

      const res = await analyticsAPI.getSales({
        period
      });

      return res.data;
    }
  });

  // Total customer count isn't period-scoped, so it comes from the
  // dashboard summary instead of being hardcoded to 0 like it was before.
  const { data: dashboardData } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: async () => {
      const res = await analyticsAPI.getDashboard();
      return res.data;
    },
    staleTime: 60 * 1000,
  });


  const salesData = data?.data || [];


  const stats = {
    revenue: salesData.reduce(
      (total, item) => total + Number(item.revenue || 0),
      0
    ),

    orders: salesData.reduce(
      (total, item) => total + Number(item.orders || 0),
      0
    ),

    customers: dashboardData?.customers ?? 0,

    conversionRate: 0
  };


  const topProducts = data?.topProducts || [];


  return (

    <div className="space-y-8">


      {/* Header */}

      <div>
        <h1 className="text-3xl font-playfair font-bold mb-1">
          Analytics
        </h1>

        <p className="text-gray-400 text-sm">
          Track your store performance
        </p>
      </div>



      {/* Period Selector */}

      <div className="flex gap-2">

        {[
          {
            key:'weekly',
            label:'Week'
          },
          {
            key:'monthly',
            label:'Month'
          },
          {
            key:'yearly',
            label:'Year'
          }

        ].map(item => (

          <button

            key={item.key}

            onClick={() =>
              setPeriod(item.key)
            }

            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              period === item.key
              ?
              'bg-gold/10 text-gold border border-gold/30'
              :
              'text-gray-400 border border-gray-700'
            }`}

          >

            {item.label}

          </button>

        ))}

      </div>





      {/* Stats Cards */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">


        <StatCard
          title="Revenue"
          value={formatPrice(stats.revenue)}
          icon={HiCurrencyDollar}
        />


        <StatCard
          title="Orders"
          value={stats.orders}
          icon={HiShoppingBag}
        />


        <StatCard
          title="Customers"
          value={stats.customers}
          icon={HiUsers}
        />


        <StatCard
          title="Conversion"
          value={stats.conversionRate ? `${stats.conversionRate}%` : '—'}
          icon={HiTrendingUp}
        />


      </div>





      {/* Sales Chart */}

      <div className="luxury-card p-6">

        <h3 className="text-lg font-playfair font-bold mb-6">
          Sales Overview
        </h3>


        {
          isLoading ?

          <div className="h-[350px] flex items-center justify-center text-gray-400">
            Loading analytics...
          </div>


          :

          salesData.length === 0 ?

          <div className="h-[350px] flex items-center justify-center text-gray-400">
            No sales data available
          </div>


          :


          <ResponsiveContainer width="100%" height={350}>

            <LineChart data={salesData}>


              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#2A2A2A"
              />


              <XAxis
                dataKey="period"
                stroke="#6B7280"
                fontSize={12}
              />


              <YAxis
                stroke="#6B7280"
                fontSize={12}
              />


              <Tooltip
                contentStyle={{
                  background:'#1A1A1A',
                  border:'1px solid #D4AF37',
                  borderRadius:'8px'
                }}
              />


              <Line

                type="monotone"

                dataKey="revenue"

                stroke="#D4AF37"

                strokeWidth={3}

                dot

              />


            </LineChart>

          </ResponsiveContainer>

        }


      </div>






      {/* Top Products */}

      <div className="luxury-card p-6">


        <h3 className="text-lg font-playfair font-bold mb-6">
          Top Products
        </h3>



        {
          topProducts.length === 0 ?

          <p className="text-gray-400 text-sm">
            No product sales yet
          </p>


          :


          <table className="w-full">

            <thead>

              <tr className="border-b border-gray-800">

                <th className="text-left p-3 text-xs text-gray-400">
                  Product
                </th>

                <th className="text-left p-3 text-xs text-gray-400">
                  Sales
                </th>

                <th className="text-left p-3 text-xs text-gray-400">
                  Revenue
                </th>

              </tr>

            </thead>


            <tbody>

            {
              topProducts.map((product,index)=>(

                <tr
                  key={index}
                  className="border-b border-gray-800/50"
                >

                  <td className="p-3 text-white">
                    {product.name}
                  </td>


                  <td className="p-3 text-gray-400">
                    {product.sold}
                  </td>


                  <td className="p-3 text-gold">
                    {formatPrice(product.revenue)}
                  </td>


                </tr>

              ))
            }


            </tbody>


          </table>

        }


      </div>



    </div>

  );

}




function StatCard({
  title,
  value,
  icon:Icon
}) {


return (

<div className="luxury-card p-5">


<div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center mb-3">

<Icon className="w-5 h-5 text-gold"/>

</div>


<p className="text-gray-400 text-xs">
{title}
</p>


<p className="text-xl font-bold text-white">
{value}
</p>


</div>

);


}
