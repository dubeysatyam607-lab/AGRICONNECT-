const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');

router.get('/search', imageController.searchImages);
router.all('/pixel-ai/crop-image', imageController.pixelAiCropImage);

module.exports = router;

