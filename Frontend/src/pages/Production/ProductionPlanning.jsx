import React, { useEffect, useState, useMemo, useRef } from "react";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";
import { getAllWorkOrders, updateWorkOrderItemDelay, updateWorkOrderItemPriority, updateWorkOrderItemRemarks } from "../../api/workOrderApi";
import { getReasonsForDelay } from "../../api/reasonForDelayApi";
import { reorderMachineQueueItem, toggleWorkOrderHold, moveWorkOrderItemToPosition } from "../../api/machineScheduleApi";
import { getAllMachines } from "../../api/machineApi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getTablePreference, saveTablePreference } from "../../api/userPreferenceApi";

export default function ProductionPlanning() {
  const [loading, setLoading] = useState(false);
  const [movingId, setMovingId] = useState(null);
  const [machineOrders, setMachineOrders] = useState({});
  const [showHeld, setShowHeld] = useState(false);
  const [editingRemarks, setEditingRemarks] = useState({});
  const navigate = useNavigate();

  // Delay tracking states
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [selectedItemForDelay, setSelectedItemForDelay] = useState(null);
  const [delayHours, setDelayHours] = useState("");
  const [delayReason, setDelayReason] = useState("");
  const [customReasonText, setCustomReasonText] = useState("");
  const [standardReasons, setStandardReasons] = useState([]);
  const [savingDelay, setSavingDelay] = useState(false);

  // Priority inline edit states
  const [editingPriorities, setEditingPriorities] = useState({});

  const handleRemarkEditStart = (itemId, currentRemarks) => {
    setEditingRemarks(prev => ({
      ...prev,
      [itemId]: currentRemarks || ""
    }));
  };

  const handleRemarkChange = (itemId, value) => {
    setEditingRemarks(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleRemarkCancel = (itemId) => {
    setEditingRemarks(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handleRemarkSave = async (itemId, newValue) => {
    try {
      await updateWorkOrderItemRemarks(itemId, { remarks: newValue || null });
      setMachineOrders(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(mId => {
          next[mId] = {
            ...next[mId],
            workOrders: next[mId].workOrders.map(wo => {
              if (wo.work_order_item_id === itemId) {
                return { ...wo, remarks: newValue };
              }
              return wo;
            })
          };
        });
        return next;
      });
      handleRemarkCancel(itemId);
      toast.success("Remark updated successfully");
    } catch (err) {
      console.error("Failed to update remark:", err);
      toast.error(err.response?.data?.message || "Failed to update remark");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [workOrdersRes, machinesRes] = await Promise.all([
        getAllWorkOrders(showHeld),
        getAllMachines(false)
      ]);
      const rawItems = workOrdersRes.data.data || [];
      const activeMachines = machinesRes.data.data || [];

      // Filter and Group by Machine
      const grouped = {};

      // Initialize with all active machines
      activeMachines.forEach(machine => {
        grouped[machine.id] = {
          machineId: machine.id,
          machineName: machine.name || `Machine #${machine.id}`,
          machineNumber: machine.machine_number || 'N/A',
          workOrders: []
        };
      });

      // Group work orders by machine
      rawItems.forEach(item => {
        if (item.work_order_no && item.machine_id) {
          const key = item.machine_id;
          if (!grouped[key]) {
            // Fallback for machines not found or inactive with assigned work orders
            grouped[key] = {
              machineId: item.machine_id,
              machineName: item.machine_name || `Machine #${item.machine_id}`,
              machineNumber: item.machine_number || 'N/A',
              workOrders: []
            };
          }
          grouped[key].workOrders.push(item);
        }
      });

      // Sort by queue position (sort_order)
      Object.keys(grouped).forEach(key => {
        grouped[key].workOrders.sort((a, b) => {
          return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        });
      });

      setMachineOrders(grouped);
    } catch (err) {
      console.error("Failed to load production planning data", err);
      toast.error("Failed to load production planning data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [showHeld]);

  // Load standard reasons on mount
  useEffect(() => {
    const fetchReasons = async () => {
      try {
        const res = await getReasonsForDelay();
        setStandardReasons(res.data?.data || []);
      } catch (err) {
        console.error("Failed to load standard delay reasons", err);
      }
    };
    fetchReasons();
  }, []);

  const handleDelayClick = (row) => {
    setSelectedItemForDelay(row);
    setDelayHours(row.delay_hours !== null && row.delay_hours !== undefined ? String(row.delay_hours) : "");
    
    const savedReason = row.delay_reason || "";
    const isStandard = standardReasons.some(r => r.reason_name === savedReason);
    if (savedReason === "") {
      setDelayReason("");
      setCustomReasonText("");
    } else if (isStandard) {
      setDelayReason(savedReason);
      setCustomReasonText("");
    } else {
      setDelayReason("Other");
      setCustomReasonText(savedReason);
    }
    
    setShowDelayModal(true);
  };

  const handleSaveDelay = async (e) => {
    e.preventDefault();
    if (!selectedItemForDelay) return;

    setSavingDelay(true);
    try {
      const finalReason = delayReason === "Other" ? customReasonText.trim() : delayReason;
      const hours = delayHours === "" ? 0 : parseFloat(delayHours);

      await updateWorkOrderItemDelay(selectedItemForDelay.work_order_item_id, {
        delay_hours: hours,
        delay_reason: finalReason || null
      });

      toast.success("Delay updated successfully");
      setShowDelayModal(false);
      await loadData();
    } catch (err) {
      console.error("Failed to save delay details:", err);
      toast.error(err.response?.data?.message || "Failed to save delay details");
    } finally {
      setSavingDelay(false);
    }
  };

  const handlePriorityEditStart = (itemId, currentVal) => {
    setEditingPriorities(prev => ({
      ...prev,
      [itemId]: currentVal !== null && currentVal !== undefined ? String(currentVal) : ""
    }));
  };

  const handlePriorityChange = (itemId, value) => {
    setEditingPriorities(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handlePriorityCancel = (itemId) => {
    setEditingPriorities(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handlePrioritySave = async (itemId, newValue) => {
    try {
      const priorityVal = newValue === "" ? null : parseInt(newValue, 10);
      await updateWorkOrderItemPriority(itemId, { priority_no: priorityVal });
      handlePriorityCancel(itemId);
      toast.success("Priority updated successfully");
      await loadData();
    } catch (err) {
      console.error("Failed to update priority:", err);
      toast.error(err.response?.data?.message || "Failed to update priority");
    }
  };

  const handleMove = async (machineId, workOrderItemId, direction) => {
    if (movingId !== null) return;
    setMovingId(workOrderItemId);
    try {
      await reorderMachineQueueItem(machineId, workOrderItemId, direction);
      await loadData();
      toast.success(`Successfully moved ${direction}`);
    } catch (err) {
      console.error("Failed to reorder work order:", err);
      toast.error(err.response?.data?.message || "Failed to reorder work order");
    } finally {
      setMovingId(null);
    }
  };

  const handleDragReorder = async (machineId, fromIndex, toIndex, draggedRow, targetRow) => {
    if (movingId !== null) return;
    if (fromIndex === toIndex) return;

    // Optimistic update: instantly update local state for a smooth UI transition
    const group = machineOrders[machineId];
    if (!group) return;

    const originalWorkOrders = [...group.workOrders];
    const updatedWorkOrders = [...originalWorkOrders];

    // Splice and insert
    const [movedItem] = updatedWorkOrders.splice(fromIndex, 1);
    updatedWorkOrders.splice(toIndex, 0, movedItem);

    // Update state optimistically
    setMachineOrders(prev => ({
      ...prev,
      [machineId]: {
        ...prev[machineId],
        workOrders: updatedWorkOrders
      }
    }));

    setMovingId(movedItem.work_order_item_id);

    try {
      // Call the API to move the item to its new sort index (toIndex)
      await moveWorkOrderItemToPosition(machineId, movedItem.work_order_item_id, toIndex);
      toast.success("Successfully reordered work order queue");
      // Reload actual database states to ensure alignment and reschedule times
      await loadData();
    } catch (err) {
      console.error("Failed to drag-reorder work order:", err);
      toast.error(err.response?.data?.message || "Failed to reorder queue");
      
      // Rollback to original on failure
      setMachineOrders(prev => ({
        ...prev,
        [machineId]: {
          ...prev[machineId],
          workOrders: originalWorkOrders
        }
      }));
    } finally {
      setMovingId(null);
    }
  };


  const handleToggleHold = async (workOrderItemId, currentHoldState) => {
    try {
      await toggleWorkOrderHold(workOrderItemId, !currentHoldState);
      toast.success(currentHoldState ? "Work Order resumed" : "Work Order placed on HOLD");
      await loadData();
    } catch (err) {
      console.error("Failed to update hold status:", err);
      toast.error(err.response?.data?.message || "Failed to update hold status");
    }
  };

  const formatDate = (dateInput) => {
    if (!dateInput) return "—";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "—";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Define Columns configuration for DataTable
  const columns = useMemo(() => [
    {
      key: "seq",
      label: "Seq",
      sortable: false,
      minWidth: "120px",
      render: (row) => {
        const idx = row._index;
        const machineId = row._machineId;
        const total = row._totalInMachine;
        const isMoving = movingId === row.work_order_item_id;
        const isHeld = !!row.is_on_hold;
        return (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handleMove(machineId, row.work_order_item_id, 'up')}
              disabled={idx === 0 || movingId !== null}
              className={`p-1 rounded hover:bg-slate-200 transition-colors ${idx === 0 || movingId !== null ? 'text-slate-300 cursor-not-allowed opacity-50' : 'text-slate-600'
                }`}
              title="Move Priority Up"
            >
              {isMoving ? (
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-slate-600 border-t-transparent"></div>
              ) : (
                <i className="fa-solid fa-arrow-up text-xs"></i>
              )}
            </button>
            <button
              onClick={() => handleMove(machineId, row.work_order_item_id, 'down')}
              disabled={idx === total - 1 || movingId !== null}
              className={`p-1 rounded hover:bg-slate-200 transition-colors ${idx === total - 1 || movingId !== null ? 'text-slate-300 cursor-not-allowed opacity-50' : 'text-slate-600'
                }`}
              title="Move Priority Down"
            >
              {isMoving ? (
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-slate-600 border-t-transparent"></div>
              ) : (
                <i className="fa-solid fa-arrow-down text-xs"></i>
              )}
            </button>
            <button
              onClick={() => handleToggleHold(row.work_order_item_id, isHeld)}
              title={isHeld ? "Resume Work Order" : "Hold Work Order"}
              className={`p-1 rounded transition-colors cursor-pointer ${isHeld
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 shadow-sm'
                  : 'hover:bg-slate-200 text-slate-500 hover:text-amber-600'
                }`}
            >
              <i className={`fa-solid ${isHeld ? 'fa-play' : 'fa-pause'} text-xs`}></i>
            </button>
          </div>
        );
      }
    },
    {
      key: "work_order_no",
      label: "Work Order No.",
      minWidth: "150px",
      getSearchValue: (row) => `WO-${String(row.work_order_no).padStart(4, '0')}`,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">
            WO-{String(row.work_order_no).padStart(4, '0')}
          </span>
          {!!row.is_on_hold && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200 whitespace-nowrap shadow-sm">
              HOLD
            </span>
          )}
        </div>
      )
    },
    {
      key: "work_order_date",
      label: "Work Order Date",
      minWidth: "130px",
      getSearchValue: (row) => formatDate(row.work_order_date),
      render: (row) => formatDate(row.work_order_date)
    },
    {
      key: "customer_name",
      label: "Customer Name",
      minWidth: "180px",
      getSearchValue: (row) => `${row.customer_name} ${row.customer_code}`,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800">{row.customer_name}</span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">{row.customer_code}</span>
        </div>
      )
    },
    {
      key: "pmemo",
      label: "PMemo",
      minWidth: "120px",
      getSearchValue: (row) => row.p_memo_no ? `PM-${String(row.p_memo_no).padStart(4, '0')}` : "",
      render: (row) => {
        const pMemoNo = row.p_memo_no;
        if (pMemoNo) {
          return (
            <button
              onClick={() => navigate(`/production/p-memo/${row.work_order_item_id}`)}
              className="text-indigo-600 hover:text-indigo-800 font-semibold font-mono text-xs hover:underline cursor-pointer"
            >
              PM-{String(pMemoNo).padStart(4, '0')}
            </button>
          );
        } else {
          return (
            <button
              onClick={() => navigate(`/production/p-memo/${row.work_order_item_id}`)}
              className="px-2 py-1 text-[11px] font-semibold rounded bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm cursor-pointer"
            >
              PMemo
            </button>
          );
        }
      }
    },
    {
      key: "material_name",
      label: "Material name",
      minWidth: "180px"
    },
    {
      key: "raw_material_name",
      label: "Raw Material name",
      minWidth: "180px",
      render: (row) => row.raw_material_name || "—"
    },
    {
      key: "raw_material_required",
      label: "Raw Material Required",
      minWidth: "150px",
      getSearchValue: (row) => row.product_weight && row.wo_quantity
        ? `${(parseFloat(row.product_weight) * parseFloat(row.wo_quantity)).toFixed(3)} kg`
        : "",
      render: (row) => row.product_weight && row.wo_quantity
        ? `${(parseFloat(row.product_weight) * parseFloat(row.wo_quantity)).toFixed(3)} kg`
        : "—"
    },
    {
      key: "mould_name",
      label: "Mould",
      minWidth: "130px",
      render: (row) => row.mould_name ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 whitespace-nowrap">
          {row.mould_name}
        </span>
      ) : "—"
    },
    {
      key: "running_start_date",
      label: "Running Start Date",
      minWidth: "130px",
      getSearchValue: (row) => formatDate(row.running_start_date),
      render: (row) => formatDate(row.running_start_date)
    },
    {
      key: "running_end_date",
      label: "Running end Date",
      minWidth: "130px",
      getSearchValue: (row) => formatDate(row.running_end_date),
      render: (row) => formatDate(row.running_end_date)
    },
    {
      key: "planned_start_date",
      label: "Planned Start Date",
      minWidth: "130px",
      getSearchValue: (row) => formatDate(row.planned_start_date),
      render: (row) => formatDate(row.planned_start_date)
    },
    {
      key: "planned_end_date",
      label: "Planned End Date",
      minWidth: "130px",
      getSearchValue: (row) => formatDate(row.planned_end_date),
      render: (row) => formatDate(row.planned_end_date)
    },
    {
      key: "production_qty",
      label: "Production Quantity",
      minWidth: "150px",
      render: (row) => row.wo_quantity || "—"
    },
    {
      key: "produce_qty",
      label: "Produce Quantity",
      minWidth: "130px",
      render: () => "0"
    },
    {
      key: "remaining_qty",
      label: "Remaining Quantity",
      minWidth: "150px",
      render: () => "-"
    },
    {
      key: "working_hr",
      label: "Working Hr.",
      minWidth: "120px",
      render: () => "-"
    },
    {
      key: "remaining_hr",
      label: "Remaining Hr.",
      minWidth: "120px",
      render: () => "-"
    },
    {
      key: "delay_hr",
      label: "Delay Hr.",
      minWidth: "100px",
      getSearchValue: (row) => {
        const hr = parseFloat(row.delay_hours);
        return hr && hr > 0 ? `${hr} hr ${row.delay_reason || ''}` : '';
      },
      render: (row) => {
        const hr = parseFloat(row.delay_hours);
        const hasDelay = hr && hr > 0;
        return (
          <span 
            className={hasDelay ? "text-rose-600 font-semibold cursor-help" : "text-slate-500"} 
            title={row.delay_reason || (hasDelay ? "No reason specified" : "")}
          >
            {hasDelay ? `${hr} hr` : "—"}
          </span>
        );
      }
    },
    {
      key: "exp_del_date",
      label: "Exp.Del.Date.",
      minWidth: "130px",
      getSearchValue: (row) => formatDate(row.exp_delivery_date),
      render: (row) => formatDate(row.exp_delivery_date)
    },
    {
      key: "priority",
      label: "Priority",
      minWidth: "120px",
      render: (row) => {
        const isEditing = editingPriorities[row.work_order_item_id] !== undefined;
        const currentVal = editingPriorities[row.work_order_item_id] ?? row.priority_no ?? "";
        return (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <input
                  type="number"
                  value={currentVal}
                  onChange={(e) => handlePriorityChange(row.work_order_item_id, e.target.value)}
                  className="px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-indigo-500 w-16"
                  placeholder="No."
                />
                <button
                  onClick={() => handlePrioritySave(row.work_order_item_id, currentVal)}
                  className="p-1 text-green-600 hover:bg-green-50 rounded cursor-pointer"
                  title="Save Priority"
                >
                  <i className="fa-solid fa-check text-xs"></i>
                </button>
                <button
                  onClick={() => handlePriorityCancel(row.work_order_item_id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                  title="Cancel"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              </>
            ) : (
              <>
                <span className="text-slate-700 text-xs font-semibold">
                  {row.priority_no !== null && row.priority_no !== undefined ? row.priority_no : "—"}
                </span>
                <button
                  onClick={() => handlePriorityEditStart(row.work_order_item_id, row.priority_no)}
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                  title="Edit Priority"
                >
                  <i className="fa-solid fa-pencil text-[10px]"></i>
                </button>
              </>
            )}
          </div>
        );
      }
    },
    {
      key: "date_edit",
      label: "Date edit",
      minWidth: "100px",
      render: () => "-"
    },
    {
      key: "remark",
      label: "Remark",
      minWidth: "200px",
      render: (row) => {
        const isEditing = editingRemarks[row.work_order_item_id] !== undefined;
        const currentVal = editingRemarks[row.work_order_item_id] ?? row.remarks ?? "";
        return (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={currentVal}
                  onChange={(e) => handleRemarkChange(row.work_order_item_id, e.target.value)}
                  className="px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-indigo-500 w-full"
                  placeholder="Enter remark..."
                />
                <button
                  onClick={() => handleRemarkSave(row.work_order_item_id, currentVal)}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                  title="Save Remark"
                >
                  <i className="fa-solid fa-check text-xs"></i>
                </button>
                <button
                  onClick={() => handleRemarkCancel(row.work_order_item_id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                  title="Cancel"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              </>
            ) : (
              <>
                <span className="text-slate-700 text-xs truncate max-w-[120px]" title={row.remarks || ""}>
                  {row.remarks || "-"}
                </span>
                <button
                  onClick={() => handleRemarkEditStart(row.work_order_item_id, row.remarks)}
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                  title="Edit Remark"
                >
                  <i className="fa-solid fa-pencil text-[10px]"></i>
                </button>
              </>
            )}
          </div>
        );
      }
    },
    {
      key: "delay_btn",
      label: "Delay",
      minWidth: "90px",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleDelayClick(row)}
          className="px-2.5 py-1 text-xs font-semibold rounded bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors shadow-sm cursor-pointer"
        >
          Delay
        </button>
      )
    },
    {
      key: "edit_btn",
      label: "Edit",
      minWidth: "80px",
      render: (row) => (
        <button
          type="button"
          onClick={() => navigate(`/sales/work-orders/edit/${row.work_order_id}?from=planning`)}
          className="px-2.5 py-1 text-xs font-semibold rounded bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-100 transition-colors shadow-sm cursor-pointer"
        >
          Edit
        </button>
      )
    },
    {
      key: "machine_chart",
      label: "Machine Chart",
      minWidth: "120px",
      render: () => (
        <button
          type="button"
          className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-150 text-slate-700 border border-slate-250 hover:bg-slate-200 transition-colors shadow-sm"
        >
          Machine Chart
        </button>
      )
    }
  ], [movingId, navigate, editingRemarks, standardReasons, editingPriorities, showHeld]);

  // Column Chooser Page-Level States & Hooks
  const [visibleKeys, setVisibleKeys] = useState([]);
  const [showColumnChooser, setShowColumnChooser] = useState(false);
  const columnChooserRef = useRef(null);

  // Click outside to close page-level column chooser
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (columnChooserRef.current && !columnChooserRef.current.contains(e.target)) {
        setShowColumnChooser(false);
      }
    };
    if (showColumnChooser) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showColumnChooser]);

  // Load layout preference on mount
  useEffect(() => {
    const loadPref = async () => {
      try {
        const response = await getTablePreference("production_planning");
        if (response?.data?.success && response.data.data) {
          setVisibleKeys(response.data.data);
        } else {
          setVisibleKeys(columns.map(c => c.key));
        }
      } catch (err) {
        console.error("Failed to load layout preference:", err);
        setVisibleKeys(columns.map(c => c.key));
      }
    };
    loadPref();
  }, [columns]);

  // Real-time synchronization event listener
  useEffect(() => {
    const handleSync = (e) => {
      if (e.detail.tableId === "production_planning") {
        setVisibleKeys(e.detail.savedOrder);
      }
    };
    window.addEventListener("table-preference-updated", handleSync);
    return () => window.removeEventListener("table-preference-updated", handleSync);
  }, []);

  const handleToggleColumn = async (key) => {
    let newKeys;
    if (visibleKeys.includes(key)) {
      if (key === 'seq') return; // Seq is locked
      newKeys = visibleKeys.filter(k => k !== key);
    } else {
      const allKeys = columns.map(c => c.key);
      newKeys = allKeys.filter(k => visibleKeys.includes(k) || k === key);
    }
    setVisibleKeys(newKeys);
    try {
      await saveTablePreference("production_planning", newKeys);
      window.dispatchEvent(new CustomEvent('table-preference-updated', { detail: { tableId: "production_planning", savedOrder: newKeys } }));
    } catch (err) {
      console.error("Failed to save layout preference:", err);
    }
  };

  const handleResetColumns = async () => {
    const allKeys = columns.map(c => c.key);
    setVisibleKeys(allKeys);
    try {
      await saveTablePreference("production_planning", allKeys);
      window.dispatchEvent(new CustomEvent('table-preference-updated', { detail: { tableId: "production_planning", savedOrder: allKeys } }));
      setShowColumnChooser(false);
    } catch (err) {
      console.error("Failed to reset layout preference:", err);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen font-sans text-slate-900">
      <Navbar title="Production Planning" />

      <main className="flex-1 w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">

        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Production Planning</h1>
            <p className="text-sm text-slate-500 mt-1">
              Sequence scheduled work orders for each machine.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            {/* Page-level Column Chooser */}
            <div className="relative" ref={columnChooserRef}>
              <button
                onClick={() => setShowColumnChooser(prev => !prev)}
                title="Show / hide columns"
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg shadow transition-colors border cursor-pointer ${
                  showColumnChooser
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-350'
                }`}
              >
                <i className="fa-solid fa-columns"></i>
                <span>Columns</span>
                {columns.length - visibleKeys.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-4 h-4 px-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold leading-none">
                    {columns.length - visibleKeys.length}
                  </span>
                )}
              </button>

              {showColumnChooser && (
                <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-slate-200 bg-white shadow-2xl">
                  <div className="border-b border-slate-100 px-3 py-2.5 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Toggle Columns
                    </p>
                    <span className="text-[11px] text-slate-400">
                      {visibleKeys.length}/{columns.length}
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
                    {columns.map(col => {
                      const isLocked  = col.key === 'seq';
                      const isVisible = visibleKeys.includes(col.key);
                      return (
                        <label
                          key={col.key}
                          className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm select-none transition-colors ${
                            isLocked
                              ? 'cursor-not-allowed opacity-50'
                              : 'cursor-pointer hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isVisible}
                            disabled={isLocked}
                            onChange={() => !isLocked && handleToggleColumn(col.key)}
                            className="accent-indigo-600 h-3.5 w-3.5 flex-shrink-0"
                          />
                          <span className={`flex-1 font-medium ${isVisible ? 'text-slate-700' : 'text-slate-400'}`}>
                            {col.label}
                          </span>
                          {isLocked && (
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                              Locked
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-100 p-2">
                    <button
                      onClick={handleResetColumns}
                      className="w-full rounded-lg py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <i className="fa-solid fa-rotate-left text-xs"></i>
                      Reset to Default
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowHeld(prev => !prev)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg shadow transition-colors border cursor-pointer ${showHeld
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-350'
                }`}
            >
              <i className={`fa-solid ${showHeld ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              {showHeld ? "Hide Held Items" : "Show Held Items"}
            </button>
            <button
              onClick={() => loadData()}
              className="flex items-center gap-2 px-4 py-2 bg-[#369ACF] hover:bg-[#03284c] text-white text-sm font-semibold rounded-lg shadow transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-rotate-right"></i> Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#369ACF] border-t-transparent"></div>
          </div>
        ) : Object.keys(machineOrders).length > 0 ? (
          <div className="space-y-12">
            {Object.keys(machineOrders).map(machineId => {
              const group = machineOrders[machineId];
              // Map items to inject indices and bounds for rendering
              const mappedData = group.workOrders.map((wo, idx) => ({
                ...wo,
                id: wo.work_order_item_id, // unique key for list mapping inside DataTable
                _index: idx,
                _machineId: machineId,
                _totalInMachine: group.workOrders.length
              }));

              return (
                <div key={machineId} className="space-y-4">
                  <DataTable
                    title={`${group.machineName} (${group.machineNumber})`}
                    tableId="production_planning"
                    data={mappedData}
                    columns={columns}
                    loading={false}
                    searchPlaceholder="Search this machine's jobs..."
                    hideColumnChooser={true}
                    hidePagination={true}
                    onRowReorder={(fromIdx, toIdx, draggedRow, targetRow) =>
                      handleDragReorder(machineId, fromIdx, toIdx, draggedRow, targetRow)
                    }
                    actionButton={
                      <button
                        onClick={() => navigate(`/admin/machines/${machineId}/calendar`)}
                        title="View Machine Calendar"
                        className="flex items-center gap-1.5 h-10 px-4 rounded-lg  border border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors cursor-pointer text-sm font-semibold shadow-sm"
                      >
                        <i className="fa-solid fa-calendar-days"></i>
                        
                      </button>
                    }
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4 text-2xl">
              <i className="fa-solid fa-calendar-xmark"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Scheduled Jobs Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Setup work orders first and assign them to machines to view the planning schedule.
            </p>
          </div>
        )}
      </main>

      {showDelayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in duration-200">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Record Delay</h2>
                <p className="text-sm text-slate-500">
                  Specify the delay duration and reason for WO-{selectedItemForDelay ? String(selectedItemForDelay.work_order_no).padStart(4, '0') : ''}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDelayModal(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                aria-label="Close"
              >
                <span aria-hidden="true" className="text-lg">&times;</span>
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSaveDelay}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Delay Hours
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={delayHours}
                  onChange={(e) => setDelayHours(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#369ACF] focus:ring-2 focus:ring-[#369ACF]/30"
                  placeholder="Enter delay in hours (e.g. 2.5)"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Standard Delay Reason
                </label>
                <select
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#369ACF] focus:ring-2 focus:ring-[#369ACF]/30"
                >
                  <option value="">Select standard reason...</option>
                  {standardReasons.map((r) => (
                    <option key={r.id} value={r.reason_name}>
                      {r.reason_name}
                    </option>
                  ))}
                  <option value="Other">Other / Custom Reason</option>
                </select>
              </div>

              {delayReason === "Other" && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Custom Reason Details
                  </label>
                  <textarea
                    value={customReasonText}
                    onChange={(e) => setCustomReasonText(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#369ACF] focus:ring-2 focus:ring-[#369ACF]/30"
                    placeholder="Describe the reason for the delay"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDelayModal(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDelay}
                  className="rounded-xl bg-[#369ACF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2583b4] disabled:opacity-60 cursor-pointer"
                >
                  {savingDelay ? "Saving..." : "Save Delay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
