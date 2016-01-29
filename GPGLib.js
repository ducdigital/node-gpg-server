'use strict';
var gpg = require('gpg');
var async = require('async');
var crypto = require('crypto');

var GPG = function (options) {
    options.tempKeyPath = options.tempKeyPath || __dirname + '/tmp/';
    options.defaultArgs = ['--with-colons', '--status-fd', '1'].concat(Array.isArray(options) ? options : []);
    // Private Methods
    var createPubKeyHash;

    // Public Methods
    var verify;
    var parse;

    createPubKeyHash =  function (pubkey) {
      return crypto.createHash('sha1').update(pubkey).digest('hex');
    };

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

    parse = function (gpgResp) {
      if (!gpgResp || typeof gpgResp.toString !== 'function') {
        return false;
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
        });
      return returnData;
    };

    return {
      verify: verify,
      parse: parse
    };
};

module.exports = GPG;
