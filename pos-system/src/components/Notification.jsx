// src/components/Notification.jsx
import React, { useEffect } from 'react';

/**
 * Notification Component (Toast)
 * * Displays a temporary message at the top center of the screen.
 * Automatically dismisses itself after 3 seconds.
 * * styling: Relies on 'notification-toast' and theme variables in index.css.
 * * @param {string} message - The text to display. If empty, component returns null.
 * @param {string} type - 'success' or 'error'. Determines the border color and icon.
 * @param {Function} onClose - Callback function to clear the message from parent state.
 */
const Notification = ({ message, type, onClose }) => {

    // Timer Effect: Auto-close after 3 seconds
    useEffect(() => {
        if (message) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [message, onClose]);

    // Don't render anything if there is no message
    if (!message) return null;

    // Determine specific class based on type ('success' is default)
    const isError = type === 'error';
    const statusClass = isError ? 'notification-error' : 'notification-success';
    const iconSymbol = isError ? '✕' : '✓';

    return (
        <div className={`notification-toast ${statusClass}`}>

            {/* Icon Circle */}
            <div className="notification-icon">
                {iconSymbol}
            </div>

            {/* Message Text */}
            <span>{message}</span>
        </div>
    );
};

export default Notification;