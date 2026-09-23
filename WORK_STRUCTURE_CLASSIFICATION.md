# Global Work Radar — Work Structure Classification

## Purpose

Global Work Radar should not rank work only by job title or headline pay. A high-value distinction is whether a role combines low work frequency with paid availability and freedom to do other work while waiting.

Target structural pattern:

low frequency
+ value in immediate response
+ paid standby / availability
+ remote
+ non-exclusive / other work permitted

This can create a materially different effective hourly value from a normal high-activity job.

## Evidence-first fields

Only populate these fields when the employer or official source states them explicitly. Do not infer them from job title, remote status, contractor status, or generic schedule language.

- `workload_volume_min` / `workload_volume_max`
  - Actual expected task/call/ticket volume when explicitly stated.
- `workload_unit`
  - Example: `calls`, `tickets`, `tasks`, `cases`.
- `workload_period`
  - Example: `hour`, `shift`, `day`, `week`.
- `availability_pay_amount`
  - Standby pay / availability fee amount when explicitly stated.
- `availability_pay_currency`
- `availability_pay_period`
  - Example: `hour`, `shift`, `day`, `week`, `month`.
- `paid_idle_time`
  - Whether idle/waiting time is paid.
- `other_work_permitted`
  - Whether another job or other work is explicitly permitted during the engagement.
- `non_exclusive`
  - Whether the contract is explicitly non-exclusive.
- `simultaneous_work_allowed`
  - Whether other work may be performed during waiting/standby time, not merely outside scheduled hours.
- `response_sla_minutes`
  - Required response time when stated.
- `application_status`
  - `open`, `paused`, `closed`, or `unknown` based on current official application state.
- `work_structure_evidence`
  - Short structured evidence or source note supporting the classification.
- `work_structure_verified_at`
  - Last verification timestamp for these fields.

## Important distinction

`other_work_permitted` and `simultaneous_work_allowed` are not the same.

- Other work permitted = another job is allowed in general.
- Simultaneous work allowed = another task/job may be done during paid waiting time.

The second is much more valuable for low-density standby work and must never be inferred from the first.

## Do not infer

Do not treat any of the following as proof of low work density or paid idle time:

- remote
- contractor
- flexible schedule
- part-time
- on-call
- non-exclusive

For example, `on-call` can still mean high workload or unpaid standby. Evidence is required.

## Derived intelligence — later, only with enough evidence

Once enough verified records exist, GWR may derive:

- Work Density = how much active work occurs per paid availability period.
- Constraint Level = how much the role restricts the worker's time while paid.
- Standby Value = whether waiting/availability itself is compensated.

Do not publish these as scores until the underlying source coverage is sufficient. Preserve raw facts first.

## Why this matters

A role paying less per active task can be structurally better if:

- the worker is paid for availability,
- actual calls/tasks are rare,
- response expectations are clear,
- and the worker may perform other paid work simultaneously.

This is difficult to discover in ordinary job search and is a strong Global Work Radar differentiation candidate.