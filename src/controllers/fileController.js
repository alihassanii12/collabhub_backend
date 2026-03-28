const multer = require('multer');
const path = require('path');
const db = require('../config/database');

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }).single('file');

const uploadFile = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const { team_id } = req.body;
    const result = await db.query('INSERT INTO files (team_id, uploaded_by, file_url, file_name, file_type, file_size) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [team_id, req.user.id, '/uploads/' + req.file.filename, req.file.originalname, req.file.mimetype, req.file.size]);
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