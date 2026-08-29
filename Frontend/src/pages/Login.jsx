import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { loginUser } from "../api/authApi";
import { getDeviceId } from "../utils/device";
import { getOrganizationDetails } from "../api/organizationApi";
const logo = "/SHR.png";
import jwlogo from "../assets/jwLogo.jpeg"

export default function Login() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [orgLogo, setOrgLogo] = useState("");

    useEffect(() => {
        const fetchLogo = async () => {
            try {
                const res = await getOrganizationDetails();
                if (res.data?.data?.logo) {
                    setOrgLogo(res.data.data.logo);
                }
            } catch (err) {
                console.error("Failed to load organization logo:", err);
            }
        };
        fetchLogo();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const deviceId = await getDeviceId();
            const response = await loginUser({ ...form, deviceId });

            if (!response.data.success) {
                if (response.data.status === "DEVICE_REGISTRATION_REQUIRED") {
                    navigate("/device-registration", { state: { username: form.username, password: form.password } });
                    return;
                }
                if (response.data.status === "PENDING_APPROVAL") {
                    navigate("/pending-approval");
                    return;
                }
                toast.error(response.data.message || "Login failed");
                return;
            }

            const user = response.data.user;
            const token = response.data.token;
            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("token", token);
            sessionStorage.setItem("loginTime", new Date().toLocaleTimeString());
            window.dispatchEvent(new Event("auth-change"));
            navigate("/user/home");

        } catch (error) {
            if (error.response?.data?.status === "DEVICE_MISMATCH") {
                toast.error("Unauthorized device. Contact admin.");
            } else {
                toast.error(error.response?.data?.message || "Login failed");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center">

            {/* Full-screen background image */}
            <img
                src="/Shreepad_Login_Background.png"
                alt="Background"
                className="absolute inset-0 w-full h-full object-cover object-center"
            />

            {/* Dark overlay — heavier on the right, lighter on the left */}
            <div
                className="absolute inset-0"
                style={{
                    background: "linear-gradient(to left, rgba(10, 44, 68, 0.88) 0%, rgba(10, 44, 68, 0.72) 45%, rgba(10, 44, 68, 0.15) 100%)"
                }}
            />

            {/* LOGIN FORM — positioned on the right */}
            <div className="relative z-10 w-full flex items-center justify-end min-h-screen px-8 sm:px-16 lg:px-24">
                <div className="w-full max-w-md">

                    {/* Glass card */}
                    <div
                        className="bg-[#0b2234]/85 backdrop-blur-md rounded-2xl px-10 pt-6 pb-6 shadow-2xl border border-white/10"
                    >
                        {/* Logo */}
                        <div className="flex flex-col items-center mb-4">
                            <img
                                src={orgLogo || logo}
                                alt="Shreepath Logo"
                                className="h-16 w-auto"
                            />
                            <h2 className="text-3xl font-bold text-white tracking-tight mt-3">
                                Welcome Back
                            </h2>
                            <p className="text-slate-300 text-sm mt-1 mb-4">Sign in to your ERP dashboard</p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleLogin} className="space-y-5">

                            {/* Username */}
                            <div>
                                <label
                                    htmlFor="username"
                                    className="block text-sm font-semibold text-slate-300 mb-2"
                                >
                                    Username
                                </label>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    required
                                    autoComplete="username"
                                    placeholder="Enter your username"
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl text-black text-sm outline-none transition-all duration-200 border border-slate-300 bg-white focus:border-[#2991D6] focus:ring-1 focus:ring-[#2991D6]"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-semibold text-slate-300 mb-2"
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        autoComplete="current-password"
                                        placeholder="Enter your password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        className="w-full px-4 py-3 pr-12 rounded-xl text-black text-sm outline-none transition-all duration-200 border border-slate-300 bg-white focus:border-[#2991D6] focus:ring-1 focus:ring-[#2991D6]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 mt-4 rounded-xl text-white text-base font-semibold tracking-wider transition-all duration-300 bg-[#2991D6] hover:bg-[#1b7ec0] shadow-md hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#2991D6] focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Signing in...
                                    </>
                                ) : "Sign In"}
                            </button>
                            {/* Footer */}
                            <div className="mt-8 flex justify-between items-center text-xs text-slate-400 px-1">
                                <div className="flex items-center gap-2">
                                    <span>Powered by</span>
                                    <img src={jwlogo} alt="Jeenweb" className="h-6 w-auto rounded-sm opacity-80" />
                                </div>
                                <div className="text-right">
                                    <div>Helpline: <a href="tel:9824466017" className="font-medium text-slate-300 hover:text-white transition-colors">9824466017</a></div>
                                    <div>Email: <a href="mailto:info@jeenweb.com" className="font-medium text-slate-300 hover:text-white transition-colors">info@jeenweb.com</a></div>
                                </div>
                            </div>
                        </form>
                    </div>

                    
                    
                </div>
            </div>
        </div>
    );
}