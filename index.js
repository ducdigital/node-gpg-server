'use strict';
let GPGLib = require('./GPGLib');
let express = require('express');
let http = require('http');
let async = require('async');
let pgPromise = require('pg-promise')({});
let _ = require('lodash');

const DB_CONFIG = require('./dbConnection.json');
const PORT = 8010;
const IMG = {
  OK: `R0lGODlhEAAQAHcAACH5BAEAAAAALAAAAAAQABAApwEAACyRKP///0jHGaThXUvOHkvNHqbhXiKZDVDQH63heVHQHwBmAABkAAh8AkzPH1DRH6fdbc/slnjCUiqjDtTvl0XJHSFuISGAITGuD6bhX9XumgBgADOxES+0DpbaTaLhX7nzcxKHCqbgXsfeyXrNSTnADbDmZkjJFU7PH07LFL7awWC4T03NHWC6SDOoI0OzKli1SGDQJeby6qjkYXLYLmfZJ63lY0/SILXldlrMGTC/AMzqlDiqJjrACzGnJiaoErPkgTvBFFTPE3+/dOvy7mfTJEm2OrfVvNLqzqnqZ6rjYlbQG0THGaviY+jy7lPPHJ/gV1yyWLzWv3DCXVTSH9fwnQl5A7fkk//4/07QH6XhW9Ts0NXvnFDOH+Xw6lHPH0LCCpXbTP/x/5fcTi2oG8/rlknOHtnu1tft00y2LaXeYdn2pa3ucD3BB9XzoDK7CrfxdWnYJNfxnaTVqdPrz83vmLzdv8zrlsnpkk7SH5XaTFjSHlnTHtTvnDSoI163TdPr0DWoIx6gC2LWGFXPGw+ACqTdY6HSnafpZGXZJFfUIErNHkavNwBoAK/jb//6/6vlYf/7/7roiGW8YaXhXp7nY6PgW0bGE03OHqXgXqnnYqbiYFPRIOz08i+sHKTiXQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAj+AAEIFBjgQoMGFwIMXAiAQ4AKGyRI2FAhAAeGASJY6WKGRx48fuZEUCiQgYI3OZaMOHBA04lHdhQwEDiBDYgolwjojETGBRUsEwAEmLQJFCcNGird2APoiwBKQQJgUEJDzJY1h5x8YPFEQBIYiTBciVOCiBojNXTEmCGgzg8ZIRyJsCRlDBIPO454EsDlhRs5bQw5UFRmShYSdIoICPQnDKEhNhwEYKJi0ApJkASkEeSjDxQ+hRQOWIQJyB0BaHqYwHGmRZUBAhEk6ITiE6JGQvQUYAQmAYKBAyAs8AKniZZMKRZAgL2QgoUHBQwYKPDAAgWGAwN0yJChA8mBAQEAOw==`,
  FAIL:
  `R0lGODlhEAAQAGYAACH5BAEAAAAALAAAAAAQABAApgEAAMgJDOICB9QLDvURE/coG/YcFfhAJv+dg/MNEb8DCftHL/YkGfQNEfgRE/QYFfclGv5vWfUnGvUkGftoU7oGCfQbFcUzNf+ljvUxHfpoVP6KaeQLD/+xmf6FZcMBB/+3nv2JbP11WvYlGL4GCfcZFOIEC/QQEtUPD/cREvYNEuoWE/xzWf5yWPx4Xe46P/tvV/kaFvx9dM4HDfY1H/6GZ9sCCf18Yu0hIfk+JPg9JOkdFu4WFPk9QK0FB8EEC/x5X9ACB/UZFb8FCuoIEfxyWOcgGP+4ofc0HvxWOf+3ofY2H8YABqgEBvg4IPknGt8GC+kiItsFCuQVE+4YFOkFDdkHDesiGfgdFvY6JPx6XvU2I98GDe8qHewiGb0ECflAJeoCCfuAc/AgFuRuZesFC/6BZe0FDPteQMcCCdYBCfx3XswMDux7b/99Y/x7YOkfGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfPgACCggJhJiYCAoOLAGUvSh0YGB1HF0yMAmIgIR4bGx4hIG0fg2cyLm8wRINVNVpkpAA9CGtAaFmLOGYIFwBSNyxRSQcHW4tcLG5QNkUialM5OmBdiyItQVYUEYJXTjRLXoMRFD8zGguDRhkZSHCCCxppCiMFizsFEhIoXwUjCiQQGAxZNGbChCcoGEAgAWCFASxsFlExYMGCgRWCApQQEsPHoCY8HjwoEWDQgBQEThBw4CAlgRQDGAXgoKJBggQNVHAoyUjQgAoBAlSIuSgQADs=`
}
let app = express();

let coreApp = {
  handleError: function(err, req, res, next) {
    res.status(200);
    return res.format({
      'html': function () {
        res.json({ error: err.message });
      },
      'json': function () {
        res.json({ error: err.message });
      },
      'image/*': function () {
        let img = new Buffer(IMG.FAIL, 'base64');
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Content-Length', img.length);

        res.end(img);
      },
    });
  },
  handleSuccess: function (data, req, res, next) {
    res.status(200);
    res.format({
      'html': function () {
        res.json(data);
      },
      'json': function () {
        res.json(data);
      },
      'image/*': function () {
        let img = new Buffer(IMG.OK, 'base64');
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Content-Length', img.length);

        res.end(img);
      },
    });
  },
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
        return next(err);
      }
      return coreApp.handleSuccess(app.gpg.parseResult(gpgVerifyResult), req,res,next);
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
      if (err) {
        return next(err);
      }
      return coreApp.handleSuccess(result, req,res,next);
    });
  },
}

// headers
app.disable('x-powered-by');

// Routes
app.get('/verify/:postId/:index', coreApp.verify);
app.get('/verify/:postId', coreApp.verify);
app.post('/encrypt/:userId', coreApp.encrypt);

// Error
app.use(coreApp.handleError);

// Bootstraps
async.parallel({
  DBConnection: function (next) {
    return next(null, pgPromise(DB_CONFIG));
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
