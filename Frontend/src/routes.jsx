import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import DeviceRegistration from "./pages/DeviceRegistration";
import PendingApproval from "./pages/PendingApproval";

import UserHome from "./pages/user/UserHome";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserGroupMaster from "./pages/admin/user/UserGroupMaster";
import LocationTypeMaster from "./pages/admin/location/LocationTypeMaster";
import LocationMaster from "./pages/admin/location/LocationMaster";
import CreateLocation from "./pages/admin/location/CreateLocation";
import MachineTypeMaster from "./pages/admin/machine/MachineTypeMaster";
import CreateUser from "./pages/admin/user/CreateUser";
import MachineMaster from "./pages/admin/machine/MachineMaster";
import CreateMachine from "./pages/admin/machine/CreateMachine";
import DocumentMaster from "./pages/admin/document/DocumentMaster";
import VendorMaster from "./pages/admin/vendor/VendorMaster";
import CreateVendor from "./pages/admin/vendor/CreateVendor";
import EditVendor from "./pages/admin/vendor/EditVendor";
import CustomerMaster from "./pages/admin/customer/CustomerMaster";
import CreateCustomer from "./pages/admin/customer/CreateCustomer";
import EditCustomer from "./pages/admin/customer/EditCustomer";
import CreateUserType from "./pages/admin/user/CreateUserType";
import Profile from "./pages/Profile";
import MaterialGroupMaster from "./pages/Item/MaterialGroupMaster";
import MaterialTypeMaster from "./pages/Item/MaterialTypeMaster";
import UnitMaster from "./pages/Item/UnitMaster";
import MaterialMaster from "./pages/Item/MaterialMaster";
import CreateMaterial from "./pages/Item/CreateMaterial";
import OperatorTypeMaster from "./pages/Operator/OperatorTypeMaster";
import OperatorMaster from "./pages/Operator/OperatorMaster";
import CreateOperator from "./pages/Operator/CreateOperator";
import Reports from "./pages/Reports";
import ProcessMaster from "./pages/admin/process/ProcessMaster";
import TermsAndConditionsMaster from "./pages/admin/termsAndConditions/TermsAndConditionsMaster";
import StockBook from "./pages/Store/StockBook";
import StockStatus from "./pages/Store/StockStatus";
import MaterialRemove from "./pages/Store/MaterialRemove";
import MaterialAddMaster from "./pages/Store/MaterialAddMaster";
import CreateMaterialAdd from "./pages/Store/CreateMaterialAdd";

import WorkOrderMaster from "./pages/admin/workOrder/WorkOrderMaster";
import CreateWorkOrder from "./pages/admin/workOrder/CreateWorkOrder";
import EditWorkOrder from "./pages/admin/workOrder/EditWorkOrder";
import BillOfMaterial from "./pages/Production/BillOfMaterial";
import CreateBOM from "./pages/Production/CreateBOM";
import PMemoPage from "./pages/Production/PMemoPage";
import PMRmIssuePage from "./pages/Production/PMRmIssuePage";
import PMRmReturnPage from "./pages/Production/PMRmReturnPage";
import ProtectedRoute from "./components/ProtectedRoute";

import OrganizationDetails from "./pages/admin/organization/OrganizationDetails";
import SettingMaster from "./pages/admin/settings/SettingMaster";
import Navbar from "./components/Navbar";

