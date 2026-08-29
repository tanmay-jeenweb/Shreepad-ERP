import Navbar from "../../components/Navbar";

export default function UserHome() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    return (
        <div className="flex-1 bg-slate-50 font-sans text-slate-900">
            <Navbar title="ERP System" />

            {/* Main Content */}
            <main className="mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">User Home</h1>
                    <p className="text-slate-500 mt-1">Welcome back, {user.name}. Here's what's happening today.</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Your Dashboard</h2>
                    <div className="flex items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 bg-slate-50">
                        No modules assigned yet.
                    </div>
                </div>
            </main>
        </div>
    );
}
