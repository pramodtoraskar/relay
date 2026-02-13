#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { DatabaseManager, JiraClient, GitClient, WorkflowManager } from "@relay/core";

const db = new DatabaseManager();
const jira = new JiraClient();
jira.configure();
const git = new GitClient();
const wm = new WorkflowManager(db, jira, git);

const devId = process.env["RELAY_DEVELOPER_ID"] ?? process.env["USER"] ?? "default";

const program = new Command();

program
  .name("relay")
  .description("Relay — AI-powered dev workflow: check-in, tasks, handoffs")
  .version("0.1.0");

program
  .command("checkin")
  .description("Morning check-in: handoffs, Jira issues, Git status")
  .action(async () => {
    const spinner = ora("Loading check-in...").start();
    try {
      const result = await wm.morningCheckin(devId);
      spinner.succeed("Check-in");
      console.log();
      console.log(chalk.bold.cyan("Pending handoffs"));
      if (result.pendingHandoffs.length === 0) console.log(chalk.gray("  None"));
      else
        result.pendingHandoffs.forEach((h: { title: string; from: string }) =>
          console.log(chalk.gray(`  • ${h.title} (from ${h.from})`))
        );
      console.log();
      console.log(chalk.bold.cyan("Assigned Jira issues"));
      if (result.assignedIssues.length === 0) console.log(chalk.gray("  None or Jira not configured"));
      else
        result.assignedIssues.forEach((i: { key: string; summary: string }) =>
          console.log(chalk.gray(`  • ${i.key}: ${i.summary}`))
        );
      console.log();
      console.log(chalk.bold.cyan("Git"));
      console.log(chalk.gray(`  Branch: ${result.currentBranch || "N/A"}`));
      if (result.activeSession) {
        console.log(chalk.yellow(`  Active session: ${result.activeSession.id} (${result.activeSession.jiraKey ?? ""})`));
        const status = wm.getTaskStatus(devId);
        if (status.microTasks.length > 0) {
          const doneCount = status.microTasks.filter((t) => t.status === "done").length;
          console.log(chalk.cyan("  Micro-tasks:"));
          status.microTasks.forEach((t) =>
            console.log(chalk.gray(`    ${t.status === "done" ? "✓" : "○"} ${t.title}`))
          );
          console.log(chalk.gray(`  Progress: ${doneCount}/${status.microTasks.length} done`));
        }
      }
    } catch (e) {
      spinner.fail(String(e));
      process.exit(1);
    }
  });

program
  .command("list")
  .description("List current task, micro-tasks, and progress (active session)")
  .action(() => {
    const status = wm.getTaskStatus(devId);
    if (!status.activeSession) {
      console.log(chalk.gray("No active session. Run relay start PROJ-42 to start one."));
      return;
    }
    const s = status.sessionDetails;
    console.log(chalk.bold.cyan("Current task"));
    console.log(chalk.gray(`  Session: ${status.activeSession.id}`));
    if (s?.jira_issue_key) console.log(chalk.gray(`  Jira: ${s.jira_issue_key}`));
    if (s?.jira_issue_summary) console.log(chalk.gray(`  Summary: ${s.jira_issue_summary}`));
    if (s?.branch_name) console.log(chalk.gray(`  Branch: ${s.branch_name}`));
    console.log();
    const tasks = status.microTasks;
    const doneCount = tasks.filter((t) => t.status === "done").length;
    console.log(chalk.bold.cyan(`Micro-tasks (${doneCount}/${tasks.length})`));
    if (tasks.length === 0) console.log(chalk.gray("  None"));
    else
      tasks.forEach((t) =>
        console.log(chalk.gray(`  ${t.status === "done" ? "✓" : "○"} ${t.title}`))
      );
    console.log();
    const logs = status.progressLogs;
    if (logs.length > 0) {
      console.log(chalk.bold.cyan("Recent progress"));
      logs.slice(0, 5).forEach((l) => {
        const time = l.created_at ? new Date(l.created_at).toLocaleString() : "";
        const note = l.note ? ` ${l.note}` : "";
        const mins = l.minutes_logged ? ` (${l.minutes_logged}m)` : "";
        const commit = l.commit_sha ? ` ${l.commit_sha.slice(0, 7)}` : "";
        console.log(chalk.gray(`  ${time}${mins}${commit}${note}`));
      });
    }
  });

