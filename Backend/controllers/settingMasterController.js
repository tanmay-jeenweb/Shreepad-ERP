const { getSettings, upsertSettings } = require('../models/settingMasterModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const getSettingsController = async (req, res) => {
    try {
        const settings = await getSettings();
        res.status(200).json({
            success: true,
            message: 'Settings retrieved successfully',
            data: settings || {
                batch_year: '',
                prefix_finished_goods: 'FG',
                prefix_semi_finished_goods: 'SFG',
                prefix_raw_materials: 'RM',
                prefix_store_consumed: 'SC',
                prefix_packaging_material: 'PM',
                prefix_waste_and_scrap: 'WS',
                prefix_capital_equipment: 'CE',
                prefix_assembly_item: 'AI',
                prefix_uniform_and_other: 'UI',
                prefix_service: 'SRV',
                prefix_other: 'OTH',
                wait_hour: 0
            }
        });
    } catch (error) {
        console.error('Error retrieving settings:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getBatchSettingsController = async (req, res) => {
    try {
        const settings = await getSettings();
        res.status(200).json({
            success: true,
            data: {
                batch_year: settings?.batch_year || '',
                prefix_finished_goods: settings?.prefix_finished_goods || 'FG',
                prefix_semi_finished_goods: settings?.prefix_semi_finished_goods || 'SFG',
                prefix_raw_materials: settings?.prefix_raw_materials || 'RM',
                prefix_store_consumed: settings?.prefix_store_consumed || 'SC',
                prefix_packaging_material: settings?.prefix_packaging_material || 'PM',
                prefix_waste_and_scrap: settings?.prefix_waste_and_scrap || 'WS',
                prefix_capital_equipment: settings?.prefix_capital_equipment || 'CE',
                prefix_assembly_item: settings?.prefix_assembly_item || 'AI',
                prefix_uniform_and_other: settings?.prefix_uniform_and_other || 'UI',
                prefix_service: settings?.prefix_service || 'SRV',
                prefix_other: settings?.prefix_other || 'OTH',
                wait_hour: settings?.wait_hour ?? 0
            }
        });
    } catch (error) {
        console.error('Error retrieving batch settings:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const upsertSettingsController = async (req, res) => {
    try {
        const payload = req.body;
        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        const beforeData = await getSettings();

        // Ensure fields are properly trimmed or set to default
        const dataToSave = {
            batch_year: payload.batch_year ? payload.batch_year.trim() : null,
            prefix_finished_goods: payload.prefix_finished_goods ? payload.prefix_finished_goods.trim() : 'FG',
            prefix_semi_finished_goods: payload.prefix_semi_finished_goods ? payload.prefix_semi_finished_goods.trim() : 'SFG',
            prefix_raw_materials: payload.prefix_raw_materials ? payload.prefix_raw_materials.trim() : 'RM',
            prefix_store_consumed: payload.prefix_store_consumed ? payload.prefix_store_consumed.trim() : 'SC',
            prefix_packaging_material: payload.prefix_packaging_material ? payload.prefix_packaging_material.trim() : 'PM',
            prefix_waste_and_scrap: payload.prefix_waste_and_scrap ? payload.prefix_waste_and_scrap.trim() : 'WS',
            prefix_capital_equipment: payload.prefix_capital_equipment ? payload.prefix_capital_equipment.trim() : 'CE',
            prefix_assembly_item: payload.prefix_assembly_item ? payload.prefix_assembly_item.trim() : 'AI',
            prefix_uniform_and_other: payload.prefix_uniform_and_other ? payload.prefix_uniform_and_other.trim() : 'UI',
            prefix_service: payload.prefix_service ? payload.prefix_service.trim() : 'SRV',
            prefix_other: payload.prefix_other ? payload.prefix_other.trim() : 'OTH',
            wait_hour: payload.wait_hour !== undefined && payload.wait_hour !== null && payload.wait_hour !== "" ? Number(payload.wait_hour) : 0,
        };

        const result = await upsertSettings(dataToSave, addedBy, deviceId);

        const beforeWaitHour = beforeData ? parseInt(beforeData.wait_hour || 0, 10) : 0;
        const afterWaitHour = dataToSave.wait_hour;

        if (beforeWaitHour !== afterWaitHour) {
            try {
                const db = require('../config/db.js');
                const [machineRows] = await db.execute(
                    `SELECT DISTINCT machine_id FROM work_order_items WHERE machine_id IS NOT NULL`
                );
                
                const { rescheduleMachine } = require('../models/machineScheduleModel.js');
                const connection = await db.getConnection();
                try {
                    await connection.beginTransaction();
                    for (const row of machineRows) {
                        await rescheduleMachine(row.machine_id, connection, afterWaitHour);
                    }
                    await connection.commit();
                } catch (err) {
                    await connection.rollback();
                    throw err;
                } finally {
                    connection.release();
                }
            } catch (err) {
                console.error("Failed to reschedule machines after settings update:", err);
            }
        }

        const afterData = await getSettings();

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Setting Master',
            result.action === 'created' ? 'created' : 'updated',
            beforeData,
            afterData
        );

        res.status(200).json({
            success: true,
            message: `Settings ${result.action === 'created' ? 'saved' : 'updated'} successfully`,
            data: afterData
        });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    getSettingsController,
    getBatchSettingsController,
    upsertSettingsController
};
