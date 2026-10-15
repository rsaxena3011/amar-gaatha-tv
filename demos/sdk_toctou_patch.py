#!/usr/bin/env python3
"""Runner-side TOCTOU patch for dutyfree-vega's config.py (Vega SDK 0.24.12112).

Root cause (C024 run 38716808541, 2026-10-15): the Boot VVD step launches
`vega virtual-device start` in the background and polls `vega device list`
every 10 s. EVERY vega invocation runs config.setup_runtime_environment at
import, which rebuilds the symlink farm via create_symlink_farm. That
function did exists-check-then-create with no exist_ok, so the background
start and the first poll race into os.symlink and the loser dies with
FileExistsError ("kepler-notices" link in run 38716808541; a sibling race
can also fake the "not pure symlink farm" exit(1)). The same
exists-check-then-create pattern exists in build_runtime's makedirs calls
and in setup_packagelink_in_workspace.

The patch converts every leaf create to create-first-then-verify (EAFP):
attempt os.symlink, swallow FileExistsError, then resolve whatever is
actually there. Both racing processes build the IDENTICAL farm from the
same source tree, so whichever process wins the race always leaves the
correct entry, and single-process semantics (conflict detection, "not pure
symlink farm" guard) are preserved exactly. Runner-local only; the PC SDK
and the release tarball are untouched.

Usage: python3 sdk_toctou_patch.py /path/to/config.py
Exits non-zero if any expected pattern is missing (SDK drift guard), so a
future SDK whose source moved fails loudly instead of silently no-opping.
"""

import sys

