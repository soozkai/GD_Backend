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
// GET route to fetch facilities
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.id;
  
    connection.query('SELECT id, category, title, language, file_type, content, created_at, updated_at FROM facilities WHERE user_id = ?', [userId], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Format the dates in the results
      results = results.map(facility => ({
          ...facility,
          created_at: facility.created_at ? facility.created_at.toISOString().slice(0, 19).replace('T', ' ') : null,
          updated_at: facility.updated_at ? facility.updated_at.toISOString().slice(0, 19).replace('T', ' ') : null
      }));

      res.json(results);
    });
});
// POST route for adding a new facility
router.post('/add', authenticateToken, upload.single('content'), (req, res) => {
    const { category, title, language, file_type } = req.body;
    const content = req.file ? req.file.filename : null; // Save filename in the database
    const userId = req.user.id;

    const query = 'INSERT INTO facilities (category, title, language, file_type, content, user_id) VALUES (?, ?, ?, ?, ?, ?)';
    connection.query(query, [category, title, language, file_type, content, userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ message: 'Facility added successfully', facility: { id: results.insertId, ...req.body, content } });
    });
});

// PUT route for updating a facility
router.put('/:id', authenticateToken, upload.single('content'), (req, res) => {
    const { id } = req.params;
    const { category, title, language, file_type } = req.body;
    const content = req.file ? req.file.filename : null;
    const userId = req.user.id;

    let query = 'UPDATE facilities SET category = ?, title = ?, language = ?, file_type = ?';
    const params = [category, title, language, file_type];

    if (content) {
        query += ', content = ?';
        params.push(content);
    }

    query += ' WHERE id = ? AND user_id = ?';
    params.push(id, userId);

    connection.query(query, params, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Facility not found' });
        }
        res.json({ message: 'Facility updated successfully', facility: { id, category, title, language, file_type, content } });
    });
});

// DELETE route for deleting a facility
router.delete('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // First, retrieve the facility to delete the file from the filesystem
    connection.query('SELECT content FROM facilities WHERE id = ? AND user_id = ?', [id, userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Facility not found' });
        }

        const facility = results[0];
        if (facility.content) {
            // Ensure facility.content is a string
            const filePath = path.join(__dirname, '..', 'uploads', facility.content.toString());
            
            // Delete the file from the filesystem
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error('Error deleting file:', err);
                } else {
                    console.log('File deleted:', filePath);
                }
            });
        }
        

        // Then, delete the facility record from the database
        connection.query('DELETE FROM facilities WHERE id = ? AND user_id = ?', [id, userId], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json({ message: 'Facility deleted successfully' });
        });
    });
});

module.exports = router;
