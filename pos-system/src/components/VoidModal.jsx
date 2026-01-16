import React from 'react';

const VoidModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        // Reusing your existing 'modal-overlay' class for the dark background
        <div className="modal-overlay">

            {/* Reusing 'modal-content' for the white box, with specific width/color */}
            <div className="modal-content" style={{ width: '400px', color: '#333', textAlign: 'left' }}>
                <h3 style={{ marginTop: 0, fontSize: '1.5rem' }}>Void Item</h3>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                    Select a reason for removing this item. This affects inventory.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                    {/* OPTION 1: ENTRY ERROR */}
                    <button
                        onClick={() => onConfirm('entry_error')}
                        style={{
                            padding: '15px',
                            background: '#e3f2fd', // Light Blue
                            border: '1px solid #90caf9',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            color: '#0d47a1'
                        }}
                    >
                        <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>🚫 Did Not Make (Entry Error)</div>
                        <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Item goes back into inventory count.</div>
                    </button>

                    {/* OPTION 2: WASTE */}
                    <button
                        onClick={() => onConfirm('waste')}
                        style={{
                            padding: '15px',
                            background: '#ffebee', // Light Red
                            border: '1px solid #ef9a9a',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            color: '#b71c1c'
                        }}
                    >
                        <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>🗑️ Wasted / Spilled</div>
                        <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Item is lost. Inventory count stays down.</div>
                    </button>
                </div>

                <button
                    onClick={onClose}
                    style={{
                        marginTop: '20px',
                        width: '100%',
                        padding: '10px',
                        background: 'transparent',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default VoidModal;