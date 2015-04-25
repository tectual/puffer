(function() {
  var Boom, CB, Couchbase, Database, Q, errorHandler, _;

  _ = require('lodash');

  CB = require('couchbase');

  Boom = require('boom');

  Q = require('q');

  errorHandler = function(ex) {
    return Boom.serverTimeout(ex.message);
  };

  Couchbase = (function() {
    function Couchbase(options, mock) {
      var cluster, host;
      host = options.port != null ? "" + options.host + ":" + options.port : options.host;
      cluster = (mock != null) && mock ? (console.log('Running mock Couchbase server...'), new CB.Mock.Cluster) : new CB.Cluster(host);
      this.bucket = cluster.openBucket(options.name);
    }

    Couchbase.prototype._exec = function(name) {
      return Q.npost(this.bucket, name, Array.prototype.slice.call(arguments, 1)).fail(errorHandler);
    };

    Couchbase.prototype.insert = function(key, doc, options) {
      options || (options = {});
      return this._exec("insert", key, doc, options);
    };

    Couchbase.prototype.get = function(key, clean) {
      if (key.constructor === Array) {
        return this._exec("getMulti", key).then(function(data) {
          if (data.isBoom || (clean == null) || clean === false) {
            return data;
          }
          return _.map(data, function(v) {
            return v.value;
          });
        });
      } else {
        return this._exec("get", key).then(function(data) {
          if (data.isBoom || (clean == null) || clean === false) {
            return data;
          }
          return data.value;
        });
      }
    };

    Couchbase.prototype.replace = function(key, doc, options) {
      options || (options = {});
      return this._exec("replace", key, doc, options);
    };

    Couchbase.prototype.update = function(key, data, withCas) {
      var _this;
      _this = this;
      return this.get(key).then(function(d) {
        var doc;
        doc = d.value;
        if (_.isFunction(data)) {
          doc = data(doc);
        } else {
          _.extend(doc, data);
        }
        return _this.replace(key, doc, {
          cas: d.cas
        });
      });
    };

    Couchbase.prototype.upsert = function(key, doc, options) {
      options || (options = {});
      return this._exec("upsert", key, doc, options);
    };

    Couchbase.prototype.remove = function(key) {
      return this._exec("remove", key);
    };

    Couchbase.prototype.counter = function(key, step) {
      return this._exec("counter", key, step);
    };

    Couchbase.prototype.from = function(design, view) {
      return CB.ViewQuery.from(design, view);
    };

    Couchbase.prototype.commit = function(query) {
      return this._exec("query", query);
    };

    return Couchbase;

  })();

  module.exports = Database = (function() {
    Database.instance = null;

    function Database(options, mock) {
      Database.instance = new Couchbase(options, mock);
      return Database.instance;
    }

    return Database;

  })();

}).call(this);
