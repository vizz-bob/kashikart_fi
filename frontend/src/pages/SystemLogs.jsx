import React from "react";
// import { useMemo, useState } from "react";
import { useMemo, useState, useEffect, useCallback } from "react";
// import axios from "axios";
import { EmptyState } from "../components/States";
import { getErrorMessage, requestJson, requestWithRetry } from "../utils/api";

import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Search,
  Filter,
  Download,
  Trash2,
  Bell,
} from "lucide-react";

const VALID_STATUS = ["Success", "Warning", "Error", "Info"];
const USE_MOCK_LOGS = false;
const SYSTEM_LOGS_ENDPOINTS = {
  list: "/api/system-logs/",
  clear: "/api/system-logs/",
};

/* ================= MOCK DATA ================= */
// NOTE: Backend connect ke baad ye mock data hata dena hai.
// Ye sab remove hoga: BASE_LOGS, buildMockLogs(), INITIAL_LOGS
const BASE_LOGS = [
  {
    date: "2026-01-01",
    time: "08:30:00",
    source: "SAM.gov",
    status: "Success",
    message: "Successfully fetched 24 new tenders",
  },
  {
    date: "2026-01-02",
    time: "08:30:00",
    source: "DOT Portal",
    status: "Success",
    message: "Successfully fetched 24 new tenders",
  },
  {
    date: "2026-01-03",
    time: "12:30:00",
    source: "VA Procurement",
    status: "Success",
    message: "Successfully fetched 24 new tenders",
  },
  {
    date: "2026-01-04",
    time: "08:30:00",
    source: "EPA Portal",
    status: "Warning",
    message: "Fetched with warnings - some pages unavailable",
  },
  {
    date: "2026-01-05",
    time: "05:30:00",
    source: "SAM.gov",
    status: "Error",
    message: "Failed to fetch - connection timeout",
  },
  {
    date: "2026-01-03",
    time: "08:30:00",
    source: "DOT Portal",
    status: "Info",
    message: "Scheduled sync started",
  },
  {
    date: "2026-01-01",
    time: "23:30:00",
    source: "VA Procurement",
    status: "Info",
    message: "System maintenance completed",
  },
];

function buildMockLogs() {
  const extraLogs = [];
  const sources = ["SAM.gov", "DOT Portal", "VA Procurement", "EPA Portal"];
  const statuses = ["Success", "Warning", "Error", "Info"];
  const messages = {
    Success: "Sync completed successfully",
    Warning: "Partial sync - some items skipped",
    Error: "Sync failed - retry scheduled",
    Info: "Background sync running",
  };

  for (let i = 0; i < 60; i += 1) {
    const day = String((i % 28) + 1).padStart(2, "0");
    const hour = String((8 + (i % 12)) % 24).padStart(2, "0");
    const minute = String((i * 7) % 60).padStart(2, "0");
    const status = statuses[i % statuses.length];
    const source = sources[i % sources.length];

    extraLogs.push({
      date: `2026-01-${day}`,
      time: `${hour}:${minute}:00`,
      source,
      status,
      message: messages[status],
    });
  }

  return [...BASE_LOGS, ...extraLogs];
}

const INITIAL_LOGS = buildMockLogs();

function isValidStatus(status) {
  return VALID_STATUS.includes(status);
}

