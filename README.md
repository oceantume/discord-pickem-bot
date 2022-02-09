# Discord Pick'Em Bot

A Pick'Em bot for Discord. This bot attempts to be as user-friendly as possible by using interactive components for most of its functions.

## What's Pick'Em?

Pick'Em may have multiple meanings, but in the context of this bot it consists of a set of questions for which participants try to predict the answers. A pool with questions is started in a specific channel and allows all users who have access to the channel to select their prediction for each question.

The idea is to have people try to predict which teams will win, loose or have a specific score in a sport or gaming event. Participants will enter their predictions before the event starts. Predictions then get locked when the event starts and, when it's over, the owner of the pool will compare everyone's predictions with the actual results.

This was originally created for use in the [HLL Seasonal](https://hllseasonal.com/), an Hell Let Loose tournament organized by the community.

## Features

The bot is working with a relatively limited set of features. Here are the current features available:

- [x] Create a pool in a channel via `/pickem create <...>`
- [x] Lock a previously created pool via `/pickem lock`
- [x] Export pool predictions via a `/pickem export`
- [x] Participate in an active pool by selecting and viewing your own predictions
- [x] Share your predictions in a pre-selected channel

Planned features:

- [ ] Revamp of pools management via a single command for all actions.
- [ ] Public version of the bot so that anyone can add it to their server.
- [ ] More flexible question options. For example, allowing between X and Y answers.

## Getting started

The bot is currently made in a way that it can only run for one guild at a time. The first step is to create your own developer application and bot in the [Discord developers portal](https://discord.com/developers/). Then, you should create a `.env` file using the information from `.env.example` to figure out which values are required. To get things like guild, user and role id's, you will have to enable Developer Mode under the Advanced settings of your discord client. This will allow you to right click items in the UI and see a "Copy ID" option.

Here are the required permissions for the bot:

- [ ] scopes: bot
- [ ] scopes: applications.commands
- [ ] bot: Send Message

### Deploying Commands

Before the bot can be used in a server, you will need to deploy the commands manually. This can be done by running `node ./scripts/deploy-commands.js` in a command-line. This should be done whenever commands are updated. To be safe, you should run it whenever you install a new version of the bot.

### Running with PM2

Running the bot via [PM2](https://pm2.keymetrics.io/) is the simplest way to make sure it's always up and it restarts automatically. The project comes with a configuration file so that all you have to do is [install PM2](https://pm2.keymetrics.io/docs/usage/quick-start/) and run `pm2 start` in a command-line from inside the directory of the project.

### Running the bot directly

You can also start the bot directly in node by running `node ./index.js` in a command-line. This is unreliable and less recommended, because the bot may simply close on unhandled errors and will stop if you close the command-line.

## Contributing

If you want to contribute to this project, you should start by opening an issue. If you think you can resolve the issue, then you're welcome to create a pull request with the changes. Commit names should follow [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) and code files should be run through prettier.
