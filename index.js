var agent = require("auth0-instrumentation");
var pkg = require("./package.json");
var fs = require("fs");
var dirname = require("path").dirname;
var conciergeFile = dirname(__dirname) + "/concierge.json";

module.exports = function(context) {
  context.config = context.config || {};
  var env = {
    METRICS_API_KEY: context.config.METRICS_API_KEY,
    METRICS_PREFIX: "auth0"
  };
  agent.init(pkg, env);

  // Initialize concierge on first run
  try {
    fs.accessSync(conciergeFile, fs.F_OK);
  } catch (e) {
    // It isn't accessible
    try {
      fs.writeFileSync(conciergeFile, "{}");
    } catch (er) {
      console.error("Unable to create concierge file");
    }
  }

  function getConcierge(channelName, channelList) {
    if (!channelList) {
      channelList = fs.readFileSync(conciergeFile);
      channelList = JSON.parse(channelList);
    }

    var concierge = channelList[channelName];

    // For backward compatibility
    if (concierge && typeof concierge !== "object") {
      concierge = {
        name: concierge
      };
    }

    return concierge;
  }

  return {
    callConcierge: function(req, res) {
      try {
        var concierge = getConcierge(req.channel.name);

        agent.metrics.increment("concierge.messages", 1, {
          from: req.from.name,
          channel: req.channel.name,
          concierge: (concierge && concierge.name) || "unassigned"
        });
        if (!concierge) {
          return res
            .text(
              "No concierge assigned for this channel. Use `@concierge assign @user`"
            )
            .send();
        }

        var inChannelMatch = concierge.name.match(/^in_channel ([^\s]+)/);

        if (inChannelMatch) {
          return res.text(inChannelMatch[1] + " :point_up:").send();
        } else {
          var link =
            "https://auth0.slack.com/archives/" +
            req.channel.name +
            "/p" +
            req.message.timestamp.replace(".", "");
          var conciergeMessage =
            "@" +
            req.from.name +
            " needs your attention in #" +
            req.channel.name +
            " (" +
            link +
            ") \n\n*Message*:\n";
          res.text(conciergeMessage + req.message.value.text, concierge.name);

          var defaultWelcomeMessage =
            "A message has been sent to the concierge (`" +
            concierge.name +
            "`). If your message is urgent and you don't receive a reply within 15 minutes, please use `@here` or `@channel`.";
          return res
            .text(concierge.welcomeMessage || defaultWelcomeMessage)
            .send();
        }
      } catch (e) {
        return res
          .text(
            "An error has occurred while trying to contact the concierge.\n```" +
              JSON.stringify(e) +
              "```"
          )
          .send();
      }
    },
    whosConcierge: function(req, res) {
      try {
        var concierge = getConcierge(req.channel.name);
        if (concierge) {
          return res
            .text(
              "The concierge for this channel is `" +
                concierge.name +
                "`. To send a direct message to the concierge use `@concierge message: {text}`"
            )
            .send();
        }

        return res
          .text("This channel does not have a concierge assigned.")
          .send();
      } catch (e) {
        return res
          .text(
            "An error has occurred while trying to assign the concierge.\n```" +
              JSON.stringify(e) +
              "```"
          )
          .send();
      }
    },
    assignInChannel: function(req, res) {
      try {
        var list = fs.readFileSync(conciergeFile);
        list = JSON.parse(list);

        var name = req.params.name;
        if (name.charAt(0) === "@") {
          name = name.slice(1);
        }

        // req.param.name looks like @user-group(subteam.^S1AB2C34D) when using a Slack user-group
        // We're just pulling the handle out to ping the user-group
        var subteamMatch = name.match(/([^\s+]*)\((subteam\^.+)\)/);
        if (!subteamMatch) {
          return res
            .text("`in_channel` mode is only supported for subteams.")
            .send();
        }

        // https://api.slack.com/docs/message-formatting#variables
        // Needs to look like <!subteam^ID|handle>
        name = "<!" + subteamMatch[2] + "|" + subteamMatch[1] + ">";

        var concierge = getConcierge(req.channel.name, list) || {};
        concierge.name = "in_channel " + name;
        list[req.channel.name] = concierge;

        fs.writeFileSync(conciergeFile, JSON.stringify(list, null, 2));
        return res
          .text(
            "Handle " + name + " has been assigned concierge for this channel."
          )
          .send();
      } catch (e) {
        return res
          .text(
            "An error has occurred while trying to assign the concierge.\n```" +
              JSON.stringify(e) +
              "```"
          )
          .send();
      }
    },
    assignConcierge: function(req, res) {
      try {
        var list = fs.readFileSync(conciergeFile);
        list = JSON.parse(list);

        var name = req.params.name;

        // We can't DM subteams, so there's no point in allowing this
        var subteamMatch = name.match(/(@[^\s+]*)\(subteam\^.*\)/);
        if (subteamMatch) {
          return res
            .text(
              "Cannot assign a subteam as concierge. Try using `@concierge in_channel: " +
                subteamMatch[1] +
                "` instead."
            )
            .send();
        }

        var concierge = getConcierge(req.channel.name, list) || {};
        concierge.name = name;
        list[req.channel.name] = concierge;

        fs.writeFileSync(conciergeFile, JSON.stringify(list, null, 2));
        return res
          .text(
            "User " + name + " has been assigned concierge for this channel."
          )
          .send();
      } catch (e) {
        return res
          .text(
            "An error has occurred while trying to assign the concierge.\n```" +
              JSON.stringify(e) +
              "```"
          )
          .send();
      }
    },
    clearConcierge: function(req, res) {
      try {
        var list = fs.readFileSync(conciergeFile);
        list = JSON.parse(list);

        if (list[req.channel.name]) {
          delete list[req.channel.name];
          fs.writeFileSync(conciergeFile, JSON.stringify(list, null, 2));
          return res.text("Unassigned concierge for this channel.").send();
        }

        return res
          .text(
            "This channel does not have a concierge assigned. Nothing changed."
          )
          .send();
      } catch (e) {
        return res
          .text(
            "An error has occurred while trying to unassign the concierge.\n```" +
              JSON.stringify(e) +
              "```"
          )
          .send();
      }
    },
    setWelcomeMessage: function(req, res) {
      try {
        var list = fs.readFileSync(conciergeFile);
        list = JSON.parse(list);

        var concierge = getConcierge(req.channel.name, list);
        if (!concierge) {
          return res
            .text(
              "This channel does not have a concierge assigned. Nothing changed."
            )
            .send();
        }

        concierge.welcomeMessage =
          req.params.message || concierge.welcomeMessage;
        list[req.channel.name] = concierge;

        fs.writeFileSync(conciergeFile, JSON.stringify(list, null, 2));
        return res.text("Message saved for concierge for this channel.").send();
      } catch (e) {
        return res
          .text(
            "An error has occurred while trying to set welcome message for the concierge.\n```" +
              JSON.stringify(e) +
              "```"
          )
          .send();
      }
    },
    help: function(req, res) {
      var helpMessage =
        "Here's what I can do:\n- Use `@concierge who` to check who is the assigned concierge for this channel.\n- Use `@concierge assign: {user}` to assign a person to the current channel (user will be notified by DM).\n- Use `concierge in_channel: {subteam}` to assign a user group as the concierge (that will be notified in the channel itself).\n- Use `concierge message: {text}` to send a direct message to the concierge.\n- Use `@concierge set welcome message: {message}` to define a message to be shown to the caller.\n- Use `concierge stop: on-call` to clear the assignment for this channel.";
      return res.text(helpMessage).send();
    },
    echo: function(req, res) {
      const keyValue = context.config[req.params.key];
      if (!keyValue) {
        res.text(`Value not found for the key: "${req.params.key}".`).send();
      } else {
        res.text(`The "${req.params.key}" value is: "${keyValue}".`).send();
      }
    }
  };
};
