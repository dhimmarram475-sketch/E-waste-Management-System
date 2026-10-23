/* ============================================================
   EcoTech – Smart E-Waste Management System
   server.js | Simple Express backend (no database)
   Data lives in memory and resets when the server restarts.
   ============================================================ */
const path    = require('path');
const express = require('express');
const cors    = require('cors');
const multer  = require('multer');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Image upload (optional field "image"), kept in memory, max 5 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  },
});

/* ---------- Sample data ---------- */
const centers = [
  { id: 1, name: 'GreenRecycle City Center', category: 'all',
    location: 'Downtown – Zone A, City Center',
    accepts: 'All electronic waste including phones, computers, batteries, TVs, and appliances',
    hours: 'Monday–Saturday: 9:00 AM – 6:00 PM | Sunday: Closed',
    contact: 'Sample Contact: 1800-ECO-TECH' },
  { id: 2, name: 'TechRecycle Mobile Hub', category: 'mobile',
    location: 'North District, Tech Street',
    accepts: 'Mobile phones, smartphones, tablets, and chargers',
    hours: 'Monday–Friday: 10:00 AM – 7:00 PM | Weekends: 11:00 AM – 4:00 PM',
    contact: 'Sample Contact: 1800-MOB-RECYCLE' },
  { id: 3, name: 'Eco Power Battery Depot', category: 'battery',
    location: 'East Industrial Area, Block 7',
    accepts: 'Lead-acid, lithium-ion, nickel-cadmium, and AA/AAA batteries',
    hours: 'Monday–Saturday: 8:00 AM – 5:00 PM | Sunday: Closed',
    contact: 'Sample Contact: 1800-BAT-DEPOT' },
  { id: 4, name: 'ComputerCycle IT Solutions', category: 'computer',
    location: 'West Business Park, IT Hub',
    accepts: 'Laptops, desktop computers, monitors, keyboards, mice, and printers',
    hours: 'Monday–Friday: 9:00 AM – 6:00 PM | Weekends: By appointment',
    contact: 'Sample Contact: 1800-COMP-CYCLE' },
  { id: 5, name: 'Home Appliance Recyclers', category: 'appliance',
    location: 'South Suburb, Recycle Road',
    accepts: 'Microwaves, washing machines, refrigerators, TVs, air conditioners',
    hours: 'Tuesday–Sunday: 10:00 AM – 5:00 PM | Monday: Closed',
    contact: 'Sample Contact: 1800-APPL-RECYCLE' },
  { id: 6, name: 'Campus EcoPoint', category: 'all',
    location: 'University Campus, Main Gate',
    accepts: 'Phones, laptops, small appliances, batteries, and cables accepted from students & staff',
    hours: 'Monday–Friday: 8:00 AM – 8:00 PM | Saturday: 9:00 AM – 3:00 PM | Sunday: Closed',
    contact: 'Sample Contact: Campus Helpdesk ext. 400' },
];

const reports = []; // in-memory storage for submitted reports

/* ---------- API routes ---------- */

// GET /api/centers?search=&category=
app.get('/api/centers', (req, res) => {
  const search   = (req.query.search   || '').toString().toLowerCase().trim();
  const category = (req.query.category || '').toString().toLowerCase().trim();

  const data = centers.filter(c => {
    const matchesSearch = !search ||
      c.name.toLowerCase().includes(search) ||
      c.location.toLowerCase().includes(search);
    const matchesCategory = !category || c.category === category || c.category === 'all';
    return matchesSearch && matchesCategory;
  });

  res.json({ success: true, count: data.length, data });
});

// GET /api/centers/:id
app.get('/api/centers/:id', (req, res) => {
  const center = centers.find(c => c.id === Number(req.params.id));
  if (!center) return res.status(404).json({ success: false, message: 'Center not found.' });
  res.json({ success: true, data: center });
});

// POST /api/reports  (multipart/form-data)
app.post('/api/reports', upload.single('image'), (req, res) => {
  const { full_name, email, phone, location, ewaste_type, quantity, description } = req.body;
  const errors = [];

  if (!full_name || full_name.trim().length < 3) errors.push('Full name must be at least 3 characters.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('A valid email is required.');
  if (!location || !location.trim()) errors.push('Location is required.');
  if (!ewaste_type) errors.push('E-waste type is required.');
  if (!quantity) errors.push('Quantity is required.');
  if (!description || description.trim().length < 10) errors.push('Description must be at least 10 characters.');

  if (errors.length) return res.status(400).json({ success: false, errors });

  const report = {
    id: reports.length + 1,
    full_name: full_name.trim(),
    email: email.trim(),
    phone: (phone || '').trim(),
    location: location.trim(),
    ewaste_type,
    quantity,
    description: description.trim(),
    image: req.file ? { name: req.file.originalname, size: req.file.size, type: req.file.mimetype } : null,
    created_at: new Date().toISOString(),
  };
  reports.push(report);

  res.status(201).json({
    success: true,
    message: `Thank you, ${report.full_name}! Your report (#${report.id}) has been submitted.`,
    data: report,
  });
});

// GET /api/reports  (view all submitted reports)
app.get('/api/reports', (req, res) => {
  res.json({ success: true, count: reports.length, data: reports });
});

/* ---------- Serve the frontend ---------- */
app.get('/',           (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/style.css',  (req, res) => res.sendFile(path.join(__dirname, 'style.css')));
app.get('/script.js',  (req, res) => res.sendFile(path.join(__dirname, 'script.js')));

/* ---------- Error handling ---------- */
app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'Endpoint not found.' }));

app.use((err, req, res, next) => {
  const status = err instanceof multer.MulterError ? 400 : 500;
  res.status(status).json({ success: false, message: err.message || 'Server error.' });
});

app.listen(PORT, () => {
  console.log(`EcoTech server running at http://localhost:${PORT}`);
});
