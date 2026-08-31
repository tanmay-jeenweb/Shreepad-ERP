import React, { useEffect, useState, useMemo } from "react";
import Navbar from "../../../components/Navbar";
import { getUserTypes, updateUserType, deleteUserType } from "../../../api/userTypeMasterApi";
import DataTable from "../../../components/DataTable";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { usePermission } from "../../../context/PermissionContext";

// ─── Constants ───────────────────────────────────────────────────────────────
const MODULE_GROUPS = [
  {
    groupName: "Administration & Setup",
    icon: "fa-solid fa-cogs",
    description: "Core configurations, locations, and user types.",
    masters: [
      { key: "user_type",           label: "User Type Master" },
      { key: "location_type",       label: "Location Type Master" },
      { key: "location",            label: "Location Master" },
      { key: "document",            label: "Document Master" },
      { key: "organization",        label: "Organization Master" },
      { key: "activity_report",     label: "User Activity Records", allowedPerms: ["canRead"] },
    ]
  },
  {
    groupName: "Production & Machines",
    icon: "fa-solid fa-industry",
    description: "Manage machines and their specifications.",
    masters: [
      { key: "machine_type",        label: "Machine Type Master" },
      { key: "machine",             label: "Machine Master" },
    ]
  },
  {
    groupName: "Materials & Inventory",
    icon: "fa-solid fa-boxes-stacked",
    description: "Material groups and specifications.",
    masters: [
      { key: "material_group",      label: "Material Group Master" },
      { key: "unit",                label: "Unit Master" },
      { key: "material",            label: "Material Master" },
    ]
  },
  {
    groupName: "Store & Inventory",
    icon: "fa-solid fa-warehouse",
    description: "Store material add, removal, stock status, and stock book.",
    masters: [
      { key: "material_add",            label: "Material Add" },
      { key: "stock_status",            label: "Stock Status", allowedPerms: ["canRead"] },
      { key: "stock_book",              label: "Stock Book", allowedPerms: ["canRead"] },
    ]
  },
  {
    groupName: "People & Contacts",
    icon: "fa-solid fa-users",
    description: "Operators, vendors, and customers.",
    masters: [
      { key: "operator_type",       label: "Operator Type Master" },
      { key: "operator",            label: "Operator Master" },
      { key: "vendor",              label: "Vendor Master" },
      { key: "customer",            label: "Customer Master" },
    ]
  },
  {
    groupName: "Sales & Distribution",
    icon: "fa-solid fa-file-invoice-dollar",
    description: "Work orders.",
    masters: [
      { key: "work_order",          label: "Work Order" },
    ]
  }
];

