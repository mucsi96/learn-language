#!/usr/bin/env bash

set -e  # Exit immediately if a command exits with a non-zero status

KUBECONFIG=$(az keyvault secret show --vault-name p06 --name db-namespace-k8s-user-config --query value -o tsv)

kubectl port-forward services/postgres1 5461:http --namespace db
