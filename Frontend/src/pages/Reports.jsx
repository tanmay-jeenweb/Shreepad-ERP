import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import DataTable from "../components/DataTable";
import { fetchActivityLogs } from "../api/authApi";

export default function Reports() {
  const formatDateTime = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "—";
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const [logs, setLogs] = useState([]);
  const [selectedMaster, setSelectedMaster] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChange, setSelectedChange] = useState(null);
  // const [tooltipPos, setTooltipPos] = useState({
  //     x: 0,
  //     y: 0
  // });

  const masters = useMemo(
    () => [
      { value: "all", label: "All masters" },
      { value: "Customer Master", label: "Customer Master" },
      { value: "Device Management", label: "Device Management" },
      { value: "Document Master", label: "Document Master" },
      { value: "Location Master", label: "Location Master" },
      { value: "Location Type Master", label: "Location Type Master" },
      { value: "Machine Master", label: "Machine Master" },
      { value: "Machine Type Master", label: "Machine Type Master" },
      { value: "Material Group Master", label: "Material Group Master" },
      { value: "Material Type Master",  label: "Material Type Master" },
      { value: "Material Master", label: "Material Master" },
      { value: "Mould Master", label: "Mould Master" },
      { value: "Operator Master", label: "Operator Master" },
      { value: "Reason Master", label: "Reason Master" },
      { value: "Sub SD Reason Master", label: "Sub SD Reason Master" },
      { value: "Unit Master", label: "Unit Master" },
      { value: "User Master", label: "User Master" },
      { value: "User Type Master", label: "User Type Master" },
      { value: "Vendor Master", label: "Vendor Master" },
      { value: "Job Party Master", label: "Job Party Master" },
      { value: "Job Party Type Master", label: "Job Party Type Master" },
      { value: "Organization Master", label: "Organization Master" },
      { value: "GRN Master", label: "GRN Master" },
      { value: "QC Master", label: "QC Master" },
      { value: "RM Stock Status", label: "RM Stock Status" },
      { value: "Batchwise Stock Status", label: "Batchwise Stock Status" },
      { value: "Party Stock Status", label: "Party Stock Status" },
      { value: "Stock Book", label: "Stock Book" },
    ],
    [],
  );

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetchActivityLogs();
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error("Error loading activity logs:", error);
      toast.error("Failed to fetch activity logs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    if (selectedMaster === "all") return logs;
    return logs.filter((log) => log.master_name === selectedMaster);
  }, [logs, selectedMaster]);

  const formatValue = (value) => {
    if (value === null || value === undefined) {
      return "—";
    }

    // Boolean conversion
    if (value === true || value === 1 || value === "1") {
      return "Yes";
    }

    if (value === false || value === 0 || value === "0") {
      return "No";
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  };

  const extractRecordName = (record) => {
    if (!record || typeof record !== "object") return "Unknown";
    return (
      record.location_name ||
      record.name ||
      record.type_name ||
      record.location_type_name ||
      record.machine_type_name ||
      record.machine_number ||
      record.username ||
      record.document_name ||
      record.category_name ||
      record.unit_name ||
      record.device_id ||
      record.mould_name ||
      record.vendor_name ||
      record.customer_name ||
      record.reason_name ||
      record.reason_type ||
      record.sub_sd_name ||
      record.material_group_name ||
      record.material_type_name ||
      record.materialName ||
      record.material_name ||
      record.product_insert ||
      record.operatorName ||
      record.operator_name ||
      record.operator_type_name ||
      record.job_party_type_name ||
      record.job_party_name ||
      record.partyName ||
      record.reason_type ||
      "Unknown"
    );
  };

  const renderChangedFields = (row) => {
    const before = row.before_data || {};
    const after = row.after_data || {};

    const recordName =
      after.user ||
      before.user ||
      after.location_name ||
      before.location_name ||
      after.location_type_name ||
      before.location_type_name ||
      after.type_name ||
      before.type_name ||
      after.machine_type_name ||
      before.machine_type_name ||
      after.name ||
      before.name ||
      after.outgoing_job_work ||
      before.outgoing_job_work ||
      after.username ||
      before.username ||
      before.mould_name ||
      after.mould_name ||
      before.document_name ||
      after.document_name ||
      before.unit_name ||
      after.unit_name ||
      after.vendor_name ||
      before.vendor_name ||
      after.customer_name ||
      before.customer_name ||
      after.reason_type ||
      before.reason_type ||
      after.reason_name ||
      before.reason_name ||
      after.sub_sd_name ||
      before.sub_sd_name ||
      after.materialName ||
      before.materialName ||
      after.material_name ||
      before.material_name ||
      (after.materialId ? `Material ID: ${after.materialId}` : null) ||
      (before.materialId ? `Material ID: ${before.materialId}` : null) ||
      after.product_insert ||
      before.product_insert ||
      after.material_group_name ||
      before.material_group_name ||
      after.material_type_name ||
      before.material_type_name ||
      after.operatorName ||
      before.operatorName ||
      after.operator_name ||
      before.operator_name ||
      after.reason_type ||
      before.reason_type ||
      after.operator_type_name ||
      before.operator_type_name ||
      before.job_party_type_name ||
      after.job_party_type_name ||
      before.partyName ||
      after.partyName ||
      after.device_id ||
      before.device_id ||
      "Unknown";

    const changedKeys = Object.keys({
      ...before,
      ...after,
    }).filter((key) => {
      if (key === "updated_at" || key === "created_at") {
        return false;
      }

      // Special handling for permissions
      if (key === "permissions") {
        const beforePermissions = before.permissions || [];

        const afterPermissions = after.permissions || [];

        const hasPermissionChange = beforePermissions.some((beforePerm) => {
          const afterPerm = afterPermissions.find(
            (p) => p.masterName === beforePerm.masterName,
          );

          return JSON.stringify(beforePerm) !== JSON.stringify(afterPerm);
        });

        return hasPermissionChange;
      }

      return JSON.stringify(before[key]) !== JSON.stringify(after[key]);
    });

    if (row.change_type === "created") {
      return (
        <span
          className="
                px-2 py-1
                bg-green-100
                text-green-700
                rounded
                "
        >
          {recordName}
        </span>
      );
    }

    if (row.change_type === "deleted") {
      return (
        <span
          className="
                px-2 py-1
                bg-red-100
                text-red-700
                rounded
                "
        >
          {recordName}
        </span>
      );
    }

    return (
      <button
        onClick={() =>
          setSelectedChange({
            recordName,
            before,
            after,
            changedKeys,
          })
        }
        className="
        cursor-pointer
        px-2
        py-1
        rounded
        bg-blue-100
        text-blue-700
        hover:bg-blue-200
        "
      >
        {recordName}
      </button>
    );
  };

  const columns = useMemo(
    () => [
      {
        key: "username",
        label: "Username",
        render: (row) => row.username || "Unknown",
      },
      {
        key: "master_name",
        label: "Master",
        render: (row) => row.master_name,
      },
      {
        key: "change_type",
        label: "Action",
        render: (row) => row.change_type?.toUpperCase(),
      },

      {
        key: "created_at",
        label: "Timestamp",
        render: (row) => formatDateTime(row.created_at),
      },
      {
        key: "change_details",
        label: "Change (Before / After)",
        render: (row) => renderChangedFields(row),
        minWidth: "200px",
        sortable: false,
      },
    ],
    [],
  );

  return (
    <div className="flex-1 bg-slate-50 font-sans text-slate-900">
      <Navbar title="Reports" />

      <main className=" mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm">
          <DataTable
            tableId="reports_table"
            title="Activity Reports"
            data={filteredLogs}
            columns={columns}
            loading={isLoading}
            searchPlaceholder="Search by user, master, action..."
            actionButton={
              <div className="flex items-center gap-2">
                <select
                  value={selectedMaster}
                  onChange={(e) => setSelectedMaster(e.target.value)}
                  className="h-10 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-blue-600"
                >
                  {masters.map((master) => (
                    <option key={master.value} value={master.value}>
                      {master.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={loadLogs}
                  className="h-10 inline-flex items-center justify-center rounded-lg bg-[#369ACF] px-4 text-sm font-semibold text-white hover:bg-[#2583b4] transition"
                >
                  Refresh
                </button>
              </div>
            }
          />
        </div>
        {selectedChange && (
          <div
            className="
                fixed
                inset-0
                bg-black/40
                flex
                items-center
                justify-center
                z-[9999]
                "
          >
            <div
              className="
                bg-white
                rounded-xl
                shadow-2xl
                p-6
                w-auto
                min-w-[400px]
                max-w-[80vw]
                max-h-[80vh]
                overflow-auto
                "
            >
              <div
                className="
                    flex
                    justify-between
                    items-center
                    mb-4
                    "
              >
                <h2
                  className="
                    text-lg
                    font-semibold
                    "
                >
                  Changes — {selectedChange.recordName}
                </h2>

                <button
                  onClick={() => setSelectedChange(null)}
                  className="
                    text-slate-500
                    text-xl
                    cursor-pointer
                    "
                >
                  ×
                </button>
              </div>

              <div
                className="
                    space-y-4
                "
              >
                {selectedChange.changedKeys.map((key) => {
                  if (key === "approved_by") {
                    return (
                      <div
                        key={key}
                        className="
        border
        rounded-lg
        p-3
        "
                      >
                        <div
                          className="
          font-semibold
          mb-2
          "
                        >
                          Approved By
                        </div>

                        <div className="text-green-700">
                          {selectedChange.after.approved_by}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={key}
                      className="
      border
      rounded-lg
      p-3
      "
                    >
                      <div
                        className="
        font-semibold
        mb-2
        "
                      >
                        {key}
                      </div>

                      <div>
                        {key === "permissions" ? (
                          <div className="space-y-4">
                            {(selectedChange.before.permissions || []).map(
                              (perm, index) => {
                                const afterPerm = (
                                  selectedChange.after.permissions || []
                                ).find((p) => p.masterName === perm.masterName);

                                const changed =
                                  JSON.stringify(perm) !==
                                  JSON.stringify(afterPerm);

                                if (!changed) return null;

                                return (
                                  <div
                                    key={index}
                                    className="
                border
                rounded
                p-2
                bg-slate-50
                "
                                  >
                                    <div className="font-semibold">
                                      {perm.masterName}
                                    </div>

                                    {Object.keys(perm).map((field) => {
                                      if (field === "masterName") return null;

                                      if (perm[field] === afterPerm?.[field])
                                        return null;

                                      return (
                                        <div key={field}>
                                          {field} :{" "}
                                          <span className="text-red-600">
                                            {String(perm[field])}
                                          </span>
                                          {" → "}
                                          <span className="text-green-600">
                                            {String(afterPerm?.[field])}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              },
                            )}
                          </div>
                        ) : (
                          <>
                            <div>
                              <span className="font-semibold">Before:</span>{" "}
                              {formatValue(selectedChange.before[key])}
                            </div>

                            <div>
                              <span className="font-semibold">After:</span>{" "}
                              {formatValue(selectedChange.after[key])}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
