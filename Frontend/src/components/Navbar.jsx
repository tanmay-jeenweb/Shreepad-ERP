import { useNavigate, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { logoutUser } from "../api/authApi";
import { getOrganizationDetails } from "../api/organizationApi";
import logoImage from "../assets/SHR.png";
import { usePermission } from "../context/PermissionContext";

export default function Navbar({ title }) {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const [isOpen, setIsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
    const [isStoreOpen, setIsStoreOpen] = useState(false);
    const [isProductionOpen, setIsProductionOpen] = useState(false);
    const [isSalesOpen, setIsSalesOpen] = useState(false);
    const [isApprovalOpen, setIsApprovalOpen] = useState(false);
    const [isReportsOpen, setIsReportsOpen] = useState(false);
    const [orgLogo, setOrgLogo] = useState(localStorage.getItem("org_logo") || logoImage);
    const { hasPermission } = usePermission();

    useEffect(() => {
        const fetchLogo = async () => {
            try {
                const res = await getOrganizationDetails();
                const newLogo = res.data?.data?.logo || logoImage;
                setOrgLogo(newLogo);
                if (newLogo !== logoImage) {
                    localStorage.setItem("org_logo", newLogo);
                } else {
                    localStorage.removeItem("org_logo");
                }
            } catch (err) {
                console.error("Failed to fetch organization logo", err);
            }
        };

        const handleUpdate = (e) => {
            setOrgLogo(e.detail || logoImage);
        };

        fetchLogo();
        window.addEventListener("organization-updated", handleUpdate);
        return () => window.removeEventListener("organization-updated", handleUpdate);
    }, []);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (isOpen && !e.target.closest("#custom-nav-dropdown")) {
                setIsOpen(false);
            }
            if (isProfileOpen && !e.target.closest("#profile-dropdown")) {
                setIsProfileOpen(false);
            }
            if (isPurchaseOpen && !e.target.closest("#purchase-dropdown")) {
                setIsPurchaseOpen(false);
            }
            if (isStoreOpen && !e.target.closest("#store-dropdown")) {
                setIsStoreOpen(false);
            }
            if (isProductionOpen && !e.target.closest("#production-dropdown")) {
                setIsProductionOpen(false);
            }
            if (isSalesOpen && !e.target.closest("#sales-dropdown")) {
                setIsSalesOpen(false);
            }
            if (isApprovalOpen && !e.target.closest("#approval-dropdown")) {
                setIsApprovalOpen(false);
            }
            if (isReportsOpen && !e.target.closest("#reports-dropdown")) {
                setIsReportsOpen(false);
            }
        };
        document.addEventListener("click", handleOutsideClick);
        return () => document.removeEventListener("click", handleOutsideClick);
    }, [isOpen, isProfileOpen, isPurchaseOpen, isStoreOpen, isProductionOpen, isSalesOpen, isApprovalOpen, isReportsOpen]);

    const closeAllDropdowns = () => {
        setIsOpen(false);
        setIsProfileOpen(false);
        setIsPurchaseOpen(false);
        setIsStoreOpen(false);
        setIsProductionOpen(false);
        setIsSalesOpen(false);
        setIsApprovalOpen(false);
        setIsReportsOpen(false);
    };

    const toggleMasters = () => {
        const nextState = !isOpen;
        closeAllDropdowns();
        setIsOpen(nextState);
    };

    const toggleProfile = () => {
        const nextState = !isProfileOpen;
        closeAllDropdowns();
        setIsProfileOpen(nextState);
    };

    const togglePurchase = () => {
        const nextState = !isPurchaseOpen;
        closeAllDropdowns();
        setIsPurchaseOpen(nextState);
    };

    const toggleStore = () => {
        const nextState = !isStoreOpen;
        closeAllDropdowns();
        setIsStoreOpen(nextState);
    };

    const toggleProduction = () => {
        const nextState = !isProductionOpen;
        closeAllDropdowns();
        setIsProductionOpen(nextState);
    };

    const toggleSales = () => {
        const nextState = !isSalesOpen;
        closeAllDropdowns();
        setIsSalesOpen(nextState);
    };

    const toggleApproval = () => {
        const nextState = !isApprovalOpen;
        closeAllDropdowns();
        setIsApprovalOpen(nextState);
    };

    const toggleReports = () => {
        const nextState = !isReportsOpen;
        closeAllDropdowns();
        setIsReportsOpen(nextState);
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error("Logout failed", error);
        }
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        sessionStorage.removeItem("loginTime");
        window.dispatchEvent(new Event("auth-change"));
        navigate("/");
    };

    const userModules = user.modules || [];
    const isAdmin = user.role === "admin";

    const allMasters = [
        // {
        //     name: "User Dashboard",
        //     path: "/user/home",
        //     icon: "fa-solid fa-house",
        //     color: "bg-blue-50 text-blue-600 border border-blue-100/50",
        //     activeColor: "bg-blue-100 text-blue-700",
        //     desc: "Overview of your personal workspace"
        // },
        {
            name: "User Master",
            path: "/admin/dashboard",
            adminOnly: true,
            icon: "fa-solid fa-users-gear",
            color: "bg-emerald-50 text-emerald-600 border border-emerald-100/50",
            activeColor: "bg-emerald-100 text-emerald-700",
            desc: "Manage user profiles & account statuses"
        },
        {
            name: "User Types Master",
            path: "/admin/user-types",
            masterKey: "user_type",
            icon: "fa-solid fa-user-shield",
            color: "bg-violet-50 text-violet-600 border border-violet-100/50",
            activeColor: "bg-violet-100 text-violet-700",
            desc: "Configure access roles & permissions"
        },
        {
            name: "Location Types Master",
            path: "/admin/location-types",
            masterKey: "location_type",
            icon: "fa-solid fa-layer-group",
            color: "bg-amber-50 text-amber-600 border border-amber-100/50",
            activeColor: "bg-amber-100 text-amber-700",
            desc: "Define hierarchical levels & categories"
        },
        {
            name: "Location Master",
            path: "/admin/locations",
            masterKey: "location",
            icon: "fa-solid fa-location-dot",
            color: "bg-rose-50 text-rose-600 border border-rose-100/50",
            activeColor: "bg-rose-100 text-rose-700",
            desc: "Track physical sites & addresses"
        },
        {
            name: "Machine Types Master",
            path: "/admin/machine-types",
            masterKey: "machine_type",
            icon: "fa-solid fa-gears",
            color: "bg-cyan-50 text-cyan-600 border border-cyan-100/50",
            activeColor: "bg-cyan-100 text-cyan-700",
            desc: "Classify industrial equipment configurations"
        },
        {
            name: "Machine Master",
            path: "/admin/machines",
            masterKey: "machine",
            icon: "fa-solid fa-industry",
            color: "bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100/50",
            activeColor: "bg-fuchsia-100 text-fuchsia-700",
            desc: "Register & monitor machine operations"
        },

        {
            name: "Material Group Master",
            path: "/admin/material-groups",
            masterKey: "material_group",
            icon: "fa-solid fa-boxes-stacked",
            color: "bg-teal-50 text-teal-600 border border-teal-100/50",
            activeColor: "bg-teal-100 text-teal-700",
            desc: "Manage material group names and details"
        },
        {
            name: "Material Type Master",
            path: "/admin/material-types",
            masterKey: "material_type",
            icon: "fa-solid fa-tags",
            color: "bg-indigo-50 text-indigo-600 border border-indigo-100/50",
            activeColor: "bg-indigo-100 text-indigo-700",
            desc: "Manage material types and classifications"
        },
        {
            name: "Unit Master",
            path: "/admin/units",
            masterKey: "unit",
            icon: "fa-solid fa-ruler",
            color: "bg-sky-50 text-sky-600 border border-sky-100/50",
            activeColor: "bg-sky-100 text-sky-700",
            desc: "Manage measurement units and specifications"
        },
        {
            name: "Material Master",
            path: "/admin/materials",
            masterKey: "material",
            icon: "fa-solid fa-box-archive",
            color: "bg-indigo-50 text-indigo-600 border border-indigo-100/50",
            activeColor: "bg-indigo-100 text-indigo-700",
            desc: "Manage material codes, groups, units, types & valuation"
        },

        {
            name: "Operator Type Master",
            path: "/admin/operator-types",
            masterKey: "operator_type",
            icon: "fa-solid fa-user-tag",
            color: "bg-orange-50 text-orange-600 border border-orange-100/50",
            activeColor: "bg-orange-100 text-orange-700",
            desc: "Manage operator type roles and classifications"
        },
        {
            name: "Operator Master",
            path: "/admin/operators",
            masterKey: "operator",
            icon: "fa-solid fa-user-gear",
            color: "bg-sky-50 text-sky-600 border border-sky-100/50",
            activeColor: "bg-sky-100 text-sky-700",
            desc: "Manage operator profiles, types, and joining logs"
        },

        {
            name: "Document Master",
            path: "/admin/documents",
            masterKey: "document",
            icon: "fa-solid fa-file-contract",
            color: "bg-teal-50 text-teal-600 border border-teal-100/50",
            activeColor: "bg-teal-100 text-teal-700",
            desc: "Manage organization and personal documents"
        },
        {
            name: "Vendor Master",
            path: "/admin/vendors",
            masterKey: "vendor",
            icon: "fa-solid fa-building-user",
            color: "bg-blue-50 text-blue-600 border border-blue-100/50",
            activeColor: "bg-blue-100 text-blue-700",
            desc: "Manage vendor details and related documents"
        },
        {
            name: "Customer Master",
            path: "/admin/customers",
            masterKey: "customer",
            icon: "fa-solid fa-users",
            color: "bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100/50",
            activeColor: "bg-fuchsia-100 text-fuchsia-700",
            desc: "Manage customer details and related documents"
        },

        {
            name: "Process Master",
            path: "/admin/process-masters",
            masterKey: "process_master",
            icon: "fa-solid fa-gears",
            color: "bg-teal-50 text-teal-600 border border-teal-100/50",
            activeColor: "bg-teal-100 text-teal-700",
            desc: "Manage processes and their operations"
        },
        {
            name: "Terms & Conditions Master",
            path: "/admin/terms-and-conditions",
            masterKey: "terms_and_conditions",
            icon: "fa-solid fa-file-invoice",
            color: "bg-emerald-50 text-emerald-600 border border-emerald-100/50",
            activeColor: "bg-emerald-100 text-emerald-700",
            desc: "Configure terms and conditions templates"
        },
        {
            name: "Organization Master",
            path: "/admin/organization",
            masterKey: "organization",
            icon: "fa-solid fa-building",
            color: "bg-emerald-50 text-emerald-600 border border-emerald-100/50",
            activeColor: "bg-emerald-100 text-emerald-700",
            desc: "Manage organization details and settings"
        },
        {
            name: "Setting Master",
            path: "/admin/settings",
            masterKey: "setting_master",
            icon: "fa-solid fa-sliders",
            color: "bg-indigo-50 text-indigo-600 border border-indigo-100/50",
            activeColor: "bg-indigo-100 text-indigo-700",
            desc: "Configure ID prefixes for GRN, Purchase Order & more"
        }
    ];

    const availableMasters = allMasters.filter(m => {
        if (m.adminOnly) return isAdmin;
        if (m.masterKey) return hasPermission(m.masterKey, "read");
        if (m.module) return isAdmin || userModules.includes(m.module);
        return true;
    });

    const availableStoreLinks = [
        { name: "Material Add", path: "/store/material-add", icon: "fa-solid fa-box-open", masterKey: "material_add" },
        { name: "Material Remove", path: "/store/material-remove", icon: "fa-solid fa-trash-can", masterKey: "stock_book" }
    ].filter(m => {
        if (isAdmin) return true;
        if (m.name === "Material Remove") {
            return hasPermission("stock_book", "read") || hasPermission("rm_stock_book", "read") || hasPermission("general_stock_book", "read");
        }
        return hasPermission(m.masterKey, "read");
    });

    const availableProductionLinks = [
        { name: "Bill of Material", path: "/production/bom", icon: "fa-solid fa-file-lines", masterKey: "bom" }
    ].filter(m => isAdmin || hasPermission(m.masterKey, "read"));

    const availableSalesLinks = [
        { name: "Work Order", path: "/sales/work-orders", icon: "fa-solid fa-file-signature", masterKey: "work_order" }
    ].filter(m => isAdmin || hasPermission(m.masterKey, "read"));

    const availableApprovalLinks = [];

    const availableReportsLinks = [
        { name: "Activity Report", path: "/reports", icon: "fa-solid fa-list-check", masterKey: "activity_report" },
        { name: "Stock Status", path: "/store/stock-status", icon: "fa-solid fa-boxes-stacked", masterKey: "stock_status" },
        { name: "Stock Book", path: "/store/stock-book", icon: "fa-solid fa-book-open", masterKey: "stock_book" }
    ].filter(m => {
        if (isAdmin) return true;
        if (!m.masterKey) return true;
        return hasPermission(m.masterKey, "read") || (m.masterKey === "stock_status" && (hasPermission("rm_stock_status", "read") || hasPermission("batchwise_stock_status", "read"))) || (m.masterKey === "stock_book" && (hasPermission("rm_stock_book", "read") || hasPermission("general_stock_book", "read")));
    });

    const hasAnyNavbarAccess = availableMasters.length > 0 || availableStoreLinks.length > 0 || availableProductionLinks.length > 0 || availableSalesLinks.length > 0 || availableApprovalLinks.length > 0 || availableReportsLinks.length > 0 || isAdmin;

    const currentMaster = availableMasters.find(m => m.path === location.pathname) || availableMasters[0];

    const activeCount = [
        true,
        availableMasters.length > 0,
        availableStoreLinks.length > 0,
        availableProductionLinks.length > 0,
        availableSalesLinks.length > 0,
        availableApprovalLinks.length > 0,
        availableReportsLinks.length > 0
    ].filter(Boolean).length;

    return (
        <nav className="bg-white shadow-sm border-b border-slate-200 flex flex-col">
            {/* First Row */}
            <div className="relative z-50 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img src={orgLogo} alt="Logo" className="h-10 w-auto" />
                </div>

                <div className="flex items-center gap-6">
                    {/* Notification Icon (Dummy) */}
                    <button className="text-slate-500 hover:text-indigo-600 transition-colors relative cursor-not-allowed" title="Notifications">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                        </svg>
                        <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
                    </button>

                    {/* Profile Dropdown */}
                    <div className="relative" id="profile-dropdown">
                        <button
                            onClick={toggleProfile}
                            className="flex items-center gap-2.5 px-3 py-1.5 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all duration-200 cursor-pointer focus:outline-none"
                            title="User menu"
                        >
                            {/* Profile Avatar Icon */}
                            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-sm">
                                {user.name ? user.name[0].toUpperCase() : "U"}
                            </div>
                            <span className="hidden sm:inline text-sm font-semibold text-slate-700">{user.name || "User"}</span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2.5}
                                stroke="currentColor"
                                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isProfileOpen ? "rotate-180" : ""}`}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>

                        {isProfileOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50 origin-top-right animate-in fade-in slide-in-from-top-2 duration-150">
                                {/* User Info Header */}
                                <div className="px-4 py-2.5 border-b border-slate-100">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Signed in as</p>
                                    <p className="text-sm font-bold text-slate-800 truncate mt-0.5">{user.name || "User"}</p>
                                    {user.email && (
                                        <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
                                    )}
                                </div>

                                {/* Menu Items */}
                                <div className="px-1.5 py-1">
                                    <button
                                        onClick={() => {
                                            navigate("/profile");
                                            setIsProfileOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-all duration-150 cursor-pointer text-left"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 text-slate-400">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                        </svg>
                                        Your Profile
                                    </button>
                                </div>

                                <div className="border-t border-slate-100 my-1"></div>

                                <div className="px-1.5 py-1">
                                    <button
                                        onClick={() => {
                                            setIsProfileOpen(false);
                                            handleLogout();
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 text-sm font-semibold transition-all duration-150 cursor-pointer text-left"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 text-red-500">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 6.75 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                                        </svg>
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Second Row: Custom Master Dropdown */}
            {hasAnyNavbarAccess && (
                <div className="bg-[#369ACF] border-t border-slate-200 w-full px-0 py-0">
                    <div
                        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-[repeat(var(--active-cols),minmax(0,1fr))] w-full relative z-40"
                        id="custom-nav-dropdown"
                        style={{ '--active-cols': activeCount }}
                    >
                        <div className="relative w-full">
                            <button
                                onClick={() => {
                                    closeAllDropdowns();
                                    navigate("/user/home");
                                }}
                                className="flex items-center justify-between w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#369ACF] border border-white/10 rounded-none hover:bg-white/5 focus:outline-none focus:ring-4 focus:ring-white/5 transition-all duration-200 font-semibold text-white cursor-pointer whitespace-nowrap"
                            >
                                <span className="flex items-center gap-2.5 pl-5 truncate">
                                    <span className="font-semibold text-white truncate">Dashboard</span>
                                </span>
                            </button>
                        </div>
                        {availableMasters.length > 0 && (
                            <div className="relative w-full">
                                <button
                                    onClick={toggleMasters}
                                    className="flex items-center justify-between w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#369ACF] border border-white/10 rounded-none hover:bg-white/5 focus:outline-none focus:ring-4 focus:ring-white/5 transition-all duration-200 font-semibold text-white cursor-pointer whitespace-nowrap"
                                >
                                    <span className="flex items-center gap-2.5 truncate">
                                        {/* <span className={`flex items-center justify-center w-6 h-6 rounded-lg ${currentMaster?.color || 'bg-white/10 text-slate-300'}`}>
                                        <i className={`${currentMaster?.icon || "fa-solid fa-folder"} text-[11px]`}></i>
                                    </span> */}
                                        <span className="font-semibold text-white truncate">Masters</span>
                                    </span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2.5}
                                        stroke="currentColor"
                                        className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${isOpen ? "rotate-180 text-white" : ""}`}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </button>

                                {isOpen && (
                                    <div className="absolute left-0 top-full mt-1.5 w-[960px] max-w-[95vw] bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 z-50 origin-top animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1.5 max-h-[75vh] overflow-y-auto lg:overflow-visible pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                            {availableMasters.map((m, idx) => {
                                                const isActive = location.pathname === m.path;
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            navigate(m.path);
                                                            setIsOpen(false);
                                                        }}
                                                        className={`relative group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-left border border-transparent ${isActive
                                                            ? "bg-indigo-50/70 text-indigo-700 font-semibold border-indigo-100/50"
                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-100"
                                                            }`}
                                                    >
                                                        {/* Side Highlight Bar */}
                                                        <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-md transition-all duration-200 ${isActive ? "bg-indigo-600 scale-y-100" : "bg-transparent scale-y-0 group-hover:scale-y-50 group-hover:bg-slate-300"
                                                            }`} />

                                                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all shadow-sm shrink-0 ${isActive ? "bg-indigo-100/80 text-indigo-700" : "bg-slate-100/80 text-slate-500 group-hover:scale-105"
                                                            }`}>
                                                            <i className={`${m.icon || "fa-solid fa-folder"} text-xs`}></i>
                                                        </div>

                                                        <div className="flex-1">
                                                            <p className={`text-sm font-semibold leading-snug py-0.5 transition-colors whitespace-normal break-words ${isActive ? "text-indigo-900 font-bold" : "text-slate-800 group-hover:text-slate-950"
                                                                }`}>
                                                                {m.name}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Store Dropdown */}
                        {availableStoreLinks.length > 0 && (
                            <div className="relative w-full" id="store-dropdown">
                                <button
                                    onClick={toggleStore}
                                    className={`flex items-center justify-between w-full px-3.5 py-2.5 text-xs sm:text-sm border border-white/10 rounded-none hover:bg-white/5 focus:outline-none transition-all duration-200 font-semibold text-white cursor-pointer whitespace-nowrap ${location.pathname.startsWith("/store/") ? "bg-white/10" : "bg-[#369ACF]"}`}
                                >
                                    <span className="font-semibold text-white truncate">Store</span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2.5}
                                        stroke="currentColor"
                                        className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${isStoreOpen ? "rotate-180 text-white" : ""}`}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </button>

                                {isStoreOpen && (
                                    <div className="absolute left-0 top-full mt-1.5 w-[520px] bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 z-50 origin-top animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                            {availableStoreLinks.map((m, idx) => {
                                                const isActive = location.pathname.startsWith(m.path);
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            navigate(m.path);
                                                            setIsStoreOpen(false);
                                                        }}
                                                        className={`relative group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-left border border-transparent ${isActive
                                                            ? "bg-indigo-50/70 text-indigo-700 font-semibold border-indigo-100/50"
                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-100"
                                                            }`}
                                                    >
                                                        {/* Side Highlight Bar */}
                                                        <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-md transition-all duration-200 ${isActive ? "bg-indigo-600 scale-y-100" : "bg-transparent scale-y-0 group-hover:scale-y-50 group-hover:bg-slate-300"
                                                            }`} />

                                                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all shadow-sm shrink-0 ${isActive ? "bg-indigo-100/80 text-indigo-700" : "bg-slate-100/80 text-slate-500 group-hover:scale-105"
                                                            }`}>
                                                            <i className={`${m.icon} text-xs`}></i>
                                                        </div>

                                                        <div className="flex-1">
                                                            <p className={`text-sm font-semibold leading-snug py-0.5 transition-colors whitespace-normal break-words ${isActive ? "text-indigo-900 font-bold" : "text-slate-800 group-hover:text-slate-950"
                                                                }`}>
                                                                {m.name}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Production Dropdown */}
                        {availableProductionLinks.length > 0 && (
                            <div className="relative w-full" id="production-dropdown">
                                <button
                                    onClick={toggleProduction}
                                    className={`flex items-center justify-between w-full px-3.5 py-2.5 text-xs sm:text-sm border border-white/10 rounded-none hover:bg-white/5 focus:outline-none transition-all duration-200 font-semibold text-white cursor-pointer whitespace-nowrap ${location.pathname.startsWith("/production/") ? "bg-white/10" : "bg-[#369ACF]"}`}
                                >
                                    <span className="font-semibold text-white truncate">Production</span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2.5}
                                        stroke="currentColor"
                                        className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${isProductionOpen ? "rotate-180 text-white" : ""}`}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </button>

                                {isProductionOpen && (
                                    <div className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 z-50 origin-top animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex flex-col gap-1.5">
                                            {availableProductionLinks.map((m, idx) => {
                                                const isActive = location.pathname.startsWith(m.path);
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            navigate(m.path);
                                                            setIsProductionOpen(false);
                                                        }}
                                                        className={`relative group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-left border border-transparent ${isActive
                                                            ? "bg-indigo-50/70 text-indigo-700 font-semibold border-indigo-100/50"
                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-100"
                                                            }`}
                                                    >
                                                        {/* Side Highlight Bar */}
                                                        <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-md transition-all duration-200 ${isActive ? "bg-indigo-600 scale-y-100" : "bg-transparent scale-y-0 group-hover:scale-y-50 group-hover:bg-slate-300"
                                                            }`} />

                                                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all shadow-sm shrink-0 ${isActive ? "bg-indigo-100/80 text-indigo-700" : "bg-slate-100/80 text-slate-500 group-hover:scale-105"
                                                            }`}>
                                                            <i className={`${m.icon} text-xs`}></i>
                                                        </div>

                                                        <div className="flex-1">
                                                            <p className={`text-sm font-semibold leading-snug py-0.5 transition-colors whitespace-normal break-words ${isActive ? "text-indigo-900 font-bold" : "text-slate-800 group-hover:text-slate-950"
                                                                }`}>
                                                                {m.name}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Sales Dropdown */}
                        {availableSalesLinks.length > 0 && (
                            <div className="relative w-full" id="sales-dropdown">
                                <button
                                    onClick={toggleSales}
                                    className={`flex items-center justify-between w-full px-3.5 py-2.5 text-xs sm:text-sm border border-white/10 rounded-none hover:bg-white/5 focus:outline-none transition-all duration-200 font-semibold text-white cursor-pointer whitespace-nowrap ${location.pathname.startsWith("/sales/") ? "bg-white/10" : "bg-[#369ACF]"}`}
                                >
                                    <span className="font-semibold text-white truncate">Sales</span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2.5}
                                        stroke="currentColor"
                                        className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${isSalesOpen ? "rotate-180 text-white" : ""}`}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </button>

                                {isSalesOpen && (
                                    <div className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 z-50 origin-top animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex flex-col gap-1.5">
                                            {availableSalesLinks.map((m, idx) => {
                                                const isActive = location.pathname.startsWith(m.path);
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            navigate(m.path);
                                                            setIsSalesOpen(false);
                                                        }}
                                                        className={`relative group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-left border border-transparent ${isActive
                                                            ? "bg-indigo-50/70 text-indigo-700 font-semibold border-indigo-100/50"
                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-100"
                                                            }`}
                                                    >
                                                        {/* Side Highlight Bar */}
                                                        <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-md transition-all duration-200 ${isActive ? "bg-indigo-600 scale-y-100" : "bg-transparent scale-y-0 group-hover:scale-y-50 group-hover:bg-slate-300"
                                                            }`} />

                                                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all shadow-sm shrink-0 ${isActive ? "bg-indigo-100/80 text-indigo-700" : "bg-slate-100/80 text-slate-500 group-hover:scale-105"
                                                            }`}>
                                                            <i className={`${m.icon} text-xs`}></i>
                                                        </div>

                                                        <div className="flex-1">
                                                            <p className={`text-sm font-semibold leading-snug py-0.5 transition-colors whitespace-normal break-words ${isActive ? "text-indigo-900 font-bold" : "text-slate-800 group-hover:text-slate-950"
                                                                }`}>
                                                                {m.name}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {availableApprovalLinks.length > 0 && (
                            <div className="relative w-full" id="approval-dropdown">
                                <button
                                    onClick={toggleApproval}
                                    className={`flex items-center justify-between w-full px-3.5 py-2.5 text-xs sm:text-sm border border-white/10 rounded-none hover:bg-white/5 focus:outline-none transition-all duration-200 font-semibold text-white cursor-pointer whitespace-nowrap ${location.pathname.startsWith("/purchase/po-approval") || location.pathname.startsWith("/sales/so-approval") ? "bg-white/10" : "bg-[#369ACF]"}`}
                                >
                                    <span className="font-semibold text-white truncate">Approvals</span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2.5}
                                        stroke="currentColor"
                                        className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${isApprovalOpen ? "rotate-180 text-white" : ""}`}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </button>

                                {isApprovalOpen && (
                                    <div className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 z-50 origin-top animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex flex-col gap-1.5">
                                            {availableApprovalLinks.map((m, idx) => {
                                                const isActive = location.pathname.startsWith(m.path);
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            navigate(m.path);
                                                            setIsApprovalOpen(false);
                                                        }}
                                                        className={`relative group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-left border border-transparent ${isActive
                                                            ? "bg-indigo-50/70 text-indigo-700 font-semibold border-indigo-100/50"
                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-100"
                                                            }`}
                                                    >
                                                        {/* Side Highlight Bar */}
                                                        <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-md transition-all duration-200 ${isActive ? "bg-indigo-600 scale-y-100" : "bg-transparent scale-y-0 group-hover:scale-y-50 group-hover:bg-slate-300"
                                                            }`} />

                                                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all shadow-sm shrink-0 ${isActive ? "bg-indigo-100/80 text-indigo-700" : "bg-slate-100/80 text-slate-500 group-hover:scale-105"
                                                            }`}>
                                                            <i className={`${m.icon} text-xs`}></i>
                                                        </div>

                                                        <div className="flex-1">
                                                            <p className={`text-sm font-semibold leading-snug py-0.5 transition-colors whitespace-normal break-words ${isActive ? "text-indigo-900 font-bold" : "text-slate-800 group-hover:text-slate-950"
                                                                }`}>
                                                                {m.name}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {availableReportsLinks.length > 0 && (
                            <div className="relative w-full" id="reports-dropdown">
                                <button
                                    onClick={toggleReports}
                                    className={`flex items-center justify-between w-full px-3.5 py-2.5 text-xs sm:text-sm border border-white/10 rounded-none hover:bg-white/5 focus:outline-none transition-all duration-200 font-semibold text-white cursor-pointer whitespace-nowrap ${availableReportsLinks.some(m => location.pathname.startsWith(m.path)) ? "bg-white/10" : "bg-[#369ACF]"}`}
                                >
                                    <span className="font-semibold text-white truncate">Reports</span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2.5}
                                        stroke="currentColor"
                                        className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${isReportsOpen ? "rotate-180 text-white" : ""}`}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </button>

                                {isReportsOpen && (
                                    <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 z-50 origin-top animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex flex-col gap-1.5">
                                            {availableReportsLinks.map((m, idx) => {
                                                const isActive = location.pathname.startsWith(m.path);
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            navigate(m.path);
                                                            setIsReportsOpen(false);
                                                        }}
                                                        className={`relative group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-left border border-transparent ${isActive
                                                            ? "bg-indigo-50/70 text-indigo-700 font-semibold border-indigo-100/50"
                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-100"
                                                            }`}
                                                    >
                                                        {/* Side Highlight Bar */}
                                                        <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-md transition-all duration-200 ${isActive ? "bg-indigo-600 scale-y-100" : "bg-transparent scale-y-0 group-hover:scale-y-50 group-hover:bg-slate-300"
                                                            }`} />

                                                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all shadow-sm shrink-0 ${isActive ? "bg-indigo-100/80 text-indigo-700" : "bg-slate-100/80 text-slate-500 group-hover:scale-105"
                                                            }`}>
                                                            <i className={`${m.icon} text-xs`}></i>
                                                        </div>

                                                        <div className="flex-1">
                                                            <p className={`text-sm font-semibold leading-snug py-0.5 transition-colors whitespace-normal break-words ${isActive ? "text-indigo-900 font-bold" : "text-slate-800 group-hover:text-slate-950"
                                                                }`}>
                                                                {m.name}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            )}
        </nav>
    );
}
