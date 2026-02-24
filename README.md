<div align="center">

# 🤖 Amber Dashboard Event Bot

The idea is that game events will be held outside of Discord. One team goes against the other. The winning team gets awarded tokens through a slash command performed by the staff.

Those who want to join the game event can react to a message and will be added towards the random team generation. A total of 2 teams will be randomly generated.

Award tokens to roles, all users in that said role will get their tokens. Users can then use their tokens for various rewards using the shop.

After X amount of time, the reward will be removed and can be configured in the settings.

❗Extra: AI image generation using ComfyUI

</div>

## ⚙️ Technical information

Used in this project:

- Docker
- MongoDB
- Nodejs (Discordjs)

## 💾 How to install

### 💻 Get Files

<details>

<summary>🛠️ Open for installation steps</summary>

1. Clone the repository

   ```bash
   git clone https://github.com/kenjibailly/amber-dashboard
   ```

2. Copy example .env file and make changes:

   > We will fill in the variables later.

   ```bash
   cp .env.example .env
   ```

</details>

### ⚓ Docker

<details>

<summary>🛠️ Open for installation steps</summary>

Edit `docker-compose.yml`:

> Network `docker_swag` is the network you put your swag / nginx-proxy-manager / nginx container in, change to your own existing network.

```bash
docker-compose up -d
```

</details>

### 🌀 Discord Developer Portal

<details>

<summary>🛠️ Open for installation steps</summary>

