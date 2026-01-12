// src/components/Notification.jsx
import React, { useEffect } from 'react';

const Notification = ({ message, type, onClose }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [message, onClose]);

    if (!message) return null;

    // Colors: Neon Green for success, Bright Red for error
    const isError = type === 'error';
    const accentColor = isError ? '#ff4d4f' : '#00e676';

    const styles = {
        position: 'fixed',
        top: '30px',
        left: '50%',
        transform: 'translateX(-50%)', // Centers it horizontally
        zIndex: 3000,

        // The "Sleek Dark" Look
        backgroundColor: '#1e1e1e', // Matte black/grey
        color: '#e0e0e0', // Soft white text

        // Shape & Borders
        minWidth: '320px',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid #333', // Subtle border to separate from background
        borderLeft: `6px solid ${accentColor}`, // The "Pop" of color

        // Depth (Shadow makes it "pop" off the screen)
        boxShadow: '0 8px 30px rgba(0,0,0,0.7)',

        // Layout
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        fontSize: '1rem',
        fontWeight: '500',
        fontFamily: 'sans-serif',

        // Animation trigger
        animation: 'slideIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
    };

    const iconStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        // Subtle glow behind the icon
        backgroundColor: isError ? 'rgba(255, 77, 79, 0.15)' : 'rgba(0, 230, 118, 0.15)',
        color: accentColor,
        fontSize: '14px',
        fontWeight: 'bold'
    };

    return (
        <>
            {/* Internal Style for the Animation */}
            <style>
                {`
          @keyframes slideIn {
            from { opacity: 0; transform: translate(-50%, -20px); }
            to { opacity: 1; transform: translate(-50%, 0); }
          }
        `}
            </style>

            <div style={styles}>
                {/* Circular Icon with Glow */}
                <div style={iconStyle}>
                    {isError ? '✕' : '✓'}
                </div>

                {/* Message Text */}
                <span>{message}</span>
            </div>
        </>
    );
};

export default Notification;