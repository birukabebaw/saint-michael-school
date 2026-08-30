const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ስታቲክ ፋይሎችን (HTML, CSS, Images) ከፎልደሩ ማንበብ እንዲችል
app.use(express.static(__dirname));

// የ SQLite ዳታቤዝ ማገናኛ
const db = new sqlite3.Database('./saint_michael_school.db', (err) => {
    if (err) console.error('የዳታቤዝ ግንኙነት ስህተት:', err.message);
    else console.log('SQLite ዳታቤዝ በተሳካ ሁኔታ ተገናኝቷል!');
});

// የሰንጠረዥ (Table) ማዋቀሪያ
db.run(`CREATE TABLE IF NOT EXISTS students (
    studentId TEXT PRIMARY KEY,
    fullName TEXT,
    grade TEXT,
    section TEXT,
    maths TEXT,
    english TEXT,
    amharic TEXT,
    total TEXT,
    average TEXT,
    rank TEXT
)`);

// 1. መነሻ ገጹን (Homepage) በሊንኩ ሲከፈት ማሳየት
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'homepage.html'));
});

// ሰርቨሩን ማስጀመር
app.listen(PORT, () => {
    console.log(`ሰርቨሩ በፖርት ${PORT} ላይ እየሰራ ነው`);
});