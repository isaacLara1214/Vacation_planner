const express = require('express');
const router = express.Router();
const db = require('../db'); // Adjust path to point to your db.js

// CREATE
router.post('/', async (req, res) => {
    const { Name, Email, Password } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO User (Name, Email, Password) VALUES (?, ?, ?)',
            [Name, Email, Password]
        );
        res.status(201).json({ message: 'User created', userId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ (One)
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM User WHERE User_ID = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE
router.put('/:id', async (req, res) => {
    const { Name, Email, Password } = req.body;
    try {
        await db.query(
            'UPDATE User SET Name = ?, Email = ?, Password = ? WHERE User_ID = ?',
            [Name, Email, Password, req.params.id]
        );
        res.json({ message: 'User updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM User WHERE User_ID = ?', [req.params.id]);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;