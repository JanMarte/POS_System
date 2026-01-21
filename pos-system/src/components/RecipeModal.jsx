// src/components/RecipeModal.jsx
import React, { useState, useEffect } from 'react';

const RecipeModal = ({ isOpen, onClose, initialSearch }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [selectedDrink, setSelectedDrink] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [view, setView] = useState('search'); // 'search' | 'list' | 'detail'

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setSearchTerm(initialSearch || '');
            setResults([]);
            setSelectedDrink(null);
            setError('');
            if (initialSearch) {
                handleSearch(initialSearch);
            } else {
                setView('search');
            }
        }
    }, [isOpen, initialSearch]);

    const handleSearch = async (term) => {
        if (!term) return;
        setLoading(true);
        setError('');
        setResults([]);
        setSelectedDrink(null);

        try {
            // Search by Name
            const res = await fetch(`https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${term}`);
            const data = await res.json();

            if (data.drinks && data.drinks.length > 0) {
                setResults(data.drinks);
                setView('list');
            } else {
                // Fallback: Search by Ingredient
                const filterRes = await fetch(`https://www.thecocktaildb.com/api/json/v1/1/filter.php?i=${term}`);
                const filterData = await filterRes.json();

                if (filterData.drinks && filterData.drinks.length > 0) {
                    setResults(filterData.drinks);
                    setView('list');
                } else {
                    setError('No drinks found. Try a different name or ingredient.');
                }
            }
        } catch (err) {
            setError('Network error. Please check internet connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        handleSearch(searchTerm);
    };

    const fetchDetails = async (id) => {
        setLoading(true);
        try {
            const res = await fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${id}`);
            const data = await res.json();
            if (data.drinks && data.drinks.length > 0) {
                setSelectedDrink(data.drinks[0]);
                setView('detail');
            }
        } catch (e) {
            setError("Could not load details.");
        } finally {
            setLoading(false);
        }
    }

    const getIngredients = (drink) => {
        if (!drink) return [];
        let ingredients = [];
        for (let i = 1; i <= 15; i++) {
            const ing = drink[`strIngredient${i}`];
            const measure = drink[`strMeasure${i}`];
            if (ing) {
                ingredients.push(`${measure ? measure : ''} ${ing}`);
            }
        }
        return ingredients;
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ width: '600px', height: '80vh', display: 'flex', flexDirection: 'column', padding: '20px' }}>

                {/* HEADER & SEARCH BAR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0 }}>🍹 Recipe Database</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#aaa', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
                </div>

                <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-dark"
                        autoFocus
                        style={{ flex: 1, padding: '12px' }}
                        placeholder="Search (e.g., 'Margarita' or 'Gin')"
                    />
                    <button type="submit" className="btn-primary" style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', padding: '0 20px', cursor: 'pointer', fontWeight: 'bold' }}>SEARCH</button>
                </form>

                {loading && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p className="animated-dots" style={{ fontSize: '1.5rem' }}>Mixing</p></div>}

                {!loading && error && <div style={{ padding: '15px', background: '#333', color: '#ffc107', borderRadius: '8px', textAlign: 'center' }}>{error}</div>}

                {/* VIEW 1: RESULTS LIST */}
                {!loading && !error && view === 'list' && (
                    <>
                        {/* 🆕 RESULT COUNT INDICATOR */}
                        <div style={{ marginBottom: '10px', color: '#888', fontStyle: 'italic', fontSize: '0.9rem', textAlign: 'right' }}>
                            Found {results.length} result{results.length !== 1 ? 's' : ''}
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '15px', alignContent: 'start' }}>
                            {results.map(drink => (
                                <div
                                    key={drink.idDrink}
                                    onClick={() => fetchDetails(drink.idDrink)}
                                    style={{
                                        background: '#2a2a2a',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        border: '1px solid #444',
                                        textAlign: 'center',
                                        transition: 'transform 0.1s',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <img
                                        src={drink.strDrinkThumb}
                                        alt={drink.strDrink}
                                        style={{ width: '100%', height: '110px', objectFit: 'cover' }}
                                    />
                                    <div style={{
                                        padding: '10px 5px',
                                        fontSize: '0.95rem',
                                        fontWeight: 'bold',
                                        color: '#fff',
                                        background: '#1f1f1f',
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        lineHeight: '1.2'
                                    }}>
                                        {drink.strDrink}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* VIEW 2: RECIPE DETAILS */}
                {!loading && !error && view === 'detail' && selectedDrink && (
                    <div style={{ flex: 1, overflowY: 'auto', textAlign: 'left', paddingRight: '5px' }}>
                        <button onClick={() => setView('list')} style={{ marginBottom: '15px', background: 'transparent', border: '1px solid #555', color: '#ccc', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>← Back to results</button>

                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'start' }}>
                            <img src={selectedDrink.strDrinkThumb} alt={selectedDrink.strDrink} style={{ width: '120px', height: '120px', borderRadius: '10px', objectFit: 'cover', border: '2px solid #444' }} />
                            <div>
                                <h1 style={{ margin: '0 0 10px 0', color: '#28a745', fontSize: '2rem' }}>{selectedDrink.strDrink}</h1>
                                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                    <span style={{ background: '#444', padding: '4px 10px', borderRadius: '15px', fontSize: '0.8rem' }}>{selectedDrink.strCategory}</span>
                                    <span style={{ background: '#444', padding: '4px 10px', borderRadius: '15px', fontSize: '0.8rem' }}>{selectedDrink.strGlass}</span>
                                    <span style={{ background: '#444', padding: '4px 10px', borderRadius: '15px', fontSize: '0.8rem' }}>{selectedDrink.strAlcoholic}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: '#252525', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                            <h3 style={{ marginTop: 0, borderBottom: '1px solid #444', paddingBottom: '10px' }}>Ingredients</h3>
                            <ul style={{ paddingLeft: '20px', lineHeight: '1.8', fontSize: '1.1rem' }}>
                                {getIngredients(selectedDrink).map((ing, i) => <li key={i}>{ing}</li>)}
                            </ul>
                        </div>

                        <div style={{ background: '#252525', padding: '15px', borderRadius: '8px' }}>
                            <h3 style={{ marginTop: 0, borderBottom: '1px solid #444', paddingBottom: '10px' }}>Instructions</h3>
                            <p style={{ fontSize: '1.1rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{selectedDrink.strInstructions}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecipeModal;