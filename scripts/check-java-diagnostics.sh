#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
JDTLS_DIR="$PROJECT_DIR/.jdtls"
CONFIG_FILE="$PROJECT_DIR/.lsp-config.json"
WORKSPACE_DIR="/tmp/jdtls-workspace-$(echo "$PROJECT_DIR" | md5sum | cut -d' ' -f1)"
JDTLS_URL="https://download.eclipse.org/jdtls/snapshots/jdt-language-server-latest.tar.gz"

download_jdtls() {
  if [ -d "$JDTLS_DIR/plugins" ]; then
    return 0
  fi

  echo "Downloading Eclipse JDT Language Server..."
  mkdir -p "$JDTLS_DIR"
  curl -fSL "$JDTLS_URL" | tar xz -C "$JDTLS_DIR"
  echo "JDT Language Server downloaded."
}

get_platform_config() {
  case "$(uname -s)" in
    Linux*) echo "config_linux" ;;
    Darwin*)
      case "$(uname -m)" in
        arm64) echo "config_mac_arm" ;;
        *) echo "config_mac" ;;
      esac ;;
    *) echo "config_linux" ;;
  esac
}

create_lsp_config() {
  local platform_config launcher
  platform_config="$(get_platform_config)"
  launcher="$(find "$JDTLS_DIR/plugins" -name 'org.eclipse.equinox.launcher_*.jar' | head -1)"

  if [ -z "$launcher" ]; then
    echo "ERROR: Equinox launcher JAR not found in $JDTLS_DIR/plugins/" >&2
    exit 1
  fi

  cat > "$CONFIG_FILE" << ENDOFCONFIG
{
  "servers": [
    {
      "id": "jdtls",
      "extensions": [".java"],
      "rootPatterns": ["pom.xml", "build.gradle", "build.gradle.kts"],
      "command": [
        "java",
        "-Declipse.application=org.eclipse.jdt.ls.core.id1",
        "-Dosgi.bundles.defaultStartLevel=4",
        "-Declipse.product=org.eclipse.jdt.ls.core.product",
        "-Xmx1G",
        "--add-modules=ALL-SYSTEM",
        "--add-opens", "java.base/java.util=ALL-UNNAMED",
        "--add-opens", "java.base/java.lang=ALL-UNNAMED",
        "-jar", "$launcher",
        "-configuration", "$JDTLS_DIR/$platform_config",
        "-data", "$WORKSPACE_DIR"
      ]
    }
  ]
}
ENDOFCONFIG
}

cleanup() {
  npx -y cli-lsp-client --config-file "$CONFIG_FILE" stop 2>/dev/null || true
}
trap cleanup EXIT

download_jdtls
create_lsp_config

npx -y cli-lsp-client --config-file "$CONFIG_FILE" stop 2>/dev/null || true
echo "Starting LSP daemon..."
npx -y cli-lsp-client --config-file "$CONFIG_FILE" start

echo "Running diagnostics on Java files..."
echo ""

has_errors_or_warnings=0

while IFS= read -r -d '' java_file; do
  output=""
  exit_code=0
  output=$(npx -y cli-lsp-client --config-file "$CONFIG_FILE" diagnostics "$java_file" 2>&1) || exit_code=$?

  if [ -n "$output" ] && [ "$exit_code" -ne 1 ]; then
    relative="${java_file#"$PROJECT_DIR"/}"
    echo "--- $relative ---"
    echo "$output"
    echo ""

    if echo "$output" | grep -qiE "^(ERROR|WARNING) "; then
      has_errors_or_warnings=1
    fi
  fi
done < <(find "$PROJECT_DIR/server/src" -name "*.java" -type f -print0 | sort -z)

if [ "$has_errors_or_warnings" -eq 1 ]; then
  echo "Diagnostics with errors or warnings found."
  exit 1
else
  echo "No errors or warnings found."
  exit 0
fi
