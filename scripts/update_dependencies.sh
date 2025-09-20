#!/bin/sh

set -e

# Update Ubuntu packages when running inside WSL Ubuntu
if [ "$(uname -s)" = "Linux" ] && [ -f /etc/os-release ]; then
    . /etc/os-release
    if [ "$ID" = "ubuntu" ]; then
        echo "Updating Ubuntu packages..."
        sudo apt-get update
        sudo apt-get upgrade -y
        sudo apt-get autoremove -y
        sudo apt-get autoclean -y

        update_apt_package() {
            package_name=$1
            display_name=$2
            if dpkg -s "$package_name" >/dev/null 2>&1; then
                echo "Updating $display_name..."
                sudo apt-get install -y "$package_name"
            else
                echo "$display_name is not installed, skipping."
            fi
        }

        if command -v az >/dev/null 2>&1; then
            if dpkg -s "azure-cli" >/dev/null 2>&1; then
                echo "Updating Azure CLI..."
                if ! sudo apt-get install --only-upgrade -y azure-cli; then
                    az upgrade --yes --all || true
                fi
            else
                echo "Azure CLI is not managed by apt, upgrading via az upgrade..."
                az upgrade --yes --all || true
            fi
        else
            echo "Azure CLI is not installed, skipping."
        fi
        update_apt_package "temurin-21-jdk" "Temurin JDK 21"
        update_apt_package "maven" "Maven"
        update_apt_package "python3" "Python 3"
        update_apt_package "python3-pip" "pip"
    fi
fi

if command -v snap >/dev/null 2>&1; then
    refresh_snap_package() {
        snap_name=$1
        display_name=$2
        if snap list "$snap_name" >/dev/null 2>&1; then
            echo "Refreshing $display_name snap..."
            sudo snap refresh "$snap_name"
        else
            echo "$display_name is not installed via snap, skipping snap refresh."
        fi
    }

    if command -v helm >/dev/null 2>&1; then
        refresh_snap_package helm "Helm"
    else
        echo "Helm is not installed, skipping."
    fi

    if command -v kubectl >/dev/null 2>&1; then
        refresh_snap_package kubectl "kubectl"
    else
        echo "kubectl is not installed, skipping."
    fi
fi

if command -v pip3 >/dev/null 2>&1; then
    echo "Updating pip..."
    pip3 install --upgrade pip
    echo "Updating Python project requirements..."
    pip3 install --upgrade -r requirements.txt
fi

if command -v az >/dev/null 2>&1; then
    echo "Ensuring Azure CLI extensions are up to date..."
    az extension list --query "[].name" -o tsv | while IFS= read -r extension; do
        [ -n "$extension" ] && az extension update --name "$extension"
    done
fi

if command -v npm >/dev/null 2>&1; then
    echo "Updating global Angular CLI..."
    npm_cmd=$(command -v npm)
    sudo env "PATH=$PATH" "$npm_cmd" install -g @angular/cli@latest

    if [ -d "client" ]; then
        echo "Updating client workspace dependencies..."
        (cd client && npm update)
    fi
fi

if [ -d "server" ] && command -v mvn >/dev/null 2>&1; then
    echo "Refreshing server Maven dependencies..."
    (cd server && mvn -U clean install)
fi

if command -v playwright >/dev/null 2>&1; then
    echo "Ensuring Playwright browsers are up to date..."
    sudo playwright install --with-deps chromium
fi

echo "Dependency update complete."
