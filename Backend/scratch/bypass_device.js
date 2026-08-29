require('dotenv').config();
const db = require('../config/db.js');

async function main() {
    try {
        const [result] = await db.execute(
            "UPDATE users SET device_verification_required = 0 WHERE username = 'user_4'"
        );
        console.log("Disable device verification result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error updating users:", e);
    } finally {
        process.exit(0);
    }
}
main();
