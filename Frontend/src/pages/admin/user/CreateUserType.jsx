import React, { useState } from "react";
import Navbar from "../../../components/Navbar";
import { createUserType } from "../../../api/userTypeMasterApi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

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
      { key: "material_type",        label: "Material Type Master" },
      { key: "unit",                label: "Unit Master" },
      { key: "material",            label: "Material Master" },
    ]
  },
  {
    groupName: "Production",
    icon: "fa-solid fa-gears",
    description: "Bill of Materials and production configurations.",
    masters: [
      { key: "bom",                 label: "Bill of Material" },
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
const PERM_TOOLTIPS = { 
  canRead: "Allows viewing records", 
  canWrite: "Allows creating new records", 
  canUpdate: "Allows editing existing records", 
  canDelete: "Allows removing records",
  canApprove: "Allows approving/rejecting records"
};
const PERM_COLORS = {
  canRead:   { bg: "#f0f4f8", border: "#bcccdc", text: "#369ACF", check: "#369ACF" },
  canWrite:  { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", check: "#16a34a" },
  canUpdate: { bg: "#fffbeb", border: "#fde68a", text: "#b45309", check: "#d97706" },
  canDelete: { bg: "#fff1f2", border: "#fecdd3", text: "#be123c", check: "#e11d48" },
  canApprove:{ bg: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9", check: "#7c3aed" },
};

const getAllowed = (master) => master.allowedPerms || ["canRead", "canWrite", "canUpdate", "canDelete"];

const defaultPerms = () =>
  MASTERS.map((m) => ({
    masterName: m.key,
    canRead: false,
    canWrite: false,
    canUpdate: false,
    canDelete: false,
    canApprove: false,
  }));

export default function CreateUserType() {
  const [newTypeName, setNewTypeName] = useState("");
  const [permissions, setPermissions] = useState(defaultPerms());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Collapsible state for groups
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroupCollapse = (groupName) => {
    setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const togglePerm = (masterKey, perm) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.masterName === masterKey ? { ...p, [perm]: !p[perm] } : p
      )
    );
  };

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

  const handleAddType = async (event) => {
    event.preventDefault();
    if (!newTypeName.trim()) {
      setError("Enter a valid user type name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createUserType({ typeName: newTypeName.trim(), permissions });
      toast.success(`User type '${newTypeName.trim()}' added successfully.`);
      setNewTypeName("");
      setPermissions(defaultPerms());
      setTimeout(() => navigate("/admin/user-types"), 1200);
    } catch (err) {
      console.error("Failed to add user type", err);
      toast.error(err?.response?.data?.message || "Unable to add user type. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "linear-gradient(135deg,#f8fafc 0%,#eef2ff 100%)", fontFamily: "'Inter',sans-serif" }}>
      <Navbar title="ERP Admin" />
      <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e293b", margin: 0 }}>Create User Type</h1>
            <p style={{ color: "#64748b", marginTop: 4, fontSize: 14 }}>Define a new user group and set its module permissions.</p>
          </div>
          <button
            onClick={() => navigate("/admin/user-types")}
            style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500 }}
          >
            <i className="fa-solid fa-arrow-left"></i>
            Back to User Types
          </button>
        </div>

        <form onSubmit={handleAddType}>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "24px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              User Type Name <span style={{ color: "#e11d48" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Supervisor, Operator, Manager"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              required
              style={{
                width: "100%", boxSizing: "border-box", border: "1.5px solid #cbd5e1", borderRadius: 9,
                padding: "11px 14px", fontSize: 15, outline: "none", color: "#1e293b",
                transition: "border 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = "#369ACF"}
              onBlur={e => e.target.style.borderColor = "#cbd5e1"}
            />
          </div>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "0", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafbfc" }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="fa-solid fa-shield-halved text-indigo-600"></i> Module Permissions
                </h2>
                <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>Set read, write, update, delete and approve access per master module.</p>
              </div>
              <button
                type="button"
                onClick={toggleAll}
                style={{
                  fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 8, cursor: "pointer",
                  border: "1.5px solid #369ACF", color: isAllAll() ? "#fff" : "#369ACF",
                  background: isAllAll() ? "#369ACF" : "#e6ebf0", transition: "all 0.2s"
                }}
              >
                {isAllAll() ? "Deselect All Permissions" : "Select All Permissions"}
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                  <tr>
                    <th style={{ textAlign: "left", padding: "14px 24px", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #e2e8f0", minWidth: 220 }}>
                      Master Module
                    </th>
                    {PERMS.map((perm) => {
                      const c = PERM_COLORS[perm];
                      return (
                        <th key={perm} style={{ textAlign: "center", padding: "12px 10px", borderBottom: "2px solid #e2e8f0", minWidth: 100 }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                            <div className="flex items-center gap-1.5" title={PERM_TOOLTIPS[perm]}>
                              <span style={{
                                fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                                color: c.text, background: c.bg, border: `1px solid ${c.border}`,
                                borderRadius: 6, padding: "4px 10px", cursor: "help"
                              }}>
                                {PERM_LABELS[perm]}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleColumn(perm)}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                            >
                              <div style={{
                                width: 20, height: 20, borderRadius: 6, border: `2px solid ${isColAll(perm) ? c.check : "#cbd5e1"}`,
                                background: isColAll(perm) ? c.check : "#fff",
                                display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s"
                              }}>
                                {isColAll(perm) && <svg viewBox="0 0 12 10" style={{ width: 12, height: 12 }}><polyline points="1.5,5 4.5,8 10.5,1.5" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                              </div>
                            </button>
                          </div>
                        </th>
                      );
                    })}
                    <th style={{ textAlign: "center", padding: "14px 16px", borderBottom: "2px solid #e2e8f0", minWidth: 100, fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Row All
                    </th>
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
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleGroupCollapse(group.groupName)}>
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                  <i className={`${group.icon}`}></i>
                                </div>
                                <div>
                                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                                    {group.groupName}
                                    <i className={`fa-solid fa-chevron-${isCollapsed ? 'down' : 'up'} text-[10px] text-slate-400`}></i>
                                  </h3>
                                  <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>{group.description}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td colSpan={PERMS.length} style={{ borderBottom: "1px solid #e2e8f0", borderTop: gIdx === 0 ? "none" : "1px solid #e2e8f0" }}></td>
                          <td style={{ textAlign: "center", padding: "16px", borderBottom: "1px solid #e2e8f0", borderTop: gIdx === 0 ? "none" : "1px solid #e2e8f0" }}>
                            <button
                              type="button"
                              onClick={() => toggleGroupAll(group)}
                              style={{
                                fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 6, cursor: "pointer",
                                border: `1.5px solid ${groupAll ? "#4f46e5" : "#cbd5e1"}`, color: groupAll ? "#fff" : "#4f46e5",
                                background: groupAll ? "#4f46e5" : "#fff", transition: "all 0.15s", whiteSpace: "nowrap"
                              }}
                            >
                              {groupAll ? "✓ Group" : "Group All"}
                            </button>
                          </td>
                        </tr>
                        {!isCollapsed && group.masters.map((master) => {
                          const row = permissions.find((p) => p.masterName === master.key);
                          const rowAll = isRowAll(master.key);
                          const allowed = getAllowed(master);
                          return (
                            <tr key={master.key} style={{ background: "#fff" }}>
                              <td style={{ padding: "14px 24px", fontSize: 14, fontWeight: 600, color: "#475569", borderBottom: "1px solid #f1f5f9" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: "12px" }}>
                                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#cbd5e1" }} />
                                  {master.label}
                                </div>
                              </td>
                              {PERMS.map((perm) => {
                                const c = PERM_COLORS[perm];
                                const isAllowed = allowed.includes(perm);
                                const checked = row[perm];
                                return (
                                  <td key={perm} style={{ textAlign: "center", padding: "10px 8px", borderBottom: "1px solid #f1f5f9" }}>
                                    {isAllowed ? (
                                      <div
                                        onClick={() => togglePerm(master.key, perm)}
                                        style={{
                                          width: 24, height: 24, borderRadius: 6,
                                          border: `2px solid ${checked ? c.check : "#cbd5e1"}`,
                                          background: checked ? c.check : "#fff",
                                          display: "flex", alignItems: "center", justifyContent: "center",
                                          cursor: "pointer", transition: "all 0.15s",
                                          margin: "0 auto",
                                          boxShadow: checked ? `0 0 0 3px ${c.bg}` : "none"
                                        }}
                                      >
                                        {checked && (
                                          <svg viewBox="0 0 12 10" style={{ width: 12, height: 12 }}>
                                            <polyline points="1.5,5 4.5,8 10.5,1.5" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        )}
                                      </div>
                                    ) : (
                                      <span style={{ color: "#cbd5e1", fontSize: "16px", fontWeight: "bold" }}>—</span>
                                    )}
                                  </td>
                                );
                              })}
                              {/* Row toggle */}
                              <td style={{ textAlign: "center", padding: "10px 16px", borderBottom: "1px solid #f1f5f9" }}>
                                <button
                                  type="button"
                                  onClick={() => toggleRow(master.key)}
                                  style={{
                                    fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 6, cursor: "pointer",
                                    border: `1.5px solid ${rowAll ? "#369ACF" : "#e2e8f0"}`,
                                    color: rowAll ? "#fff" : "#64748b",
                                    background: rowAll ? "#369ACF" : "#f8fafc",
                                    transition: "all 0.15s"
                                  }}
                                >
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

            {/* Legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: "16px 24px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
              {PERMS.map((perm) => {
                const c = PERM_COLORS[perm];
                return (
                  <div key={perm} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: c.check }} />
                    <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>{PERM_LABELS[perm]}: {PERM_TOOLTIPS[perm]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button
              type="button"
              onClick={() => navigate("/admin/user-types")}
              style={{
                padding: "10px 22px", borderRadius: 9, border: "1.5px solid #cbd5e1",
                color: "#475569", background: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer",
                transition: "background 0.15s"
              }}
              onMouseEnter={e => e.target.style.background = "#f8fafc"}
              onMouseLeave={e => e.target.style.background = "#fff"}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "10px 28px", borderRadius: 9, border: "none",
                background: saving ? "#94a3b8" : "linear-gradient(135deg,#369ACF,#2583b4)",
                color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer",
                boxShadow: saving ? "none" : "0 2px 8px rgba(54, 154, 207,0.35)",
                transition: "all 0.2s"
              }}
            >
              {saving ? "Saving…" : "Create User Type"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
