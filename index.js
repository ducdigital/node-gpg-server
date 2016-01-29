'use strict';
var GPGLib = require('./GPGLib');
var fs = require("fs");
var http = require('http');

var publicKey1 = `
-----BEGIN PGP PUBLIC KEY BLOCK-----

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
4GcfXGZ30g5/trk9NIw=
=kXtJ
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

var gpgLib = new GPGLib({
  tempKeyPath: __dirname + '/tmp/'
});

http.createServer(function (req, res) {
  return gpgLib.verify(publicKey1, signedMessage1, function (err, result) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    if (!!err) {
      res.write(JSON.stringify(gpgLib.parse(err)));
    } else {
      res.write(JSON.stringify(gpgLib.parse(result)));
    }

    res.end();
  });
}).listen(8010);
