import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.render('portfolio', {
    title: 'Recap Portfolio',
    isPortfolio: true
  });
});

export default router;
