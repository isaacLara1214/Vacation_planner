const express = require('express');
const router = express.Router();
const db = require('../db');

// CREATE
router.post('/', async (req, res) => {
    const { Itinerary_ID, Category, Amount, Date, Notes } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO Expense (Itinerary_ID, Category, Amount, Date, Notes) VALUES (?, ?, ?, ?, ?)',
            [Itinerary_ID, Category, Amount, Date, Notes]
        );
        res.status(201).json({ message: 'Expense created', expenseId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// READ (All)
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Expense');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// READ (All for Itinerary)
router.get('/itinerary/:itineraryId', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Expense WHERE Itinerary_ID = ?', [req.params.itineraryId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE
router.put('/:id', async (req, res) => {
    const { Category, Amount, Date, Notes } = req.body;
    try {
        await db.query(
            'UPDATE Expense SET Category = ?, Amount = ?, Date = ?, Notes = ? WHERE Expense_ID = ?',
            [Category, Amount, Date, Notes, req.params.id]
        );
        res.json({ message: 'Expense updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM Expense WHERE Expense_ID = ?', [req.params.id]);
        res.json({ message: 'Expense deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;