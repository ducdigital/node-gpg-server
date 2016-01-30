'use strict';
let GPGLib = require('./GPGLib');
let express = require('express');
let http = require('http');
let async = require('async');
let pgPromise = require('pg-promise')({});
let _ = require('lodash');

const PORT = 8010;

let conString = "postgres://vnfreenet@localhost/vnfreenet";
let app = express();

let coreApp = {
  verify: function (req, res, next) {
    let postId = _.toInteger(req.params.postId);
    let gpgIndex = _.toInteger(req.params.index);
    let query = "SELECT t.value as pgp_key, m.body as content FROM vfn_themes as t INNER JOIN vfn_messages as m ON t.id_member = m.id_member WHERE m.id_msg = ${postId} AND t.variable = 'cust_m'";

    if (postId < 1) {
      return next (new Error('Bad Param: postId'));
    }

    async.waterfall([
      function findDb (next) {
        app.db.one(query, {
          postId: postId
        }).then(function (result) {
          return next(null, result);
        }).catch(function (err) {
          return next(err);
        });
      },
      function parsePostData (postData, next) {
        let parsed = {};

        if (!app.gpg.isGoodPubKeyFormat(postData.pgp_key)) {
          return next(new Error('Public Key is incorrect format'));
        }

        parsed.publicKey = app.gpg.getCleanPublicKey(postData.pgp_key);
        parsed.signedMessages = app.gpg.parseBBCode(postData.content);

        return next(null, parsed);
      },
      function verifySignature (pData, next) {
        let signedMessage = _.get(pData, 'signedMessages['+gpgIndex+']');

        if (!signedMessage) {
          return next(new Error('No signed message found'));
        }

        return app.gpg.verify(pData.publicKey, signedMessage, next);
      }
    ], function done (err, gpgVerifyResult) {
      if (err) {
        res.status(406);
        return next(app.gpg.parseResult(err));
      }

      return res.json(app.gpg.parseResult(gpgVerifyResult));
    });
  },
  encrypt: function (req, res, next) {
    let userId = _.toInteger(req.params.userId);
    let message = req.query.message;
    let query = "SELECT t.value as pgp_key FROM vfn_themes as t WHERE t.id_member = ${userId} AND t.variable = 'cust_m'";

    if (userId < 1) {
      return next (new Error('Bad Param: userId'));
    }

    async.waterfall([
      function findDb (next) {
        app.db.one(query, {
          userId: userId
        }).then(function (result) {
          return next(null, result);
        }).catch(function (err) {
          return next(err);
        });
      },
      function parseData (postData, next) {
        let parsed = {};

        if (!app.gpg.isGoodPubKeyFormat(postData.pgp_key)) {
          return next(new Error('Public Key is incorrect format'));
        }

        parsed.publicKey = app.gpg.getCleanPublicKey(postData.pgp_key);

        return next(null, parsed);
      },
      function encrypt (parsed, next) {
        return app.gpg.encrypt(parsed.publicKey, message, next);
      }
    ], function (err, result) {
      console.log(err);
      res.send(result);
    });
  },
}

app.get('/verify/:postId/:index', coreApp.verify);
app.get('/verify/:postId', coreApp.verify);
/**
 * /encrypt/:userId?message={string}
 */
app.get('/encrypt/:userId', coreApp.encrypt);

async.parallel({
  DBConnection: function (next) {
    return next(null, pgPromise(conString));
  },
  GPG: function (next) {
    let gpgLib = new GPGLib({
      tempKeyPath: __dirname + '/tmp/'
    });

    return next(null, gpgLib);
  },
  Server: function (next) {
    console.info('[x] Server started @ ' + PORT + '...');
    let httpServer = http.createServer(app).listen(PORT);

    return next(null, httpServer);
  },
}, function done (err, result){
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.info('[x] App initialized');
  app.db = result.DBConnection;
  app.gpg = result.GPG;
});
