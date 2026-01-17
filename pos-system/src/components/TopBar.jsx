// src/components/TopBar.jsx
import React from 'react';

const TopBar = ({ title, onBack, onLogout, customAction, user }) => {

    // Safety check in case user is null (though App.jsx prevents this)
    const userData = user || { name: 'Guest', role: 'Staff' };

    // Calculate Initials (e.g. "Jan Marte" -> "JM")
    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.split(' ');
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const initials = getInitials(userData.name);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#252525',
            padding: '10px 20px',
            borderRadius: '16px',
            marginBottom: '15px',
            border: '1px solid #333',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            width: '100%',
            boxSizing: 'border-box'
        }}>

            {/* LEFT SECTION: Back Button & Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {onBack && (
                    <button
                        onClick={onBack}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            background: 'transparent',
                            color: '#ccc',
                            border: '1px solid #666',
                            padding: '8px 20px',
                            borderRadius: '50px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            transition: 'all 0.2s',
                            fontSize: '0.9rem'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = '#007bff'; e.currentTarget.style.color = 'white'; e.currentTarget.style.background = '#007bff' }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = '#666'; e.currentTarget.style.color = '#ccc'; e.currentTarget.style.background = 'transparent' }}
                    >
                        <span>←</span> Back to POS
                    </button>
                )}
                <h2 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
                    {title}
                </h2>
            </div>

            {/* RIGHT SECTION: Custom Actions, User Badge & Logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>

                {/* Custom Button (Like Admin Dashboard) - Only renders if passed */}
                {customAction && <div>{customAction}</div>}

                {/* User Pill Badge */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: '#333', padding: '5px 15px 5px 5px',
                    borderRadius: '50px', border: '1px solid #444',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
                }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', fontSize: '0.8rem', color: 'white',
                        border: '1px solid #252525'
                    }}>
                        {initials}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.1', textAlign: 'left' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>{userData.name}</span>
                        <span style={{ fontSize: '0.65rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{userData.role}</span>
                    </div>
                </div>

                {/* Logout Pill */}
                <button
                    onClick={onLogout}
                    style={{
                        background: 'transparent',
                        border: '1px solid #666',
                        color: '#ccc',
                        padding: '8px 20px',
                        borderRadius: '50px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.target.style.borderColor = '#d9534f'; e.target.style.color = 'white'; e.target.style.background = '#d9534f' }}
                    onMouseOut={(e) => { e.target.style.borderColor = '#666'; e.target.style.color = '#ccc'; e.target.style.background = 'transparent' }}
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

export default TopBar;