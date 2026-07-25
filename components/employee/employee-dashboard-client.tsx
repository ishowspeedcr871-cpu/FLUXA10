"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import {
  Search,
  Printer,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Zap,
  Filter,
  RefreshCw,
  Loader2,
  Eye,
  X,
  User,
  DollarSign,
  Building2,
  Layers,
  Copy,
  ChevronRight,
  ShieldCheck,
  Ban,
} from "lucide-react";
import {
  fetchLiveQueue,
  submitOtpAction,
  updateJobStatusAction,
  updateJobPriorityAction,
  cancelJobAction,
  verifyOtpForReviewAction,
  releaseJobWithUpdatedSettingsAction,
} from "@/app/employee/actions";
import { EmployeePrintReviewModal } from "@/components/employee/employee-print-review-modal";

interface Job {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  copies: number;
  color: boolean;
  duplex: boolean;
  pageCount?: number;
  estimatedCost?: number | string;
  createdAt: string;
  readyAt?: string;
  customerUser?: {
    id: string;
    name?: string;
    email: string;
  };
  organization?: {
    name: string;
  };
  printer?: {
    id: string;
    name: string;
    status: string;
  };
  otpCode?: string;
  files?: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    pageCount?: number;
  }>;
  metadata?: any;
}

export function EmployeeDashboardClient({
  initialJobs,
  initialPrinters = [],
}: {
  initialJobs: any[];
  initialPrinters?: any[];
}) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs || []);
  const [printers, setPrinters] = useState<any[]>(initialPrinters || []);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Review & Edit Modal State
  const [reviewJob, setReviewJob] = useState<Job | null>(null);
  const [releasing, setReleasing] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Auto polling every 3 seconds for real-time print queue status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const liveJobs = await fetchLiveQueue({
          status: statusFilter === "ALL" ? "all" : statusFilter,
          priority: priorityFilter === "ALL" ? "all" : priorityFilter,
          q: searchQuery,
        });
        setJobs(liveJobs);
      } catch (err) {
        // Silently catch background errors during polling
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [statusFilter, priorityFilter, searchQuery]);

  // Refresh queue manually
  const handleManualRefresh = async () => {
    startTransition(async () => {
      try {
        const liveJobs = await fetchLiveQueue({
          status: statusFilter === "ALL" ? "all" : statusFilter,
          priority: priorityFilter === "ALL" ? "all" : priorityFilter,
          q: searchQuery,
        });
        setJobs(liveJobs);
      } catch (err) {
        // Handle gracefully
      }
    });
  };

  const handleOtpChange = (index: number, value: string) => {
    setError(null);
    setSuccess(null);
    const cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length > 1) {
      const chars = cleanValue.slice(-4).split("");
      const newOtp = ["", "", "", ""];
      chars.forEach((c, idx) => {
        newOtp[idx] = c;
      });
      setOtp(newOtp);
      const lastInput = document.getElementById(`otp-3`);
      lastInput?.focus();

      const fullCode = newOtp.join("");
      if (fullCode.length === 4) {
        handleReleaseByOtp(fullCode);
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanValue;
    setOtp(newOtp);

    const fullCode = newOtp.join("");
    if (fullCode.length === 4) {
      handleReleaseByOtp(fullCode);
    } else if (cleanValue && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    } else if (!cleanValue && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleReleaseByOtp = async (codeToSubmit?: string) => {
    const code = codeToSubmit || otp.join("");
    if (code.length !== 4) {
      setError("Please enter a valid 4-digit OTP code");
      return;
    }

    setVerifying(true);
    setError(null);
    setSuccess(null);

    const res = await verifyOtpForReviewAction(code);
    setVerifying(false);

    if (res.success && res.job) {
      setOtp(["", "", "", ""]);
      setReviewJob(res.job);
      setSuccess("OTP Verified! Opening Print Review & Edit screen.");
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(res.error || "Verification failed");
    }
  };

  const handleConfirmReviewRelease = async (
    updatedSettings: any,
    newCost: number,
    reason: string,
  ) => {
    if (!reviewJob) return;
    setReleasing(true);
    const res = await releaseJobWithUpdatedSettingsAction(
      reviewJob.id,
      updatedSettings,
      newCost,
      reason,
    );
    setReleasing(false);

    if (res.success) {
      setReviewJob(null);
      setSuccess(res.message || "Print Job approved and sent to printer!");
      const liveJobs = await fetchLiveQueue();
      setJobs(liveJobs);
      setTimeout(() => setSuccess(null), 5000);
    } else {
      setError(res.error || "Failed to release job");
    }
  };

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    const res = await updateJobStatusAction(jobId, newStatus);
    if (res.success) {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j)));
    }
  };

  const handlePriorityChange = async (jobId: string, newPriority: string) => {
    const res = await updateJobPriorityAction(jobId, newPriority);
    if (res.success) {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, priority: newPriority } : j)));
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to cancel this print job?")) return;
    const res = await cancelJobAction(jobId);
    if (res.success) {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "CANCELLED" } : j)));
    }
  };

  // Metrics summary
  const metrics = useMemo(() => {
    const total = jobs.length;
    const pending = jobs.filter((j) =>
      ["QUEUED", "OTP_GENERATED", "DRAFT", "READY"].includes(j.status),
    ).length;
    const printing = jobs.filter((j) =>
      ["PRINTING", "OTP_VERIFIED", "WAITING_FOR_PRINTER"].includes(j.status),
    ).length;
    const completed = jobs.filter((j) =>
      ["COMPLETED", "PRINT_COMPLETED", "RELEASED"].includes(j.status),
    ).length;
    const failed = jobs.filter((j) => ["FAILED", "CANCELLED", "ERROR"].includes(j.status)).length;
    const urgent = jobs.filter((j) => j.priority === "URGENT" || j.priority === "HIGH").length;

    return { total, pending, printing, completed, failed, urgent };
  }, [jobs]);

  // Filtered jobs list
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Status filter
      if (
        statusFilter === "PENDING" &&
        !["QUEUED", "OTP_GENERATED", "DRAFT", "READY"].includes(job.status)
      )
        return false;
      if (
        statusFilter === "PRINTING" &&
        !["PRINTING", "OTP_VERIFIED", "WAITING_FOR_PRINTER"].includes(job.status)
      )
        return false;
      if (
        statusFilter === "COMPLETED" &&
        !["COMPLETED", "PRINT_COMPLETED", "RELEASED"].includes(job.status)
      )
        return false;
      if (statusFilter === "FAILED" && !["FAILED", "CANCELLED", "ERROR"].includes(job.status))
        return false;

      // Priority filter
      if (priorityFilter !== "ALL" && job.priority !== priorityFilter) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const displayOtp = job.otpCode || "";
        const titleMatch = job.title.toLowerCase().includes(q);
        const idMatch = job.id.toLowerCase().includes(q);
        const otpMatch = String(displayOtp).includes(q);
        const customerMatch = (job.customerUser?.name || job.customerUser?.email || "")
          .toLowerCase()
          .includes(q);
        const fileMatch = job.files?.some((f) => f.fileName.toLowerCase().includes(q));

        if (!titleMatch && !idMatch && !otpMatch && !customerMatch && !fileMatch) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, statusFilter, priorityFilter, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "PRINT_COMPLETED":
      case "RELEASED":
        return {
          label: "COMPLETED",
          style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          icon: CheckCircle2,
        };
      case "PRINTING":
        return {
          label: "PRINTING",
          style: "bg-cyan-500/10 text-cyan-400 border-cyan-500/40 animate-pulse",
          icon: RefreshCw,
        };
      case "OTP_VERIFIED":
        return {
          label: "VERIFIED",
          style: "bg-cyan-400/20 text-cyan-300 border-cyan-400/50 font-black",
          icon: ShieldCheck,
        };
      case "WAITING_FOR_PRINTER":
        return {
          label: "WAITING PRINTER",
          style: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          icon: Clock,
        };
      case "QUEUED":
      case "OTP_GENERATED":
      case "READY":
        return {
          label: "PENDING",
          style: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
          icon: Clock,
        };
      case "FAILED":
      case "CANCELLED":
      case "ERROR":
        return {
          label: "CANCELLED / FAILED",
          style: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          icon: XCircle,
        };
      default:
        return {
          label: status,
          style: "bg-white/5 text-slate-400 border-white/10",
          icon: FileText,
        };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-rose-500/20 text-rose-400 border-rose-500/40 font-black animate-pulse";
      case "HIGH":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30 font-bold";
      case "NORMAL":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      default:
        return "bg-white/5 text-slate-400 border-white/10";
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP TOOLBAR & QUICK METRICS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-[#0b0b12] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Total Queue
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-white">{metrics.total}</span>
            <Layers className="size-4 text-slate-500" />
          </div>
        </div>

        <div className="bg-[#0b0b12] border border-yellow-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
            Pending OTP
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-yellow-400">{metrics.pending}</span>
            <Clock className="size-4 text-yellow-400/60" />
          </div>
        </div>

        <div className="bg-[#0b0b12] border border-cyan-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
            In Production
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-cyan-400">{metrics.printing}</span>
            <Printer className="size-4 text-cyan-400/60" />
          </div>
        </div>

        <div className="bg-[#0b0b12] border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
            Completed
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-400">{metrics.completed}</span>
            <CheckCircle2 className="size-4 text-emerald-400/60" />
          </div>
        </div>

        <div className="bg-[#0b0b12] border border-rose-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
            Urgent / High
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-rose-400">{metrics.urgent}</span>
            <Zap className="size-4 text-rose-400/60" />
          </div>
        </div>

        <div className="bg-[#0b0b12] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Alerts / Failed
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-300">{metrics.failed}</span>
            <AlertTriangle className="size-4 text-slate-500" />
          </div>
        </div>
      </div>

      {/* 2. OTP QUICK RELEASE PANEL */}
      <div className="border border-cyan-500/30 rounded-2xl bg-gradient-to-r from-[#0a0a14] via-[#0b0d1a] to-[#080810] p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(0,255,255,0.15)]">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                Customer OTP Quick Release
                <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded-full font-bold">
                  Instant Verification
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ask customer for their 4-digit Pickup OTP to unlock & start printing immediately.
              </p>
            </div>
          </div>

          {/* OTP Digit Form */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="flex gap-2 justify-center">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !digit && i > 0) {
                      const prevInput = document.getElementById(`otp-${i - 1}`);
                      prevInput?.focus();
                    }
                  }}
                  className="w-10 h-12 rounded-xl bg-white/5 border border-white/20 text-center text-xl font-black text-cyan-400 focus:border-cyan-400 focus:bg-cyan-500/10 focus:outline-none transition-all duration-200 shadow-inner"
                  placeholder="•"
                />
              ))}
            </div>

            <button
              onClick={() => handleReleaseByOtp()}
              disabled={verifying}
              className="w-full sm:w-auto h-12 px-6 bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(0,255,255,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              {verifying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Printer className="size-4" />
              )}
              {verifying ? "Verifying..." : "RELEASE JOB"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <XCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mt-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-extrabold tracking-wider uppercase flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
            <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
            {success}
          </div>
        )}
      </div>

      {/* 3. SEARCH & CONTROLS BAR */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#08080d] border border-white/10 rounded-2xl p-4">
        {/* Search Bar */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by OTP (e.g. 8921), Job ID, Customer, File..."
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filters and View Switcher */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Status Filter */}
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 text-[11px] font-bold">
            {["ALL", "PENDING", "PRINTING", "COMPLETED", "FAILED"].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === tab
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 focus:outline-none focus:border-cyan-400/50 cursor-pointer"
          >
            <option value="ALL" className="bg-[#0b0b12] text-white">
              All Priorities
            </option>
            <option value="URGENT" className="bg-[#0b0b12] text-rose-400">
              Urgent Only
            </option>
            <option value="HIGH" className="bg-[#0b0b12] text-amber-400">
              High Only
            </option>
            <option value="NORMAL" className="bg-[#0b0b12] text-cyan-400">
              Normal Only
            </option>
            <option value="LOW" className="bg-[#0b0b12] text-slate-400">
              Low Only
            </option>
          </select>

          {/* Manual Refresh */}
          <button
            onClick={handleManualRefresh}
            disabled={isPending}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition-all cursor-pointer"
            title="Refresh Queue"
          >
            <RefreshCw className={`size-4 ${isPending ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* 4. MAIN PRINT QUEUE DISPLAY */}
      {filteredJobs.length === 0 ? (
        <div className="border border-white/10 rounded-2xl bg-[#08080d] py-16 text-center space-y-3">
          <Printer className="size-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            No matching print jobs in queue
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query or status filter. Real-time background sync is active.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => {
            const displayOtp = job.otpCode || job.id.slice(-4).toUpperCase();
            const statusBadge = getStatusBadge(job.status);
            const StatusIcon = statusBadge.icon;
            const priorityStyle = getPriorityBadge(job.priority);
            const isCompleted = ["COMPLETED", "PRINT_COMPLETED", "RELEASED"].includes(job.status);
            const isCancelled = ["CANCELLED", "FAILED"].includes(job.status);

            return (
              <div
                key={job.id}
                className="bg-[#0a0a10] border border-white/10 hover:border-cyan-500/40 rounded-2xl p-5 space-y-4 transition-all duration-200 hover:shadow-xl hover:shadow-cyan-500/5 relative group flex flex-col justify-between"
              >
                {/* Top Row: OTP Badge & Status */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    {/* Customer OTP Box (Large and Bold) */}
                    <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/40 rounded-xl px-3.5 py-1.5 flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
                      <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest">
                        OTP:
                      </span>
                      <span className="text-xl font-black text-white tracking-widest font-mono">
                        {displayOtp}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider border flex items-center gap-1.5 ${statusBadge.style}`}
                    >
                      <StatusIcon className="size-3" />
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Title & Customer Name */}
                  <div>
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <User className="size-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">
                        {job.customerUser?.name || job.customerUser?.email || "Guest Customer"}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        #{job.id.slice(-4).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Print Technical Specifications Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-white/5 border border-white/5 rounded-xl p-3 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">
                        File / Specs
                      </span>
                      <span className="text-slate-300 font-medium truncate block mt-0.5">
                        {job.files?.[0]?.fileName || "Document.pdf"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">
                        Pages & Copies
                      </span>
                      <span className="text-cyan-400 font-bold block mt-0.5">
                        {job.pageCount || 1} pgs × {job.copies} {job.copies > 1 ? "copies" : "copy"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">
                        Format & Color
                      </span>
                      <span className="text-slate-300 font-medium block mt-0.5">
                        {job.color ? "Full Color" : "B&W"} • {job.duplex ? "Duplex" : "Simplex"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">
                        Cost / Payment
                      </span>
                      <span className="text-emerald-400 font-bold block mt-0.5">
                        ₹{Number(job.estimatedCost || 0).toFixed(2)} • PAID
                      </span>
                    </div>
                  </div>

                  {/* Assigned Printer & Timestamps */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Printer className="size-3.5 text-cyan-400" />
                      <span className="font-semibold text-slate-300">
                        {job.printer?.name || "Auto-Assign Printer"}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(job.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {!isCompleted && !isCancelled && (
                      <button
                        onClick={() => setReviewJob(job)}
                        className="px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-[10px] tracking-wider uppercase rounded-lg transition-all cursor-pointer shadow-[0_0_10px_rgba(0,255,255,0.2)] flex items-center gap-1"
                      >
                        <ShieldCheck className="size-3" />
                        <span>Review & Print</span>
                      </button>
                    )}

                    {job.status === "PRINTING" && (
                      <button
                        onClick={() => handleStatusChange(job.id, "COMPLETED")}
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-[10px] tracking-wider uppercase rounded-lg transition-all cursor-pointer"
                      >
                        Complete
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider border ${priorityStyle}`}
                    >
                      {job.priority}
                    </span>

                    <button
                      onClick={() => setSelectedJob(job)}
                      className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-all cursor-pointer"
                      title="Inspect Details"
                    >
                      <Eye className="size-3.5" />
                    </button>

                    {!isCompleted && !isCancelled && (
                      <button
                        onClick={() => handleCancelJob(job.id)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all cursor-pointer"
                        title="Cancel Job"
                      >
                        <Ban className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. JOB DETAILS INSPECTION MODAL */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c0c14] border border-white/20 rounded-3xl max-w-lg w-full p-6 space-y-6 relative shadow-2xl">
            <button
              onClick={() => setSelectedJob(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full bg-white/5"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <FileText className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{selectedJob.title}</h2>
                <p className="text-xs text-slate-400 font-mono">Job ID: {selectedJob.id}</p>
              </div>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 text-center">
              <span className="text-xs text-cyan-300 font-bold uppercase tracking-wider block">
                Customer Verification OTP
              </span>
              <span className="text-3xl font-black text-white font-mono tracking-widest mt-1 block">
                {selectedJob.otpCode || selectedJob.id.slice(-4).toUpperCase()}
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-white">
                  {selectedJob.customerUser?.name || selectedJob.customerUser?.email}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">File Name:</span>
                <span className="font-bold text-cyan-300">
                  {selectedJob.files?.[0]?.fileName || "Document.pdf"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Pages / Copies:</span>
                <span className="font-bold text-white">
                  {selectedJob.pageCount || 1} pages × {selectedJob.copies} copies
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Print Mode:</span>
                <span className="font-bold text-white">
                  {selectedJob.color ? "Full Color" : "B&W"} •{" "}
                  {selectedJob.duplex ? "Duplex" : "Simplex"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Estimated Cost:</span>
                <span className="font-bold text-emerald-400">
                  ₹{Number(selectedJob.estimatedCost || 0).toFixed(2)} (PAID)
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Current Status:</span>
                <span className="font-bold text-cyan-400">{selectedJob.status}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setReviewJob(selectedJob);
                  setSelectedJob(null);
                }}
                className="flex-1 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all cursor-pointer"
              >
                Open Print Review & Edit Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. EMPLOYEE PRINT REVIEW & EDIT MODAL */}
      {reviewJob && (
        <EmployeePrintReviewModal
          job={reviewJob}
          printers={printers}
          onClose={() => setReviewJob(null)}
          onConfirmRelease={handleConfirmReviewRelease}
          isReleasing={releasing}
        />
      )}
    </div>
  );
}
