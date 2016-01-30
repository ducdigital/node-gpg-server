'use strict';
var gpg = require('gpg');
var async = require('async');
var crypto = require('crypto');

var GPG = function (options) {
    options.tempKeyPath = options.tempKeyPath || __dirname + '/tmp/';
    options.defaultArgs = ['--with-colons', '--status-fd', '1'].concat(Array.isArray(options) ? options : []);
    // Constant
    const beginPubKey = '-----BEGIN PGP PUBLIC KEY BLOCK-----';
    const endPubKey = '-----END PGP PUBLIC KEY BLOCK-----';
    const gpgBBCODERegex = /\[gpg]([^]+?)\[\/gpg]/ig;

    // Private Methods
    var createPubKeyHash;
    var replaceAll;

    // Public Methods
    var verify;
    var encrypt;
    var parseResult;
    var isGoodPubKeyFormat;
    var getCleanPublicKey;
    var parseBBCode;

/*******************************************************************************
 * Private Methods
 ******************************************************************************/

    createPubKeyHash =  function (pubkey) {
      return crypto.createHash('sha1').update(pubkey).digest('hex');
    };

    replaceAll = function (str, find, replace) {
      return str.replace(new RegExp(find, 'g'), replace);
    };

/*******************************************************************************
 * Pubic Methods
 ******************************************************************************/
    verify = function (publicKey, signedMessage, cb) {
      async.waterfall ([
        function hash (next) {
            let hash = createPubKeyHash(publicKey);
            let tmpKeyRing = options.tempKeyPath + hash + '.gpg';
            return next(null, tmpKeyRing);
        },
        function importKey (tmpKeyRing, next) {
          gpg.importKey (publicKey,
            options.defaultArgs.concat(['--no-default-keyring', '--keyring', tmpKeyRing]),
            function (err, importResult) {
              if (err) {
                return next(err, tmpKeyRing);
              }

              return next(null, tmpKeyRing);
          });
        },
        function verifySignature (tmpKeyRing, next) {
          gpg.verifySignature(signedMessage,
            options.defaultArgs.concat(['--no-default-keyring', '--keyring', tmpKeyRing]),
            function (err, result) {
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

    encrypt = function (publicKey, message, cb) {
      async.waterfall ([
        function hash (next) {
            let hash = createPubKeyHash(publicKey);
            let tmpKeyRing = options.tempKeyPath + hash + '.gpg';
            return next(null, tmpKeyRing);
        },
        function importKey (tmpKeyRing, next) {
          gpg.importKey (publicKey,
            options.defaultArgs.concat(['--no-default-keyring', '--keyring', tmpKeyRing]),
            function (err, importResult) {
              if (err) {
                return next(err, tmpKeyRing);
              }

              return next(null, parseResult(importResult), tmpKeyRing);
          });
        },
        function encryptMessage (importResult, tmpKeyRing, next) {
          if (!importResult.importOK) {
            return next(new Error('Key error'));
          }

          gpg.encrypt(message,
            options.defaultArgs.concat(['--no-default-keyring', '--always-trust', '--armor', '--keyring', tmpKeyRing, '-r', importResult.id]),
            function (err, result) {
              if (err) {
                return next(err, tmpKeyRing);
              }

              return next(null, tmpKeyRing, result);
          });
        },
        function extractEncryptText (tmpKeyRing, result, next) {
          let beginPart = '-----BEGIN PGP MESSAGE-----';
          let endPart = '-----END PGP MESSAGE-----';
          let encryptedMsg = result.toString();
          let data = encryptedMsg.substring(
            encryptedMsg.lastIndexOf(beginPart),
            encryptedMsg.indexOf(endPart)
          );
          return next(null, data+endPart);
        },
      ], function done(err, result) {
          return cb(err, result);
      });
    };

    parseResult = function (gpgResp) {
      if (!gpgResp || typeof gpgResp.toString !== 'function' || gpgResp instanceof Error) {
        return new Error('Bad param: malformed Public Key');
      }

      let returnData = {
        'sigType': [],
        'signatureData': [],
      };
      // console.log(gpgResp.toString());
      let filtered = gpgResp.toString()
      	.split('\n')
      	.filter(function(line){
      	   return line.indexOf('[GNUPG:]') > -1;
      	});

      if (filtered.length === 0) {
        return;
      }

      filtered.forEach(function (line) {
          line = line.replace('[GNUPG:] ', '');
          line = line.split(' ');
          if (line.length === 0) {
            return;
          }

          if (line[0] === 'SIG_ID') {
            returnData['id'] = line[1];
            returnData['dateStr'] = line[2];
            returnData['date'] = new Date(line[3]*1000);
            returnData['dateUnix'] = line[3];
          };

          if (line[0].indexOf('TRUST') > -1) {
            returnData['trust'] = line[0];
          }

          if (line[0].indexOf('SIG') > -1 && line[0] !== 'SIG_ID') {
            returnData.sigType.push(line[0]);
            returnData['signatureData'] = line.slice(1, line.length).join(' ');
          }

          if (line[0].indexOf('IMPORT_OK') > -1) {
            returnData.importOK = true;
            returnData.id = line[2];
          }
        });
      return returnData;
    };

    /**
     * Verify public key format
     */
    isGoodPubKeyFormat = function (pubKey) {
      let check = true;
      check = check && (pubKey.indexOf(beginPubKey) > -1);
      check = check && (pubKey.indexOf(endPubKey) > -1);

      return check;
    };

    getCleanPublicKey = function (pubKey) {
      return pubKey.substring(
        pubKey.lastIndexOf(beginPubKey),
        pubKey.indexOf(endPubKey)
      ) + endPubKey;
    };

    parseBBCode = function (postContent) {
      let br2nlStr = replaceAll(postContent, '<br />', '\n');
      let results = [];
      let matches;

      while (matches = gpgBBCODERegex.exec(br2nlStr+br2nlStr)) {
        results.push(matches[1]);
      }

      return results;
    };

/*******************************************************************************
 * Lib returns
 ******************************************************************************/
    return {
      verify: verify,
      encrypt: encrypt,
      parseResult: parseResult,
      isGoodPubKeyFormat: isGoodPubKeyFormat,
      getCleanPublicKey: getCleanPublicKey,
      parseBBCode: parseBBCode,
    };
};

module.exports = GPG;
