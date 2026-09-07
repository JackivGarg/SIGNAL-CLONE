#!/usr/bin/env bash
set -euo pipefail

domain="${1:?Usage: provision-vm.sh <public-domain>}"
repository_url="https://github.com/JackivGarg/SIGNAL-CLONE.git"
application_dir="/opt/signal-clone"

if [[ ! -d "${application_dir}/.git" ]]; then
  git clone "${repository_url}" "${application_dir}"
else
  git -C "${application_dir}" pull --ff-only origin main
fi

cd "${application_dir}"
install -d -o 10001 -g 10001 data backups

if [[ ! -f .env ]]; then
  application_secret="$(openssl rand -hex 32)"
  install -m 0600 /dev/null .env
  printf 'APP_DOMAIN=%s\nPUBLIC_ORIGIN=https://%s\nAPP_SECRET=%s\nDEMO_OTP=123456\n' \
    "${domain}" "${domain}" "${application_secret}" > .env
fi

docker compose -f compose.production.yml up -d --build
install -m 0644 deploy/signal-backup.cron /etc/cron.d/signal-backup
systemctl enable --now cron
docker compose -f compose.production.yml ps
