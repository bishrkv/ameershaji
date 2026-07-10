const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(os.tmpdir(), 'ameer-shaji-gallery');
const DATA_FILE = path.join(DATA_DIR, 'gallery-data.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews-data.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings-data.json');
const LOCAL_DATA_FILE = path.join(__dirname, 'gallery-data.json');
const LOCAL_REVIEWS_FILE = path.join(__dirname, 'reviews-data.json');
const LOCAL_BOOKINGS_FILE = path.join(__dirname, 'bookings-data.json');

const memoryStore = {
  gallery: null,
  reviews: null,
  bookings: null,
};

function ensureDataDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (error) {
    // Ignore and continue with in-memory storage if the directory cannot be created.
  }
}

function readJsonFile(filePath, fallback, localFilePath) {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (localFilePath) {
      try {
        const localRaw = fs.readFileSync(localFilePath, 'utf8');
        const parsed = JSON.parse(localRaw);
        writeJsonFile(filePath, parsed);
        return parsed;
      } catch (localError) {
        // Fall back to the in-memory default.
      }
    }
    return fallback;
  }
}

function writeJsonFile(filePath, data, localFilePath) {
  ensureDataDir();
  const serialized = JSON.stringify(data, null, 2);
  try {
    fs.writeFileSync(filePath, serialized, 'utf8');
  } catch (error) {
    // Ignore write errors and keep using memory storage.
  }

  if (localFilePath) {
    try {
      fs.writeFileSync(localFilePath, serialized, 'utf8');
    } catch (error) {
      // Ignore local write errors to keep deployment-safe behavior.
    }
  }
}

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
  if (memoryStore.gallery !== null) {
    return memoryStore.gallery;
  }
  const data = readJsonFile(DATA_FILE, [], LOCAL_DATA_FILE);
  memoryStore.gallery = Array.isArray(data) ? data : [];
  return memoryStore.gallery;
}

function saveGallery(items) {
  memoryStore.gallery = Array.isArray(items) ? items : [];
  writeJsonFile(DATA_FILE, memoryStore.gallery, LOCAL_DATA_FILE);
}

function readReviews() {
  if (memoryStore.reviews !== null) {
    return memoryStore.reviews;
  }
  const data = readJsonFile(REVIEWS_FILE, [], LOCAL_REVIEWS_FILE);
  memoryStore.reviews = Array.isArray(data) ? data : [];
  return memoryStore.reviews;
}

function saveReviews(items) {
  memoryStore.reviews = Array.isArray(items) ? items : [];
  writeJsonFile(REVIEWS_FILE, memoryStore.reviews, LOCAL_REVIEWS_FILE);
}

function readBookings() {
  if (memoryStore.bookings !== null) {
    return memoryStore.bookings;
  }
  const data = readJsonFile(BOOKINGS_FILE, [], LOCAL_BOOKINGS_FILE);
  memoryStore.bookings = Array.isArray(data) ? data : [];
  return memoryStore.bookings;
}

function saveBookings(items) {
  memoryStore.bookings = Array.isArray(items) ? items : [];
  writeJsonFile(BOOKINGS_FILE, memoryStore.bookings, LOCAL_BOOKINGS_FILE);
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
