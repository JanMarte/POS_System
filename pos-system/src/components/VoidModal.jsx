// src/components/VoidModal.jsx
import React, { useState } from 'react';

const VoidModal = ({ isOpen, onClose, onConfirm, onValidatePin, item }) => {
    const [step, setStep] = useState('reason');
    const [reason, setReason] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [isShaking, setIsShaking] = useState(false);

    if (!isOpen || !item) return null;

    const reasons = [
        { id: 'entry_error', label: 'Entry Error', icon: '↩️', styleClass: 'reason-error' },
        { id: 'waste', label: 'Spill / Waste', icon: '🗑️', styleClass: 'reason-waste', requiresManager: true },
        { id: 'manager_void', label: 'Manager Void', icon: '🛡️', styleClass: 'reason-manager', requiresManager: true },
    ];

    const handleReasonSelect = (selectedReason) => {
        setReason(selectedReason.id);
        if (selectedReason.requiresManager) {
            setStep('pin');
            setError('');
            setPin('');
            setIsShaking(false);
        } else {
            onConfirm(item.uniqueId, selectedReason.id);
            resetAndClose();
        }
    };

    const handlePinSubmit = async (e) => {
        if (e) e.preventDefault();
        if (isValidating) return;
        setIsValidating(true);
        setError('');
        setIsShaking(false);

        const isValid = await onValidatePin(pin);

        if (isValid) {
            onConfirm(item.uniqueId, reason);
            resetAndClose();
        } else {
            setError('Invalid Manager PIN');
            setIsShaking(true);
            setPin('');
            setTimeout(() => setIsShaking(false), 400);
        }
        setIsValidating(false);
    };

    const resetAndClose = () => {
        setStep('reason');
        setReason('');
        setPin('');
        setError('');
        setIsValidating(false);
        setIsShaking(false);
        onClose();
    };

    // Logic to go back from PIN screen to Reason screen
    const handleBack = () => {
        if (step === 'pin') {
            setStep('reason');
            setError('');
        } else {
            resetAndClose();
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content modal-width-sm">

                {/* 💎 New Grid Header */}
                <div className="modal-header-grid">
                    <button onClick={handleBack} className="modal-back-btn">❮</button>
                    <h2 className="text-danger">Void Item</h2>
                    <div></div> {/* Spacer to keep title centered */}
                </div>

                <div className="text-center mb-20">
                    <div className="void-item-name">{item.name}</div>
                    <div className="text-muted text-sm">${item.price.toFixed(2)}</div>
                </div>

                {step === 'reason' && (
                    <div className="void-grid">
                        {reasons.map((r) => (
                            <button
                                key={r.id}
                                onClick={() => handleReasonSelect(r)}
                                className={`btn-void-reason ${r.styleClass}`}
                            >
                                <span>{r.icon} {r.label}</span>
                                {r.requiresManager && <span className="badge badge-manager">PIN</span>}
                            </button>
                        ))}
                    </div>
                )}

                {step === 'pin' && (
                    <form className="pin-section" onSubmit={handlePinSubmit}>
                        <h4 className="text-gold mt-auto mb-10">Manager Authorization</h4>
                        <p className="text-muted text-sm mb-15">Please enter manager PIN to confirm waste/void.</p>

                        <input
                            type="password"
                            className={`input-glass w-100 text-center text-lg mb-15 ${isShaking ? 'input-shake' : ''}`}
                            placeholder="PIN"
                            maxLength="4"
                            autoFocus
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            disabled={isValidating}
                            autoComplete="one-time-code"
                        />

                        {error && <div className="text-danger font-bold mb-10">{error}</div>}

                        <button
                            type="submit"
                            className="btn-glass btn-pay w-100"
                            disabled={isValidating}
                        >
                            {isValidating ? 'Verifying...' : 'Authorize'}
                        </button>
                    </form>
                )}

                {/* Removed the bottom Cancel button entirely */}
            </div>
        </div>
    );
};

export default VoidModal;