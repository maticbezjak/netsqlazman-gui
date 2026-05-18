require('dotenv').config()
const { execFileSync } = require('child_process')

exports.default = async function (configuration) {
  const file = configuration.path

  const required = [
    'AZURE_KEY_VAULT_URL',
    'AZURE_CLIENT_ID',
    'AZURE_CLIENT_SECRET',
    'AZURE_TENANT_ID',
    'AZURE_CERT_NAME',
  ]
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing env var: ${key}`)
  }

  console.log(`[SIGN] ${file}`)

  execFileSync('AzureSignTool', [
    'sign',
    '--azure-key-vault-url',             process.env.AZURE_KEY_VAULT_URL,
    '--azure-key-vault-client-id',       process.env.AZURE_CLIENT_ID,
    '--azure-key-vault-client-secret',   process.env.AZURE_CLIENT_SECRET,
    '--azure-key-vault-tenant-id',       process.env.AZURE_TENANT_ID,
    '--azure-key-vault-certificate',     process.env.AZURE_CERT_NAME,
    '--timestamp-rfc3161', process.env.TIMESTAMP_URL || 'http://timestamp.digicert.com',
    file,
  ], { stdio: 'inherit' })
}
