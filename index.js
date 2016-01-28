'use strict';
var gpg = require('gpg');
var async = require('async');
var crypto = require('crypto');
var fs = require("fs");
var http = require('http');

var tempKeyPath = __dirname + '/tmp/';
var publicKey1 = `
-----BEGIN PGP PUBLIC KEY BLOCK-----
Comment: GPGTools - https://gpgtools.org

mQENBFVsjloBCACfhbQ7HwMqTeMNsGJTf6GYNG/21WqZT2+TfWbtf9f69BTlV53W
8DKFEEMHWw+Tq8yURN5hWR+s/BH3wRlfvLyWmThm7Z6c6Py/bcDAmnRirPtXLOU6
dE0Pmr5N9uMHZpZoOrtSpZUbsY9qi0q3yZHZKJPe/+tMScDUKRApjvLGrf2HtyZK
6ojngWhBpLrlAFzGvftyqjp54S4EXyg04zvuHs6t57MwfoFA0k48vINm5ESingo+
uHpq+ApUhfsvyVRLIGrMITsLL6yp4EFzDjO50mivnJ9nWkKQclCx/9XfdorzbyvG
MNZdBjMwizdWFzV+XaEEnm1avIWQavMMje9FABEBAAG0Rk5vZGUtR1BHIFRlc3Qg
S2V5IChLZXlwYWlyIHVzZWQgZm9yIG5vZGUtZ3BnIHRlc3RpbmcuKSA8dGVzdEB0
ZXN0LmNvbT6JATcEEwEKACEFAlVsjloCGwMFCwkIBwMFFQoJCAsFFgIDAQACHgEC
F4AACgkQgzdEOG8g9Z1YvQf7BtJkD9AntsVrIN16lTJCWOoTXUC4iDaWfpe4UF11
W+OfWdDrAUC7JFDwTiWMn86oaXMeX2NnP5ve2VYQA3aCw7uW8u3tySeC7cCfwkAM
eBlLbZiv+lYUzN99oRhTx6EmYBa/g8Y8VVgj/kJb8yRfBsVHI5wqlvJOdqATiGUh
dmsuaPvS3blPB0S2obE/2ix1hM9rMERyns8zII7QS5+dkZmcblVK/ltCw6ikHZtY
vSQjw3hMFvIgiChHLKK0BQ5iEuECSA6fsLbMrQQCjsFgV9QmsHKuV6AFd0XDUr+Q
XCeNVAqPmu8NbRiFKOjE41Vqy2bEDRHGhD98eHjvQzNAEbkBDQRVbI5aAQgArIuo
jfSFLw7h2dJhdfwXVSW2CpJo7ubkif222W64N93m0ZeOKb1nv9lT+qr7Hcpbf8uk
wFkONtldHiW+H9W0fC+wctIWYTQhrwVrpUAIjuxATAXqLS/45mEU63tZL6Gkl2IJ
ItQM9BdZLLnkv+hCYLic20CDbv0EoWO70efMLkAJXhmlkLbivE2jdqKqish/1z5R
lRJFJOWob8jdzFbHh3F69zvxEjsYPw/vr27W4+ZtLwprJVbMs3wdS+d5DD1IryZx
F2kHRPmj35eBaz6evDm2NRzVfTbssOQhVWs0eU6QJwQDKj+VGXvGvr+ZvW60eTge
jD63wIHDKfYRH9OqiwARAQABiQEfBBgBCgAJBQJVbI5aAhsMAAoJEIM3RDhvIPWd
m1MH/jK3nvmyuhDZ9rZwizxYFh0BNTgZKRMn2FHMrQYTDo2rwLbKEBC9/6BXQH3A
kz+sNTiDYlY2osUvRfmOVku3QdaN2oloGbbYuym0ZnwI/dhqwZhYL7gLasW8ZAgu
uFOKCo5auY1MjvMjC2Mn14r/f4fYYFoqEYQmKSvLmFktcPou8E4w/qkd+8tKK4xv
fCbJGjoZdRQI2Rflz8mfC3B9NXvePW/wgYXNDck9JG6ARqWrozxy+VXcHSN4HyDZ
jn9fF4Fx706Lp/saiasNl97czOR0WXAsjTBSFPZp3HCRJ/b2TW/SVsLFk4Pto/xJ
IwSJ9sM2NALLnqPcAHMJaACPw6s=
=rxX0
-----END PGP PUBLIC KEY BLOCK-----
`;

