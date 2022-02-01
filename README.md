# Discord Pick'Em Bot

A Pick'Em bot for Discord. This bot attempts to be as user-friendly as possible by using interactive components for most of its functions.

## What's Pick'Em?

Pick'Em may have multiple meanings, but in the context of this bot it consists of a set of questions for which participants try to predict the answers. A pool with questions is started in a specific channel and allows all users who have access to the channel to select their prediction for each question.

The classic is trying to predict which teams will win, loose or have a specific score in a sport or gaming event. Participants will vote before the event starts, and the owner of the pool will compare everyone's predictions with the actual results to figure out who was right.

This was originally created for use in the [HLL Seasonal](https://hllseasonal.com/), an Hell Let Loose tournament organized by the community.

## Features

The bot is still under development. Here are the current features available:

- [x] Create a pool in a channel via `/pickem create <...>`
- [x] Lock a previously created pool via `/pickem lock`
- [x] Participate in an active pool by selecting and viewing your own predictions.

Here are some of the planned features:

- [ ] Delete a pool via a command
- [ ] Export pool predictions via a command

## Setup

The bot is currently made in a way that it can only run for one guild at a time. The first step is to create your own developer application and bot in the [Discord developers portal](https://discord.com/developers/). Then, you should create a `.env` file using the information from `.env.example` to figure out which values are required. To get things like guild, user and role id's, you will have to enable Developer Mode under the Advanced settings of your discord client. This will allow you to right click items in the UI and see a "Copy ID" option.

## Contributing

If you want to contribute to this project, you should start by opening an issue. If you think you can resolve the issue, then you're welcome to create a pull request with the changes.
