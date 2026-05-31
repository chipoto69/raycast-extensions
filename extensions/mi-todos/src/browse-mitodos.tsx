import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
  openCommandPreferences,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import * as fs from "fs";
import * as path from "path";
import { ContentDetail } from "./components/content-detail";
import { expandHome, resolvePath } from "./util/storage";

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

  const { data, isLoading } = usePromise(
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
                    title="View Content"
                    icon={Icon.Eye}
                    onAction={() =>
                      push(<ContentDetail filepath={file.path} fileName={file.name} />)
                    }
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
