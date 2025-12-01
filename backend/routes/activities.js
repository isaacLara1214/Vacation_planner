const express = require('express');
const router = express.Router();
const db = require('../db');

// CREATE
router.post('/', async (req, res) => {
    const { Destination_ID, Name, Date, Cost, Category, Address } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO Activity (Destination_ID, Name, Date, Cost, Category, Address) VALUES (?, ?, ?, ?, ?, ?)',
            [Destination_ID, Name, Date, Cost, Category, Address]
        );
        res.status(201).json({ message: 'Activity created', activityId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// READ (All)
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Activity');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// READ (All for Destination)
router.get('/destination/:destinationId', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Activity WHERE Destination_ID = ?', [req.params.destinationId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE
router.put('/:id', async (req, res) => {
    const { Name, Date, Cost, Category, Address } = req.body;
    try {
        await db.query(
            'UPDATE Activity SET Name = ?, Date = ?, Cost = ?, Category = ?, Address = ? WHERE Activity_ID = ?',
            [Name, Date, Cost, Category, Address, req.params.id]
        );
        res.json({ message: 'Activity updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM Activity WHERE Activity_ID = ?', [req.params.id]);
        res.json({ message: 'Activity deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;