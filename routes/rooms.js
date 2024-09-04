const express = require('express');
const router = express.Router();
const connection = require('../db'); // Adjust path as needed
const authenticateToken = require('../middleware/authMiddleware');

// GET route for fetching the room list
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;

  connection.query('SELECT * FROM rooms WHERE user_id = ?', [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(results);
  });
});

// POST route for adding a new room
router.post('/add', authenticateToken, (req, res) => {
  const { room_number, device_ip, mac_address, j_version, active_status } = req.body;
  const userId = req.user.id;

  connection.query('SELECT * FROM rooms WHERE user_id = ? AND room_number = ?', [userId, room_number], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (results.length > 0) {
      return res.status(409).json({ error: 'Room number already exists' });
    }

    const query = 'INSERT INTO rooms (room_number, device_ip, mac_address, j_version, active_status, user_id) VALUES (?, ?, ?, ?, ?, ?)';
    connection.query(query, [room_number, device_ip, mac_address, j_version, active_status, userId], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json({ message: 'Room added successfully', room: { id: results.insertId, ...req.body, user_id: userId } });
    });
  });
});

// PUT route for updating a room
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { room_number, device_ip, mac_address, j_version, active_status } = req.body;
  const userId = req.user.id;

  connection.query('SELECT * FROM rooms WHERE user_id = ? AND room_number = ? AND id != ?', [userId, room_number, id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (results.length > 0) {
      return res.status(409).json({ error: 'Room number already exists' });
    }

    const query = 'UPDATE rooms SET room_number = ?, device_ip = ?, mac_address = ?, j_version = ?, active_status = ? WHERE id = ? AND user_id = ?';
    connection.query(query, [room_number, device_ip, mac_address, j_version, active_status, id, userId], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'Room not found' });
      }
      res.json({ message: 'Room updated successfully', room: { id, room_number, device_ip, mac_address, j_version, active_status, user_id: userId } });
    });
  });
});

// DELETE route for deleting a room
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const query = 'DELETE FROM rooms WHERE id = ? AND user_id = ?';
  connection.query(query, [id, userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json({ message: 'Room deleted successfully' });
  });
});

module.exports = router;
