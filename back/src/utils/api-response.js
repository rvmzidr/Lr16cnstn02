function successResponse(res, message, donnees = null, statusCode = 200) {
  return res.status(statusCode).json({
    succes: true,
    message,
    donnees,
  });
}

module.exports = {
  successResponse,
};