function isValidDate(dateStr) {
  if (typeof dateStr !== "string") return false;

  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

function getLocalDateOnly(date, time) {
  try {
    // combine date + time → local timezone
    const d = new Date(`${date}T${time || "00:00:00"}`);
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  } catch (err) {
    console.error("Invalid date/time:", date, time, err);
    return ""; // fallback
  }
}

function isValidLog(log) {
  if (!log) return false;

  if (!VALID_STATUS.includes(log.status)) return false;

  if (typeof log.message !== "string" || log.message.trim() === "")
    return false;

  if (typeof log.source !== "string" || log.source.trim() === "") return false;

  // if (typeof log.date !== "string" || typeof log.time !== "string")
  //   return false;
  if (!isValidDate(log.date)) return false;

  return true;
}

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [selectedDate, setSelectedDate] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [openNotif, setOpenNotif] = useState(false);
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendStats, setBackendStats] = useState(null);

  const fetchLogs = async () => {
    if (USE_MOCK_LOGS) return;
    try {
      setLoading(true);
      setError(null);

      const [data, notifData] = await Promise.all([
        requestWithRetry(() => requestJson(SYSTEM_LOGS_ENDPOINTS.list)),
        requestWithRetry(() => requestJson("/api/notifications/")).catch(() => ({ items: [] }))
      ]);

      const items = Array.isArray(data) ? data : (data?.items || []);
      setLogs(items);

      if (data?.stats) {
        setBackendStats(data.stats);
      }

      if (notifData?.items) {
        setNotifications(notifData.items);
      }
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Failed to load system logs"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  if (!Array.isArray(logs)) {
    return (
      <div className="w-full bg-white px-6 py-10 text-sm text-red-700">
        Unable to load system logs. Please try again.
      </div>
    );
  }

  const filteredLogs = useMemo(() => {
    try {
      if (!Array.isArray(logs)) return [];

      const safeSearch = search.trim().toLowerCase();

      const safeStatus =
        statusFilter === "All Status" || isValidStatus(statusFilter)
          ? statusFilter
          : "All Status";

      return logs
        .filter(isValidLog) //  MOST IMPORTANT
        .filter((log) => {
          // empty search → allow all
          if (!safeSearch) return true;

          const source = log.source?.toLowerCase() || "";
          const message = log.message?.toLowerCase() || "";

          return source.includes(safeSearch) || message.includes(safeSearch);
        })
        .filter((log) => {
          const matchStatus =
            safeStatus === "All Status" || log.status === safeStatus;

          const matchDate =
            !selectedDate ||
            getLocalDateOnly(log.date, log.time) === selectedDate;

          return matchStatus && matchDate;
        });
    } catch (err) {
      console.error("Error filtering logs:", err);
      return [];
    }
  }, [logs, search, statusFilter, selectedDate]);

  const exportableLogs = useMemo(() => {
    if (!Array.isArray(filteredLogs)) return [];

    return filteredLogs.filter(isValidLog);
  }, [filteredLogs]);

  const exportLogs = useCallback(() => {
    try {
      setError(null);
      if (exportableLogs.length === 0) {
        alert("No valid logs to export");
        return;
      }
      setLoading(true);

      const blob = new Blob([JSON.stringify(exportableLogs, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `system-logs-${Date.now()}.json`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export logs:", err);
      setError("Failed to export logs. Please try again.");
      alert("Failed to export logs. See console for details.");
    } finally {
      setLoading(false);
    }
  }, [exportableLogs]);

  const stats = useMemo(() => {
    if (backendStats) return backendStats;
    const validLogs = logs.filter(isValidLog);
    const count = (s) => validLogs.filter((l) => l.status === s).length;
    return {
      Success: count("Success"),
      Warning: count("Warning"),
      Error: count("Error"),
      Info: count("Info"),
    };
  }, [logs, backendStats]);

  const clearAll = useCallback(() => setLogs([]), []);
  // TODO BACKEND: clear all logs ke liye axios call yaha lagega
  // const clearAll = async () => {
  //   try {
  //     // backend endpoint
  //     await axios.delete("/api/system-logs");
  //     setLogs([]);
  //   } catch (err) {
  //     console.error(err);
  //     alert("Failed to clear logs");
  //   }
  // };

  useEffect(() => {
    try {
      setNotifications((prev) => {
        const existingIds = prev.map((n) => n.id);

        const newAlerts = logs

          .filter(
            (l) =>
              isValidLog(l) &&
              (l.status === "Error" || l.status === "Warning") &&
              !existingIds.includes(l.date + l.time + l.source)
          )

          .map((l) => ({
            id: l.date + l.time + l.source,
            ...l,
            is_read: false,
          }));

        if (newAlerts.length > 0) {
          setToast(newAlerts[0]);
          setTimeout(() => setToast(null), 3000);
        }

        return [...newAlerts, ...prev];
      });
    } catch (err) {
      console.error("Error setting notifications:", err);
    }
  }, [logs]);
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const handleToggleNotifications = useCallback(() => {
    setOpenNotif((prev) => !prev);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, selectedDate]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredLogs.length / pageSize)),
    [filteredLogs.length, pageSize]
  );
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedLogs = useMemo(
    () => filteredLogs.slice(startIndex, endIndex),
    [filteredLogs, startIndex, endIndex]
  );

  const goToPage = useCallback(
    (page) => {
      const next = Math.min(Math.max(page, 1), totalPages);
      setCurrentPage(next);
    },
    [totalPages]
  );

  const getPageItems = useCallback((total, current) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, idx) => ({
        type: "page",
        value: idx + 1,
      }));
    }

    const items = [];
    const pushPage = (value) => items.push({ type: "page", value });
    const pushDots = (key) => items.push({ type: "dots", key });

    if (current <= 3) {
      pushPage(1);
      pushPage(2);
      pushPage(3);
      pushDots("end");
      pushPage(total);
      return items;
    }

    if (current >= total - 2) {
      pushPage(1);
      pushDots("start");
      pushPage(total - 2);
      pushPage(total - 1);
      pushPage(total);
      return items;
    }

    pushPage(1);
    pushDots("start");
    pushPage(current - 1);
    pushPage(current);
    pushPage(current + 1);
    pushDots("end");
    pushPage(total);
    return items;
  }, []);

  const pageItems = useMemo(
    () => getPageItems(totalPages, safePage),
    [getPageItems, totalPages, safePage]
  );

  return (
    <div className="w-full bg-white">
      {/* ================= HEADER ================= */}
      <header className="w-full bg-white px-4 md:px-8 py-6 flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">System Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor system activity and troubleshoot issues
            {/* System Temporarily Offline */}
          </p>
        </div>
        {/* <Bell className="text-gray-400 self-end sm:self-auto" /> */}
        <button onClick={handleToggleNotifications} className="relative">
          <Bell className="text-gray-600" />

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 text-xs flex items-center justify-center rounded-full bg-red-500 text-white font-bold animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      </header>
      {openNotif && (
        <div className="absolute right-6 top-20 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
          <div className="px-4 py-3 font-semibold text-gray-700 border-b">
            Notifications
          </div>

          {notifications.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No notifications</div>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`px-4 py-3 border-b last:border-none ${
                    !n.is_read ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium">{n.status}</div>
                      <div className="text-xs text-gray-500">
                        {n.source} • {n.date}
                      </div>
                      {/* <div className="text-sm text-gray-700 mt-1">
                        {n.message}
                      </div> */}

                      <div className="text-sm text-gray-700 mt-1">
                        {n.message || "No details available"}
                      </div>
                    </div>

                    {!n.is_read && (
                      <button
                        onClick={() =>
                          setNotifications((prev) =>
                            prev.map((x) =>
                              x.id === n.id ? { ...x, is_read: true } : x
                            )
                          )
                        }
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Mark
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ================= CONTENT ================= */}
      <main className="bg-[#f7fbfb] px-4 md:px-8 pb-8 pt-6 w-full">
        {loading && (
          <div className="mb-6 text-sm text-gray-500 flex items-center gap-2">
            <span className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-transparent rounded-full"></span>
            Loading system logs...
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {/* ================= STATS ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
          <StatCard
            icon={<CheckCircle className="text-green-500" />}
            value={stats.Success}
            label="Success"
            bg="bg-green-50"
          />
          <StatCard
            icon={<AlertTriangle className="text-yellow-500" />}
            value={stats.Warning}
            label="Warnings"
            bg="bg-yellow-50"
          />
          <StatCard
            icon={<XCircle className="text-red-500" />}
            value={stats.Error}
            label="Errors"
            bg="bg-red-50"
          />
          <StatCard
            icon={<Info className="text-blue-500" />}
            value={stats.Info}
            label="Info"
            bg="bg-blue-50"
          />
        </div>
        {/* ================= FILTER BAR ================= */}
        {/* <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5 mb-8"> */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-5">
            {/* SEARCH */}
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 w-full lg:w-[280px]">
              <Search size={18} className="text-gray-400" />
              <input
                placeholder="Search sources..."
                className="outline-none bg-transparent text-sm w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* STATUS FILTER */}
            <select
              // className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm w-full lg:w-[180px]"
              className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-sm w-full lg:w-[180px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>All Status</option>
              <option>Success</option>
              <option>Warning</option>
              <option>Error</option>
              <option>Info</option>
            </select>

            {/* DATE FILTER */}
            <div className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-5 py-3 text-sm w-full lg:w-auto">
              <Filter size={18} className="text-gray-500" />
              <input
                type="date"
                className="outline-none text-sm bg-transparent"
                value={selectedDate}
                onChange={(e) => {
                  console.log("DATE PICKED:", e.target.value);
                  setSelectedDate(e.target.value);
                }}
              />
            </div>

            {/* RIGHT ACTIONS */}
            <div className="flex flex-col sm:flex-row gap-4 lg:ml-auto w-full lg:w-auto">
              <button
                onClick={exportLogs}
                className="flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-lg px-5 py-3 text-sm shadow-sm hover:bg-gray-50 transition"
              >
                <Download size={18} />
                Export
              </button>

              <button
                onClick={clearAll}
                className="flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-lg px-5 py-3 text-sm text-red-600 shadow-sm hover:bg-red-50 transition"
              >
                <Trash2 size={18} />
                Clear All
              </button>
            </div>
          </div>
        </div>
        {/* ================= TABLE ================= */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-sm">
              {/* ===== TABLE HEADER (DESKTOP ONLY) ===== */}
              <thead className="hidden md:table-header-group bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-6 py-4 font-medium">Timestamp</th>
                  <th className="text-left px-7 py-4 font-medium">Source</th>
                  <th className="text-center px-10 py-4 font-medium">Status</th>
                  <th className="text-center px-20 py-4 font-medium">
                    Message
                  </th>
                </tr>
              </thead>

              {/* ===== TABLE BODY ===== */}
              <tbody>
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8">
                      <EmptyState
                        title="No logs found"
                        message="Try adjusting filters or check back later."
                      />
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log, i) => (
                    <tr
                      key={`${log.date}-${log.time}-${log.source}-${i}`}
                      className="
            border-t
            md:table-row
            flex flex-col md:flex-row
            px-4 py-3 md:p-0
            hover:bg-gray-50
            transition
          "
                    >
                      {/* TIMESTAMP */}
                      <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                        <span className="md:hidden font-semibold text-gray-600">
                          Timestamp:&nbsp;
                        </span>
                        <span>{log.date}</span>
                        <span className="ml-4">{log.time}</span>
                      </td>

                      {/* SOURCE */}
                      <td className="px-6 py-3 font-medium text-gray-800 text-left">
                        <span className="md:hidden font-semibold text-gray-600">
                          Source:&nbsp;
                        </span>
                        {log.source}
                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-3 text-center">
                        <span className="md:hidden font-semibold text-gray-600">
                          Status:&nbsp;
                        </span>
                        <StatusBadge status={log.status} />
                      </td>

                      {/* MESSAGE */}
                      <td className="px-6 py-3 text-gray-600 text-center">
                        <span className="md:hidden font-semibold text-gray-600">
                          Message:&nbsp;
                        </span>
                        {log.message || "—"}
                        {log.source || "Unknown"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* ===== PAGINATION ===== */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4">
          <div className="text-sm text-gray-500 font-medium">
            Showing {filteredLogs.length === 0 ? 0 : startIndex + 1}-
            {Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length}{" "}
            results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage === 1}
              className="px-3 py-1.5 text-sm shadow-sm rounded border border-gray-200 bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <div className="flex items-center gap-1">
              {pageItems.map((item) => {
                if (item.type === "dots") {
                  return (
                    <span
                      key={item.key}
                      className="w-8 h-8 text-xs text-gray-500 flex items-center justify-center"
                    >
                      ...
                    </span>
                  );
                }

                const page = item.value;
                return (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`w-8 h-8 text-xs rounded border ${
                      page === safePage
                        ? "bg-indigo-600 text-white border-gray-900"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage === totalPages}
              className="px-3 py-1.5 text-sm shadow-sm rounded border border-gray-200 bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
        {/* ===== FOOTER TEXT ===== */}
        {/* <div className="px-2 py-4 text-sm text-gray-500 font-medium">
          Showing {filteredLogs.length} of {logs.length} logs
        </div> */}
      </main>
      {toast && (
        <div className="fixed bottom-6 right-6 bg-white border shadow-lg rounded-lg px-4 py-3 flex gap-3 items-start z-50">
          <div>
            <div className="font-semibold text-sm">{toast.status}</div>
            <div className="text-xs text-gray-600">{toast.message}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= SUB COMPONENTS ================= */

function StatCard({ icon, value, label, bg }) {
  return (
    <div className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm border border-gray-100">
      <div className={`p-3 rounded ${bg}`}>{icon}</div>
      <div>
        <div className="text-lg font-semibold text-gray-800">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    Success: "bg-green-100 text-green-600",
    Warning: "bg-yellow-100 text-yellow-600",
    Error: "bg-red-100 text-red-600",
    Info: "bg-blue-100 text-blue-600",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${map[status]}`}
    >
      {status === "Success" && <CheckCircle size={14} />}
      {status === "Warning" && <AlertTriangle size={14} />}
      {status === "Error" && <XCircle size={14} />}
      {status === "Info" && <Info size={14} />}
      {status}
    </span>
  );
}
