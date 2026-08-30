const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - Increased limit to handle image uploads
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

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

// Create tables if they don't exist
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

// Student Registration API Route
app.post('/api/register', (req, res) => {
    try {
        const { studentId, fullName, grade, section, receiptFileName, receiptFileData } = req.body;

        if (!studentId || !fullName) {
            return res.status(400).json({ error: 'እባክዎ መታወቂያ እና ሙሉ ስም ያስገቡ!' });
        }

        const query = `INSERT INTO students (studentId, fullName, grade, section, receiptFileName, receiptFileData) VALUES (?, ?, ?, ?, ?, ?)`;
        
        db.run(query, [studentId.trim(), fullName.trim(), grade, section, receiptFileName, receiptFileData], function(err) {
            if (err) {
                console.error('Registration database error:', err.message);
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'ይህ የተማሪ መታወቂያ ቁጥር ቀድሞ ተመዝግቧል!' });
                }
                return res.status(500).json({ error: 'የዳታቤዝ ስህተት ተፈጥሯል: ' + err.message });
            }
            res.json({ success: true, message: 'ተማሪው በተሳካ ሁኔታ ተመዝግቧል!' });
        });
    } catch (e) {
        console.error('Server catch error:', e.message);
        res.status(500).json({ error: 'የሰርቨር ውስጣዊ ስህተት ተፈጥሯል' });
    }
});

// Admin Login API Route
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    const ADMIN_PASSWORD = 'admin123'; 

    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, message: 'በተሳካ ሁኔታ ገብተዋል!' });
    } else {
        res.status(401).json({ success: false, error: 'የይለፍ ቃሉ ስህተት ነው!' });
    }
});

// Admin Get All Students API Route
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
```[cite: 1]

---

### ከዚህ በኋላ ማድረግ የሚጠበቅብዎት፦
ተርሚናል ላይ ሆነው ትዕዛዞቹን **በተናጠል** ያስገቡ፦
```bash
git add .