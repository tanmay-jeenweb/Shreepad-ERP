require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { connectDB } = require("./config/db.js");

const authRoutes = require("./routes/authRoutes.js");
const adminRoutes = require("./routes/adminRoutes.js");
const userTypeMasterRoutes = require("./routes/userTypeMasterRoutes.js");
const locationTypeRoutes = require("./routes/locationTypeRoutes.js");
const locationRoutes = require("./routes/locationRoutes.js");
const machineTypeRoutes = require("./routes/machineTypeRoutes.js");
const machineRoutes = require("./routes/machineRoutes.js");
const userPreferenceRoutes = require("./routes/userPreferenceRoutes.js");
const materialGroupRoutes = require("./routes/materialGroupRoutes.js");
const materialTypeRoutes = require("./routes/materialTypeRoutes.js");
const unitRoutes = require("./routes/unitRoutes.js");
const materialRoutes = require("./routes/materialRoutes.js");
const bomRoutes = require("./routes/bomRoutes.js");
const termsAndConditionsRoutes = require("./routes/termsAndConditionsRoutes.js");
const operatorTypeRoutes = require("./routes/operatorTypeRoutes.js");
const operatorRoutes = require("./routes/operatorRoutes.js");
// const itemRoutes = require("./routes/itemRoutes.js");
const vendorRoutes = require("./routes/vendorRoutes.js");
const customerRoutes = require("./routes/customerRoutes.js");
const processMasterRoutes = require("./routes/processMasterRoutes.js");
const settingMasterRoutes = require("./routes/settingMasterRoutes.js");

const documentMasterRoutes = require("./routes/documentRoutes.js");
const organizationRoutes = require("./routes/organizationRoutes.js");
const stockBookRoutes = require("./routes/stockBookRoutes.js");
const stockStatusRoutes = require("./routes/stockStatusRoutes.js");
const materialAddRoutes = require("./routes/materialAddRoutes.js");
const workOrderRoutes = require("./routes/workOrderRoutes.js");
const pmemoRoutes = require("./routes/pmemoRoutes.js");
const rmReturnRoutes = require("./routes/rmReturnRoutes.js");


// Model Initializations
const { initUserModel } = require("./models/userModel.js");
const { createLocationTypesTable } = require("./models/locationTypeModel.js");
const { createLocationsTable } = require("./models/locationModel.js");
const { createMachineTypesTable } = require("./models/machineTypeModel.js");
const { createMachinesTable, ensureMachineColumns } = require("./models/machineModel.js");
const { createUserTypesTable, createUserTypePermissionsTable } = require("./models/userTypeModel.js");
const { createAuditLogsTable } = require("./models/auditLogModel.js");
const { createUserPreferencesTable } = require("./models/userPreferenceModel.js");
const { createMaterialGroupsTable } = require("./models/materialGroupModel.js");
const { createMaterialTypesTable, seedSystemMaterialTypes } = require("./models/materialTypeModel.js");
const { createUnitsTable } = require("./models/unitModel.js");
const { createMaterialsTable, ensureMaterialColumns } = require("./models/materialModel.js");
const { createBOMTable } = require("./models/bomModel.js");
const { createTermsAndConditionsTable } = require("./models/termsAndConditionsModel.js");
const { createOperatorTypesTable } = require("./models/operatorTypeModel.js");
const { createOperatorsTable, ensureOperatorColumns } = require("./models/operatorModel.js");
// const { createItemsTable } = require("./models/itemModel.js");
const { createVendorTables, ensureVendorColumns } = require("./models/vendorModel.js");
const { createCustomerTables, ensureCustomerColumns } = require("./models/customerModel.js");
const { createProcessMastersTable } = require("./models/processMasterModel.js");
const { createSettingMasterTable, ensureSettingsMasterColumns } = require("./models/settingMasterModel.js");
const { createDocumentMasterTable } = require("./models/documentMaster.js");
const { createOrganizationTable, ensureOrganizationColumns } = require("./models/organizationModel.js");
const { createBatchSequenceTable } = require("./models/batchSequenceModel.js");
const { createStockIssuesTable, ensureStockIssuesColumns } = require("./models/stockBookModel.js");
const { createStockStatusTable, ensureStockStatusColumns } = require("./models/stockStatusModel.js");
const { createMaterialAddTables, ensureMaterialAddColumns } = require("./models/materialAddModel.js");
const { createWorkOrdersTable, ensureWorkOrderColumns, ensureSortOrderColumn, ensureIsOnHoldColumn, ensurePlannedDateColumns, ensureDelayColumns, ensurePriorityColumn } = require("./models/workOrderModel.js");
const { createPMemoTable, createPMemoRmIssuesTable, ensurePMemoColumns, ensurePMemoRmIssuesColumns } = require("./models/pmemoModel.js");
const { createRmReturnsTable } = require("./models/rmReturnModel.js");


