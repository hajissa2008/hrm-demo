# HR Suite — demonstration

A browsable demonstration of an HR platform: employees, org structure, attendance, leave,
payroll, recruitment, performance and the approval flows that connect them.

**This is a static site.** There is no server, no API and no database behind it. Every response
is a recording, made against a freshly seeded demonstration database, replayed in the browser.

## The company is not real

Almaz Retail Group, its staff, their salaries, payslips and attendance are invented for this
demonstration. No figure here describes any real person or company.

## Signing in

Use the bar at the bottom of the page to switch between four people:

| Person | Shows |
|---|---|
| HR administrator | The organisation, employees and settings |
| Payroll officer | Pay periods, payslips, the validation run |
| Line manager | A team, its approval queue |
| Employee | Self-service: own profile, payslip, leave, attendance |

Four rather than one because the thing worth seeing is a request raised by one person and decided
by another. Raise leave as the employee, then switch to the manager and approve it — that flow
works end to end. Other actions say plainly that they cannot be saved rather than pretending.

Everything resets when you close the tab.

## What this is not

Not the product's source, and not a deployment of it. The repository holds a built front end and
its recorded data, nothing more.
