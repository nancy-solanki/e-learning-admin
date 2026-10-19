#!/usr/bin/env bash
set -euo pipefail

image=${1:?Usage: bash scripts/smoke-container.sh IMAGE}
container_id=''
work_dir=$(mktemp -d)
cleanup() {
  if [[ -n "$container_id" ]]; then
    docker logs "$container_id"
    docker rm -f "$container_id" > /dev/null
  fi
  rm -rf "$work_dir"
}
trap cleanup EXIT

container_id=$(docker run --detach --publish 127.0.0.1::8080 "$image")
port=$(docker port "$container_id" 8080/tcp | cut -d: -f2)
origin="http://127.0.0.1:$port"
curl --fail --silent --show-error --retry 20 --retry-all-errors --retry-delay 1 --max-time 5 "$origin/healthz" > "$work_dir/health"
[[ $(cat "$work_dir/health") == ok ]]
[[ $(docker exec "$container_id" id -u) != 0 ]]
curl --fail --silent --show-error "$origin/" > "$work_dir/index"
curl --fail --silent --show-error "$origin/users" > "$work_dir/deep-link"
cmp "$work_dir/index" "$work_dir/deep-link"
for path in /api /api/v1/users/me/ /assets/missing.js; do
  [[ $(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$origin$path") == 404 ]]
done
asset=$(sed -n 's/.*src="\([^" ]*\/assets\/[^" ]*\.js\)".*/\1/p' "$work_dir/index" | head -n 1)
[[ -n "$asset" ]]
curl --fail --silent --show-error "$origin$asset" > /dev/null
printf 'Container health, non-root user, SPA fallback, API isolation, and assets passed.\n'
