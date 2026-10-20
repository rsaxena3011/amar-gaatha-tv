# Friction Log - Amazon Build, Ship, Shape (C024)
Format per entry: Task | Steps | Expected | Actual | Severity |
Workaround | Suggested fix. (Judging bonus up to 10%.)

## Entry 1 - Vega/Kepler toolchain discovery (2026-10-12)
Task: Identify what is needed to run the official
react-native-multi-tv-app-sample on the Vega simulator.
Steps: Cloned the sample repo; checked local environment
(Node v24.20.0, npm 10.9.4 present; no Kepler/Vega CLI found).
Expected: A single documented setup path from repo README.
Actual: Pending clone/README inspection.
Severity: Low (documentation clarity).
Workaround: n/a yet.
Suggested fix: A preflight checklist in the sample README
listing required CLI tools and versions up front.

## Entry 2 - Yarn version wall on the official sample (2026-10-12)
Task: Run yarn install on react-native-multi-tv-app-sample.
Steps: Cloned repo, ran yarn install with system Yarn 1.22.22.
Expected: Dependencies install.
Actual: Hard error. package.json pins packageManager yarn@4.5.0
and demands Corepack. System Node (Debian package) ships no
corepack binary; npm -g corepack then fails EEXIST because the
system yarn package already owns /usr/bin/yarn.
Severity: Medium (blocks every new contributor on Debian/Ubuntu
system Node packages, a common dev setup).
Workaround: npm install -g --prefix ~/.local corepack, then
corepack enable --install-directory ~/.local/bin, then
corepack prepare yarn@4.5.0 --activate with ~/.local/bin first
on PATH. Yarn 4.5.0 confirmed active.
Suggested fix: The sample README prerequisites should include
a Corepack note for Linux system-Node users, or the repo should
ship a .yarnrc/devcontainer that removes the ambiguity.

## Entry 3 (2026-10-12): No KVM on build machine, no device budget
The demo must run on Fire OS/Vega. Our VM has no /dev/kvm so
the VVD cannot run locally, and we will not buy a device.
Rules accept simulator footage, so the hunt became "KVM
somewhere free": GitHub Actions runners expose /dev/kvm.
Suggested product fix: an official Amazon-maintained GitHub
Action (or documented CI recipe) for headless VVD boot +
scripted input + capture. Every CI-based team hits this wall.
