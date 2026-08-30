const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Initialize SQLite Database
const dbFile = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Database opening error: ', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Create tables if they don't exist (Student registration & receipts)
db.run(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId TEXT UNIQUE,
    fullName TEXT,
    grade TEXT,
    section TEXT,
    receiptFileName TEXT,
    receiptFileData TEXT,
    maths TEXT,
    english TEXT,
    amharic TEXT,
    total TEXT,
    average TEXT,
    rank TEXT
)`, (err) => {
    if (err) {
        console.error("Error creating table:", err.message);
    } else {
        console.log("Students table ready.");
    }
});

// Homepage route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'homepage.html'));
});

// Admin Login API Route
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    
    // እዚህ ጋር የአስተዳዳሪውን የይለፍ ቃል ማስተካከል ይችላሉ (ለምሳሌ: 'admin123')
    const ADMIN_PASSWORD = 'admin123'; 

    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, message: 'በተሳካ ሁኔታ ገብተዋል!' });
    } else {
        res.status(401).json({ success: false, error: 'የይለፍ ቃሉ ስህተት ነው!' });
    }
});

// Admin Get All Students API Route (for the table display)
app.get('/api/admin/students', (req, res) => {
    db.all("SELECT * FROM students ORDER BY id DESC", [], (err, rows) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: 'ሰርቨር ስህተት ተፈጥሯል' });
        }
        res.json(rows);
    });
});

// Result / Receipt Check API Route
app.post('/api/result', (req, res) => {
    const { studentId, fullName } = req.body;

    if (!studentId || !fullName) {
        return res.status(400).json({ error: 'እባክዎ መታወቂያ ቁጥር እና ሙሉ ስም ያስገቡ!' });
    }

    const query = `SELECT * FROM students WHERE LOWER(studentId) = LOWER(?) AND LOWER(fullName) = LOWER(?)`;
    
    db.get(query, [studentId.trim(), fullName.trim()], (err, row) => {
        if (err) {
            console.error('Database query error:', err.message);
            return res.status(500).json({ error: 'የሰርቨር ስህተት ተፈጥሯል' });
        }

        if (!row) {
            return res.status(404).json({ error: 'የተማሪው መረጃ አልተገኘም!' });
        }

        res.json(row);
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});