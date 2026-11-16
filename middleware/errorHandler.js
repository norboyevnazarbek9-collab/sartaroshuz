const errorHandler = (err, req, res, next) => {
  console.error("Xatolik yuz berdi:", err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Serverda ichki xatolik yuz berdi!"
  });
};

module.exports = errorHandler;
