# NetSqlAzMan Manager — Claude Instructions

## Releases
- After every `git tag vX.Y.Z && git push origin vX.Y.Z`, always run `gh release edit vX.Y.Z --notes '...'` to add a changelog before wrapping up.
- If a release is stuck as **Draft**, run `gh release edit vX.Y.Z --draft=false` to publish it.
- Release naming: tags → `vX.Y.Z`, build numbers on master pushes → `X.Y.Z.{BuildId}` (artifact only, no GitHub release).

## Pipeline
- Three stages: Windows (windows-latest), macOS (Mac Mini self-hosted), Linux (ubuntu-latest).
- Signing: Windows via AzureSignTool + Key Vault, macOS via Keychain on Mac Mini + notarize.
- Secrets in `deploy-vault-secrets` variable group (linked to MantoElectron Key Vault, dash-separated names e.g. `GH-TOKEN`).
- Tag push → `PUBLISH_FLAG=always` → publishes to GitHub Releases + triggers auto-update on clients.
- Master push → `PUBLISH_FLAG=never` → artifact only.

## DB
- MCP SQL server at `C:\GIT\MCP_SQL` (dev: 192.168.87.91:1434, sa).
- `dbo.Zaposleni` employee table: key columns `UserName`, `Ime`, `Priimek`.
- AzMan stored procedures: `GetAzmanGroups`, `GetAzmanGroupsForUser`, `GetAzmanOperationsForUser`, `GetAzmanRolesForUser`.
