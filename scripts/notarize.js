require('dotenv').config()
const { notarize } = require('@electron/notarize')

exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') return

  const required = ['APPLEID', 'APPLEIDPASS', 'TEAMID']
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing env var: ${key}`)
  }

  const appName = context.packager.appInfo.productFilename
  const appPath = `${context.appOutDir}/${appName}.app`

  console.log(`[NOTARIZE] ${appPath}`)

  await notarize({
    tool: 'notarytool',
    appBundleId: 'com.netsqlazman.gui',
    appPath,
    appleId:         process.env.APPLEID,
    appleIdPassword: process.env.APPLEIDPASS,
    teamId:          process.env.TEAMID,
  })
}
