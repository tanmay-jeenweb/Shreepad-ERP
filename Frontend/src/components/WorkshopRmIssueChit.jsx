import React from "react";

export default function WorkshopRmIssueChit({
  chit,
  materialName,
  itemCode,
  batch,
  workOrderNo,
  onPrint
}) {
  const totalQty = (chit.rows || []).reduce(
    (sum, row) => sum + (parseFloat(row.qty) || 0),
    0
  );

  return (
    <div
      id={`chit-${chit.lot}`}
      className="bg-white border border-slate-300 rounded-xl p-6 shadow-xs mx-auto text-xs font-sans text-slate-800 relative hover:border-slate-400 transition-all"
    >
      <div className="w-full border border-slate-400 rounded overflow-hidden">
        {/* Title */}
        <div className="border-b border-slate-400 text-center py-2.5 text-xs font-bold uppercase tracking-wider bg-slate-100/80 text-slate-700">
          Raw Material Issue CHIT Label
        </div>

        {/* Header Grid */}
        <div className="grid grid-cols-12 border-b border-slate-400">
          <div className="col-span-3 border-r border-slate-400 p-2 font-bold bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
            Item Name
          </div>
          <div className="col-span-3 border-r border-slate-400 p-2 font-semibold text-slate-800">
            {materialName || "—"}
          </div>

          <div className="col-span-3 border-r border-slate-400 p-2 font-bold bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
            Item Code
          </div>
          <div className="col-span-3 p-2 font-mono font-semibold text-slate-800">
            {itemCode || "—"}
          </div>
        </div>

        <div className="grid grid-cols-12 border-b border-slate-400">
          <div className="col-span-3 border-r border-slate-400 p-2 font-bold bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
            Date:
          </div>
          <div className="col-span-3 border-r border-slate-400 p-2 font-semibold text-slate-800">
            {chit.date}
          </div>

          <div className="col-span-3 border-r border-slate-400 p-2 font-bold bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
            Batch No.
          </div>
          <div className="col-span-3 p-2 font-mono font-semibold text-slate-800">
            {batch || "—"}
          </div>
        </div>

        <div className="grid grid-cols-12 border-b border-slate-400">
          <div className="col-span-3 border-r border-slate-400 p-2 font-bold bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
            Work Order No.
          </div>
          <div className="col-span-9 p-2 font-mono font-bold text-slate-900">
            {workOrderNo}
          </div>
        </div>

        <div className="grid grid-cols-12 border-b border-slate-400 bg-slate-100/50">
          <div className="col-span-6 border-r border-slate-400 p-2 font-bold text-slate-600 text-[10px] uppercase tracking-wider text-center">
            Material Specifications
          </div>
          <div className="col-span-6 p-2 font-bold text-slate-700 text-center">
            Chit No: <span className="text-rose-600 font-extrabold text-sm ml-1.5">{Math.floor(Number(chit.lot))}</span>
          </div>
        </div>

        {/* Table Header */}
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-400 font-semibold text-slate-500 text-[10px] uppercase tracking-wider">
              <th className="border-r border-slate-400 p-2 w-10 text-center">#</th>
              <th className="border-r border-slate-400 p-2 min-w-[150px]">RM Type</th>
              <th className="border-r border-slate-400 p-2 min-w-[150px]">Internal Batch</th>
              <th className="p-2 w-28 text-right">Qty (kg)</th>
            </tr>
          </thead>
          <tbody>
            {(chit.rows || []).map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-slate-300 hover:bg-slate-50/50 text-slate-700">
                <td className="border-r border-slate-400 p-2 text-center text-slate-400">{rIdx + 1}</td>
                <td className="border-r border-slate-400 p-2 font-bold text-slate-800">
                  {row.rm_type_name || row.material_name || "—"}
                </td>
                <td className="border-r border-slate-400 p-2 font-mono text-[11px] font-semibold text-slate-800">
                  {row.internal_batch_number}
                </td>
                <td className="p-2 font-bold text-right bg-emerald-50/20">
                  {Number(row.qty).toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold text-slate-800 border-t border-slate-400">
              <td colSpan="3" className="border-r border-slate-400 p-2 text-left uppercase tracking-wider text-[10px] text-slate-500 font-bold">
                Total Quantity
              </td>
              <td className="p-2 font-bold text-right bg-emerald-50/30">
                {totalQty.toFixed(3)} kg
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Print Button */}
      {onPrint && (
        <div className="flex justify-center mt-4 no-print">
          <button
            type="button"
            onClick={() => onPrint(chit.lot)}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer text-xs border-none"
          >
            <i className="fa-solid fa-print"></i>
            <span>Print Chit Label</span>
          </button>
        </div>
      )}
    </div>
  );
}
