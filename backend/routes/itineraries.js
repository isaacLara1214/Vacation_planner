const express = require('express');
const router = express.Router();
const db = require('../db');

// CREATE
router.post('/', async (req, res) => {
    let { User_ID, Trip_Name, Start_Date, End_Date, Budget } = req.body;
    try {
        // Convert ISO date strings to YYYY-MM-DD format if they're in ISO format
        if (Start_Date && typeof Start_Date === 'string' && Start_Date.includes('T')) {
            Start_Date = Start_Date.split('T')[0];
        }
        if (End_Date && typeof End_Date === 'string' && End_Date.includes('T')) {
            End_Date = End_Date.split('T')[0];
        }
        
        const [result] = await db.query(
            'INSERT INTO Itinerary (User_ID, Trip_Name, Start_Date, End_Date, Budget) VALUES (?, ?, ?, ?, ?)',
            [User_ID, Trip_Name, Start_Date, End_Date, Budget || 0]
        );
        res.status(201).json({ message: 'Itinerary created', itineraryId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// READ (All)
router.get('/', async (req, res) => {
    try {
        const userId = req.query.user_id;
        let query = 'SELECT * FROM Itinerary';
        let params = [];
        
        if (userId) {
            query += ' WHERE User_ID = ?';
            params.push(userId);
        }
        
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// READ (All for User)
router.get('/user/:userId', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Itinerary WHERE User_ID = ?', [req.params.userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ (One)
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Itinerary WHERE Itinerary_ID = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Itinerary not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE
router.put('/:id', async (req, res) => {
    let { Trip_Name, Start_Date, End_Date, Budget } = req.body;
    try {
        // Convert ISO date strings to YYYY-MM-DD format if they're in ISO format
        if (Start_Date && typeof Start_Date === 'string' && Start_Date.includes('T')) {
            Start_Date = Start_Date.split('T')[0];
        }
        if (End_Date && typeof End_Date === 'string' && End_Date.includes('T')) {
            End_Date = End_Date.split('T')[0];
        }
        
        const budgetValue = Budget !== undefined ? Budget : 0;
        await db.query(
            'UPDATE Itinerary SET Trip_Name = ?, Start_Date = ?, End_Date = ?, Budget = ? WHERE Itinerary_ID = ?',
            [Trip_Name, Start_Date, End_Date, budgetValue, req.params.id]
        );
        res.json({ message: 'Itinerary updated' });
    } catch (err) {
        console.error('Error updating itinerary:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
        const itineraryId = req.params.id;
        
        // Get all destinations for this itinerary
        const [destinations] = await db.query('SELECT Destination_ID FROM Destination WHERE Itinerary_ID = ?', [itineraryId]);
        const destinationIds = destinations.map(d => d.Destination_ID);
        
        // Delete all activities for these destinations
        if (destinationIds.length > 0) {
            await db.query('DELETE FROM Activity WHERE Destination_ID IN (?)', [destinationIds]);
            // Delete all accommodations for these destinations
            await db.query('DELETE FROM Accommodation WHERE Destination_ID IN (?)', [destinationIds]);
        }
        
        // Delete all expenses for this itinerary
        await db.query('DELETE FROM Expense WHERE Itinerary_ID = ?', [itineraryId]);
        
        // Delete all destinations for this itinerary
        await db.query('DELETE FROM Destination WHERE Itinerary_ID = ?', [itineraryId]);
        
        // Delete the itinerary
        await db.query('DELETE FROM Itinerary WHERE Itinerary_ID = ?', [itineraryId]);
        
        res.json({ message: 'Itinerary deleted' });
    } catch (err) {
        console.error('Error deleting itinerary:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;