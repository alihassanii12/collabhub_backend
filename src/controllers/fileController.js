const multer = require('multer');
const db = require('../config/database');

// Check if running on Vercel
const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

// Simple memory storage (no disk writes)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('file');

const uploadFile = async (req, res) => {
  // Disable file uploads on Vercel
  if (isVercel) {
    return res.status(503).json({ 
      error: 'File uploads are disabled on Vercel. Use local development for file uploads.' 
    });
  }

  // Local development code
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const { team_id } = req.body;
    
    // For local development, store file path
    const fileUrl = '/uploads/' + req.file.filename;
    
    const result = await db.query(
      'INSERT INTO files (team_id, uploaded_by, file_url, file_name, file_type, file_size) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [team_id, req.user.id, fileUrl, req.file.originalname, req.file.mimetype, req.file.size]
    );
    
    res.status(201).json(result.rows[0]);
  });
};

const getFiles = async (req, res) => {
  const { team_id } = req.query;
  let query = 'SELECT * FROM files';
  const params = [];
  if (team_id) { query += ' WHERE team_id = $1'; params.push(team_id); }
  query += ' ORDER BY created_at DESC';
  const result = await db.query(query, params);
  res.json(result.rows);
};

const deleteFile = async (req, res) => {
  await db.query('DELETE FROM files WHERE id = $1', [req.params.id]);
  res.json({ message: 'File deleted' });
};

module.exports = { uploadFile, getFiles, deleteFile };