# Scientific backing

Relay’s design is informed by research on developer productivity, task switching, and coordination.

## Context switching and interruption

- **Task switching cost**: Studies show that context switches (e.g. interruptions, handoffs) incur a cognitive “resumption cost” and can reduce productivity. By structuring handoffs with explicit “what’s done” and “what’s next,” Relay reduces the time for the next developer to regain context.
- **Micro-tasks**: Breaking work into small, checkable steps (micro-tasks) is associated with better focus and progress visibility, and aligns with research on chunking and goal-setting.

## Coordination and visibility

- **Awareness**: In distributed and async teams, “awareness” of who is doing what and what is blocked is critical. Relay’s local layer (sessions, handoffs) provides a lightweight coordination structure without requiring a heavy process.
- **Boundary objects**: Artifacts like handoff notes and branch/file lists act as boundary objects between developers, supporting knowledge transfer across time and distance.

## Tool integration (Official + Code layers)

- **Single source of truth**: Keeping project management (Jira/Linear) as the official layer and linking local sessions to issue keys avoids duplicate tracking and keeps status aligned.
- **Traceability**: Linking commits and MRs to work sessions supports traceability from “what was done” to “which code changed,” which is valued in both research and practice.

## Local-first and privacy

- **Local-first**: Storing coordination data (sessions, handoffs) locally first respects privacy and works offline; it also aligns with principles of user control over data.
- **No telemetry**: The decision to collect no usage data is consistent with privacy-focused design and reduces bias and surveillance concerns in tools.

## References (representative)

- González, V. M., & Mark, G. (2004). “Constant, constant, multi-tasking craziness”: Managing multiple working spheres. *CHI*.
- Iqbal, S. T., & Bailey, B. P. (2006). Understanding and developing models for the cost of interruption. *CHI*.
- Herbsleb, J. D., & Moitra, D. (2001). Global software development. *IEEE Software*.

Relay’s architecture (Official / Local / Code layers, handoffs, micro-tasks, and local-first storage) is designed to reflect these ideas in a practical, developer-focused tool.