program
  .command("start <issue_key>")
  .description("Start work on a Jira issue")
  .addHelpText("after", "\nExample:\n  relay start PROJ-42\n  relay start PROJ-99 -t \"Implement API\", \"Write tests\"")
  .option("-t, --tasks <items>", "Comma-separated micro-tasks", (v: string) => v.split(",").map((s) => s.trim()))
  .action(async (issueKey: string, opts: { tasks?: string[] }) => {
    const spinner = ora(`Starting ${issueKey}...`).start();
    try {
      const result = await wm.startTask(issueKey, opts.tasks ?? [], devId);
      spinner.succeed(`Started ${result.issueKey}`);
      console.log();
      console.log(chalk.bold(result.summary));
      console.log(chalk.gray(`Session: ${result.sessionId}`));
      console.log(chalk.gray(`Suggested branch: ${result.suggestedBranch}`));
      console.log(chalk.cyan("Micro-tasks:"));
      result.microTasks.forEach((t: { title: string }) => console.log(chalk.gray(`  • ${t.title}`)));
    } catch (e) {
      spinner.fail(String(e));
      process.exit(1);
    }
  });

program
  .command("update <message>")
  .description("Log progress (use active session)")
  .option("-m, --minutes <n>", "Minutes to log", parseInt)
  .option("-c, --commit <sha>", "Link commit SHA")
  .action(async (message: string, opts: { minutes?: number; commit?: string }) => {
    const session = wm.getActiveSession(devId);
    if (!session) {
      console.error(chalk.red("No active session. Run relay start PROJ-42 first."));
      process.exit(1);
    }
    wm.updateProgress(session.id, message, opts.minutes, opts.commit);
    console.log(chalk.green("Progress updated."));
  });

program
  .command("complete [session_id]")
  .description("Complete current task, optionally with MR URL")
  .option("-u, --url <url>", "Merge request / PR URL")
  .option("-m, --minutes <n>", "Total minutes", parseInt)
  .action(async (sessionIdArg?: string, opts?: { url?: string; minutes?: number }) => {
    const session = sessionIdArg ? null : wm.getActiveSession(devId);
    const id = sessionIdArg ?? session?.id;
    if (!id) {
      console.error(chalk.red("No session id and no active session."));
      process.exit(1);
    }
    wm.completeTask(id, opts?.url, opts?.minutes);
    console.log(chalk.green(`Session ${id} completed.`));
  });

program
  .command("handoff")
  .description("Create handoff to another developer (interactive)")
  .option("-t, --to <id>", "Recipient developer id")
  .option("--title <title>", "Handoff title")
  .action(async (opts: { to?: string; title?: string }) => {
    const session = wm.getActiveSession(devId);
    const answers = await inquirer.prompt([
      { type: "input", name: "to", message: "To (developer id):", default: opts.to, when: () => !opts.to },
      { type: "input", name: "title", message: "Title:", default: opts.title ?? session?.jiraKey ?? "Handoff", when: () => !opts.title },
      { type: "input", name: "what_done", message: "What's done:" },
      { type: "input", name: "what_next", message: "What's next:" },
      { type: "input", name: "branch", message: "Branch:", default: git.getCurrentBranch() },
    ]);
    const to = (opts.to ?? (answers as any).to) as string;
    const title = (opts.title ?? (answers as any).title) as string;
    const a = answers as any;
    const id = wm.createHandoff({
      fromDeveloperId: devId,
      toDeveloperId: to,
      title,
      whatDone: a.what_done,
      whatNext: a.what_next,
      branchName: a.branch,
      workSessionId: session?.id,
    });
    console.log(chalk.green(`Handoff created: ${id}`));
  });

program
  .command("eod")
  .description("End of day summary")
  .action(async () => {
    const result = await wm.endOfDay(devId);
    console.log(chalk.bold.cyan("End of day"));
    console.log();
    console.log(result.message);
    console.log();
    if (result.pendingHandoffs.length > 0) {
      console.log(chalk.cyan("Pending handoffs:"));
      result.pendingHandoffs.forEach((h: { title: string }) => console.log(chalk.gray(`  • ${h.title}`)));
    }
  });

program.parse();
