var fs = require('fs');
var dirname = require('path').dirname;
var conciergeFile = dirname(__dirname) + '/concierge.json';

module.exports = function(context) {
  // Initialize concierge on first run
  try {
    fs.accessSync(conciergeFile, fs.F_OK);
  } catch (e) {
    // It isn't accessible
    try {
      fs.writeFileSync(conciergeFile, '{}');
    } catch(er) {
      console.error('Unable to create concierge file');
    }
  }

  return {
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

        return res.text('A message has been sent to the concierge. If your message is urgent and you don\'t receive a reply within 15 minutes, please use `@here` or `@channel`.').send();
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
          return res.text('The concierge for this channel is `' + conciergeName + '`. To send a direct message to the concierge use `@concierge message: {text}`').send();
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
        return res.text('User ' + name + ' has been assigned concierge for this channel.').send();
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
    },
    help: function(req, res) {
      var helpMessage = "Here\'s what I can do:\n- Use `@concierge who` to check who is the assigned concierge for this channel.\n- Use `@concierge assign: {user}` to assign a person to the current channel.\n- Use `concierge message: {text}` to send a direct message to the concierge.\n- Use `concierge stop: on-call` to clear the assignment for this channel.";
      return res.text(helpMessage).send();
    }
  };
};
