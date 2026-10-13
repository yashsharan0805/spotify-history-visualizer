#!/usr/bin/env python3
"""Review every tracked source file, or every file in a clean publication export."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
TOP_FILES = {'.env.example', '.gitignore', '.vercelignore', 'LICENSE', 'README.md',
             'CONTRIBUTING.md', 'SECURITY.md', 'index.html', 'package.json',
             'package-lock.json', 'tsconfig.json', 'vercel.json', 'vite.config.ts'}
DIRECTORY_SUFFIXES = {'src': {'.ts', '.tsx', '.css'}, 'tests': {'.ts'},
                      'docs': {'.md', '.json'}, 'scripts': {'.py'},
                      'public': {'.svg', '.txt'}}
PRIVATE_PATHS = re.compile(r'(?:^|/)(?:\.git|\.vercel|\.playwright-cli|node_modules|dist|'
                          r'output|data|__pycache__)(?:/|$)|(?:^|/)Streaming_History|'
                          r'\.(?:zip|tar|gz|png|jpe?g|webp|har|db|sqlite|pem|key|p12|csv)$', re.I)
PRIVATE_CONTENT = {
    'local machine path': re.compile(r'/(?:Users|home)/[^/\s]+/|/var/(?:folders|private)/|[A-Z]:\\Users\\'),
    'corporate identity': re.compile(r'\b[\w.+-]+@(?:udaan\.com)\b', re.I),
    'deployment account identifier': re.compile(r'\b(?:dpl|prj|team)_[A-Za-z0-9]{8,}\b'),
    'private key': re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    'credential pattern': re.compile(r'\b(?:gh[opusr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|'
                                     r'AKIA[A-Z0-9]{16}|sk-(?:proj-)?[A-Za-z0-9_-]{30,})\b'),
    'populated environment assignment': re.compile(r'^\s*(?:VITE_SPOTIFY_CLIENT_ID|VERCEL_TOKEN|'
                                                  r'GITHUB_TOKEN|SPOTIFY_CLIENT_SECRET)\s*=\s*'
                                                  r'(?!YOUR_32_CHARACTER_PUBLIC_CLIENT_ID\s*$)[^\s#]+', re.M),
}


def review(root, names):
    failures = []
    size = 0
    for required in ('LICENSE', 'README.md', '.env.example', 'package-lock.json'):
        if required not in names:
            failures.append((required, 'required publication file is missing'))
    for name in names:
        path = Path(name)
        if path.is_absolute() or '..' in path.parts:
            failures.append((name, 'unsafe publication path'))
            continue
        allowed = name in TOP_FILES or (len(path.parts) > 1 and
            path.parts[0] in DIRECTORY_SUFFIXES and path.suffix in DIRECTORY_SUFFIXES[path.parts[0]])
        if not allowed or PRIVATE_PATHS.search(name):
            failures.append((name, 'file is outside the source allowlist'))
        file = root / name
        if file.is_symlink() or not file.is_file():
            failures.append((name, 'must be a regular source file'))
            continue
        raw = file.read_bytes()
        size += len(raw)
        try:
            content = raw.decode('utf-8')
        except UnicodeDecodeError:
            failures.append((name, 'binary file in source release'))
            continue
        if '\0' in content:
            failures.append((name, 'binary content in source release'))
        for label, pattern in PRIVATE_CONTENT.items():
            if pattern.search(content):
                failures.append((name, label))
        # Preserve third-party copyright contact details, but exclude account emails elsewhere.
        if name != 'public/third-party-notices.txt' and re.search(
                r'\b[\w.+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b', content):
            failures.append((name, 'email address outside third-party legal notice'))
        if path.suffix == '.json':
            try:
                value = json.loads(content)
                if isinstance(value, list) and any(isinstance(row, dict) and
                        'ts' in row and 'ms_played' in row for row in value):
                    failures.append((name, 'raw streaming history records'))
            except json.JSONDecodeError:
                failures.append((name, 'invalid JSON'))
    return failures, size


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, help='Review every file in a clean exported tree')
    args = parser.parse_args()
    root = args.directory.resolve() if args.directory else ROOT
    if args.directory:
        names = sorted(str(p.relative_to(root)) for p in root.rglob('*') if p.is_file() or p.is_symlink())
    else:
        names = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')[:-1]
    failures, size = review(root, names)
    print(f'Reviewed {len(names)} files, {size} bytes')
    for name, reason in failures:
        print(f'FAIL: {name}: {reason}')  # Never print matched secret/private values.
    if failures:
        return 1
    print('Publication source checks passed')
    return 0


if __name__ == '__main__':
    sys.exit(main())
