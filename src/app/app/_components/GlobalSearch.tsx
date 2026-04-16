"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLoadingDelay } from "@/hooks/useLoadingDelay";
import { Search, Loader2, FileText, CheckCircle2, Command } from "lucide-react";

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
    if (status === "Done") return <CheckCircle2 className="w-4 h-4 text-[var(--tf-success)] shrink-0" />;
    return <FileText className="w-4 h-4 text-[var(--tf-text-muted)] shrink-0" />;
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
    <div className="relative w-full max-w-xl" ref={containerRef}>
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--tf-text-muted)] group-focus-within:text-[var(--tf-accent)] transition-colors" />
        <input
          type="text"
          placeholder="Tìm kiếm mọi thứ..."
          className="w-full bg-[var(--tf-bg-subtle)] border border-transparent focus:bg-[var(--tf-bg-card)] focus:border-[var(--tf-accent-muted)] focus:shadow-[0_0_0_4px_var(--tf-accent-subtle)] text-sm h-9 pl-9 pr-14 rounded-full transition-all outline-none font-medium placeholder:text-[var(--tf-text-muted)]"
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
        
        {/* Command shortcut visual (inactive for now) */}
        {!query && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1">
            <span className="text-[10px] font-bold text-[var(--tf-text-muted)] bg-white border border-[var(--tf-border)] px-1.5 py-0.5 rounded shadow-sm opacity-60">⌘K</span>
          </div>
        )}

        {showLoader && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--tf-text-muted)] animate-spin" />
        )}

      </div>

      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-12 left-0 right-0 bg-[var(--tf-bg-card)] border border-[var(--tf-border)] rounded-2xl overflow-hidden z-[50000] tf-animate-in shadow-xl">
          <div className="max-h-[400px] overflow-y-auto w-full p-2">
            {error && (
              <div className="px-4 py-3 text-sm text-[var(--tf-error)] text-center">
                {error}
              </div>
            )}
            
            {!error && !isSearching && results.length === 0 && (
              <div className="px-4 py-8 text-sm text-[var(--tf-text-muted)] text-center flex flex-col items-center">
                <Search className="w-8 h-8 mb-3 opacity-20" />
                Không tìm thấy kết quả nào cho "{query}"
              </div>
            )}

            {!error && results.length > 0 && results.map((result, index) => (
              <div
                key={result.id}
                role="button"
                tabIndex={0}
                className={`flex items-start gap-3 p-3 cursor-pointer rounded-xl transition-all ${
                  selectedIndex === index 
                    ? "bg-[var(--tf-bg-subtle)]" 
                    : "hover:bg-[var(--tf-bg-subtle)]"
                }`}
                onClick={() => handleSelect(result.id)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="mt-0.5 w-6 h-6 rounded-md bg-white border border-[var(--tf-border)] flex items-center justify-center shrink-0 shadow-sm">
                  {getStatusIcon(result.status)}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: result.project.color }} />
                    <span className="text-[10px] font-bold text-[var(--tf-text-sub)] uppercase tracking-widest line-clamp-1">
                      {result.project.name}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-[var(--tf-text)] leading-snug line-clamp-2">
                    {result.title}
                  </span>
                  
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5 pl-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    result.status === "Done" ? "bg-[var(--tf-success-muted)] text-[var(--tf-success)]" :
                    result.status === "InProgress" ? "bg-[var(--tf-status-inprogress)]/10 text-[var(--tf-status-inprogress)]" :
                    result.status === "InReview" ? "bg-[var(--tf-status-inreview)]/10 text-[var(--tf-status-inreview)]" :
                    "bg-[var(--tf-bg-subtle)] text-[var(--tf-text-sub)]"
                  }`}>
                    {result.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