var signedMessage1 = `
-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA512

Testing GPG Key signing
-----BEGIN PGP SIGNATURE-----

iQF8BAEBCgBmBQJWpmRuXxSAAAAAAC4AKGlzc3Vlci1mcHJAbm90YXRpb25zLm9w
ZW5wZ3AuZmlmdGhob3JzZW1hbi5uZXQxNjlCNEVDNTdFMDAwNEYxRkZCQTNGOEND
MUY3N0IxQTJGNEE2RTM5AAoJEMH3exovSm45ewwIAIlYcto/WyuVXE478OPQnQA2
VrCB4Z/dqkNEP3Jpko6Qlp4Ud95XERxZkgHC2AE2D6UiwdZOGv/nDoopiAmPfms+
7cnB7EkM4yZOQHbcNBw87uSzrnevljFIHyNy8/Exngkckn3HTLfApMdBhhHlL7Y1
8m7svs720zInVPqek11UwyXpjJ0qVPq+HIj2cM7O2h9SxYMbv1zhRe4MD51Lu1Pe
b0GvMYMxBcYTqdpk04hP2DGoMaLuLSoUSTQ3HmuY5iUgPj2/HUVmL4XKyf7kcGTO
pBCh7uhYBVfY99Zu/9KsJ9lTlcB1AUhz8JkIZb+pTmqoZbhb3RR0V+b3lStravU=
=/8NV
-----END PGP SIGNATURE-----
`;










var createRandomHash = function () {
  var current_date = (new Date()).valueOf().toString();
  var random = Math.random().toString();
  return crypto.createHash('sha1').update(current_date + random).digest('hex');
}

var createPubKeyHash = function (pubkey) {
  return crypto.createHash('sha1').update(pubkey).digest('hex');
}

var GPGVerify = function (publicKey, signedMessage, cb) {
  async.waterfall ([
    function hash (next) {
        let hash = createPubKeyHash(publicKey);
        let tmpKeyRing = tempKeyPath + hash + '.gpg';
        return next(null, tmpKeyRing);
    },
    // function createTempFile (tmpKeyRing, next) {
    //   fs.open(tmpKeyRing, "wx", function (err, fd) {
    //     if (!!err) {
    //       return next(err, tmpKeyRing);
    //     }
    //     fs.close(fd, function (err) {
    //       if (!!err) {
    //         return next(err, tmpKeyRing);
    //       }
    //       next(null, tmpKeyRing);
    //     });
    //   });
    // },
    function importKey (tmpKeyRing, next) {
      gpg.importKey (publicKey, ['--no-default-keyring', '--keyring', tmpKeyRing], function (err, importResult) {
        if (err) {
          return next(err, tmpKeyRing);
        }

        return next(null, tmpKeyRing);
      });
    },
    function verifySignature (tmpKeyRing, next) {
      gpg.verifySignature(signedMessage, ['--no-default-keyring', '--keyring', tmpKeyRing], function (err, result) {
        if (err) {
          return next(err, tmpKeyRing);
        }

        return next(null, tmpKeyRing, result);
      });
    }
  ], function done(err, tmpKeyRing, result) {
      return cb(err, result);
  });
};

http.createServer(function (req, res) {
  return GPGVerify(publicKey1, signedMessage1, function (err, result) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    if (!!err) {
      console.log(err);
      res.write(err.toString());
    } else {
      res.write(result);
    }

    res.end();
  });
}).listen(8010);