Go to the [Discord Developer Portal](https://discord.com/developers/applications/) and create a `New Application`.

Under the `Installation` tab, find `Guild Install` at the bottom, add `bot` to scopes and add `Administrator` to permissions.

Under the `Bot` tab, find `Privileged Gateway Intents` and enable:

- `Presence Intent`
- `Server Members Intent`
- `Message Content Intent`

Now we will fill in the .env file we created.

- Under the `General Information` tab, find `Application ID` and click copy. Paste it in your .env file after `APP_ID=`.
- Under the `General Information` tab, find `Public Key` and click copy. Paste it in your .env file after `PUBLIC_KEY=`.
- Under the `Bot` tab, find `Token` and click reset token, copy it. Paste it in your .env file after `DISCORD_TOKEN=`.
- Under the `OAuth2` tab, find `Client Secret` and click reset secret, copy it. Paste it in your .env file after `DISCORD_CLIENT_SECRET=`.

Now invite your Discord bot to your server.
Under the `OAuth2` tab, find `OAuth2 URL Generator` and check `bot` under the scopes, then check `Administrator` under the bot permissions. Now find `Generated URL` at the bottom of the page and copy the link. Open the link in your browser and invite the Discord Bot to your server.

After completing your .env file please restart the docker container, if you don't do this you won't be able to add the interactions endpoint URL in the next step. Discord will give you an error.

```bash
docker-compose restart
```

</details>

### 💾 Register Discord Slash Commands

<details>

<summary>❌ Information</summary>

The slash commands are automatically registered when the bot enters the server.

When you update the bot you can register the slash commands again with the `/register-slash-commands` command. You have to do this per server the bot is in.

> The Discord client has to be refreshed before the change in the slash command(s) get updated. `ctrl + R` on windows. Restart app on mobile.

</details>

### 👾 Discord

<details>

<summary>🛠️ Open for installation steps</summary>

Go to `Server Settings` > `Roles` and move the bot's role to the top of the hierarchy or it will have permissions issues.

Optional: Change the permissions of the commands of the bot. Go to `Server Settings` > `Integrations`, find the bot under `Bots and Apps` and click on `Manage`. Configure each command's permissions to your preference.

</details>

### 🖼️ Optional: ComfyUI for AI image generation

<details>

<summary>🛠️ Open for installation steps</summary>

Install and run ComfyUI, I'm not going to explain how to do this, there are a lot of different ways.
Add your ComfyUI address to the `.env`file, more information in the comments in the `.env` file.

The workflow is made to generate anime images. If you want to use another model or tweak some options, you can change the workflow in the AI folder.

Download Pony Diffusion V6 XL:
https://civitai.com/models/257749/pony-diffusion-v6-xl

Add it to your ComfyUI models folder.
It should have this name, but double check or it won't work: `ponyDiffusionV6XL_v6StartWithThisOne.safetensors`

---

The bot is configured to be able to use the slash commands: `/create-image` and `/create-image-settings` everywhere when you add the bot as an app. If you don't want this, then edit `/commands/deploy-commands.js` and remove these lines from the constants `CREATE_IMAGE_COMMAND` and `CREATE_IMAGE_SETTINGS_COMMAND`:

```js
    "integration_types": [0,1],
    "contexts": [0,1,2],
```

Also remove these 2 lines:

```js
    await InstallGlobalCommands(process.env.APP_ID, [
      ...(process.env.COMFYUI_ADDRESS ? [CREATE_IMAGE_COMMAND, CREATE_IMAGE_SETTINGS_COMMAND] : []), // Register both commands globally if COMFYUI_ADDRESS is set
```

---

⚠️ In development, the settings are not used in the workflow yet

In `/AI/data.json` you can setup the models, loras and dimensions.
The loras and dimensions are configured per model as this varies and you might want to limit these for lower end GPUs.

Example:

```json
{
  "SDXL": {
    "dimensions": {
      "1:1 square": "768x768",
      "3:4 portrait": "672x864",
      "5:8 portrait": "624x912",
      "9:16 portrait": "576x1008",
      "9:21 portrait": "480x1152",
      "4:3 landscape": "864x672",
      "3:2 landscape": "912x624",
      "16:9 landscape": "1008x576",
      "21:9 landscape": "1152x480"
    },
    "checkpoints": [
      {
        "name": "Pony Diffusion V6 XL",
        "file": "ponyDiffusionV6XL_v6StartWithThisOne.safetensors",
        "description": "Pony Diffusion V6 is a versatile SDXL finetune capable of producing stunning SFW and NSFW visuals of various anthro, feral, or humanoids species and their interactions based on simple natural language prompts.",
        "link": "https://civitai.com/models/257749?modelVersionId=290640",
        "settings": {
          "cfg": 7,
          "steps": 25,
          "sampler_name": "euler_ancestral",
          "scheduler": "normal",
          "clip_skip": -2,
          "positive_prompt": "score_9, score_8_up, score_7_up, anime",
          "negative_prompt": "low-res, bad anatomy, bad hands, text, error, missing xfingers, extra digit, fewer digits, cropped, worst quality, xlow quality, normal quality, jpeg artifacts, signature, xwatermark, username, blurry, artist name,(deformed, xdistorted, disfigured:1.3), poorly drawn, bad anatomy, xwrong anatomy, extra limb, missing limb, floating limbs, x(mutated hands and fingers:1.4), disconnected limbs, xmutation, mutated, ugly, disgusting, blurry, amputation"
        },
        "default": true
      }
    ],
    "loras": [
      {
        "name": "Aesthetic Anime V1",
        "file": "aesthetic_anime_v1s.safetensors",
        "description": "Enhances the aesthetic style of anime creations.",
        "link": "https://civitai.com/models/295100/aesthetic-anime-lora",
        "model_weight": 1,
        "clip_weight": 1
      }
    ]
  }
}
```

You can add multiple checkpoints to use with multiple loras with the same dimensions.
You can add new objects with a different appropriate name, in our example: `SDXL`. This name is not used anywhere and only used for better visibility in the json file. This means you can name this anything you want.
When you create a new object like this, you can specify different dimensions and loras you might want to couple with these checkpoints.

You need to set a default checkpoint to be used in case the user hasn't configured any.
You can do this by adding `"default": true` to your checkpoint. Make sure only one checkpoint has been set to `true`. The other checkpoints should be set to `"default": false`.

</details>

## 🆕 How to update your bot

<details>

<summary>🛠️ Open for update steps</summary>

```bash
git stash
git pull
git stash pop
```

When new npm dependancies have been added to the bot, you must recreate the docker image, to do this follow these commands:

```bash
docker-compose down -v --rmi all
docker compose up -d
```

</details>

# Functionality

### 🦜 Slash Commands:

#### 🎉 General Functions

- ❌ /shop
  - Opens the shop
- ❌ /wallet
  - Checks your wallet balance
- ❌ /games
  - Lists all the available games
- ❌ /upcoming-games
  - Lists the upcoming games
- ❌ /troll-missions
  - Lists all the troll missions
- ❌ /create-image
  - Generates an AI image using ComfyUI, note: a working instance of ComfyUI must be setup for this (not included)
  - Input: Prompt
- ❌ /create-image-settings
  - Opens a settings menu in a DM with the bot, where the user can change the model, lora and dimensions. The compatible loras and dimensions can be chosen per model.
- ❌ /introduction
  - A user can introduce themselves using this command. An image will be generated with the provided data. Users can edit their introduction using the same command and the initial message will be updated.
  - You can edit the game characters in the `./introduction/game.json` file, the colors in the file are used to make a gradient background. You can also change the assets, but make sure they have the same dimensions.
- ❌ /level
  - A user can check their current level or they can check another user's level.
  - Input: optional: `user`

#### 🧑‍💼 Staff functions

These commands have a standard permission. All users who have the `Manage Server` permission can use these.

Optional: Change the permissions of the commands of the bot. Go to `Server Settings` > `Integrations`, find the bot under `Bots and Apps` and click on `Manage`. Configure each command's permissions to your preference.

- ❌ /award-team
  - Awards a role 🪙
  - Input: `role`, `amount`, optional: `reason`
- ❌ /award-user
  - Awards a user 🪙
  - Input: `user`, `amount`, optional: `reason`
- ❌ /deduct-user
  - Deducts 🪙 from a user
  - Input: `user`, `amount`, optional: `reason`
- ❌ /start-event
  - Creates event, users can apply to this event to be added to the team generation
  - Input: `event name`, `description`, optional: `expiration`, optional: `image link`, optional: `color`, optional: `max_members_per_team`
- ❌ /reset-teams
  - Removes all users from the roles created for the team generation to start over
  - Input: `game`
- ❌ /manage-games
  - Add, remove or update a game
- ❌ /set-status
  - Sets custom status of the bot, this can't be set per server, this is a custom status for the bot on all servers, so becareful with this. If you want to disable this edit commands/deploy-commands.js and remove `SET_STATUS_COMMAND,` line in `const NEW_COMMANDS = [`
  - Input: `status`
- ❌ /manage-troll-missions
  - Add, remove or update a troll mission
- ❌ /cancel-event
  - Cancels an ongoing event
- ❌ /troll-user-complete-mission
  - Completes the mission of a trolled user
  - Input: `user`, optional: `message link` default: last message from trolled user
- ❌ /register-slash-commands
  - Registers the slash commands for when the bot has been updated with new commands
- ❌ /send-emed
  - You can send a simple embed using this command through the bot
  - Input: `title`, `message`
- ❌ /send-embed-file
  - You can send an embed using this command through the bot with a json file generated by discohook.app
  - Input: `channel`, `file`
- ❌ /download-embed-file
  - You can download an embed json file in the discohook.app format from an existing embedded message
  - Input: `message link`
- ❌ /edit-embed-file
  - You can edit an existing embedded message from the bot using this command with a json file generated by discohook.app
  - Input: `message link`, `file`
- ❌ /manage-daily-character-poll
  - You can activate a daily character poll for your game. The poll will include 2 characters from the json file located in `./introduction/game.json` and ask which character they like best.
  - Input: `active`, `channel`
- ❌ /manage-rules
  - You can add rules to select from the `/timeout-user` command
- ❌ /timeout-user
  - You can timeout a user, first timeout = 10 mins, second timeout = 1h, third and following timeouts = 24h. User gets a DM with optionally their violated message and which rules they have violated
  - Input: `user`, optional: `message link`
- ❌ /warn-user
  - You can warn a user for violating a rule. User gets a DM with optionally their violated message and which rules they have violated
  - Input: `user`, optional: `message link`

#### ⚙️ Settings

These commands have a standard permission. All users who have the `Manage Server` permission can use these.

Optional: Change the permissions of the commands of the bot. Go to `Server Settings` > `Integrations`, find the bot under `Bots and Apps` and click on `Manage`. Configure each command's permissions to your preference.

- ❌ /set-teams
  - Choose 2 roles to be assigned as teams for the team generation
  - Input: `role`, `role`
- ❌ /set-reward
  - Sets the price per reward and / or time the reward gets removed after and / or enable or disable the reward
  - Input: `reward name list`, optional: `price`, optional: `time`, optional: `enable/disable`
- ❌ /set-all-rewards
  - Sets the price of all rewards and / or time all the rewards gets removed after, default: `30 days`
  - Input: `time`
- ❌ /set-wallet-config
  - Sets the token emoji to your preferred emoji, custom emoji are allowed, default: 🪙
  - An extra currency can be activated, it will mirror the default currency, however it can be deducted seperately and this currency will not be used for the shop. The idea here is to do giveaways and deduct users the extra currency for this, while still being able to use the shop as a engagement incentive
  - Input: `emoji`, optional: `extra_currency_active`, optional: `extra_token_emoji`
- ❌ /set-bot-channel
  - Sets the channel of the bot where updates are posted, like reset of awards
  - Input: `channel`
- ❌ /set-channel-name-configuration
  - Configures the channel name options for the custom channel reward
- ❌ /set-staff-role
  - Configures the staff role, this is used to add the staff to the troll channel
  - Input: `role`
- ❌ /set-introduction-channel
  - Sets the introduction channel, where the bot should post the introductions. If this commad hasn't been used, the introductions will be posted where the user used the command
  - Input: `channel`

Rewards are automatically set to be all enabled and have a default price of 1 🪙;

### 🏪 Shop

When opening the shop, the user can click a button to start interacting with the bot in a private thread. The bot will guide the user and ask the required things needed in order for the reward to be claimed and the wallet to be deducted.

#### 🏆 Rewards:

- ❌ Change your nickname
- ❌ Change someone's nickname
- ❌ Add a custom server emoji
- ❌ Add a custom channel
- ❌ Add a custom role name and color
- ❌ Choose the upcoming game
- ❌ Troll user
  - The user gets the "Troll" role, with this role the user can only see 1 channel with a gif of Rick Roll. The bot sends out a message with a list of missions, the user can choose one to complete. The list is made by the staff. The missions could include things like: create an embarrassing picture, create an artwork, or touch grass for example. When the user has completed the mission, the staff can accept by clicking a button generated by the bot. The message of the user is then sent to the channel where `bot channel` is configured. The troll is then lifted and the user gets access to the server again.

### 💪 Join event and assign team

- ❌ Users apply to join event, those who applied will be randomly assigned to a team, after the expiration time. Users will get the role according to the team they have been assigned to. The roles are set with the `/set-teams` command. The teams will be posted in the same channel where the event has been started.
