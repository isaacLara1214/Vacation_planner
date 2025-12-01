const express = require('express');
const router = express.Router();
const db = require('../db');

// CREATE
router.post('/', async (req, res) => {
    const { Destination_ID, Name, Check_In, Check_Out, Cost, Address } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO Accommodation (Destination_ID, Name, Check_In, Check_Out, Cost, Address) VALUES (?, ?, ?, ?, ?, ?)',
            [Destination_ID, Name, Check_In, Check_Out, Cost, Address]
        );
        res.status(201).json({ message: 'Accommodation created', accommodationId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// READ (All)
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Accommodation');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// READ (All for Destination)
router.get('/destination/:destinationId', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Accommodation WHERE Destination_ID = ?', [req.params.destinationId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE
router.put('/:id', async (req, res) => {
    const { Name, Check_In, Check_Out, Cost, Address } = req.body;
    try {
        await db.query(
            'UPDATE Accommodation SET Name = ?, Check_In = ?, Check_Out = ?, Cost = ?, Address = ? WHERE Accommodation_ID = ?',
            [Name, Check_In, Check_Out, Cost, Address, req.params.id]
        );
        res.json({ message: 'Accommodation updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM Accommodation WHERE Accommodation_ID = ?', [req.params.id]);
        res.json({ message: 'Accommodation deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;