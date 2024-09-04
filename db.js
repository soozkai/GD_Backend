const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '112212',
  database: 'hotel_management'
});

connection.connect((err) => {
  if (err) throw err;
  console.log('Connected to the MySQL database!');
});

module.exports = connection;
