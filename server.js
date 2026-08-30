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

// ስታቲክ ፋይሎችን ማንበብ እንዲችል
app.use(express.static(__dirname));

// የ SQLite ዳታቤዝ ማገናኛ
const db = new sqlite3.Database('./saint_michael_school.db', (err) => {
    if (err) console.error('የዳታቤዝ ግንኙነት ስህተት:', err.message);
    else console.log('SQLite ዳታቤዝ በተሳካ ሁኔታ ተገናኝቷል!');
});

// የሰንጠረዥ (Table) ማዋቀሪያ እና አዳዲስ ኮለኖች በራስሰር መጨመር
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
    rank TEXT,
    receiptFileName TEXT,
    receiptFileData TEXT
)`, () => {
    db.run(`ALTER TABLE students ADD COLUMN receiptFileName TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN receiptFileData TEXT`, () => {});
});

// 1. መነሻ ገጹን (Homepage) ማሳየት
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'homepage.html'));
});

// 2. የተማሪ ምዝገባ እና የኤክሴል ፋይል መቀበያ አድራሻ (API Route)
app.post('/api/upload', (req, res) => {
    try {
        const { studentId, fullName, grade, section, fileName, fileData } = req.body;

        if (!fileData) {
            return res.status(400).json({ error: 'እባክዎ ፋይል ይምረጡ!' });
        }

        // የተማሪ መታወቂያ (studentId) ካለ - ነጠላ ተማሪ ከባንክ receipt ጋር ይመዝገብ
        if (studentId && fullName) {
            db.run(
                `INSERT OR REPLACE INTO students (studentId, fullName, grade, section, receiptFileName, receiptFileData) VALUES (?, ?, ?, ?, ?, ?)`,
                [String(studentId), String(fullName), String(grade || ''), String(section || ''), String(fileName || ''), String(fileData)],
                function (err) {
                    if (err) {
                        return res.status(500).json({ error: 'ዳታቤዝ ላይ ማስቀመጥ አልተቻለም: ' + err.message });
                    }
                    res.json({ message: `ተማሪ ${fullName} በተሳካ ሁኔታ ተመዝግቧል!` });
                }
            );
            return;
        }

        // ካልሆነ ግን - የኤክሴል (Bulk) ፋይል ነው ማለት ነው
        const buffer = Buffer.from(fileData, 'base64');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (!rows || rows.length === 0) {
            return res.status(400).json({ error: 'የኤክሴል ፋይሉ ባዶ ነው!' });
        }

        const stmt = db.prepare(`INSERT OR REPLACE INTO students (studentId, fullName, grade, section, maths, english, amharic, total, average, rank) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        let count = 0;
        rows.forEach(row => {
            const sId = row.studentId || row.StudentId || row.ID || row.id;
            const fName = row.fullName || row.FullName || row.Name || row.name;
            const gradeVal = row.grade || row.Grade || '';
            const secVal = row.section || row.Section || '';
            const maths = row.maths || row.Maths || '';
            const english = row.english || row.English || '';
            const amharic = row.amharic || row.Amharic || '';
            const total = row.total || row.Total || '';
            const average = row.average || row.Average || '';
            const rank = row.rank || row.Rank || '';

            if (sId && fName) {
                stmt.run(String(sId), String(fName), String(gradeVal), String(secVal), String(maths), String(english), String(amharic), String(total), String(average), String(rank));
                count++;
            }
        });

        stmt.finalize((err) => {
            if (err) {
                return res.status(500).json({ error: 'ዳታቤዝ ላይ ማስቀመጥ አልተቻለም: ' + err.message });
            }
            res.json({ message: `በተሳካ ሁኔታ ${count} ተማሪዎች ከኤክሴል ተመዝግበዋል!` });
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'ስህተት ተፈጥሯል: ' + e.message });
    }
});

// ሰርቨሩን ማስጀመር
app.listen(PORT, () => {
    console.log(`ሰርቨሩ በፖርት ${PORT} ላይ እየሰራ ነው`);
});