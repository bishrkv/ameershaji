const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'gallery-data.json');
const REVIEWS_FILE = path.join(__dirname, 'reviews-data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve admin.html explicitly so /admin.html works
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve gallery.html explicitly so /gallery.html works
app.get('/gallery.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'gallery.html'));
});

function readGallery() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

function saveGallery(items) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf8');
}

function readReviews() {
  try {
    const raw = fs.readFileSync(REVIEWS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

function saveReviews(items) {
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify(items, null, 2), 'utf8');
}

const BOOKINGS_FILE = path.join(__dirname, 'bookings-data.json');

function readBookings() {
  try {
    const raw = fs.readFileSync(BOOKINGS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

function saveBookings(items) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(items, null, 2), 'utf8');
}

app.post('/api/bookings', (req, res) => {
  const { name, email, phone, contactMethod, date, timeWindow, timeSlot, timezone, message } = req.body;
  if (!name || !email || !phone || !date || !timeWindow || !timeSlot) {
    return res.status(400).json({ error: 'Name, email, phone, date, time window, and time slot are required.' });
  }

  const bookings = readBookings();
  const booking = {
    id: Date.now(),
    name: String(name).trim(),
    email: String(email).trim(),
    phone: String(phone).trim(),
    contactMethod: String(contactMethod || 'Email').trim(),
    date: String(date).trim(),
    timeWindow: String(timeWindow).trim(),
    timeSlot: String(timeSlot).trim(),
    timezone: String(timezone || 'Asia/Kolkata (GMT+5:30)').trim(),
    message: String(message || '').trim(),
    createdAt: new Date().toISOString(),
  };

  bookings.unshift(booking);
  saveBookings(bookings);
  res.json({ success: true, booking });
});

app.get('/api/gallery', (req, res) => {
  const gallery = readGallery();
  res.json(gallery);
});

app.post('/api/gallery', (req, res) => {
  const { image, caption } = req.body;
  if (!image || !caption) {
    return res.status(400).json({ error: 'Image URL and caption are required.' });
  }

  const gallery = readGallery();
  gallery.unshift({ image, caption, visible: true });
  saveGallery(gallery);
  res.json(gallery);
});

app.patch('/api/gallery/reorder', (req, res) => {
  const { fromIndex, toIndex } = req.body;
  const gallery = readGallery();
  const from = Number(fromIndex);
  const to = Number(toIndex);

  if (Number.isNaN(from) || Number.isNaN(to) || from < 0 || to < 0 || from >= gallery.length || to >= gallery.length) {
    return res.status(400).json({ error: 'Invalid reorder request.' });
  }

  const [item] = gallery.splice(from, 1);
  gallery.splice(to, 0, item);
  saveGallery(gallery);
  res.json(gallery);
});

app.patch('/api/gallery/:index', (req, res) => {
  const index = Number(req.params.index);
  const gallery = readGallery();

  if (Number.isNaN(index) || index < 0 || index >= gallery.length) {
    return res.status(400).json({ error: 'Invalid gallery item index.' });
  }

  const item = gallery[index];
  const { image, caption, visible } = req.body;

  if (image !== undefined) {
    item.image = String(image).trim();
  }
  if (caption !== undefined) {
    item.caption = String(caption).trim();
  }
  if (visible !== undefined) {
    item.visible = Boolean(visible);
  }

  if (!item.image || !item.caption) {
    return res.status(400).json({ error: 'Image URL and caption are required.' });
  }

  saveGallery(gallery);
  res.json(gallery);
});

app.delete('/api/gallery/:index', (req, res) => {
  const { fromIndex, toIndex } = req.body;
  const gallery = readGallery();
  const from = Number(fromIndex);
  const to = Number(toIndex);

  if (Number.isNaN(from) || Number.isNaN(to) || from < 0 || to < 0 || from >= gallery.length || to >= gallery.length) {
    return res.status(400).json({ error: 'Invalid reorder request.' });
  }

  const [item] = gallery.splice(from, 1);
  gallery.splice(to, 0, item);
  saveGallery(gallery);
  res.json(gallery);
});

app.delete('/api/gallery/:index', (req, res) => {
  const index = Number(req.params.index);
  const gallery = readGallery();
  if (Number.isNaN(index) || index < 0 || index >= gallery.length) {
    return res.status(400).json({ error: 'Invalid gallery item index.' });
  }
  gallery.splice(index, 1);
  saveGallery(gallery);
  res.json(gallery);
});

app.get('/api/reviews', (req, res) => {
  res.json(readReviews());
});

app.post('/api/reviews', (req, res) => {
  const { name, role, text, image } = req.body;
  if (!name || !role || !text) {
    return res.status(400).json({ error: 'Name, role, and review text are required.' });
  }
  const reviews = readReviews();
  reviews.unshift({ name, role, text, image: image || '' });
  saveReviews(reviews);
  res.json(reviews);
});

app.patch('/api/reviews/:index', (req, res) => {
  const index = Number(req.params.index);
  const reviews = readReviews();
  if (Number.isNaN(index) || index < 0 || index >= reviews.length) {
    return res.status(400).json({ error: 'Invalid review index.' });
  }
  const item = reviews[index];
  const { name, role, text, image } = req.body;
  if (name !== undefined) item.name = String(name).trim();
  if (role !== undefined) item.role = String(role).trim();
  if (text !== undefined) item.text = String(text).trim();
  if (image !== undefined) item.image = String(image).trim();
  if (!item.name || !item.role || !item.text) {
    return res.status(400).json({ error: 'Name, role, and review text are required.' });
  }
  saveReviews(reviews);
  res.json(reviews);
});

app.delete('/api/reviews/:index', (req, res) => {
  const index = Number(req.params.index);
  const reviews = readReviews();
  if (Number.isNaN(index) || index < 0 || index >= reviews.length) {
    return res.status(400).json({ error: 'Invalid review index.' });
  }
  reviews.splice(index, 1);
  saveReviews(reviews);
  res.json(reviews);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
