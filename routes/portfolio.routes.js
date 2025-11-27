const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('portfolio', {
    title: 'Recap Portfolio',
    isPortfolio: true
  });
});

module.exports = router;
