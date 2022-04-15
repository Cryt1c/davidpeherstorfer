---
title: 'Decrypt a JWT that was created by NextAuth.js in PHP'
date: '2022-04-15'
tags: ['webdev', 'nextjs', 'php']
draft: false
summary: 'I will explain how you can decrypt a JWT created through NextAuth.js in your backend PHP code'
---

## Introduction

In our company we have implemented a decoupled approach using Drupal in the backend and Next.js in the frontend. As an authentication library in the frontend we are leveraging NextAuth.js. This library handels the authentication in the frontend and provides an encrypted JWT.
We wanted to speed up our behat tests which are written in PHP. These are comprised of a lot of authenticated user workflows. There we wanted to generate the JWT in behat directly to prevent having to call the frontend each time. This should give us a significant reduction in testing time. This article will show how you can decrypt the JWT in PHP using the same secret as the frontend uses.

## Approach

To decrypt the token and get it's payload we are leveraging the [jwt-framework]https://github.com/web-token/jwt-framework which provides all necessary functions.
You need to run `composer require web-token/jwt-framework` before you are able to use the following code.

Starting out from the examples of the jwt-framework I had to adapt the algorithm to use the direct encryption which is also used in NextAuth.js.
Additionally, after my secret did not seem to work I checked the frontend library code and found the part where the [hkdf](https://github.com/nextauthjs/next-auth/blob/fd755bc29e6dea318429bec819eebcaecbdf7529/packages/next-auth/src/jwt/index.ts#L114) function is called. It turns out PHP provides the same functionality in the [standard](https://www.php.net/manual/de/function.hash-hkdf.php) with the same arguments which we integrated into code.

```php
<?php

use Jose\Component\Encryption\Algorithm\ContentEncryption\A256GCM;
use Jose\Component\Encryption\Algorithm\KeyEncryption\Dir;
use Jose\Component\Encryption\Serializer\JWESerializerManager;
use Jose\Component\Encryption\Serializer\CompactSerializer;
use Jose\Component\KeyManagement\JWKFactory;
use Jose\Component\Core\AlgorithmManager;
use Jose\Component\Encryption\Compression\CompressionMethodManager;
use Jose\Component\Encryption\Compression\Deflate;
use Jose\Component\Encryption\JWEDecrypter;

$autoloader = require_once 'autoload.php';

// The secret that is used in NextAuth.js
$secret = "THISISASECRET";

// The token we want to decrypt
$token = "eyJhbG...";


// The key encryption algorithm manager with the A256KW algorithm.
$keyEncryptionAlgorithmManager = new AlgorithmManager([
  new Dir(),
]);

// The content encryption algorithm manager with the A256CBC-HS256 algorithm.
$contentEncryptionAlgorithmManager = new AlgorithmManager([
  new A256GCM(),
]);

// The compression method manager with the DEF (Deflate) method.
$compressionMethodManager = new CompressionMethodManager([
  new Deflate(),
]);

// We instantiate our JWE Decrypter.
$jweDecrypter = new JWEDecrypter(
  $keyEncryptionAlgorithmManager,
  $contentEncryptionAlgorithmManager,
  $compressionMethodManager
);

// This hkdf function is also run in the NextAuth.js library when using the secret
$encrypted_key = hash_hkdf(
  'sha256',
  $secret,
  32,
  $info = "NextAuth.js Generated Encryption Key",
  ""
);

$jwk = JWKFactory::createFromSecret(
  $encrypted_key
);

// The serializer manager. We only use the JWE Compact Serialization Mode.
$serializerManager = new JWESerializerManager([
  new CompactSerializer(),
]);



// We try to load the token.
$jwe = $serializerManager->unserialize($token);

// We decrypt the token. This method does NOT check the header.
$success = $jweDecrypter->decryptUsingKey($jwe, $jwk, 0);

$payload = $jwe->getPayload();
```

### Next steps

In the end we have decrypted the JWT and `$payload` contains the payload as a JSON string in plaintext. The next step will be to find out how we can encrypt our payload using the secret from the frontend in PHP so that NextAuth.js will accept it and we can successfully authenticate the user from our backend.
