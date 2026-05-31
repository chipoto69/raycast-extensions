import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  openCommandPreferences,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import * as fs from "fs";
import * as path from "path";
import { ContentDetail } from "./components/content-detail";
import { EditProjectForm } from "./components/edit-project-form";
import { TaskList } from "./components/task-list";
import { deleteProjectFile, expandHome, resolvePath } from "./util/storage";

type FileSummary = {
  name: string;
  path: string;
  preview: string;
  openTasks: number;
  doneTasks: number;
};

function extractPreview(content: string): string {
  const lines = content.split("\n").map((line) => line.trim());
  const taskLine = lines.find((line) => /^- \[[ xX]\] /.test(line));
  if (taskLine) {
    return taskLine.replace(/^- \[[ xX]\] /, "");
  }

  const contentLine = lines.find(
    (line) => line.length > 0 && !line.startsWith("#") && !line.startsWith(">"),
  );
  return contentLine ?? "No tasks yet";
}

function listFileSummaries(mitodosDir: string): FileSummary[] {
  return fs
    .readdirSync(mitodosDir)
    .filter((entry) => entry.endsWith(".md"))
    .sort((a, b) => {
      if (a === "inbox.md") return -1;
      if (b === "inbox.md") return 1;
      return a.localeCompare(b);
    })
    .map((entry) => {
      const filepath = path.join(mitodosDir, entry);
      const content = fs.readFileSync(filepath, "utf-8");
      return {
        name: entry.replace(/\.md$/, ""),
        path: filepath,
        preview: extractPreview(content),
        openTasks: (content.match(/^- \[ \] /gm) ?? []).length,
        doneTasks: (content.match(/^- \[[xX]\] /gm) ?? []).length,
      };
    });
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const mitodosDir = resolvePath(expandHome(prefs.mitodosDir));
  const { push } = useNavigation();

  const { data, isLoading, revalidate } = usePromise(
    async (dir: string) => {
      if (!fs.existsSync(dir)) {
        return { exists: false, files: [] as FileSummary[] };
      }

      return {
        exists: true,
        files: listFileSummaries(dir),
      };
    },
    [mitodosDir],
  );

  const files = data?.files ?? [];
  const missingDir = data?.exists === false;

  async function handleDeleteProject(name: string) {
    const confirmed = await confirmAlert({
      title: "Delete project",
      message: name,
      primaryAction: {
        title: "Delete Project",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
      icon: Icon.Trash,
    });

    if (!confirmed) return;

    try {
      deleteProjectFile(mitodosDir, name);
      await revalidate();
      await showHUD(`Deleted: ${name}`);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete project",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Browse MiToDos files">
      {missingDir ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="MiToDos directory not found"
          description={`${mitodosDir} does not exist yet`}
          actions={
            <ActionPanel>
              <Action
                title="Open Command Preferences"
                icon={Icon.Gear}
                onAction={openCommandPreferences}
              />
            </ActionPanel>
          }
        />
      ) : files.length === 0 ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No MiToDos files yet"
          description="Create a project or add a task to create your first file"
        />
      ) : (
        files.map((file) => {
          const accessories = [{ text: `${file.openTasks} open` }];
          if (file.doneTasks > 0) {
            accessories.push({ text: `${file.doneTasks} done` });
          }

          return (
            <List.Item
              key={file.path}
              icon={file.name === "inbox" ? Icon.Inbox : Icon.Document}
              title={file.name}
              subtitle={file.preview.slice(0, 120)}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action
                    title="Manage Tasks"
                    icon={Icon.Checklist}
                    onAction={() =>
                      push(
                        <TaskList
                          filepath={file.path}
                          fileName={file.name}
                          onTasksChanged={async () => {
                            await revalidate();
                          }}
                        />,
                      )
                    }
                  />
                  <Action
                    title="View Content"
                    icon={Icon.Eye}
                    onAction={() =>
                      push(<ContentDetail filepath={file.path} fileName={file.name} />)
                    }
                  />
                  {file.name !== "inbox" && (
                    <Action
                      title="Rename Project"
                      icon={Icon.Pencil}
                      onAction={() =>
                        push(
                          <EditProjectForm
                            mitodosDir={mitodosDir}
                            currentName={file.name}
                            onProjectChanged={async () => {
                              await revalidate();
                            }}
                          />,
                        )
                      }
                    />
                  )}
                  {file.name !== "inbox" && (
                    <Action
                      title="Delete Project"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => handleDeleteProject(file.name)}
                    />
                  )}
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => revalidate()}
                  />
                  <Action.CopyToClipboard title="Copy Path" content={file.path} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
