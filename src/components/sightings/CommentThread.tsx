"use client";

import { useState, useEffect } from "react";
import type { Comment } from "@/domain/comments/comment";

interface CommentItemProps {
  comment: Comment;
  userId?: string;
  onReply: (parentId: string) => void;
  onVote: (commentId: string, voteType: "upvote" | "downvote") => void;
  depth?: number;
}

function CommentItem({
  comment,
  userId,
  onReply,
  onVote,
  depth = 0,
}: CommentItemProps) {
  const [userVote, setUserVote] = useState<"upvote" | "downvote" | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Update "now" every minute for relative time display
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const formatRelativeTime = (iso: string) => {
    const date = new Date(iso);
    const diffMs = now - date.getTime();
    const diffMinutes = Math.round(diffMs / 60000);
    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handleVote = (type: "upvote" | "downvote") => {
    if (!userId) return;

    if (userVote === type) {
      // Remove vote
      setUserVote(null);
    } else {
      // Add or change vote
      setUserVote(type);
      onVote(comment.id, type);
    }
  };

  return (
    <div
      className="flex gap-2"
      style={{ marginLeft: depth > 0 ? `${depth * 1.5}rem` : 0 }}
    >
      {/* Voting */}
      <div className="flex flex-col items-center gap-0.5 pt-1">
        <button
          onClick={() => handleVote("upvote")}
          disabled={!userId}
          className={`rounded p-0.5 transition ${
            userVote === "upvote"
              ? "text-[color:var(--accent-primary)]"
              : "text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]"
          } disabled:opacity-30`}
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 4l-8 8h5v8h6v-8h5z" />
          </svg>
        </button>
        <span
          className={`text-xs font-medium ${
            comment.score > 0
              ? "text-[color:var(--accent-primary)]"
              : comment.score < 0
                ? "text-[color:var(--accent-danger)]"
                : "text-[color:var(--text-secondary)]"
          }`}
        >
          {comment.score}
        </span>
        <button
          onClick={() => handleVote("downvote")}
          disabled={!userId}
          className={`rounded p-0.5 transition ${
            userVote === "downvote"
              ? "text-[color:var(--accent-danger)]"
              : "text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]"
          } disabled:opacity-30`}
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 20l8-8h-5V4H9v8H4z" />
          </svg>
        </button>
      </div>

      {/* Comment Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-medium text-[color:var(--text-primary)]">
            User {comment.userId.slice(-6)}
          </span>
          <span className="text-xs text-[color:var(--text-tertiary)]">
            {formatRelativeTime(comment.createdAt)}
          </span>
          {comment.createdAt !== comment.updatedAt && (
            <span className="text-xs text-[color:var(--text-tertiary)]">
              (edited)
            </span>
          )}
        </div>
        <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed whitespace-pre-wrap mb-2">
          {comment.content}
        </p>
        {userId && depth < 5 && (
          <button
            onClick={() => onReply(comment.id)}
            className="text-xs font-medium text-[color:var(--accent-primary)] hover:underline"
          >
            Reply
          </button>
        )}
      </div>
    </div>
  );
}

interface CommentThreadProps {
  sightingId: string;
  userId?: string;
}

export function CommentThread({ sightingId, userId }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/comments?sightingId=${sightingId}`);
      if (!response.ok) {
        throw new Error("Failed to load comments");
      }
      const data = await response.json();
      setComments(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadComments();
  }, [sightingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newComment.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sightingId,
          userId,
          content: newComment.trim(),
          parentId: replyTo || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to post comment");
      }

      setNewComment("");
      setReplyTo(null);
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (
    commentId: string,
    voteType: "upvote" | "downvote"
  ) => {
    if (!userId) return;

    try {
      await fetch(`/api/comments/${commentId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type: voteType }),
      });

      await loadComments();
    } catch (err) {
      console.error("Failed to vote:", err);
    }
  };

  // Build comment tree
  type CommentNode = { comment: Comment; children: CommentNode[] };

  const buildTree = (parentId?: string): CommentNode[] => {
    return comments
      .filter((c) => c.parentId === parentId)
      .map((comment) => ({
        comment,
        children: buildTree(comment.id),
      }));
  };

  const renderComment = (node: CommentNode, depth: number): React.ReactNode => (
    <div key={node.comment.id} className="mb-3">
      <CommentItem
        comment={node.comment}
        userId={userId}
        onReply={setReplyTo}
        onVote={handleVote}
        depth={depth}
      />
      {node.children.map((child) => renderComment(child, depth + 1))}
    </div>
  );

  const tree = buildTree(undefined);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--accent-primary)]" />
          <p className="text-xs text-[color:var(--text-secondary)]">
            Loading comments...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comment Input */}
      {userId ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[color:var(--text-secondary)]">
                Replying to comment
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-[color:var(--accent-primary)] hover:underline"
              >
                Cancel
              </button>
            </div>
          )}
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-primary)] min-h-[80px] resize-y"
            disabled={submitting}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="rounded-lg bg-[color:var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-lg border border-dashed border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-4 text-center">
          <p className="text-sm text-[color:var(--text-secondary)]">
            Log in to comment
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[color:var(--accent-danger)]/20 bg-[color:var(--accent-danger)]/5 p-3">
          <p className="text-sm text-[color:var(--accent-danger)]">{error}</p>
        </div>
      )}

      {/* Comments List */}
      {tree.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-[color:var(--text-secondary)]">
            No comments yet. Be the first to comment!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tree.map((node) => renderComment(node, 0))}
        </div>
      )}
    </div>
  );
}
