import { readFileSync } from 'fs'
import { SignJWT, importPKCS8 } from 'jose'

// Usage:
// 1) Install: npm i jose
// 2) Set env vars (PowerShell):
//    $env:APPLE_TEAM_ID="<TEAM_ID>"
//    $env:APPLE_KEY_ID="<KEY_ID>"
//    $env:APPLE_PRIVATE_KEY_PATH="C:\\path\\to\\AuthKey_<KEY_ID>.p8"
// 3) Run: node scripts/generate-musickit-token.mjs
// 4) Copy the printed token into .env as VITE_MUSICKIT_TOKEN

const teamId = process.env.APPLE_TEAM_ID
const keyId = process.env.APPLE_KEY_ID
const keyPath = process.env.APPLE_PRIVATE_KEY_PATH

if (!teamId || !keyId || !keyPath) {
  console.error('Set APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY_PATH environment variables before running.')
  process.exit(1)
}

const pkcs8 = readFileSync(keyPath, 'utf8')
const privateKey = await importPKCS8(pkcs8, 'ES256')

const jwt = await new SignJWT({})
  .setProtectedHeader({ alg: 'ES256', kid: keyId })
  .setIssuedAt()
  .setExpirationTime('180d') // Apple allows up to 6 months for developer tokens
  .setIssuer(teamId)
  .sign(privateKey)

console.log(jwt)