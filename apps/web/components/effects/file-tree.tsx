"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { File, Folder, FolderOpen, ChevronRight } from "lucide-react";

interface FileNode {
  name: string;
  type: "file" | "directory";
  children?: FileNode[];
  language?: string;
  size?: number;
}

interface FileTreeProps {
  nodes: FileNode[];
  className?: string;
  depth?: number;
  onFileClick?: (node: FileNode) => void;
}

function TreeNode({
  node,
  depth = 0,
  onFileClick,
}: {
  node: FileNode;
  depth: number;
  onFileClick?: (node: FileNode) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isDir = node.type === "directory";
  const hasChildren = isDir && node.children && node.children.length > 0;

  return (
    <div>
      <button
        onClick={() => {
          if (isDir) setExpanded(!expanded);
          else onFileClick?.(node);
        }}
        className={cn(
          "flex items-center gap-1.5 w-full text-left px-2 py-1 rounded-sm text-[10px] font-mono transition-colors",
          "hover:bg-primary-muted/20 text-muted-foreground hover:text-foreground",
          depth > 0 && "pl-2"
        )}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {/* Expand chevron for directories */}
        {isDir ? (
          <ChevronRight
            className={cn(
              "w-2.5 h-2.5 text-muted-foreground flex-shrink-0 transition-transform duration-150",
              expanded && "rotate-90"
            )}
          />
        ) : (
          <span className="w-2.5 flex-shrink-0" />
        )}

        {/* Icon */}
        {isDir ? (
          expanded ? (
            <FolderOpen className="w-3 h-3 text-accent flex-shrink-0" />
          ) : (
            <Folder className="w-3 h-3 text-primary/60 flex-shrink-0" />
          )
        ) : (
          <File className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        )}

        {/* Name */}
        <span className="truncate text-[10px]">{node.name}</span>

        {/* File size or language badge */}
        {node.size && !isDir && (
          <span className="ml-auto text-[8px] text-muted-foreground flex-shrink-0">
            {node.size < 1024 ? `${node.size}B` : `${(node.size / 1024).toFixed(1)}KB`}
          </span>
        )}
        {node.language && (
          <span className="ml-1 px-1 py-0.5 rounded-sm bg-primary-muted/30 text-[7px] text-primary uppercase tracking-wider flex-shrink-0">
            {node.language}
          </span>
        )}
      </button>

      {/* Children */}
      <AnimatePresence initial={false}>
        {isDir && expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {node.children!.map((child, i) => (
              <TreeNode
                key={`${child.name}-${i}`}
                node={child}
                depth={depth + 1}
                onFileClick={onFileClick}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FileTree({ nodes, className, onFileClick }: FileTreeProps) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-center">
        <p className="text-[10px] font-mono text-muted-foreground">No files to display.</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-sm border border-border/10 bg-background/30", className)}>
      <div className="px-3 py-1.5 border-b border-border/10 flex items-center gap-2">
        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
          Files ({countFiles(nodes)})
        </span>
      </div>
      <div className="py-1 max-h-[400px] overflow-y-auto">
        {nodes.map((node, i) => (
          <TreeNode
            key={`${node.name}-${i}`}
            node={node}
            depth={0}
            onFileClick={onFileClick}
          />
        ))}
      </div>
    </div>
  );
}

function countFiles(nodes: FileNode[]): number {
  let count = 0;
  for (const n of nodes) {
    if (n.type === "file") count++;
    if (n.children) count += countFiles(n.children);
  }
  return count;
}

export type { FileNode };
