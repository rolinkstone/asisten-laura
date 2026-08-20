/**
 * Middleware 404 - route tidak ditemukan
 */
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route tidak ditemukan: ${req.method} ${req.originalUrl}`
  });
};

/**
 * Error handler terpusat
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // Duplicate entry (MySQL error 1062)
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Data sudah ada / duplikat'
    });
  }

  // Foreign key constraint
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      success: false,
      message: 'Data sedang digunakan oleh data lain'
    });
  }

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
};

module.exports = { notFound, errorHandler };
