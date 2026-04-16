"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLoadingDelay } from "@/hooks/useLoadingDelay";
import { Search, Loader2, FileText, CheckCircle2 } from "lucide-react";

import { useRouter } from "next/navigation";
import { Task } from "@prisma/client";

// DTO from API
type TaskResult = {
  id: string;
  title: string;
  project_id: string;
  status: "ToDo" | "InProgress" | "InReview" | "Done";
  assignee_id: string | null;
  due_date: string | null;
  project: {
    name: string;
    color: string;
  };
  assignee: {
    name: string;
  } | null;
};

export const GlobalSearch = () => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<TaskResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const showLoader = useLoadingDelay(isSearching);

  
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch results
  useEffect(() => {
    async function fetchResults() {
      if (!debouncedQuery.trim()) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      if (!navigator.onLine) {
        setError("Bạn đang offline. Không thể tìm kiếm.");
        setResults([]);
        return;
      }

      setIsSearching(true);
      setError(null);
      
      try {
        const res = await fetch(`/api/search/tasks?q=${encodeURIComponent(debouncedQuery)}`);
        
        if (!res.ok) {
          throw new Error("Lỗi máy chủ");
        }
        
        const json = await res.json();
        if (json.success) {
          setResults(json.data);
          setSelectedIndex(-1); // reset selection
        } else {
          setError(json.error || "Có lỗi xảy ra. Thử lại?");
        }
      } catch (err: any) {
        setError("Có lỗi xảy ra. Thử lại?");
      } finally {
        setIsSearching(false);
      }
    }

    fetchResults();
  }, [debouncedQuery]);

  const handleSelect = useCallback((taskId: string) => {
    setIsOpen(false);
    setQuery("");
    setDebouncedQuery("");
    // Push taskId into query parameters to open slide-over panel
    // Based on PRD UX pattern for task details
    router.push(`/app/tasks/${taskId}`);
  }, [router]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelect(results[selectedIndex].id);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "Done") return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
    return <FileText className="w-4 h-4 text-zinc-400 shrink-0" />;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  return (
    <div className="relative w-full max-w-md" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-2.5 top-2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Tìm kiếm task..."
          className="w-full bg-zinc-100 border-transparent focus:bg-white focus:border-zinc-300 focus:ring-2 focus:ring-indigo-500/20 text-sm h-8 pl-8 pr-8 rounded-md transition-all outline-none"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length > 0) setIsOpen(true);
          }}
        />
        {showLoader && (
          <Loader2 className="absolute right-2.5 top-2 h-4 w-4 text-zinc-400 animate-spin" />
        )}

      </div>

      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-11 left-0 right-0 bg-white border border-zinc-200 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top">
          <div className="max-h-[400px] overflow-y-auto w-full py-1.5 px-1.5">
            {error && (
              <div className="px-4 py-3 text-sm text-red-500 text-center">
                {error}
              </div>
            )}
            
            {!error && !isSearching && results.length === 0 && (
              <div className="px-4 py-6 text-sm text-zinc-500 text-center">
                Không tìm thấy task
              </div>
            )}

            {!error && results.length > 0 && results.map((result, index) => (
              <div
                key={result.id}
                role="button"
                tabIndex={0}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-b border-zinc-50 last:border-0 ${
                  selectedIndex === index 
                    ? "bg-zinc-50 border-l-2 border-l-indigo-500 pl-[14px]" 
                    : "hover:bg-zinc-50/80 pl-4 border-l-2 border-l-transparent"
                }`}
                onClick={() => handleSelect(result.id)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="shrink-0">
                  {getStatusIcon(result.status)}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-tight mb-0.5">
                    {result.project.name}
                  </span>
                  <span className="text-sm font-medium text-zinc-900 truncate">
                    {result.title}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      result.status === "Done" ? "bg-emerald-100 text-emerald-700" :
                      result.status === "InProgress" ? "bg-blue-100 text-blue-700" :
                      result.status === "InReview" ? "bg-amber-100 text-amber-700" :
                      "bg-zinc-100 text-zinc-600"
                    }`}>
                      {result.status}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  {result.assignee && (
                    <span className="text-[10px] font-medium text-zinc-500 truncate max-w-[80px]">
                      {result.assignee.name}
                    </span>
                  )}
                  {result.due_date && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      new Date(result.due_date) < new Date() ? "bg-red-50 text-red-600" : "text-zinc-400 bg-zinc-50 border border-zinc-100"
                    }`}>
                      {formatDate(result.due_date)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
