const express = require('express');
const router = express.Router();
const connection = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticateToken = require('../middleware/authMiddleware');

// Configure multer for file upload handling with disk storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Ensure this directory exists
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Generate unique filename
    }
});
const upload = multer({ storage: storage });

// GET route to fetch messages
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.id;
  
    connection.query('SELECT id, title, content, enable, start_date, end_date, created_at, updated_at FROM messages WHERE user_id = ?', [userId], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Format the dates in the results
      results = results.map(message => ({
          ...message,
          created_at: message.created_at ? message.created_at.toISOString().slice(0, 19).replace('T', ' ') : null,
          updated_at: message.updated_at ? message.updated_at.toISOString().slice(0, 19).replace('T', ' ') : null
      }));

      res.json(results);
    });
});

// POST route for adding a new message
router.post('/add', authenticateToken, upload.array('content', 10), (req, res) => {
    const { title, enable, start_date, end_date } = req.body;
    const contentFiles = req.files ? req.files.map(file => file.filename) : [];
    const userId = req.user.id;

    const query = 'INSERT INTO messages (title, content, enable, start_date, end_date, user_id) VALUES (?, ?, ?, ?, ?, ?)';
    connection.query(query, [title, JSON.stringify(contentFiles), enable, start_date, end_date, userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ message: 'Message added successfully', message: { id: results.insertId, ...req.body, content: contentFiles } });
    });
});

// PUT route for updating a message
router.put('/:id', authenticateToken, upload.array('content', 10), (req, res) => {
    const { id } = req.params;
    const { title, enable, start_date, end_date } = req.body;
    const contentFiles = req.files ? req.files.map(file => file.filename) : [];
    const userId = req.user.id;

    let query = 'UPDATE messages SET title = ?, enable = ?, start_date = ?, end_date = ?';
    const params = [title, enable, start_date, end_date];

    if (contentFiles.length > 0) {
        query += ', content = ?';
        params.push(JSON.stringify(contentFiles));
    }

    query += ' WHERE id = ? AND user_id = ?';
    params.push(id, userId);

    connection.query(query, params, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }
        res.json({ message: 'Message updated successfully', message: { id, title, enable, start_date, end_date, content: contentFiles } });
    });
});

// DELETE route for deleting a message
router.delete('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // First, retrieve the message to delete the files from the filesystem
    connection.query('SELECT content FROM messages WHERE id = ? AND user_id = ?', [id, userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }

        const message = results[0];
        const contentFiles = JSON.parse(message.content);

        contentFiles.forEach(file => {
            const filePath = path.join(__dirname, '..', 'uploads', file);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error('Error deleting file:', err);
                } else {
                    console.log('File deleted:', filePath);
                }
            });
        });

        // Then, delete the message record from the database
        connection.query('DELETE FROM messages WHERE id = ? AND user_id = ?', [id, userId], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json({ message: 'Message deleted successfully' });
        });
    });
});

module.exports = router;
