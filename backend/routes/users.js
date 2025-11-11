const express = require('express');
const router = express.Router();
const db = require('../db'); // expects pool.promise()

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid user id' });

  try {
    const [rows] = await db.query('SELECT User_ID, Name, Email FROM `User` WHERE User_ID = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;