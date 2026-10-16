const express = require('express');
const router = express.Router();
const iotController = require('../controllers/iotController');

// Device query endpoint (status & latest telemetry)
router.get('/devices', iotController.getDevices);

// Telemetry ingestion endpoint for ESP32 nodes
router.post('/telemetry', iotController.postTelemetry);

// Command queue endpoint (app → server)
router.post('/device-command', iotController.postDeviceCommand);

// Command polling endpoint (ESP32 pulls work)
router.get('/commands', iotController.getCommands);

// Command acknowledgment endpoint (ESP32 confirms execution)
router.post('/command-ack', iotController.postCommandAck);

module.exports = router;