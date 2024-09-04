require('dotenv').config();
const express = require('express');
const cors = require('cors');
const registerRouter = require('./routes/register');
const loginRouter = require('./routes/login');
const roomsRouter = require('./routes/rooms');
const facilitiesRouter = require('./routes/facility')
const messageRouter = require('./routes/messages')
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json()); // Parse JSON bodies

// Serve static files from the "uploads" directory
app.use('/uploads', express.static('uploads'));
app.use('/register', registerRouter); // Use the register router
app.use('/login', loginRouter); // Use the login router
app.use('/rooms', roomsRouter); // Use the rooms router
app.use('/facilities', facilitiesRouter);
app.use('/messages',messageRouter);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
