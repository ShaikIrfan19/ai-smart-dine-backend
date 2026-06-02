const express = require('express');
const { protect, authorize } = require('../middleware/auth.middleware');
const { getFoodRecommendations, chatWithAI, getRestaurantInsights, suggestTable } = require('../controllers/ai.controller');

const router = express.Router();
router.use(protect);
router.post('/recommendations', getFoodRecommendations);
router.post('/chat', chatWithAI);
router.get('/insights/:restaurantId', getRestaurantInsights);
router.post('/suggest-table', suggestTable);

module.exports = router;
