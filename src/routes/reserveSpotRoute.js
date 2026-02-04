const express = require('express');
const router = express.Router();
const controller = require('../controllers/reserveSpotController');

router.get('/getform', controller.getAllReserveSpots);
router.put('/:id', controller.updateReserveSpot);
router.delete('/:id', controller.deleteReserveSpot);
router.post('/submit', controller.reserveSpot);

module.exports = router;