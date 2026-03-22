function getPagination(page = 1, limit = 10, maxLimit = 50) {
  const currentPage = Number.isFinite(Number(page)) ? Number(page) : 1;
  const currentLimit = Number.isFinite(Number(limit)) ? Number(limit) : 10;
  const safePage = Math.max(1, currentPage);
  const safeLimit = Math.min(Math.max(1, currentLimit), maxLimit);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

function buildMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

module.exports = {
  getPagination,
  buildMeta,
};
