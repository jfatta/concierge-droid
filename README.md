# Concierge droid

The Concierge droid sends direct messages to assigned persons when mentioned to avoid unnecessary noise in Slack. Useful when you have an "on-call" rotation in your team/channel.

## Install with Gynoid

You will need a new Slack bot token to start your bot. Then, use [Gynoid](https://github.com/auth0/gynoid) to start the bots framework.

To install with Gynoid:

```
register concierge using {slack-token}
```

This will start your bot in Slack. Now, extend its functionality by running this command:

```
extend concierge from auth0/concierge-droid
```

Done!

## Using Concierge

Invite your Concierge bot to a channel. Then you can mention the bot to execute commands.

### Assign a Concierge

Use this command to assign a user as the Concierge:

```
@concierge assign: {user}
```

### Who is the Concierge

Once assigned, you can use `@concierge who` to check who is the current assigned Concierge to that channel.

### Sending a message to the Concierge

To send a direct message use `@concierge message: {text}`.

### Clear assignation

Use `@concierge stop: on-call` to clear the current assigned user from the current channel.
