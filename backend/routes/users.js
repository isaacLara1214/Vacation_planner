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

// READ ALL - Add this route
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT User_ID, Name, Email FROM `User`');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// LOGIN - Check if user exists
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.query(
            'SELECT User_ID, Name, Email, Password FROM `User` WHERE Email = ?',
            [email]
        );
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        
        const user = rows[0];
        
        // Simple password check
        if (user.Password !== password) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        
        // Don't send password back to client
        delete user.Password;
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// REGISTER - Create new user
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        // Check if user already exists
        const [existing] = await db.query(
            'SELECT User_ID FROM `User` WHERE Email = ?',
            [email]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email already registered' });
        }
        
        // Create new user with plain text password
        const [result] = await db.query(
            'INSERT INTO User (Name, Email, Password) VALUES (?, ?, ?)',
            [name, email, password]
        );
        
        // Return the newly created user (without password)
        const [newUser] = await db.query(
            'SELECT User_ID, Name, Email FROM `User` WHERE User_ID = ?',
            [result.insertId]
        );
        res.status(201).json({ user: newUser[0] });
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