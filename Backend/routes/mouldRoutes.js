const express = require("express");
const multer = require("multer");
const { verifyToken, verifyPermission } = require("../middleware/authMiddleware.js");
const {
    addMould,
    getAllMouldsController,
    getMouldByIdController,
    updateMouldController,
    toggleMouldActiveController,
    downloadMouldFileController,
    deleteMouldController
} = require("../controllers/mouldController.js");

const router = express.Router();

// Multer: in-memory storage, 10 MB limit
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/add',          verifyToken, verifyPermission('mould', 'write'),  upload.single('file'), addMould);
router.get('/all',           verifyToken, verifyPermission('mould', 'read'),   getAllMouldsController);
router.get('/:id/file',      verifyToken, verifyPermission('mould', 'read'),   downloadMouldFileController);
router.get('/:id',           verifyToken, verifyPermission('mould', 'read'),   getMouldByIdController);
router.put('/update/:id',    verifyToken, verifyPermission('mould', 'update'), upload.single('file'), updateMouldController);
router.patch('/:id/toggle-active', verifyToken, verifyPermission('mould', 'update'), toggleMouldActiveController);
router.delete('/delete/:id', verifyToken, verifyPermission('mould', 'delete'), deleteMouldController);

module.exports = router;
