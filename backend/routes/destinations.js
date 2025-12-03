const express = require('express');
const router = express.Router();
const db = require('../db');

// CREATE
router.post('/', async (req, res) => {
    const { Itinerary_ID, City, Country, Notes } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO Destination (Itinerary_ID, City, Country, Notes) VALUES (?, ?, ?, ?)',
            [Itinerary_ID, City, Country, Notes || null]
        );
        res.status(201).json({ message: 'Destination created', destinationId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// READ (All)
router.get('/', async (req, res) => {
    try {
        const userId = req.query.user_id;
        let query = 'SELECT d.* FROM Destination d';
        let params = [];
        
        if (userId) {
            query += ' JOIN Itinerary i ON d.Itinerary_ID = i.Itinerary_ID WHERE i.User_ID = ?';
            params.push(userId);
        }
        
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// READ (All for Itinerary)
router.get('/itinerary/:itineraryId', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Destination WHERE Itinerary_ID = ?', [req.params.itineraryId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE
router.put('/:id', async (req, res) => {
    const { City, Country, Notes } = req.body;
    try {
        await db.query(
            'UPDATE Destination SET City = ?, Country = ?, Notes = ? WHERE Destination_ID = ?',
            [City, Country, Notes || null, req.params.id]
        );
        res.json({ message: 'Destination updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
        // Delete all activities for this destination first
        await db.query('DELETE FROM Activity WHERE Destination_ID = ?', [req.params.id]);
        // Delete all accommodations for this destination
        await db.query('DELETE FROM Accommodation WHERE Destination_ID = ?', [req.params.id]);
        // Finally delete the destination
        await db.query('DELETE FROM Destination WHERE Destination_ID = ?', [req.params.id]);
        res.json({ message: 'Destination deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;