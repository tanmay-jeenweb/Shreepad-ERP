import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getWorkingHourById, updateWorkingHoursLog } from "../../api/workingHoursApi";
import toast from "react-hot-toast";
import DateInput from "../../components/DateInput";

export default function EditWorkingHour() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [machineName, setMachineName] = useState("");
    const [machineNumber, setMachineNumber] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [workingHour, setWorkingHour] = useState("");
    const [noWork, setNoWork] = useState("no"); // "yes" or "no"

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchRecord = async () => {
            try {
                const res = await getWorkingHourById(id);
                const record = res.data?.data;
                if (record) {
                    setMachineName(record.machine_name || "");
                    setMachineNumber(record.machine_number || "");
                    setFromDate(record.from_date ? record.from_date.split("T")[0] : "");
                    setToDate(record.to_date ? record.to_date.split("T")[0] : "");
                    setWorkingHour(parseFloat(record.working_hour || 0).toString());
                    setNoWork(record.no_work ? "yes" : "no");
                } else {
                    toast.error("Working hour record not found.");
                    navigate("/production/working-hours");
                }
            } catch (err) {
                console.error("Failed to fetch working hour:", err);
                toast.error("Failed to load working hour details.");
                navigate("/production/working-hours");
            } finally {
                setLoading(false);
            }
        };
        fetchRecord();
    }, [id, navigate]);

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
                fromDate,
                toDate,
                workingHour: noWork === "yes" ? 0 : hrs,
                noWork: noWork === "yes"
            };

            await updateWorkingHoursLog(id, payload);
            toast.success("Working hours updated successfully!");
            navigate("/production/working-hours");
        } catch (err) {
            console.error("Failed to update working hours:", err);
            const errMsg = err.response?.data?.message || "Failed to update working hours.";
            toast.error(errMsg);
        } finally {
            setSaving(false);
        }
    };

    const inputCls =
        "w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#369ACF]/30 focus:border-[#369ACF] text-sm bg-slate-50 transition-colors duration-150";
    const readOnlyInputCls =
        "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-100 text-slate-500 cursor-not-allowed font-medium";
    const labelCls = "block text-sm font-semibold text-slate-700 mb-2";

    if (loading) {
        return (
            <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 min-h-screen">
                <Navbar title="Edit Working Hour" />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-slate-500 font-medium animate-pulse">Loading details...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 min-h-screen">
            <Navbar title="Edit Working Hour" />

            <main className="flex-1 w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between w-full">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Edit Working Hour</h1>
                        <p className="text-slate-500 mt-1">Modify working hours for the selected machine.</p>
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
                    {/* Information Warning Banner */}
                    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 shrink-0 mt-0.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                        <div className="text-sm leading-relaxed">
                            <span className="font-semibold text-amber-900 block mb-0.5">Rescheduling Notice:</span> Changes to working hours will only apply to future dates from today onwards. Past schedule slots will remain unchanged to preserve historical schedule records.
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                            <h2 className="text-lg font-semibold text-slate-800">Working Hour Details</h2>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Machine Name (Read-Only) */}
                            <div className="space-y-1">
                                <label className={labelCls}>Machine</label>
                                <input
                                    type="text"
                                    value={`${machineName} (${machineNumber})`}
                                    className={readOnlyInputCls}
                                    readOnly
                                />
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
                                    disabled={saving}
                                    className="bg-[#369ACF] text-white px-8 py-2.5 rounded-lg font-medium hover:bg-[#2583b4] transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-slate-400 shadow-sm cursor-pointer"
                                >
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
