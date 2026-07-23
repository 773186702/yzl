import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TaskDistributionChartProps {
  completed: number;
  pending: number;
  cancelled?: number;
}

const COLORS = ['#00AEEF', '#0F2B48', '#F43F5E'];

const TaskDistributionChart: React.FC<TaskDistributionChartProps> = ({ completed, pending, cancelled = 0 }) => {
  const data = [
    { name: 'مكتملة', value: completed },
    { name: 'قيد التنفيذ', value: pending },
    ...(cancelled > 0 ? [{ name: 'ملغية', value: cancelled }] : [])
  ];

  return (
    <div className="bg-white dark:bg-yazal-navy-light p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm">
      <h3 className="text-sm font-black text-yazal-navy dark:text-white uppercase tracking-widest mb-6 text-center">
        توزيع حالة المهام (الشهر الحالي)
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
              itemStyle={{ fontWeight: 900, color: '#0F2B48' }}
            />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 700 }}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TaskDistributionChart;