export default function AppRoutes() {

    return (
        <Routes>

            <Route
                path="/"
                element={<Login />}
            />

            <Route
                path="/device-registration"
                element={<DeviceRegistration />}
            />

            <Route
                path="/pending-approval"
                element={<PendingApproval />}
            />

            <Route element={<ProtectedRoute />}>
                <Route
                    path="/user/home"
                    element={<UserHome />}
                />
                <Route
                    path="/profile"
                    element={<Profile />}
                />
            </Route>

            <Route element={<ProtectedRoute requiredMaster="activity_report" requiredAction="read" />}>
                <Route
                    path="/reports"
                    element={<Reports />}
                />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" />}>
                <Route
                    path="/admin/dashboard"
                    element={<AdminDashboard />}
                />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" />}>
                <Route
                    path="/admin/users/create"
                    element={<CreateUser />}
                />
            </Route>

            <Route element={<ProtectedRoute allowedModule="invoice" />}>
                <Route
                    path="/invoice/dashboard"
                    element={<div className="p-8"><h1 className="text-2xl font-bold">Invoice Dashboard</h1></div>}
                />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="user_type" requiredAction="read" />}>
                <Route
                    path="/admin/user-types"
                    element={<UserGroupMaster />}
                />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="user_type" requiredAction="write" />}>
                <Route
                    path="/admin/user-types/create"
                    element={<CreateUserType />}
                />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="location_type" requiredAction="read" />}>
                <Route
                    path="/admin/location-types"
                    element={<LocationTypeMaster />}
                />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="location" requiredAction="read" />}>
                <Route
                    path="/admin/locations"
                    element={<LocationMaster />}
                />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="location" requiredAction="write" />}>
                <Route
                    path="/admin/locations/create"
                    element={<CreateLocation />}
                />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="machine_type" requiredAction="read" />}>
                <Route
                    path="/admin/machine-types"
                    element={<MachineTypeMaster />}
                />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="machine" requiredAction="read" />}>
                <Route
                    path="/admin/machines"
                    element={<MachineMaster />}
                />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="machine" requiredAction="write" />}>
                <Route
                    path="/admin/machines/create"
                    element={<CreateMachine />}
                />
            </Route>



            {/* Vendor Master Routes */}
            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="vendor" requiredAction="read" />}>
                <Route path="/admin/vendors" element={<VendorMaster />} />
            </Route>
            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="vendor" requiredAction="write" />}>
                <Route path="/admin/vendors/create" element={<CreateVendor />} />
            </Route>
            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="vendor" requiredAction="update" />}>
                <Route path="/admin/vendors/edit/:id" element={<EditVendor />} />
            </Route>

            {/* Customer Master Routes */}
            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="customer" requiredAction="read" />}>
                <Route path="/admin/customers" element={<CustomerMaster />} />
            </Route>
            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="customer" requiredAction="write" />}>
                <Route path="/admin/customers/create" element={<CreateCustomer />} />
            </Route>
            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="customer" requiredAction="update" />}>
                <Route path="/admin/customers/edit/:id" element={<EditCustomer />} />
            </Route>

            {/* Reason Master removed */}

            {/* Organization Master */}
            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="organization" requiredAction="read" />}>
                <Route path="/admin/organization" element={<OrganizationDetails />} />
            </Route>

            {/* Sub SD Reason Master removed */}

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="material_group" requiredAction="read" />}>
                <Route
                    path="/admin/material-groups"
                    element={<MaterialGroupMaster />}
                />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="material_type" requiredAction="read" />}>
                <Route
                    path="/admin/material-types"
                    element={<MaterialTypeMaster />}
                />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="unit" requiredAction="read" />}>
                <Route
                    path="/admin/units"
                    element={<UnitMaster />}
                />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="material" requiredAction="read" />}>
                <Route
                    path="/admin/materials"
                    element={<MaterialMaster />}
                />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="material" requiredAction="write" />}>
                <Route
                    path="/admin/materials/create"
                    element={<CreateMaterial />}
                />
            </Route>


            {/* Raw Material and Job Party routes removed */}

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="operator_type" requiredAction="read" />}>
                <Route
                    path="/admin/operator-types"
                    element={<OperatorTypeMaster />}
                />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="operator" requiredAction="read" />}>
                <Route
                    path="/admin/operators"
                    element={<OperatorMaster />}
                />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="operator" requiredAction="write" />}>
                <Route
                    path="/admin/operators/create"
                    element={<CreateOperator />}
                />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="operator" requiredAction="update" />}>
                <Route
                    path="/admin/operators/edit/:id"
                    element={<CreateOperator />}
                />
            </Route>

            {/* Reason For Delay routes removed */}

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="document" requiredAction="read" />}>
                <Route
                    path="/admin/documents"
                    element={<DocumentMaster />}
                />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="process_master" requiredAction="read" />}>
                <Route
                    path="/admin/process-masters"
                    element={<ProcessMaster />}
                />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="terms_and_conditions" requiredAction="read" />}>
                <Route
                    path="/admin/terms-and-conditions"
                    element={<TermsAndConditionsMaster />}
                />
            </Route>

            {/* Setting Master */}
            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="setting_master" requiredAction="read" />}>
                <Route
                    path="/admin/settings"
                    element={<SettingMaster />}
                />
            </Route>



            <Route element={<ProtectedRoute allowedModule="manufacturing" />}>
                <Route
                    path="/manufacturing/dashboard"
                    element={<div className="p-8"><h1 className="text-2xl font-bold">Manufacturing Dashboard</h1></div>}
                />
            </Route>

            {/* Stock Book & Status Routes */}
            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="stock_book" requiredAction="read" />}>
                <Route path="/store/stock-book" element={<StockBook />} />
            </Route>
            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="stock_status" requiredAction="read" />}>
                <Route path="/store/stock-status" element={<StockStatus />} />
            </Route>

            {/* Redirects for legacy routes */}
            <Route path="/purchase/stock-book" element={<Navigate to="/store/stock-book" replace />} />
            <Route path="/purchase/rm-stock-book" element={<Navigate to="/store/stock-book" replace />} />
            <Route path="/purchase/general-stock-book" element={<Navigate to="/store/stock-book" replace />} />
            <Route path="/store/rm-stock" element={<Navigate to="/store/stock-status" replace />} />
            <Route path="/store/general-stock" element={<Navigate to="/store/stock-status" replace />} />


            <Route element={<ProtectedRoute allowedRole="admin" />}>
                <Route path="/store/material-remove" element={<MaterialRemove />} />
            </Route>
            <Route element={<ProtectedRoute allowedRole="admin" />}>
                <Route path="/store/material-add" element={<MaterialAddMaster />} />
            </Route>
            <Route element={<ProtectedRoute allowedRole="admin" />}>
                <Route path="/store/material-add/create" element={<CreateMaterialAdd />} />
            </Route>
            <Route element={<ProtectedRoute allowedRole="admin" />}>
                <Route path="/store/material-add/edit/:id" element={<CreateMaterialAdd />} />
            </Route>

            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="work_order" requiredAction="read" />}>
                <Route path="/sales/work-orders" element={<WorkOrderMaster />} />
            </Route>
            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="work_order" requiredAction="write" />}>
                <Route path="/sales/work-orders/create" element={<CreateWorkOrder />} />
            </Route>
            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="work_order" requiredAction="update" />}>
                <Route path="/sales/work-orders/edit/:id" element={<EditWorkOrder />} />
            </Route>

            {/* BOM Routes */}
            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="bom" requiredAction="read" />}>
                <Route path="/production/bom" element={<BillOfMaterial />} />
            </Route>
            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="bom" requiredAction="read" />}>
                <Route path="/production/p-memo/:workOrderItemId" element={<PMemoPage />} />
                <Route path="/production/p-memo/:workOrderItemId/rm-issue" element={<PMRmIssuePage />} />
                <Route path="/production/p-memo/:workOrderItemId/rm-return" element={<PMRmReturnPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="bom" requiredAction="write" />}>
                <Route path="/production/bom/create" element={<CreateBOM />} />
            </Route>
            <Route element={<ProtectedRoute allowedRole="admin" requiredMaster="bom" requiredAction="update" />}>
                <Route path="/production/bom/edit" element={<CreateBOM />} />
            </Route>

        </Routes>
    );
}