# (description, old, new, expected_count)
PATCHES = [
    (
        "file symlink branch (create_symlink_farm)",
        """         # Copy link over
         if os.path.islink(dst_file):
            orig_dst_path = os.readlink(dst_file)
            if orig_dst_path != orig_src_file:
               df_log(LogLevel.ERROR, f'ERROR: Conflicting LINKS: {orig_dst_path} versus {orig_src_file}', file=sys.stderr)
               exit(1)
         elif not os.path.exists(dst_file):
            os.symlink(orig_src_file, dst_file)
         else:
            df_log(LogLevel.ERROR, f'ERROR: Destination is not pure symlink farm: {dst_file}', file=sys.stderr)
            exit(1)
""",
        """         # Copy link over (TOCTOU-safe: create first, then verify what is
         # there, so a concurrent vega invocation racing this one can never
         # crash it or fake the "not pure symlink farm" exit)
         try:
            os.symlink(orig_src_file, dst_file)
         except FileExistsError:
            pass
         if os.path.islink(dst_file):
            orig_dst_path = os.readlink(dst_file)
            if orig_dst_path != orig_src_file:
               df_log(LogLevel.ERROR, f'ERROR: Conflicting LINKS: {orig_dst_path} versus {orig_src_file}', file=sys.stderr)
               exit(1)
         elif not os.path.exists(dst_file):
            # Entry raced away and vanished; retry surfaces the real error
            os.symlink(orig_src_file, dst_file)
         else:
            df_log(LogLevel.ERROR, f'ERROR: Destination is not pure symlink farm: {dst_file}', file=sys.stderr)
            exit(1)
""",
        1,
    ),
    (
        "dir symlink branch (create_symlink_farm)",
        """         if not os.path.exists(dst_dir):
            # Create a symlink
            os.symlink(src_dir, dst_dir)
         elif os.path.islink(dst_dir):
            # Symlink exists, need to resolve
            orig_dst_dir = os.readlink(dst_dir)
            if orig_dst_dir == src_dir:
               # symlink is the same contineu
               continue
            os.unlink(dst_dir)
            os.makedirs(dst_dir)
            # Recreate Original
            create_symlink_farm(orig_dst_dir, dst_dir)
            create_symlink_farm(src_dir, dst_dir)
         else:
            # Real directory
            create_symlink_farm(src_dir, dst_dir)
""",
        """         # TOCTOU-safe: attempt the create, then resolve what is there
         try:
            os.symlink(src_dir, dst_dir)
         except FileExistsError:
            pass
         if os.path.islink(dst_dir):
            # Symlink exists, need to resolve
            orig_dst_dir = os.readlink(dst_dir)
            if orig_dst_dir == src_dir:
               # symlink is the same, continue
               continue
            try:
               os.unlink(dst_dir)
            except FileNotFoundError:
               pass
            os.makedirs(dst_dir, exist_ok=True)
            # Recreate Original
            create_symlink_farm(orig_dst_dir, dst_dir)
            create_symlink_farm(src_dir, dst_dir)
         else:
            # Real directory
            create_symlink_farm(src_dir, dst_dir)
""",
        1,
    ),
    (
        "packagelink create/resolve (setup_packagelink_in_workspace)",
        """         if not os.path.lexists(dst_dir):
            # Create a symlink
            os.symlink(src_dir, dst_dir, True)
         elif os.path.islink(dst_dir):
            # broken symlink, need to resolve
            if not os.path.exists(dst_dir):
               os.unlink(dst_dir)
               os.symlink(src_dir, dst_dir, True)
            # Same Pkg, different path
            else:
               orig_dst_dir = os.readlink(dst_dir)
               if orig_dst_dir != src_dir:
                  os.remove(dst_dir)
                  os.symlink(src_dir, dst_dir, True)
""",
        """         # TOCTOU-safe: attempt the create, then resolve what is there
         try:
            os.symlink(src_dir, dst_dir, True)
         except FileExistsError:
            pass
         if os.path.islink(dst_dir):
            # broken symlink, need to resolve
            if not os.path.exists(dst_dir):
               try:
                  os.unlink(dst_dir)
               except FileNotFoundError:
                  pass
               try:
                  os.symlink(src_dir, dst_dir, True)
               except FileExistsError:
                  pass
            # Same Pkg, different path
            else:
               orig_dst_dir = os.readlink(dst_dir)
               if orig_dst_dir != src_dir:
                  try:
                     os.remove(dst_dir)
                  except FileNotFoundError:
                     pass
                  try:
                     os.symlink(src_dir, dst_dir, True)
                  except FileExistsError:
                     pass
""",
        1,
    ),
    (
        "runtime_env makedirs (build_runtime)",
        "   if not os.path.exists(runtime_env):\n"
        "      os.makedirs(runtime_env)\n",
        "   if not os.path.exists(runtime_env):\n"
        "      os.makedirs(runtime_env, exist_ok=True)\n",
        1,
    ),
    (
        "dst_path makedirs (build_runtime)",
        "   if not os.path.exists(dst_path):\n"
        "      os.makedirs(dst_path)\n",
        "   if not os.path.exists(dst_path):\n"
        "      os.makedirs(dst_path, exist_ok=True)\n",
        1,
    ),
    (
        "config_farm_path makedirs (3 configfarm builders)",
        "   if not os.path.exists(config_farm_path):\n"
        "      os.makedirs(config_farm_path)\n",
        "   if not os.path.exists(config_farm_path):\n"
        "      os.makedirs(config_farm_path, exist_ok=True)\n",
        3,
    ),
]


def main():
    path = sys.argv[1]
    with open(path) as f:
        src = f.read()
    for desc, old, new, expected in PATCHES:
        found = src.count(old)
        if found != expected:
            print(
                f"PATCH ABORTED: '{desc}' expected {expected} occurrence(s), "
                f"found {found}. SDK source may have drifted.",
                file=sys.stderr,
            )
            sys.exit(1)
        src = src.replace(old, new)
        print(f"patched: {desc} ({expected}x)")
    with open(path, "w") as f:
        f.write(src)
    compile(src, path, "exec")  # syntax check
    print("OK: all patches applied, syntax valid")


if __name__ == "__main__":
    main()
