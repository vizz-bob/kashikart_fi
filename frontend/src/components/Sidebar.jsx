import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Search,
  Globe,
  Bell,
  BarChart3,
  ScrollText,
  Settings,
  LogOut,
  History,
} from "lucide-react";

const menu = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Tenders", path: "/tenders", icon: FileText },
  { name: "Keywords", path: "/keywords", icon: Search },
  { name: "Sources", path: "/sources", icon: Globe },
  { name: "Notifications", path: "/notifications", icon: Bell },
  { name: "Analytics", path: "/analytics", icon: BarChart3 },
  { name: "System Logs", path: "/system-logs", icon: ScrollText },
  { name: "Login History", path: "/login-history", icon: History },
];

// export default function Sidebar({
//   headerTitle = "Tender Intel",
//   headerSubtitle = "Intelligent System",
// }) {
const Sidebar = memo(function Sidebar({
  isOpen,
  setIsOpen,
  collapsed = false,
  headerTitle = "Tender Intel",
  headerSubtitle = "Intelligent System",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profileName, setProfileName] = useState("User");
  const [profileEmail, setProfileEmail] = useState("");
  const [headerTitleText, setHeaderTitleText] = useState(headerTitle);
  const [headerSubtitleText, setHeaderSubtitleText] = useState(headerSubtitle);
  const [sidebarLogo, setSidebarLogo] = useState(null);
  const logoInputRef = useRef(null);

  useEffect(() => {
    const readProfilePhoto = () => {
      const storedPhoto = localStorage.getItem("profilePhoto");
      setProfilePhoto(storedPhoto || null);
    };

    readProfilePhoto();
    window.addEventListener("profilePhotoUpdated", readProfilePhoto);
    window.addEventListener("storage", readProfilePhoto);

    return () => {
      window.removeEventListener("profilePhotoUpdated", readProfilePhoto);
      window.removeEventListener("storage", readProfilePhoto);
    };
  }, []);

  useEffect(() => {
    const readProfileInfo = () => {
      const storedName = localStorage.getItem("profileName");
      const storedEmail = localStorage.getItem("profileEmail");
      if (storedName) setProfileName(storedName);
      if (storedEmail) setProfileEmail(storedEmail);
    };

    readProfileInfo();
    window.addEventListener("profileInfoUpdated", readProfileInfo);
    window.addEventListener("storage", readProfileInfo);

    return () => {
      window.removeEventListener("profileInfoUpdated", readProfileInfo);
      window.removeEventListener("storage", readProfileInfo);
    };
  }, []);

  useEffect(() => {
    const storedTitle = localStorage.getItem("sidebarHeaderTitle");
    const storedSubtitle = localStorage.getItem("sidebarHeaderSubtitle");

    setHeaderTitleText(storedTitle || headerTitle);
    setHeaderSubtitleText(storedSubtitle || headerSubtitle);
  }, [headerTitle, headerSubtitle]);

  useEffect(() => {
    const storedLogo = localStorage.getItem("sidebarHeaderLogo");
    setSidebarLogo(storedLogo || null);
  }, []);

  const handleEditHeader = useCallback(() => {
    const nextTitle = window.prompt("Sidebar title", headerTitleText);
    if (nextTitle !== null) {
      const trimmedTitle = nextTitle.trim();
      const finalTitle = trimmedTitle || headerTitle;
      setHeaderTitleText(finalTitle);
      localStorage.setItem("sidebarHeaderTitle", finalTitle);
    }

    const nextSubtitle = window.prompt("Sidebar subtitle", headerSubtitleText);
    if (nextSubtitle !== null) {
      const trimmedSubtitle = nextSubtitle.trim();
      const finalSubtitle = trimmedSubtitle || headerSubtitle;
      setHeaderSubtitleText(finalSubtitle);
      localStorage.setItem("sidebarHeaderSubtitle", finalSubtitle);
    }
  }, [headerSubtitle, headerTitle, headerSubtitleText, headerTitleText]);

  const handleProfileToggle = useCallback(() => {
    if (location.pathname === "/profile") {
      navigate("/dashboard");
      return;
    }
    navigate("/profile");
  }, [location.pathname, navigate]);

  const triggerLogoPicker = useCallback(() => {
    logoInputRef.current?.click();
  }, []);

  const handleLogoChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") return;
      setSidebarLogo(result);
      localStorage.setItem("sidebarHeaderLogo", result);
    };
    reader.readAsDataURL(file);
  }, []);

  return (
    // {/* // <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0b1222] text-white flex flex-col"> */}
    <>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}
      <aside
        className={`
    fixed inset-y-0 left-0 z-50
    h-screen w-64 bg-[#0b1222] text-white flex flex-col
    transition-transform duration-300
    ${isOpen ? "translate-x-0" : "-translate-x-full"}
    md:translate-x-0
    ${collapsed ? "md:w-20" : "md:w-64"}
  `}
      >
        {/* ================= LOGO ================= */}
        <div
          className={`border-b border-white/10 ${
            collapsed ? "px-4 py-5" : "px-6 py-5"
          }`}
        >
          <div
            className={`flex items-center ${
              collapsed ? "justify-center" : "gap-3"
            }`}
          >
            {/* LOGO ICON */}
            <button
              type="button"
              onClick={triggerLogoPicker}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4f8cff] to-[#2563eb] flex items-center justify-center shadow-md overflow-hidden"
              aria-label="Change sidebar logo"
              title="Change logo"
            >
              {sidebarLogo ? (
                <img
                  src={sidebarLogo}
                  alt="Sidebar logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13 2L3 14H11L9 22L21 10H13V2Z"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />

            {!collapsed && (
              <button
                type="button"
                onClick={handleEditHeader}
                className="text-left hover:text-red-400 transition"
                aria-label="Edit sidebar header"
              >
                <p className="text-[15px] font-semibold tracking-wide">
                  {headerTitleText}
                </p>
                <p className="text-[12px] text-gray-400">
                  {headerSubtitleText}
                </p>
              </button>
            )}
          </div>
        </div>

        {/* ================= MENU ================= */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {menu.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)} // 👈 mobile close
                className={({ isActive }) =>
                  `
                group flex items-center rounded-xl transition-all
                ${
                  collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-4 py-2.5"
                }
                ${
                  isActive
                    ? "bg-[#1e2a44] shadow-[inset_0_0_0_1px_rgba(79,140,255,0.25)]"
                    : "text-gray-300 hover:bg-white/5"
                }
                `
                }
                title={collapsed ? item.name : undefined}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={18}
                      strokeWidth={1.9}
                      className={
                        isActive
                          ? "text-[#4f8cff] drop-shadow-sm"
                          : "text-gray-400 group-hover:text-[#4f8cff]"
                      }
                    />
                    {!collapsed && (
                      <span
                        className={`text-[14px] font-medium ${
                          isActive ? "text-white" : ""
                        }`}
                      >
                        {item.name}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ================= FOOTER ================= */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleProfileToggle}
            className={`flex items-center w-full hover:bg-white/5 p-2 rounded-xl transition ${
              collapsed ? "justify-center" : "gap-3"
            }`}
            title={collapsed ? `${profileName}` : undefined}
          >
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="Profile"
                className="w-9 h-9 rounded-full object-cover shadow"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4f8cff] to-[#2563eb] flex items-center justify-center text-white font-semibold shadow">
                G
              </div>
            )}
            {!collapsed && (
              <div className="text-left">
                <p className="text-sm font-medium">{profileName}</p>
                <p className="text-xs text-gray-400">{profileEmail}</p>
              </div>
            )}
          </button>

          {/* SETTINGS & LOGOUT */}
          <div
            className={`flex items-center mt-4 px-2 text-[12px] text-gray-400 ${
              collapsed ? "justify-center" : "justify-center"
            }`}
          >
            {/* <button className="flex items-center gap-1 hover:text-[#4f8cff] transition">
            <Settings size={14} />
            Settings
          </button> */}
            <button
              onClick={() => {
                localStorage.removeItem("kashikart_token");
                localStorage.removeItem("access_token");
                localStorage.removeItem("profileName");
                localStorage.removeItem("profileEmail");
                localStorage.removeItem("profilePhoto");
                navigate("/login");
              }}
              className={`flex items-center hover:text-red-400 transition ${
                collapsed ? "gap-0" : "gap-1"
              }`}
              title={collapsed ? "Logout" : undefined}
            >
              <LogOut size={14} />
              {!collapsed && "Logout"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
});

export default Sidebar;
