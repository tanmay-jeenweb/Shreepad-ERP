import React from 'react';

export default function DateInput({ value, onChange, className = "", required = false, disabled = false, min, max, ...props }) {
    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const parts = dateStr.split("-");
        if (parts.length !== 3) return dateStr;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    const formattedValue = formatDate(value);

    return (
        <div className="relative w-full">
            <input
                type="date"
                value={value || ""}
                onChange={onChange}
                required={required}
                disabled={disabled}
                min={min}
                max={max}
                {...props}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                onClick={(e) => {
                    if (disabled) return;
                    try {
                        if (typeof e.target.showPicker === 'function') {
                            e.target.showPicker();
                        }
                    } catch (err) {
                        console.warn("showPicker is not supported or failed:", err);
                    }
                }}
            />
            <div className={`w-full h-10 px-3 border border-slate-350 rounded-lg text-sm bg-white text-slate-700 flex items-center justify-between pointer-events-none select-none ${disabled ? 'bg-slate-100 text-slate-400' : ''} ${className}`}>
                <span className={!value ? "text-slate-400" : "font-medium text-slate-800"}>
                    {formattedValue || "DD/MM/YYYY"}
                </span>
                <i className="fa-regular fa-calendar text-slate-400 text-xs"></i>
            </div>
        </div>
    );
}
