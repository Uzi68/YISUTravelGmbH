# Deploy + SSH Key Setup

## 1) One-click deploy (Windows)

From Windows Explorer, double-click:
- `scripts\deploy.bat`

Optional: if you have multiple WSL distros, pass the distro name:
- `scripts\deploy.bat Ubuntu-22.04`

PowerShell alternative:
- `powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1 -Distro Ubuntu-22.04`

This runs:
- `npm run deploy` inside WSL
- which runs `ng build` + uploads via SFTP

## 2) SSH key setup (no password prompt)

### Generate a dedicated key in WSL
```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_yisu_deploy -C "yisu-deploy"
```

### Start SSH agent and add the key
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_yisu_deploy
```

### Copy the public key
```bash
cat ~/.ssh/id_yisu_deploy.pub
```

Copy the full output and add it in your 1&1 / IONOS control panel:
- "SSH Keys" or "SFTP/SSH"
- Add the key for user `u75950685`

### Update SSH config (optional, recommended)
Create or edit `~/.ssh/config` in WSL:
```text
Host yisu-deploy
  HostName home511037246.1and1-data.host
  User u75950685
  Port 22
  IdentityFile ~/.ssh/id_yisu_deploy
```

If you use the config above, you can switch the deploy script to use `yisu-deploy`
and you will no longer get a password prompt.

## 3) Verify
```bash
npm run deploy
```

If the key is installed correctly, no password prompt should appear.
