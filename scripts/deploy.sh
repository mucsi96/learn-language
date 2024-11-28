#!/bin/sh

set -e  # Exit immediately if a command exits with a non-zero status

terraform plan -out=tfplan
terraform apply -auto-approve tfplan
