import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getAllMachines } from "../../api/machineApi";
import { createWorkingHoursLogs } from "../../api/workingHoursApi";
import toast from "react-hot-toast";
import DateInput from "../../components/DateInput";

export default function CreateWorkingHour() {
    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    const [machines, setMachines] = useState([]);
    const [loadingMachines, setLoadingMachines] = useState(true);

    // Form state
    const [selectedMachineIds, setSelectedMachineIds] = useState([]);
    const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0]);
    const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
    const [workingHour, setWorkingHour] = useState("");
    const [noWork, setNoWork] = useState("no"); // "yes" or "no"

    // Search and Dropdown visibility
    const [searchTerm, setSearchTerm] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Fetch machines on mount
    useEffect(() => {
        const fetchMachines = async () => {
            try {
                const res = await getAllMachines(false); // only active machines
                setMachines(res.data?.data || res.data || []);
            } catch (err) {
                console.error("Failed to fetch machines:", err);
                toast.error("Failed to load machines dropdown data.");
            } finally {
                setLoadingMachines(false);
            }
        };
        fetchMachines();
    }, []);

    // Click outside handler to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter machines based on search
    const filteredMachines = machines.filter(m =>
        (m.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.machine_number || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleToggleMachine = (id) => {
        setSelectedMachineIds(prev =>
            prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        const filteredIds = filteredMachines.map(m => m.id);
        setSelectedMachineIds(prev => {
            const union = new Set([...prev, ...filteredIds]);
            return Array.from(union);
        });
    };

    const handleClearAll = () => {
        const filteredIds = new Set(filteredMachines.map(m => m.id));
        setSelectedMachineIds(prev => prev.filter(id => !filteredIds.has(id)));
    };

    // Automatically set working hour to 0 if noWork is selected as "yes"
    useEffect(() => {
        if (noWork === "yes") {
            setWorkingHour("0");
        } else if (workingHour === "0") {
            setWorkingHour("");
        }
    }, [noWork]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (selectedMachineIds.length === 0) {
            toast.error("Please select at least one machine.");
            return;
        }

        if (!fromDate || !toDate) {
            toast.error("Please select both From Date and To Date.");
            return;
        }

        if (new Date(fromDate) > new Date(toDate)) {
            toast.error("From Date cannot be after To Date.");
            return;
        }

        const hrs = parseFloat(workingHour);
        if (noWork === "no" && (isNaN(hrs) || hrs < 0)) {
            toast.error("Please enter a valid number of working hours.");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                machineIds: selectedMachineIds,
                fromDate,
                toDate,
                workingHour: noWork === "yes" ? 0 : hrs,
                noWork: noWork === "yes"
            };

            await createWorkingHoursLogs(payload);
            toast.success("Working hours logged successfully!");
            navigate("/production/working-hours");
        } catch (err) {
            console.error("Failed to log working hours:", err);
            const errMsg = err.response?.data?.message || "Failed to submit working hours.";
            toast.error(errMsg);
        } finally {
            setSaving(false);
        }
    };

    // Get label text for machines button
    const getDropdownButtonText = () => {
        if (loadingMachines) return "Loading machines...";
        if (selectedMachineIds.length === 0) return "Select Machine(s)";
        
        const selectedNames = selectedMachineIds
            .map(id => {
                const mac = machines.find(m => m.id === id);
                return mac ? `${mac.name} (${mac.machine_number})` : "";
            })
            .filter(Boolean);
            
        return selectedNames.join(", ");
    };

    const inputCls =
        "w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#369ACF]/30 focus:border-[#369ACF] text-sm bg-slate-50 transition-colors duration-150";
    const labelCls = "block text-sm font-semibold text-slate-700 mb-2";

    return (
        <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 min-h-screen">
            <Navbar title="Working Hour Form" />

            <main className="flex-1 w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between w-full">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Log Working Hour</h1>
                        <p className="text-slate-500 mt-1">Specify working hours for one or multiple machines.</p>
                    </div>
                    <button
                        onClick={() => navigate("/production/working-hours")}
                        className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        Back to Logs
                    </button>
                </div>

                <div className="w-full pb-20">
                    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                            <h2 className="text-lg font-semibold text-slate-800">Working Hour Details</h2>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Machine Select Field */}
                            <div className="space-y-1 relative" ref={dropdownRef}>
                                <label className={labelCls}>
                                    Machine Name <span className="text-rose-500">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => !loadingMachines && setIsDropdownOpen(prev => !prev)}
                                    className={`${inputCls} flex items-center justify-between cursor-pointer text-left ${isDropdownOpen ? "border-[#369ACF] ring-2 ring-[#369ACF]/30" : ""}`}
                                    disabled={loadingMachines}
                                >
                                    <span className={`block truncate mr-4 flex-1 ${selectedMachineIds.length === 0 ? "text-slate-400" : "text-slate-800 font-medium"}`}>
                                        {getDropdownButtonText()}
                                    </span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2.5}
                                        stroke="currentColor"
                                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </button>

                                {/* Dropdown Overlay */}
                                {isDropdownOpen && (
                                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 max-h-[350px] flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
                                        {/* Search Filter */}
                                        <div style={{ position: "relative" }} className="mb-3 shrink-0">
                                            
                                            
                                            <input
                                                type="text"
                                                placeholder="Search machine by name or number..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full h-10 px-3 pl-9 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700 outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                                            />
                                            
                                        </div>

                                        {/* Shortcuts */}
                                        <div className="flex gap-2 mb-3 shrink-0">
                                            <button
                                                type="button"
                                                onClick={handleSelectAll}
                                                className="px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-md hover:bg-indigo-100 transition-colors cursor-pointer"
                                            >
                                                Select All ({filteredMachines.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleClearAll}
                                                className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-md hover:bg-rose-100 transition-colors cursor-pointer"
                                            >
                                                Clear All
                                            </button>
                                        </div>

                                        {/* Machine Checklist */}
                                        <div className="overflow-y-auto space-y-0.5 flex-1 pr-1 border-t border-slate-100 pt-2">
                                            {filteredMachines.length > 0 ? (
                                                filteredMachines.map(m => {
                                                    const isChecked = selectedMachineIds.includes(m.id);
                                                    return (
                                                        <label
                                                            key={m.id}
                                                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm select-none transition-colors cursor-pointer ${
                                                                isChecked ? "bg-indigo-50/70 text-indigo-900" : "hover:bg-slate-50 text-slate-700"
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => handleToggleMachine(m.id)}
                                                                className="accent-[#369ACF] h-4 w-4 rounded border-slate-300"
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold">{m.name}</span>
                                                                <span className={`text-xs font-mono ${isChecked ? "text-indigo-600/70" : "text-slate-400"}`}>
                                                                    {m.machine_number}
                                                                </span>
                                                            </div>
                                                        </label>
                                                    );
                                                })
                                            ) : (
                                                <div className="text-center py-6 text-sm text-slate-400">
                                                    No machines match your search.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Dates Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* From Date */}
                                <div className="space-y-1">
                                    <label className={labelCls}>
                                        From Date <span className="text-rose-500">*</span>
                                    </label>
                                    <DateInput
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        required
                                    />
                                </div>

                                {/* To Date */}
                                <div className="space-y-1">
                                    <label className={labelCls}>
                                        To Date <span className="text-rose-500">*</span>
                                    </label>
                                    <DateInput
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Working Hours and No Work */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Working Hours */}
                                <div className="space-y-1">
                                    <label className={labelCls}>
                                        Working Hour (Number) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={workingHour}
                                        onChange={(e) => setWorkingHour(e.target.value)}
                                        disabled={noWork === "yes"}
                                        placeholder={noWork === "yes" ? "0 (No Work)" : "e.g. 8.5"}
                                        className={`${inputCls} ${noWork === "yes" ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200" : ""}`}
                                        required
                                    />
                                </div>

                                {/* No Work */}
                                <div className="space-y-1">
                                    <label className={labelCls}>No Work</label>
                                    <select
                                        value={noWork}
                                        onChange={(e) => setNoWork(e.target.value)}
                                        className={inputCls}
                                    >
                                        <option value="no">No</option>
                                        <option value="yes">Yes</option>
                                    </select>
                                </div>
                            </div>

                            {/* Form Action Buttons */}
                            <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => navigate("/production/working-hours")}
                                    className="px-6 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || loadingMachines}
                                    className="bg-[#369ACF] text-white px-8 py-2.5 rounded-lg font-medium hover:bg-[#2583b4] transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-slate-400 shadow-sm cursor-pointer"
                                >
                                    {saving ? "Saving..." : "Submit"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
