var path = require('path');
var fs = require('fs');

module.exports = {
  callConcierge: function(req, res) {
    try {
      var list = fs.readFileSync(path.join(__dirname, 'list/concierge.json'));
      list = JSON.parse(list);

      if (!list[req.channel.name]) {
        return res.text('No concierge assigned for this channel. \n' + JSON.stringify(req.channel)).send();
      }

      var link = 'https://auth0.slack.com/archives/' + req.channel.name + '/p' + req.message.timestamp.replace('.', '');
      var conciergeMessage = '@' + req.from.name + ' needs your attention in #' + req.channel.name + ' (' + link + ') \n\n*Message*:\n';
      return res.text(conciergeMessage + req.message.value.text, list[req.channel.name]).send();
    } catch (e) {
      return res.text('An error has occurred while trying to contact the concierge.\n```' + JSON.stringify(e) + '```').send();
    }
  }
};
