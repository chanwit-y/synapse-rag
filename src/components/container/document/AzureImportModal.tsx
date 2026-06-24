"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal/Modal";
import Button from "@/components/common/Button/Button";
import Checkbox from "@/components/common/Checkbox/Checkbox";
import SelectField from "@/components/common/SelectField/SelectField";
import type { FileType } from "@/components/common/FileTree/types";
import {
  listAzureChildrenAction,
  listAzureEpicsAction,
  listAzureProjectsAction,
  listAzureTeamsAction,
} from "@/server/actions";
import type {
  AzureProject,
  AzureTeam,
  AzureWorkItemNode,
} from "@/server/services";

const USER_STORY = "User Story";

function unwrap<T>(
  result: { success: true; data: T } | { success: false; error: string },
): T {
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export type AzureImportModalProps = {
  open: boolean;
  onClose: () => void;
  /** Imports the selected user-story ids from a project; parent handles refresh + feedback.
   *  `fileType` picks the extension/editor each imported story opens in (.md vs .rt). */
  onImport: (
    project: string,
    workItemIds: number[],
    fileType: FileType,
  ) => Promise<void>;
};

export default function AzureImportModal({
  open,
  onClose,
  onImport,
}: AzureImportModalProps) {
  const [projects, setProjects] = useState<AzureProject[] | null>(null);
  const [project, setProject] = useState<string | null>(null);
  const [teams, setTeams] = useState<AzureTeam[] | null>(null);
  const [team, setTeam] = useState<string | null>(null);
  const [epics, setEpics] = useState<AzureWorkItemNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [childrenByParent, setChildrenByParent] = useState<
    Record<number, AzureWorkItemNode[]>
  >({});
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  // Extension/editor each imported story opens in. Defaults to rich text (.rt).
  const [fileType, setFileType] = useState<FileType>("rt");

  const loadProjects = useCallback(async () => {
    try {
      const list = unwrap(await listAzureProjectsAction());
      setProjects(list);
      setProject((cur) => cur ?? list[0]?.name ?? null);
      setError(null);
    } catch (e) {
      setProjects([]);
      setError(e instanceof Error ? e.message : "Failed to load projects");
    }
  }, []);

  const loadTeams = useCallback(async (proj: string) => {
    try {
      const list = unwrap(await listAzureTeamsAction(proj));
      setTeams(list);
      setTeam((cur) => cur ?? list[0]?.name ?? null);
      setError(null);
    } catch (e) {
      setTeams([]);
      setError(e instanceof Error ? e.message : "Failed to load teams");
    }
  }, []);

  const loadEpics = useCallback(async (proj: string, tm: string) => {
    try {
      const data = unwrap(await listAzureEpicsAction(proj, tm));
      setEpics(data);
      setError(null);
    } catch (e) {
      setEpics([]);
      setError(e instanceof Error ? e.message : "Failed to load epics");
    }
  }, []);

  // Load projects when the modal opens. Reset happens in `onExited` below.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; state set post-await
      void loadProjects();
    }
  }, [open, loadProjects]);

  // (Re)load the team list whenever the selected project changes.
  useEffect(() => {
    if (open && project) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; state set post-await
      void loadTeams(project);
    }
  }, [open, project, loadTeams]);

  // (Re)load the epic tree whenever the selected project/team changes.
  useEffect(() => {
    if (open && project && team) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; state set post-await
      void loadEpics(project, team);
    }
  }, [open, project, team, loadEpics]);

  const resetState = useCallback(() => {
    setProjects(null);
    setProject(null);
    setTeams(null);
    setTeam(null);
    setEpics(null);
    setError(null);
    setChildrenByParent({});
    setExpanded(new Set());
    setLoadingIds(new Set());
    setSelected(new Set());
    setIsImporting(false);
    setFileType("rt");
  }, []);

  const handleProjectChange = useCallback((value: string | number | null) => {
    // Switching project resets the team list, tree and selection; effects reload.
    setProject(value == null ? null : String(value));
    setTeams(null);
    setTeam(null);
    setEpics(null);
    setChildrenByParent({});
    setExpanded(new Set());
    setSelected(new Set());
  }, []);

  const handleTeamChange = useCallback((value: string | number | null) => {
    // Switching team resets the tree and selection; the effect reloads epics.
    setTeam(value == null ? null : String(value));
    setEpics(null);
    setChildrenByParent({});
    setExpanded(new Set());
    setSelected(new Set());
  }, []);

  const toggleExpand = useCallback(
    async (node: AzureWorkItemNode) => {
      if (!project) return;
      const next = new Set(expanded);
      if (next.has(node.id)) {
        next.delete(node.id);
        setExpanded(next);
        return;
      }
      next.add(node.id);
      setExpanded(next);

      if (childrenByParent[node.id]) return; // already loaded

      setLoadingIds((s) => new Set(s).add(node.id));
      try {
        const children = unwrap(await listAzureChildrenAction(project, node.id));
        setChildrenByParent((m) => ({ ...m, [node.id]: children }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load children");
      } finally {
        setLoadingIds((s) => {
          const n = new Set(s);
          n.delete(node.id);
          return n;
        });
      }
    },
    [expanded, childrenByParent, project],
  );

  const toggleSelect = useCallback((id: number) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const handleImport = useCallback(async () => {
    if (!project || selected.size === 0) return;
    setIsImporting(true);
    try {
      await onImport(project, [...selected], fileType);
    } finally {
      setIsImporting(false);
    }
  }, [onImport, project, selected, fileType]);

  const renderNodes = (nodes: AzureWorkItemNode[], depth: number) =>
    nodes.map((node) => {
      const isStory = node.type === USER_STORY;
      const isOpen = expanded.has(node.id);
      const isLoading = loadingIds.has(node.id);
      const children = childrenByParent[node.id];

      return (
        <div key={node.id}>
          <div
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface"
            style={{ paddingLeft: depth * 18 + 8 }}
          >
            {isStory ? (
              <Checkbox
                checked={selected.has(node.id)}
                onChange={() => toggleSelect(node.id)}
                aria-label={`Select ${node.title}`}
              />
            ) : (
              <button
                type="button"
                onClick={() => void toggleExpand(node)}
                disabled={!node.hasChildren}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-surface-strong disabled:opacity-30"
                aria-label={isOpen ? "Collapse" : "Expand"}
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            )}

            <span className="shrink-0 rounded bg-surface-strong px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {node.type || "Item"}
            </span>
            <span className="truncate text-foreground" title={node.title}>
              {node.title}
            </span>
            {node.state ? (
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {node.state}
              </span>
            ) : null}
          </div>

          {!isStory && isOpen && children ? (
            children.length > 0 ? (
              renderNodes(children, depth + 1)
            ) : (
              <div
                className="px-2 py-1 text-xs text-muted-foreground"
                style={{ paddingLeft: (depth + 1) * 18 + 28 }}
              >
                No items.
              </div>
            )
          ) : null}
        </div>
      );
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      onExited={resetState}
      size="lg"
      title={<span>Import user stories from Azure DevOps</span>}
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {selected.size} user {selected.size === 1 ? "story" : "stories"} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outlined" onClick={onClose} disabled={isImporting}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              loading={isImporting}
              disabled={selected.size === 0}
            >
              Add user stories
            </Button>
          </div>
        </div>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-3">
        <SelectField
          fullWidth
          label="Project"
          placeholder={projects === null ? "Loading projects…" : "Select a project"}
          disabled={projects === null || projects.length === 0}
          options={(projects ?? []).map((p) => ({ value: p.name, label: p.name }))}
          value={project}
          onChange={handleProjectChange}
        />
        <SelectField
          fullWidth
          label="Team"
          placeholder={
            !project
              ? "Select a project first"
              : teams === null
                ? "Loading teams…"
                : "Select a team"
          }
          disabled={!project || teams === null || teams.length === 0}
          options={(teams ?? []).map((t) => ({ value: t.name, label: t.name }))}
          value={team}
          onChange={handleTeamChange}
        />
      </div>

      <div className="mb-3 flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">Save as</span>
        <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface-strong p-0.5">
          {(
            [
              { value: "rt", label: "Rich text (.rt)" },
              { value: "md", label: "Markdown (.md)" },
            ] as { value: FileType; label: string }[]
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFileType(opt.value)}
              aria-pressed={fileType === opt.value}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                fileType === opt.value
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div
          className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="max-h-[50vh] min-h-[200px] overflow-y-auto rounded-md border border-border">
        {!project ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Select a project to load its backlog.
          </div>
        ) : !team ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Select a team to load its backlog.
          </div>
        ) : epics === null ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading epics…
          </div>
        ) : epics.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No epics found on the backlog.
          </div>
        ) : (
          <div className="py-1">{renderNodes(epics, 0)}</div>
        )}
      </div>
    </Modal>
  );
}
