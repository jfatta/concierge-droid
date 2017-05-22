var WebClient = require('@slack/client').WebClient;

exports.init = function init(token) {
  this.client = new WebClient(token);
}

// Checks if the user is currently active
// Needs a token with the `users:read` scope
// https://api.slack.com/docs/presence-and-status
exports.getUserPresence = function getUserPresence(username, cb) {
  var userId;
  this.client.users.list((err, res) => {
    for(var i=0; i<res.members.length; i++) {
      if(res.members[i].name === username) {
        userId = res.members[i].id;
      }
    }

    if(!userId) return cb(null, false);
    return this.client.users.getPresence(userId, (errPresence, resPresence) => {
      cb(errPresence, resPresence && resPresence.presence === 'active');
    });
  });
}


