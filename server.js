const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const db = new sqlite3.Database('./saint_michael_school.db', (err) => {
    if (err) console.error('የዳታቤዝ ግንኙነት ስህተት:', err.message);
    else console.log('SQLite ዳታቤዝ በተሳካ ሁኔታ ተገናኝቷል!');
});

// ሠንጠረዡ grade እና section እንዲኖረው ተሻሽሏል
db.run(`CREATE TABLE IF NOT EXISTS students (
    studentId TEXT PRIMARY KEY,
    fullName TEXT,
    grade TEXT,
    section TEXT,
    fileName TEXT,
    fileData TEXT,
    createdAt TEXT
)`);

// 1. ነጠላ ተማሪ የመመዝገቢያ API
app.post('/api/upload', (req, res) => {
    const { studentId, fullName, grade, section, fileName, fileData } = req.body;
    const createdAt = new Date().toISOString();

    const query = `INSERT INTO students (studentId, fullName, grade, section, fileName, fileData, createdAt) 
                   VALUES (?, ?, ?, ?, ?, ?, ?) 
                   ON CONFLICT(studentId) DO UPDATE SET 
                   fullName=excluded.fullName, 
                   grade=excluded.grade, 
                   section=excluded.section, 
                   fileName=excluded.fileName, 
                   fileData=excluded.fileData`;

    db.run(query, [studentId, fullName, grade, section, fileName, fileData, createdAt], function(err) {
        if (err) return res.status(500).json({ error: 'ሰርቨር ላይ ስህተት ተፈጥሯል!', details: err.message });
        res.status(200).json({ message: 'ተማሪው, ክፍሉ እና ውጤቱ በዳታቤዝ ተመዝግበዋል!' });
    });
});

// 2. የ Excel ፋይል በጅምላ መጫኛ (grade እና section ጨምሮ)
app.post('/api/upload-excel', upload.single('excelFile'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'እባክዎ የ Excel ፋይል ይምረጡ!' });

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) return res.status(400).json({ error: 'በኤክሴል ፋይሉ ውስጥ ምንም መረጃ አልተገኘም!' });

        const createdAt = new Date().toISOString();
        let successCount = 0;

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            const stmt = db.prepare(`INSERT INTO students (studentId, fullName, grade, section, fileName, fileData, createdAt) 
                                     VALUES (?, ?, ?, ?, ?, ?, ?) 
                                     ON CONFLICT(studentId) DO UPDATE SET 
                                     fullName=excluded.fullName, 
                                     grade=excluded.grade, 
                                     section=excluded.section`);

            rows.forEach(row => {
                const studentId = row.studentId || row.ID || row.Id;
                const fullName = row.fullName || row.Name || row.name;
                const grade = row.grade || row.Grade || '';
                const section = row.section || row.Section || '';

                if (studentId && fullName) {
                    stmt.run([String(studentId), String(fullName), String(grade), String(section), 'excel_imported', '', createdAt]);
                    successCount++;
                }
            });

            stmt.finalize();
            db.run('COMMIT', (err) => {
                if (err) return res.status(500).json({ error: 'መረጃውን ማስቀመጥ አልተቻለም', details: err.message });
                res.status(200).json({ message: `በተሳካ ሁኔታ ${successCount} ተማሪዎች ተመዝግበዋል!` });
            });
        });
    } catch (err) {
        res.status(500).json({ error: 'ስህተት ተፈጥሯል', details: err.message });
    }
});

// የተማሪው ውጤት ማግኛ API
app.get('/api/result/:id', (req, res) => {
    const studentId = req.params.id;
    db.get(`SELECT * FROM students WHERE studentId = ?`, [studentId], (err, row) => {
        if (err) return res.status(500).json({ error: 'ሰርቨር ላይ ስህተት ተፈጥሯል!' });
        if (!row) return res.status(404).json({ message: 'በዚህ መለያ ቁጥር የተገኘ ውጤት የለም።' });
        res.status(200).json(row);
    });
});

app.listen(PORT, () => console.log(`ሰርቨሩ በፖርት ${PORT} ላይ እየሰራ ነው።`));