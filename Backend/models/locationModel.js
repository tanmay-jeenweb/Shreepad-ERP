const db = require("../config/db.js");

const createLocationsTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        location_name VARCHAR(255) NOT NULL UNIQUE,
        address TEXT,
        location_plant_no VARCHAR(255),
        plant_type_id INT,
        plant_address TEXT,
        added_by INT,
        device_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (plant_type_id) REFERENCES location_types(id) ON DELETE SET NULL,
        FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `;
    await db.query(query);
    console.log("Locations table created successfully");
    
    try {
      await db.query("ALTER TABLE locations ADD COLUMN active BOOLEAN DEFAULT TRUE");
      console.log("Added active column to locations table");
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.error("Error adding active column:", e);
      }
    }
  } catch (error) {
    console.error("Error creating locations table:", error);
  }
};

const createLocation = async (locationName, address, locationPlantNo, plantTypeId, plantAddress, addedBy, deviceId) => {
  try {
    const query = `
      INSERT INTO locations (location_name, address, location_plant_no, plant_type_id, plant_address, added_by, device_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [locationName, address, locationPlantNo, plantTypeId, plantAddress, addedBy, deviceId]);
    return result;
  } catch (error) {
    throw error;
  }
};

const getAllLocations = async (includeInactive = false) => {
  try {
    const query = `
      SELECT 
        l.id,
        l.location_name,
        l.address,
        l.location_plant_no,
        l.plant_type_id,
        COALESCE(lt.location_type_name, 'Unknown') AS plant_type_name,
        l.plant_address,
        l.added_by,
        COALESCE(u.name, 'Unknown') AS added_by_name,
        l.device_id,
        l.active,
        l.created_at,
        l.updated_at
      FROM locations l
      LEFT JOIN location_types lt ON l.plant_type_id = lt.id
      LEFT JOIN users u ON l.added_by = u.id
      ${includeInactive ? '' : 'WHERE l.active = TRUE'}
      ORDER BY l.created_at DESC
    `;
    const [rows] = await db.query(query);
    return rows;
  } catch (error) {
    throw error;
  }
};

const updateLocation = async (id, locationName, address, locationPlantNo, plantTypeId, plantAddress) => {
  try {
    const query = `
      UPDATE locations
      SET location_name = ?, address = ?, location_plant_no = ?, plant_type_id = ?, plant_address = ?, updated_at = NOW()
      WHERE id = ?
    `;
    const [result] = await db.query(query, [locationName, address, locationPlantNo, plantTypeId, plantAddress, id]);
    return result;
  } catch (error) {
    throw error;
  }
};

const deleteLocation = async (id) => {
  try {
    const query = `DELETE FROM locations WHERE id = ?`;
    const [result] = await db.query(query, [id]);
    return result;
  } catch (error) {
    throw error;
  }
};

const toggleLocationActive = async (id, active) => {
  try {
    const query = `UPDATE locations SET active = ? WHERE id = ?`;
    const [result] = await db.query(query, [active, id]);
    return result;
  } catch (error) {
    throw error;
  }
};

const getLocationById = async (id) => {
  try {
    const query = `SELECT * FROM locations WHERE id = ?`;
    const [rows] = await db.query(query, [id]);
    return rows[0];
  } catch (error) {
    throw error;
  }
};

module.exports = {
    createLocationsTable,
    createLocation,
    getAllLocations,
    updateLocation,
    deleteLocation,
    getLocationById,
    toggleLocationActive
};
