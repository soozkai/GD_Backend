const express = require('express');
const bcrypt = require('bcrypt');
const connection = require('../db'); // Adjust path as needed

const router = express.Router();

router.post('/', async (req, res) => { // Note the '/'
  const { username, password, email } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
    connection.query(query, [username, hashedPassword, email], (err, results) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error registering user');
      } else {
        res.status(200).send('User registered successfully');
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;
