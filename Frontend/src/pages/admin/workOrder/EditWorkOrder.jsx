import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/Navbar";
import { getWorkOrderById, updateWorkOrder, getMaterialStock } from "../../../api/workOrderApi";
import { getMaterials } from "../../../api/materialApi";
import { getAllMachines } from "../../../api/machineApi";
import { getBOMs, getBOMByMaterialId } from "../../../api/bomApi";
import { getJobParties } from "../../../api/jobPartyApi";
import toast from "react-hot-toast";
import DateInput from "../../../components/DateInput";

export default function EditWorkOrder() {
  const { id } = useParams();
  const navigate = useNavigate();


  const formatDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "—";
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workOrder, setWorkOrder] = useState(null);
  const [workOrderDate, setWorkOrderDate] = useState("");
  const [items, setItems] = useState([]);

  const [materials, setMaterials] = useState([]);
  const [machines, setMachines] = useState([]);
  const [boms, setBoms] = useState([]);
  const [jobParties, setJobParties] = useState([]);

  // Modal states for work order configuration
  const [showModal, setShowModal] = useState(false);
  const [modalItems, setModalItems] = useState([]);


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [woRes, matRes, machineRes, bomRes, jobPartiesRes] = await Promise.all([
          getWorkOrderById(id),
          getMaterials(),
          getAllMachines(),
          getBOMs(),
          getJobParties()
        ]);

        const woData = woRes.data?.data;
        if (!woData) {
          toast.error("Work Order not found");
          navigate("/sales/work-orders");
          return;
        }

        setWorkOrder(woData);
        setWorkOrderDate(woData.work_order_date ? woData.work_order_date.substring(0, 10) : "");
        
        const bomsList = bomRes.data?.data || [];
        setBoms(bomsList);

        const activeBomMaterialIds = new Set(
          bomsList.filter(b => b.id !== null && b.id !== undefined).map(b => Number(b.material_id))
        );

        // Filter materials for Finished / Semi-Finished
        const allMaterials = matRes.data.data || [];
        const filteredMat = allMaterials.filter(m => {
          const type = (m.material_type || "").toLowerCase();
          const isFinishedOrSemi = type.includes("finish") || type.includes("semi");
          return isFinishedOrSemi && activeBomMaterialIds.has(Number(m.id));
        });
        setMaterials(filteredMat);

        const machinesList = Array.isArray(machineRes.data) ? machineRes.data : (machineRes.data?.data || []);
        setMachines(machinesList);
        setJobParties(jobPartiesRes.data?.data || []);

        // Reconstruct Finished Goods vs Raw Materials
        const allItems = woData.items || [];
        const finishedGoodItems = allItems.filter(it => Number(it.production_quantity) > 0);
        const rawMaterialItems = allItems.filter(it => Number(it.production_quantity) === 0);

        const mappedItems = await Promise.all(
          finishedGoodItems.map(async (fgItem) => {
            const itemObj = {
              id: fgItem.id,
              material_id: fgItem.material_id,
              material_name: fgItem.material_name || "Unknown Material",
              material_code: fgItem.material_code || "",
              quantity: Number(fgItem.quantity),
              production_quantity: Number(fgItem.production_quantity),
              exp_delivery_date: fgItem.exp_delivery_date ? fgItem.exp_delivery_date.substring(0, 10) : "",
              batch_no: fgItem.batch_no || "",
              actual_delivery_date: fgItem.actual_delivery_date ? fgItem.actual_delivery_date.substring(0, 10) : "",
              remarks: fgItem.remarks || "",
              machine_id: fgItem.machine_id || "",
              job_party_id: fgItem.job_party_id || "",
              rawMaterials: []
            };

            try {
              const bomRes = await getBOMByMaterialId(fgItem.material_id);
              const bom = bomRes.data?.data;
              if (bom && bom.bomMaterials) {
                itemObj.rawMaterials = await Promise.all(
                  bom.bomMaterials.map(async (rm) => {
                    let stock = 0;
                    try {
                      const stockRes = await getMaterialStock(rm.materialId);
                      stock = stockRes.data?.stock || 0;
                    } catch (err) {
                      console.error(`Failed to fetch stock for material ${rm.materialId}`, err);
                    }

                    // Find if this raw material was already allocated in the database
                    const existingAlloc = rawMaterialItems.find(rmi => Number(rmi.material_id) === Number(rm.materialId));

                    return {
                      id: existingAlloc ? existingAlloc.id : null,
                      materialId: rm.materialId,
                      materialName: rm.materialName,
                      materialCode: rm.materialCode,
                      unitName: rm.unitName,
                      bomQty: Number(rm.quantity),
                      availableStock: Number(stock),
                      productionAmount: existingAlloc ? Number(existingAlloc.quantity) : 0
                    };
                  })
                );
              }
            } catch (err) {
              console.error("Failed to load BOM for item during edit", err);
            }

            return itemObj;
          })
        );

        setItems(mappedItems);
      } catch (err) {
        console.error("Failed to load work order data", err);
        toast.error("Failed to initialize edit screen");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleMaterialChange = async (index, materialId) => {
    const updated = [...items];
    const material = materials.find(m => String(m.id) === String(materialId));

    if (!materialId) {
      updated[index] = {
        ...updated[index],
        material_id: "",
        material_name: "",
        material_code: "",
        machine_id: "",
        job_party_id: "",
        exp_delivery_date: "",
        batch_no: "",
        actual_delivery_date: "",
        remarks: "",
        rawMaterials: []
      };
      setItems(updated);
      return;
    }

    updated[index] = {
      ...updated[index],
      material_id: materialId,
      material_name: material ? material.material_name : "",
      material_code: material ? material.material_code : "",
      machine_id: "",
      job_party_id: "",
      exp_delivery_date: "",
      batch_no: "",
      actual_delivery_date: "",
      remarks: "",
      rawMaterials: []
    };
    setItems(updated);

    try {
      const bomRes = await getBOMByMaterialId(materialId);
      const bom = bomRes.data?.data;
      if (bom && bom.bomMaterials) {
        const rawMaterialsWithStock = await Promise.all(
          bom.bomMaterials.map(async (rm) => {
            let stock = 0;
            try {
              const stockRes = await getMaterialStock(rm.materialId);
              stock = stockRes.data?.stock || 0;
            } catch (err) {
              console.error(`Failed to fetch stock for material ${rm.materialId}`, err);
            }
            return {
              id: null,
              materialId: rm.materialId,
              materialName: rm.materialName,
              materialCode: rm.materialCode,
              unitName: rm.unitName,
              bomQty: Number(rm.quantity),
              availableStock: Number(stock),
              productionAmount: Number(rm.quantity) * Number(updated[index].production_quantity || 1)
            };
          })
        );
        
        setItems(prev => {
          const next = [...prev];
          if (next[index]) {
            next[index].rawMaterials = rawMaterialsWithStock;
          }
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to load BOM raw materials", err);
    }
  };

  const handleQtyChange = (index, qty) => {
    const updated = [...items];
    const qtyVal = Number(qty);
    updated[index].quantity = qtyVal;
    updated[index].production_quantity = qtyVal;

    if (updated[index].rawMaterials) {
      updated[index].rawMaterials = updated[index].rawMaterials.map(rm => ({
        ...rm,
        productionAmount: Number((rm.bomQty * qtyVal).toFixed(3))
      }));
    }
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, {
      material_id: "",
      material_name: "",
      material_code: "",
      quantity: 1,
      production_quantity: 1,
      exp_delivery_date: "",
      batch_no: "",
      actual_delivery_date: "",
      remarks: "",
      machine_id: "",
      job_party_id: ""
    }]);
  };

  const removeItemRow = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, idx) => idx !== index));
    } else {
      toast.error("Work order must have at least one item");
    }
  };

  const handleModalItemChange = (idx, field, value) => {
    setModalItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };

      if (field === "quantity" || field === "production_quantity") {
        if (field === "quantity" && (!next[idx].production_quantity || Number(next[idx].production_quantity) === Number(next[idx].quantity))) {
          next[idx].production_quantity = value;
        }
        const currentProdQty = Number(next[idx].production_quantity) || 0;
        if (next[idx].rawMaterials) {
          next[idx].rawMaterials = next[idx].rawMaterials.map(rm => {
            const req = Number((Number(rm.bomQty) * currentProdQty).toFixed(3));
            const avail = Number(rm.availableStock) || 0;
            const calcMin = Math.max(0, Number((req - avail).toFixed(3)));
            return {
              ...rm,
              productionAmount: req,
              calculatedMinSupply: calcMin,
              minSupplyNeeded: (rm.minSupplyNeeded !== undefined && rm.minSupplyNeeded !== "" && Number(rm.minSupplyNeeded) >= calcMin)
                ? rm.minSupplyNeeded
                : calcMin
            };
          });
        }
      }
      return next;
    });
  };

  const handleRMMinSupplyChange = (itemIdx, rmIdx, value) => {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) {
      return;
    }
    setModalItems(prev => {
      const next = [...prev];
      const targetItem = { ...next[itemIdx] };
      const nextRMs = [...(targetItem.rawMaterials || [])];
      nextRMs[rmIdx] = {
        ...nextRMs[rmIdx],
        minSupplyNeeded: value
      };
      targetItem.rawMaterials = nextRMs;
      next[itemIdx] = targetItem;
      return next;
    });
  };

  const handleRMMinSupplyBlur = (itemIdx, rmIdx, calculatedMinSupply) => {
    const minVal = Number(calculatedMinSupply) || 0;
    setModalItems(prev => {
      const next = [...prev];
      const targetItem = { ...next[itemIdx] };
      const nextRMs = [...(targetItem.rawMaterials || [])];
      const rawVal = nextRMs[rmIdx]?.minSupplyNeeded;
      const currentVal = Number(rawVal);
      if (rawVal === "" || isNaN(currentVal) || currentVal < minVal) {
        toast.error(`Minimum supply cannot be less than ${minVal}`);
        nextRMs[rmIdx] = {
          ...nextRMs[rmIdx],
          minSupplyNeeded: minVal
        };
      } else {
        nextRMs[rmIdx] = {
          ...nextRMs[rmIdx],
          minSupplyNeeded: currentVal
        };
      }
      targetItem.rawMaterials = nextRMs;
      next[itemIdx] = targetItem;
      return next;
    });
  };

  const allRawMaterials = useMemo(() => {
    const list = [];
    (modalItems || []).forEach((it, itemIdx) => {
      if (it.rawMaterials && it.rawMaterials.length > 0) {
        it.rawMaterials.forEach((rm, rmIdx) => {
          const prodQty = Number(it.production_quantity) || 0;
          const bomQty = Number(rm.bomQty) || 0;
          const requiredProdQty = Number((bomQty * prodQty).toFixed(3));
          const availableStock = Number(rm.availableStock) || 0;
          const calculatedMinSupply = Math.max(0, Number((requiredProdQty - availableStock).toFixed(3)));
          const minSupplyNeeded = rm.minSupplyNeeded !== undefined && rm.minSupplyNeeded !== null && rm.minSupplyNeeded !== ""
            ? rm.minSupplyNeeded
            : calculatedMinSupply;

          list.push({
            ...rm,
            itemIdx,
            rmIdx,
            finishedGoodName: it.material_name,
            bomQty,
            availableStock,
            requiredProdQty,
            calculatedMinSupply,
            minSupplyNeeded,
            unitName: rm.unitName || "kg"
          });
        });
      }
    });
    return list;
  }, [modalItems]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const hasInvalid = items.some(it => !it.material_id || Number(it.quantity) <= 0);
    if (hasInvalid) {
      toast.error("Please complete details for all items");
      return;
    }
    const cloned = JSON.parse(JSON.stringify(items)).map(it => {
      const prodQty = Number(it.production_quantity) || 0;
      if (it.rawMaterials) {
        it.rawMaterials = it.rawMaterials.map(rm => {
          const req = Number((Number(rm.bomQty) * prodQty).toFixed(3));
          const avail = Number(rm.availableStock) || 0;
          const calcMin = Math.max(0, Number((req - avail).toFixed(3)));
          return {
            ...rm,
            productionAmount: req,
            calculatedMinSupply: calcMin,
            minSupplyNeeded: (rm.minSupplyNeeded !== undefined && rm.minSupplyNeeded !== "" && Number(rm.minSupplyNeeded) >= calcMin)
              ? rm.minSupplyNeeded
              : calcMin
          };
        });
      }
      return it;
    });
    setModalItems(cloned);
    setShowModal(true);
  };

  const submitWorkOrder = async () => {
    for (const rm of allRawMaterials) {
      const minVal = Number(rm.calculatedMinSupply) || 0;
      const val = Number(rm.minSupplyNeeded);
      if (rm.minSupplyNeeded === "" || isNaN(val) || val < minVal) {
        toast.error(`Minimum supply for ${rm.materialName || "material"} cannot be less than ${minVal} ${rm.unitName || ""}`);
        return;
      }
    }
    setSaving(true);
    try {
      const flattenedItems = [];
      for (const it of modalItems) {
        // Add Finished Good
        flattenedItems.push({
          id: it.id || null,
          material_id: Number(it.material_id),
          quantity: Number(it.quantity),
          production_quantity: Number(it.production_quantity),
          machine_id: it.machine_id ? Number(it.machine_id) : null,
          exp_delivery_date: it.exp_delivery_date || null,
          batch_no: it.batch_no || null,
          actual_delivery_date: it.actual_delivery_date || null,
          remarks: it.remarks || null,
          job_party_id: it.job_party_id ? Number(it.job_party_id) : null
        });

        // Add Raw Materials (only those with non-zero allocation)
        if (it.rawMaterials) {
          for (const rm of it.rawMaterials) {
            const requiredQty = Number((Number(rm.bomQty) * (Number(it.production_quantity) || 0)).toFixed(3));
            if (requiredQty > 0) {
              flattenedItems.push({
                id: rm.id || null, // Keep existing item ID if editing, so it updates instead of re-inserting
                material_id: Number(rm.materialId),
                quantity: requiredQty,
                production_quantity: 0,
                machine_id: it.machine_id ? Number(it.machine_id) : null,
                exp_delivery_date: it.exp_delivery_date || null,
                batch_no: it.batch_no || null,
                actual_delivery_date: it.actual_delivery_date || null,
                remarks: `Allocated raw material for ${it.material_name} (${it.material_code})`,
                job_party_id: it.job_party_id ? Number(it.job_party_id) : null
              });
            }
          }
        }
      }

      const payload = {
        work_order_date: workOrderDate,
        items: flattenedItems
      };

      await updateWorkOrder(id, payload);
      toast.success("Work Order updated successfully!");
      setShowModal(false);
      navigate("/sales/work-orders");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update work order");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate("/sales/work-orders");
  };

  if (loading) {
    return (
      <div className="flex-1 bg-slate-50 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#369ACF] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 min-h-screen">
      <Navbar title="ERP Admin" />
      <main className="flex-1 w-full mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Edit Work Order - WO-{String(workOrder?.work_order_no).padStart(4, "0")}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Modify work order date or items configuration and manage machine scheduling.
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card: Header details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-file-invoice text-[#369ACF]"></i>
              Header Info
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Work Order No.
                </label>
                <input
                  type="text"
                  value={workOrder ? `WO-${String(workOrder.work_order_no).padStart(4, "0")}` : ""}
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <DateInput
                  value={workOrderDate}
                  onChange={(e) => setWorkOrderDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={workOrder?.customer_name || ""}
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-650 font-semibold cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Card: Item Rows */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <i className="fa-solid fa-boxes-stacked text-[#369ACF]"></i>
                Work Order Items
              </h2>
              <button
                type="button"
                onClick={addItemRow}
                className="text-sm font-semibold text-[#369ACF] hover:text-[#2583b4] flex items-center gap-1 cursor-pointer"
              >
                <i className="fa-solid fa-plus text-xs"></i> Add Item Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5 min-w-[250px]">Material Details *</th>
                    <th className="px-6 py-3.5 w-32 text-right">Quantity *</th>
                    <th className="px-6 py-3.5 w-32 text-right">Prod Qty</th>
                    <th className="px-6 py-3.5">Exp Deliv.</th>
                    <th className="px-6 py-3.5">Batch No</th>
                    <th className="px-6 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {items.map((item, idx) => {
                    const machineName = machines.find(m => String(m.id) === String(item.machine_id))?.name || "";

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <select
                            value={item.material_id}
                            onChange={(e) => handleMaterialChange(idx, e.target.value)}
                            required
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none"
                          >
                            <option value="">Select Material</option>
                            {materials.map(m => (
                              <option key={m.id} value={m.id}>{m.material_name} ({m.material_code})</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <input
                            type="number"
                            step="0.001"
                            value={item.quantity}
                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                            required
                            className="w-24 px-2 py-1 border border-slate-200 rounded-lg text-right text-sm"
                          />
                        </td>
                        <td className="px-6 py-4 text-right text-indigo-600 font-semibold">
                          {item.production_quantity}
                        </td>

                        <td className="px-6 py-4 text-xs font-mono">
                          {item.exp_delivery_date ? formatDate(item.exp_delivery_date) : <span className="text-slate-400 italic">Not Set</span>}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                          {item.batch_no || <span className="text-slate-400 italic">Not Set</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-250 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                              title="Delete Row"
                            >
                              <i className="fa-solid fa-trash-can text-sm"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || items.length === 0}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Saving Changes..." : "Save Work Order"}
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* Work Order Configuration & Allocation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <i className="fa-solid fa-sliders text-[#369ACF]"></i>
                  Work Order Configuration
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure production details and review raw materials allocation before saving changes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Item Production Details Sections */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-boxes-stacked text-[#369ACF]"></i>
                  Production Details ({modalItems.length} {modalItems.length === 1 ? "Item" : "Items"})
                </h4>

                {modalItems.map((item, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                          Item #{idx + 1}
                        </span>
                        <span className="text-sm font-bold text-slate-800">
                          {item.material_name || "Unselected"}
                        </span>
                        {item.material_code && (
                          <span className="text-xs font-mono text-slate-400">
                            ({item.material_code})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={item.quantity}
                          onChange={(e) => handleModalItemChange(idx, "quantity", e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Production Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={item.production_quantity}
                          onChange={(e) => handleModalItemChange(idx, "production_quantity", e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm font-semibold text-indigo-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Exp. Delivery Date
                        </label>
                        <DateInput
                          value={item.exp_delivery_date}
                          onChange={(e) => handleModalItemChange(idx, "exp_delivery_date", e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Batch Number
                        </label>
                        <input
                          type="text"
                          placeholder="Enter batch number"
                          value={item.batch_no}
                          onChange={(e) => handleModalItemChange(idx, "batch_no", e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Actual Delivery Date
                        </label>
                        <DateInput
                          value={item.actual_delivery_date}
                          onChange={(e) => handleModalItemChange(idx, "actual_delivery_date", e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Remarks
                        </label>
                        <input
                          type="text"
                          placeholder="Enter remarks"
                          value={item.remarks}
                          onChange={(e) => handleModalItemChange(idx, "remarks", e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Raw Materials Allocation Check Section */}
              <div className="border-t border-slate-200 pt-5">
                <div className="mb-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-layer-group text-[#369ACF]"></i>
                    Raw Materials Allocation Check
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live check of stock availability and minimum supply needed based on required production quantities.
                  </p>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
                  <table className="w-full text-left text-xs text-slate-600 border-collapse">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Raw Material Name</th>
                        <th className="px-4 py-3 text-right">Available Stock</th>
                        <th className="px-4 py-3 text-right">Raw material required for 1 Unit</th>
                        <th className="px-4 py-3 text-right">Raw material required accoring to production quantity</th>
                        <th className="px-4 py-3 text-right">Minimum Supply needed to be made</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {allRawMaterials.length > 0 ? (
                        allRawMaterials.map((rm, rmIdx) => {
                          const isShortfall = rm.minSupplyNeeded > 0;
                          return (
                            <tr key={rmIdx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-800">{rm.materialName}</div>
                                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                                  <span>{rm.materialCode || "—"}</span>
                                  {modalItems.length > 1 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                      For: {rm.finishedGoodName}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-600 text-xs">
                                {rm.availableStock.toFixed(3)} {rm.unitName}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-600 text-xs">
                                {rm.bomQty.toFixed(4)} {rm.unitName}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-700 text-xs">
                                {rm.requiredProdQty.toFixed(3)} {rm.unitName}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex flex-col items-end gap-1">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <input
                                      type="text"
                                      value={rm.minSupplyNeeded}
                                      onChange={(e) => handleRMMinSupplyChange(rm.itemIdx, rm.rmIdx, e.target.value)}
                                      onBlur={() => handleRMMinSupplyBlur(rm.itemIdx, rm.rmIdx, rm.calculatedMinSupply)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleRMMinSupplyBlur(rm.itemIdx, rm.rmIdx, rm.calculatedMinSupply);
                                        }
                                      }}
                                      placeholder={String(rm.calculatedMinSupply)}
                                      className={`w-28 px-2.5 py-1 text-right text-xs font-mono font-semibold border rounded-lg focus:outline-none transition-colors bg-white ${
                                        (rm.minSupplyNeeded === "" || Number(rm.minSupplyNeeded) < rm.calculatedMinSupply)
                                          ? "border-rose-400 text-rose-600 focus:border-rose-500"
                                          : "border-slate-200 text-slate-800 focus:border-indigo-500"
                                      }`}
                                    />
                                    <span className="text-[11px] text-slate-400 font-mono w-6 text-left shrink-0">
                                      {rm.unitName}
                                    </span>
                                  </div>
                                  {(rm.minSupplyNeeded === "" || Number(rm.minSupplyNeeded) < rm.calculatedMinSupply) && (
                                    <span className="text-[10px] text-rose-500 font-medium">
                                      Min: {rm.calculatedMinSupply} {rm.unitName}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400 italic">
                            No raw materials configured for the selected finished goods BOMs.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Back to Form
              </button>
              <button
                type="button"
                onClick={submitWorkOrder}
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check text-xs"></i>
                    Confirm & Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