const MASTERS = MODULE_GROUPS.flatMap(g => g.masters);
const PERMS = ["canRead", "canWrite", "canUpdate", "canDelete", "canApprove"];
const PERM_LABELS = { canRead: "Read", canWrite: "Write", canUpdate: "Update", canDelete: "Delete", canApprove: "Approve" };
const PERM_COLORS = {
  canRead:   { bg: "#f0f4f8", border: "#bcccdc", text: "#369ACF", check: "#369ACF" },
  canWrite:  { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", check: "#16a34a" },
  canUpdate: { bg: "#fffbeb", border: "#fde68a", text: "#b45309", check: "#d97706" },
  canDelete: { bg: "#fff1f2", border: "#fecdd3", text: "#be123c", check: "#e11d48" },
  canApprove:{ bg: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9", check: "#7c3aed" },
};

const getAllowed = (master) => master.allowedPerms || ["canRead", "canWrite", "canUpdate", "canDelete"];

const defaultPerms = () =>
  MASTERS.map((m) => ({ masterName: m.key, canRead: false, canWrite: false, canUpdate: false, canDelete: false, canApprove: false }));

const buildPermsFromApi = (apiPerms) => {
  if (!apiPerms || apiPerms.length === 0) return defaultPerms();
  return MASTERS.map((m) => {
    const found = apiPerms.find((p) => p.masterName === m.key);
    return found
      ? { masterName: m.key, canRead: !!found.canRead, canWrite: !!found.canWrite, canUpdate: !!found.canUpdate, canDelete: !!found.canDelete, canApprove: !!found.canApprove }
      : { masterName: m.key, canRead: false, canWrite: false, canUpdate: false, canDelete: false, canApprove: false };
  });
};

// ─── Checkbox Cell ───────────────────────────────────────────────────────────
function CheckCell({ checked, color, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 22, height: 22, borderRadius: 6,
        border: `2px solid ${checked ? color.check : "#cbd5e1"}`,
        background: checked ? color.check : "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all 0.15s",
        margin: "0 auto",
        boxShadow: checked ? `0 0 0 3px ${color.bg}` : "none",
      }}
    >
      {checked && (
        <svg viewBox="0 0 12 10" style={{ width: 11, height: 11 }}>
          <polyline points="1,5 4.5,8.5 11,1" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

// ─── Permissions Badge (inline in list) ──────────────────────────────────────
function PermBadges({ permissions }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!permissions || permissions.length === 0)
    return <span style={{ color: "#94a3b8", fontSize: 12 }}>No permissions set</span>;

  // Only show masters that have at least one permission granted
  const rows = MASTERS.map((m) => {
    const p = permissions.find((x) => x.masterName === m.key);
    if (!p) return null;
    const granted = PERMS.filter((perm) => p[perm]);
    if (granted.length === 0) return null;
    return { label: m.label, granted };
  }).filter(Boolean);

  if (rows.length === 0)
    return <span style={{ color: "#94a3b8", fontSize: 12 }}>No access</span>;

  const visibleRows = isExpanded ? rows : rows.slice(0, 3);
  const hiddenCount = rows.length - visibleRows.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {visibleRows.map(({ label, granted }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {/* Master label */}
          <span style={{
            fontSize: 11, fontWeight: 700, color: "#475569",
            background: "#f1f5f9", border: "1px solid #e2e8f0",
            borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap"
          }}>
            {label}
          </span>
          <span style={{ color: "#cbd5e1", fontSize: 11 }}>→</span>
          {/* Permission badges for this master */}
          {granted.map((perm) => {
            const c = PERM_COLORS[perm];
            return (
              <span key={perm} style={{
                fontSize: 10, fontWeight: 700, padding: "2px 7px",
                borderRadius: 5, background: c.bg, color: c.text, border: `1px solid ${c.border}`
              }}>
                {PERM_LABELS[perm]}
              </span>
            );
          })}
        </div>
      ))}
      {hiddenCount > 0 && !isExpanded && (
        <div 
          onClick={() => setIsExpanded(true)}
          style={{ fontSize: 11, fontWeight: 600, color: "#369ACF", cursor: "pointer", marginTop: 2, display: "inline-block" }}
        >
          + {hiddenCount} more modules
        </div>
      )}
      {isExpanded && rows.length > 3 && (
        <div 
          onClick={() => setIsExpanded(false)}
          style={{ fontSize: 11, fontWeight: 600, color: "#64748b", cursor: "pointer", marginTop: 2, display: "inline-block" }}
        >
          Show less
        </div>
      )}
    </div>
  );
}

// ─── Edit Modal ──────────────────────────────────────────────────────────────
function EditModal({ row, onClose, onSave, saving }) {
  const [typeName, setTypeName] = useState(row.type_name || "");
  const [permissions, setPermissions] = useState(buildPermsFromApi(row.permissions));
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroupCollapse = (groupName) => {
    setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const togglePerm = (masterKey, perm) =>
    setPermissions((prev) => prev.map((p) => p.masterName === masterKey ? { ...p, [perm]: !p[perm] } : p));

  const toggleRow = (masterKey) => {
    const master = MASTERS.find(m => m.key === masterKey);
    const allowed = getAllowed(master);
    const row = permissions.find((p) => p.masterName === masterKey);
    const allChecked = allowed.every((perm) => row[perm]);
    
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.masterName === masterKey) {
          const newRow = { ...p };
          allowed.forEach(perm => newRow[perm] = !allChecked);
          return newRow;
        }
        return p;
      })
    );
  };

  const toggleColumn = (perm) => {
    const relevantMasters = MASTERS.filter(m => getAllowed(m).includes(perm));
    const allChecked = relevantMasters.every(m => {
      const p = permissions.find(x => x.masterName === m.key);
      return p[perm];
    });

    setPermissions((prev) => prev.map((p) => {
      const master = MASTERS.find(m => m.key === p.masterName);
      if (getAllowed(master).includes(perm)) {
        return { ...p, [perm]: !allChecked };
      }
      return p;
    }));
  };

  const toggleAll = () => {
    let allChecked = true;
    for (const master of MASTERS) {
      const p = permissions.find(x => x.masterName === master.key);
      const allowed = getAllowed(master);
      if (!allowed.every(perm => p[perm])) {
        allChecked = false;
        break;
      }
    }

    setPermissions((prev) => prev.map((p) => {
      const master = MASTERS.find(m => m.key === p.masterName);
      const allowed = getAllowed(master);
      const newRow = { ...p };
      allowed.forEach(perm => newRow[perm] = !allChecked);
      return newRow;
    }));
  };

  const toggleGroupAll = (group) => {
    const groupKeys = group.masters.map(m => m.key);
    
    let allChecked = true;
    for (const master of group.masters) {
      const p = permissions.find(x => x.masterName === master.key);
      const allowed = getAllowed(master);
      if (!allowed.every(perm => p[perm])) {
        allChecked = false;
        break;
      }
    }
    
    setPermissions(prev => 
      prev.map(p => {
        if (groupKeys.includes(p.masterName)) {
          const master = group.masters.find(m => m.key === p.masterName);
          const allowed = getAllowed(master);
          const newRow = { ...p };
          allowed.forEach(perm => newRow[perm] = !allChecked);
          return newRow;
        }
        return p;
      })
    );
  };

  const isRowAll = (masterKey) => { 
    const master = MASTERS.find(m => m.key === masterKey);
    const p = permissions.find((x) => x.masterName === masterKey); 
    return getAllowed(master).every((perm) => p[perm]); 
  };
  
  const isColAll = (perm) => {
    const relevantMasters = MASTERS.filter(m => getAllowed(m).includes(perm));
    if (relevantMasters.length === 0) return false;
    return relevantMasters.every((m) => {
      const p = permissions.find(x => x.masterName === m.key);
      return p[perm];
    });
  };

  const isAllAll = () => {
    return MASTERS.every((master) => {
      const p = permissions.find(x => x.masterName === master.key);
      return getAllowed(master).every(perm => p[perm]);
    });
  };

  const isGroupAll = (group) => {
    return group.masters.every(master => {
      const p = permissions.find(x => x.masterName === master.key);
      return getAllowed(master).every(perm => p[perm]);
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }}>
      <div style={{
        background: "#fff", borderRadius: 18, width: "100%", maxWidth: 1100, margin: "0 auto",
        maxHeight: "92vh", display: "flex", flexDirection: "column",
        boxShadow: "0 25px 60px rgba(0,0,0,0.2)", overflow: "hidden"
      }}>
        {/* Modal Header */}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg,#369ACF,#2583b4)" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}>Edit User Type</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#d9e2ec" }}>Update the name and module permissions</p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 18, height: 18 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "24px 28px" }}>

          {/* Name field */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              User Type Name <span style={{ color: "#e11d48" }}>*</span>
            </label>
            <input
              type="text"
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #cbd5e1", borderRadius: 9, padding: "11px 14px", fontSize: 15, outline: "none", color: "#1e293b" }}
              onFocus={e => e.target.style.borderColor = "#369ACF"}
              onBlur={e => e.target.style.borderColor = "#cbd5e1"}
            />
          </div>

          {/* Permissions Grid */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "0", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafbfc" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="fa-solid fa-shield-halved text-indigo-600"></i> Module Permissions
                </h3>
              </div>
              <button
                type="button"
                onClick={toggleAll}
                style={{ fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 8, cursor: "pointer", border: `1.5px solid #369ACF`, color: isAllAll() ? "#fff" : "#369ACF", background: isAllAll() ? "#369ACF" : "#e6ebf0", transition: "all 0.2s" }}
              >
                {isAllAll() ? "Deselect All Permissions" : "Select All Permissions"}
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                  <tr>
                    <th style={{ textAlign: "left", padding: "14px 24px", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #e2e8f0", minWidth: 220 }}>Module</th>
                    {PERMS.map((perm) => {
                      const c = PERM_COLORS[perm];
                      return (
                        <th key={perm} style={{ textAlign: "center", padding: "12px 10px", borderBottom: "2px solid #e2e8f0", minWidth: 100 }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: c.text, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6, padding: "4px 10px" }}>
                              {PERM_LABELS[perm]}
                            </span>
                            <button type="button" onClick={() => toggleColumn(perm)} title={`Toggle all ${PERM_LABELS[perm]}`} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                              <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${isColAll(perm) ? c.check : "#cbd5e1"}`, background: isColAll(perm) ? c.check : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                                {isColAll(perm) && <svg viewBox="0 0 12 10" style={{ width: 12, height: 12 }}><polyline points="1.5,5 4.5,8 10.5,1.5" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                              </div>
                            </button>
                          </div>
                        </th>
                      );
                    })}
                    <th style={{ textAlign: "center", padding: "14px 16px", borderBottom: "2px solid #e2e8f0", minWidth: 100, fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Row All</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULE_GROUPS.map((group, gIdx) => {
                    const isCollapsed = collapsedGroups[group.groupName];
                    const groupAll = isGroupAll(group);
                    
                    return (
                      <React.Fragment key={group.groupName}>
                        <tr style={{ background: "#f8fafc" }}>
                          <td colSpan={1} style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0", borderTop: gIdx === 0 ? "none" : "1px solid #e2e8f0" }}>
                            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleGroupCollapse(group.groupName)}>
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                <i className={`${group.icon}`}></i>
                              </div>
                              <div>
                                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                                  {group.groupName} <i className={`fa-solid fa-chevron-${isCollapsed ? 'down' : 'up'} text-[10px] text-slate-400`}></i>
                                </h3>
                                <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>{group.description}</p>
                              </div>
                            </div>
                          </td>
                              <td colSpan={PERMS.length} style={{ borderBottom: "1px solid #e2e8f0", borderTop: gIdx === 0 ? "none" : "1px solid #e2e8f0" }}></td>
                          <td style={{ textAlign: "center", padding: "16px", borderBottom: "1px solid #e2e8f0", borderTop: gIdx === 0 ? "none" : "1px solid #e2e8f0" }}>
                            <button type="button" onClick={() => toggleGroupAll(group)}
                              style={{ fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 6, cursor: "pointer", border: `1.5px solid ${groupAll ? "#4f46e5" : "#cbd5e1"}`, color: groupAll ? "#fff" : "#4f46e5", background: groupAll ? "#4f46e5" : "#fff", transition: "all 0.15s", whiteSpace: "nowrap" }}>
                              {groupAll ? "✓ Group" : "Group All"}
                            </button>
                          </td>
                        </tr>
                        {!isCollapsed && group.masters.map((master) => {
                          const rowData = permissions.find((p) => p.masterName === master.key);
                          const rowAll = isRowAll(master.key);
                          return (
                            <tr key={master.key} style={{ background: "#fff", transition: "background 0.15s" }}
                              onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                              <td style={{ padding: "14px 24px", fontSize: 14, fontWeight: 600, color: "#475569", borderBottom: "1px solid #f1f5f9" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: "12px" }}>
                                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#cbd5e1" }} />
                                  {master.label}
                                </div>
                              </td>
                              {PERMS.map((perm) => {
                                const allowed = getAllowed(master);
                                const isAllowed = allowed.includes(perm);
                                return (
                                  <td key={perm} style={{ textAlign: "center", padding: "10px 8px", borderBottom: "1px solid #f1f5f9" }}>
                                    {isAllowed ? (
                                      <CheckCell checked={rowData[perm]} color={PERM_COLORS[perm]} onChange={() => togglePerm(master.key, perm)} />
                                    ) : (
                                      <span style={{ color: "#cbd5e1", fontSize: "16px", fontWeight: "bold" }}>—</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td style={{ textAlign: "center", padding: "10px 16px", borderBottom: "1px solid #f1f5f9" }}>
                                <button type="button" onClick={() => toggleRow(master.key)}
                                  style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 6, cursor: "pointer", border: `1.5px solid ${rowAll ? "#369ACF" : "#e2e8f0"}`, color: rowAll ? "#fff" : "#64748b", background: rowAll ? "#369ACF" : "#f8fafc", transition: "all 0.15s" }}>
                                  {rowAll ? "✓ All" : "All"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 12, background: "#fafafa" }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding: "9px 20px", borderRadius: 8, border: "1.5px solid #cbd5e1", color: "#475569", background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            Cancel
          </button>
          <button
            onClick={() => onSave(row.id, typeName, permissions)}
            disabled={saving || !typeName.trim()}
            style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: saving ? "#94a3b8" : "linear-gradient(135deg,#369ACF,#2583b4)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", boxShadow: saving ? "none" : "0 2px 8px rgba(54, 154, 207,0.35)" }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UserGroupMaster() {
  const navigate = useNavigate();
  const [userTypes, setUserTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingRow, setEditingRow] = useState(null);

  const loadUserTypes = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getUserTypes();
      setUserTypes(response.data.data || []);
    } catch (err) {
      console.error("Failed to load user types", err);
      setError("Unable to load user types. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUserTypes(); }, []);

  const handleSave = async (id, typeName, permissions) => {
    if (!typeName.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      await updateUserType(id, { typeName: typeName.trim(), permissions });
      toast.success("User type updated successfully");
      setEditingRow(null);
      await loadUserTypes();
    } catch (err) {
      console.error("Failed to update user type", err);
      toast.error(err?.response?.data?.message || "Unable to update user type.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user type?")) return;
    setSaving(true);
    try {
      await deleteUserType(id);
      toast.success("User type deleted successfully");
      await loadUserTypes();
    } catch (err) {
      console.error("Failed to delete user type", err);
      toast.error(err?.response?.data?.message || "Unable to delete user type.");
    } finally {
      setSaving(false);
    }
  };

  const { hasPermission } = usePermission();

  const columns = useMemo(() => {
    const cols = [
      { key: "id", label: "ID", minWidth: "60px" },
      {
        key: "type_name", label: "User Type",
        render: (row) => <span style={{ fontWeight: 700, color: "#369ACF" }}>{row.type_name}</span>
      },
      {
        key: "permissions", label: "Permissions",
        sortable: false,
        render: (row) => <PermBadges permissions={row.permissions} />
      }
      // {
      //   key: "created_at", label: "Added Date",
      //   render: (row) => new Date(row.created_at).toLocaleDateString()
      // },
      // {
      //   key: "added_by_name", label: "Added By",
      //   render: (row) => row.added_by_name || "Unknown"
      // },
      // {
      //   key: "device_id", label: "Device ID",
      //   render: (row) => <span style={{ fontFamily: "monospace", color: "#64748b", fontSize: "12px" }}>{row.device_id || "—"}</span>
      // }
    ];

    const canUpdate = hasPermission("user_type", "update");
    const canDelete = hasPermission("user_type", "delete");

    if (canUpdate || canDelete) {
      cols.push({
        key: "actions", label: "Actions", sortable: false, minWidth: "120px",
        render: (row) => (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {canUpdate && (
              <button
                onClick={() => setEditingRow(row)}
                style={{ display: "flex", width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid #bcccdc", background: "#f0f4f8", color: "#369ACF", cursor: "pointer" }}
                title="Edit"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: 15, height: 15 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931Z" />
                </svg>
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => handleDelete(row.id)}
                style={{ display: "flex", width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid #fecdd3", background: "#fff1f2", color: "#be123c", cursor: "pointer" }}
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: 15, height: 15 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h12m-1.5 0-.563 12.375A2.25 2.25 0 0113.693 21H10.307a2.25 2.25 0 01-2.244-2.125L7.5 7.5m3-3h3A1.5 1.5 0 0115 6v1.5H9V6a1.5 1.5 0 011.5-1.5Z" />
                </svg>
              </button>
            )}
          </div>
        )
      });
    }

    return cols;
  }, [saving, hasPermission]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "#f8fafc", fontFamily: "'Inter',sans-serif" }}>
      <Navbar title="ERP Admin" />

      {editingRow && (
        <EditModal
          row={editingRow}
          onClose={() => setEditingRow(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}

      <main style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", margin: "0 auto", padding: "32px 30px" }}>
        {error && (
          <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", padding: "12px 16px", borderRadius: 10, marginBottom: 20, fontSize: 14, fontWeight: 500 }}>
            {error}
          </div>
        )}
        <DataTable
          tableId="user_group_master"
          title="User Type Master"
          data={userTypes}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search user types..."
          actionButton={
            hasPermission("user_type", "write") ? (
              <button
                onClick={() => navigate("/admin/user-types/create")}
                style={{ display: "flex", width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 9, background: "linear-gradient(135deg,#369ACF,#2583b4)", color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(54, 154, 207,0.35)" }}
                title="Create User Type"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 18, height: 18 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            ) : null
          }
        />
      </main>
    </div>
  );
}

