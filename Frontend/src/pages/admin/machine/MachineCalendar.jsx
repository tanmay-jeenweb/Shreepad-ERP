import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import { getMachineSchedule } from '../../../api/machineScheduleApi';
import { getMachineById, getAllMachines } from '../../../api/machineApi';
import toast from 'react-hot-toast';

export default function MachineCalendar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [machines, setMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState(id || '');
  const [machine, setMachine] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleData, setScheduleData] = useState([]);
  const [workingHoursData, setWorkingHoursData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  // Colors for different Work Orders
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 
    'bg-pink-500', 'bg-cyan-500', 'bg-rose-500', 'bg-fuchsia-500', 'bg-indigo-500'
  ];

  const getWoColor = (woNo) => {
    // Simple hash to consistently assign the same color to a WO
    let hash = 0;
    const str = String(woNo);
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const loadData = async (targetId) => {
    if (!targetId) return;
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const fromStr = firstDay.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const toStr = lastDay.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

      const [machineRes, scheduleRes] = await Promise.all([
        getMachineById(targetId),
        getMachineSchedule(targetId, fromStr, toStr)
      ]);

      setMachine(machineRes.data.data);
      setScheduleData(scheduleRes.data.data.schedule);
      setWorkingHoursData(scheduleRes.data.data.workingHours);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error("Error loading calendar data", err);
      toast.error("Failed to load calendar data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all machines for the dropdown selection
  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const res = await getAllMachines();
        const machineList = res.data?.data || [];
        setMachines(machineList);
        if (!id && machineList.length > 0) {
          setSelectedMachineId(String(machineList[0].id));
        }
      } catch (err) {
        console.error("Failed to fetch machines", err);
      }
    };
    fetchMachines();
  }, [id]);

  useEffect(() => {
    if (id) {
      setSelectedMachineId(id);
    }
  }, [id]);

  useEffect(() => {
    if (selectedMachineId) {
      loadData(selectedMachineId);
    }
  }, [selectedMachineId, currentDate, location.key]);

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
  };

  const getWorkingHoursForDate = (date) => {
    const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    
    // Find the applicable range
    for (let i = workingHoursData.length - 1; i >= 0; i--) {
        const range = workingHoursData[i];
        const fromD = new Date(range.from_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const toD = new Date(range.to_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        
        if (dateStr >= fromD && dateStr <= toD) {
            return parseFloat(range.working_hour);
        }
    }
    return null; // Not defined
  };

  const getBookingsForDate = (date) => {
    const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return scheduleData.filter(s => {
      const sd = new Date(s.schedule_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      return sd === dateStr;
    });
  };

  const getWaitBlocksForDate = (date, workingHrs) => {
    if (workingHrs === null || workingHrs <= 0) return [];
    if (scheduleData.length < 2) return [];

    const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    
    // Sort all scheduleData chronologically
    const sortedAll = [...scheduleData].sort((a, b) => {
      const dateA = new Date(a.schedule_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const dateB = new Date(b.schedule_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return parseFloat(a.start_hour) - parseFloat(b.start_hour);
    });

    const waitBlocks = [];

    // Find gaps between consecutive bookings in the sorted list
    for (let i = 0; i < sortedAll.length - 1; i++) {
      const b1 = sortedAll[i];
      const b2 = sortedAll[i + 1];

      const d1Str = new Date(b1.schedule_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const d2Str = new Date(b2.schedule_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

      const h1End = parseFloat(b1.end_hour);
      const h2Start = parseFloat(b2.start_hour);

      // Now map this gap to our target dateStr
      if (dateStr === d1Str && dateStr === d2Str) {
        // Gap is entirely on the target date
        if (h2Start > h1End + 0.001) {
          waitBlocks.push({ start: h1End, end: h2Start });
        }
      } else if (dateStr === d1Str) {
        // Target date is the start of the gap
        if (workingHrs > h1End + 0.001) {
          waitBlocks.push({ start: h1End, end: workingHrs });
        }
      } else if (dateStr === d2Str) {
        // Target date is the end of the gap
        if (h2Start > 0.001) {
          waitBlocks.push({ start: 0, end: h2Start });
        }
      } else if (dateStr > d1Str && dateStr < d2Str) {
        // Target date is strictly between the gap start and end dates
        waitBlocks.push({ start: 0, end: workingHrs });
      }
    }

    return waitBlocks;
  };

  const getTimelineBlocks = (date, workingHrs) => {
    const dayBookings = getBookingsForDate(date).sort((a, b) => parseFloat(a.start_hour) - parseFloat(b.start_hour));
    const dayWaitBlocks = getWaitBlocksForDate(date, workingHrs);

    // Merge bookings and wait blocks into one sorted list of events
    const items = [];
    dayBookings.forEach(b => {
      items.push({
        type: 'booking',
        start: parseFloat(b.start_hour),
        end: parseFloat(b.end_hour),
        data: b
      });
    });
    dayWaitBlocks.forEach(w => {
      items.push({
        type: 'wait',
        start: w.start,
        end: w.end
      });
    });

    // Sort items by start hour
    items.sort((a, b) => a.start - b.start);

    // Now fill the gaps from 0 to workingHrs with 'free' blocks
    const blocks = [];
    let currentHour = 0;

    items.forEach(item => {
      if (item.start > currentHour + 0.001) {
        blocks.push({
          type: 'free',
          start: currentHour,
          end: item.start,
          duration: item.start - currentHour
        });
      }
      blocks.push({
        ...item,
        duration: item.end - item.start
      });
      currentHour = item.end;
    });

    if (workingHrs > currentHour + 0.001) {
      blocks.push({
        type: 'free',
        start: currentHour,
        end: workingHrs,
        duration: workingHrs - currentHour
      });
    }

    return blocks;
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const uniqueWorkOrders = Array.from(new Set(scheduleData.map(s => s.work_order_no)))
    .map(woNo => {
      const bookings = scheduleData.filter(s => s.work_order_no === woNo);
      const first = bookings[0];
      const totalHours = bookings.reduce((sum, b) => sum + parseFloat(b.booked_hours), 0);
      return {
        woNo,
        materialName: first.material_name,
        totalHours: totalHours.toFixed(2),
        startDate: formatDate(bookings[0].schedule_date),
        endDate: formatDate(bookings[bookings.length - 1].schedule_date)
      };
    });

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen font-sans text-slate-900">
      <Navbar title="Machine Calendar" />
      
      <main className="flex-1 w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {location.pathname.startsWith('/admin/machines/') && (
              <button 
                onClick={() => navigate('/admin/machines')}
                className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Back to Machines"
              >
                <i className="fa-solid fa-arrow-left text-lg"></i>
              </button>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-800">
                  Machine Planning
                </h1>
                <select
                  value={selectedMachineId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedMachineId(newId);
                    if (location.pathname.startsWith('/admin/machines/')) {
                      navigate(`/admin/machines/${newId}/calendar`, { replace: true });
                    }
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 font-bold text-sm shadow-sm cursor-pointer"
                >
                  <option value="" disabled>-- Select Machine --</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.machine_number || "N/A"})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 mt-1">
                {lastUpdated && (
                  <span className="text-xs text-slate-400 font-medium">
                    Last updated: {lastUpdated}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => loadData(selectedMachineId)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              title="Refresh Calendar"
            >
              <i className="fa-solid fa-rotate-right text-xs"></i> Refresh
            </button>
            <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
              <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer">
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <span className="font-semibold text-slate-800 w-32 text-center text-sm">
                {currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer">
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-6 mb-6 text-sm">
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border border-slate-300 rounded"></div>
                <span className="text-slate-600">Free Day</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-indigo-500 rounded"></div>
                <span className="text-slate-600">Booked</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-slate-200 border border-slate-300 rounded diagonal-stripes"></div>
                <span className="text-slate-600">Holiday / 0 Hrs</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                <span className="text-slate-600">Unconfigured</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span className="text-slate-600">Wait Time</span>
            </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64 bg-white rounded-xl shadow-sm border border-slate-200">
             <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Calendar Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 auto-rows-fr">
                {/* Pad empty days at start of month */}
                {Array.from({ length: getDaysInMonth()[0].getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-slate-50 border-r border-b border-slate-100 min-h-[120px]"></div>
                ))}

                {getDaysInMonth().map(date => {
                  const workingHrs = getWorkingHoursForDate(date);
                  const isTodayFlag = isToday(date);
                  const blocks = workingHrs !== null && workingHrs > 0 ? getTimelineBlocks(date, workingHrs) : [];
                  const hasWaitTime = blocks.some(b => b.type === 'wait');
                  
                  let cellBg = 'bg-white';
                  let statusText = null;

                  if (workingHrs === null) {
                      cellBg = 'bg-red-50';
                      statusText = 'No Config';
                  } else if (workingHrs === 0) {
                      cellBg = 'bg-slate-100'; // Or use a striped CSS class
                      statusText = 'Holiday';
                  } else if (hasWaitTime) {
                      const isEntirelyWait = blocks.length === 1 && blocks[0].type === 'wait';
                      cellBg = isEntirelyWait ? 'bg-red-50/60' : 'bg-red-50/20';
                  }

                  return (
                    <div 
                      key={date.toISOString()} 
                      className={`relative min-h-[120px] border-r border-b border-slate-100 p-2 ${cellBg} ${isTodayFlag ? 'ring-2 ring-indigo-500 ring-inset z-10' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-medium ${isTodayFlag ? 'bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-700'}`}>
                          {date.getDate()}
                        </span>
                        {workingHrs !== null && workingHrs > 0 && (
                            <span className="text-xs text-slate-400 font-mono" title="Total working hours">
                                {workingHrs}h
                            </span>
                        )}
                      </div>

                      {statusText ? (
                          <div className="flex items-center justify-center h-12 text-xs font-semibold text-slate-400 uppercase tracking-widest mt-2">
                              {statusText}
                          </div>
                      ) : (
                        <div className="space-y-1">
                          {blocks.map((block, idx) => {
                            if (block.type === 'booking') {
                              const b = block.data;
                              return (
                                <div 
                                  key={`booking-${idx}`} 
                                  className={`text-xs px-2 py-1 rounded text-white shadow-sm truncate cursor-pointer hover:opacity-90 ${getWoColor(b.work_order_no)}`}
                                  title={`WO-${b.work_order_no} | ${b.material_name} | ${parseFloat(b.booked_hours).toFixed(1)} hrs (${parseFloat(b.start_hour).toFixed(1)} - ${parseFloat(b.end_hour).toFixed(1)})`}
                                >
                                  <div className="font-bold">WO-{b.work_order_no}</div>
                                  <div className="opacity-90 flex justify-between">
                                    <span>{parseFloat(b.booked_hours).toFixed(1)}h</span>
                                  </div>
                                </div>
                              );
                            } else if (block.type === 'wait') {
                              return (
                                <div 
                                  key={`wait-${idx}`}
                                  className="text-[11px] px-2 py-0.5 rounded bg-red-600 text-white font-semibold shadow-sm truncate text-center"
                                  title={`Waiting Time (Idle) | ${parseFloat(block.duration).toFixed(1)} hrs (${parseFloat(block.start).toFixed(1)} - ${parseFloat(block.end).toFixed(1)})`}
                                >
                                  Wait: {parseFloat(block.duration).toFixed(1)}h
                                </div>
                              );
                            } else {
                              return null;
                            }
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">Scheduled Work Orders ({currentDate.toLocaleString('default', { month: 'long' })})</h3>
                </div>
                {uniqueWorkOrders.length > 0 ? (
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">Work Order No</th>
                                <th className="px-6 py-3">Material</th>
                                <th className="px-6 py-3">Start Date</th>
                                <th className="px-6 py-3">End Date</th>
                                <th className="px-6 py-3 text-right">Total Hours (This Month)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {uniqueWorkOrders.map((wo, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4 font-bold text-slate-900">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${getWoColor(wo.woNo)}`}></div>
                                            WO-{wo.woNo}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium">{wo.materialName}</td>
                                    <td className="px-6 py-4 text-slate-500">{wo.startDate}</td>
                                    <td className="px-6 py-4 text-slate-500">{wo.endDate}</td>
                                    <td className="px-6 py-4 text-right font-mono font-medium text-slate-800">{wo.totalHours} h</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-8 text-center text-slate-500">
                        No work orders scheduled for this machine in this month.
                    </div>
                )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
