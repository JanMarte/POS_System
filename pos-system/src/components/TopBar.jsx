// src/components/TopBar.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const TopBar = ({ title, onBack, onLogout, customAction, user }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // 🕒 1. Capture the start time object and the display string
    const [startTime] = useState(new Date());
    const [activeLabel, setActiveLabel] = useState('0m');

    // 🕒 2. Timer Effect: Updates every 30 seconds
    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const diffMs = now - startTime;
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins < 60) {
                setActiveLabel(`${diffMins}m`);
            } else {
                const hours = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                setActiveLabel(`${hours}h ${mins}m`);
            }
        };

        const interval = setInterval(updateTimer, 30000); // Update every 30s
        return () => clearInterval(interval);
    }, [startTime]);

    /**
     * 🔍 Initial State Logic
     */
    const [theme, setTheme] = useState(() => {
        const bodyAttr = document.documentElement.getAttribute('data-theme');
        if (bodyAttr) return bodyAttr;
        const saved = localStorage.getItem('pos-theme');
        if (saved) return saved;
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    });

    const userData = user || { name: 'Guest', role: 'Staff' };

    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.split(' ');
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const initials = getInitials(userData.name);

    const toggleTheme = async () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('pos-theme', newTheme);
        if (user) {
            try {
                await supabase.from('users').update({ theme: newTheme }).eq('id', user.id);
            } catch (err) {
                console.error("Failed to sync theme to DB", err);
            }
        }
    };

    useEffect(() => {
        if (user?.theme) {
            setTheme(user.theme);
            document.documentElement.setAttribute('data-theme', user.theme);
            localStorage.setItem('pos-theme', user.theme);
        }
    }, [user]);

    return (
        <div className="top-bar-container glass-panel">
            <div className="top-bar-section">
                {onBack && (
                    <button className="nav-back-btn" onClick={onBack}>
                        <span>❮</span> Back to POS
                    </button>
                )}
                <h2 className="top-bar-title">{title}</h2>
            </div>

            <div className="top-bar-section">
                {customAction && <div>{customAction}</div>}

                <div style={{ position: 'relative' }}>
                    <div className="user-pill" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        <div className="user-avatar">{initials}</div>
                        <div className="user-info-group">
                            <span className="user-name">{userData.name}</span>
                            <span className="user-role">{userData.role}</span>
                            {/* 🕒 3. Display the Live Timer */}
                            <span className="user-session-time">ACTIVE: {activeLabel}</span>
                        </div>
                        <span className={`dropdown-arrow ${isMenuOpen ? 'rotated' : ''}`}>▼</span>
                    </div>

                    <div className={`user-menu-dropdown ${isMenuOpen ? 'open' : ''}`}>
                        <div className="menu-item" onClick={toggleTheme}>
                            <span>{theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
                            <div className={`theme-toggle ${theme === 'light' ? 'light' : ''}`}>
                                <div className="toggle-knob"></div>
                            </div>
                        </div>
                        <div className="menu-divider"></div>
                        <div className="menu-item menu-item-danger" onClick={onLogout}>
                            <span>Log Out</span>
                            <span>➔</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopBar;