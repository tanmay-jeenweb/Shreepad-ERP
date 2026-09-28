import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/Navbar";
import { getWorkOrderById, updateWorkOrder, getMaterialStock } from "../../../api/workOrderApi";
import { getMaterials } from "../../../api/materialApi";
import { getBOMs, getBOMByMaterialId } from "../../../api/bomApi";
import { getJobParties } from "../../../api/jobPartyApi";
import { getInspections } from "../../../api/inspectionApi";
import toast from "react-hot-toast";
import DateInput from "../../../components/DateInput";
import ItemConfigModal from "./ItemConfigModal";
import MaterialFilterDropdown from "../../../components/MaterialFilterDropdown";

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
  const [workOrder, setWorkOrder] = useState(null);
  const [workOrderStatus, setWorkOrderStatus] = useState("Draft");
  const [workOrderDate, setWorkOrderDate] = useState("");
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const [purchaseOrderDate, setPurchaseOrderDate] = useState("");
  const [projectName, setProjectName] = useState("");
  const [inspectionId, setInspectionId] = useState("");
  const [remark, setRemark] = useState("");
  const [items, setItems] = useState([]);

  const [materials, setMaterials] = useState([]);
  const [boms, setBoms] = useState([]);
  const [jobParties, setJobParties] = useState([]);
  const [inspections, setInspections] = useState([]);

  // Modal states for work order configuration (common modal on save)
  const [showModal, setShowModal] = useState(false);
  const [modalItems, setModalItems] = useState([]);
  const [activeModalTab, setActiveModalTab] = useState("all");

  // Modal states for single item configuration (gear symbol)
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [singleItemIdx, setSingleItemIdx] = useState(null);


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [woRes, matRes, bomRes, jobPartiesRes, inspRes] = await Promise.all([
          getWorkOrderById(id),
          getMaterials(),
          getBOMs(),
          getJobParties(),
          getInspections()
        ]);

        const woData = woRes.data?.data;
        if (!woData) {
          toast.error("Work order not found");
          navigate("/sales/work-orders");
          return;
        }

        setWorkOrder(woData);
        setWorkOrderStatus(woData.status || "Draft");
        setWorkOrderDate(woData.work_order_date ? woData.work_order_date.substring(0, 10) : "");
        setPurchaseOrderNumber(woData.purchase_order_number || "");
        setPurchaseOrderDate(woData.purchase_order_date ? woData.purchase_order_date.substring(0, 10) : "");
        setProjectName(woData.project_name || "");
        setInspectionId(woData.inspection_id || "");
        setRemark(woData.remark || "");
        setInspections(inspRes.data?.data || []);
        
        const bomsList = bomRes.data?.data || [];
        setBoms(bomsList);

        const activeBomMaterialIds = new Set(
          bomsList.filter(b => b.id !== null && b.id !== undefined).map(b => Number(b.material_id))
        );

        // Filter materials for Finished / Semi-Finished
        const allMaterials = matRes.data.data || [];
        const filteredMat = allMaterials.filter(m => {
          const group = (m.material_group || m.material_type || "").toLowerCase();
          const isFinishedOrSemi = group.includes("finish") || group.includes("semi");
          return isFinishedOrSemi && activeBomMaterialIds.has(Number(m.id));
        });
        setMaterials(filteredMat);
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
              remarks: fgItem.remarks || "",
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
                    const prodQty = Number(fgItem.production_quantity) || Number(fgItem.quantity) || 1;
                    const bomQty = Number(rm.quantity);
                    const req = existingAlloc ? Number(existingAlloc.quantity) : Number((bomQty * prodQty).toFixed(3));
                    const avail = Number(stock) || 0;
                    const calcMin = Math.max(0, Number((req - avail).toFixed(3)));

                    return {
                      id: existingAlloc ? existingAlloc.id : null,
                      materialId: rm.materialId,
                      materialName: rm.materialName,
                      materialCode: rm.materialCode,
                      unitName: rm.unitName,
                      bomQty: bomQty,
                      availableStock: avail,
                      productionAmount: req,
                      calculatedMinSupply: calcMin,
                      minSupplyNeeded: calcMin
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
        job_party_id: "",
        exp_delivery_date: "",
        batch_no: "",
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
      job_party_id: "",
      exp_delivery_date: "",
      batch_no: "",
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
            const bomQty = Number(rm.quantity);
            const prodQty = Number(updated[index].production_quantity || 1);
            const req = Number((bomQty * prodQty).toFixed(3));
            const avail = Number(stock) || 0;
            const calcMin = Math.max(0, Number((req - avail).toFixed(3)));
            return {
              id: null,
              materialId: rm.materialId,
              materialName: rm.materialName,
              materialCode: rm.materialCode,
              unitName: rm.unitName,
              bomQty,
              availableStock: avail,
              productionAmount: req,
              calculatedMinSupply: calcMin,
              minSupplyNeeded: calcMin
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
      updated[index].rawMaterials = updated[index].rawMaterials.map(rm => {
        const req = Number((Number(rm.bomQty) * qtyVal).toFixed(3));
        const avail = Number(rm.availableStock) || 0;
        const calcMin = Math.max(0, Number((req - avail).toFixed(3)));
        return {
          ...rm,
          productionAmount: req,
          calculatedMinSupply: calcMin,
          minSupplyNeeded: (rm.minSupplyNeeded !== undefined && rm.minSupplyNeeded !== "" && !isNaN(Number(rm.minSupplyNeeded)))
            ? rm.minSupplyNeeded
            : calcMin
        };
      });
    }
    setItems(updated);
  };

  const addItemRow = () => {
    if (workOrderStatus === "Started") {
      toast.error("Cannot add new material rows: Work Order is already Started.");
      return;
    }
    setItems([...items, {
      material_id: "",
      material_name: "",
      material_code: "",
      quantity: 1,
      production_quantity: 1,
      exp_delivery_date: "",
      batch_no: "",
      remarks: "",
      job_party_id: ""
    }]);
  };

  const removeItemRow = (index) => {
    if (workOrderStatus === "Started") {
      toast.error("Cannot delete material rows: Work Order is already Started.");
      return;
    }
    if (items.length > 1) {
      setItems(items.filter((_, idx) => idx !== index));
    } else {
      toast.error("Work order must have at least one item");
    }
  };

  const isItemConfigured = (item) => {
    if (!item) return false;
    return Boolean(
      item.batch_no ||
      item.exp_delivery_date ||
      item.remarks ||
      (item.production_quantity !== undefined && Number(item.production_quantity) !== Number(item.quantity)) ||
      (item.rawMaterials && item.rawMaterials.some(rm => rm.minSupplyNeeded !== undefined && rm.minSupplyNeeded !== "" && Number(rm.minSupplyNeeded) > 0))
    );
  };

  const handleOpenItemConfig = (idx) => {
    const target = items[idx];
    if (!target?.material_id) {
      toast.error("Please select a material first");
      return;
    }
    if (!target.quantity || Number(target.quantity) <= 0) {
      toast.error("Please enter a valid quantity first");
      return;
    }
    setSingleItemIdx(idx);
    setShowSingleModal(true);
  };

  const handleSaveSingleItemConfig = (updatedItem) => {
    if (singleItemIdx === null) return;
    const updated = [...items];
    updated[singleItemIdx] = updatedItem;
    setItems(updated);
    setShowSingleModal(false);
    toast.success(`Configuration saved for ${updatedItem.material_name || `Item #${singleItemIdx + 1}`}`);
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
              minSupplyNeeded: (rm.minSupplyNeeded !== undefined && rm.minSupplyNeeded !== "" && !isNaN(Number(rm.minSupplyNeeded)))
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
      if (rawVal === "" || isNaN(currentVal) || currentVal < 0) {
        nextRMs[rmIdx] = {
          ...nextRMs[rmIdx],
          minSupplyNeeded: 0
        };
      } else {
        nextRMs[rmIdx] = {
          ...nextRMs[rmIdx],
          minSupplyNeeded: currentVal
        };
        if (currentVal < minVal) {
          toast(
            `Notice: Entered supply is less than available quantity shortfall in system (${minVal}).`,
            { icon: "⚠️" }
          );
        }
      }
      targetItem.rawMaterials = nextRMs;
      next[itemIdx] = targetItem;
      return next;
    });
  };

  const handleCloseCommonModal = () => {
    setItems(modalItems);
    setShowModal(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const hasInvalid = items.some(it => !it.material_id || Number(it.quantity) <= 0);
    if (hasInvalid) {
      toast.error("Please complete details for all items");
      return;
    }
    const cloned = JSON.parse(JSON.stringify(items)).map(it => {
      const prodQty = Number(it.production_quantity) || Number(it.quantity) || 0;
      it.production_quantity = prodQty;
      if (it.rawMaterials) {
        it.rawMaterials = it.rawMaterials.map(rm => {
          const req = Number((Number(rm.bomQty) * prodQty).toFixed(3));
          const avail = Number(rm.availableStock) || 0;
          const calcMin = Math.max(0, Number((req - avail).toFixed(3)));
          return {
            ...rm,
            productionAmount: req,
            calculatedMinSupply: calcMin,
            minSupplyNeeded: (rm.minSupplyNeeded !== undefined && rm.minSupplyNeeded !== "" && !isNaN(Number(rm.minSupplyNeeded)))
              ? rm.minSupplyNeeded
              : calcMin
          };
        });
      }
      return it;
    });
    setModalItems(cloned);
    setActiveModalTab("all");
    setShowModal(true);
  };

  const submitWorkOrder = async () => {
    // Note: Raw materials are not issued at this stage, so stock shortfalls do not block saving work order.
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
          exp_delivery_date: it.exp_delivery_date || null,
          batch_no: it.batch_no || null,
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
                exp_delivery_date: it.exp_delivery_date || null,
                batch_no: it.batch_no || null,
                remarks: `Allocated raw material for ${it.material_name} (${it.material_code})`,
                job_party_id: it.job_party_id ? Number(it.job_party_id) : null
              });
            }
          }
        }
      }

      const payload = {
        work_order_date: workOrderDate,
        purchase_order_number: purchaseOrderNumber.trim() || null,
        purchase_order_date: purchaseOrderDate || null,
        project_name: projectName.trim() || null,
        inspection_id: inspectionId ? Number(inspectionId) : null,
        remark: remark.trim() || null,
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
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
              <span>Edit Work Order - WO-{String(workOrder?.work_order_no).padStart(4, "0")}</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                workOrderStatus === 'Started'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {workOrderStatus === 'Started' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                {workOrderStatus || 'Draft'}
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Modify work order date or items configuration.
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {/* Started Work Order Notice */}
        {workOrderStatus === 'Started' && (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-900 mb-6">
            <i className="fa-solid fa-circle-info text-emerald-600 text-lg shrink-0"></i>
            <div className="text-xs text-emerald-800">
              <span className="font-bold">Active Started Work Order:</span> This work order has been started and is active in Workshop Entry. Adding or deleting material item rows is locked to preserve production and inventory tracking.
            </div>
          </div>
        )}

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

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Purchase Order Number
                </label>
                <input
                  type="text"
                  placeholder="Enter purchase order number"
                  value={purchaseOrderNumber}
                  onChange={(e) => setPurchaseOrderNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Purchase Order Date
                </label>
                <DateInput
                  value={purchaseOrderDate}
                  onChange={(e) => setPurchaseOrderDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="Enter project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Inspection
                </label>
                <select
                  value={inspectionId}
                  onChange={(e) => setInspectionId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Select Inspection --</option>
                  {inspections.map((insp) => (
                    <option key={insp.id} value={insp.id}>
                      {insp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Remark
                </label>
                <input
                  type="text"
                  placeholder="Enter work order remarks"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
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
              {workOrderStatus === 'Started' ? (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1.5">
                  <i className="fa-solid fa-lock text-[10px]"></i> Material rows locked (Work Order Started)
                </span>
              ) : (
                <button
                  type="button"
                  onClick={addItemRow}
                  className="text-sm font-semibold text-[#369ACF] hover:text-[#2583b4] flex items-center gap-1 cursor-pointer"
                >
                  <i className="fa-solid fa-plus text-xs"></i> Add Item Row
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5 min-w-[320px]">Material Details *</th>
                    <th className="px-6 py-3.5 w-32 text-right">Quantity *</th>
                    <th className="px-6 py-3.5 w-32 text-right">Prod Qty</th>
                    <th className="px-6 py-3.5">Exp Deliv.</th>
                    <th className="px-6 py-3.5">Batch No</th>
                    <th className="px-6 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {items.map((item, idx) => {
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <MaterialFilterDropdown
                            materials={materials}
                            selectedMaterialId={item.material_id}
                            onSelect={(selectedId) => handleMaterialChange(idx, selectedId)}
                            disabled={workOrderStatus === 'Started'}
                          />
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
                              onClick={() => handleOpenItemConfig(idx)}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                                isItemConfigured(item)
                                  ? "border-[#369ACF] bg-sky-50 text-[#369ACF] hover:bg-sky-100 shadow-xs"
                                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              }`}
                              title={isItemConfigured(item) ? "Configured (Click to edit configuration)" : "Configure Item"}
                            >
                              <i className="fa-solid fa-gear text-sm"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              disabled={workOrderStatus === 'Started'}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-250 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              title={workOrderStatus === 'Started' ? "Cannot delete item from a Started Work Order" : "Delete Row"}
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

      {/* Single Item Configuration Modal (triggered by gear icon on each row) */}
      <ItemConfigModal
        isOpen={showSingleModal}
        onClose={() => setShowSingleModal(false)}
        itemIndex={singleItemIdx}
        item={singleItemIdx !== null ? items[singleItemIdx] : null}
        onSave={handleSaveSingleItemConfig}
      />

      {/* Common Work Order Configuration Modal (triggered on Save Work Order - Separated Item-Wise) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <i className="fa-solid fa-sliders text-[#369ACF]"></i>
                  Work Order Configuration
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure production details and review raw materials allocation separated item-wise before saving changes.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseCommonModal}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer p-1"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Item Navigation Tabs */}
              {modalItems.length > 1 && (
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveModalTab("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      activeModalTab === "all"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All Items ({modalItems.length})
                  </button>
                  {modalItems.map((it, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveModalTab(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                        activeModalTab === i
                          ? "bg-[#369ACF] text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <i className="fa-solid fa-gear text-[10px]"></i>
                      Item #{i + 1}: {it.material_name || "Material"}
                    </button>
                  ))}
                </div>
              )}

              {/* Items Separated Item-Wise */}
              <div className="space-y-6">
                {modalItems.map((item, idx) => {
                  if (activeModalTab !== "all" && activeModalTab !== idx) return null;

                  const itemHasShortfall = item.rawMaterials?.some(
                    rm => (Number(rm.minSupplyNeeded) || 0) < rm.calculatedMinSupply || rm.availableStock < rm.productionAmount
                  );

                  return (
                    <div key={idx} className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs space-y-5">
                      {/* Item Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-sky-50 border border-sky-200 text-[#369ACF] flex items-center justify-center text-sm shadow-xs">
                            <i className="fa-solid fa-gear"></i>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                                Item #{idx + 1}
                              </span>
                              <h4 className="text-sm font-bold text-slate-800">
                                {item.material_name || "Unselected Material"}
                              </h4>
                            </div>
                            {item.material_code && (
                              <span className="text-xs font-mono text-slate-400">
                                Code: {item.material_code}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg font-medium">
                            Order Qty: <strong className="text-slate-800">{item.quantity}</strong>
                          </span>
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-medium border border-indigo-100">
                            Prod Qty: <strong className="text-indigo-900">{item.production_quantity}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Production Details Form */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Order Quantity <span className="text-red-500">*</span>
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
                            value={item.batch_no || ""}
                            onChange={(e) => handleModalItemChange(idx, "batch_no", e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Remarks
                          </label>
                          <input
                            type="text"
                            placeholder="Enter remarks"
                            value={item.remarks || ""}
                            onChange={(e) => handleModalItemChange(idx, "remarks", e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Raw Materials Allocation for this item */}
                      <div className="pt-2 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <i className="fa-solid fa-layer-group text-[#369ACF]"></i>
                            Raw Materials Allocation for {item.material_name}
                          </h5>
                          <span className="text-[11px] text-slate-400">
                            {item.rawMaterials?.length || 0} raw {item.rawMaterials?.length === 1 ? "material" : "materials"} in BOM
                          </span>
                        </div>

                        {itemHasShortfall && (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-800 text-xs">
                            <i className="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5 text-xs shrink-0"></i>
                            <div>
                              <span className="font-semibold">Notice:</span> Available quantity in system is less than required for this item's production quantity. You can set the minimum supply needed.
                            </div>
                          </div>
                        )}

                        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs bg-white">
                          <table className="w-full text-left text-xs text-slate-600 border-collapse">
                            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-2.5">Raw Material</th>
                                <th className="px-4 py-2.5 text-right">Available Stock</th>
                                <th className="px-4 py-2.5 text-right">RM req. for 1 Unit</th>
                                <th className="px-4 py-2.5 text-right">RM req. for Prod Qty</th>
                                <th className="px-4 py-2.5 text-right">Min Supply Needed</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                              {item.rawMaterials && item.rawMaterials.length > 0 ? (
                                item.rawMaterials.map((rm, rmIdx) => {
                                  const prodQty = Number(item.production_quantity) || 0;
                                  const bomQty = Number(rm.bomQty) || 0;
                                  const requiredProdQty = Number((bomQty * prodQty).toFixed(3));
                                  const availableStock = Number(rm.availableStock) || 0;
                                  const calculatedMinSupply = Math.max(0, Number((requiredProdQty - availableStock).toFixed(3)));
                                  const isShortfall = (Number(rm.minSupplyNeeded) || 0) < calculatedMinSupply;

                                  return (
                                    <tr key={rmIdx} className="hover:bg-slate-50/60 transition-colors">
                                      <td className="px-4 py-2.5">
                                        <div className="font-semibold text-slate-800">{rm.materialName}</div>
                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                          {rm.materialCode || "—"}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-mono text-slate-600 text-xs">
                                        {availableStock.toFixed(3)} {rm.unitName || "kg"}
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-mono text-slate-600 text-xs">
                                        {bomQty.toFixed(4)} {rm.unitName || "kg"}
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-indigo-700 text-xs">
                                        {requiredProdQty.toFixed(3)} {rm.unitName || "kg"}
                                      </td>
                                      <td className="px-4 py-2.5 text-right">
                                        <div className="flex flex-col items-end gap-1">
                                          <div className="flex items-center justify-end gap-1.5">
                                            <input
                                              type="text"
                                              value={rm.minSupplyNeeded !== undefined ? rm.minSupplyNeeded : calculatedMinSupply}
                                              onChange={(e) => handleRMMinSupplyChange(idx, rmIdx, e.target.value)}
                                              onBlur={() => handleRMMinSupplyBlur(idx, rmIdx, calculatedMinSupply)}
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  e.preventDefault();
                                                  handleRMMinSupplyBlur(idx, rmIdx, calculatedMinSupply);
                                                }
                                              }}
                                              placeholder={String(calculatedMinSupply)}
                                              className={`w-24 px-2 py-1 text-right text-xs font-mono font-semibold border rounded-lg focus:outline-none transition-colors bg-white ${
                                                isShortfall
                                                  ? "border-amber-400 text-amber-900 focus:border-amber-500"
                                                  : "border-slate-200 text-slate-800 focus:border-indigo-500"
                                              }`}
                                            />
                                            <span className="text-[11px] text-slate-400 font-mono w-6 text-left shrink-0">
                                              {rm.unitName || "kg"}
                                            </span>
                                          </div>
                                          {isShortfall && (
                                            <span className="text-[10px] text-amber-600 font-medium">
                                              Shortfall: {calculatedMinSupply} {rm.unitName || "kg"}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={5} className="px-4 py-5 text-center text-xs text-slate-400 italic">
                                    No raw materials configured in BOM for this item.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={handleCloseCommonModal}
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
