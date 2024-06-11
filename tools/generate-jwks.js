const { generateKeyPair } = require('jose');

async function generateJWK() {
  const { publicKey, privateKey } = await generateKeyPair('RS256', {
    modulusLength: 2048,
  });

  const jwkPublic = await importKey(publicKey);
  const jwkPrivate = await importKey(privateKey);

  console.log('Public JWK:', JSON.stringify(jwkPublic, null, 2));
  console.log('Private JWK:', JSON.stringify(jwkPrivate, null, 2));
}

async function importKey(key) {
  const { exportJWK } = require('jose');
  return await exportJWK(key);
}

generateJWK();