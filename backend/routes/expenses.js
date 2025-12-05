const express = require('express');
const router = express.Router();
const db = require('../db');

// CREATE
router.post('/', async (req, res) => {
    const { Itinerary_ID, Category, Amount, Date, Notes } = req.body;
    try {
        // Validate required fields
        if (!Itinerary_ID) {
            return res.status(400).json({ error: 'Itinerary_ID is required' });
        }
        if (!Category) {
            return res.status(400).json({ error: 'Category is required' });
        }
        
        // Ensure Amount is a number
        const numAmount = parseFloat(Amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ error: 'Amount must be a valid positive number' });
        }
        
        // Log the values being inserted for debugging
        console.log('Creating expense:', { Itinerary_ID, Category, Amount: numAmount, Date, Notes });
        
        const [result] = await db.query(
            'INSERT INTO Expense (Itinerary_ID, Category, Amount, Date, Notes) VALUES (?, ?, ?, ?, ?)',
            [Itinerary_ID, Category, numAmount, Date || null, Notes]
        );
        res.status(201).json({ message: 'Expense created', expenseId: result.insertId });
    } catch (err) {
        console.error('Error creating expense:', err);
        res.status(500).json({ error: err.message });
    }
});
// READ (All)
router.get('/', async (req, res) => {
    try {
        const userId = req.query.user_id;
        let query = 'SELECT e.* FROM Expense e';
        let params = [];
        
        if (userId) {
            query += ' JOIN Itinerary i ON e.Itinerary_ID = i.Itinerary_ID WHERE i.User_ID = ?';
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
        // Ensure Amount is a number
        const numAmount = parseFloat(Amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ error: 'Amount must be a valid positive number' });
        }
        
        console.log('Updating expense:', req.params.id, { Category, Amount: numAmount, Date, Notes });
        
        await db.query(
            'UPDATE Expense SET Category = ?, Amount = ?, Date = ?, Notes = ? WHERE Expense_ID = ?',
            [Category, numAmount, Date || null, Notes, req.params.id]
        );
        res.json({ message: 'Expense updated' });
    } catch (err) {
        console.error('Error updating expense:', err);
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