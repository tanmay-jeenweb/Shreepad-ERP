const {
    createClass,
    getAllClasses,
    updateClass,
    deleteClass,
    getClassById,
} = require('../models/classModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const addClass = async (req, res) => {
    try {
        const { className, name } = req.body;
        const targetName = (className !== undefined && className !== null) ? className : name;
        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        if (!targetName || !targetName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Class name is required',
            });
        }

        const newClass = await createClass(targetName.trim(), addedBy, deviceId);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Class Master',
            'created',
            null,
            {
                id: newClass.insertId,
                class_name: targetName.trim(),
                added_by: addedBy,
                device_id: deviceId,
            }
        );

        res.status(201).json({
            success: true,
            message: 'Class added successfully',
            data: newClass,
        });
    } catch (error) {
        console.error('Error adding class:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Class name already exists',
            });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getAllClassesController = async (req, res) => {
    try {
        const classes = await getAllClasses();
        res.status(200).json({
            success: true,
            message: 'Classes retrieved successfully',
            data: classes,
        });
    } catch (error) {
        console.error('Error retrieving classes:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateClassController = async (req, res) => {
    try {
        const { id } = req.params;
        const { className, name } = req.body;
        const targetName = (className !== undefined && className !== null) ? className : name;

        if (!targetName || !targetName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Class name is required',
            });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getClassById(id);

        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Class not found' });
        }

        await updateClass(id, targetName.trim());

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Class Master',
            'updated',
            beforeData,
            { ...beforeData, class_name: targetName.trim() }
        );

        res.status(200).json({ success: true, message: 'Class updated successfully' });
    } catch (error) {
        console.error('Error updating class:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Class name already exists',
            });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const deleteClassController = async (req, res) => {
    try {
        const { id } = req.params;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        const beforeData = await getClassById(id);

        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Class not found' });
        }

        await deleteClass(id);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Class Master',
            'deleted',
            beforeData,
            null
        );

        res.status(200).json({ success: true, message: 'Class deleted successfully' });
    } catch (error) {
        console.error('Error deleting class:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    addClass,
    getAllClassesController,
    updateClassController,
    deleteClassController,
};
