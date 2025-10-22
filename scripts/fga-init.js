const { loadEnvConfig } = require("@next/env");
const { CredentialsMethod, OpenFgaClient } = require("@openfga/sdk");

loadEnvConfig(process.cwd());

async function main() {
  console.log("🚀 Seeding OpenFGA tuples...");

  const apiConfig = {
    apiUrl: process.env.FGA_API_URL || "https://api.us1.fga.dev",
    storeId: process.env.FGA_STORE_ID ?? "",
    credentials: {
      method: CredentialsMethod.ClientCredentials,
      config: {
        apiTokenIssuer:
          process.env.FGA_API_TOKEN_ISSUER || "auth.fga.dev",
        apiAudience:
          process.env.FGA_API_AUDIENCE || "https://api.us1.fga.dev/",
        clientId: process.env.FGA_CLIENT_ID,
        clientSecret: process.env.FGA_CLIENT_SECRET,
      },
    },
  };

  if (!apiConfig.storeId) {
    throw new Error("FGA_STORE_ID is required to seed tuples.");
  }

  const fgaClient = new OpenFgaClient(apiConfig);

  const { authorization_model_id: authorizationModelId } =
    await fgaClient.writeAuthorizationModel({
      schema_version: "1.1",
      type_definitions: [
        { type: "user" },
        {
          type: "doc",
          relations: {
            viewer: {
              this: {},
            },
          },
          metadata: {
            relations: {
              viewer: {
                directly_related_user_types: [
                  {
                    type: "user",
                    wildcard: {},
                  },
                ],
              },
            },
          },
        },
      ],
    });

  console.log(`✅ Authorization model created: ${authorizationModelId}`);

  const tuples = [
    {
      user: "user:*",
      relation: "viewer",
      object: "doc:public-doc",
    },
  ];

  await fgaClient.write({ writes: tuples });

  console.log("✅ Successfully seeded tuples:");
  console.log(JSON.stringify(tuples, null, 2));
}

main().catch((error) => {
  console.error(
    "❌ Failed to seed OpenFGA tuples:",
    error.responseData || error,
  );
  process.exit(1);
});
