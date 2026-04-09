const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:password@localhost:5432/timetable_db",
});

// ================= DB INIT =================
async function initDB() {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE
      );

      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name TEXT,
        code TEXT UNIQUE,
        domain_id INTEGER REFERENCES domains(id)
      );

      CREATE TABLE IF NOT EXISTS faculties (
        id SERIAL PRIMARY KEY,
        name TEXT,
        code TEXT UNIQUE
      );

      CREATE TABLE IF NOT EXISTS slots (
        id SERIAL PRIMARY KEY,
        code TEXT,
        day TEXT,
        start_time TEXT,
        end_time TEXT
      );

      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES subjects(id),
        slot_id INTEGER REFERENCES slots(id)
      );

      CREATE TABLE IF NOT EXISTS course_faculties (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        faculty_id INTEGER REFERENCES faculties(id),
        priority INTEGER
      );

      CREATE TABLE IF NOT EXISTS subject_faculties (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        faculty_id INTEGER REFERENCES faculties(id) ON DELETE CASCADE,
        UNIQUE(subject_id, faculty_id)
      );
    `);

    // ===== SEED DATA =====

    await client.query(`
      INSERT INTO domains (name) VALUES
      ('Foundation Core'),
      ('Discipline Core')
      ON CONFLICT (name) DO NOTHING;
    `);

    // subjects
    await client.query(`
      INSERT INTO subjects (name, code, domain_id) VALUES
      ('Discrete Mathematics', 'MAT201', 1),
      ('Data Structures', 'CSE301', 2),
      ('Web Programming', 'CSE401', 2),
      ('Engineering Physics', 'PHY101', 1),
      ('Artificial Intelligence', 'CSE501', 2),
      ('Machine Learning', 'CSE502', 2),
      ('Cloud Computing', 'CSE503', 2)
      ON CONFLICT (code) DO NOTHING;
    `);

    // faculties
    await client.query(`
      INSERT INTO faculties (name, code) VALUES
      ('Dr. Ananya Sharma', 'ANS'),
      ('Prof. Rajan Mehta', 'RJM'),
      ('Dr. Priya Iyer', 'PRI'),
      ('Prof. Vikram Nair', 'VKN'),
      ('Dr. Sunita Patel', 'SPA'),
      ('Prof. Deepak Rao', 'DPR'),
      ('Dr. Kavitha Menon', 'KVM')
      ON CONFLICT (code) DO NOTHING;
    `);

    // 🔥 CLEAN + SAFE MAPPING (NO HARDCODED IDs)
    await client.query(`
      DELETE FROM subject_faculties;

      -- Discrete Mathematics
      INSERT INTO subject_faculties (subject_id, faculty_id)
      SELECT s.id, f.id FROM subjects s, faculties f
      WHERE s.code='MAT201' AND f.code='RJM';

      INSERT INTO subject_faculties (subject_id, faculty_id)
      SELECT s.id, f.id FROM subjects s, faculties f
      WHERE s.code='MAT201' AND f.code='DPR';

      -- Data Structures
      INSERT INTO subject_faculties (subject_id, faculty_id)
      SELECT s.id, f.id FROM subjects s, faculties f
      WHERE s.code='CSE301' AND f.code='ANS';

      INSERT INTO subject_faculties (subject_id, faculty_id)
      SELECT s.id, f.id FROM subjects s, faculties f
      WHERE s.code='CSE301' AND f.code='PRI';

      INSERT INTO subject_faculties (subject_id, faculty_id)
      SELECT s.id, f.id FROM subjects s, faculties f
      WHERE s.code='CSE301' AND f.code='SPA';

      -- Web Programming
      INSERT INTO subject_faculties (subject_id, faculty_id)
      SELECT s.id, f.id FROM subjects s, faculties f
      WHERE s.code='CSE401' AND f.code='ANS';

      INSERT INTO subject_faculties (subject_id, faculty_id)
      SELECT s.id, f.id FROM subjects s, faculties f
      WHERE s.code='CSE401' AND f.code='SPA';

      -- Physics
      INSERT INTO subject_faculties (subject_id, faculty_id)
      SELECT s.id, f.id FROM subjects s, faculties f
      WHERE s.code='PHY101' AND f.code='KVM';

      -- AI
      INSERT INTO subject_faculties (subject_id, faculty_id)
      SELECT s.id, f.id FROM subjects s, faculties f
      WHERE s.code='CSE501' AND f.code='ANS';

      INSERT INTO subject_faculties (subject_id, faculty_id)
      SELECT s.id, f.id FROM subjects s, faculties f
      WHERE s.code='CSE501' AND f.code='PRI';

      -- ML
      INSERT INTO subject_faculties (subject_id, faculty_id)
      SELECT s.id, f.id FROM subjects s, faculties f
      WHERE s.code='CSE502' AND f.code='PRI';

      INSERT INTO subject_faculties (subject_id, faculty_id)
      SELECT s.id, f.id FROM subjects s, faculties f
      WHERE s.code='CSE502' AND f.code='SPA';

      -- Cloud
      INSERT INTO subject_faculties (subject_id, faculty_id)
      SELECT s.id, f.id FROM subjects s, faculties f
      WHERE s.code='CSE503' AND f.code='ANS';
    `);

    // slots (clean reset + better structure)
    await client.query(`
      DELETE FROM slots;

      INSERT INTO slots (code, day, start_time, end_time) VALUES

      -- Morning (reduced)
      ('A1', 'MON', '09:00', '10:00'),
      ('B1', 'MON', '10:00', '11:00'),

      -- Mid
      ('C1', 'MON', '11:00', '12:00'),

      -- Afternoon
      ('D1', 'MON', '13:00', '14:00'),

      -- Evening
      ('A2', 'MON', '16:00', '17:00'),
      ('B2', 'MON', '17:00', '18:00'),
      ('C2', 'MON', '18:00', '19:00');
    `);

    console.log("DB Ready");
  } finally {
    client.release();
  }
}

// ================= ROUTES =================

// Domains
app.get("/api/domains", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM domains");
  res.json(rows);
});

// Subjects
app.get("/api/subjects", async (req, res) => {
  const domainId = req.query.domain_id;

  const { rows } = await pool.query(
    "SELECT * FROM subjects WHERE domain_id = $1",
    [domainId],
  );

  res.json(rows);
});

// Faculties per subject ✅ FIXED
app.get("/api/faculties", async (req, res) => {
  const subjectId = req.query.subject_id;

  const result = await pool.query(
    `SELECT f.* FROM faculties f
     JOIN subject_faculties sf ON f.id = sf.faculty_id
     WHERE sf.subject_id = $1`,
    [subjectId],
  );

  res.json(result.rows);
});

// Slots
app.get("/api/slots", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM slots");
  res.json(rows);
});

// Courses (WITH FACULTIES 🔥)
app.get("/api/courses", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT c.id,
           s.name AS subject,
           sl.code AS slot,
           sl.day,
           STRING_AGG(f.name, ', ') AS faculties
    FROM courses c
    JOIN subjects s ON c.subject_id = s.id
    JOIN slots sl ON c.slot_id = sl.id
    LEFT JOIN course_faculties cf ON c.id = cf.course_id
    LEFT JOIN faculties f ON cf.faculty_id = f.id
    GROUP BY c.id, s.name, sl.code, sl.day
  `);

  res.json(rows);
});

// Add course
app.post("/api/courses", async (req, res) => {
  const { subject_id, slot_id, faculty_ids } = req.body;

  const result = await pool.query(
    "INSERT INTO courses (subject_id, slot_id) VALUES ($1,$2) RETURNING id",
    [subject_id, slot_id],
  );

  const courseId = result.rows[0].id;

  if (faculty_ids && faculty_ids.length > 0) {
    for (let i = 0; i < faculty_ids.length; i++) {
      await pool.query(
        "INSERT INTO course_faculties (course_id, faculty_id, priority) VALUES ($1,$2,$3)",
        [courseId, faculty_ids[i], i + 1],
      );
    }
  }

  res.json({ success: true });
});

// Delete all courses
app.delete("/api/courses", async (req, res) => {
  await pool.query("DELETE FROM courses");
  res.json({ success: true });
});

// ================= START =================
initDB().then(() => {
  app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });
});
