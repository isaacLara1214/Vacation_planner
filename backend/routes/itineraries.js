const express = require('express');
const router = express.Router();
const db = require('../db');

// CREATE
router.post('/', async (req, res) => {
    const { User_ID, Trip_Name, Start_Date, End_Date } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO Itinerary (User_ID, Trip_Name, Start_Date, End_Date) VALUES (?, ?, ?, ?)',
            [User_ID, Trip_Name, Start_Date, End_Date]
        );
        res.status(201).json({ message: 'Itinerary created', itineraryId: result.insertId });
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
    const { Trip_Name, Start_Date, End_Date } = req.body;
    try {
        await db.query(
            'UPDATE Itinerary SET Trip_Name = ?, Start_Date = ?, End_Date = ? WHERE Itinerary_ID = ?',
            [Trip_Name, Start_Date, End_Date, req.params.id]
        );
        res.json({ message: 'Itinerary updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM Itinerary WHERE Itinerary_ID = ?', [req.params.id]);
        res.json({ message: 'Itinerary deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;