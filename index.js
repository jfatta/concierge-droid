var fs = require('fs');
var conciergeFile = '/etc/concierge.json';

module.exports = function(context) {
  return {
    initialize: function(req, res) {
      try {
        fs.accessSync(conciergeFile, fs.F_OK);
        return res.text('Concierge already initialize').send();
      } catch (e) {
        // It isn't accessible
        try {
          fs.writeFileSync(conciergeFile, '{}');
          return res.text('Concierge initialized').send();
        } catch(er) {
          return res.text('Unable to initialize Concierge').send();
        }
      }
    },
    callConcierge: function(req, res) {
      try {
        var list = fs.readFileSync(conciergeFile);
        list = JSON.parse(list);

        if (!list[req.channel.name]) {
          return res.text('No concierge assigned for this channel. \n' + JSON.stringify(req.channel)).send();
        }

        var link = 'https://auth0.slack.com/archives/' + req.channel.name + '/p' + req.message.timestamp.replace('.', '');
        var conciergeMessage = '@' + req.from.name + ' needs your attention in #' + req.channel.name + ' (' + link + ') \n\n*Message*:\n';
        res.text(conciergeMessage + req.message.value.text, list[req.channel.name]);

        return res.text('A message has been sent to the concierge.').send();
      } catch (e) {
        return res.text('An error has occurred while trying to contact the concierge.\n```' + JSON.stringify(e) + '```').send();
      }
    },
    whosConcierge: function(req, res) {
      try {
        var list = fs.readFileSync(conciergeFile);
        list = JSON.parse(list);

        var conciergeName = list[req.channel.name];
        if (conciergeName) {
          return res.text('The concierge for this channel is `' + conciergeName + '`').send();
        }

        return res.text('This channel does not have a concierge assigned.').send();
      } catch (e) {
        return res.text('An error has occurred while trying to assign the concierge.\n```' + JSON.stringify(e) + '```').send();
      }
    },
    assignConcierge: function(req, res) {
      try {
        var list = fs.readFileSync(conciergeFile);
        list = JSON.parse(list);

        var name = req.params.name;
        if (name.charAt(0) !== '@') {
          name = '@' + name;
        }

        list[req.channel.name] = name;
        fs.writeFileSync(conciergeFile, JSON.stringify(list, null, 2));
        return res.text('User ' + name + ' have been assigned concierge for this channel.').send();
      } catch (e) {
        return res.text('An error has occurred while trying to assign the concierge.\n```' + JSON.stringify(e) + '```').send();
      }
    },
    clearConcierge: function(req, res) {
      try {
        var list = fs.readFileSync(conciergeFile);
        list = JSON.parse(list);

        if (list[req.channel.name]) {
          delete list[req.channel.name];
          fs.writeFileSync(conciergeFile, JSON.stringify(list, null, 2));
          return res.text('Unassigned concierge for this channel.').send();
        }

        return res.text('This channel does not have a concierge assigned. Nothing changed.').send();
      } catch (e) {
        return res.text('An error has occurred while trying to unassign the concierge.\n```' + JSON.stringify(e) + '```').send();
      }
    }
  };
};
