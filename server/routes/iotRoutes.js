const express = require('express');
const router = express.Router();
const iotController = require('../controllers/iotController');

// Telemetry ingestion endpoint for ESP32 nodes
router.post('/telemetry', iotController.postTelemetry);

// Remote command endpoint for buzzer and fence control
router.post('/device-command', iotController.postDeviceCommand);

module.exports = router;
