import sys
import os
import subprocess
from pathlib import Path

# Portable launcher for Horizons Task Manager

def find_taskmanager_root():
    here = Path(__file__).resolve()
    for parent in [here] + list(here.parents):
        if (parent / 'brain').is_dir() and (parent / 'desktop').is_dir():
            return parent
    raise RuntimeError('Could not locate portable taskmanager root.')

def main():
    root = find_taskmanager_root()
    os.chdir(root)
    os.environ['HORIZONS_TASKMANAGER_ROOT'] = str(root)
    os.environ['HORIZONS_PORTABLE_MODE'] = '1'
    os.environ.pop('ELECTRON_RUN_AS_NODE', None)

    electron_exe = root / 'node_modules' / 'electron' / 'dist' / 'electron.exe'
    if not electron_exe.exists():
        raise RuntimeError(f'Electron runtime was not found at {electron_exe}')

    completed = subprocess.run([str(electron_exe), '.'], cwd=root)
    sys.exit(completed.returncode)

if __name__ == '__main__':
    main()