const app = express();

const envFrontendUrls = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map(url => url.trim().replace(/\/$/, ""))
    : [];

const allowedOrigins = [
    "http://localhost:5173",
    "https://spind.co.in",
    "http://spind.co.in",
    "https://www.spind.co.in",
    "http://www.spind.co.in",
    "https://erp.shreepad.com",
    "http://erp.shreepad.com",
    "https://www.erp.shreepad.com",
    "http://www.erp.shreepad.com",
    ...envFrontendUrls
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

app.use(["/api/auth", "/auth"], authRoutes);
app.use(["/api/admin", "/admin"], adminRoutes);
app.use(["/api/usertypes", "/usertypes"], userTypeMasterRoutes);
app.use(["/api/locationtypes", "/locationtypes"], locationTypeRoutes);
app.use(["/api/locations", "/locations"], locationRoutes);
app.use(["/api/machinetypes", "/machinetypes"], machineTypeRoutes);
app.use(["/api/machines", "/machines"], machineRoutes);
app.use(["/api/table-preferences", "/table-preferences"], userPreferenceRoutes);
app.use(["/api/materialgroups", "/materialgroups"], materialGroupRoutes);
app.use(["/api/material-types", "/material-types"], materialTypeRoutes);
app.use(["/api/units", "/units"], unitRoutes);
app.use(["/api/materials", "/materials"], materialRoutes);
app.use(["/api/bom", "/bom"], bomRoutes);
app.use(["/api/terms-and-conditions", "/terms-and-conditions"], termsAndConditionsRoutes);
app.use(["/api/operator-types", "/operator-types"], operatorTypeRoutes);
app.use(["/api/operators", "/operators"], operatorRoutes);
// app.use(["/api/items", "/items"], itemRoutes);
app.use(["/api/vendors", "/vendors"], vendorRoutes);
app.use(["/api/customers", "/customers"], customerRoutes);
app.use(["/api/process-masters", "/process-masters"], processMasterRoutes);
app.use(["/api/settings", "/settings"], settingMasterRoutes);
app.use(["/api/document-masters", "/document-masters"], documentMasterRoutes);
app.use(["/api/organizations", "/organizations"], organizationRoutes);
app.use(["/api/stock-book", "/stock-book"], stockBookRoutes);
app.use(["/api/stock-status", "/stock-status"], stockStatusRoutes);
app.use(["/api/material-add", "/material-add"], materialAddRoutes);
app.use(["/api/work-orders", "/work-orders"], workOrderRoutes);
app.use(["/api/p-memos", "/p-memos"], pmemoRoutes);
app.use(["/api/rm-returns", "/rm-returns"], rmReturnRoutes);


// Global 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err.stack);
    res.status(500).json({ success: false, message: "Something went wrong" });
});

const startServer = async () => {
    try {
        await connectDB();

        console.log("Initializing database tables...");
        // Initialize tables in correct dependency order
        await initUserModel();
        await createUserTypesTable();
        await createUserTypePermissionsTable();
        await createAuditLogsTable();
        await createLocationTypesTable();
        await createLocationsTable();
        await createMachineTypesTable();
        await createMachinesTable();
        await ensureMachineColumns();
        await createUserPreferencesTable();
        await createMaterialGroupsTable();
        await createMaterialTypesTable();
        await seedSystemMaterialTypes();
        await createUnitsTable();
        await createProcessMastersTable();
        await createMaterialsTable();
        await ensureMaterialColumns();
        await createBOMTable();
        await createTermsAndConditionsTable();
        await createOperatorTypesTable();
        await createOperatorsTable();
        await ensureOperatorColumns();
        // await createItemsTable();
        await createDocumentMasterTable();
        await createVendorTables();
        await ensureVendorColumns();
        await createCustomerTables();
        await ensureCustomerColumns();
        await createSettingMasterTable();
        await ensureSettingsMasterColumns();
        await createBatchSequenceTable();
        await createOrganizationTable();
        await ensureOrganizationColumns();
        await createMaterialAddTables();
        await ensureMaterialAddColumns();
        await createRmReturnsTable();
        await createStockIssuesTable();
        await ensureStockIssuesColumns();
        await createStockStatusTable();
        await ensureStockStatusColumns();
        await createWorkOrdersTable();
        await ensureWorkOrderColumns();
        await ensureSortOrderColumn();
        await ensureIsOnHoldColumn();
        await ensurePlannedDateColumns();
        await ensureDelayColumns();
        await ensurePriorityColumn();
        await createPMemoTable();
        await ensurePMemoColumns();
        await createPMemoRmIssuesTable();
        await ensurePMemoRmIssuesColumns();


        console.log("All database tables are initialized and ready.");

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Server Running on Port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start application server:", error);
        process.exit(1);
    }
};

startServer();