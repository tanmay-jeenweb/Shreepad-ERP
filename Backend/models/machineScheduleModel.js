const db = require('../config/db.js');

const createMachineScheduleTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS machine_schedule (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            machine_id          INT NOT NULL,
            work_order_item_id  INT NOT NULL,
            schedule_date       DATE NOT NULL,
            start_hour          DECIMAL(6,3) NOT NULL,
            end_hour            DECIMAL(6,3) NOT NULL,
            booked_hours        DECIMAL(6,3) NOT NULL,
            created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
            FOREIGN KEY (work_order_item_id) REFERENCES work_order_items(id) ON DELETE CASCADE
        )
    `;
    await db.execute(query);
    console.log('machine_schedule table ready');
};

const getWorkingHoursForDate = async (machineId, dateStr) => {
    const query = `
        SELECT working_hour
        FROM working_hours
        WHERE machine_id = ?
          AND from_date <= ?
          AND to_date >= ?
        ORDER BY id DESC
        LIMIT 1
    `;
    const [rows] = await db.execute(query, [machineId, dateStr, dateStr]);
    if (rows.length === 0) {
        return 8.0; // Default fallback to 8.0 hours
    }
    return parseFloat(rows[0].working_hour);
};

const getAlreadyBookedHoursForDate = async (machineId, dateStr) => {
    const query = `
        SELECT COALESCE(SUM(booked_hours), 0) as total_booked
        FROM machine_schedule
        WHERE machine_id = ? AND schedule_date = ?
    `;
    const [rows] = await db.execute(query, [machineId, dateStr]);
    return parseFloat(rows[0].total_booked);
};

const getNextFreeSlot = async (machineId) => {
    // Start from today (IST)
    let currentMs = new Date().getTime();
    let tries = 0;
    while (tries < 365) { // Limit to 1 year ahead to prevent infinite loop
        const dateStr = new Date(currentMs).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        
        const workingHrs = await getWorkingHoursForDate(machineId, dateStr);
        if (workingHrs !== null && workingHrs > 0) {
            const alreadyBooked = await getAlreadyBookedHoursForDate(machineId, dateStr);
            const availableHrs = workingHrs - alreadyBooked;
            
            if (availableHrs > 0.001) { // Floating point comparison tolerance
                 return {
                     date: dateStr,
                     start_hour: alreadyBooked
                 };
            }
        }
        
        currentMs += 24 * 60 * 60 * 1000;
        tries++;
    }
    return null;
};

const bookMachineTime = async (machineId, workOrderItemId, totalHours, txConnection = null, startAfter = null) => {
    const connection = txConnection || await db.getConnection();
    const isOwnTx = !txConnection;
    try {
        if (isOwnTx) await connection.beginTransaction();

        let remainingHours = parseFloat(totalHours);
        
        // Start from today (IST) or startAfter.date if provided
        let currentMs = new Date().getTime();
        if (startAfter && startAfter.date) {
            currentMs = new Date(`${startAfter.date}T12:00:00+05:30`).getTime();
        }
        
        let tries = 0;
        const maxTries = 365; // Prevent infinite loops
        
        const scheduleEntries = [];
        
        // Deep copy startAfter so we can modify it locally in the loop
        let localStartAfter = startAfter ? { ...startAfter } : null;

        while (remainingHours > 0.001 && tries < maxTries) {
            const dateStr = new Date(currentMs).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

            // Use connection for queries within transaction
            const [whRows] = await connection.execute(`
                SELECT working_hour
                FROM working_hours
                WHERE machine_id = ?
                  AND from_date <= ?
                  AND to_date >= ?
                ORDER BY id DESC
                LIMIT 1
            `, [machineId, dateStr, dateStr]);

            let workingHrs = 8.0;
            if (whRows.length > 0) {
                workingHrs = parseFloat(whRows[0].working_hour);
            }

            if (workingHrs === 0) {
                // Holiday, skip to next day
                if (localStartAfter && localStartAfter.date === dateStr) {
                    const nextD = new Date(currentMs);
                    nextD.setDate(nextD.getDate() + 1);
                    localStartAfter.date = nextD.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                }
                currentMs += 24 * 60 * 60 * 1000;
                tries++;
                continue;
            }

            // Handle startAfter date alignment
            if (localStartAfter && localStartAfter.date === dateStr) {
                if (localStartAfter.hour > workingHrs) {
                    // Reduce startAfter.hour and push to next day
                    localStartAfter.hour -= workingHrs;
                    const nextD = new Date(currentMs);
                    nextD.setDate(nextD.getDate() + 1);
                    localStartAfter.date = nextD.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                    
                    // Skip today
                    currentMs += 24 * 60 * 60 * 1000;
                    tries++;
                    continue;
                }
            }

            const [bkRows] = await connection.execute(`
                SELECT COALESCE(SUM(booked_hours), 0) as total_booked
                FROM machine_schedule
                WHERE machine_id = ? AND schedule_date = ?
            `, [machineId, dateStr]);
            
            let alreadyBooked = parseFloat(bkRows[0].total_booked);

            // Apply startAfter constraint for today if it matches
            if (localStartAfter && localStartAfter.date === dateStr) {
                alreadyBooked = Math.max(alreadyBooked, parseFloat(localStartAfter.hour));
            }

            const availableHrs = workingHrs - alreadyBooked;

            if (availableHrs <= 0.001) {
                // Fully booked, move to next day
                currentMs += 24 * 60 * 60 * 1000;
                tries++;
                continue;
            }

            const bookNow = Math.min(remainingHours, availableHrs);
            const startHour = alreadyBooked;
            const endHour = startHour + bookNow;

            scheduleEntries.push([
                machineId,
                workOrderItemId,
                dateStr,
                startHour.toFixed(3),
                endHour.toFixed(3),
                bookNow.toFixed(3)
            ]);

            remainingHours -= bookNow;
            if (remainingHours > 0.001) {
                currentMs += 24 * 60 * 60 * 1000;
            }
            tries++;
        }
        
        if (remainingHours > 0.001) {
             throw new Error("Could not find enough available working hours to schedule the full production time within the next year.");
        }

        if (scheduleEntries.length > 0) {
            const insertQuery = `
                INSERT INTO machine_schedule (machine_id, work_order_item_id, schedule_date, start_hour, end_hour, booked_hours)
                VALUES ?
            `;
            await connection.query(insertQuery, [scheduleEntries]);
        }

        if (isOwnTx) await connection.commit();
        return true;
    } catch (error) {
        if (isOwnTx) await connection.rollback();
        throw error;
    } finally {
        if (isOwnTx) connection.release();
    }
};

const deleteScheduleByWorkOrderItemId = async (workOrderItemId) => {
    const query = `DELETE FROM machine_schedule WHERE work_order_item_id = ?`;
    await db.execute(query, [workOrderItemId]);
};

const getMachineSchedule = async (machineId, fromDate, toDate) => {
    const query = `
        SELECT ms.*, woi.work_order_id, wo.work_order_no, m.material_name, m.material_code
        FROM machine_schedule ms
        JOIN work_order_items woi ON ms.work_order_item_id = woi.id
        JOIN work_orders wo ON woi.work_order_id = wo.id
        JOIN materials m ON woi.material_id = m.id
        WHERE ms.machine_id = ? AND ms.schedule_date >= ? AND ms.schedule_date <= ?
        ORDER BY ms.schedule_date ASC, ms.start_hour ASC
    `;
    const [rows] = await db.execute(query, [machineId, fromDate, toDate]);
    return rows;
};

// Also need a function to get all working hours for a machine in a date range for the UI
const getWorkingHoursForDateRange = async (machineId, fromDate, toDate) => {
    // This is tricky because working_hours are defined as ranges, and we need a per-day breakdown for the calendar.
    // We will fetch all relevant ranges and the frontend/controller can map them to dates.
    const query = `
        SELECT from_date, to_date, working_hour, no_work
        FROM working_hours
        WHERE machine_id = ?
          AND from_date <= ?
          AND to_date >= ?
        ORDER BY id ASC
    `;
    const [rows] = await db.execute(query, [machineId, toDate, fromDate]);
    return rows;
};

const formatDateToISO = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

const rescheduleMachine = async (machineId, connection, waitHour = 0) => {
    // 1. Fetch all work order items for this machine, ordered by sort_order
    const [items] = await connection.execute(
        `SELECT id, production_time_hours FROM work_order_items 
         WHERE machine_id = ? AND production_time_hours > 0 AND COALESCE(is_on_hold, 0) = 0
         ORDER BY sort_order ASC, id ASC`,
        [machineId]
    );

    // 2. Delete all existing schedule entries for these items
    if (items.length > 0) {
        const itemIds = items.map(item => item.id);
        await connection.query(
            `DELETE FROM machine_schedule WHERE work_order_item_id IN (?)`,
            [itemIds]
        );
    }

    // 3. Re-book them one by one
    let startAfter = null;
    for (const item of items) {
        await bookMachineTime(machineId, item.id, item.production_time_hours, connection, startAfter);

        // Fetch the last slot for this item to determine startAfter for the next one
        const [lastSlot] = await connection.execute(
            `SELECT schedule_date, end_hour FROM machine_schedule
             WHERE work_order_item_id = ? 
             ORDER BY schedule_date DESC, end_hour DESC 
             LIMIT 1`,
            [item.id]
        );

        if (lastSlot.length > 0 && waitHour > 0) {
            startAfter = {
                date: formatDateToISO(lastSlot[0].schedule_date),
                hour: parseFloat(lastSlot[0].end_hour) + waitHour
            };
        } else {
            startAfter = null;
        }
    }
};

const rescheduleFromToday = async (machineId, connection, waitHour = 0) => {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    // 1. Fetch all work order items for this machine, ordered by sort_order
    const [items] = await connection.execute(
        `SELECT id, production_time_hours FROM work_order_items 
         WHERE machine_id = ? AND production_time_hours > 0 AND COALESCE(is_on_hold, 0) = 0
         ORDER BY sort_order ASC, id ASC`,
        [machineId]
    );

    // 2. Delete future schedule entries for these items (schedule_date >= today)
    if (items.length > 0) {
        const itemIds = items.map(item => item.id);
        await connection.query(
            `DELETE FROM machine_schedule WHERE work_order_item_id IN (?) AND schedule_date >= ?`,
            [itemIds, todayStr]
        );
    }

    // 3. Re-book remaining hours one by one
    let startAfter = null;
    for (const item of items) {
        // Calculate already consumed hours (schedule_date < today)
        const [consumedRows] = await connection.execute(
            `SELECT COALESCE(SUM(booked_hours), 0) as total_consumed 
             FROM machine_schedule 
             WHERE work_order_item_id = ? AND schedule_date < ?`,
            [item.id, todayStr]
        );
        const consumed = parseFloat(consumedRows[0].total_consumed);
        const remaining = parseFloat(item.production_time_hours) - consumed;

        if (remaining <= 0.001) {
            // Fully completed in the past, skip to avoid past-date cursor issues
            startAfter = null;
            continue;
        }

        await bookMachineTime(machineId, item.id, remaining, connection, startAfter);

        // Fetch the last slot for this item to determine startAfter for the next one
        const [lastSlot] = await connection.execute(
            `SELECT schedule_date, end_hour FROM machine_schedule
             WHERE work_order_item_id = ? 
             ORDER BY schedule_date DESC, end_hour DESC 
             LIMIT 1`,
            [item.id]
        );

        if (lastSlot.length > 0 && waitHour > 0) {
            startAfter = {
                date: formatDateToISO(lastSlot[0].schedule_date),
                hour: parseFloat(lastSlot[0].end_hour) + waitHour
            };
        } else {
            startAfter = null;
        }
    }
};

const reorderWorkOrderItem = async (machineId, workOrderItemId, direction, waitHour = 0) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Fetch all items for this machine ordered by sort_order
        const [items] = await connection.execute(
            `SELECT id, sort_order FROM work_order_items 
             WHERE machine_id = ? AND COALESCE(is_on_hold, 0) = 0
             ORDER BY sort_order ASC, id ASC`,
            [machineId]
        );

        // Find the index of target item
        const targetIndex = items.findIndex(item => item.id === parseInt(workOrderItemId, 10));
        if (targetIndex === -1) {
            throw new Error(`Item ${workOrderItemId} not found on machine ${machineId}`);
        }

        let swapIndex = -1;
        if (direction === 'up') {
            swapIndex = targetIndex - 1;
        } else if (direction === 'down') {
            swapIndex = targetIndex + 1;
        }

        // If swapIndex is valid, swap the sort_orders
        if (swapIndex >= 0 && swapIndex < items.length) {
            const targetItem = items[targetIndex];
            const swapItem = items[swapIndex];

            // Update in DB
            await connection.execute(
                `UPDATE work_order_items SET sort_order = ? WHERE id = ?`,
                [swapItem.sort_order, targetItem.id]
            );
            await connection.execute(
                `UPDATE work_order_items SET sort_order = ? WHERE id = ?`,
                [targetItem.sort_order, swapItem.id]
            );

            // 2. Trigger rescheduling
            await rescheduleMachine(machineId, connection, waitHour);
        }

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const moveWorkOrderItemToPosition = async (machineId, workOrderItemId, newPosition, waitHour = 0) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Fetch all non-held items for this machine ordered by sort_order
        const [items] = await connection.execute(
            `SELECT id, sort_order FROM work_order_items 
             WHERE machine_id = ? AND COALESCE(is_on_hold, 0) = 0
             ORDER BY sort_order ASC, id ASC`,
            [machineId]
        );

        // Find the index of target item
        const targetIndex = items.findIndex(item => item.id === parseInt(workOrderItemId, 10));
        if (targetIndex === -1) {
            throw new Error(`Item ${workOrderItemId} not found on machine ${machineId} or is on hold`);
        }

        // Validate newPosition boundaries
        let destPos = parseInt(newPosition, 10);
        if (destPos < 0) destPos = 0;
        if (destPos >= items.length) destPos = items.length - 1;

        if (targetIndex !== destPos) {
            // Remove from old position and insert at new position
            const [targetItem] = items.splice(targetIndex, 1);
            items.splice(destPos, 0, targetItem);

            // Re-assign sort_orders sequentially and bulk update
            for (let i = 0; i < items.length; i++) {
                const newSortOrder = i + 1;
                if (items[i].sort_order !== newSortOrder) {
                    await connection.execute(
                        `UPDATE work_order_items SET sort_order = ? WHERE id = ?`,
                        [newSortOrder, items[i].id]
                    );
                }
            }

            // 2. Trigger rescheduling
            await rescheduleMachine(machineId, connection, waitHour);
        }

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getMachineQueue = async (machineId) => {
    const query = `
        SELECT
          woi.id, woi.sort_order, woi.production_time_hours,
          wo.work_order_no, wo.work_order_date,
          m.material_name, m.material_code,
          mac.name AS machine_name, mac.machine_number,
          MIN(ms.schedule_date) AS running_start_date,
          MAX(ms.schedule_date)  AS running_end_date
        FROM work_order_items woi
        JOIN work_orders wo ON woi.work_order_id = wo.id
        JOIN materials m ON woi.material_id = m.id
        JOIN machines mac ON woi.machine_id = mac.id
        LEFT JOIN machine_schedule ms ON ms.work_order_item_id = woi.id
        WHERE woi.machine_id = ? AND COALESCE(woi.is_on_hold, 0) = 0
        GROUP BY woi.id
        ORDER BY woi.sort_order ASC
    `;
    const [rows] = await db.execute(query, [machineId]);
    return rows;
};

const toggleWorkOrderItemHold = async (workOrderItemId, holdState, waitHour = 0) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Fetch machine_id first
        const [woiRows] = await connection.execute(
            `SELECT machine_id FROM work_order_items WHERE id = ?`,
            [workOrderItemId]
        );
        const machineId = woiRows[0]?.machine_id;

        // 1. If resuming (holdState === 0), move to the bottom of the queue by assigning the highest sort_order
        if (holdState === 0 && machineId) {
            const [maxRows] = await connection.execute(
                `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order 
                 FROM work_order_items 
                 WHERE machine_id = ?`,
                [machineId]
            );
            const nextOrder = maxRows[0]?.next_order || 1;

            await connection.execute(
                `UPDATE work_order_items SET sort_order = ? WHERE id = ?`,
                [nextOrder, workOrderItemId]
            );
        }

        // 2. Update hold state
        await connection.execute(
            `UPDATE work_order_items SET is_on_hold = ? WHERE id = ?`,
            [holdState, workOrderItemId]
        );

        // 3. If placing on hold, delete the machine schedule entries for this item
        if (holdState === 1) {
            await connection.execute(
                `DELETE FROM machine_schedule WHERE work_order_item_id = ?`,
                [workOrderItemId]
            );
        }

        // 4. Reschedule the machine
        if (machineId) {
            await rescheduleMachine(machineId, connection, waitHour);
        }

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    createMachineScheduleTable,
    bookMachineTime,
    deleteScheduleByWorkOrderItemId,
    getMachineSchedule,
    getWorkingHoursForDateRange,
    getNextFreeSlot,
    rescheduleMachine,
    rescheduleFromToday,
    reorderWorkOrderItem,
    moveWorkOrderItemToPosition,
    getMachineQueue,
    toggleWorkOrderItemHold
};
