import { createBuilder } from "@angular-devkit/architect";
import {
  executeDevServerBuilder,
  buildApplication,
} from "@angular-devkit/build-angular";
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

const TH_ENV_PATTERN =
  /<th:block[^>]*th:insert="~\{fragments\s*::\s*env\}"[^>]*>\s*<\/th:block>/i;

const KEY_VAULT_NAME = process.env.AZURE_KEY_VAULT_NAME ?? "p05";
const KEY_VAULT_URI = KEY_VAULT_NAME
  ? `https://${KEY_VAULT_NAME}.vault.azure.net`
  : undefined;

const SECRET_SOURCES = [
  {
    key: "tenantId",
    secretName: "tenant-id",
    fallbackEnv: "AZURE_TENANT_ID",
  },
  {
    key: "clientId",
    secretName: "learn-language-spa-client-id",
    fallbackEnv: "UI_CLIENT_ID",
  },
  {
    key: "apiClientId",
    secretName: "learn-language-api-client-id",
    fallbackEnv: "AZURE_CLIENT_ID",
  },
];

const BASE_ENV_VALUES = {
  mockAuth: false,
  production: false,
  apiContextPath: "/api",
};

let secretClient;
let envValuesPromise;

function getSecretClient(logger) {
  if (!KEY_VAULT_URI) {
    logger.warn(
      "Azure Key Vault name is not configured; falling back to environment variables."
    );
    return undefined;
  }

  if (!secretClient) {
    secretClient = new SecretClient(
      KEY_VAULT_URI,
      new DefaultAzureCredential()
    );
  }

  return secretClient;
}

async function resolveSecretValue(client, source, logger) {
  const fallback = process.env[source.fallbackEnv] ?? "";

  if (!client) {
    return fallback;
  }

  try {
    const secret = await client.getSecret(source.secretName);

    if (secret?.value) {
      return secret.value;
    }

    logger.warn(
      `Azure secret "${source.secretName}" is empty; falling back to ${source.fallbackEnv}.`
    );
  } catch (error) {
    logger.warn(
      `Failed to read Azure secret "${source.secretName}"; falling back to ${source.fallbackEnv}. Reason: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return fallback;
}

async function loadEnvValues(logger) {
  if (!envValuesPromise) {
    envValuesPromise = (async () => {
      const client = getSecretClient(logger);
      const secretEntries = await Promise.all(
        SECRET_SOURCES.map(async (source) => [
          source.key,
          await resolveSecretValue(client, source, logger),
        ])
      );

      const secrets = Object.fromEntries(secretEntries);

      return {
        ...BASE_ENV_VALUES,
        ...secrets,
      };
    })().catch((error) => {
      envValuesPromise = undefined;
      throw error;
    });
  }

  return envValuesPromise;
}

async function buildEnvScript(logger) {
  const envValues = await loadEnvValues(logger);

  const indent = "    ";
  const serializedEnv = JSON.stringify(envValues, null, 2).replace(
    /\n/g,
    `\n${indent}    `
  );

  return `${indent}<script type="module">\n${indent}  window.__env = ${serializedEnv};\n${indent}</script>`;
}

function createIndexTransform(logger) {
  return async (content) => {
    if (!TH_ENV_PATTERN.test(content)) {
      logger.warn(
        "<th:block> environment fragment not found in index.html; leaving content unchanged."
      );
      return content;
    }

    const envScript = await buildEnvScript(logger);

    return content.replace(TH_ENV_PATTERN, envScript);
  };
}

export default createBuilder((options, context) => {
  const transform = createIndexTransform(context.logger);

  if (context.target?.target === "serve") {
    context.logger.info("Custom builder is running in serve mode.");

    return executeDevServerBuilder(
      options,
      context,
      { indexHtml: transform },
      { builderSelector: () => "@angular/build:application" }
    );
  }

  if (context.target?.target === "build") {
    context.logger.info("Custom builder is running in build mode.");
    return buildApplication(options, context, {
      indexHtmlTransformer: transform,
    });
  }

  return buildApplication(options, context);
});
