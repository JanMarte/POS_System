// src/components/SalesChart.jsx
import React from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const SalesChart = ({ salesData }) => {
    const COOL_COLORS = ['#3F51B5', '#00BCD4', '#673AB7', '#2196F3', '#009688', '#9C27B0'];

    // Helper to shorten long names so they don't break the graph
    const formatName = (name) => {
        if (!name) return '';
        return name.length > 18 ? name.substring(0, 18) + '...' : name;
    };

    const processData = () => {
        if (!salesData || salesData.length === 0) return [];

        const allItems = salesData.flatMap(sale => sale.items || []);
        const counts = {};
        allItems.forEach(item => {
            const qty = item.quantity || 1;
            // Ensure name exists to prevent graph glitches
            const safeName = item.name || 'Unknown';
            counts[safeName] = (counts[safeName] || 0) + qty;
        });

        return Object.keys(counts)
            .map(name => ({ name: name, count: counts[name] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    };

    const data = processData();

    if (data.length === 0) {
        return (
            <div style={{ height: '150px', width: '100%', padding: '20px', background: '#222', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', border: '1px solid #444' }}>
                No sales data to chart yet.
            </div>
        );
    }

    return (
        <div style={{
            height: '320px',
            width: '100%',
            background: '#222',
            borderRadius: '8px',
            border: '1px solid #444',
            padding: '20px',
            boxSizing: 'border-box'
        }}>
            <h3 style={{ textAlign: 'center', color: '#aaa', margin: '0 0 15px 0', fontSize: '1rem' }}>Top 10 Bestsellers</h3>

            <ResponsiveContainer width="100%" height="300" minWidth={300}>
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />

                    <XAxis type="number" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />

                    <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#e0e0e0"
                        width={150} /* 👈 Increased width to fit longer names */
                        tick={{ fontSize: 12, fill: '#ccc' }}
                        tickLine={false}
                        axisLine={false}
                        interval={0} /* 👈 Forces ALL labels to show */
                        tickFormatter={formatName} /* 👈 Truncates super long names */
                    />

                    <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #555', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        labelStyle={{ color: '#bbb' }}
                    />

                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COOL_COLORS[index % COOL_COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SalesChart;