import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";

export default function MaterialFilterDropdown({
  materials = [],
  selectedMaterialId = "",
  onSelect,
  disabled = false,
  placeholder = "Select or filter material..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  const dropdownRef = useRef(null);
  const popoverRef = useRef(null);

  const [coords, setCoords] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    width: 600,
    placement: "bottom",
    maxHeight: 450,
  });

  const updatePosition = useCallback(() => {
    if (!dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // If completely scrolled off screen, close dropdown
    if (rect.bottom < 0 || rect.top > viewportHeight) {
      setIsOpen(false);
      return;
    }

    // Desired popover width: min 580px, max 660px, or fit viewport
    const desiredWidth = Math.min(660, Math.max(580, rect.width));
    const width = Math.min(desiredWidth, viewportWidth - 24);

    // Horizontal position: align with left edge, but keep within viewport bounds
    let left = rect.left;
    if (left + width > viewportWidth - 12) {
      left = viewportWidth - width - 12;
    }
    if (left < 12) {
      left = 12;
    }

    // Check vertical space (auto-flip if not enough space below)
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const placeAbove = spaceBelow < 340 && spaceAbove > spaceBelow;

    setCoords({
      top: Math.round(rect.bottom + 6),
      bottom: Math.round(viewportHeight - rect.top + 6),
      left: Math.round(left),
      width: Math.round(width),
      placement: placeAbove ? "top" : "bottom",
      maxHeight: Math.round(placeAbove ? Math.max(220, spaceAbove - 20) : Math.max(220, spaceBelow - 20)),
    });
  }, []);

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  // Close dropdown on click outside, resize, or container scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);

    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, updatePosition]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Current selected material object
  const currentMaterial = useMemo(() => {
    if (!selectedMaterialId) return null;
    return materials.find((m) => String(m.id) === String(selectedMaterialId)) || null;
  }, [selectedMaterialId, materials]);

  // Distinct Items list from all available materials
  const distinctItems = useMemo(() => {
    const set = new Set();
    materials.forEach((m) => {
      if (m.item && typeof m.item === "string" && m.item.trim()) {
        set.add(m.item.trim());
      }
    });
    return Array.from(set).sort();
  }, [materials]);

  // Distinct Sizes (cascading: based on selectedItem if any)
  const distinctSizes = useMemo(() => {
    const set = new Set();
    materials.forEach((m) => {
      if (selectedItem && (m.item || "").trim().toLowerCase() !== selectedItem.trim().toLowerCase()) {
        return;
      }
      if (m.size && typeof m.size === "string" && m.size.trim()) {
        set.add(m.size.trim());
      }
    });
    return Array.from(set).sort();
  }, [materials, selectedItem]);

  // Distinct Classes (cascading: based on selectedItem and selectedSize)
  const distinctClasses = useMemo(() => {
    const set = new Set();
    materials.forEach((m) => {
      if (selectedItem && (m.item || "").trim().toLowerCase() !== selectedItem.trim().toLowerCase()) {
        return;
      }
      if (selectedSize && (m.size || "").trim().toLowerCase() !== selectedSize.trim().toLowerCase()) {
        return;
      }
      const cls = (m.class || m.class_name || "").trim();
      if (cls) {
        set.add(cls);
      }
    });
    return Array.from(set).sort();
  }, [materials, selectedItem, selectedSize]);

  // Filtered materials based on item, size, class, and search term
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const mItem = (m.item || "").trim().toLowerCase();
      const mSize = (m.size || "").trim().toLowerCase();
      const mClass = (m.class || m.class_name || "").trim().toLowerCase();

      if (selectedItem && mItem !== selectedItem.trim().toLowerCase()) {
        return false;
      }
      if (selectedSize && mSize !== selectedSize.trim().toLowerCase()) {
        return false;
      }
      if (selectedClass && mClass !== selectedClass.trim().toLowerCase()) {
        return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const name = (m.material_name || "").toLowerCase();
        const code = (m.material_code || "").toLowerCase();
        const matchNameOrCode = name.includes(query) || code.includes(query);
        const matchSpec = mItem.includes(query) || mSize.includes(query) || mClass.includes(query);
        if (!matchNameOrCode && !matchSpec) {
          return false;
        }
      }

      return true;
    });
  }, [materials, selectedItem, selectedSize, selectedClass, searchTerm]);

  const handleSelectMaterial = (material) => {
    onSelect(material.id);
    setIsOpen(false);
  };

  const handleClearSelection = (e) => {
    e.stopPropagation();
    onSelect("");
  };

  const handleResetFilters = () => {
    setSelectedItem("");
    setSelectedSize("");
    setSelectedClass("");
    setSearchTerm("");
  };

  const hasActiveFilters = Boolean(selectedItem || selectedSize || selectedClass || searchTerm);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button / Display in Table Cell */}
      <button
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        className={`w-full text-left px-3 py-2 border rounded-lg transition-all flex items-center justify-between gap-2 text-sm bg-white cursor-pointer ${
          disabled
            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
            : isOpen
            ? "border-[#369ACF] ring-2 ring-[#369ACF]/20 shadow-sm"
            : currentMaterial
            ? "border-slate-300 hover:border-slate-400 shadow-2xs"
            : "border-slate-200 hover:border-slate-300 text-slate-400"
        }`}
      >
        {currentMaterial ? (
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-800 truncate block">
                {currentMaterial.material_name}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                {currentMaterial.material_code}
              </span>
            </div>
            {(currentMaterial.item || currentMaterial.size || currentMaterial.class) && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5 font-medium">
                {currentMaterial.item && <span>Item: {currentMaterial.item}</span>}
                {currentMaterial.size && <span>• Size: {currentMaterial.size}</span>}
                {(currentMaterial.class || currentMaterial.class_name) && (
                  <span>• Class: {currentMaterial.class || currentMaterial.class_name}</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <span className="text-slate-400 flex items-center gap-1.5">
            <i className="fa-solid fa-filter text-xs text-[#369ACF]"></i>
            {placeholder}
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {currentMaterial && !disabled && (
            <span
              onClick={handleClearSelection}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
              title="Clear selection"
            >
              <i className="fa-solid fa-xmark text-xs"></i>
            </span>
          )}
          <i
            className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[#369ACF]" : ""
            }`}
          ></i>
        </div>
      </button>

      {/* Floating Mega Dropdown Popover via Portal */}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              ...(coords.placement === "top"
                ? { bottom: `${coords.bottom}px` }
                : { top: `${coords.top}px` }),
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxHeight: `${coords.maxHeight}px`,
              zIndex: 99999,
            }}
            className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4 text-slate-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Quick search name, code, item, size..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#369ACF] text-slate-800"
                  autoFocus
                />
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg border border-rose-200 font-semibold cursor-pointer shrink-0 transition-colors"
                >
                  <i className="fa-solid fa-rotate-left mr-1"></i> Reset
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 text-xs"
              title="Close"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>

          {/* 3-Column Cascading Filter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3 bg-slate-50/80 p-2.5 rounded-lg border border-slate-150">
            {/* Column 1: Item */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                <i className="fa-solid fa-shapes text-[#369ACF]"></i>
                1. Item
              </label>
              <select
                value={selectedItem}
                onChange={(e) => {
                  setSelectedItem(e.target.value);
                  setSelectedSize("");
                  setSelectedClass("");
                }}
                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:border-[#369ACF]"
              >
                <option value="">-- All Items ({distinctItems.length}) --</option>
                {distinctItems.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {/* Column 2: Size */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                <i className="fa-solid fa-ruler-combined text-[#369ACF]"></i>
                2. Size
              </label>
              <select
                value={selectedSize}
                onChange={(e) => {
                  setSelectedSize(e.target.value);
                  setSelectedClass("");
                }}
                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:border-[#369ACF]"
              >
                <option value="">-- All Sizes ({distinctSizes.length}) --</option>
                {distinctSizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            {/* Column 3: Class */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                <i className="fa-solid fa-layer-group text-[#369ACF]"></i>
                3. Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:border-[#369ACF]"
              >
                <option value="">-- All Classes ({distinctClasses.length}) --</option>
                {distinctClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results List Section */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <span className="text-xs font-bold text-slate-600">
                Matching Materials
                <span className="ml-1.5 px-2 py-0.5 text-[10px] rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  {filteredMaterials.length}
                </span>
              </span>
              {filteredMaterials.length === 1 && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <i className="fa-solid fa-check text-[10px]"></i> Exact match
                </span>
              )}
            </div>

            <div className="flex-1 min-h-[140px] max-h-56 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
              {filteredMaterials.length > 0 ? (
                filteredMaterials.map((m) => {
                  const isSelected = String(m.id) === String(selectedMaterialId);
                  const mCls = m.class || m.class_name;
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleSelectMaterial(m)}
                      className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-sky-50/90 border-l-4 border-[#369ACF]"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold ${isSelected ? "text-[#369ACF]" : "text-slate-800"}`}>
                            {m.material_name}
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 font-bold rounded border border-slate-200">
                            {m.material_code}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1 flex-wrap">
                          {m.item && (
                            <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-150">
                              Item: <b className="text-slate-700">{m.item}</b>
                            </span>
                          )}
                          {m.size && (
                            <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-150">
                              Size: <b className="text-slate-700">{m.size}</b>
                            </span>
                          )}
                          {mCls && (
                            <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-150">
                              Class: <b className="text-slate-700">{mCls}</b>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSelected ? (
                          <span className="text-xs font-bold text-[#369ACF] flex items-center gap-1">
                            <i className="fa-solid fa-circle-check"></i> Selected
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 group-hover:text-[#369ACF]">
                            Select <i className="fa-solid fa-arrow-right text-[10px] ml-0.5"></i>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-slate-500">
                  <i className="fa-regular fa-folder-open text-2xl text-slate-300 mb-2 block"></i>
                  <p className="text-xs font-medium">No materials match the selected filters.</p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-2 text-xs font-bold text-[#369ACF] hover:underline cursor-pointer"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
