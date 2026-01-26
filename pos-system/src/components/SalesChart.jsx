// src/components/SalesChart.jsx
import React from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

/**
 * SalesChart Component
 * * Visualizes the top 10 selling items using a horizontal bar chart.
 * * Features:
 * - Processes raw sales data to aggregate quantities by item name.
 * - Sorts items to show bestsellers at the top.
 * - Uses CSS variables for styling.
 * * @param {Array} salesData - Array of completed sale objects from the database.
 */
const SalesChart = ({ salesData }) => {

    // Chart Bar Colors (Cycling palette)
    const COOL_COLORS = ['#3F51B5', '#00BCD4', '#673AB7', '#2196F3', '#009688', '#9C27B0'];

    const formatName = (name) => {
        if (!name) return '';
        return name.length > 15 ? name.substring(0, 15) + '...' : name;
    };

    const processData = () => {
        if (!salesData || salesData.length === 0) return [];

        const allItems = salesData.flatMap(sale => sale.items || []);
        const counts = {};

        allItems.forEach(item => {
            const qty = item.quantity || 1;
            const safeName = item.name || 'Unknown';
            counts[safeName] = (counts[safeName] || 0) + qty;
        });

        return Object.keys(counts)
            .map(name => ({ name: name, count: counts[name] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    };

    const data = processData();

    // --- Custom Tooltip Component ---
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="chart-tooltip">
                    <p className="tooltip-label">{label}</p>
                    <p className="tooltip-value">Sold: {payload[0].value}</p>
                </div>
            );
        }
        return null;
    };

    // --- Render: Empty State ---
    if (data.length === 0) {
        return (
            <div className="chart-empty">
                No sales data to chart yet.
            </div>
        );
    }

    // --- Render: Chart ---
    return (
        <div className="chart-card">
            <h3 className="chart-title">Top 10 Bestsellers</h3>

            {/* FIX: We wrap ResponsiveContainer in a div with explicit dimensions.
                We also set a fixed numeric height on ResponsiveContainer (300).
                This prevents the "width(-1)" error during CSS animations.
            */}
            <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" horizontal={false} />

                        <XAxis
                            type="number"
                            stroke="var(--text-muted)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />

                        <YAxis
                            type="category"
                            dataKey="name"
                            stroke="var(--text-color)"
                            width={120}
                            tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            tickFormatter={formatName}
                        />

                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--hover-bg)' }} />

                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COOL_COLORS[index % COOL_COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SalesChart;