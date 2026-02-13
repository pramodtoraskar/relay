import axios, { AxiosInstance } from "axios";

const JIRA_BASE_URL_ENV = "RELAY_JIRA_BASE_URL";
const JIRA_EMAIL_ENV = "RELAY_JIRA_EMAIL";
const JIRA_API_TOKEN_ENV = "RELAY_JIRA_API_TOKEN"; // Jira Personal Access Token (Bearer)

export interface JiraConfig {
  baseUrl: string;
  email?: string;
  /** Jira Personal Access Token (used as Bearer token). */
  apiToken?: string;
}

export interface JiraIssue {
  key: string;
  summary: string;
  description?: string;
  status?: string;
  assignee?: string;
  issueType?: string;
}

/**
 * Jira REST API client. Supports both API token (email + token) and Personal Access Token (PAT).
 */
export class JiraClient {
  private client: AxiosInstance | null = null;
  private config: JiraConfig | null = null;

  configure(config?: Partial<JiraConfig>): void {
    const baseUrl =
      config?.baseUrl ??
      process.env[JIRA_BASE_URL_ENV]?.replace(/\/$/, "");
    if (!baseUrl) {
      this.config = null;
      this.client = null;
      return;
    }

    const email = config?.email ?? process.env[JIRA_EMAIL_ENV];
    const apiToken = config?.apiToken ?? process.env[JIRA_API_TOKEN_ENV];

    // Jira Personal Access Token: use Bearer auth (same token type in Jira Cloud).
    if (apiToken) {
      this.client = axios.create({
        baseURL: `${baseUrl}/rest/api/3`,
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
    } else {
      this.client = null;
    }
    this.config = { baseUrl, email, apiToken };
  }

  isConfigured(): boolean {
    return this.client != null;
  }

  /**
   * Fetch issue by key (e.g. PROJ-42).
   */
  async getIssue(issueKey: string): Promise<JiraIssue | null> {
    if (!this.client) return null;
    try {
      const { data } = await this.client.get<{
        key: string;
        fields: {
          summary: string;
          description?: { type: string; content?: unknown[] };
          status?: { name: string };
          assignee?: { displayName: string };
          issuetype?: { name: string };
        };
      }>(`/issue/${issueKey}`);
      const desc = data.fields?.description;
      let description: string | undefined;
      if (typeof desc === "string") description = desc;
      else if (desc && typeof desc === "object" && "content" in desc)
        description = JSON.stringify((desc as { content?: unknown[] }).content);
      return {
        key: data.key,
        summary: data.fields?.summary ?? "",
        description,
        status: data.fields?.status?.name,
        assignee: data.fields?.assignee?.displayName,
        issueType: data.fields?.issuetype?.name,
      };
    } catch {
      return null;
    }
  }

  /**
   * Transition issue to a status by name (e.g. "In Progress", "Done").
   */
  async transitionIssue(issueKey: string, transitionName: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { data: transitions } = await this.client.get<{ transitions: Array<{ id: string; name: string }> }>(
        `/issue/${issueKey}/transitions`
      );
      const t = transitions.transitions?.find(
        (x) => x.name.toLowerCase() === transitionName.toLowerCase()
      );
      if (!t) return false;
      await this.client.post(`/issue/${issueKey}/transitions`, { transition: { id: t.id } });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Search issues assigned to current user (JQL). Optional JQL override.
   */
  async getAssignedIssues(jqlOverride?: string): Promise<JiraIssue[]> {
    if (!this.client) return [];
    const jql = jqlOverride ?? "assignee = currentUser() AND status != Done ORDER BY updated DESC";
    try {
      const { data } = await this.client.get<{
        issues: Array<{
          key: string;
          fields: {
            summary: string;
            status?: { name: string };
            assignee?: { displayName: string };
            issuetype?: { name: string };
          };
        }>;
      }>("/search", { params: { jql, maxResults: 20, fields: "summary,status,assignee,issuetype" } });
      return (data.issues ?? []).map((i) => ({
        key: i.key,
        summary: i.fields?.summary ?? "",
        status: i.fields?.status?.name,
        assignee: i.fields?.assignee?.displayName,
        issueType: i.fields?.issuetype?.name,
      }));
    } catch {
      return [];
    }
  }
}
