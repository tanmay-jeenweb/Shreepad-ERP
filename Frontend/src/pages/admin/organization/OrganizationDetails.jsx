import { useEffect, useState } from "react";
import Navbar from "../../../components/Navbar";
import { getOrganizationDetails, upsertOrganizationDetails } from "../../../api/organizationApi";
import toast from "react-hot-toast";
import { usePermission } from "../../../context/PermissionContext";

export default function OrganizationDetails() {
  const { hasPermission } = usePermission();
  const canWrite = hasPermission("organization", "write");

  // Form states
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [logo, setLogo] = useState(""); // Holds Base64 data URL
  const [dragOver, setDragOver] = useState(false);

  // Status states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch existing details
  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      try {
        const res = await getOrganizationDetails();
        const data = res.data.data;
        if (data) {
          setName(data.name || "");
          setAddress(data.address || "");
          setGstNumber(data.gst_number || "");
          setStateCode(data.state_code || "");
          setLogo(data.logo || "");
        }
      } catch (err) {
        console.error("Failed to load organization details", err);
        toast.error("Unable to load organization details.");
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, []);

  // Convert file to base64 data URL
  const handleFileChange = (file) => {
    if (!file) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files (PNG, JPG, JPEG, WEBP) are supported.");
      return;
    }

    // Validate size (limit to 2MB to keep DB storage light)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogo(reader.result);
      toast.success("Logo uploaded successfully");
    };
    reader.onerror = () => {
      toast.error("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    if (canWrite) setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (!canWrite) return;
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  // Submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Organization Name is required.");
      return;
    }

    if (gstNumber.trim() && gstNumber.trim().length !== 15) {
      toast.error("GST Number must be exactly 15 characters long.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        logo: logo || null,
        address: address.trim() || null,
        gstNumber: gstNumber.trim().toUpperCase() || null,
        stateCode: stateCode.trim().toUpperCase() || null,
      };

      const res = await upsertOrganizationDetails(payload);
      toast.success(res.data.message || "Organization details saved successfully!");
      
      // Update local state with latest response
      if (res.data.data) {
        setName(res.data.data.name || "");
        setAddress(res.data.data.address || "");
        setGstNumber(res.data.data.gst_number || "");
        setStateCode(res.data.data.state_code || "");
        const newLogo = res.data.data.logo || "";
        setLogo(newLogo);
        if (newLogo) {
            localStorage.setItem("org_logo", newLogo);
        } else {
            localStorage.removeItem("org_logo");
        }
        window.dispatchEvent(new CustomEvent("organization-updated", { detail: newLogo }));
      }
    } catch (err) {
      console.error("Failed to save organization details", err);
      toast.error(err?.response?.data?.message || "Failed to save organization details.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors text-slate-800 bg-white text-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed";
  const labelCls = "block text-sm font-semibold text-slate-700 mb-1.5";

  if (loading) {
    return (
      <div className="flex-1 bg-slate-50 font-sans text-slate-900">
        <Navbar title="ERP Admin" />
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm font-semibold">
          Loading organization details...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 font-sans text-slate-900 min-h-screen pb-12">
      <Navbar title="ERP Admin" />

      <main className="mx-auto py-8 px-4 sm:px-6 lg:px-8 ">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Organization Details Master
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage organization legal profile details, registration codes, and printing header logo.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column: Logo Dragzone (1/3 width) */}
              <div className="flex flex-col items-center">
                <label className={labelCls}>Organization Logo</label>
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-full aspect-square max-w-[240px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 text-center transition-all ${
                    dragOver
                      ? "border-[#369ACF] bg-indigo-50/50 scale-[1.02]"
                      : logo
                      ? "border-slate-200 bg-slate-50"
                      : "border-slate-300 hover:border-slate-400 bg-white"
                  } ${!canWrite && "opacity-75 cursor-not-allowed hover:border-slate-300"}`}
                >
                  {logo ? (
                    <div className="relative w-full h-full flex flex-col items-center justify-center group">
                      <img
                        src={logo}
                        alt="Organization Logo"
                        className="max-w-full max-h-[140px] object-contain rounded-lg shadow-sm"
                      />
                      {canWrite && (
                        <button
                          type="button"
                          onClick={() => setLogo("")}
                          className="mt-3 text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
                        >
                          Remove Logo
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        {canWrite ? "Drag logo image here" : "No Logo Uploaded"}
                      </p>
                      {canWrite && (
                        <>
                          <span className="text-[10px] text-slate-400 my-1">or</span>
                          <label className="text-xs font-semibold text-[#369ACF] hover:underline cursor-pointer">
                            Browse Files
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileChange(e.target.files[0])}
                              className="hidden"
                            />
                          </label>
                        </>
                      )}
                      <p className="text-[10px] text-slate-400 mt-2">Max 2MB (PNG, JPG)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Fields (2/3 width) */}
              <div className="md:col-span-2 space-y-5">
                {/* Name */}
                <div>
                  <label className={labelCls}>
                    Organization Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!canWrite}
                    placeholder="Enter official organization name"
                    className={inputCls}
                    required
                  />
                </div>

                {/* GST Number */}
                <div>
                  <label className={labelCls}>GST Number</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    disabled={!canWrite}
                    placeholder="e.g. 24AAAEC1234F1Z5"
                    className={`${inputCls} uppercase font-mono`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Format: 15 alphanumeric characters (e.g. 24 state code, PAN, entity code).
                  </p>
                </div>

                {/* State Code */}
                <div>
                  <label className={labelCls}>State Code</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    disabled={!canWrite}
                    placeholder="e.g. 24"
                    className={`${inputCls} uppercase font-mono`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Enter the GST state code separately if required.
                  </p>
                </div>

                {/* Address */}
                <div>
                  <label className={labelCls}>Address</label>
                  <textarea
                    rows={4}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={!canWrite}
                    placeholder="Enter registered business address..."
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </div>
            </div>

            {/* Submission Actions */}
            {canWrite && (
              <div className="flex justify-end pt-5 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#369ACF] text-white px-8 py-2.5 rounded-lg font-medium hover:bg-[#2583b4] transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-slate-400 shadow-sm cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Details"}
                </button>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
