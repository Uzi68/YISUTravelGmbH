#!/usr/bin/env bash
set -euo pipefail

HOST="home511037246.1and1-data.host"
PORT="22"
USER="u75950685"
REMOTE_DIR="/clickandbuilds/YisuTravel"
LOCAL_DIR="dist/yisu-travel/browser"
SSH_KEY="${HOME}/.ssh/id_yisu_deploy"

if ! command -v lftp >/dev/null 2>&1; then
  echo "lftp is required. Install it (e.g. sudo apt-get install lftp) and retry."
  exit 1
fi

if [ ! -d "$LOCAL_DIR" ]; then
  echo "Local build directory not found: $LOCAL_DIR"
  echo "Run: npm run build"
  exit 1
fi

if [ ! -f "$SSH_KEY" ]; then
  echo "SSH key not found: $SSH_KEY"
  echo "Generate it with: ssh-keygen -t ed25519 -f $SSH_KEY -C \"yisu-deploy\""
  exit 1
fi

echo "Uploading $LOCAL_DIR to sftp://$USER@$HOST:$PORT$REMOTE_DIR"

lftp <<EOF
set cmd:fail-exit yes
set net:timeout 20
set sftp:auto-confirm yes
set sftp:connect-program "ssh -a -x -i $SSH_KEY -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=$HOME/.ssh/known_hosts -p $PORT"
open -u "$USER" -p "$PORT" "sftp://$HOST"
mirror -R --delete --verbose "$LOCAL_DIR" "$REMOTE_DIR"
bye
EOF
