"use client";

import { useState, useEffect, useRef, KeyboardEvent, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { Loader2, MessageSquare, Send, Pencil, Trash2, X, Check } from "lucide-react";

type CommentUser = { id: string; name: string; email: string };

export type Comment = {
  id: string;
  content: string;
  created_at: string;
  user: CommentUser;
};

interface TaskCommentsProps {
  taskId: string;
  members: { id: string; name: string }[];
  currentUserId: string;
  currentUserRole: string;
  onCommentsChanged: () => void;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

const renderContentWithMentions = (content: string, members: {id: string; name: string}[]) => {
  if (!content) return null;
  if (members.length === 0) return content;
  
  const sortedMembers = [...members].sort((a, b) => b.name.length - a.name.length);
  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  const pattern = new RegExp(`(@(?:${sortedMembers.map(m => escapeRegExp(m.name)).join('|')}))`, 'g');
  const parts = content.split(pattern);
  
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const nameWithoutAt = part.substring(1);
      if (members.some(m => m.name === nameWithoutAt)) {
        return <strong key={i} className="font-semibold text-blue-600 bg-blue-50 px-1 py-0.5 rounded">{part}</strong>;
      }
    }
    return <span key={i}>{part}</span>;
  });
};

export function TaskComments({ taskId, members, currentUserId, currentUserRole, onCommentsChanged }: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchComments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiFetch(`/api/tasks/${taskId}/comments`);
      const body = await res.json();
      if (body.success) {
        setComments(body.data);
      }
    } catch (err) {
      console.error("Failed to fetch comments", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Real-time polling every 3s
  useEffect(() => {
    pollTimerRef.current = setInterval(() => {
      fetchComments(true);
    }, 3000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchComments]);

  const autoResize = () => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    autoResize();

    // Mention logic
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9\s]*)$/);

    if (match) {
      setMentionQuery(match[1]);
      setShowMentions(true);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const insertMention = (memberName: string) => {
    if (!inputRef.current) return;
    const cursor = inputRef.current.selectionStart;
    const textBeforeCursor = content.slice(0, cursor);
    const textAfterCursor = content.slice(cursor);
    
    const replaceStart = textBeforeCursor.lastIndexOf("@");
    const newTextBefore = textBeforeCursor.slice(0, replaceStart) + `@${memberName} `;
    
    setContent(newTextBefore + textAfterCursor);
    setShowMentions(false);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.selectionStart = newTextBefore.length;
        inputRef.current.selectionEnd = newTextBefore.length;
      }
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % filteredMembers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMembers[mentionIndex].name);
        return;
      }
      if (e.key === "Escape") {
        setShowMentions(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;

    const tmpId = `tmp-${Date.now()}`;
    const newComment: Comment = {
      id: tmpId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      user: { id: currentUserId, name: "Thao tác...", email: "" }, 
    };

    setComments((prev) => [...prev, newComment]);
    setContent("");
    setShowMentions(false);
    setError("");
    setSubmitting(true);
    
    if (inputRef.current) inputRef.current.style.height = "auto";

    try {
      const res = await apiFetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.content }),
      });
      const body = await res.json();

      if (body.success) {
        setComments((prev) => prev.map(c => c.id === tmpId ? body.data : c));
        onCommentsChanged();
      } else {
        setComments((prev) => prev.filter(c => c.id !== tmpId));
        setError(body.error || "Có lỗi xảy ra. Thử lại?");
        setContent(newComment.content);
      }
    } catch {
      setComments((prev) => prev.filter(c => c.id !== tmpId));
      setError("Có lỗi xảy ra. Thử lại?");
      setContent(newComment.content);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (c: Comment) => {
    setEditingId(c.id);
    setEditContent(c.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return;
    setActionLoadingId(id);
    try {
      const res = await apiFetch(`/api/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      const body = await res.json();
      if (body.success) {
        setComments((prev) => prev.map((c) => (c.id === id ? body.data : c)));
        setEditingId(null);
        onCommentsChanged();
      } else {
        alert(body.error || "Không thể cập nhật bình luận");
      }
    } catch {
      alert("Lỗi kết nối server");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa bình luận này?")) return;
    setActionLoadingId(id);
    try {
      const res = await apiFetch(`/api/comments/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (body.success) {
        setComments((prev) => prev.filter((c) => c.id !== id));
        onCommentsChanged();
      } else {
        alert(body.error || "Không thể xóa bình luận");
      }
    } catch {
      alert("Lỗi kết nối server");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return <div className="py-4 text-center text-xs text-zinc-500">Đang tải bình luận...</div>;
  }

  return (
    <div className="pt-5 border-t border-zinc-100">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5" /> Bình luận
      </h3>

      {comments.length === 0 ? (
        <p className="text-sm text-zinc-500 italic mb-6">Chưa có comment nào. Hãy bắt đầu thảo luận.</p>
      ) : (
        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-200 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                {getInitials(comment.user.name)}
              </div>
              <div className="flex-1 min-w-0 bg-zinc-50 p-3 rounded-xl rounded-tl-none border border-zinc-100 group relative">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900">{comment.user.name}</span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(comment.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}{" "}
                      {new Date(comment.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>

                  {(comment.user.id === currentUserId || currentUserRole === "Admin" || currentUserRole === "Manager") && !editingId && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {comment.user.id === currentUserId && (
                        <button
                          onClick={() => startEdit(comment)}
                          className="p-1 hover:bg-zinc-200 rounded text-zinc-500 hover:text-zinc-900"
                          title="Sửa"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="p-1 hover:bg-red-100 rounded text-zinc-500 hover:text-red-600"
                        title="Xóa"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full text-sm bg-white border border-zinc-200 rounded-lg p-2 outline-none focus:border-zinc-400 resize-none min-h-[60px]"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={cancelEdit}
                        className="px-2 py-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1"
                        disabled={actionLoadingId === comment.id}
                      >
                        <X className="w-3 h-3" /> Hủy
                      </button>
                      <button
                        onClick={() => handleUpdate(comment.id)}
                        className="px-2 py-1 text-xs font-medium bg-zinc-900 text-white rounded hover:bg-zinc-800 flex items-center gap-1 disabled:opacity-50"
                        disabled={!editContent.trim() || actionLoadingId === comment.id}
                      >
                        {actionLoadingId === comment.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        Lưu
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                    {renderContentWithMentions(comment.content, members)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <div className={`flex items-start gap-3 bg-white border rounded-xl p-2 transition-colors focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-100 ${error ? "border-red-300" : "border-zinc-300"}`}>
          <textarea
            ref={inputRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            disabled={submitting}
            placeholder="Viết bình luận (@ để nhắc tên)..."
            className="flex-1 bg-transparent min-h-[40px] max-h-[120px] text-sm resize-none outline-none py-1.5 px-1 placeholder:text-zinc-400 text-zinc-900 disabled:opacity-50"
            rows={1}
          />
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            className="p-2 text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900 transition-colors shrink-0 mt-0.5"
            aria-label="Gửi bình luận"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-2 w-64 max-h-48 overflow-y-auto bg-white border border-zinc-200 shadow-xl rounded-xl z-10 py-1">
            {filteredMembers.map((m, i) => (
              <button
                key={m.id}
                onClick={() => insertMention(m.name)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                  i === mentionIndex ? "bg-zinc-100" : "hover:bg-zinc-50"
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[8px] font-bold shrink-0">
                  {getInitials(m.name)}
                </div>
                <span className="truncate">{m.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
